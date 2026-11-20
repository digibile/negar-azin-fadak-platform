import {Router,type Request,type Response} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";
import {purchaseOrderTransitions,isAllowedLifecycleTransition} from "./commerce-lifecycle.js";
const router=Router();
const tenantOf=async(req:Request)=>resolveTenant(req,(req as any).user);
const deny=(res:Response,s:number,e:string)=>res.status(s).json({error:e});
const n=(x:any)=>Number(x||0);
async function event(t:string,type:string,id:string,from:string|null,to:string,ev:string,user:string,reason:string|null=null){
 await query("insert into purchase_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id,reason) values($1,$2,$3,$4,$5,$6,$7,$8)",[t,type,id,from,to,ev,user,reason]);
}
const transitions:Record<string,string[]>={draft:["submitted","cancelled"],submitted:["approved","rejected","cancelled"],approved:["rfq","cancelled"],rfq:["ordered","closed"],ordered:["closed"],closed:[],cancelled:[],rejected:[]};
router.get("/api/purchasing/overview",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const [suppliers,requests,rfqs,quotes,orders,receipts,invoices,payments,returns,evaluations,contracts,events]=await Promise.all([
  query("select * from purchase_suppliers where tenant_id=$1 order by created_at desc limit 500",[t.id]),
  query("select * from purchase_requests where tenant_id=$1 order by created_at desc limit 500",[t.id]),
  query("select r.*,s.request_no from purchase_rfqs r join purchase_requests s on s.id=r.request_id where r.tenant_id=$1 order by r.created_at desc limit 300",[t.id]),
  query("select q.*,s.name supplier_name,r.rfq_no from purchase_supplier_quotes q join purchase_suppliers s on s.id=q.supplier_id join purchase_rfqs r on r.id=q.rfq_id join purchase_requests pr on pr.id=r.request_id where pr.tenant_id=$1 order by q.created_at desc limit 500",[t.id]),
  query("select o.*,s.name supplier_name,coalesce((select json_agg(oi order by oi.id) from purchase_order_items oi where oi.order_id=o.id),'[]'::json) items from purchase_orders o join purchase_suppliers s on s.id=o.supplier_id where o.tenant_id=$1 order by o.created_at desc limit 500",[t.id]),
  query("select g.*,o.order_no from purchase_receipts g join purchase_orders o on o.id=g.order_id where g.tenant_id=$1 order by g.created_at desc limit 500",[t.id]),
  query("select i.*,s.name supplier_name from purchase_invoices i join purchase_suppliers s on s.id=i.supplier_id where i.tenant_id=$1 order by i.created_at desc limit 500",[t.id]),
  query("select * from purchase_payments where tenant_id=$1 order by paid_at desc limit 500",[t.id]),
  query("select r.*,o.order_no from purchase_returns r join purchase_orders o on o.id=r.order_id where r.tenant_id=$1 order by r.created_at desc limit 300",[t.id]),
  query("select e.*,s.name supplier_name from supplier_evaluations e join purchase_suppliers s on s.id=e.supplier_id where e.tenant_id=$1 order by e.created_at desc limit 300",[t.id]),
  query("select c.*,s.name supplier_name from supplier_contracts c join purchase_suppliers s on s.id=c.supplier_id where c.tenant_id=$1 order by c.created_at desc limit 300",[t.id]),
  query("select * from purchase_events where tenant_id=$1 order by created_at desc limit 500",[t.id])
 ]);
 res.json({suppliers:suppliers.rows,requests:requests.rows,rfqs:rfqs.rows,quotes:quotes.rows,orders:orders.rows,receipts:receipts.rows,invoices:invoices.rows,payments:payments.rows,returns:returns.rows,evaluations:evaluations.rows,contracts:contracts.rows,events:events.rows});
});
router.post("/api/purchasing/suppliers",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{};if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");if(!b.code||!b.name)return deny(res,400,"کد و نام تأمین‌کننده الزامی است");
 const r=await query("insert into purchase_suppliers(tenant_id,code,name,national_id,phone,email,payment_terms_days) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,b.code,b.name,b.nationalId||null,b.phone||null,b.email||null,n(b.paymentTermsDays)]);res.status(201).json(r.rows[0]);
});
router.post("/api/purchasing/suppliers/import",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),rows=Array.isArray(req.body?.rows)?req.body.rows:[];
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 if(!rows.length||rows.length>1000)return deny(res,400,"تعداد ردیف‌های ورود باید بین ۱ تا ۱۰۰۰ باشد");
 const normalized=rows.map((raw:any,index:number)=>({
  row:index+2,code:String(raw.code??"").trim(),name:String(raw.name??"").trim(),
  nationalId:String(raw.nationalId??raw.national_id??"").trim()||null,
  phone:String(raw.phone??"").trim()||null,email:String(raw.email??"").trim()||null,
  paymentTermsDays:Number(raw.paymentTermsDays??raw.payment_terms_days??0)
 }));
 const seen=new Set<string>();
 for(const row of normalized){
  if(!row.code||!row.name)return deny(res,400,"کد و نام تأمین‌کننده در ردیف "+row.row+" الزامی است");
  if(row.code.length>80||row.name.length>250||(row.nationalId&&row.nationalId.length>30)||(row.phone&&row.phone.length>40)||(row.email&&row.email.length>254))return deny(res,400,"طول یکی از فیلدهای ردیف "+row.row+" بیش از حد مجاز است");
  if(seen.has(row.code))return deny(res,400,"کد تکراری در فایل: "+row.code);
  seen.add(row.code);
  if(!Number.isInteger(row.paymentTermsDays)||row.paymentTermsDays<0||row.paymentTermsDays>3650)return deny(res,400,"مهلت پرداخت در ردیف "+row.row+" باید عدد صحیح بین صفر تا ۳۶۵۰ باشد");
  if(row.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))return deny(res,400,"ایمیل ردیف "+row.row+" معتبر نیست");
 }
 const client=await pool.connect();
 try{
  await client.query("begin");
  const created=[];
  for(const row of normalized){
   const inserted=await client.query("insert into purchase_suppliers(tenant_id,code,name,national_id,phone,email,payment_terms_days) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,row.code,row.name,row.nationalId,row.phone,row.email,row.paymentTermsDays]);
   created.push(inserted.rows[0]);
   await client.query("insert into purchase_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id) values($1,'supplier',$2,null,$3,'created',$4)",[t.id,inserted.rows[0].id,inserted.rows[0].status,(req as any).user.id]);
  }
  await client.query("commit");
  res.status(201).json({created:created.length,items:created});
 }catch(error:any){
  await client.query("rollback");
  if(error?.code==="23505")return deny(res,409,"کد یکی از تأمین‌کنندگان از قبل در سازمان ثبت شده است؛ هیچ ردیفی وارد نشد");
  throw error;
 }finally{client.release();}
});
router.patch("/api/purchasing/suppliers/:id",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{};if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const old=(await query("select * from purchase_suppliers where id=$1 and tenant_id=$2",[req.params.id,t.id])).rows[0];
 if(!old)return deny(res,404,"تأمین‌کننده پیدا نشد");
 const code=b.code===undefined?old.code:String(b.code).trim(),name=b.name===undefined?old.name:String(b.name).trim();
 if(!code||!name)return deny(res,400,"کد و نام تأمین‌کننده الزامی است");
 const status=b.status===undefined?old.status:String(b.status);
 if(!["active","blocked","inactive"].includes(status))return deny(res,400,"وضعیت تأمین‌کننده نامعتبر است");
 const terms=b.paymentTermsDays===undefined?Number(old.payment_terms_days):Number(b.paymentTermsDays);
 if(!Number.isInteger(terms)||terms<0||terms>3650)return deny(res,400,"مهلت پرداخت باید عدد صحیح بین صفر تا ۳۶۵۰ روز باشد");
 const r=await query("update purchase_suppliers set code=$1,name=$2,national_id=$3,phone=$4,email=$5,payment_terms_days=$6,status=$7,updated_at=now() where id=$8 and tenant_id=$9 returning *",[code,name,b.nationalId===undefined?old.national_id:(String(b.nationalId).trim()||null),b.phone===undefined?old.phone:(String(b.phone).trim()||null),b.email===undefined?old.email:(String(b.email).trim()||null),terms,status,old.id,t.id]);
 await event(t.id,"supplier",old.id,old.status,r.rows[0].status,"updated",(req as any).user.id);
 res.json(r.rows[0]);
});
router.post("/api/purchasing/requests",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{},items=Array.isArray(b.items)?b.items:[];if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");if(!items.length)return deny(res,400,"حداقل یک قلم خرید الزامی است");
 const no=b.requestNo||"PR-"+Date.now(),c=await pool.connect();try{await c.query("begin");const r=await c.query("insert into purchase_requests(tenant_id,request_no,requester_user_id,required_date,department,notes) values($1,$2,$3,$4,$5,$6) returning *",[t.id,no,(req as any).user.id,b.requiredDate||null,b.department||null,b.notes||null]);for(const x of items)await c.query("insert into purchase_request_items(request_id,product_name,sku,quantity,unit,estimated_unit_price) values($1,$2,$3,$4,$5,$6)",[r.rows[0].id,x.productName,x.sku||null,n(x.quantity),x.unit||"عدد",n(x.estimatedUnitPrice)]);await c.query("commit");res.status(201).json(r.rows[0])}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
router.patch("/api/purchasing/requests/:id/status",requireAuth,requirePermission("modules:21-purchasing-supply:approve"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const r=await query("select * from purchase_requests where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!r.rowCount)return deny(res,404,"درخواست خرید پیدا نشد");const old=r.rows[0],to=String(req.body?.status||"");if(!transitions[old.status]?.includes(to))return deny(res,409,"تغییر وضعیت درخواست خرید مجاز نیست");await query("update purchase_requests set status=$1,updated_at=now() where id=$2",[to,old.id]);await event(t.id,"request",old.id,old.status,to,"status_change",(req as any).user.id,req.body?.reason||null);res.json({...old,status:to});
});
router.post("/api/purchasing/rfqs",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{};if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const pr=await query("select * from purchase_requests where id=$1 and tenant_id=$2",[b.requestId,t.id]);if(!pr.rowCount||pr.rows[0].status!=="approved")return deny(res,409,"فقط درخواست تأییدشده قابل استعلام است");const suppliers=Array.isArray(b.supplierIds)?b.supplierIds:[];if(!suppliers.length)return deny(res,400,"حداقل یک تأمین‌کننده انتخاب کنید");const no=b.rfqNo||"RFQ-"+Date.now();const c=await pool.connect();try{await c.query("begin");const r=await c.query("insert into purchase_rfqs(tenant_id,rfq_no,request_id,deadline,notes,created_by,status) values($1,$2,$3,$4,$5,$6,'sent') returning *",[t.id,no,b.requestId,b.deadline||null,b.notes||null,(req as any).user.id]);for(const id of suppliers){const s=await c.query("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active'",[id,t.id]);if(!s.rowCount)throw Error("تأمین‌کننده نامعتبر است");await c.query("insert into purchase_rfq_suppliers(rfq_id,supplier_id) values($1,$2)",[r.rows[0].id,id])}await c.query("update purchase_requests set status='rfq',updated_at=now() where id=$1",[b.requestId]);await c.query("commit");res.status(201).json(r.rows[0])}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
router.post("/api/purchasing/quotes",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{},items=Array.isArray(b.items)?b.items:[];if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");if(!b.rfqId||!b.supplierId||!items.length)return deny(res,400,"استعلام، تأمین‌کننده و اقلام الزامی است");const rf=await query("select * from purchase_rfqs where id=$1 and tenant_id=$2",[b.rfqId,t.id]);if(!rf.rowCount||!["sent","quoting"].includes(rf.rows[0].status))return deny(res,409,"استعلام قابل دریافت پیشنهاد نیست");const supplier=await query("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active'",[b.supplierId,t.id]);if(!supplier.rowCount)return deny(res,400,"تأمین‌کننده فعال نیست");
 const sub=items.reduce((a:any,x:any)=>a+n(x.quantity)*n(x.unitPrice),0),tax=items.reduce((a:any,x:any)=>a+n(x.quantity)*n(x.unitPrice)*n(x.taxRate)/100,0),total=sub+tax+n(b.shippingTotal),c=await pool.connect();try{await c.query("begin");const q=await c.query("insert into purchase_supplier_quotes(rfq_id,supplier_id,quote_no,subtotal,tax_total,shipping_total,total,delivery_days,quality_score,notes) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[b.rfqId,b.supplierId,b.quoteNo||null,sub,tax,n(b.shippingTotal),total,n(b.deliveryDays),n(b.qualityScore),b.notes||null]);for(const x of items)await c.query("insert into purchase_supplier_quote_items(quote_id,product_name,quantity,unit_price,tax_rate,line_total) values($1,$2,$3,$4,$5,$6)",[q.rows[0].id,x.productName,n(x.quantity),n(x.unitPrice),n(x.taxRate),n(x.quantity)*n(x.unitPrice)*(1+n(x.taxRate)/100)]);await c.query("update purchase_rfqs set status='quoting' where id=$1",[b.rfqId]);await c.query("update purchase_rfq_suppliers set status='responded' where rfq_id=$1 and supplier_id=$2",[b.rfqId,b.supplierId]);await c.query("commit");res.status(201).json(q.rows[0])}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
router.patch("/api/purchasing/rfqs/:id/select",requireAuth,requirePermission("modules:21-purchasing-supply:approve"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{};if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const q=await query("select q.*,r.request_id from purchase_supplier_quotes q join purchase_rfqs r on r.id=q.rfq_id where q.id=$1 and r.tenant_id=$2",[req.params.id,t.id]);if(!q.rowCount)return deny(res,404,"پیشنهاد پیدا نشد");const x=q.rows[0];const c=await pool.connect();try{await c.query("begin");await c.query("update purchase_supplier_quotes set status='rejected' where rfq_id=$1",[x.rfq_id]);await c.query("update purchase_supplier_quotes set status='selected' where id=$1",[x.id]);await c.query("update purchase_rfqs set status='selected' where id=$1",[x.rfq_id]);await c.query("update purchase_requests set status='approved',updated_at=now() where id=$1",[x.request_id]);await c.query("commit");res.json({...x,status:"selected"})}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
router.post("/api/purchasing/orders",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{},items=Array.isArray(b.items)?b.items:[];if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");if(!b.supplierId||!items.length)return deny(res,400,"تأمین‌کننده و اقلام سفارش الزامی است");const s=await query("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active'",[b.supplierId,t.id]);if(!s.rowCount)return deny(res,400,"تأمین‌کننده فعال نیست");const sub=items.reduce((a:any,x:any)=>a+n(x.quantity)*n(x.unitPrice),0),tax=items.reduce((a:any,x:any)=>a+n(x.quantity)*n(x.unitPrice)*n(x.taxRate)/100,0),total=sub+tax,c=await pool.connect();try{await c.query("begin");const o=await c.query("insert into purchase_orders(tenant_id,order_no,supplier_id,request_id,quote_id,expected_date,subtotal,tax_total,total,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",[t.id,b.orderNo||"PO-"+Date.now(),b.supplierId,b.requestId||null,b.quoteId||null,b.expectedDate||null,sub,tax,total,b.notes||null,(req as any).user.id]);for(const x of items)await c.query("insert into purchase_order_items(order_id,product_name,sku,quantity,unit,unit_price,tax_rate,line_total) values($1,$2,$3,$4,$5,$6,$7,$8)",[o.rows[0].id,x.productName,x.sku||null,n(x.quantity),x.unit||"عدد",n(x.unitPrice),n(x.taxRate),n(x.quantity)*n(x.unitPrice)*(1+n(x.taxRate)/100)]);await c.query("commit");res.status(201).json(o.rows[0])}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
router.patch("/api/purchasing/orders/:id/status",requireAuth,requirePermission("modules:21-purchasing-supply:approve"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const to=String(req.body?.status||""),reason=String(req.body?.reason||"").trim().slice(0,500)||null;
 const c=await pool.connect();
 try{
  await c.query("begin");
  const locked=await c.query("select * from purchase_orders where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!locked.rowCount){await c.query("rollback");return deny(res,404,"سفارش خرید پیدا نشد");}
  const old=locked.rows[0];
  if(!isAllowedLifecycleTransition(purchaseOrderTransitions,old.status,to)){await c.query("rollback");return deny(res,409,"تغییر وضعیت سفارش خرید مجاز نیست");}
  if(to==="approved"){
   const supplier=await c.query("select id,status from purchase_suppliers where id=$1 and tenant_id=$2 for update",[old.supplier_id,t.id]);
   if(!supplier.rowCount||supplier.rows[0].status!=="active"){await c.query("rollback");return deny(res,409,"تأمین‌کننده سفارش فعال یا متعلق به سازمان نیست");}
  }
  const updated=await c.query("update purchase_orders set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[to,old.id,t.id]);
  if(!updated.rowCount){await c.query("rollback");return deny(res,409,"سفارش خرید در این فاصله تغییر کرده است");}
  await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id,reason) values($1,'order',$2,$3,$4,'status_change',$5,$6)",[t.id,old.id,old.status,to,(req as any).user.id,reason]);
  await c.query("commit");
  res.json(updated.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/purchasing/receipts",requireAuth,requirePermission("modules:21-purchasing-supply:receive"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{},items=Array.isArray(b.items)?b.items:[];
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 if(!b.orderId||!items.length)return deny(res,400,"سفارش و اقلام دریافت الزامی است");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const order=await c.query("select * from purchase_orders where id=$1 and tenant_id=$2 for update",[b.orderId,t.id]);
  if(!order.rowCount){await c.query("rollback");return deny(res,404,"سفارش خرید پیدا نشد");}
  const old=order.rows[0];
  if(!["sent","partially_received"].includes(old.status)){await c.query("rollback");return deny(res,409,"سفارش آماده دریافت نیست");}
  const seen=new Set<string>(),normalized=[];
  for(const raw of items){
   const item=raw||{},itemId=String(item.orderItemId||""),quantity=Number(item.quantity);
   const accepted=item.acceptedQty===undefined?quantity:Number(item.acceptedQty),rejected=item.rejectedQty===undefined?0:Number(item.rejectedQty);
   if(!itemId||seen.has(itemId)||![quantity,accepted,rejected].every(Number.isFinite)||quantity<=0||accepted<0||rejected<0||Math.abs(accepted+rejected-quantity)>0.000001){
    await c.query("rollback");return deny(res,400,"اقلام دریافت تکراری یا مقادیر دریافت، پذیرفته و مردود نامعتبر هستند");
   }
   seen.add(itemId);
   const found=await c.query("select * from purchase_order_items where id=$1 and order_id=$2 for update",[itemId,old.id]);
   if(!found.rowCount){await c.query("rollback");return deny(res,400,"قلم سفارش متعلق به این سفارش نیست");}
   const row=found.rows[0],open=Number(row.quantity)-Number(row.received_qty||0);
   if(!Number.isFinite(open)||quantity>open+0.000001){await c.query("rollback");return deny(res,409,"مقدار دریافت از مانده سفارش بیشتر است");}
   normalized.push({id:itemId,quantity,accepted,rejected});
  }
  const receiptNo=String(b.receiptNo||"GRN-"+Date.now()).trim();
  if(!receiptNo||receiptNo.length>100){await c.query("rollback");return deny(res,400,"شماره رسید دریافت معتبر نیست");}
  const receipt=await c.query("insert into purchase_receipts(tenant_id,receipt_no,order_id,status,inspector_user_id,notes,created_by) values($1,$2,$3,'received',$4,$5,$4) returning *",[t.id,receiptNo,old.id,(req as any).user.id,b.notes||null]);
  for(const item of normalized){
   await c.query("update purchase_order_items set received_qty=received_qty+$1 where id=$2 and order_id=$3",[item.quantity,item.id,old.id]);
   await c.query("insert into purchase_receipt_items(receipt_id,order_item_id,quantity,accepted_qty,rejected_qty) values($1,$2,$3,$4,$5)",[receipt.rows[0].id,item.id,item.quantity,item.accepted,item.rejected]);
  }
  const remaining=await c.query("select count(*) filter(where received_qty<quantity) remaining from purchase_order_items where order_id=$1",[old.id]);
  const next=Number(remaining.rows[0].remaining)>0?"partially_received":"received";
  const updated=await c.query("update purchase_orders set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning id",[next,old.id,t.id]);
  if(!updated.rowCount)throw new Error("وضعیت سفارش هنگام ثبت رسید تغییر کرده است");
  await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id,reason) values($1,'order',$2,$3,$4,'receipt',$5,$6)",[t.id,old.id,old.status,next,(req as any).user.id,"رسید "+receiptNo]);
  await c.query("commit");
  res.status(201).json({receipt:receipt.rows[0],orderStatus:next});
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/purchasing/invoices",requireAuth,requirePermission("modules:21-purchasing-supply:invoice"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{};
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 if(!b.orderId)return deny(res,400,"سفارش خرید الزامی است");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const order=await c.query("select * from purchase_orders where id=$1 and tenant_id=$2 for update",[b.orderId,t.id]);
  if(!order.rowCount){await c.query("rollback");return deny(res,404,"سفارش خرید پیدا نشد");}
  const old=order.rows[0];
  if(old.status!=="received"){await c.query("rollback");return deny(res,409,"فقط سفارش کاملاً دریافت‌شده قابل فاکتور است");}
  const existing=await c.query("select id from purchase_invoices where tenant_id=$1 and order_id=$2 limit 1",[t.id,old.id]);
  if(existing.rowCount){await c.query("rollback");return deny(res,409,"برای این سفارش قبلاً فاکتور ثبت شده است");}
  const invoiceNo=String(b.invoiceNo||"PINV-"+Date.now()).trim();
  if(!invoiceNo||invoiceNo.length>100){await c.query("rollback");return deny(res,400,"شماره فاکتور خرید معتبر نیست");}
  const invoice=await c.query("insert into purchase_invoices(tenant_id,invoice_no,supplier_id,order_id,status,subtotal,tax_total,total,due_date,notes,created_by) values($1,$2,$3,$4,'issued',$5,$6,$7,$8,$9,$10) returning *",[t.id,invoiceNo,old.supplier_id,old.id,old.subtotal,old.tax_total,old.total,b.dueDate||null,b.notes||null,(req as any).user.id]);
  const updated=await c.query("update purchase_orders set status='invoiced',updated_at=now() where id=$1 and tenant_id=$2 and status='received' returning id",[old.id,t.id]);
  if(!updated.rowCount)throw new Error("وضعیت سفارش هنگام صدور فاکتور تغییر کرده است");
  await c.query("insert into purchase_financial_events(tenant_id,source_type,source_id,event_type,amount,state,reference_no) values($1,'purchase_invoice',$2,'invoice_received',$3,'pending_accounting',$4)",[t.id,invoice.rows[0].id,old.total,invoiceNo]);
  await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id,reason) values($1,'order',$2,'received','invoiced','invoice',$3,$4)",[t.id,old.id,(req as any).user.id,"فاکتور "+invoiceNo]);
  await c.query("commit");
  res.status(201).json(invoice.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/purchasing/invoices/:id/payments",requireAuth,requirePermission("modules:21-purchasing-supply:payment"),async(req,res)=>{
 const t=await tenantOf(req),amount=n(req.body?.amount);
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 if(!Number.isFinite(amount)||amount<=0)return deny(res,400,"مبلغ پرداخت باید عدد مثبت و معتبر باشد");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const invoice=await c.query("select * from purchase_invoices where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!invoice.rowCount){await c.query("rollback");return deny(res,404,"فاکتور خرید پیدا نشد");}
  const inv=invoice.rows[0],paidBefore=n(inv.paid_total),total=n(inv.total);
  if(!Number.isFinite(paidBefore)||!Number.isFinite(total)||paidBefore+amount>total+0.000001){await c.query("rollback");return deny(res,400,"مبلغ پرداخت از مانده فاکتور بیشتر است یا اطلاعات فاکتور معتبر نیست");}
  const payment=await c.query("insert into purchase_payments(tenant_id,invoice_id,amount,method,reference_no,created_by) values($1,$2,$3,$4,$5,$6) returning *",[t.id,inv.id,amount,req.body?.method||"bank",req.body?.referenceNo||null,(req as any).user.id]);
  const paid=paidBefore+amount,nextInvoice=paid+0.000001>=total?"paid":"partially_paid";
  await c.query("update purchase_invoices set paid_total=$1,status=$2 where id=$3 and tenant_id=$4",[paid,nextInvoice,inv.id,t.id]);
  await c.query("insert into purchase_financial_events(tenant_id,source_type,source_id,event_type,amount,state,reference_no) values($1,'purchase_payment',$2,'supplier_payment',$3,'pending_accounting',$4)",[t.id,payment.rows[0].id,amount,req.body?.referenceNo||null]);
  if(nextInvoice==="paid"&&inv.order_id){
   const order=await c.query("select id,status from purchase_orders where id=$1 and tenant_id=$2 for update",[inv.order_id,t.id]);
   if(!order.rowCount||order.rows[0].status!=="invoiced"){await c.query("rollback");return deny(res,409,"وضعیت سفارش برای تسویه این فاکتور معتبر نیست");}
   const updatedOrder=await c.query("update purchase_orders set status='paid',updated_at=now() where id=$1 and tenant_id=$2 and status='invoiced' returning id",[inv.order_id,t.id]);
   if(!updatedOrder.rowCount){await c.query("rollback");return deny(res,409,"سفارش هنگام تسویه تغییر کرده است");}
   await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id,reason) values($1,'order',$2,'invoiced','paid','payment',$3,$4)",[t.id,inv.order_id,(req as any).user.id,"تسویه فاکتور "+inv.invoice_no]);
  }
  await c.query("commit");
  res.status(201).json({payment:payment.rows[0],invoiceStatus:nextInvoice,paidTotal:paid});
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/purchasing/returns",requireAuth,requirePermission("modules:21-purchasing-supply:return"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{};if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");if(!b.orderId||n(b.amount)<=0)return deny(res,400,"سفارش و مبلغ برگشت الزامی است");const r=await query("insert into purchase_returns(tenant_id,return_no,order_id,amount,reason,created_by) values($1,$2,$3,$4,$5,$6) returning *",[t.id,b.returnNo||"PRET-"+Date.now(),b.orderId,n(b.amount),b.reason||null,(req as any).user.id]);res.status(201).json(r.rows[0]);
});
router.patch("/api/purchasing/returns/:id/status",requireAuth,requirePermission("modules:21-purchasing-supply:return"),async(req,res)=>{const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const r=await query("select * from purchase_returns where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!r.rowCount)return deny(res,404,"برگشت خرید پیدا نشد");const old=r.rows[0],to=String(req.body?.status||""),flow:Record<string,string[]>={requested:["approved","rejected","cancelled"],approved:["shipped","rejected"],shipped:["received"],received:["credited"],credited:[],rejected:[],cancelled:[]};if(!flow[old.status]?.includes(to))return deny(res,409,"تغییر وضعیت برگشت مجاز نیست");await query("update purchase_returns set status=$1 where id=$2",[to,old.id]);await event(t.id,"return",old.id,old.status,to,"status_change",(req as any).user.id,req.body?.reason||null);res.json({...old,status:to})});
router.post("/api/purchasing/evaluations",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{const t=await tenantOf(req),b=req.body||{};if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const total=(n(b.qualityScore)+n(b.deliveryScore)+n(b.priceScore)+n(b.serviceScore))/4;const r=await query("insert into supplier_evaluations(tenant_id,supplier_id,period_start,period_end,quality_score,delivery_score,price_score,service_score,total_score,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",[t.id,b.supplierId,b.periodStart,b.periodEnd,n(b.qualityScore),n(b.deliveryScore),n(b.priceScore),n(b.serviceScore),total,b.notes||null,(req as any).user.id]);res.status(201).json(r.rows[0])});
router.post("/api/purchasing/contracts",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{const t=await tenantOf(req),b=req.body||{};if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const r=await query("insert into supplier_contracts(tenant_id,contract_no,supplier_id,title,status,start_date,end_date,value,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,b.contractNo||"SC-"+Date.now(),b.supplierId,b.title,b.status||"draft",b.startDate||null,b.endDate||null,n(b.value),b.notes||null,(req as any).user.id]);res.status(201).json(r.rows[0])});
export {router as purchasingSupplyRouter};