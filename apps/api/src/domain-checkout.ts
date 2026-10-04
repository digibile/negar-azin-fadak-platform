import {Router} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";
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
  const items=await client.query("select ci.*,p.title,p.seller_id,p.store_id from cart_items ci join products p on p.id=ci.product_id where ci.cart_id=$1 for update",[req.params.id]);
  if(!items.rowCount){await client.query("rollback");return res.status(400).json({error:"سبد خالی است"});}
  const sellers=[...new Set(items.rows.map(x=>x.seller_id))];if(sellers.length!==1){await client.query("rollback");return res.status(400).json({error:"هر سفارش فعلاً باید متعلق به یک فروشنده باشد"});}
  let subtotal=0;
  for(const item of items.rows){
   const inv=await client.query("select * from product_inventory where tenant_id=$1 and product_id=$2 and store_id=$3 for update",[t.id,item.product_id,item.store_id]);
   if(!inv.rowCount){await client.query("rollback");return res.status(409).json({error:"موجودی محصول تعریف نشده است"});}
   if(Number(inv.rows[0].quantity)-Number(inv.rows[0].reserved_quantity)<Number(item.quantity)){await client.query("rollback");return res.status(409).json({error:"موجودی کافی نیست: "+item.title});}
   await client.query("update product_inventory set reserved_quantity=reserved_quantity+$1,updated_at=now() where id=$2",[item.quantity,inv.rows[0].id]);
   subtotal+=Number(item.quantity)*Number(item.unit_price);
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

checkoutRouter.post("/api/marketplace/orders/:id/payment",requireAuth,requirePermission("payment:manage"),asyncHandler(async(req,res)=>{
 const t=await ctx(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const o=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!o.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش پیدا نشد"});}
  if(!["pending","confirmed"].includes(o.rows[0].status)){await client.query("rollback");return res.status(409).json({error:"وضعیت سفارش برای پرداخت مجاز نیست"});}
  const paymentNo=s(req.body?.paymentNo,100)||("PAY-"+Date.now()+"-"+Math.random().toString(36).slice(2,7));
  const idempotencyKey=s(req.body?.idempotencyKey,160)||null;
  if(idempotencyKey){const existing=await client.query("select * from marketplace_payments where tenant_id=$1 and idempotency_key=$2",[t.id,idempotencyKey]);if(existing.rowCount){await client.query("rollback");return res.status(200).json({payment:existing.rows[0],order:{id:o.rows[0].id,status:o.rows[0].status}});}}
  const provider=getPaymentProvider(s(req.body?.providerCode,40)||undefined);
  const providerResult=await provider.createPayment({tenantId:t.id,orderId:o.rows[0].id,amount:Number(o.rows[0].total_amount),currency:"IRR",paymentNo,providerRef:s(req.body?.providerRef,200)||null,metadata:{orderNo:o.rows[0].order_no}});
  if(providerResult.status!=="paid"){await client.query("rollback");return res.status(202).json({status:providerResult.status,providerCode:provider.code,providerTransactionId:providerResult.providerTransactionId});}
  const p=await client.query("insert into marketplace_payments(tenant_id,order_id,payment_no,amount,method,status,provider_ref,provider_code,idempotency_key,provider_transaction_id,provider_payload,paid_at) values($1,$2,$3,$4,$5,'paid',$6,$7,$8,$9,$10,now()) returning *",[t.id,o.rows[0].id,paymentNo,Number(o.rows[0].total_amount),s(req.body?.method,50)||provider.code,providerResult.providerTransactionId,provider.code,idempotencyKey,providerResult.providerTransactionId,JSON.stringify(providerResult.providerPayload)]);
  await client.query("update marketplace_orders set status='paid',paid_at=coalesce(paid_at,now()),updated_at=now() where id=$1 and tenant_id=$2",[o.rows[0].id,t.id]);
  await postLedgerEntry(client,{tenantId:t.id,entryNo:"PAY-"+p.rows[0].payment_no,sourceType:"marketplace_payment",sourceId:p.rows[0].id,description:"ثبت پرداخت سفارش "+o.rows[0].order_no,createdBy:(req as any).user.id,lines:[
   {accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",debit:Number(o.rows[0].total_amount)},
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",credit:Number(o.rows[0].seller_payable)},
   {accountCode:"4101",accountName:"درآمد کمیسیون",accountType:"revenue",credit:Number(o.rows[0].commission_amount)}
  ]});
  const items=await client.query("select * from marketplace_order_items where order_id=$1",[o.rows[0].id]);
  for(const item of items.rows){
   await client.query("update product_inventory set quantity=quantity-$1,reserved_quantity=reserved_quantity-$1,updated_at=now() where tenant_id=$2 and product_id=$3 and store_id=$4",[item.quantity,t.id,item.product_id,o.rows[0].store_id]);
   await client.query("insert into inventory_movements(tenant_id,product_id,store_id,movement_type,quantity,reference_type,reference_id,created_by) values($1,$2,$3,'sale',$4,'marketplace_order',$5,$6)",[t.id,item.product_id,o.rows[0].store_id,-Number(item.quantity),o.rows[0].id,(req as any).user.id]);
  }
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'payment.paid','marketplace_order',$3,$4)",[t.id,(req as any).user.id,o.rows[0].id,JSON.stringify({status:"paid",amount:o.rows[0].total_amount,provider:provider.code,providerTransactionId:providerResult.providerTransactionId})]);
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
  const provider=getPaymentProvider(payment.rows[0].provider_code);
  const providerResult=await provider.refundPayment({providerTransactionId:payment.rows[0].provider_transaction_id||payment.rows[0].provider_ref||"",amount:Number(payment.rows[0].amount),metadata:{orderId:order.id,paymentId:payment.rows[0].id}});
  if(providerResult.status!=="refunded"){await client.query("rollback");return res.status(409).json({error:"درگاه بازگشت وجه را تأیید نکرد",status:providerResult.status});}
  const refundNo=s(req.body?.refundNo,100)||("REF-"+Date.now()+"-"+order.id.slice(0,8));
  const rr=await client.query("insert into marketplace_refunds(tenant_id,order_id,payment_id,refund_no,amount,reason,status,provider_code,provider_transaction_id,provider_refund_transaction_id,provider_payload,created_by) values($1,$2,$3,$4,$5,$6,'refunded',$7,$8,$9,$10,$11) returning *",[t.id,order.id,payment.rows[0].id,refundNo,Number(payment.rows[0].amount),s(req.body?.reason,500)||null,provider.code,payment.rows[0].provider_transaction_id||payment.rows[0].provider_ref,providerResult.providerTransactionId,JSON.stringify(providerResult.providerPayload),(req as any).user.id]);
  await client.query("update marketplace_payments set status='refunded',updated_at=now() where id=$1 and tenant_id=$2 and status='paid'",[payment.rows[0].id,t.id]);
  await client.query("update marketplace_orders set status='refunded',updated_at=now() where id=$1 and tenant_id=$2",[order.id,t.id]);
  await postLedgerEntry(client,{tenantId:t.id,entryNo:"REF-"+rr.rows[0].refund_no,sourceType:"marketplace_refund",sourceId:rr.rows[0].id,description:"معکوس‌سازی پرداخت سفارش "+order.order_no,createdBy:(req as any).user.id,lines:[
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",debit:Number(order.seller_payable)},
   {accountCode:"4101",accountName:"درآمد کمیسیون",accountType:"revenue",debit:Number(order.commission_amount)},
   {accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",credit:Number(order.total_amount)}
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
  if(["delivered","cancelled","refunded"].includes(o.rows[0].status)){await client.query("rollback");return res.status(409).json({error:"لغو این سفارش مجاز نیست"});}
  if(["pending","confirmed"].includes(o.rows[0].status)){
   const items=await client.query("select * from marketplace_order_items where order_id=$1",[o.rows[0].id]);
   for(const item of items.rows)await client.query("update product_inventory set reserved_quantity=greatest(0,reserved_quantity-$1),updated_at=now() where tenant_id=$2 and product_id=$3 and store_id=$4",[item.quantity,t.id,item.product_id,o.rows[0].store_id]);
  }
  await client.query("update marketplace_orders set status='cancelled',updated_at=now() where id=$1",[o.rows[0].id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id) values($1,$2,'order.cancelled','marketplace_order',$3)",[t.id,(req as any).user.id,o.rows[0].id]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"order.cancelled",subjectType:"marketplace_order",subjectId:o.rows[0].id,userId:(req as any).user.id,input:{orderId:o.rows[0].id}});
  res.json({id:o.rows[0].id,status:"cancelled"});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));
