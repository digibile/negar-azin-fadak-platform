import {Router} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant,resolvePublicTenant} from "./tenant-context.js";
import {randomUUID} from "node:crypto";
import {postLedgerEntry} from "./ledger.js";
import {emitBusinessEvent} from "./business-events.js";
import {getPaymentProvider} from "./payment-provider.js";

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
   const providerResult=await provider.createPayment({tenantId:t.id,orderId:o.rows[0].id,amount:Number(o.rows[0].total_amount),currency:"IRR",paymentNo,providerRef:providerTransactionId||null,metadata:{orderNo:o.rows[0].order_no}});
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

checkoutRouter.post("/api/marketplace/orders/:id/refund",requireAuth,requirePermission("payment:refund"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const o=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!o.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش پیدا نشد"});}
  const order=o.rows[0];
  if(!["paid","processing","delivered","returned"].includes(order.status)){await client.query("rollback");return res.status(409).json({error:"فقط سفارش پرداخت‌شده قابل بازگشت وجه است"});}
  const payment=await client.query("select * from marketplace_payments where tenant_id=$1 and order_id=$2 and status='paid' order by paid_at desc nulls last,created_at desc limit 1 for update",[t.id,order.id]);
  if(!payment.rowCount){await client.query("rollback");return res.status(409).json({error:"پرداخت موفق سفارش پیدا نشد"});}
  const existing=await client.query("select * from marketplace_refunds where tenant_id=$1 and payment_id=$2 and status='refunded'",[t.id,payment.rows[0].id]);
  if(existing.rowCount){await client.query("rollback");return res.status(200).json({refund:existing.rows[0],order:{id:order.id,status:"refunded"}});}
  let refundProviderCode=payment.rows[0].provider_code,refundProviderTransactionId=payment.rows[0].provider_transaction_id||payment.rows[0].provider_ref||"",refundProviderPayload:any={};
  if(payment.rows[0].provider_code==="credit_facility"){
   if(!order.credit_facility_ref){await client.query("rollback");return res.status(409).json({error:"مرجع تسهیلات اعتبار خرید روی سفارش ثبت نشده است"});}
   const facility=await client.query("select id,status from lendtech_facilities where id=$1 and tenant_ref=$2 for update",[order.credit_facility_ref,t.id]);
   if(!facility.rowCount){await client.query("rollback");return res.status(404).json({error:"تسهیلات اعتباری سفارش پیدا نشد"});}
   await client.query("update lendtech_facilities set available_amount=available_amount+$1,updated_at=now() where id=$2",[Number(payment.rows[0].amount),order.credit_facility_ref]);
   refundProviderPayload={creditFacilityId:order.credit_facility_ref,restoredAmount:Number(payment.rows[0].amount)};
  }else{
   const provider=getPaymentProvider(payment.rows[0].provider_code);
   const providerResult=await provider.refundPayment({providerTransactionId:payment.rows[0].provider_transaction_id||payment.rows[0].provider_ref||"",amount:Number(payment.rows[0].amount),metadata:{orderId:order.id,paymentId:payment.rows[0].id}});
   if(providerResult.status!=="refunded"){await client.query("rollback");return res.status(409).json({error:"درگاه بازگشت وجه را تأیید نکرد",status:providerResult.status});}
   refundProviderCode=provider.code;
   refundProviderTransactionId=providerResult.providerTransactionId;
   refundProviderPayload=providerResult.providerPayload;
  }
  const refundNo=s(req.body?.refundNo,100)||("REF-"+Date.now()+"-"+order.id.slice(0,8));
  const rr=await client.query("insert into marketplace_refunds(tenant_id,order_id,payment_id,refund_no,amount,reason,status,provider_code,provider_transaction_id,provider_refund_transaction_id,provider_payload,created_by) values($1,$2,$3,$4,$5,$6,'refunded',$7,$8,$9,$10,$11) returning *",[t.id,order.id,payment.rows[0].id,refundNo,Number(payment.rows[0].amount),s(req.body?.reason,500)||null,refundProviderCode,payment.rows[0].provider_transaction_id||payment.rows[0].provider_ref,refundProviderTransactionId,JSON.stringify(refundProviderPayload),(req as any).user.id]);
  await client.query("update marketplace_payments set status='refunded',updated_at=now() where id=$1 and tenant_id=$2 and status='paid'",[payment.rows[0].id,t.id]);
  await client.query("update marketplace_orders set status='refunded',updated_at=now() where id=$1 and tenant_id=$2",[order.id,t.id]);
  await postLedgerEntry(client,{tenantId:t.id,entryNo:"REF-"+rr.rows[0].refund_no,sourceType:"marketplace_refund",sourceId:rr.rows[0].id,description:"معکوس‌سازی پرداخت سفارش "+order.order_no,createdBy:(req as any).user.id,lines:[
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",debit:Number(order.seller_payable)},
   {accountCode:"4101",accountName:"درآمد کمیسیون",accountType:"revenue",debit:Number(order.commission_amount)},
   payment.rows[0].provider_code==="credit_facility"
    ? {accountCode:"1201",accountName:"مطالبات اعتباری مشتریان",accountType:"asset",credit:Number(order.total_amount)}
    : {accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",credit:Number(order.total_amount)}
  ]});
  const items=await client.query("select * from marketplace_order_items where order_id=$1",[order.id]);
  for(const item of items.rows){
   await client.query("update product_inventory set quantity=quantity+$1,updated_at=now() where tenant_id=$2 and product_id=$3 and store_id=$4",[item.quantity,t.id,item.product_id,order.store_id]);
   await client.query("insert into inventory_movements(tenant_id,product_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) values($1,$2,$3,'refund',$4,'marketplace_refund',$5,$6)",[t.id,item.product_id,order.store_id,Number(item.quantity),rr.rows[0].id,(req as any).user.id]);
  }
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'payment.refunded','marketplace_order',$3,$4)",[t.id,(req as any).user.id,order.id,JSON.stringify({refundId:rr.rows[0].id,amount:rr.rows[0].amount,ledgerReversal:true})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"payment.refunded",subjectType:"marketplace_order",subjectId:order.id,userId:(req as any).user.id,input:{orderId:order.id,refundId:rr.rows[0].id,amount:Number(rr.rows[0].amount)}});
  res.status(201).json({refund:rr.rows[0],order:{id:order.id,status:"refunded"}});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
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
  if(Boolean(b.isDefault))await client.query("update marketplace_customer_addresses set is_default=false,updated_at=now() where tenant_id=$1 and user_id=$2",[t.id,(req as any).user.id]);
  const r=await client.query("update marketplace_customer_addresses set recipient_name=$1,mobile=$2,province=$3,city=$4,address_line=$5,postal_code=$6,is_default=$7,updated_at=now() where id=$8 and tenant_id=$9 and user_id=$10 returning id,recipient_name,mobile,province,city,address_line,postal_code,is_default,updated_at",[recipient,mobile,province,city,line,postal,Boolean(b.isDefault),req.params.id,t.id,(req as any).user.id]);
  if(!r.rowCount){await client.query("rollback");return res.status(404).json({error:"نشانی پیدا نشد"});}
  await client.query("commit");res.json({address:r.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));
checkoutRouter.delete("/api/storefront/addresses/:id",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const used=await query("select 1 from marketplace_orders where delivery_address_id=$1 and tenant_id=$2 limit 1",[req.params.id,t.id]);
 if(used.rowCount)return res.status(409).json({error:"این نشانی به سفارش ثبت‌شده متصل است و قابل حذف نیست"});
 const r=await query("delete from marketplace_customer_addresses where id=$1 and tenant_id=$2 and user_id=$3 returning id",[req.params.id,t.id,(req as any).user.id]);
 if(!r.rowCount)return res.status(404).json({error:"نشانی پیدا نشد"});
 res.json({deleted:true,id:r.rows[0].id});
}));
checkoutRouter.get("/api/storefront/orders",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const r=await query("select o.id,o.order_no,o.status,o.subtotal,o.total_amount,o.payment_method,o.created_at,o.paid_at,a.recipient_name,a.mobile,a.province,a.city,a.address_line,a.postal_code,(select jsonb_agg(jsonb_build_object('productId',oi.product_id,'sku',p.sku,'title',p.title,'quantity',oi.quantity,'unitPrice',oi.unit_price,'lineTotal',oi.line_total) order by oi.created_at) from marketplace_order_items oi join products p on p.id=oi.product_id where oi.order_id=o.id) as items,(select jsonb_agg(jsonb_build_object('id',mp.id,'paymentNo',mp.payment_no,'amount',mp.amount,'method',mp.method,'status',mp.status,'providerCode',mp.provider_code,'paidAt',mp.paid_at) order by mp.created_at desc) from marketplace_payments mp where mp.order_id=o.id and mp.tenant_id=o.tenant_id) as payments from marketplace_orders o left join marketplace_customer_addresses a on a.id=o.delivery_address_id and a.tenant_id=o.tenant_id where o.tenant_id=$1 and o.customer_ref=$2 order by o.created_at desc limit 100",[t.id,(req as any).user.id]);
 res.json({items:r.rows,total:r.rowCount});
}));
checkoutRouter.post("/api/storefront/checkout",requireAuth,asyncHandler(async(req,res)=>{
 const t=await storefrontContext(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const b=req.body||{},storeId=s(b.storeId,100),addressId=s(b.addressId,100),key=s(b.idempotencyKey,160);
 const requested=Array.isArray(b.items)?b.items:[];
 if(!storeId||!addressId||!key||requested.length<1||requested.length>50)return res.status(400).json({error:"فروشگاه، نشانی، شناسه یکتای درخواست و اقلام سبد الزامی هستند"});
 const normalized=requested.map((x:any)=>({productId:s(x?.productId,100),quantity:n(x?.quantity)}));
 if(normalized.some(x=>!x.productId||x.quantity===null||!Number.isInteger(x.quantity)||x.quantity<=0||x.quantity>99)||new Set(normalized.map(x=>x.productId)).size!==normalized.length)return res.status(400).json({error:"شناسه یا تعداد کالاها معتبر نیست"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const prior=await client.query("select cr.order_id,o.order_no,o.status,o.total_amount from marketplace_checkout_requests cr left join marketplace_orders o on o.id=cr.order_id where cr.tenant_id=$1 and cr.user_id=$2 and cr.idempotency_key=$3 for update of cr",[t.id,(req as any).user.id,key]);
  if(prior.rowCount&&prior.rows[0].order_id){await client.query("commit");return res.status(200).json({order:prior.rows[0],idempotent:true});}
  const address=await client.query("select id from marketplace_customer_addresses where id=$1 and tenant_id=$2 and user_id=$3",[addressId,t.id,(req as any).user.id]);
  if(!address.rowCount){await client.query("rollback");return res.status(404).json({error:"نشانی انتخاب‌شده متعلق به حساب شما نیست"});}
  const store=await client.query("select id from stores where id=$1 and tenant_id=$2 and status='active'",[storeId,t.id]);
  if(!store.rowCount){await client.query("rollback");return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});}
  const sellerIds=new Set<string>();let subtotal=0;const locked:any[]=[];
  for(const item of normalized){
   const p=await client.query("select p.id,p.sku,p.title,p.price,p.currency,p.seller_id,p.store_id,p.status,sl.status as seller_status from products p join sellers sl on sl.id=p.seller_id and sl.tenant_id=p.tenant_id left join stores st on st.id=p.store_id and st.tenant_id=p.tenant_id where p.id=$1 and p.tenant_id=$2 and p.store_id=$3 and p.status='active' and sl.status='active' and (p.store_id is null or st.status='active') for update of p",[item.productId,t.id,storeId]);
   if(!p.rowCount){await client.query("rollback");return res.status(409).json({error:"یکی از کالاها دیگر در این فروشگاه قابل فروش نیست"});}
   const product=p.rows[0];sellerIds.add(product.seller_id);
   const inventory=await client.query("select id,quantity,reserved_quantity from product_inventory where tenant_id=$1 and product_id=$2 and store_id=$3 for update",[t.id,product.id,storeId]);
   if(!inventory.rowCount||Number(inventory.rows[0].quantity)-Number(inventory.rows[0].reserved_quantity)<Number(item.quantity)){await client.query("rollback");return res.status(409).json({error:"موجودی کافی یا تأییدشده برای «"+product.title+"» وجود ندارد"});}
   const unitPrice=Number(product.price);if(!Number.isFinite(unitPrice)||unitPrice<=0){await client.query("rollback");return res.status(409).json({error:"قیمت فروش کالا معتبر نیست"});}
   subtotal+=unitPrice*Number(item.quantity);locked.push({product,inventory:inventory.rows[0],quantity:item.quantity,unitPrice});
  }
  if(sellerIds.size!==1){await client.query("rollback");return res.status(409).json({error:"برای ثبت سفارش، کالاها باید از یک فروشنده باشند"});}
  const sellerId=[...sellerIds][0];
  const seller=await client.query("select commission_rate from sellers where id=$1 and tenant_id=$2",[sellerId,t.id]);
  if(!seller.rowCount){await client.query("rollback");return res.status(404).json({error:"فروشنده فعال پیدا نشد"});}
  const commission=Number((subtotal*Number(seller.rows[0].commission_rate)/100).toFixed(2)),payable=subtotal-commission;
  const orderNo="ORD-"+randomUUID().replace(/-/g,"").slice(0,18).toUpperCase();
  const order=await client.query("insert into marketplace_orders(tenant_id,store_id,seller_id,order_no,customer_ref,subtotal,total_amount,commission_amount,seller_payable,payment_method,delivery_address_id) values($1,$2,$3,$4,$5,$6,$6,$7,$8,'online',$9) returning id,order_no,status,total_amount,created_at",[t.id,storeId,sellerId,orderNo,(req as any).user.id,subtotal,commission,payable,addressId]);
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
