import {Router} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requireCsrf,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant,resolvePublicTenant} from "./tenant-context.js";
import {randomUUID} from "node:crypto";
import {postLedgerEntry} from "./ledger.js";
import {emitBusinessEvent} from "./business-events.js";
import {getPaymentProvider,lookupPaymentRefundStatus} from "./payment-provider.js";

export const checkoutRouter=Router();
const s=(v:unknown,n=200)=>typeof v==="string"?v.trim().slice(0,n):"";
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null;};
async function ctx(req:any){return resolveTenant(req,(req as any).user);}

checkoutRouter.post("/api/checkout/carts",requireAuth,requirePermission("cart:manage"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const customer=s(req.body?.customerRef),store=s(req.body?.storeId);
 if(!customer||!store)return res.status(400).json({error:"شناسه مشتری و فروشگاه الزامی است"});
 const ok=await query("select id from stores where id=$1 and tenant_id=$2 and status='active'",[store,t.id]);
 if(!ok.rowCount)return res.status(404).json({error:"فروشگاه معتبر نیست"});
 const r=await query("insert into cart_sessions(tenant_id,customer_ref,store_id,currency) values($1,$2,$3,$4) returning *",[t.id,customer,store,s(req.body?.currency,10)||"IRR"]);
 res.status(201).json(r.rows[0]);
}));

checkoutRouter.post("/api/checkout/carts/:id/items",requireAuth,requirePermission("cart:manage"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const product=s(req.body?.productId),qty=n(req.body?.quantity);
 if(!product||qty===null||qty<=0)return res.status(400).json({error:"محصول و تعداد معتبر الزامی است"});
 const c=await query("select id,store_id,status from cart_sessions where id=$1 and tenant_id=$2",[req.params.id,t.id]);
 if(!c.rowCount||c.rows[0].status!=="open")return res.status(404).json({error:"سبد باز پیدا نشد"});
 const p=await query("select id,price from products where id=$1 and tenant_id=$2 and store_id=$3 and status='active'",[product,t.id,c.rows[0].store_id]);
 if(!p.rowCount)return res.status(404).json({error:"محصول فعال پیدا نشد"});
 const r=await query("insert into cart_items(cart_id,product_id,quantity,unit_price) values($1,$2,$3,$4) on conflict(cart_id,product_id) do update set quantity=cart_items.quantity+excluded.quantity,unit_price=excluded.unit_price returning *",[req.params.id,product,qty,p.rows[0].price]);
 res.status(201).json(r.rows[0]);
}));

checkoutRouter.get("/api/checkout/carts/:id",requireAuth,requirePermission("cart:manage"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const c=await query("select * from cart_sessions where id=$1 and tenant_id=$2",[req.params.id,t.id]);
 if(!c.rowCount)return res.status(404).json({error:"سبد پیدا نشد"});
 const items=await query("select ci.*,p.sku,p.title from cart_items ci join products p on p.id=ci.product_id where ci.cart_id=$1 order by ci.created_at",[req.params.id]);
 res.json({cart:c.rows[0],items:items.rows});
}));

