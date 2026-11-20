import {Router} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant,resolvePublicTenant} from "./tenant-context.js";
import {postLedgerEntry} from "./ledger.js";
import {emitBusinessEvent} from "./business-events.js";
import {getPaymentProvider} from "./payment-provider.js";

export const checkoutRouter=Router();
const s=(v:unknown,n=200)=>typeof v==="string"?v.trim().slice(0,n):"";
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null;};
async function ctx(req:any){return resolveTenant(req,(req as any).user);}
async function canAccessCustomer(req:any,customerRef:string,permissions:string|string[]=[]):Promise<boolean>{
 const user=req.user;
 if(!user)return false;
 if(customerRef===user.id||user.role==="admin")return true;
 const allowed=Array.isArray(permissions)?permissions:[permissions];
 if(!allowed.length)return false;
 const result=await query("select 1 from role_permissions where role=$1 and permission=any($2::text[]) limit 1",[user.role,allowed]);
 return Boolean(result.rowCount);
}

checkoutRouter.post("/api/checkout/carts",requireAuth,asyncHandler(async(req,res)=>{
 let t=typeof req.headers["x-tenant-id"]==="string"?await ctx(req):await resolvePublicTenant(req);
 if(!t)t=await ctx(req);
 if(!t)return res.status(403).json({error:"فروشگاه عمومی معتبری برای این دامنه پیدا نشد"});
 const customer=s(req.body?.customerRef),store=s(req.body?.storeId);
 if(!customer||!store)return res.status(400).json({error:"شناسه مشتری و فروشگاه الزامی است"});
 if(!(await canAccessCustomer(req,customer,"cart:manage")))return res.status(403).json({error:"فقط مالک حساب یا اپراتور مجاز می‌تواند برای این مشتری سبد بسازد"});
 const ok=await query("select id from stores where id=$1 and tenant_id=$2 and status='active'",[store,t.id]);
 if(!ok.rowCount)return res.status(404).json({error:"فروشگاه معتبر نیست"});
 if(customer===(req as any).user.id)await query("insert into user_tenants(user_id,tenant_id,is_default) values($1,$2,true) on conflict(user_id,tenant_id) do nothing",[(req as any).user.id,t.id]);
 const r=await query("insert into cart_sessions(tenant_id,customer_ref,store_id,currency) values($1,$2,$3,$4) returning *",[t.id,customer,store,s(req.body?.currency,10)||"IRR"]);
 res.status(201).json(r.rows[0]);
}));

checkoutRouter.post("/api/checkout/carts/:id/items",requireAuth,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const product=s(req.body?.productId),qty=n(req.body?.quantity);
 if(!product||qty===null||qty<=0)return res.status(400).json({error:"محصول و تعداد معتبر الزامی است"});
 const c=await query("select id,store_id,status,customer_ref,currency from cart_sessions where id=$1 and tenant_id=$2",[req.params.id,t.id]);
 if(!c.rowCount||c.rows[0].status!=="open")return res.status(404).json({error:"سبد باز پیدا نشد"});
 if(!(await canAccessCustomer(req,c.rows[0].customer_ref,"cart:manage")))return res.status(403).json({error:"دسترسی به این سبد مجاز نیست"});
 const p=await query("select id,price,currency from products where id=$1 and tenant_id=$2 and store_id=$3 and status='active'",[product,t.id,c.rows[0].store_id]);
 if(!p.rowCount)return res.status(404).json({error:"محصول فعال پیدا نشد"});
 if(String(p.rows[0].currency||"IRR")!==String(c.rows[0].currency||"IRR"))return res.status(409).json({error:"واحد پول کالا با سبد خرید یکسان نیست"});
 const r=await query("insert into cart_items(cart_id,product_id,quantity,unit_price) values($1,$2,$3,$4) on conflict(cart_id,product_id) do update set quantity=cart_items.quantity+excluded.quantity,unit_price=excluded.unit_price returning *",[req.params.id,product,qty,p.rows[0].price]);
 res.status(201).json(r.rows[0]);
}));