checkoutRouter.post("/api/checkout/carts/:id/checkout",requireAuth,requirePermission("checkout:manage"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const c=await client.query("select * from cart_sessions where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!c.rowCount||c.rows[0].status!=="open"){await client.query("rollback");return res.status(409).json({error:"سبد قابل تسویه نیست"});}
  const items=await client.query("select ci.*,p.title,p.seller_id,p.store_id,p.price as current_price,p.status as product_status from cart_items ci join products p on p.id=ci.product_id where ci.cart_id=$1 for update",[req.params.id]);
  if(!items.rowCount){await client.query("rollback");return res.status(400).json({error:"سبد خالی است"});}
  const sellers=[...new Set(items.rows.map(x=>x.seller_id))];if(sellers.length!==1){await client.query("rollback");return res.status(400).json({error:"هر سفارش فعلاً باید متعلق به یک فروشنده باشد"});}
  let subtotal=0;
  for(const item of items.rows){
   if(item.product_status!=="active"){await client.query("rollback");return res.status(409).json({error:"این کالا دیگر برای فروش فعال نیست: "+item.title});}
   const currentPrice=Number(item.current_price);
   if(!Number.isFinite(currentPrice)||currentPrice<0){await client.query("rollback");return res.status(409).json({error:"قیمت معتبر برای کالا پیدا نشد: "+item.title});}
   // Re-price at checkout so a stale cart cannot charge an outdated price.
   item.unit_price=String(currentPrice);
   await client.query("update cart_items set unit_price=$1 where id=$2",[currentPrice,item.id]);
   const inv=await client.query("select * from product_inventory where tenant_id=$1 and product_id=$2 and store_id=$3 for update",[t.id,item.product_id,item.store_id]);
   if(!inv.rowCount){await client.query("rollback");return res.status(409).json({error:"موجودی محصول تعریف نشده است"});}
   if(Number(inv.rows[0].quantity)-Number(inv.rows[0].reserved_quantity)<Number(item.quantity)){await client.query("rollback");return res.status(409).json({error:"موجودی کافی نیست: "+item.title});}
   await client.query("update product_inventory set reserved_quantity=reserved_quantity+$1,updated_at=now() where id=$2",[item.quantity,inv.rows[0].id]);
   subtotal+=Number(item.quantity)*currentPrice;
  }
  const sr=await client.query("select commission_rate from sellers where id=$1 and tenant_id=$2",[sellers[0],t.id]);
  if(!sr.rowCount){await client.query("rollback");return res.status(404).json({error:"فروشنده پیدا نشد"});}
  const commission=Number((subtotal*Number(sr.rows[0].commission_rate)/100).toFixed(2)),payable=subtotal-commission;
  const orderNo=s(req.body?.orderNo,100)||("ORD-"+Date.now()+"-"+Math.random().toString(36).slice(2,7));
  const o=await client.query("insert into marketplace_orders(tenant_id,store_id,seller_id,order_no,customer_ref,subtotal,total_amount,commission_amount,seller_payable,payment_method,delivery_due_at) values($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10) returning *",[t.id,c.rows[0].store_id,sellers[0],orderNo,c.rows[0].customer_ref,subtotal,commission,payable,s(req.body?.paymentMethod,50)||"online",req.body?.deliveryDueAt||null]);
  for(const item of items.rows)await client.query("insert into marketplace_order_items(order_id,product_id,quantity,unit_price,line_total) values($1,$2,$3,$4,$5)",[o.rows[0].id,item.product_id,item.quantity,item.unit_price,Number(item.quantity)*Number(item.unit_price)]);
  await client.query("update cart_sessions set status='checked_out',updated_at=now() where id=$1",[req.params.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'checkout.created','marketplace_order',$3,$4)",[t.id,(req as any).user.id,o.rows[0].id,JSON.stringify(o.rows[0])]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"order.created",subjectType:"marketplace_order",subjectId:o.rows[0].id,userId:(req as any).user.id,input:{orderId:o.rows[0].id,totalAmount:Number(o.rows[0].total_amount),sellerId:o.rows[0].seller_id}});
  res.status(201).json({order:o.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

checkoutRouter.get("/api/marketplace/orders/:id",requireAuth,requirePermission("order:manage"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const o=await query("select * from marketplace_orders where id=$1 and tenant_id=$2",[req.params.id,t.id]);
 if(!o.rowCount)return res.status(404).json({error:"سفارش پیدا نشد"});
 const [items,payment,refund]=await Promise.all([
  query("select oi.*,p.sku,p.title from marketplace_order_items oi join products p on p.id=oi.product_id where oi.order_id=$1 order by oi.created_at",[req.params.id]),
  query("select id,payment_no,amount,method,status,provider_code,paid_at,created_at from marketplace_payments where order_id=$1 and tenant_id=$2 order by created_at desc",[req.params.id,t.id]),
  query("select refund_no,amount,reason,status,created_at from marketplace_refunds where order_id=$1 and tenant_id=$2 order by created_at desc",[req.params.id,t.id])
 ]);
 res.json({order:o.rows[0],items:items.rows,payments:payment.rows,refunds:refund.rows});
}));

checkoutRouter.post("/api/marketplace/orders/:id/payment",requireAuth,asyncHandler(async(req,res)=>{
 const t=await ctx(req)||await storefrontContext(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const o=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!o.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش پیدا نشد"});}
  const paymentOwner=(req as any).user;
  if(o.rows[0].customer_ref!==paymentOwner.id&&paymentOwner.role!=="admin"){
   const allowed=await client.query("select 1 from role_permissions where role=$1 and permission='payment:manage'",[paymentOwner.role]);
   if(!allowed.rowCount){await client.query("rollback");return res.status(403).json({error:"دسترسی به پرداخت این سفارش مجاز نیست"});}
  }
  if(!["pending","confirmed"].includes(o.rows[0].status)){await client.query("rollback");return res.status(409).json({error:"وضعیت سفارش برای پرداخت مجاز نیست"});}
  const paymentNo=s(req.body?.paymentNo,100)||("PAY-"+Date.now()+"-"+Math.random().toString(36).slice(2,7));
  const idempotencyKey=s(req.body?.idempotencyKey,160)||null;
  if(idempotencyKey){const existing=await client.query("select * from marketplace_payments where tenant_id=$1 and idempotency_key=$2",[t.id,idempotencyKey]);if(existing.rowCount){await client.query("rollback");return res.status(200).json({payment:existing.rows[0],redirectUrl:existing.rows[0].provider_payload?.redirectUrl||null,order:{id:o.rows[0].id,status:o.rows[0].status}});}}
  const requestedMethod=s(req.body?.method,50)||"online";
  if(requestedMethod==="credit"&&o.rows[0].customer_ref===paymentOwner.id&&paymentOwner.role!=="admin"){
   await client.query("rollback");return res.status(403).json({error:"اتصال اعتبار خرید به هویت مشتری در این مسیر هنوز تأیید نشده است"});
  }
  let providerCode=s(req.body?.providerCode,40)||"";
  let providerTransactionId=s(req.body?.providerRef,200)||"";
  let providerPayload:any={};
  let providerStatus="paid";
  if(requestedMethod==="credit"){
   const facilityId=s(req.body?.creditFacilityId,100);
   if(!facilityId){await client.query("rollback");return res.status(400).json({error:"برای پرداخت اعتباری شناسه تسهیلات الزامی است"});}
   const facility=await client.query("select * from lendtech_facilities where id=$1 and tenant_ref=$2 and status='active' for update",[facilityId,t.id]);
   if(!facility.rowCount){await client.query("rollback");return res.status(404).json({error:"تسهیلات اعتباری فعال پیدا نشد"});}
   const amount=Number(o.rows[0].total_amount);
   if(Number(facility.rows[0].available_amount)<amount){await client.query("rollback");return res.status(409).json({error:"سقف اعتبار برای این خرید کافی نیست",availableAmount:Number(facility.rows[0].available_amount),requiredAmount:amount});}
   await client.query("update lendtech_facilities set available_amount=available_amount-$1,updated_at=now() where id=$2",[amount,facilityId]);
   await client.query("update marketplace_orders set credit_facility_ref=$1 where id=$2 and tenant_id=$3",[facilityId,o.rows[0].id,t.id]);
   providerCode="credit_facility";
   providerTransactionId=paymentNo;
   providerPayload={facilityId,amount,orderNo:o.rows[0].order_no};
  }else{
   const provider=getPaymentProvider(providerCode||undefined);
   const providerResult=await provider.createPayment({tenantId:t.id,orderId:o.rows[0].id,amount:Number(o.rows[0].total_amount),currency:String(o.rows[0].delivery_method_snapshot?.currency||"IRR"),paymentNo,providerRef:providerTransactionId||null,metadata:{orderNo:o.rows[0].order_no}});
   providerCode=provider.code;
   providerTransactionId=providerResult.providerTransactionId||"";
   providerPayload=providerResult.providerPayload;
   providerStatus=providerResult.status;
   if(providerResult.status!=="paid")providerPayload={...providerResult.providerPayload,redirectUrl:providerResult.redirectUrl||null};
  }
  const p=await client.query("insert into marketplace_payments(tenant_id,order_id,payment_no,amount,method,status,provider_ref,provider_code,idempotency_key,provider_transaction_id,provider_payload,paid_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,case when $6='paid' then now() else null end) returning *",[t.id,o.rows[0].id,paymentNo,Number(o.rows[0].total_amount),requestedMethod,providerStatus,providerTransactionId,providerCode,idempotencyKey,providerTransactionId,JSON.stringify(providerPayload)]);
  if(providerStatus!=="paid"){
   await client.query("commit");
   return res.status(202).json({status:providerStatus,payment:p.rows[0],redirectUrl:providerPayload.redirectUrl||null,providerCode,providerTransactionId});
  }
  await client.query("update marketplace_orders set status='paid',paid_at=coalesce(paid_at,now()),updated_at=now() where id=$1 and tenant_id=$2",[o.rows[0].id,t.id]);
  await postLedgerEntry(client,{tenantId:t.id,entryNo:"PAY-"+p.rows[0].payment_no,sourceType:"marketplace_payment",sourceId:p.rows[0].id,description:"ثبت پرداخت سفارش "+o.rows[0].order_no,createdBy:(req as any).user.id,lines:[
   requestedMethod==="credit"
    ? {accountCode:"1201",accountName:"مطالبات اعتباری مشتریان",accountType:"asset",debit:Number(o.rows[0].total_amount)}
    : {accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",debit:Number(o.rows[0].total_amount)},
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",credit:Number(o.rows[0].seller_payable)},
   {accountCode:"4101",accountName:"درآمد کمیسیون",accountType:"revenue",credit:Number(o.rows[0].commission_amount)}
  ]});
  const items=await client.query("select * from marketplace_order_items where order_id=$1",[o.rows[0].id]);
  for(const item of items.rows){
   await client.query("update product_inventory set quantity=quantity-$1,reserved_quantity=reserved_quantity-$1,updated_at=now() where tenant_id=$2 and product_id=$3 and store_id=$4",[item.quantity,t.id,item.product_id,o.rows[0].store_id]);
   await client.query("insert into inventory_movements(tenant_id,product_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) values($1,$2,$3,'sale',$4,'marketplace_order',$5,$6)",[t.id,item.product_id,o.rows[0].store_id,-Number(item.quantity),o.rows[0].id,(req as any).user.id]);
  }
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'payment.paid','marketplace_order',$3,$4)",[t.id,(req as any).user.id,o.rows[0].id,JSON.stringify({status:"paid",amount:o.rows[0].total_amount,provider:providerCode,providerTransactionId})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"payment.paid",subjectType:"marketplace_order",subjectId:o.rows[0].id,userId:(req as any).user.id,input:{orderId:o.rows[0].id,amount:Number(o.rows[0].total_amount),paymentId:p.rows[0].id}});
  res.status(201).json({payment:p.rows[0],order:{id:o.rows[0].id,status:"paid"}});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

checkoutRouter.post("/api/marketplace/orders/:id/refund",requireAuth,requirePermission("payment:refund"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const actorId=(req as any).user.id;
 let order:any,payment:any,linkedSupply:any,refund:any;
 const client=await pool.connect();
 try{
  await client.query("begin");
  const o=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!o.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش پیدا نشد"});}
  order=o.rows[0];
  linkedSupply=(await client.query("select * from logistics_supply_orders where tenant_id=$1 and marketplace_order_id=$2 for update",[t.id,order.id])).rows[0];
  if(linkedSupply){
   const shipment=await client.query("select id,status from logistics_shipments where tenant_id=$1 and supply_order_id=$2 limit 1 for update",[t.id,linkedSupply.id]);
   if(shipment.rowCount){await client.query("rollback");return res.status(409).json({error:"این سفارش سابقه مرسوله دارد؛ بازپرداخت فقط پس از دریافت و بازرسی مرجوعی از گردش رسمی مرجوعی مجاز است"});}
  }
  if(!["paid","processing"].includes(order.status)&&order.status!=="refunded"){await client.query("rollback");return res.status(409).json({error:"بازپرداخت مستقیم فقط پیش از تحویل کالا مجاز است؛ سفارش تحویل‌شده یا مرجوع‌شده باید از گردش دریافت و بازرسی مرجوعی عبور کند"});}
  const p=await client.query("select * from marketplace_payments where tenant_id=$1 and order_id=$2 and status in ('paid','refunded') order by paid_at desc nulls last,created_at desc limit 1 for update",[t.id,order.id]);
  if(!p.rowCount){await client.query("rollback");return res.status(409).json({error:"پرداخت موفق سفارش پیدا نشد"});}
  payment=p.rows[0];
  const prior=await client.query("select * from marketplace_refunds where tenant_id=$1 and payment_id=$2 order by created_at desc for update",[t.id,payment.id]);
  const full=prior.rows.find((x:any)=>!x.return_request_id&&Number(x.amount)===Number(payment.amount));
  if(prior.rows.some((x:any)=>x.return_request_id||Number(x.amount)!==Number(payment.amount))){await client.query("rollback");return res.status(409).json({error:"برای این پرداخت بازپرداخت جزئی یا مرجوعی ثبت شده است؛ ابتدا گردش تطبیق را تکمیل کنید"});}
  if(full?.status==="refunded"){await client.query("rollback");return res.status(200).json({refund:full,order:{id:order.id,status:"refunded"},alreadyCompleted:true});}
  if(order.status==="refunded"&&!full){await client.query("rollback");return res.status(409).json({error:"وضعیت سفارش با سابقه بازپرداخت هم‌خوانی ندارد؛ تطبیق دستی لازم است"});}
  if(full){refund=full;}
  else{
   const refundNo=s(req.body?.refundNo,100)||("REF-"+Date.now()+"-"+order.id.slice(0,8));
   const idempotencyKey="order-full-refund-"+payment.id;
   const inserted=await client.query("insert into marketplace_refunds(tenant_id,order_id,payment_id,refund_no,amount,reason,status,provider_code,provider_transaction_id,provider_payload,created_by,provider_idempotency_key,provider_attempt_count,provider_last_attempt_at) values($1,$2,$3,$4,$5,$6,'pending',$7,$8,'{}'::jsonb,$9,$10,0,now()) returning *",[t.id,order.id,payment.id,refundNo,Number(payment.amount),s(req.body?.reason,500)||null,payment.provider_code,payment.provider_transaction_id||payment.provider_ref||"",actorId,idempotencyKey]);
   refund=inserted.rows[0];
  }
  await client.query("commit");
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
 let providerCode=payment.provider_code,providerRefundId=refund.provider_refund_transaction_id||"",providerPayload=refund.provider_payload||{};
 if(providerCode==="credit_facility"){
  if(!order.credit_facility_ref)return res.status(409).json({error:"مرجع تسهیلات اعتبار خرید روی سفارش ثبت نشده است",manualReconciliationRequired:true});
  providerRefundId=providerRefundId||"credit-"+refund.id;
  providerPayload={creditFacilityId:order.credit_facility_ref,restoredAmount:Number(refund.amount)};
  const saved=await query("update marketplace_refunds set provider_refund_transaction_id=$1,provider_last_status='refunded',provider_payload=$2,updated_at=now() where id=$3 and tenant_id=$4 and status='pending' returning id",[providerRefundId,JSON.stringify(providerPayload),refund.id,t.id]);
  if(!saved.rowCount)return res.status(409).json({error:"وضعیت درخواست بازپرداخت تغییر کرده است؛ تطبیق لازم است"});
 }else if(refund.provider_last_status==="refunded"&&providerRefundId){
  // An authoritative provider confirmation is already persisted; continue to local finalization only.
 }else if(Number(refund.provider_attempt_count||0)>0){
  return res.status(202).json({error:"این درخواست قبلاً به درگاه ارسال شده است؛ برای جلوگیری از بازپرداخت تکراری ابتدا نتیجه را از پنل تطبیق استعلام کنید",pending:true,providerStatus:refund.provider_last_status||"unknown",refundId:refund.id,reconciliationEndpoint:"/api/marketplace/refunds/"+refund.id+"/reconcile"});
 }else{
  let provider:any;
  const claimToken=randomUUID();
  try{
   provider=getPaymentProvider(providerCode);
   if(provider.supportsIdempotentRefunds!==true)return res.status(409).json({error:"بازپرداخت کامل برای این درگاه تا زمان تأیید پشتیبانی از کلید یکتای بازپرداخت مجاز نیست",manualReconciliationRequired:true});
   const idempotencyKey=refund.provider_idempotency_key||("order-full-refund-"+payment.id);
   const claimed=await query("update marketplace_refunds set provider_claim_token=$1,provider_claimed_at=now(),provider_attempt_count=provider_attempt_count+1,provider_last_attempt_at=now(),updated_at=now() where id=$2 and tenant_id=$3 and status='pending' and provider_attempt_count=0 and (provider_claim_token is null or provider_claimed_at<now()-interval '5 minutes') returning id",[claimToken,refund.id,t.id]);
   if(!claimed.rowCount)return res.status(202).json({error:"درخواست بازپرداخت هم‌اکنون توسط فرایند دیگری در حال پردازش یا تطبیق است",pending:true,refundId:refund.id});
   const providerResult=await provider.refundPayment({providerTransactionId:payment.provider_transaction_id||payment.provider_ref||"",amount:Number(refund.amount),metadata:{orderId:order.id,paymentId:payment.id,refundId:refund.id,idempotencyKey}});
   if(providerResult.status!=="refunded"){
    await query("update marketplace_refunds set provider_last_status=$1,provider_last_error=$2,provider_claim_token=null,provider_claimed_at=null,updated_at=now() where id=$3 and tenant_id=$4 and provider_claim_token=$5 and status='pending'",[providerResult.status,"درگاه هنوز بازپرداخت را قطعی تأیید نکرده است",refund.id,t.id,claimToken]);
    return res.status(202).json({error:"درخواست بازپرداخت ثبت شده اما نتیجه درگاه قطعی نیست؛ ابتدا استعلام معتبر انجام دهید",pending:true,providerStatus:providerResult.status,refundId:refund.id});
   }
   providerCode=provider.code;providerRefundId=providerResult.providerTransactionId;providerPayload={...providerResult.providerPayload,idempotencyKey};
   await query("update marketplace_refunds set provider_code=$1,provider_refund_transaction_id=$2,provider_payload=$3,provider_last_status='refunded',provider_last_error=null,provider_claim_token=null,provider_claimed_at=null,updated_at=now() where id=$4 and tenant_id=$5 and provider_claim_token=$6 and status='pending'",[providerCode,providerRefundId,JSON.stringify(providerPayload),refund.id,t.id,claimToken]);
  }catch(e:any){
   const message=String(e?.message||"نتیجه ارتباط با درگاه نامعلوم است").slice(0,500);
   await query("update marketplace_refunds set provider_last_status='unknown',provider_last_error=$1,provider_claim_token=null,provider_claimed_at=null,updated_at=now() where id=$2 and tenant_id=$3 and provider_claim_token=$4 and status='pending'",[message,refund.id,t.id,claimToken]);
   return res.status(202).json({error:"نتیجه درخواست درگاه نامعلوم است؛ درخواست ثبت شد و از ایجاد بازپرداخت مستقل جدید جلوگیری می‌شود",pending:true,providerStatus:"unknown",refundId:refund.id});
  }
 }
 const finalize=await pool.connect();
 try{
  await finalize.query("begin");
  const locked=await finalize.query("select * from marketplace_refunds where id=$1 and tenant_id=$2 for update",[refund.id,t.id]);
  if(!locked.rowCount||locked.rows[0].status!=="pending"||locked.rows[0].provider_last_status!=="refunded"||!locked.rows[0].provider_refund_transaction_id){await finalize.query("rollback");return res.status(409).json({error:"بازپرداخت درگاه هنوز تأیید قطعی و قابل نهایی‌سازی ندارد",pending:true});}
  const currentOrder=await finalize.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[order.id,t.id]);
  const currentPayment=await finalize.query("select * from marketplace_payments where id=$1 and tenant_id=$2 for update",[payment.id,t.id]);
  if(!currentOrder.rowCount||!currentPayment.rowCount){await finalize.query("rollback");return res.status(409).json({error:"سفارش یا پرداخت برای نهایی‌سازی پیدا نشد"});}
  if(providerCode==="credit_facility"){
   const facility=await finalize.query("select id from lendtech_facilities where id=$1 and tenant_ref=$2 for update",[currentOrder.rows[0].credit_facility_ref,t.id]);
   if(!facility.rowCount){await finalize.query("rollback");return res.status(409).json({error:"تسهیلات اعتباری سفارش برای برگشت اعتبار پیدا نشد"});}
   await finalize.query("update lendtech_facilities set available_amount=available_amount+$1,updated_at=now() where id=$2",[Number(refund.amount),currentOrder.rows[0].credit_facility_ref]);
  }
  const rr=await finalize.query("update marketplace_refunds set status='refunded',provider_code=$1,provider_refund_transaction_id=$2,provider_payload=$3,provider_last_status='refunded',provider_last_error=null,updated_at=now() where id=$4 and tenant_id=$5 and status='pending' returning *",[providerCode,providerRefundId,JSON.stringify(providerPayload),refund.id,t.id]);
  if(!rr.rowCount){await finalize.query("rollback");return res.status(409).json({error:"درخواست بازپرداخت قبلاً توسط فرایند دیگری نهایی شده است"});}
  await finalize.query("update marketplace_payments set status='refunded',updated_at=now() where id=$1 and tenant_id=$2 and status='paid'",[payment.id,t.id]);
  await finalize.query("update marketplace_orders set status='refunded',updated_at=now() where id=$1 and tenant_id=$2",[order.id,t.id]);
  if(linkedSupply&&["draft","submitted","approved","assigned"].includes(linkedSupply.status)){
   const reservations=(await finalize.query("select * from marketplace_inventory_reservations where tenant_id=$1 and supply_order_id=$2 and status='reserved' order by inventory_product_id for update",[t.id,linkedSupply.id])).rows;
   for(const reservation of reservations){
    const released=await finalize.query("update inventory_stock set reserved_quantity=reserved_quantity-$1,updated_at=now() where tenant_id=$2 and warehouse_id=$3 and product_id=$4 and reserved_quantity >= $1",[reservation.quantity,t.id,reservation.warehouse_id,reservation.inventory_product_id]);
    if(!released.rowCount)throw new Error("رزرو انبار با دفتر موجودی هم‌خوانی ندارد؛ بازپرداخت متوقف شد");
    await finalize.query("update marketplace_inventory_reservations set status='released',updated_at=now() where id=$1 and tenant_id=$2",[reservation.id,t.id]);
    await finalize.query("insert into inventory_events(tenant_id,entity_type,entity_id,event_type,quantity,actor_user_id,reason) values($1,'marketplace_reservation',$2,'released',$3,$4,$5)",[t.id,reservation.id,reservation.quantity,actorId,"بازپرداخت سفارش "+order.order_no]);
   }
   await finalize.query("update logistics_supply_orders set status='cancelled',updated_at=now() where id=$1 and tenant_id=$2",[linkedSupply.id,t.id]);
   await finalize.query("insert into logistics_events(tenant_id,entity_type,entity_id,event_type,from_status,to_status,actor_user_id,reason) values($1,'supply_order',$2,'refund_cancelled',$3,'cancelled',$4,$5)",[t.id,linkedSupply.id,linkedSupply.status,actorId,"بازپرداخت سفارش فروشگاه"]);
  }
  await postLedgerEntry(finalize,{tenantId:t.id,entryNo:"REF-"+rr.rows[0].refund_no,sourceType:"marketplace_refund",sourceId:rr.rows[0].id,description:"معکوس‌سازی پرداخت سفارش "+currentOrder.rows[0].order_no,createdBy:actorId,lines:[
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",debit:Number(currentOrder.rows[0].seller_payable)},
   {accountCode:"4101",accountName:"درآمد کمیسیون",accountType:"revenue",debit:Number(currentOrder.rows[0].commission_amount)},
   providerCode==="credit_facility"?{accountCode:"1201",accountName:"مطالبات اعتباری مشتریان",accountType:"asset",credit:Number(currentOrder.rows[0].total_amount)}:{accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",credit:Number(currentOrder.rows[0].total_amount)}
  ]});
  const items=await finalize.query("select * from marketplace_order_items where order_id=$1",[order.id]);
  for(const item of items.rows){
   await finalize.query("update product_inventory set quantity=quantity+$1,updated_at=now() where tenant_id=$2 and product_id=$3 and store_id=$4",[item.quantity,t.id,item.product_id,currentOrder.rows[0].store_id]);
   await finalize.query("insert into inventory_movements(tenant_id,product_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) values($1,$2,$3,'refund',$4,'marketplace_refund',$5,$6)",[t.id,item.product_id,currentOrder.rows[0].store_id,Number(item.quantity),rr.rows[0].id,actorId]);
  }
  await finalize.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'payment.refunded','marketplace_order',$3,$4)",[t.id,actorId,order.id,JSON.stringify({refundId:rr.rows[0].id,amount:rr.rows[0].amount,ledgerReversal:true})]);
  await finalize.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"payment.refunded",subjectType:"marketplace_order",subjectId:order.id,userId:actorId,input:{orderId:order.id,refundId:rr.rows[0].id,amount:Number(rr.rows[0].amount)}});
  res.status(201).json({refund:rr.rows[0],order:{id:order.id,status:"refunded"}});
 }catch(e){await finalize.query("rollback");throw e;}finally{finalize.release();}
}));
checkoutRouter.get("/api/marketplace/refunds/reconciliation",requireAuth,requirePermission("payment:refund"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const limit=Math.max(1,Math.min(100,Number(req.query.limit)||50));
 const result=await query("select r.id,r.refund_no,r.order_id,r.payment_id,r.amount,r.reason,r.status,r.provider_code,r.provider_transaction_id,r.provider_refund_transaction_id,r.provider_idempotency_key,r.provider_attempt_count,r.provider_last_attempt_at,r.provider_last_status,r.provider_last_error,r.provider_claimed_at,r.created_at,r.updated_at,o.order_no,o.status as order_status,p.payment_no,p.status as payment_status from marketplace_refunds r join marketplace_orders o on o.id=r.order_id and o.tenant_id=r.tenant_id join marketplace_payments p on p.id=r.payment_id and p.tenant_id=r.tenant_id where r.tenant_id=$1 and r.status='pending' and (r.provider_attempt_count>0 or r.provider_last_status in ('unknown','pending','failed')) order by r.updated_at asc limit $2",[t.id,limit]);
 res.json({items:result.rows});
}));

checkoutRouter.post("/api/marketplace/refunds/:id/reconcile",requireAuth,requirePermission("payment:refund"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const token=randomUUID();
 const claimed=await query("update marketplace_refunds set provider_claim_token=$1,provider_claimed_at=now(),updated_at=now() where id=$2 and tenant_id=$3 and status='pending' and (provider_claim_token is null or provider_claimed_at<now()-interval '5 minutes') returning *",[token,req.params.id,t.id]);
 if(!claimed.rowCount)return res.status(409).json({error:"درخواست پیدا نشد یا هم‌اکنون در حال پردازش است"});
 const refund=claimed.rows[0];
 try{
  if(refund.provider_last_status==="refunded"&&refund.provider_refund_transaction_id){
   await query("update marketplace_refunds set provider_claim_token=null,provider_claimed_at=null where id=$1 and tenant_id=$2 and provider_claim_token=$3",[refund.id,t.id,token]);
   return res.json({status:"refunded",refundId:refund.id,finalizationRequired:true,finalizationEndpoint:"/api/marketplace/orders/"+refund.order_id+"/refund"});
  }
  const provider=getPaymentProvider(refund.provider_code);
  const lookup=await lookupPaymentRefundStatus(provider,{providerTransactionId:refund.provider_transaction_id||"",amount:Number(refund.amount),metadata:{refundId:refund.id,refundNo:refund.refund_no,idempotencyKey:refund.provider_idempotency_key}});
  if(!lookup.supported){
   await query("update marketplace_refunds set provider_claim_token=null,provider_claimed_at=null where id=$1 and tenant_id=$2 and provider_claim_token=$3",[refund.id,t.id,token]);
   return res.status(409).json({error:"این درگاه استعلام مستند وضعیت بازپرداخت را پیاده‌سازی نکرده است؛ تطبیق باید با گزارش رسمی درگاه انجام شود",providerLookupSupported:false,manualReconciliationRequired:true,refundId:refund.id});
  }
  const result=lookup.result;
  if(result.status==="refunded"&&!result.refundTransactionId){
   await query("update marketplace_refunds set provider_last_status='unknown',provider_last_error=$1,provider_payload=$2,provider_claim_token=null,provider_claimed_at=null,updated_at=now() where id=$3 and tenant_id=$4 and provider_claim_token=$5",[ "درگاه وضعیت بازپرداخت را تأیید کرد اما شناسه مستقل بازپرداخت ارائه نشد",JSON.stringify(result.providerPayload),refund.id,t.id,token]);
   return res.status(409).json({error:"درگاه بازپرداخت را تأیید کرده اما شناسه بازپرداخت مستقل برنگردانده است؛ ثبت نهایی خودکار مجاز نیست",manualReconciliationRequired:true,refundId:refund.id});
  }
  await query("update marketplace_refunds set provider_last_status=$1,provider_last_error=$2,provider_refund_transaction_id=case when $1='refunded' then $3 else provider_refund_transaction_id end,provider_payload=$4,provider_claim_token=null,provider_claimed_at=null,updated_at=now() where id=$5 and tenant_id=$6 and provider_claim_token=$7 and status='pending'",[result.status,result.status==="failed"?"درگاه بازپرداخت را ناموفق اعلام کرده است":null,result.refundTransactionId||null,JSON.stringify(result.providerPayload),refund.id,t.id,token]);
  if(result.status==="refunded")return res.json({status:"refunded",refundId:refund.id,finalizationRequired:true,finalizationEndpoint:"/api/marketplace/orders/"+refund.order_id+"/refund"});
  if(result.status==="pending")return res.status(202).json({status:"pending",refundId:refund.id,message:"درگاه هنوز نتیجه قطعی نداده است؛ بعداً دوباره استعلام کنید"});
  return res.status(409).json({status:"failed",refundId:refund.id,manualReconciliationRequired:true,message:"درگاه بازپرداخت را ناموفق اعلام کرده است؛ درخواست جدید بدون بررسی علت مجاز نیست"});
 }catch(error:any){
  const message=String(error?.message||"خطای نامشخص در استعلام درگاه").slice(0,500);
  await query("update marketplace_refunds set provider_last_status='unknown',provider_last_error=$1,provider_claim_token=null,provider_claimed_at=null,updated_at=now() where id=$2 and tenant_id=$3 and provider_claim_token=$4 and status='pending'",[message,refund.id,t.id,token]);
  return res.status(202).json({status:"unknown",refundId:refund.id,manualReconciliationRequired:true,message:"استعلام درگاه کامل نشد؛ وضعیت نامعلوم حفظ شد و بازپرداخت جدیدی ایجاد نشد"});
 }
}));

checkoutRouter.post("/api/marketplace/refunds/:id/confirm-manual",requireAuth,requirePermission("payment:refund"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const providerRefundReference=s(req.body?.providerRefundReference,200);
 const evidenceReference=s(req.body?.evidenceReference,300);
 const confirmationNote=s(req.body?.confirmationNote,1000);
 if(!providerRefundReference||!evidenceReference||!confirmationNote)return res.status(400).json({error:"شناسه بازپرداخت درگاه، مرجع مدرک و توضیح تأیید الزامی است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const selected=await client.query("select * from marketplace_refunds where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!selected.rowCount){await client.query("rollback");return res.status(404).json({error:"درخواست بازپرداخت پیدا نشد"});}
  const refund=selected.rows[0];
  if(refund.status!=="pending"||Number(refund.provider_attempt_count||0)<1||refund.provider_code==="credit_facility"){
   await client.query("rollback");return res.status(409).json({error:"این درخواست واجد شرایط تطبیق دستی نیست"});
  }
  if(refund.provider_last_status==="refunded"&&refund.provider_refund_transaction_id){
   await client.query("rollback");return res.status(200).json({status:"refunded",refundId:refund.id,finalizationRequired:true,alreadyConfirmed:true});
  }
  const priorStatus=refund.provider_last_status||"unknown";
  const payload={...(refund.provider_payload||{}),manualReconciliation:{confirmedBy:(req as any).user.id,confirmedAt:new Date().toISOString(),providerRefundReference,evidenceReference,confirmationNote,previousProviderStatus:priorStatus}};
  const updated=await client.query("update marketplace_refunds set provider_refund_transaction_id=$1,provider_last_status='refunded',provider_last_error=null,provider_payload=$2,updated_at=now() where id=$3 and tenant_id=$4 and status='pending' returning id,order_id",[providerRefundReference,JSON.stringify(payload),refund.id,t.id]);
  if(!updated.rowCount){await client.query("rollback");return res.status(409).json({error:"وضعیت درخواست تغییر کرده است؛ دوباره فهرست را دریافت کنید"});}
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'payment.refund.manually_reconciled','marketplace_refund',$3,$4)",[t.id,(req as any).user.id,refund.id,JSON.stringify({providerRefundReference,evidenceReference,confirmationNote,previousProviderStatus:priorStatus})]);
  await client.query("commit");
  res.json({status:"refunded",refundId:refund.id,orderId:refund.order_id,finalizationRequired:true,finalizationEndpoint:"/api/marketplace/orders/"+refund.order_id+"/refund"});
 }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}));

checkoutRouter.post("/api/marketplace/orders/:id/cancel",requireAuth,requirePermission("order:manage"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const o=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!o.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش پیدا نشد"});}
  if(["paid","processing","shipped","delivered","returned","cancelled","refunded"].includes(o.rows[0].status)){await client.query("rollback");return res.status(409).json({error:"این سفارش باید از مسیر بازگشت وجه یا چرخه مجاز مدیریت شود"});}
  if(["pending","confirmed"].includes(o.rows[0].status)){
   const items=await client.query("select * from marketplace_order_items where order_id=$1",[o.rows[0].id]);
   for(const item of items.rows)await client.query("update product_inventory set reserved_quantity=greatest(0,reserved_quantity-$1),updated_at=now() where tenant_id=$2 and product_id=$3 and store_id=$4",[item.quantity,t.id,item.product_id,o.rows[0].store_id]);
  }
  await client.query("update marketplace_orders set status='cancelled',cancelled_at=now(),updated_at=now(),cancellation_reason=$2 where id=$1 and tenant_id=$3",[o.rows[0].id,s(req.body?.reason,500)||null,t.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id) values($1,$2,'order.cancelled','marketplace_order',$3)",[t.id,(req as any).user.id,o.rows[0].id]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"order.cancelled",subjectType:"marketplace_order",subjectId:o.rows[0].id,userId:(req as any).user.id,input:{orderId:o.rows[0].id}});
  res.json({id:o.rows[0].id,status:"cancelled"});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));


// Public customer self-service uses the same marketplace tables and payment engine.
// The customer identity is always taken from the authenticated session, never from request data.
async function storefrontContext(req:any){return resolvePublicTenant(req);}
checkoutRouter.get("/api/storefront/addresses",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const r=await query("select id,recipient_name,mobile,province,city,address_line,postal_code,is_default,created_at,updated_at from marketplace_customer_addresses where tenant_id=$1 and user_id=$2 order by is_default desc,updated_at desc",[t.id,(req as any).user.id]);
 res.json({items:r.rows,total:r.rowCount});
}));
checkoutRouter.post("/api/storefront/addresses",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const b=req.body||{},recipient=s(b.recipientName,200),mobile=s(b.mobile,20),province=s(b.province,100),city=s(b.city,100),line=s(b.addressLine,2000),postal=s(b.postalCode,20);
 if(recipient.length<2||mobile.replace(/\\D/g,"").length<10||!province||!city||line.length<8||!/^[0-9۰-۹٠-٩-]{5,20}$/.test(postal))return res.status(400).json({error:"نام گیرنده، موبایل، استان، شهر، نشانی و کدپستی معتبر الزامی هستند"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const makeDefault=Boolean(b.isDefault);
  if(makeDefault)await client.query("update marketplace_customer_addresses set is_default=false,updated_at=now() where tenant_id=$1 and user_id=$2",[t.id,(req as any).user.id]);
  const r=await client.query("insert into marketplace_customer_addresses(tenant_id,user_id,recipient_name,mobile,province,city,address_line,postal_code,is_default) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id,recipient_name,mobile,province,city,address_line,postal_code,is_default,created_at,updated_at",[t.id,(req as any).user.id,recipient,mobile,province,city,line,postal,makeDefault]);
  await client.query("commit");res.status(201).json({address:r.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));
checkoutRouter.patch("/api/storefront/addresses/:id",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const b=req.body||{},recipient=s(b.recipientName,200),mobile=s(b.mobile,20),province=s(b.province,100),city=s(b.city,100),line=s(b.addressLine,2000),postal=s(b.postalCode,20);
 if(recipient.length<2||mobile.replace(/\\D/g,"").length<10||!province||!city||line.length<8||!/^[0-9۰-۹٠-٩-]{5,20}$/.test(postal))return res.status(400).json({error:"اطلاعات نشانی معتبر نیست"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const used=await client.query("select 1 from marketplace_orders where delivery_address_id=$1 and tenant_id=$2 limit 1",[req.params.id,t.id]);
  if(used.rowCount){await client.query("rollback");return res.status(409).json({error:"نشانی متصل به سفارش ثبت‌شده قابل ویرایش نیست؛ نشانی جدیدی ثبت کنید"});}
  if(Boolean(b.isDefault))await client.query("update marketplace_customer_addresses set is_default=false,updated_at=now() where tenant_id=$1 and user_id=$2",[t.id,(req as any).user.id]);
  const r=await client.query("update marketplace_customer_addresses set recipient_name=$1,mobile=$2,province=$3,city=$4,address_line=$5,postal_code=$6,is_default=$7,updated_at=now() where id=$8 and tenant_id=$9 and user_id=$10 returning id,recipient_name,mobile,province,city,address_line,postal_code,is_default,updated_at",[recipient,mobile,province,city,line,postal,Boolean(b.isDefault),req.params.id,t.id,(req as any).user.id]);
  if(!r.rowCount){await client.query("rollback");return res.status(404).json({error:"نشانی پیدا نشد"});}
  await client.query("commit");res.json({address:r.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));
checkoutRouter.delete("/api/storefront/addresses/:id",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const owned=await query("select id from marketplace_customer_addresses where id=$1 and tenant_id=$2 and user_id=$3",[req.params.id,t.id,(req as any).user.id]);
 if(!owned.rowCount)return res.status(404).json({error:"نشانی پیدا نشد"});
 const used=await query("select 1 from marketplace_orders where delivery_address_id=$1 and tenant_id=$2 limit 1",[req.params.id,t.id]);
 if(used.rowCount)return res.status(409).json({error:"این نشانی به سفارش ثبت‌شده متصل است و قابل حذف نیست"});
 const r=await query("delete from marketplace_customer_addresses where id=$1 and tenant_id=$2 and user_id=$3 returning id",[req.params.id,t.id,(req as any).user.id]);
 if(!r.rowCount)return res.status(404).json({error:"نشانی پیدا نشد"});
 res.json({deleted:true,id:r.rows[0].id});
}));
checkoutRouter.get("/api/storefront/orders",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const r=await query("select o.id,o.order_no,o.status,o.currency,o.subtotal,o.shipping_amount,o.total_amount,o.delivery_method_id,o.delivery_method_snapshot,o.payment_method,o.created_at,o.paid_at,a.recipient_name,a.mobile,a.province,a.city,a.address_line,a.postal_code,(select jsonb_agg(jsonb_build_object('itemId',oi.id,'productId',oi.product_id,'sku',p.sku,'title',p.title,'quantity',oi.quantity,'unitPrice',oi.unit_price,'lineTotal',oi.line_total) order by oi.created_at) from marketplace_order_items oi join products p on p.id=oi.product_id where oi.order_id=o.id) as items,(select jsonb_agg(jsonb_build_object('id',mp.id,'paymentNo',mp.payment_no,'amount',mp.amount,'method',mp.method,'status',mp.status,'providerCode',mp.provider_code,'paidAt',mp.paid_at) order by mp.created_at desc) from marketplace_payments mp where mp.order_id=o.id and mp.tenant_id=o.tenant_id) as payments,(select coalesce(jsonb_agg(jsonb_build_object('shipmentNo',ls.shipment_no,'status',ls.status,'trackingCode',ls.tracking_code,'origin',ls.origin,'destination',ls.destination,'dispatchAt',ls.dispatch_at,'deliveredAt',ls.delivered_at,'events',coalesce((select jsonb_agg(jsonb_build_object('status',de.status,'location',de.location,'description',de.description,'occurredAt',de.occurred_at) order by de.occurred_at) from logistics_delivery_events de where de.tenant_id=ls.tenant_id and de.shipment_id=ls.id),'[]'::jsonb)) order by ls.created_at desc),'[]'::jsonb) from logistics_supply_orders so join logistics_shipments ls on ls.supply_order_id=so.id and ls.tenant_id=so.tenant_id where so.tenant_id=o.tenant_id and (so.marketplace_order_id=o.id or (so.marketplace_order_id is null and so.order_no=o.order_no))) as shipments from marketplace_orders o left join marketplace_customer_addresses a on a.id=o.delivery_address_id and a.tenant_id=o.tenant_id where o.tenant_id=$1 and o.customer_ref=$2 order by o.created_at desc limit 100",[t.id,(req as any).user.id]);
 res.json({items:r.rows,total:r.rowCount});
}));
checkoutRouter.get("/api/storefront/returns",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const r=await query("select rr.id,rr.request_no,rr.order_id,rr.order_item_id,rr.requested_quantity,rr.reason_code,rr.description,rr.status,rr.decision_reason,rr.received_at,rr.inspected_at,rr.created_at,rr.updated_at,o.order_no,oi.product_id,p.title product_title,oi.quantity order_quantity from marketplace_return_requests rr join marketplace_orders o on o.id=rr.order_id and o.tenant_id=rr.tenant_id join marketplace_order_items oi on oi.id=rr.order_item_id and oi.order_id=o.id join products p on p.id=oi.product_id where rr.tenant_id=$1 and rr.customer_ref=$2 order by rr.created_at desc",[t.id,(req as any).user.id]);
 res.json({items:r.rows,total:r.rowCount});
}));

checkoutRouter.post("/api/storefront/orders/:id/returns",requireAuth,requireCsrf,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const itemId=s(req.body?.orderItemId,100),quantity=n(req.body?.quantity),reason=s(req.body?.reasonCode,40),description=s(req.body?.description,2000);
 const reasons=["damaged","defective","wrong_item","not_as_described","missing_parts","changed_mind","other"];
 if(!itemId||quantity===null||quantity<=0||!Number.isFinite(quantity)||!reasons.includes(reason))return res.status(400).json({error:"قلم سفارش، تعداد و دلیل مرجوعی معتبر الزامی است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const order=await client.query("select id,order_no,status from marketplace_orders where id=$1 and tenant_id=$2 and customer_ref=$3 for update",[req.params.id,t.id,(req as any).user.id]);
  if(!order.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش متعلق به این حساب پیدا نشد"});}
  if(order.rows[0].status!=="delivered"&&order.rows[0].status!=="returned"){await client.query("rollback");return res.status(409).json({error:"درخواست مرجوعی فقط برای سفارش تحویل‌شده قابل ثبت است"});}
  const item=await client.query("select oi.id,oi.quantity,p.title from marketplace_order_items oi join products p on p.id=oi.product_id where oi.id=$1 and oi.order_id=$2 for update of oi",[itemId,order.rows[0].id]);
  if(!item.rowCount){await client.query("rollback");return res.status(404).json({error:"قلم انتخاب‌شده متعلق به این سفارش نیست"});}
  const previous=await client.query("select coalesce(sum(requested_quantity),0)::numeric quantity from marketplace_return_requests where tenant_id=$1 and order_item_id=$2 and status not in ('rejected','cancelled')",[t.id,itemId]);
  const remaining=Number(item.rows[0].quantity)-Number(previous.rows[0].quantity);
  if(quantity>remaining+0.000001){await client.query("rollback");return res.status(409).json({error:"تعداد درخواستی از تعداد باقی‌مانده قابل مرجوعی بیشتر است",remainingQuantity:Math.max(0,remaining)});}
  const requestNo="RET-"+randomUUID().replace(/-/g,"").slice(0,18).toUpperCase();
  const created=await client.query("insert into marketplace_return_requests(tenant_id,order_id,order_item_id,customer_ref,request_no,requested_quantity,reason_code,description) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,request_no,order_id,order_item_id,requested_quantity,reason_code,description,status,created_at",[t.id,order.rows[0].id,itemId,(req as any).user.id,requestNo,quantity,reason,description]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'storefront.return.requested','marketplace_return_request',$3,$4)",[t.id,(req as any).user.id,created.rows[0].id,JSON.stringify({requestNo,orderId:order.rows[0].id,orderItemId:itemId,quantity,reason})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"return.requested",subjectType:"marketplace_return_request",subjectId:created.rows[0].id,userId:(req as any).user.id,input:{requestNo,orderId:order.rows[0].id,orderNo:order.rows[0].order_no}});
  res.status(201).json({item:created.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

checkoutRouter.post("/api/storefront/returns/:id/cancel",requireAuth,requireCsrf,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});const requestId=s(req.params.id,100);
 const client=await pool.connect();
 try{
  await client.query("begin");
  const current=await client.query("select * from marketplace_return_requests where id=$1 and tenant_id=$2 and customer_ref=$3 for update",[requestId,t.id,(req as any).user.id]);
  if(!current.rowCount){await client.query("rollback");return res.status(404).json({error:"درخواست مرجوعی متعلق به این حساب پیدا نشد"});}
  if(current.rows[0].status!=="submitted"){await client.query("rollback");return res.status(409).json({error:"فقط درخواست بررسی‌نشده قابل لغو است"});}
  const updated=await client.query("update marketplace_return_requests set status='cancelled',updated_at=now() where id=$1 and tenant_id=$2 returning id,request_no,status",[requestId,t.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,'storefront.return.cancelled','marketplace_return_request',$3,$4,$5)",[t.id,(req as any).user.id,requestId,JSON.stringify({status:"submitted"}),JSON.stringify({status:"cancelled"})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"return.cancelled",subjectType:"marketplace_return_request",subjectId:requestId,userId:(req as any).user.id,input:{requestNo:updated.rows[0].request_no}});
  res.json({item:updated.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

checkoutRouter.get("/api/marketplace/returns",requireAuth,requirePermission("order:manage"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select rr.*,o.order_no,o.store_id,o.seller_id,oi.product_id,p.title product_title,mr.status refund_status,mr.amount refund_amount,mr.refund_no,mr.provider_last_status refund_provider_status,mr.provider_attempt_count refund_attempt_count,mr.provider_last_attempt_at refund_last_attempt_at,rq.id quarantine_id,rq.quarantine_quantity,rq.status quarantine_status,rq.supplier_name quarantine_supplier_name,rq.supplier_reference quarantine_supplier_reference,rq.disposition_notes quarantine_disposition_notes,rq.supplier_party_id,rq.source_purchase_id,ap.title supplier_party_title from marketplace_return_requests rr join marketplace_orders o on o.id=rr.order_id and o.tenant_id=rr.tenant_id join marketplace_order_items oi on oi.id=rr.order_item_id and oi.order_id=o.id join products p on p.id=oi.product_id left join marketplace_refunds mr on mr.return_request_id=rr.id and mr.tenant_id=rr.tenant_id left join marketplace_return_quarantine rq on rq.return_request_id=rr.id and rq.tenant_id=rr.tenant_id left join accounting_parties ap on ap.id=rq.supplier_party_id and ap.tenant_id=rq.tenant_id where rr.tenant_id=$1 order by rr.created_at desc limit 500",[t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));

checkoutRouter.get("/api/marketplace/returns/refund-reconciliation",requireAuth,requirePermission("order:manage"),requirePermission("payment:refund"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select mr.id,mr.refund_no,mr.return_request_id,mr.order_id,mr.payment_id,mr.amount,mr.status,mr.provider_code,mr.provider_transaction_id,mr.provider_refund_transaction_id,mr.provider_idempotency_key,mr.provider_attempt_count,mr.provider_last_attempt_at,mr.provider_last_status,mr.provider_last_error,mr.provider_claimed_at,mr.created_at,rr.request_no,o.order_no,p.provider_transaction_id payment_provider_transaction_id,p.provider_ref payment_provider_ref,extract(epoch from (now()-coalesce(mr.provider_last_attempt_at,mr.created_at)))/60 age_minutes,(mr.provider_claimed_at is not null and mr.provider_claimed_at>=now()-interval '2 minutes') claim_active from marketplace_refunds mr join marketplace_return_requests rr on rr.id=mr.return_request_id and rr.tenant_id=mr.tenant_id join marketplace_orders o on o.id=mr.order_id and o.tenant_id=mr.tenant_id left join marketplace_payments p on p.id=mr.payment_id and p.tenant_id=mr.tenant_id where mr.tenant_id=$1 and mr.status in ('pending','failed') order by coalesce(mr.provider_last_attempt_at,mr.created_at) asc limit 250",[t.id]);
 const items=r.rows.map((x:any)=>({...x,age_minutes:Number(x.age_minutes||0),claim_active:Boolean(x.claim_active),reconciliation_state:x.claim_active?"processing":x.provider_last_status==="unknown"?"unknown":x.status==="failed"?"failed":"pending"}));
 res.json({items,total:items.length,generatedAt:new Date().toISOString(),capabilities:{automaticProviderRefundLookup:false,manualComparisonRequired:true}});
}));

checkoutRouter.post("/api/marketplace/returns/:id/inspect",requireAuth,requirePermission("order:manage"),requirePermission("modules:23-inventory-warehouse:post"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const requestId=s(req.params.id,100),warehouseId=s(req.body?.warehouseId,100);
 const received=n(req.body?.receivedQuantity),restock=n(req.body?.restockQuantity),notes=s(req.body?.inspectionNotes,2000);
 if(!warehouseId||received===null||restock===null||received<=0||restock<0||restock>received)return res.status(400).json({error:"انبار دریافت، تعداد دریافت‌شده و تعداد سالم قابل بازگشت به موجودی را معتبر وارد کنید"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const rr=(await client.query("select rr.*,oi.product_id,oi.quantity order_quantity from marketplace_return_requests rr join marketplace_order_items oi on oi.id=rr.order_item_id and oi.order_id=rr.order_id where rr.id=$1 and rr.tenant_id=$2 for update of rr,oi",[requestId,t.id])).rows[0];
  if(!rr){await client.query("rollback");return res.status(404).json({error:"درخواست مرجوعی پیدا نشد"});}
  if(rr.status!=="received"){await client.query("rollback");return res.status(409).json({error:"بازرسی فقط پس از ثبت دریافت فیزیکی کالا مجاز است"});}
  if(received>Number(rr.requested_quantity)+0.000001){await client.query("rollback");return res.status(409).json({error:"تعداد دریافت‌شده از تعداد تأییدشده مرجوعی بیشتر است"});}
  const warehouse=(await client.query("select id,name from inventory_warehouses where id=$1 and tenant_id=$2 and status='active' for share",[warehouseId,t.id])).rows[0];
  if(!warehouse){await client.query("rollback");return res.status(400).json({error:"انبار دریافت باید فعال و متعلق به همین سازمان باشد"});}
  const mapping=(await client.query("select mil.inventory_product_id,mil.quantity_factor,ip.name from marketplace_inventory_product_links mil join inventory_products ip on ip.id=mil.inventory_product_id and ip.tenant_id=mil.tenant_id and ip.status='active' where mil.tenant_id=$1 and mil.product_id=$2 for share of mil,ip",[t.id,rr.product_id])).rows[0];
  if(restock>0&&!mapping){await client.query("rollback");return res.status(409).json({error:"برای بازگشت کالای سالم به موجودی، نگاشت فعال کالای فروشگاه به کالای انبار الزامی است"});}
  const warehouseQuantity=restock>0?Number((restock*Number(mapping.quantity_factor)).toFixed(4)):0;
  if(restock>0&&(!Number.isFinite(warehouseQuantity)||warehouseQuantity<=0)){await client.query("rollback");return res.status(409).json({error:"ضریب تبدیل کالای انبار معتبر نیست"});}
  const result=restock===0?"non_restockable":restock+0.000001>=received?"restocked":"partial";
  const documentNo="RET-RCV-"+String(rr.request_no).replace(/[^A-Za-z0-9_-]/g,"").slice(-55);
  const doc=(await client.query("insert into inventory_documents(tenant_id,document_no,type,status,target_warehouse_id,reason,reference_no,created_by,posted_by,posted_at) values($1,$2,'receipt','posted',$3,$4,$5,$6,$6,now()) returning id",[t.id,documentNo,warehouseId,"دریافت و بازرسی مرجوعی "+rr.request_no,rr.request_no,(req as any).user.id])).rows[0];
  if(warehouseQuantity>0){
   await client.query("insert into inventory_document_items(document_id,product_id,quantity,unit_price) values($1,$2,$3,0)",[doc.id,mapping.inventory_product_id,warehouseQuantity]);
   await client.query("insert into inventory_stock(tenant_id,warehouse_id,product_id,quantity,reserved_quantity) values($1,$2,$3,$4,0) on conflict(tenant_id,warehouse_id,product_id) do update set quantity=inventory_stock.quantity+excluded.quantity,updated_at=now()",[t.id,warehouseId,mapping.inventory_product_id,warehouseQuantity]);
  }
  if(received-restock>0){
   await client.query("insert into marketplace_return_quarantine(tenant_id,return_request_id,warehouse_id,quarantine_quantity,status,reason,created_by) values($1,$2,$3,$4,'quarantined',$5,$6)",[t.id,requestId,warehouseId,Number((received-restock).toFixed(3)),"کالای دریافت‌شده و غیرقابل بازگشت به موجودی آزاد؛ "+rr.request_no,(req as any).user.id]);
  }
  const updated=(await client.query("update marketplace_return_requests set status='inspected',received_quantity=$1,restock_quantity=$2,inspection_notes=$3,inspection_result=$4,inspection_warehouse_id=$5,inventory_receipt_document_id=$6,inspected_at=now(),reviewed_by=$7,updated_at=now() where id=$8 and tenant_id=$9 returning *",[received,restock,notes||null,result,warehouseId,doc.id,(req as any).user.id,requestId,t.id])).rows[0];
  await client.query("insert into inventory_events(tenant_id,entity_type,entity_id,event_type,to_status,quantity,actor_user_id,reason) values($1,'document',$2,'posted','posted',$3,$4,$5)",[t.id,doc.id,warehouseQuantity,(req as any).user.id,"رسید مرجوعی "+rr.request_no+"؛ "+result]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,'marketplace.return.inspected','marketplace_return_request',$3,$4,$5)",[t.id,(req as any).user.id,requestId,JSON.stringify({status:"received"}),JSON.stringify({status:"inspected",receivedQuantity:received,restockQuantity:restock,warehouseId,inventoryReceiptDocumentId:doc.id,inspectionResult:result})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"return.inspected",subjectType:"marketplace_return_request",subjectId:requestId,userId:(req as any).user.id,input:{requestNo:rr.request_no,inspectionResult:result,restockQuantity:restock,inventoryReceiptDocumentId:doc.id}});
  res.json({item:updated,inventoryReceipt:{id:doc.id,documentNo,status:"posted",warehouseId,restockedQuantity:warehouseQuantity,inspectionResult:result}});
 }catch(e:any){await client.query("rollback");throw e;}finally{client.release();}
}));

checkoutRouter.get("/api/marketplace/returns/finance-mappings",requireAuth,requirePermission("accounting-finance.read"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const [products,warehouses,inventoryProducts,financeProducts,inventoryWarehouses,financeWarehouses]=await Promise.all([
  query("select l.id,l.inventory_product_id,ip.sku inventory_sku,ip.name inventory_name,l.finance_product_id,fp.code finance_code,fp.title finance_title,l.quantity_factor,l.status from marketplace_finance_product_links l join inventory_products ip on ip.id=l.inventory_product_id and ip.tenant_id=l.tenant_id join finance_products fp on fp.id=l.finance_product_id and fp.tenant_id=l.tenant_id where l.tenant_id=$1 order by ip.name",[t.id]),
  query("select l.id,l.inventory_warehouse_id,iw.code inventory_code,iw.name inventory_name,l.finance_warehouse_id,fw.code finance_code,fw.title finance_title,l.status from marketplace_finance_warehouse_links l join inventory_warehouses iw on iw.id=l.inventory_warehouse_id and iw.tenant_id=l.tenant_id join finance_warehouses fw on fw.id=l.finance_warehouse_id and fw.tenant_id=l.tenant_id where l.tenant_id=$1 order by iw.name",[t.id]),
  query("select id,sku,name from inventory_products where tenant_id=$1 and status='active' order by name",[t.id]),
  query("select id,code,title from finance_products where tenant_id=$1 and is_active=true order by title",[t.id]),
  query("select id,code,name from inventory_warehouses where tenant_id=$1 and status='active' order by name",[t.id]),
  query("select id,code,title from finance_warehouses where tenant_id=$1 and status='active' order by title",[t.id])
 ]);
 res.json({products:products.rows,warehouses:warehouses.rows,inventoryProducts:inventoryProducts.rows,financeProducts:financeProducts.rows,inventoryWarehouses:inventoryWarehouses.rows,financeWarehouses:financeWarehouses.rows});
}));

checkoutRouter.get("/api/marketplace/returns/finance-handover-readiness",requireAuth,requirePermission("order:manage"),requirePermission("accounting-finance.read"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query(`select q.id,q.return_request_id,rr.request_no,q.status,q.quarantine_quantity,q.warehouse_id,iw.code inventory_warehouse_code,iw.name inventory_warehouse_name,iw.status inventory_warehouse_status,
  q.supplier_party_id,ap.party_code supplier_code,ap.title supplier_title,ap.party_type supplier_type,ap.status supplier_status,
  q.source_purchase_id,p.invoice_no purchase_invoice_no,p.status purchase_status,p.supplier_id purchase_supplier_id,
  q.finance_product_id,fp.code finance_product_code,fp.title finance_product_title,fp.is_active finance_product_active,q.finance_quantity,
  exists(select 1 from finance_purchase_lines fpl where fpl.purchase_id=p.id and fpl.product_id=q.finance_product_id) purchase_line_matches_product,
  fwl.finance_warehouse_id,fw.code finance_warehouse_code,fw.title finance_warehouse_title,fw.status finance_warehouse_status
 from marketplace_return_quarantine q
 join marketplace_return_requests rr on rr.id=q.return_request_id and rr.tenant_id=q.tenant_id
 left join inventory_warehouses iw on iw.id=q.warehouse_id and iw.tenant_id=q.tenant_id
 left join accounting_parties ap on ap.id=q.supplier_party_id and ap.tenant_id=q.tenant_id
 left join finance_purchases p on p.id=q.source_purchase_id and p.tenant_id=q.tenant_id
 left join finance_products fp on fp.id=q.finance_product_id and fp.tenant_id=q.tenant_id
 left join marketplace_finance_warehouse_links fwl on fwl.tenant_id=q.tenant_id and fwl.inventory_warehouse_id=q.warehouse_id and fwl.status='active'
 left join finance_warehouses fw on fw.id=fwl.finance_warehouse_id and fw.tenant_id=q.tenant_id
 where q.tenant_id=$1 and q.status in ('quarantined','supplier_handover')
 order by q.created_at desc limit 500`,[t.id]);
 const items=r.rows.map((item:any)=>{
  const blockers:string[]=[];
  if(item.status!=="supplier_handover")blockers.push("تحویل فیزیکی به تأمین‌کننده هنوز ثبت نشده است");
  if(item.supplier_type!=="supplier"||item.supplier_status!=="active")blockers.push("طرف‌حساب تأمین‌کننده فعال و معتبر ثبت نشده است");
  if(!item.source_purchase_id||!["confirmed","received","paid"].includes(item.purchase_status))blockers.push("فاکتور خرید مرجع معتبر ثبت نشده است");
  if(item.purchase_supplier_id!==item.supplier_party_id)blockers.push("تأمین‌کننده فاکتور خرید با تأمین‌کننده تحویل یکسان نیست");
  if(!item.finance_product_id||!Number(item.finance_quantity))blockers.push("snapshot کالای مالی و مقدار تبدیل‌شده موجود نیست");
  if(item.finance_product_active!==true)blockers.push("کالای مالی snapshot‌شده فعال یا قابل شناسایی نیست");
  if(item.purchase_line_matches_product!==true)blockers.push("ردیف کالای متناظر در فاکتور خرید پیدا نشد");
  if(item.inventory_warehouse_status!=="active"||item.finance_warehouse_id===null||item.finance_warehouse_status!=="active")blockers.push("انبار قرنطینه و نگاشت آن به انبار مالی باید فعال باشند");
  return {...item,structuralReady:blockers.length===0,blockers,postingReady:false};
 });
 res.json({items,summary:{total:items.length,structurallyReady:items.filter((x:any)=>x.structuralReady).length,blocked:items.filter((x:any)=>!x.structuralReady).length},postingPolicy:{ready:false,blockers:["گردش ثبت رسید قرنطینه در دفتر موجودی مالی هنوز پیاده‌سازی نشده است","روش مصوب ارزش‌گذاری کالای برگشتی و بهای تمام‌شده هنوز در مدل فعلی تعیین نشده است"],note:"این گزارش فقط‌خواندنی است و هیچ سند، مانده موجودی یا ثبت حسابداری ایجاد یا تغییر نمی‌دهد."}});
}));
checkoutRouter.put("/api/marketplace/returns/finance-mappings/products",requireAuth,requirePermission("accounting-finance.write"),requirePermission("modules:23-inventory-warehouse:write"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const inventoryProductId=s(req.body?.inventoryProductId,100),financeProductId=s(req.body?.financeProductId,100),factor=Number(req.body?.quantityFactor??1);
 if(!inventoryProductId||!financeProductId||!Number.isFinite(factor)||factor<=0)return res.status(400).json({error:"کالاهای متناظر و ضریب تبدیل مثبت الزامی است"});
 const client=await pool.connect();try{await client.query("begin");
  const pair=await client.query("select ip.id inventory_id,fp.id finance_id from inventory_products ip join finance_products fp on fp.id=$2 and fp.tenant_id=ip.tenant_id where ip.id=$1 and ip.tenant_id=$3 and ip.status='active' and fp.is_active=true for share of ip,fp",[inventoryProductId,financeProductId,t.id]);
  if(!pair.rowCount){await client.query("rollback");return res.status(400).json({error:"هر دو کالا باید فعال و متعلق به همین سازمان باشند"});}
  const saved=await client.query("insert into marketplace_finance_product_links(tenant_id,inventory_product_id,finance_product_id,quantity_factor,created_by,status) values($1,$2,$3,$4,$5,'active') on conflict(tenant_id,inventory_product_id) do update set finance_product_id=excluded.finance_product_id,quantity_factor=excluded.quantity_factor,status='active',updated_at=now() returning *",[t.id,inventoryProductId,financeProductId,factor,(req as any).user.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'marketplace.finance.product_link.upsert','marketplace_finance_product_link',$3,$4)",[t.id,(req as any).user.id,saved.rows[0].id,JSON.stringify({inventoryProductId,financeProductId,quantityFactor:factor})]);
  await client.query("commit");res.json({item:saved.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));
checkoutRouter.put("/api/marketplace/returns/finance-mappings/warehouses",requireAuth,requirePermission("accounting-finance.write"),requirePermission("modules:23-inventory-warehouse:write"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const inventoryWarehouseId=s(req.body?.inventoryWarehouseId,100),financeWarehouseId=s(req.body?.financeWarehouseId,100);
 if(!inventoryWarehouseId||!financeWarehouseId)return res.status(400).json({error:"انتخاب هر دو انبار الزامی است"});
 const client=await pool.connect();try{await client.query("begin");
  const pair=await client.query("select iw.id inventory_id,fw.id finance_id from inventory_warehouses iw join finance_warehouses fw on fw.id=$2 and fw.tenant_id=iw.tenant_id where iw.id=$1 and iw.tenant_id=$3 and iw.status='active' and fw.status='active' for share of iw,fw",[inventoryWarehouseId,financeWarehouseId,t.id]);
  if(!pair.rowCount){await client.query("rollback");return res.status(400).json({error:"هر دو انبار باید فعال و متعلق به همین سازمان باشند"});}
  const saved=await client.query("insert into marketplace_finance_warehouse_links(tenant_id,inventory_warehouse_id,finance_warehouse_id,created_by,status) values($1,$2,$3,$4,'active') on conflict(tenant_id,inventory_warehouse_id) do update set finance_warehouse_id=excluded.finance_warehouse_id,status='active',updated_at=now() returning *",[t.id,inventoryWarehouseId,financeWarehouseId,(req as any).user.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'marketplace.finance.warehouse_link.upsert','marketplace_finance_warehouse_link',$3,$4)",[t.id,(req as any).user.id,saved.rows[0].id,JSON.stringify({inventoryWarehouseId,financeWarehouseId})]);
  await client.query("commit");res.json({item:saved.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

checkoutRouter.get("/api/marketplace/returns/suppliers",requireAuth,requirePermission("order:manage"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select id,party_code,title,phone from accounting_parties where tenant_id=$1 and party_type='supplier' and status='active' order by title limit 500",[t.id]);
 res.json({items:r.rows});
}));
checkoutRouter.get("/api/marketplace/returns/suppliers/:supplierId/purchases",requireAuth,requirePermission("order:manage"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const supplier=await query("select id from accounting_parties where id=$1 and tenant_id=$2 and party_type='supplier' and status='active'",[s(req.params.supplierId,100),t.id]);
 if(!supplier.rowCount)return res.status(404).json({error:"تأمین‌کننده فعال پیدا نشد"});
 const r=await query("select id,invoice_no,invoice_date,status,total from finance_purchases where tenant_id=$1 and supplier_id=$2 and status in ('confirmed','received','paid') order by invoice_date desc nulls last,created_at desc limit 250",[t.id,supplier.rows[0].id]);
 res.json({items:r.rows});
}));

checkoutRouter.patch("/api/marketplace/returns/:id/disposition",requireAuth,requirePermission("order:manage"),requirePermission("modules:23-inventory-warehouse:write"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const requestId=s(req.params.id,100),action=s(req.body?.action,32),supplierPartyId=s(req.body?.supplierPartyId,100),purchaseId=s(req.body?.purchaseId,100),supplierName=s(req.body?.supplierName,200),supplierReference=s(req.body?.supplierReference,160),notes=s(req.body?.notes,2000);
 if(!["supplier_handover","disposed"].includes(action))return res.status(400).json({error:"نوع تعیین تکلیف معتبر نیست"});
 if(action==="supplier_handover"&&!supplierPartyId)return res.status(400).json({error:"انتخاب تأمین‌کننده معتبر از دفتر طرف‌حساب‌ها الزامی است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const q=(await client.query("select q.*,rr.request_no,rr.status return_status from marketplace_return_quarantine q join marketplace_return_requests rr on rr.id=q.return_request_id and rr.tenant_id=q.tenant_id where q.tenant_id=$1 and q.return_request_id=$2 for update of q,rr",[t.id,requestId])).rows[0];
  if(!q){await client.query("rollback");return res.status(404).json({error:"پرونده قرنطینه برای این مرجوعی ثبت نشده است"});}
  if(q.status!=="quarantined"||q.return_status!=="inspected"){await client.query("rollback");return res.status(409).json({error:"این پرونده قبلاً تعیین تکلیف شده یا وضعیت مرجوعی معتبر نیست"});}
  let supplierTitle:string|null=null, handoverFinanceProductId:string|null=null, handoverFinanceQuantity:number|null=null;
  if(action==="supplier_handover"){
   const supplier=(await client.query("select id,title from accounting_parties where id=$1 and tenant_id=$2 and party_type='supplier' and status='active' for share",[supplierPartyId,t.id])).rows[0];
   if(!supplier){await client.query("rollback");return res.status(400).json({error:"تأمین‌کننده انتخاب‌شده فعال و متعلق به همین سازمان نیست"});}
   supplierTitle=supplier.title;
   if(purchaseId){
    const purchase=(await client.query("select id from finance_purchases where id=$1 and tenant_id=$2 and supplier_id=$3 and status in ('confirmed','received','paid') for update",[purchaseId,t.id,supplierPartyId])).rows[0];
    if(!purchase){await client.query("rollback");return res.status(400).json({error:"فاکتور خرید باید متعلق به همین تأمین‌کننده و در وضعیت معتبر باشد"});}
    const purchaseLines=(await client.query("select fpl.product_id,fpl.quantity,mil.quantity_factor inventory_factor,mfl.quantity_factor finance_factor from finance_purchase_lines fpl join marketplace_return_requests rr on rr.id=$3 and rr.tenant_id=$2 join marketplace_order_items oi on oi.id=rr.order_item_id and oi.order_id=rr.order_id join marketplace_inventory_product_links mil on mil.tenant_id=rr.tenant_id and mil.product_id=oi.product_id join marketplace_finance_product_links mfl on mfl.tenant_id=mil.tenant_id and mfl.inventory_product_id=mil.inventory_product_id and mfl.status='active' and mfl.finance_product_id=fpl.product_id where fpl.purchase_id=$1 for share of fpl,mil,mfl",[purchaseId,t.id,requestId])).rows;
    const purchaseLine=purchaseLines[0];
    if(!purchaseLine){await client.query("rollback");return res.status(400).json({error:"فاکتور خرید باید ردیف کالای متناظر با نگاشت فعال مالی داشته باشد"});}
    const purchaseQuantity=purchaseLines.reduce((sum:any,line:any)=>sum+Number(line.quantity),0);
    const priorReturns=(await client.query("select coalesce(sum(pq.finance_quantity) filter(where pq.finance_product_id=$3),0)::numeric returned_quantity,(count(*) filter(where pq.finance_product_id is null or pq.finance_quantity is null))::int legacy_count from marketplace_return_quarantine pq where pq.tenant_id=$1 and pq.source_purchase_id=$2 and pq.status='supplier_handover'",[t.id,purchaseId,purchaseLine.product_id])).rows[0];
    if(Number(priorReturns?.legacy_count||0)>0){await client.query("rollback");return res.status(409).json({error:"تحویل‌های قبلی این فاکتور فاقد snapshot مقدار مالی هستند؛ ابتدا باید سوابق آن‌ها بازبینی و تطبیق شوند"});}
    const financeQuantity=Number((Number(q.quarantine_quantity)*Number(purchaseLine.inventory_factor)*Number(purchaseLine.finance_factor)).toFixed(4));
    if(!Number.isFinite(financeQuantity)||financeQuantity<=0||Number(priorReturns?.returned_quantity||0)+financeQuantity>purchaseQuantity+0.0001){await client.query("rollback");return res.status(409).json({error:"مقدار کالای قرنطینه از مقدار باقیمانده ردیف کالای فاکتور خرید بیشتر است"});}
    handoverFinanceProductId=purchaseLine.product_id;handoverFinanceQuantity=financeQuantity;
   }
  }
  const updated=(await client.query("update marketplace_return_quarantine set status=$1,supplier_party_id=$2,source_purchase_id=$3,finance_product_id=$4,finance_quantity=$5,supplier_name=$6,supplier_reference=$7,disposition_notes=$8,resolved_by=$9,resolved_at=now() where id=$10 and tenant_id=$11 returning *",[action,action==="supplier_handover"?supplierPartyId:null,action==="supplier_handover"?(purchaseId||null):null,handoverFinanceProductId,handoverFinanceQuantity,action==="supplier_handover"?(supplierTitle||null):null,supplierReference||null,notes||null,(req as any).user.id,q.id,t.id])).rows[0];
  await client.query("insert into inventory_events(tenant_id,entity_type,entity_id,event_type,from_status,to_status,quantity,actor_user_id,reason) values($1,'marketplace_return_quarantine',$2,'disposition','quarantined',$3,$4,$5,$6)",[t.id,q.id,action,q.quarantine_quantity,(req as any).user.id,notes||supplierTitle||supplierName||"تعیین تکلیف کالای قرنطینه"]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,'marketplace.return.quarantine.disposed','marketplace_return_quarantine',$3,$4,$5)",[t.id,(req as any).user.id,q.id,JSON.stringify({status:"quarantined"}),JSON.stringify({status:action,supplierName:supplierName||null,supplierReference:supplierReference||null,notes:notes||null})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"return.quarantine.disposition",subjectType:"marketplace_return_quarantine",subjectId:q.id,userId:(req as any).user.id,input:{requestNo:q.request_no,status:action,quantity:q.quarantine_quantity}});
  res.json({item:updated});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

checkoutRouter.patch("/api/marketplace/returns/:id/status",requireAuth,requirePermission("order:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const requestId=s(req.params.id,100);
 const target=s(req.body?.status,24),reason=s(req.body?.decisionReason,1000);
 const client=await pool.connect();
 try{
  await client.query("begin");
  const current=await client.query("select * from marketplace_return_requests where id=$1 and tenant_id=$2 for update",[requestId,t.id]);
  if(!current.rowCount){await client.query("rollback");return res.status(404).json({error:"درخواست مرجوعی پیدا نشد"});}
  const transitions:Record<string,string[]>={submitted:["approved","rejected"],approved:["received","cancelled"],inspected:["closed"]};
  if(!(transitions[current.rows[0].status]||[]).includes(target)){await client.query("rollback");return res.status(409).json({error:"تغییر وضعیت درخواست مرجوعی مجاز نیست"});}
  if(target==="closed"){
   const pendingQuarantine=await client.query("select 1 from marketplace_return_quarantine where tenant_id=$1 and return_request_id=$2 and status='quarantined' for update",[t.id,requestId]);
   if(pendingQuarantine.rowCount){await client.query("rollback");return res.status(409).json({error:"ابتدا کالای غیرقابل فروش را از قرنطینه تعیین تکلیف کنید"});}
  }
  if(target==="rejected"&&!reason){await client.query("rollback");return res.status(400).json({error:"دلیل رد درخواست الزامی است"});}
  const updated=await client.query("update marketplace_return_requests set status=$1,decision_reason=$2,reviewed_by=$3,received_at=case when $1='received' then now() else received_at end,inspected_at=case when $1='inspected' then now() else inspected_at end,updated_at=now() where id=$4 and tenant_id=$5 returning *",[target,reason||null,(req as any).user.id,requestId,t.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,'marketplace.return.status.changed','marketplace_return_request',$3,$4,$5)",[t.id,(req as any).user.id,requestId,JSON.stringify({status:current.rows[0].status}),JSON.stringify({status:target,reason})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"return.status.changed",subjectType:"marketplace_return_request",subjectId:requestId,userId:(req as any).user.id,input:{requestNo:updated.rows[0].request_no,status:target}});
  res.json({item:updated.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

const processMarketplaceReturnRefund=asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const requestId=s(req.params.id,100),client=await pool.connect();
 let refund:any=null,order:any=null,payment:any=null,returnItem:any=null;
 try{
  await client.query("begin");
  const rr=await client.query("select * from marketplace_return_requests where id=$1 and tenant_id=$2 for update",[requestId,t.id]);
  if(!rr.rowCount){await client.query("rollback");return res.status(404).json({error:"درخواست مرجوعی پیدا نشد"});}
  if(rr.rows[0].status==="closed"){
   const prior=await client.query("select * from marketplace_refunds where tenant_id=$1 and return_request_id=$2",[t.id,requestId]);
   await client.query("commit");
   if(prior.rowCount&&prior.rows[0].status==="refunded")return res.status(200).json({refund:prior.rows[0],alreadyRefunded:true,pending:false});
   return res.status(409).json({error:"پرونده مرجوعی بسته شده اما بازپرداخت قطعی ثبت نشده است؛ بررسی دستی لازم است",refund:prior.rows[0]||null,manualReconciliationRequired:true});
  }
  if(rr.rows[0].status!=="inspected"){await client.query("rollback");return res.status(409).json({error:"بازپرداخت فقط پس از دریافت و تأیید بازرسی مجاز است"});}
  const existing=await client.query("select * from marketplace_refunds where tenant_id=$1 and return_request_id=$2 for update",[t.id,requestId]);
  if(String(req.path||"").endsWith("/refund/retry")&&!existing.rowCount){await client.query("rollback");return res.status(404).json({error:"برای این مرجوعی درخواست بازپرداخت قبلی جهت تلاش مجدد وجود ندارد"});}
  if(existing.rowCount&&existing.rows[0].status==="refunded"){
   await client.query("commit");return res.status(200).json({refund:existing.rows[0],alreadyRefunded:true,pending:false});
  }
  if(existing.rowCount){
   const claim=await client.query("update marketplace_refunds set provider_claim_token=gen_random_uuid(),provider_claimed_at=now(),provider_attempt_count=greatest(provider_attempt_count+1,2),provider_last_attempt_at=now(),provider_idempotency_key=coalesce(provider_idempotency_key,'return-refund-'||id::text),updated_at=now() where id=$1 and tenant_id=$2 and status in ('pending','failed') and (provider_claimed_at is null or provider_claimed_at<now()-interval '2 minutes') returning *",[existing.rows[0].id,t.id]);
   if(!claim.rowCount){
    await client.query("commit");return res.status(202).json({refund:existing.rows[0],pending:existing.rows[0].status==="pending",retryInSeconds:30,message:"درخواست بازپرداخت دیگری در حال پیگیری است"});
   }
   const ord=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[rr.rows[0].order_id,t.id]);
   const pay=await client.query("select * from marketplace_payments where id=$1 and tenant_id=$2 for update",[claim.rows[0].payment_id,t.id]);
   const item=await client.query("select oi.id,oi.product_id,oi.quantity,oi.unit_price,oi.line_total,oi.quantity order_quantity,p.title from marketplace_order_items oi join products p on p.id=oi.product_id where oi.id=$1 and oi.order_id=$2 for update of oi",[rr.rows[0].order_item_id,rr.rows[0].order_id]);
   if(!ord.rowCount||!pay.rowCount||!item.rowCount){await client.query("rollback");return res.status(409).json({error:"اطلاعات سفارش، پرداخت یا قلم مرجوعی برای تلاش مجدد پیدا نشد"});}
   const snapshot=claim.rows[0].provider_payload||{};
   const receivedQuantity=Number(snapshot.receivedQuantity??snapshot.quantity??rr.rows[0].received_quantity),restockQuantity=Number(snapshot.restockQuantity??rr.rows[0].restock_quantity),quarantineQuantity=Number(snapshot.quarantineQuantity??(receivedQuantity-restockQuantity));
   if(!Number.isFinite(receivedQuantity)||receivedQuantity<=0||receivedQuantity>Number(rr.rows[0].requested_quantity)||!Number.isFinite(restockQuantity)||restockQuantity<0||restockQuantity>receivedQuantity){await client.query("rollback");return res.status(409).json({error:"snapshot مقادیر مرجوعی برای تلاش مجدد معتبر نیست"});}
   const returnSnapshot={receivedQuantity,restockQuantity,quarantineQuantity};
   await client.query("update marketplace_refunds set provider_payload=coalesce(provider_payload,'{}'::jsonb)||$1::jsonb where id=$2 and tenant_id=$3 and provider_claim_token=$4",[JSON.stringify(returnSnapshot),claim.rows[0].id,t.id,claim.rows[0].provider_claim_token]);
   refund=claim.rows[0];order=ord.rows[0];payment=pay.rows[0];returnItem={...item.rows[0],quantity:receivedQuantity,receivedQuantity,restockQuantity,quarantineQuantity};
  }else{
  const ord=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[rr.rows[0].order_id,t.id]);
  if(!ord.rowCount||!["paid","processing","delivered","returned"].includes(ord.rows[0].status)){await client.query("rollback");return res.status(409).json({error:"سفارش در وضعیت قابل بازپرداخت نیست"});}
  const item=await client.query("select oi.id,oi.product_id,oi.quantity,oi.quantity order_quantity,oi.unit_price,oi.line_total,p.title from marketplace_order_items oi join products p on p.id=oi.product_id where oi.id=$1 and oi.order_id=$2 for update of oi",[rr.rows[0].order_item_id,ord.rows[0].id]);
  if(!item.rowCount){await client.query("rollback");return res.status(404).json({error:"قلم سفارش برای این درخواست پیدا نشد"});}
  const qty=Number(rr.rows[0].received_quantity),restockQuantity=Number(rr.rows[0].restock_quantity),orderedQuantity=Number(item.rows[0].order_quantity),lineTotal=Number(item.rows[0].line_total);
  const amount=Number((lineTotal*qty/orderedQuantity).toFixed(2));
  if(!Number.isFinite(qty)||qty<=0||qty>Number(rr.rows[0].requested_quantity)||!Number.isFinite(restockQuantity)||restockQuantity<0||restockQuantity>qty||!Number.isFinite(orderedQuantity)||orderedQuantity<=0||!Number.isFinite(lineTotal)||lineTotal<0||!Number.isFinite(amount)||amount<=0){await client.query("rollback");return res.status(409).json({error:"مقدار دریافت‌شده یا مبلغ متناسب با ردیف سفارش معتبر نیست"});}
  const priorItemRefunds=await client.query("select coalesce(sum(mr.amount),0) amount from marketplace_refunds mr join marketplace_return_requests prior_rr on prior_rr.id=mr.return_request_id and prior_rr.tenant_id=mr.tenant_id where mr.tenant_id=$1 and prior_rr.order_item_id=$2 and prior_rr.id<>$3 and mr.status in ('pending','refunded')",[t.id,item.rows[0].id,requestId]);
  if(Number(priorItemRefunds.rows[0].amount)+amount>lineTotal+0.005){await client.query("rollback");return res.status(409).json({error:"مجموع بازپرداخت‌های این قلم از مبلغ خالص ردیف سفارش بیشتر می‌شود",remainingAmount:Math.max(0,lineTotal-Number(priorItemRefunds.rows[0].amount))});}
  const pay=await client.query("select * from marketplace_payments where tenant_id=$1 and order_id=$2 and status='paid' order by paid_at desc nulls last,created_at desc limit 1 for update",[t.id,ord.rows[0].id]);
  if(!pay.rowCount){await client.query("rollback");return res.status(409).json({error:"پرداخت موفق سفارش برای بازپرداخت پیدا نشد"});}
  const paymentRefunded=await client.query("select coalesce(sum(amount),0) amount from marketplace_refunds where tenant_id=$1 and payment_id=$2 and status in ('pending','refunded')",[t.id,pay.rows[0].id]);
  if(Number(paymentRefunded.rows[0].amount)+amount>Number(pay.rows[0].amount)+0.005){await client.query("rollback");return res.status(409).json({error:"مبلغ این مرجوعی از مانده قابل بازپرداخت پرداخت بیشتر است",remainingAmount:Math.max(0,Number(pay.rows[0].amount)-Number(paymentRefunded.rows[0].amount))});}
  const requestNo=String(rr.rows[0].request_no);
  const refundNo="RET-"+requestId.replace(/-/g,"").slice(0,24);
  const claimToken=randomUUID(),idempotencyKey="return-refund-"+requestId;
  const inserted=await client.query("insert into marketplace_refunds(tenant_id,order_id,payment_id,return_request_id,refund_no,amount,reason,status,provider_code,provider_transaction_id,provider_payload,created_by,provider_idempotency_key,provider_attempt_count,provider_last_attempt_at,provider_claim_token,provider_claimed_at) values($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11,$12,1,now(),$13,now()) returning *",[t.id,ord.rows[0].id,pay.rows[0].id,requestId,refundNo,amount,"مرجوعی "+requestNo,pay.rows[0].provider_code,pay.rows[0].provider_transaction_id||pay.rows[0].provider_ref||"",JSON.stringify({returnRequestId:requestId,requestNo,quantity:qty,receivedQuantity:qty,restockQuantity,quarantineQuantity:Number((qty-restockQuantity).toFixed(3)),orderLineTotal:lineTotal}), (req as any).user.id,idempotencyKey,claimToken]);
  refund=inserted.rows[0];order=ord.rows[0];payment=pay.rows[0];returnItem={...item.rows[0],quantity:qty,receivedQuantity:qty,restockQuantity,quarantineQuantity:Number((qty-restockQuantity).toFixed(3))};
  }
  await client.query("commit");
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
 if(!refund)return;
 let providerCode=payment.provider_code,providerRefundId="",providerPayload:any={};
 if(providerCode==="credit_facility"){
  if(!order.credit_facility_ref)throw new Error("مرجع تسهیلات اعتبار خرید روی سفارش ثبت نشده است");
  const providerResult={status:"refunded",providerTransactionId:"credit-"+refund.id,providerPayload:{creditFacilityId:order.credit_facility_ref,restoredAmount:Number(refund.amount)}};
  providerRefundId=providerResult.providerTransactionId;providerPayload=providerResult.providerPayload;
 }else{
  let provider:any,providerResult:any;
  try{
   provider=getPaymentProvider(providerCode);
   if(Number(refund.provider_attempt_count)>1&&provider.supportsIdempotentRefunds!==true){
    await query("update marketplace_refunds set provider_last_error=$1,provider_claim_token=null,provider_claimed_at=null,updated_at=now() where id=$2 and tenant_id=$3 and provider_claim_token=$4",["قابلیت idempotency بازپرداخت برای این درگاه تأیید نشده است؛ ابتدا وضعیت تراکنش در پنل پذیرنده تطبیق داده شود",refund.id,t.id,refund.provider_claim_token]);
    return res.status(409).json({error:"تلاش مجدد خودکار مسدود است؛ پشتیبانی درگاه از کلید یکتای بازپرداخت تأیید نشده است",manualReconciliationRequired:true,retryable:false});
   }
   providerResult=await provider.refundPayment({providerTransactionId:payment.provider_transaction_id||payment.provider_ref||"",amount:Number(refund.amount),metadata:{orderId:order.id,paymentId:payment.id,returnRequestId:requestId,refundId:refund.id,idempotencyKey:refund.provider_idempotency_key}});
  }catch(providerError:any){
   const message=String(providerError?.message||"خطای نامشخص در ارتباط با درگاه").slice(0,500);
   await query("update marketplace_refunds set status='pending',provider_last_status='unknown',provider_last_error=$1,provider_claim_token=null,provider_claimed_at=null,updated_at=now() where id=$2 and tenant_id=$3 and provider_claim_token=$4",[message,refund.id,t.id,refund.provider_claim_token]);
   return res.status(202).json({error:"نتیجه درخواست درگاه قطعی نیست؛ بازپرداخت در وضعیت انتظار باقی ماند و با همان شناسه امن قابل پیگیری است",pending:true,providerStatus:"unknown"});
  }
  if(providerResult.status!=="refunded"){
   const terminalFailure=providerResult.status==="failed";
   await query("update marketplace_refunds set status=$1,provider_last_status=$2,provider_last_error=null,provider_payload=coalesce(provider_payload,'{}'::jsonb)||jsonb_build_object('lastProviderResponse',$3::jsonb),provider_claim_token=null,provider_claimed_at=null,updated_at=now() where id=$4 and tenant_id=$5 and provider_claim_token=$6",[terminalFailure?"failed":"pending",providerResult.status,JSON.stringify(providerResult.providerPayload),refund.id,t.id,refund.provider_claim_token]);
   return res.status(terminalFailure?409:202).json({error:terminalFailure?"درگاه بازپرداخت را ناموفق اعلام کرد؛ تلاش مجدد با همان شناسه امن در دسترس است":"درخواست بازپرداخت هنوز در درگاه تعیین تکلیف نشده است",providerStatus:providerResult.status,pending:!terminalFailure,retryable:true});
  }
  providerCode=provider.code;providerRefundId=providerResult.providerTransactionId;providerPayload=providerResult.providerPayload;
 }
 const finalize=await pool.connect();
 try{
  await finalize.query("begin");
  const locked=await finalize.query("select * from marketplace_refunds where id=$1 and tenant_id=$2 for update",[refund.id,t.id]);
  if(!locked.rowCount||locked.rows[0].status!=="pending"||locked.rows[0].provider_claim_token!==refund.provider_claim_token){await finalize.query("rollback");return res.status(409).json({error:"مالکیت تلاش بازپرداخت برای نهایی‌سازی معتبر نیست"});}
  const currentOrder=await finalize.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[order.id,t.id]);
  const currentPayment=await finalize.query("select * from marketplace_payments where id=$1 and tenant_id=$2 for update",[payment.id,t.id]);
  const currentReturn=await finalize.query("select * from marketplace_return_requests where id=$1 and tenant_id=$2 for update",[requestId,t.id]);
  if(!currentOrder.rowCount||!currentPayment.rowCount||!currentReturn.rowCount||currentReturn.rows[0].status!=="inspected"||Number(currentReturn.rows[0].received_quantity)!==returnItem.receivedQuantity||Number(currentReturn.rows[0].restock_quantity)!==returnItem.restockQuantity){await finalize.query("rollback");return res.status(409).json({error:"اطلاعات سفارش یا مقادیر دریافت و بازرسی هنگام نهایی‌سازی تغییر کرده است"});}
  if(providerCode==="credit_facility"){
   const facility=await finalize.query("select id from lendtech_facilities where id=$1 and tenant_ref=$2 for update",[currentOrder.rows[0].credit_facility_ref,t.id]);
   if(!facility.rowCount){await finalize.query("rollback");return res.status(409).json({error:"تسهیلات اعتباری سفارش برای برگشت اعتبار پیدا نشد"});}
   await finalize.query("update lendtech_facilities set available_amount=available_amount+$1,updated_at=now() where id=$2",[Number(refund.amount),currentOrder.rows[0].credit_facility_ref]);
  }
  const gross=Number(refund.amount),subtotal=Math.max(0.01,Number(currentOrder.rows[0].subtotal));
  const commission=Number((gross*Number(currentOrder.rows[0].commission_amount)/subtotal).toFixed(2));
  const sellerShare=Number((gross-commission).toFixed(2));
  await postLedgerEntry(finalize,{tenantId:t.id,entryNo:"RET-"+refund.refund_no,sourceType:"marketplace_refund",sourceId:refund.id,description:"بازپرداخت مرجوعی سفارش "+currentOrder.rows[0].order_no,createdBy:(req as any).user.id,lines:[
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",debit:sellerShare},
   {accountCode:"4101",accountName:"درآمد کمیسیون",accountType:"revenue",debit:commission},
   providerCode==="credit_facility"?{accountCode:"1201",accountName:"مطالبات اعتباری مشتریان",accountType:"asset",credit:gross}:{accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",credit:gross}
  ]});
  await finalize.query("update marketplace_refunds set status='refunded',provider_code=$1,provider_refund_transaction_id=$2,provider_payload=$3,provider_last_status='refunded',provider_last_error=null,provider_claim_token=null,provider_claimed_at=null,updated_at=now() where id=$4 and tenant_id=$5 and provider_claim_token=$6",[providerCode,providerRefundId,JSON.stringify(providerPayload),refund.id,t.id,refund.provider_claim_token]);
  const totals=await finalize.query("select coalesce(sum(amount),0) amount from marketplace_refunds where tenant_id=$1 and payment_id=$2 and status='refunded'",[t.id,payment.id]);
  if(Number(totals.rows[0].amount)+0.005>=Number(currentPayment.rows[0].amount))await finalize.query("update marketplace_payments set status='refunded',updated_at=now() where id=$1 and tenant_id=$2",[payment.id,t.id]);
  if(returnItem.restockQuantity>0){
   const stock=await finalize.query("insert into product_inventory(tenant_id,product_id,store_id,quantity,reserved_quantity) values($2,$3,$4,$1,0) on conflict(product_id,store_id) do update set quantity=product_inventory.quantity+excluded.quantity,updated_at=now() where product_inventory.tenant_id=excluded.tenant_id returning id",[returnItem.restockQuantity,t.id,returnItem.product_id,currentOrder.rows[0].store_id]);
   if(!stock.rowCount)throw new Error("مالکیت ردیف موجودی فروشگاه با سازمان سفارش مطابقت ندارد");
   await finalize.query("insert into inventory_movements(tenant_id,product_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) values($1,$2,$3,'refund',$4,'marketplace_refund',$5,$6)",[t.id,returnItem.product_id,currentOrder.rows[0].store_id,returnItem.restockQuantity,refund.id,(req as any).user.id]);
  }
  await finalize.query("update marketplace_return_requests set status='closed',updated_at=now() where id=$1 and tenant_id=$2 and status='inspected'",[requestId,t.id]);
  await finalize.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,'marketplace.return.refunded',$3,$4,$5,$6)",[t.id,(req as any).user.id,requestId,refund.id,JSON.stringify({status:"inspected"}),JSON.stringify({status:"closed",refundId:refund.id,amount:gross,receivedQuantity:returnItem.receivedQuantity,restockQuantity:returnItem.restockQuantity,quarantineQuantity:returnItem.quarantineQuantity,ledgerEntry:true})]);
  await finalize.query("commit");
 }catch(e){await finalize.query("rollback");throw e;}finally{finalize.release();}
 await emitBusinessEvent({tenantId:t.id,eventKey:"return.refunded",subjectType:"marketplace_return_request",subjectId:requestId,userId:(req as any).user.id,input:{refundId:refund.id,orderId:order.id,amount:Number(refund.amount)}});
 const done=await query("select * from marketplace_refunds where id=$1 and tenant_id=$2",[refund.id,t.id]);
 return res.status(201).json({refund:done.rows[0],returnStatus:"closed"});
});
checkoutRouter.post("/api/marketplace/returns/:id/refund",requireAuth,requirePermission("payment:refund"),requireCsrf,processMarketplaceReturnRefund);
checkoutRouter.post("/api/marketplace/returns/:id/refund/retry",requireAuth,requirePermission("payment:refund"),requireCsrf,processMarketplaceReturnRefund);

checkoutRouter.post("/api/storefront/orders/:id/cancel",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const order=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 and customer_ref=$3 for update",[req.params.id,t.id,(req as any).user.id]);
  if(!order.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش متعلق به این حساب پیدا نشد"});}
  if(order.rows[0].status==="cancelled"){await client.query("commit");return res.json({order:order.rows[0],alreadyCancelled:true});}
  if(!["pending","confirmed"].includes(order.rows[0].status)){await client.query("rollback");return res.status(409).json({error:"لغو سفارش پس از شروع پردازش یا پرداخت از این مسیر مجاز نیست"});}
  const paid=await client.query("select 1 from marketplace_payments where tenant_id=$1 and order_id=$2 and status in ('paid','authorized','pending') limit 1",[t.id,order.rows[0].id]);
  if(paid.rowCount){await client.query("rollback");return res.status(409).json({error:"برای این سفارش تراکنش پرداخت فعال یا موفق وجود دارد؛ ابتدا وضعیت پرداخت را از درگاه بررسی کنید"});}
  const items=await client.query("select product_id,quantity from marketplace_order_items where order_id=$1",[order.rows[0].id]);
  for(const item of items.rows){
   await client.query("update product_inventory set reserved_quantity=greatest(0,reserved_quantity-$1),updated_at=now() where tenant_id=$2 and product_id=$3 and store_id=$4",[Number(item.quantity),t.id,item.product_id,order.rows[0].store_id]);
  }
  const updated=await client.query("update marketplace_orders set status='cancelled',cancellation_reason=$1,cancelled_at=now(),updated_at=now() where id=$2 and tenant_id=$3 returning id,order_no,status,total_amount",[s(req.body?.reason,500)||"لغو توسط مشتری",order.rows[0].id,t.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,'storefront.order.cancelled','marketplace_order',$3,$4,$5)",[t.id,(req as any).user.id,order.rows[0].id,JSON.stringify({status:order.rows[0].status}),JSON.stringify({status:"cancelled",reason:s(req.body?.reason,500)||"لغو توسط مشتری"})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"order.cancelled",subjectType:"marketplace_order",subjectId:order.rows[0].id,userId:(req as any).user.id,input:{orderId:order.rows[0].id,orderNo:order.rows[0].order_no,reason:s(req.body?.reason,500)||"لغو توسط مشتری"}});
  res.json({order:updated.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

checkoutRouter.get("/api/storefront/delivery-methods",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const storeId=s(req.query?.storeId,100),rawIds=String(req.query?.productIds||"").split(",").map(x=>x.trim()).filter(Boolean);
 const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(!storeId||rawIds.length<1||rawIds.length>50||rawIds.some(x=>!uuidPattern.test(x))||new Set(rawIds).size!==rawIds.length)return res.status(400).json({error:"فروشگاه یا فهرست کالاها معتبر نیست"});
 const products=await query("select p.id,p.currency from products p join sellers sl on sl.id=p.seller_id and sl.tenant_id=p.tenant_id where p.id=any($1::uuid[]) and p.tenant_id=$2 and p.store_id=$3 and p.status='active' and sl.status='active'",[rawIds,t.id,storeId]);
 if(products.rowCount!==rawIds.length)return res.status(409).json({error:"یک یا چند کالا در این فروشگاه فعال نیست"});
 const currencies=[...new Set(products.rows.map(x=>String(x.currency||"IRR")))];
 if(currencies.length!==1)return res.status(409).json({error:"روش تحویل برای سبدهای چندارزی قابل محاسبه نیست"});
 const methods=await query("select d.id,d.code,d.title,d.carrier_type,d.business_days_min,d.business_days_max,d.cost,d.currency,d.rules from commerce_delivery_methods d where d.tenant_id=$1 and d.enabled=true and d.currency=$3 and not exists(select 1 from unnest($2::uuid[]) requested(product_id) where exists(select 1 from product_delivery_rules pr where pr.tenant_id=d.tenant_id and pr.product_id=requested.product_id) and not exists(select 1 from product_delivery_rules pr where pr.tenant_id=d.tenant_id and pr.product_id=requested.product_id and pr.delivery_method_id=d.id and pr.enabled=true)) order by d.cost,d.business_days_min,d.title",[t.id,rawIds,currencies[0]]);
 res.json({items:methods.rows,currency:currencies[0],total:methods.rowCount});
}));

checkoutRouter.post("/api/storefront/checkout",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const b=req.body||{},storeId=s(b.storeId,100),addressId=s(b.addressId,100),key=s(b.idempotencyKey,160),deliveryMethodId=s(b.deliveryMethodId,100);
 const requested=Array.isArray(b.items)?b.items:[];
 if(!storeId||!addressId||!key||!deliveryMethodId||requested.length<1||requested.length>50)return res.status(400).json({error:"فروشگاه، نشانی، روش تحویل، شناسه یکتای درخواست و اقلام سبد الزامی هستند"});
 const normalized:Array<{productId:string;quantity:number|null}>=requested.map((x:any)=>({productId:s(x?.productId,100),quantity:n(x?.quantity)}));
 if(normalized.some(x=>!x.productId||x.quantity===null||!Number.isInteger(x.quantity)||x.quantity<=0||x.quantity>99)||new Set(normalized.map(x=>x.productId)).size!==normalized.length)return res.status(400).json({error:"شناسه یا تعداد کالاها معتبر نیست"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const prior=await client.query("select o.id,o.id as order_id,o.order_no,o.status,o.subtotal,o.shipping_amount,o.total_amount,o.delivery_method_id,o.delivery_method_snapshot,o.created_at from marketplace_checkout_requests cr left join marketplace_orders o on o.id=cr.order_id where cr.tenant_id=$1 and cr.user_id=$2 and cr.idempotency_key=$3 for update of cr",[t.id,(req as any).user.id,key]);
  if(prior.rowCount&&prior.rows[0].order_id){await client.query("commit");return res.status(200).json({order:prior.rows[0],idempotent:true});}
  const address=await client.query("select id from marketplace_customer_addresses where id=$1 and tenant_id=$2 and user_id=$3",[addressId,t.id,(req as any).user.id]);
  if(!address.rowCount){await client.query("rollback");return res.status(404).json({error:"نشانی انتخاب‌شده متعلق به حساب شما نیست"});}
  const store=await client.query("select id from stores where id=$1 and tenant_id=$2 and status='active'",[storeId,t.id]);
  if(!store.rowCount){await client.query("rollback");return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});}
  const sellerIds=new Set<string>();let subtotal=0,currency="";const locked:any[]=[];
  for(const item of normalized){
   const p=await client.query("select p.id,p.sku,p.title,p.price,p.currency,p.seller_id,p.store_id,p.status,sl.status as seller_status from products p join sellers sl on sl.id=p.seller_id and sl.tenant_id=p.tenant_id left join stores st on st.id=p.store_id and st.tenant_id=p.tenant_id where p.id=$1 and p.tenant_id=$2 and p.store_id=$3 and p.status='active' and sl.status='active' and (p.store_id is null or st.status='active') for update of p",[item.productId,t.id,storeId]);
   if(!p.rowCount){await client.query("rollback");return res.status(409).json({error:"یکی از کالاها دیگر در این فروشگاه قابل فروش نیست"});}
   const product=p.rows[0];sellerIds.add(product.seller_id);const productCurrency=String(product.currency||"IRR");if(currency&&currency!==productCurrency){await client.query("rollback");return res.status(409).json({error:"سبد خرید باید فقط یک ارز داشته باشد"});}currency=productCurrency;
   const inventory=await client.query("select id,quantity,reserved_quantity from product_inventory where tenant_id=$1 and product_id=$2 and store_id=$3 for update",[t.id,product.id,storeId]);
   if(!inventory.rowCount||Number(inventory.rows[0].quantity)-Number(inventory.rows[0].reserved_quantity)<Number(item.quantity)){await client.query("rollback");return res.status(409).json({error:"موجودی کافی یا تأییدشده برای «"+product.title+"» وجود ندارد"});}
   const unitPrice=Number(product.price);if(!Number.isFinite(unitPrice)||unitPrice<=0){await client.query("rollback");return res.status(409).json({error:"قیمت فروش کالا معتبر نیست"});}
   subtotal+=unitPrice*Number(item.quantity);locked.push({product,inventory:inventory.rows[0],quantity:item.quantity,unitPrice});
  }
  if(sellerIds.size!==1){await client.query("rollback");return res.status(409).json({error:"برای ثبت سفارش، کالاها باید از یک فروشنده باشند"});}
  const delivery=await client.query("select id,code,title,carrier_type,business_days_min,business_days_max,cost,currency from commerce_delivery_methods where id=$1 and tenant_id=$2 and enabled=true for share",[deliveryMethodId,t.id]);
  if(!delivery.rowCount){await client.query("rollback");return res.status(409).json({error:"روش تحویل انتخاب‌شده دیگر فعال نیست"});}
  if(String(delivery.rows[0].currency||"IRR")!==currency){await client.query("rollback");return res.status(409).json({error:"ارز روش تحویل با ارز کالاها یکسان نیست"});}
  const rules=await client.query("select p.id,exists(select 1 from product_delivery_rules pr where pr.tenant_id=$1 and pr.product_id=p.id) has_rules,exists(select 1 from product_delivery_rules pr where pr.tenant_id=$1 and pr.product_id=p.id and pr.delivery_method_id=$2 and pr.enabled=true) allowed from products p where p.id=any($3::uuid[]) and p.tenant_id=$1",[t.id,deliveryMethodId,normalized.map(x=>x.productId)]);
  if(rules.rows.some(x=>x.has_rules&&!x.allowed)){await client.query("rollback");return res.status(409).json({error:"روش تحویل انتخاب‌شده برای یکی از کالاها مجاز نیست"});}
  const shipping=Number(delivery.rows[0].cost);
  if(!Number.isFinite(shipping)||shipping<0){await client.query("rollback");return res.status(409).json({error:"هزینه روش تحویل معتبر نیست"});}
  const total=subtotal+shipping;
  const sellerId=[...sellerIds][0];
  const seller=await client.query("select commission_rate from sellers where id=$1 and tenant_id=$2",[sellerId,t.id]);
  if(!seller.rowCount){await client.query("rollback");return res.status(404).json({error:"فروشنده فعال پیدا نشد"});}
  const commission=Number((subtotal*Number(seller.rows[0].commission_rate)/100).toFixed(2)),payable=subtotal-commission;
  const orderNo="ORD-"+randomUUID().replace(/-/g,"").slice(0,18).toUpperCase();
  const deliverySnapshot={id:delivery.rows[0].id,code:delivery.rows[0].code,title:delivery.rows[0].title,carrierType:delivery.rows[0].carrier_type,cost:shipping,currency,businessDaysMin:delivery.rows[0].business_days_min,businessDaysMax:delivery.rows[0].business_days_max};
  const order=await client.query("insert into marketplace_orders(tenant_id,store_id,seller_id,order_no,customer_ref,subtotal,shipping_amount,total_amount,commission_amount,seller_payable,payment_method,delivery_address_id,delivery_method_id,delivery_method_snapshot) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'online',$11,$12,$13) returning id,order_no,status,subtotal,shipping_amount,total_amount,delivery_method_id,delivery_method_snapshot,created_at",[t.id,storeId,sellerId,orderNo,(req as any).user.id,subtotal,shipping,total,commission,payable,addressId,deliveryMethodId,JSON.stringify(deliverySnapshot)]);
  for(const item of locked){
   await client.query("update product_inventory set reserved_quantity=reserved_quantity+$1,updated_at=now() where id=$2",[item.quantity,item.inventory.id]);
   await client.query("insert into marketplace_order_items(order_id,product_id,quantity,unit_price,line_total) values($1,$2,$3,$4,$5)",[order.rows[0].id,item.product.id,item.quantity,item.unitPrice,item.unitPrice*item.quantity]);
  }
  await client.query("insert into marketplace_checkout_requests(tenant_id,user_id,idempotency_key,order_id) values($1,$2,$3,$4)",[t.id,(req as any).user.id,key,order.rows[0].id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'storefront.checkout.created','marketplace_order',$3,$4)",[t.id,(req as any).user.id,order.rows[0].id,JSON.stringify({orderNo,subtotal,commission,deliveryAddressId:addressId})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"order.created",subjectType:"marketplace_order",subjectId:order.rows[0].id,userId:(req as any).user.id,input:{orderId:order.rows[0].id,totalAmount:Number(order.rows[0].total_amount),sellerId}});
  res.status(201).json({order:order.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));


checkoutRouter.post("/api/storefront/orders/:id/verify-payment",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const order=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 and customer_ref=$3 for update",[req.params.id,t.id,(req as any).user.id]);
  if(!order.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش متعلق به این حساب پیدا نشد"});}
  if(!["pending","confirmed"].includes(order.rows[0].status)){await client.query("rollback");return res.status(409).json({error:"وضعیت سفارش برای تأیید پرداخت مجاز نیست"});}
  const payment=await client.query("select * from marketplace_payments where tenant_id=$1 and order_id=$2 order by created_at desc limit 1 for update",[t.id,order.rows[0].id]);
  if(!payment.rowCount){await client.query("rollback");return res.status(404).json({error:"تراکنش پرداخت پیدا نشد"});}
  if(payment.rows[0].status==="paid"){await client.query("rollback");return res.json({status:"paid",orderId:order.rows[0].id});}
  if(!["pending","authorized"].includes(payment.rows[0].status)){await client.query("rollback");return res.status(409).json({error:"این تراکنش در وضعیت قابل تأیید نیست",status:payment.rows[0].status});}
  const provider=getPaymentProvider(payment.rows[0].provider_code);
  const verified=await provider.verifyPayment({providerTransactionId:payment.rows[0].provider_transaction_id||payment.rows[0].provider_ref||"",amount:Number(payment.rows[0].amount),metadata:{orderId:order.rows[0].id,orderNo:order.rows[0].order_no,paymentId:payment.rows[0].id}});
  if(verified.status!=="paid"){
   await client.query("update marketplace_payments set status=$1,provider_payload=$2,updated_at=now() where id=$3 and tenant_id=$4",[verified.status,JSON.stringify(verified.providerPayload),payment.rows[0].id,t.id]);
   await client.query("commit");
   return res.status(202).json({status:verified.status,orderId:order.rows[0].id});
  }
  await client.query("update marketplace_payments set status='paid',provider_payload=$1,paid_at=coalesce(paid_at,now()),updated_at=now() where id=$2 and tenant_id=$3",[JSON.stringify(verified.providerPayload),payment.rows[0].id,t.id]);
  await client.query("update marketplace_orders set status='paid',paid_at=coalesce(paid_at,now()),updated_at=now() where id=$1 and tenant_id=$2",[order.rows[0].id,t.id]);
  await postLedgerEntry(client,{tenantId:t.id,entryNo:"PAY-"+payment.rows[0].payment_no,sourceType:"marketplace_payment",sourceId:payment.rows[0].id,description:"ثبت پرداخت سفارش "+order.rows[0].order_no,createdBy:(req as any).user.id,lines:[
   {accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",debit:Number(order.rows[0].total_amount)},
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",credit:Number(order.rows[0].seller_payable)},
   {accountCode:"4101",accountName:"درآمد کمیسیون",accountType:"revenue",credit:Number(order.rows[0].commission_amount)}
  ]});
  const items=await client.query("select * from marketplace_order_items where order_id=$1",[order.rows[0].id]);
  for(const item of items.rows){
   const updated=await client.query("update product_inventory set quantity=quantity-$1,reserved_quantity=greatest(0,reserved_quantity-$1),updated_at=now() where tenant_id=$2 and product_id=$3 and store_id=$4 and quantity >= $1 and reserved_quantity >= $1 returning id",[item.quantity,t.id,item.product_id,order.rows[0].store_id]);
   if(!updated.rowCount)throw new Error("رزرو موجودی برای تکمیل پرداخت سفارش کافی نیست");
   await client.query("insert into inventory_movements(tenant_id,product_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) values($1,$2,$3,'sale',$4,'marketplace_order',$5,$6)",[t.id,item.product_id,order.rows[0].store_id,-Number(item.quantity),order.rows[0].id,(req as any).user.id]);
  }
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'storefront.payment.verified','marketplace_order',$3,$4)",[t.id,(req as any).user.id,order.rows[0].id,JSON.stringify({paymentId:payment.rows[0].id,amount:payment.rows[0].amount,provider:provider.code})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"payment.paid",subjectType:"marketplace_order",subjectId:order.rows[0].id,userId:(req as any).user.id,input:{orderId:order.rows[0].id,amount:Number(order.rows[0].total_amount),paymentId:payment.rows[0].id}});
  res.json({status:"paid",orderId:order.rows[0].id});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));