checkoutRouter.get("/api/checkout/carts/:id",requireAuth,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const c=await query("select * from cart_sessions where id=$1 and tenant_id=$2",[req.params.id,t.id]);
 if(!c.rowCount)return res.status(404).json({error:"سبد پیدا نشد"});
 if(!(await canAccessCustomer(req,c.rows[0].customer_ref,"cart:manage")))return res.status(403).json({error:"دسترسی به این سبد مجاز نیست"});
 const items=await query("select ci.*,p.sku,p.title from cart_items ci join products p on p.id=ci.product_id where ci.cart_id=$1 order by ci.created_at",[req.params.id]);
 res.json({cart:c.rows[0],items:items.rows});
}));

checkoutRouter.post("/api/checkout/carts/:id/checkout",requireAuth,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const c=await client.query("select * from cart_sessions where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!c.rowCount||c.rows[0].status!=="open"){await client.query("rollback");return res.status(409).json({error:"سبد قابل تسویه نیست"});}
  if(!(await canAccessCustomer(req,c.rows[0].customer_ref,["checkout:manage","cart:manage"]))){await client.query("rollback");return res.status(403).json({error:"فقط مالک سبد یا اپراتور مجاز می‌تواند سفارش را ثبت کند"});}
  const items=await client.query("select ci.*,p.title,p.seller_id,p.store_id,p.price as current_price,p.currency as product_currency,p.status as product_status from cart_items ci join products p on p.id=ci.product_id where ci.cart_id=$1 for update",[req.params.id]);
  if(!items.rowCount){await client.query("rollback");return res.status(400).json({error:"سبد خالی است"});}
  const sellers=[...new Set(items.rows.map(x=>x.seller_id))];if(sellers.length!==1){await client.query("rollback");return res.status(400).json({error:"هر سفارش فعلاً باید متعلق به یک فروشنده باشد"});}
  let subtotal=0;
  for(const item of items.rows){
   if(item.product_status!=="active"){await client.query("rollback");return res.status(409).json({error:"این کالا دیگر برای فروش فعال نیست: "+item.title});}
   if(String(item.product_currency||"IRR")!==String(c.rows[0].currency||"IRR")){await client.query("rollback");return res.status(409).json({error:"واحد پول کالا با واحد پول سبد یکسان نیست: "+item.title});}
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
  const configuredReservationTtl=Number(process.env.MARKETPLACE_RESERVATION_TTL_MINUTES||30);
  const reservationTtlMinutes=Number.isFinite(configuredReservationTtl)?Math.min(240,Math.max(5,configuredReservationTtl)):30;
  const o=await client.query("insert into marketplace_orders(tenant_id,store_id,seller_id,order_no,customer_ref,currency,subtotal,total_amount,commission_amount,seller_payable,payment_method,delivery_due_at,reservation_expires_at) values($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,now()+($12::text||' minutes')::interval) returning *",[t.id,c.rows[0].store_id,sellers[0],orderNo,c.rows[0].customer_ref,c.rows[0].currency||"IRR",subtotal,commission,payable,s(req.body?.paymentMethod,50)||"online",req.body?.deliveryDueAt||null,reservationTtlMinutes]);
  for(const item of items.rows)await client.query("insert into marketplace_order_items(order_id,product_id,quantity,unit_price,line_total) values($1,$2,$3,$4,$5)",[o.rows[0].id,item.product_id,item.quantity,item.unit_price,Number(item.quantity)*Number(item.unit_price)]);
  await client.query("update cart_sessions set status='checked_out',updated_at=now() where id=$1",[req.params.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'checkout.created','marketplace_order',$3,$4)",[t.id,(req as any).user.id,o.rows[0].id,JSON.stringify(o.rows[0])]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"order.created",subjectType:"marketplace_order",subjectId:o.rows[0].id,userId:(req as any).user.id,input:{orderId:o.rows[0].id,totalAmount:Number(o.rows[0].total_amount),sellerId:o.rows[0].seller_id}});
  res.status(201).json({order:o.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

checkoutRouter.get("/api/marketplace/orders/:id",requireAuth,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const o=await query("select * from marketplace_orders where id=$1 and tenant_id=$2",[req.params.id,t.id]);
 if(!o.rowCount)return res.status(404).json({error:"سفارش پیدا نشد"});
 if(!(await canAccessCustomer(req,o.rows[0].customer_ref,"order:manage")))return res.status(403).json({error:"دسترسی به این سفارش مجاز نیست"});
 const [items,payment,refund]=await Promise.all([
  query("select oi.*,p.sku,p.title from marketplace_order_items oi join products p on p.id=oi.product_id where oi.order_id=$1 order by oi.created_at",[req.params.id]),
  query("select id,payment_no,amount,method,status,provider_code,paid_at,created_at from marketplace_payments where order_id=$1 and tenant_id=$2 order by created_at desc",[req.params.id,t.id]),
  query("select refund_no,amount,reason,status,created_at from marketplace_refunds where order_id=$1 and tenant_id=$2 order by created_at desc",[req.params.id,t.id])
 ]);
 res.json({order:o.rows[0],items:items.rows,payments:payment.rows,refunds:refund.rows});
}));

checkoutRouter.post("/api/marketplace/orders/:id/payment",requireAuth,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const o=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!o.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش پیدا نشد"});}
  if(!(await canAccessCustomer(req,o.rows[0].customer_ref,"payment:manage"))){await client.query("rollback");return res.status(403).json({error:"فقط مالک سفارش یا اپراتور مجاز می‌تواند پرداخت را آغاز کند"});}
  if(!["pending","confirmed"].includes(o.rows[0].status)){await client.query("rollback");return res.status(409).json({error:"وضعیت سفارش برای پرداخت مجاز نیست"});}
  if(o.rows[0].reservation_expires_at&&new Date(o.rows[0].reservation_expires_at).getTime()<=Date.now()){await client.query("rollback");return res.status(409).json({error:"مهلت رزرو موجودی این سفارش پایان یافته است"});}
  const paymentNo=s(req.body?.paymentNo,100)||("PAY-"+Date.now()+"-"+Math.random().toString(36).slice(2,7));
  const idempotencyKey=s(req.body?.idempotencyKey,160)||null;
  if(idempotencyKey){const existing=await client.query("select * from marketplace_payments where tenant_id=$1 and idempotency_key=$2",[t.id,idempotencyKey]);if(existing.rowCount){await client.query("rollback");return res.status(200).json({payment:existing.rows[0],order:{id:o.rows[0].id,status:o.rows[0].status}});}}
  const requestedMethod=s(req.body?.method,50)||"online";
  let providerCode=s(req.body?.providerCode,40)||"";
  let providerTransactionId=s(req.body?.providerRef,200)||"";
  let providerPayload:any={},redirectUrl:string|undefined;
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
   let providerResult=await provider.createPayment({tenantId:t.id,orderId:o.rows[0].id,amount:Number(o.rows[0].total_amount),currency:o.rows[0].currency||"IRR",paymentNo,providerRef:providerTransactionId||null,metadata:{orderNo:o.rows[0].order_no,returnUrl:(process.env.STOREFRONT_PUBLIC_URL||"https://sookar.ir").replace(/\/$/,"")+"/store/checkout?cart="+encodeURIComponent(String(req.body?.cartId||""))+"&order="+encodeURIComponent(String(o.rows[0].id))+"&paymentNo="+encodeURIComponent(paymentNo)}});
   if(providerResult.status==="paid"){
    const initialTransactionId=providerResult.providerTransactionId;
    providerResult=await provider.verifyPayment({providerTransactionId:initialTransactionId,amount:Number(o.rows[0].total_amount),metadata:{orderId:o.rows[0].id,paymentNo}});
    if(providerResult.providerTransactionId!==initialTransactionId){await client.query("rollback");return res.status(409).json({error:"شناسه تراکنش تأییدشده با شناسه اولیه یکسان نیست"});}
   }
   providerCode=provider.code;
   providerTransactionId=providerResult.providerTransactionId||"";
   providerPayload=providerResult.providerPayload;
   redirectUrl=providerResult.redirectUrl;
   if(providerResult.status!=="paid"){
    if(!providerTransactionId){await client.query("rollback");return res.status(502).json({error:"درگاه شناسه تراکنش معتبر برنگرداند"});}
    const pendingStatus=providerResult.status==="authorized"?"authorized":providerResult.status==="failed"?"failed":"pending";
    const failureReason=providerResult.status==="failed"?String((providerPayload as any)?.message||"درگاه پرداخت این تلاش را ناموفق اعلام کرد").slice(0,500):null;
    const pending=await client.query("insert into marketplace_payments(tenant_id,order_id,payment_no,amount,method,status,provider_ref,provider_code,idempotency_key,provider_transaction_id,provider_payload,redirect_url,failure_reason) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) on conflict(tenant_id,idempotency_key) where idempotency_key is not null do update set updated_at=now() returning *",[t.id,o.rows[0].id,paymentNo,Number(o.rows[0].total_amount),requestedMethod,pendingStatus,providerTransactionId,providerCode,idempotencyKey,providerTransactionId,JSON.stringify(providerPayload),redirectUrl||null,failureReason]);
    await client.query("commit");
    return res.status(pendingStatus==="failed"?200:202).json({status:pending.rows[0].status,payment:pending.rows[0],redirectUrl:redirectUrl||null,providerCode});
   }
  }
  const p=await client.query("insert into marketplace_payments(tenant_id,order_id,payment_no,amount,method,status,provider_ref,provider_code,idempotency_key,provider_transaction_id,provider_payload,paid_at) values($1,$2,$3,$4,$5,'paid',$6,$7,$8,$9,$10,now()) returning *",[t.id,o.rows[0].id,paymentNo,Number(o.rows[0].total_amount),requestedMethod,providerTransactionId,providerCode,idempotencyKey,providerTransactionId,JSON.stringify(providerPayload)]);
  await client.query("update marketplace_orders set status='paid',paid_at=coalesce(paid_at,now()),updated_at=now() where id=$1 and tenant_id=$2",[o.rows[0].id,t.id]);
  await postLedgerEntry(client,{tenantId:t.id,entryNo:"PAY-"+p.rows[0].payment_no,sourceType:"marketplace_payment",sourceId:p.rows[0].id,description:"ثبت پرداخت سفارش "+o.rows[0].order_no,createdBy:(req as any).user.id,currency:o.rows[0].currency||"IRR",lines:[
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


checkoutRouter.post("/api/marketplace/payments/:paymentId/verify",requireAuth,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 let eventOrderId:string|undefined,paymentId:string|undefined;
 try{
  await client.query("begin");
  const orderLock=await client.query("select id from marketplace_orders where id=(select order_id from marketplace_payments where id=$1 and tenant_id=$2) and tenant_id=$2 for update",[req.params.paymentId,t.id]);
  if(!orderLock.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش پرداخت پیدا نشد"});}
  const p=await client.query("select p.*,o.customer_ref,o.order_no,o.store_id,o.status as order_status,o.total_amount,o.seller_payable,o.commission_amount,o.currency,o.reservation_expires_at,(o.reservation_expires_at is not null and o.reservation_expires_at<=now()) as reservation_expired from marketplace_payments p join marketplace_orders o on o.id=p.order_id and o.tenant_id=p.tenant_id where p.id=$1 and p.tenant_id=$2 for update of p",[req.params.paymentId,t.id]);
  if(!p.rowCount){await client.query("rollback");return res.status(404).json({error:"تلاش پرداخت پیدا نشد"});}
  const payment=p.rows[0];paymentId=payment.id;eventOrderId=payment.order_id;
  if(["cancelled","refunded"].includes(payment.order_status)||(["pending","confirmed"].includes(payment.order_status)&&payment.reservation_expired)){await client.query("rollback");return res.status(409).json({error:"مهلت رزرو سفارش پایان یافته یا سفارش بسته شده است"});}
  if(!(await canAccessCustomer(req,payment.customer_ref,"payment:manage"))){await client.query("rollback");return res.status(403).json({error:"دسترسی به این پرداخت مجاز نیست"});}
  if(payment.status==="paid"){await client.query("commit");return res.json({status:"paid",paymentId:payment.id,order:{id:payment.order_id,status:payment.order_status}});}
  if(!["pending","authorized"].includes(payment.status)){await client.query("rollback");return res.status(409).json({error:"این پرداخت در وضعیت قابل تأیید نیست",status:payment.status});}
  const provider=getPaymentProvider(payment.provider_code);
  const verified=await provider.verifyPayment({providerTransactionId:payment.provider_transaction_id||payment.provider_ref||"",amount:Number(payment.amount),metadata:{orderId:payment.order_id,paymentId:payment.id,paymentNo:payment.payment_no}});
  if(verified.providerTransactionId!==(payment.provider_transaction_id||payment.provider_ref||"")){await client.query("rollback");return res.status(409).json({error:"شناسه تراکنش تأییدشده با درخواست اولیه یکسان نیست"});}
  if(verified.status!=="paid"){
   if(verified.status==="failed")await client.query("update marketplace_payments set status='failed',failure_reason=$2,provider_payload=$3,updated_at=now() where id=$1",[payment.id,String((verified.providerPayload as any)?.message||"پرداخت توسط درگاه ناموفق اعلام شد").slice(0,500),JSON.stringify(verified.providerPayload)]);
   else await client.query("update marketplace_payments set status=$2,provider_payload=$3,updated_at=now() where id=$1",[payment.id,verified.status==="authorized"?"authorized":"pending",JSON.stringify(verified.providerPayload)]);
   await client.query("commit");
   return res.status(202).json({status:verified.status,paymentId:payment.id,order:{id:payment.order_id,status:payment.order_status}});
  }
  if(!["pending","confirmed"].includes(payment.order_status)){await client.query("rollback");return res.status(409).json({error:"وضعیت سفارش برای نهایی‌سازی پرداخت مجاز نیست"});}
  await client.query("update marketplace_payments set status='paid',provider_transaction_id=$2,provider_ref=$2,provider_payload=$3,paid_at=now(),updated_at=now() where id=$1",[payment.id,verified.providerTransactionId,JSON.stringify(verified.providerPayload)]);
  await client.query("update marketplace_orders set status='paid',paid_at=coalesce(paid_at,now()),updated_at=now() where id=$1 and tenant_id=$2",[payment.order_id,t.id]);
  await postLedgerEntry(client,{tenantId:t.id,entryNo:"PAY-"+payment.payment_no,sourceType:"marketplace_payment",sourceId:payment.id,description:"ثبت پرداخت سفارش "+payment.order_no,createdBy:(req as any).user.id,currency:payment.currency||"IRR",lines:[
   {accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",debit:Number(payment.amount)},
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",credit:Number(payment.seller_payable)},
   {accountCode:"4101",accountName:"درآمد کمیسیون",accountType:"revenue",credit:Number(payment.commission_amount)}
  ]});
  const items=await client.query("select * from marketplace_order_items where order_id=$1",[payment.order_id]);
  for(const item of items.rows){
   const stock=await client.query("update product_inventory set quantity=quantity-$1,reserved_quantity=greatest(0,reserved_quantity-$1),updated_at=now() where tenant_id=$2 and product_id=$3 and store_id=$4 and quantity >= $1 returning product_id",[item.quantity,t.id,item.product_id,payment.store_id]);
   if(!stock.rowCount){await client.query("rollback");return res.status(409).json({error:"موجودی رزروشده برای نهایی‌سازی پرداخت کافی نیست"});}
   await client.query("insert into inventory_movements(tenant_id,product_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) values($1,$2,$3,'sale',$4,'marketplace_order',$5,$6)",[t.id,item.product_id,payment.store_id,-Number(item.quantity),payment.order_id,(req as any).user.id]);
  }
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'payment.paid','marketplace_order',$3,$4)",[t.id,(req as any).user.id,payment.order_id,JSON.stringify({status:"paid",amount:payment.amount,provider:payment.provider_code,providerTransactionId:verified.providerTransactionId,paymentId:payment.id})]);
  await client.query("commit");
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
 if(eventOrderId&&paymentId)await emitBusinessEvent({tenantId:t.id,eventKey:"payment.paid",subjectType:"marketplace_order",subjectId:eventOrderId,userId:(req as any).user.id,input:{orderId:eventOrderId,paymentId}});
 res.json({status:"paid",paymentId,order:{id:eventOrderId,status:"paid"}});
}));

checkoutRouter.post("/api/marketplace/orders/:id/refund",requireAuth,requirePermission("payment:refund"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const o=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!o.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش پیدا نشد"});}
  const order=o.rows[0];
  if(order.status==="refunded"){
   const existingRefund=await client.query("select * from marketplace_refunds where tenant_id=$1 and order_id=$2 and status='refunded' order by created_at desc limit 1",[t.id,order.id]);
   if(existingRefund.rowCount){await client.query("commit");return res.status(200).json({refund:existingRefund.rows[0],order:{id:order.id,status:"refunded"},idempotent:true});}
  }
  if(!["paid","processing","delivered","returned"].includes(order.status)){await client.query("rollback");return res.status(409).json({error:"فقط سفارش پرداخت‌شده قابل بازگشت وجه است"});}
  const settlementLink=await client.query("select ss.id,ss.seller_id,ss.status,ss.adjustment_amount from seller_settlement_items si join seller_settlements ss on ss.id=si.settlement_id and ss.tenant_id=si.tenant_id where si.tenant_id=$1 and si.order_id=$2 for update of ss",[t.id,order.id]);
  for(const linked of settlementLink.rows){
   if(!["pending","approved"].includes(linked.status))continue;
   await client.query("delete from seller_settlement_items where tenant_id=$1 and settlement_id=$2 and order_id=$3",[t.id,linked.id,order.id]);
   const totals=await client.query("select count(*)::int as item_count,coalesce(sum(si.gross_amount),0) as gross,coalesce(sum(si.commission_amount),0) as commission,coalesce(sum(si.net_amount),0) as net,count(distinct coalesce(nullif(upper(trim(o.currency)),''),'IRR'))::int as currency_count,min(coalesce(nullif(upper(trim(o.currency)),''),'IRR')) as single_currency from seller_settlement_items si join marketplace_orders o on o.id=si.order_id where si.tenant_id=$1 and si.settlement_id=$2",[t.id,linked.id]);
   const nextStatus=totals.rows[0].item_count===0&&Number(linked.adjustment_amount)===0?"reversed":linked.status;
   await client.query("update seller_settlements set gross_amount=$3,commission_amount=$4,net_amount=$5+$6,status=$7,currency=case when $8::int=1 then $9 else currency end,updated_at=now() where id=$1 and tenant_id=$2",[linked.id,t.id,totals.rows[0].gross,totals.rows[0].commission,totals.rows[0].net,linked.adjustment_amount,nextStatus,totals.rows[0].currency_count,totals.rows[0].single_currency]);
   await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'settlement.order_removed_for_refund','seller_settlement',$3,$4)",[t.id,(req as any).user.id,linked.id,JSON.stringify({orderId:order.id,reason:"refund_before_payout",remainingOrders:totals.rows[0].item_count})]);
  }
  const payment=await client.query("select * from marketplace_payments where tenant_id=$1 and order_id=$2 and status='paid' order by paid_at desc nulls last,created_at desc limit 1 for update",[t.id,order.id]);
  if(!payment.rowCount){await client.query("rollback");return res.status(409).json({error:"پرداخت موفق سفارش پیدا نشد"});}
  const existing=await client.query("select * from marketplace_refunds where tenant_id=$1 and payment_id=$2 and status='refunded'",[t.id,payment.rows[0].id]);
  if(existing.rowCount){await client.query("commit");return res.status(200).json({refund:existing.rows[0],order:{id:order.id,status:"refunded"},idempotent:true});}
  let refundProviderCode=payment.rows[0].provider_code,refundProviderTransactionId=payment.rows[0].provider_transaction_id||payment.rows[0].provider_ref||"",refundProviderPayload:any={};
  if(payment.rows[0].provider_code==="credit_facility"){
   if(!order.credit_facility_ref){await client.query("rollback");return res.status(409).json({error:"مرجع تسهیلات اعتبار خرید روی سفارش ثبت نشده است"});}
   const facility=await client.query("select id,status from lendtech_facilities where id=$1 and tenant_ref=$2 for update",[order.credit_facility_ref,t.id]);
   if(!facility.rowCount){await client.query("rollback");return res.status(404).json({error:"تسهیلات اعتباری سفارش پیدا نشد"});}
   await client.query("update lendtech_facilities set available_amount=available_amount+$1,updated_at=now() where id=$2",[Number(payment.rows[0].amount),order.credit_facility_ref]);
   refundProviderPayload={creditFacilityId:order.credit_facility_ref,restoredAmount:Number(payment.rows[0].amount)};
  }else{
   const provider=getPaymentProvider(payment.rows[0].provider_code);
   const providerResult=await provider.refundPayment({providerTransactionId:payment.rows[0].provider_transaction_id||payment.rows[0].provider_ref||"",amount:Number(payment.rows[0].amount),idempotencyKey:"marketplace-refund-"+payment.rows[0].id,metadata:{orderId:order.id,paymentId:payment.rows[0].id,idempotencyKey:"marketplace-refund-"+payment.rows[0].id}});
   if(providerResult.status!=="refunded"){await client.query("rollback");return res.status(409).json({error:"درگاه بازگشت وجه را تأیید نکرد",status:providerResult.status});}
   refundProviderCode=provider.code;
   refundProviderTransactionId=providerResult.providerTransactionId;
   refundProviderPayload=providerResult.providerPayload;
  }
  const refundNo=s(req.body?.refundNo,100)||("REF-"+Date.now()+"-"+order.id.slice(0,8));
  const rr=await client.query("insert into marketplace_refunds(tenant_id,order_id,payment_id,refund_no,amount,reason,status,provider_code,provider_transaction_id,provider_refund_transaction_id,provider_payload,created_by) values($1,$2,$3,$4,$5,$6,'refunded',$7,$8,$9,$10,$11) returning *",[t.id,order.id,payment.rows[0].id,refundNo,Number(payment.rows[0].amount),s(req.body?.reason,500)||null,refundProviderCode,payment.rows[0].provider_transaction_id||payment.rows[0].provider_ref,refundProviderTransactionId,JSON.stringify(refundProviderPayload),(req as any).user.id]);
  await client.query("update marketplace_payments set status='refunded',updated_at=now() where id=$1 and tenant_id=$2 and status='paid'",[payment.rows[0].id,t.id]);
  await client.query("update marketplace_orders set status='refunded',updated_at=now() where id=$1 and tenant_id=$2",[order.id,t.id]);
  await postLedgerEntry(client,{tenantId:t.id,entryNo:"REF-"+rr.rows[0].refund_no,sourceType:"marketplace_refund",sourceId:rr.rows[0].id,description:"معکوس‌سازی پرداخت سفارش "+order.order_no,createdBy:(req as any).user.id,currency:order.currency||"IRR",lines:[
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",debit:Number(order.seller_payable)},
   {accountCode:"4101",accountName:"درآمد کمیسیون",accountType:"revenue",debit:Number(order.commission_amount)},
   payment.rows[0].provider_code==="credit_facility"
    ? {accountCode:"1201",accountName:"مطالبات اعتباری مشتریان",accountType:"asset",credit:Number(order.total_amount)}
    : {accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",credit:Number(order.total_amount)}
  ]});
  const paidSettlement=settlementLink.rows.find((x:any)=>x.status==="paid");
  if(paidSettlement&&Number(order.seller_payable)>0){
   const claim=await client.query("insert into marketplace_seller_recovery_claims(tenant_id,seller_id,settlement_id,order_id,refund_id,amount,currency,status,reason,created_by) values($1,$2,$3,$4,$5,$6,$7,'open',$8,$9) on conflict(tenant_id,order_id) do nothing returning *",[t.id,paidSettlement.seller_id,paidSettlement.id,order.id,rr.rows[0].id,Number(order.seller_payable),order.currency||"IRR","بازپرداخت سفارش پس از پرداخت تسویه فروشنده",(req as any).user.id]);
   if(claim.rowCount){
    const recoveryEntry=await postLedgerEntry(client,{tenantId:t.id,entryNo:"SRC-"+claim.rows[0].id,sourceType:"marketplace_seller_recovery",sourceId:claim.rows[0].id,description:"ثبت مطالبه از فروشنده بابت بازپرداخت سفارش "+order.order_no,createdBy:(req as any).user.id,currency:order.currency||"IRR",lines:[
     {accountCode:"1202",accountName:"مطالبات از فروشندگان",accountType:"asset",debit:Number(order.seller_payable)},
     {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",credit:Number(order.seller_payable)}
    ]});
    await client.query("update marketplace_seller_recovery_claims set recognition_ledger_entry_id=$2 where id=$1 and tenant_id=$3",[claim.rows[0].id,recoveryEntry,t.id]);
    await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'seller_recovery.claim_created','seller_recovery_claim',$3,$4)",[t.id,(req as any).user.id,claim.rows[0].id,JSON.stringify({orderId:order.id,settlementId:paidSettlement.id,amount:Number(order.seller_payable),currency:order.currency||"IRR"})]);
   }
  }
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'payment.refunded','marketplace_order',$3,$4)",[t.id,(req as any).user.id,order.id,JSON.stringify({refundId:rr.rows[0].id,amount:rr.rows[0].amount,ledgerReversal:true})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"payment.refunded",subjectType:"marketplace_order",subjectId:order.id,userId:(req as any).user.id,input:{orderId:order.id,refundId:rr.rows[0].id,amount:Number(rr.rows[0].amount)}});
  res.status(201).json({refund:rr.rows[0],order:{id:order.id,status:"refunded"}});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

checkoutRouter.post("/api/marketplace/orders/:id/cancel",requireAuth,asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const o=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!o.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش پیدا نشد"});}
  if(!(await canAccessCustomer(req,o.rows[0].customer_ref,"order:manage"))){await client.query("rollback");return res.status(403).json({error:"فقط مالک سفارش یا اپراتور مجاز می‌تواند آن را لغو کند"});}
  const cancellationReason=s(req.body?.reason,500);
  if(!cancellationReason){await client.query("rollback");return res.status(400).json({error:"علت لغو سفارش الزامی است"});}
  if(["paid","processing","shipped","delivered","returned","cancelled","refunded"].includes(o.rows[0].status)){await client.query("rollback");return res.status(409).json({error:"این سفارش باید از مسیر بازگشت وجه یا چرخه مجاز مدیریت شود"});}
  if(["pending","confirmed"].includes(o.rows[0].status)){
   const items=await client.query("select * from marketplace_order_items where order_id=$1",[o.rows[0].id]);
   for(const item of items.rows)await client.query("update product_inventory set reserved_quantity=greatest(0,reserved_quantity-$1),updated_at=now() where tenant_id=$2 and product_id=$3 and store_id=$4",[item.quantity,t.id,item.product_id,o.rows[0].store_id]);
  }
  await client.query("update marketplace_orders set status='cancelled',cancelled_at=now(),updated_at=now(),cancellation_reason=$2 where id=$1 and tenant_id=$3",[o.rows[0].id,cancellationReason,t.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'order.cancelled','marketplace_order',$3,$4)",[t.id,(req as any).user.id,o.rows[0].id,JSON.stringify({reason:cancellationReason})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"order.cancelled",subjectType:"marketplace_order",subjectId:o.rows[0].id,userId:(req as any).user.id,input:{orderId:o.rows[0].id,reason:cancellationReason}});
  res.json({id:o.rows[0].id,status:"cancelled"});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));
