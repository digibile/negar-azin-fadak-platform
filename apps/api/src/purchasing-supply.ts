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
 const [suppliers,requests,rfqs,quotes,orders,receipts,invoices,payments,returns,evaluations,contracts,events,financialEvents]=await Promise.all([
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
  query("select * from purchase_events where tenant_id=$1 order by created_at desc limit 500",[t.id]),
  query("select fe.*,coalesce(pi.invoice_no,pp.reference_no,pr.return_no,fe.reference_no) as display_reference,coalesce(si.name,sp.name,sr.name) as supplier_name,coalesce(pi.order_id,pp.invoice_id,pr.order_id) as related_record_id from purchase_financial_events fe left join purchase_invoices pi on fe.source_type='purchase_invoice' and pi.id=fe.source_id and pi.tenant_id=fe.tenant_id left join purchase_payments pp on fe.source_type='purchase_payment' and pp.id=fe.source_id and pp.tenant_id=fe.tenant_id left join purchase_invoices ppi on ppi.id=pp.invoice_id and ppi.tenant_id=pp.tenant_id left join purchase_returns pr on fe.source_type='purchase_return' and pr.id=fe.source_id and pr.tenant_id=fe.tenant_id left join purchase_suppliers si on si.id=pi.supplier_id and si.tenant_id=fe.tenant_id left join purchase_suppliers sp on sp.id=ppi.supplier_id and sp.tenant_id=fe.tenant_id left join purchase_orders po on po.id=pr.order_id and po.tenant_id=pr.tenant_id left join purchase_suppliers sr on sr.id=po.supplier_id and sr.tenant_id=fe.tenant_id where fe.tenant_id=$1 order by fe.created_at desc limit 1000",[t.id])
 ]);
 res.json({suppliers:suppliers.rows,requests:requests.rows,rfqs:rfqs.rows,quotes:quotes.rows,orders:orders.rows,receipts:receipts.rows,invoices:invoices.rows,payments:payments.rows,returns:returns.rows,evaluations:evaluations.rows,contracts:contracts.rows,events:events.rows,financialEvents:financialEvents.rows});
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
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const to=String(req.body?.status||""),reason=String(req.body?.reason||"").trim().slice(0,500)||null;
 const c=await pool.connect();
 try{
  await c.query("begin");
  const locked=await c.query("select * from purchase_requests where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!locked.rowCount){await c.query("rollback");return deny(res,404,"درخواست خرید پیدا نشد");}
  const old=locked.rows[0];
  if(!transitions[old.status]?.includes(to)){await c.query("rollback");return deny(res,409,"تغییر وضعیت درخواست خرید مجاز نیست");}
  const updated=await c.query("update purchase_requests set status=$1,updated_at=now() where id=$2 and tenant_id=$3 and status=$4 returning *",[to,old.id,t.id,old.status]);
  if(!updated.rowCount){await c.query("rollback");return deny(res,409,"درخواست خرید در این فاصله تغییر کرده است");}
  await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id,reason) values($1,'request',$2,$3,$4,'status_change',$5,$6)",[t.id,old.id,old.status,to,(req as any).user.id,reason]);
  await c.query("commit");
  res.json(updated.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/purchasing/rfqs",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{};
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const suppliers=Array.isArray(b.supplierIds)?b.supplierIds:[];
 if(!b.requestId||!suppliers.length)return deny(res,400,"درخواست خرید و حداقل یک تأمین‌کننده الزامی است");
 if(new Set(suppliers.map(String)).size!==suppliers.length)return deny(res,400,"تأمین‌کننده تکراری در فهرست وجود دارد");
 const no=String(b.rfqNo||"RFQ-"+Date.now()).trim();
 if(!no||no.length>100)return deny(res,400,"شماره استعلام معتبر نیست");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const pr=await c.query("select id,status from purchase_requests where id=$1 and tenant_id=$2 for update",[b.requestId,t.id]);
  if(!pr.rowCount||pr.rows[0].status!=="approved"){await c.query("rollback");return deny(res,409,"فقط درخواست تأییدشده قابل استعلام است");}
  for(const id of suppliers){
   const s=await c.query("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active' for update",[id,t.id]);
   if(!s.rowCount){await c.query("rollback");return deny(res,400,"تأمین‌کننده نامعتبر است");}
  }
  const r=await c.query("insert into purchase_rfqs(tenant_id,rfq_no,request_id,deadline,notes,created_by,status) values($1,$2,$3,$4,$5,$6,'sent') returning *",[t.id,no,b.requestId,b.deadline||null,b.notes||null,(req as any).user.id]);
  for(const id of suppliers)await c.query("insert into purchase_rfq_suppliers(rfq_id,supplier_id) values($1,$2)",[r.rows[0].id,id]);
  const updated=await c.query("update purchase_requests set status='rfq',updated_at=now() where id=$1 and tenant_id=$2 and status='approved' returning id",[b.requestId,t.id]);
  if(!updated.rowCount){await c.query("rollback");return deny(res,409,"درخواست خرید هنگام ایجاد استعلام تغییر کرده است");}
  await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id) values($1,'request',$2,'approved','rfq','rfq_created',$3)",[t.id,b.requestId,(req as any).user.id]);
  await c.query("commit");res.status(201).json(r.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/purchasing/quotes",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{},items=Array.isArray(b.items)?b.items:[];
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 if(!b.rfqId||!b.supplierId||!items.length)return deny(res,400,"استعلام، تأمین‌کننده و اقلام الزامی است");
 const normalized=items.map((x:any)=>({productName:String(x.productName||"").trim(),quantity:n(x.quantity),unitPrice:n(x.unitPrice),taxRate:n(x.taxRate)}));
 const shipping=n(b.shippingTotal),deliveryDays=n(b.deliveryDays),quality=b.qualityScore===undefined||b.qualityScore===null||b.qualityScore===""?null:n(b.qualityScore);
 if(normalized.some((x:any)=>!x.productName||x.productName.length>240||![x.quantity,x.unitPrice,x.taxRate].every(Number.isFinite)||x.quantity<=0||x.unitPrice<0||x.taxRate<0||x.taxRate>100)||!Number.isFinite(shipping)||shipping<0||!Number.isInteger(deliveryDays)||deliveryDays<0||quality!==null&&(!Number.isFinite(quality)||quality<0||quality>100))return deny(res,400,"اطلاعات اقلام، هزینه ارسال، زمان تحویل یا امتیاز کیفیت معتبر نیست");
 const subtotal=normalized.reduce((a:number,x:any)=>a+x.quantity*x.unitPrice,0),tax=normalized.reduce((a:number,x:any)=>a+x.quantity*x.unitPrice*x.taxRate/100,0),total=subtotal+tax+shipping;
 if(![subtotal,tax,total].every(Number.isFinite))return deny(res,400,"مجموع پیشنهاد معتبر نیست");
 const quoteNo=String(b.quoteNo||"").trim();
 if(quoteNo.length>100)return deny(res,400,"شماره پیشنهاد بیش از حد مجاز است");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const rf=await c.query("select * from purchase_rfqs where id=$1 and tenant_id=$2 for update",[b.rfqId,t.id]);
  if(!rf.rowCount||!["sent","quoting"].includes(rf.rows[0].status)){await c.query("rollback");return deny(res,409,"استعلام متعلق به سازمان یا در وضعیت دریافت پیشنهاد نیست");}
  const supplier=await c.query("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active' for update",[b.supplierId,t.id]);
  if(!supplier.rowCount){await c.query("rollback");return deny(res,400,"تأمین‌کننده فعال متعلق به سازمان نیست");}
  const invitation=await c.query("select status from purchase_rfq_suppliers where rfq_id=$1 and supplier_id=$2 for update",[b.rfqId,b.supplierId]);
  if(!invitation.rowCount||invitation.rows[0].status!=="invited"){await c.query("rollback");return deny(res,409,"این تأمین‌کننده برای استعلام دعوت نشده یا قبلاً پاسخ داده است");}
  const q=await c.query("insert into purchase_supplier_quotes(rfq_id,supplier_id,quote_no,subtotal,tax_total,shipping_total,total,delivery_days,quality_score,notes) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[b.rfqId,b.supplierId,quoteNo||null,subtotal,tax,shipping,total,deliveryDays,quality,String(b.notes||"").slice(0,2000)]);
  for(const x of normalized)await c.query("insert into purchase_supplier_quote_items(quote_id,product_name,quantity,unit_price,tax_rate,line_total) values($1,$2,$3,$4,$5,$6)",[q.rows[0].id,x.productName,x.quantity,x.unitPrice,x.taxRate,x.quantity*x.unitPrice*(1+x.taxRate/100)]);
  const updated=await c.query("update purchase_rfqs set status='quoting' where id=$1 and tenant_id=$2 and status in ('sent','quoting') returning id",[b.rfqId,t.id]);
  if(!updated.rowCount){await c.query("rollback");return deny(res,409,"استعلام هنگام ثبت پیشنهاد تغییر کرده است");}
  await c.query("update purchase_rfq_suppliers set status='responded' where rfq_id=$1 and supplier_id=$2 and status='invited'",[b.rfqId,b.supplierId]);
  await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,to_status,event_type,actor_user_id) values($1,'supplier_quote',$2,'received','quote_received',$3)",[t.id,q.rows[0].id,(req as any).user.id]);
  await c.query("commit");res.status(201).json(q.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.patch("/api/purchasing/rfqs/:id/select",requireAuth,requirePermission("modules:21-purchasing-supply:approve"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const q=await c.query("select q.*,r.request_id,r.status rfq_status from purchase_supplier_quotes q join purchase_rfqs r on r.id=q.rfq_id where q.id=$1 and r.tenant_id=$2 for update of q,r",[req.params.id,t.id]);
  if(!q.rowCount){await c.query("rollback");return deny(res,404,"پیشنهاد متعلق به این سازمان پیدا نشد");}
  const selected=q.rows[0];
  if(selected.status!=="received"||!["sent","quoting","compared"].includes(selected.rfq_status)){await c.query("rollback");return deny(res,409,"این پیشنهاد یا استعلام در وضعیت قابل انتخاب نیست");}
  const supplier=await c.query("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active' for update",[selected.supplier_id,t.id]);
  if(!supplier.rowCount){await c.query("rollback");return deny(res,409,"تأمین‌کننده پیشنهاد دیگر فعال یا متعلق به سازمان نیست");}
  const rfq=await c.query("update purchase_rfqs set status='selected' where id=$1 and tenant_id=$2 and status in ('sent','quoting','compared') returning id",[selected.rfq_id,t.id]);
  if(!rfq.rowCount){await c.query("rollback");return deny(res,409,"استعلام هنگام انتخاب تغییر کرده است");}
  await c.query("update purchase_supplier_quotes set status='rejected' where rfq_id=$1 and id<>$2 and status='received'",[selected.rfq_id,selected.id]);
  const chosen=await c.query("update purchase_supplier_quotes set status='selected' where id=$1 and rfq_id=$2 and status='received' returning *",[selected.id,selected.rfq_id]);
  if(!chosen.rowCount){await c.query("rollback");return deny(res,409,"پیشنهاد هنگام انتخاب تغییر کرده است");}
  const request=await c.query("select id,status from purchase_requests where id=$1 and tenant_id=$2 for update",[selected.request_id,t.id]);
  if(!request.rowCount||request.rows[0].status!=="rfq"){await c.query("rollback");return deny(res,409,"درخواست خرید مرتبط دیگر در مرحله استعلام نیست");}
  const approvedRequest=await c.query("update purchase_requests set status='approved',updated_at=now() where id=$1 and tenant_id=$2 and status='rfq' returning id",[selected.request_id,t.id]);
  if(!approvedRequest.rowCount){await c.query("rollback");return deny(res,409,"درخواست خرید هنگام انتخاب پیشنهاد تغییر کرده است");}
  await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id,reason) values($1,'rfq',$2,$3,'selected','supplier_selected',$4,$5)",[t.id,selected.rfq_id,selected.rfq_status,(req as any).user.id,"انتخاب پیشنهاد "+(selected.quote_no||selected.id)]);
  await c.query("commit");res.json(chosen.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/purchasing/orders",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{},items=Array.isArray(b.items)?b.items:[];
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 if(!b.supplierId||!items.length)return deny(res,400,"تأمین‌کننده و اقلام سفارش الزامی است");
 const normalized=items.map((x:any)=>({productName:String(x.productName||"").trim(),sku:String(x.sku||"").trim()||null,quantity:n(x.quantity),unit:String(x.unit||"عدد").trim(),unitPrice:n(x.unitPrice),taxRate:n(x.taxRate)}));
 if(normalized.some((x:any)=>!x.productName||x.productName.length>240||![x.quantity,x.unitPrice,x.taxRate].every(Number.isFinite)||x.quantity<=0||x.unitPrice<0||x.taxRate<0||x.taxRate>100||!x.unit||x.unit.length>40||(x.sku&&x.sku.length>120)))return deny(res,400,"نام، تعداد، قیمت، مالیات یا واحد یکی از اقلام سفارش معتبر نیست");
 const sub=normalized.reduce((a:number,x:any)=>a+x.quantity*x.unitPrice,0),tax=normalized.reduce((a:number,x:any)=>a+x.quantity*x.unitPrice*x.taxRate/100,0),total=sub+tax;
 if(![sub,tax,total].every(Number.isFinite))return deny(res,400,"مجموع مالی سفارش معتبر نیست");
 const orderNo=String(b.orderNo||"PO-"+Date.now()).trim();
 if(!orderNo||orderNo.length>100)return deny(res,400,"شماره سفارش خرید معتبر نیست");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const supplier=await c.query("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active' for update",[b.supplierId,t.id]);
  if(!supplier.rowCount){await c.query("rollback");return deny(res,400,"تأمین‌کننده فعال و متعلق به سازمان انتخاب نشده است");}
  let linkedRequestId=b.requestId||null;
  if(b.quoteId){
   const quote=await c.query("select q.id,q.supplier_id,q.status,r.request_id from purchase_supplier_quotes q join purchase_rfqs r on r.id=q.rfq_id where q.id=$1 and r.tenant_id=$2 for update of q,r",[b.quoteId,t.id]);
   if(!quote.rowCount||quote.rows[0].supplier_id!==b.supplierId||quote.rows[0].status!=="selected"){await c.query("rollback");return deny(res,409,"پیشنهاد انتخاب‌شده متعلق به این تأمین‌کننده و سازمان نیست");}
   if(linkedRequestId&&linkedRequestId!==quote.rows[0].request_id){await c.query("rollback");return deny(res,409,"درخواست و پیشنهاد انتخاب‌شده به یک استعلام تعلق ندارند");}
   linkedRequestId=quote.rows[0].request_id;
  }
  if(linkedRequestId){
   const request=await c.query("select id,status from purchase_requests where id=$1 and tenant_id=$2 for update",[linkedRequestId,t.id]);
   if(!request.rowCount||!["approved","rfq","ordered"].includes(request.rows[0].status)){await c.query("rollback");return deny(res,409,"درخواست خرید متعلق به سازمان یا آماده سفارش نیست");}
  }
  const o=await c.query("insert into purchase_orders(tenant_id,order_no,supplier_id,request_id,quote_id,expected_date,subtotal,tax_total,total,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",[t.id,orderNo,b.supplierId,linkedRequestId,b.quoteId||null,b.expectedDate||null,sub,tax,total,b.notes||null,(req as any).user.id]);
  for(const x of normalized)await c.query("insert into purchase_order_items(order_id,product_name,sku,quantity,unit,unit_price,tax_rate,line_total) values($1,$2,$3,$4,$5,$6,$7,$8)",[o.rows[0].id,x.productName,x.sku,x.quantity,x.unit,x.unitPrice,x.taxRate,x.quantity*x.unitPrice*(1+x.taxRate/100)]);
  await c.query("commit");res.status(201).json(o.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
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
  const acceptedTotals=await c.query(
   "select coalesce(sum(oi.unit_price*ri.accepted_qty),0)::numeric subtotal,coalesce(sum(oi.unit_price*ri.accepted_qty*oi.tax_rate/100),0)::numeric tax_total,coalesce(sum(ri.accepted_qty),0)::numeric accepted_quantity from purchase_order_items oi join purchase_receipt_items ri on ri.order_item_id=oi.id join purchase_receipts pr on pr.id=ri.receipt_id and pr.tenant_id=$2 where oi.order_id=$1",
   [old.id,t.id]
  );
  const subtotal=Number(acceptedTotals.rows[0].subtotal),taxTotal=Number(acceptedTotals.rows[0].tax_total),acceptedQuantity=Number(acceptedTotals.rows[0].accepted_quantity),invoiceTotal=subtotal+taxTotal;
  if(!Number.isFinite(invoiceTotal)||!Number.isFinite(acceptedQuantity)||acceptedQuantity<=0||invoiceTotal<=0){await c.query("rollback");return deny(res,409,"برای صدور فاکتور، کالای پذیرفته‌شده با ارزش معتبر لازم است");}
  const invoiceNo=String(b.invoiceNo||"PINV-"+Date.now()).trim();
  if(!invoiceNo||invoiceNo.length>100){await c.query("rollback");return deny(res,400,"شماره فاکتور خرید معتبر نیست");}
  const invoice=await c.query("insert into purchase_invoices(tenant_id,invoice_no,supplier_id,order_id,status,subtotal,tax_total,total,due_date,notes,created_by) values($1,$2,$3,$4,'issued',$5,$6,$7,$8,$9,$10) returning *",[t.id,invoiceNo,old.supplier_id,old.id,subtotal,taxTotal,invoiceTotal,b.dueDate||null,b.notes||null,(req as any).user.id]);
  const updated=await c.query("update purchase_orders set status='invoiced',updated_at=now() where id=$1 and tenant_id=$2 and status='received' returning id",[old.id,t.id]);
  if(!updated.rowCount)throw new Error("وضعیت سفارش هنگام صدور فاکتور تغییر کرده است");
  await c.query("insert into purchase_financial_events(tenant_id,source_type,source_id,event_type,amount,state,reference_no) values($1,'purchase_invoice',$2,'invoice_received',$3,'pending_accounting',$4)",[t.id,invoice.rows[0].id,invoiceTotal,invoiceNo]);
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
 const t=await tenantOf(req),b=req.body||{},amount=n(b.amount);
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 if(!b.orderId||!Number.isFinite(amount)||amount<=0)return deny(res,400,"سفارش و مبلغ مثبت و معتبر برگشت الزامی است");
 const no=String(b.returnNo||"PRET-"+Date.now()).trim();
 if(!no||no.length>100)return deny(res,400,"شماره برگشت معتبر نیست");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const order=await c.query("select * from purchase_orders where id=$1 and tenant_id=$2 for update",[b.orderId,t.id]);
  if(!order.rowCount){await c.query("rollback");return deny(res,404,"سفارش خرید پیدا نشد");}
  const old=order.rows[0];
  if(!["invoiced","paid"].includes(old.status)){await c.query("rollback");return deny(res,409,"برگشت مالی فقط برای سفارش فاکتورشده یا تسویه‌شده مجاز است");}
  const invoice=await c.query("select * from purchase_invoices where order_id=$1 and tenant_id=$2 for update",[old.id,t.id]);
  if(!invoice.rowCount){await c.query("rollback");return deny(res,409,"فاکتور معتبر سفارش برای برگشت پیدا نشد");}
  const reserved=await c.query("select coalesce(sum(amount),0)::numeric amount from purchase_returns where tenant_id=$1 and order_id=$2 and status not in ('rejected','cancelled')",[t.id,old.id]);
  const already=Number(reserved.rows[0].amount),invoiceTotal=Number(invoice.rows[0].total);
  if(!Number.isFinite(already)||!Number.isFinite(invoiceTotal)||amount+already>invoiceTotal+0.000001){await c.query("rollback");return deny(res,409,"مبلغ برگشت از مبلغ فاکتور پس از کسر برگشت‌های قبلی و باز بیشتر است");}
  const r=await c.query("insert into purchase_returns(tenant_id,return_no,order_id,amount,reason,created_by) values($1,$2,$3,$4,$5,$6) returning *",[t.id,no,old.id,amount,String(b.reason||"").trim().slice(0,1000),(req as any).user.id]);
  await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,to_status,event_type,actor_user_id,reason) values($1,'return',$2,'requested','create',$3,$4)",[t.id,r.rows[0].id,(req as any).user.id,String(b.reason||"").trim().slice(0,500)||null]);
  await c.query("commit");res.status(201).json(r.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.patch("/api/purchasing/returns/:id/status",requireAuth,requirePermission("modules:21-purchasing-supply:return"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const to=String(req.body?.status||""),reason=String(req.body?.reason||"").trim().slice(0,500)||null;
 const flow:Record<string,string[]>={requested:["approved","rejected","cancelled"],approved:["shipped","rejected"],shipped:["received"],received:["credited"],credited:[],rejected:[],cancelled:[]};
 const c=await pool.connect();
 try{
  await c.query("begin");
  const r=await c.query("select * from purchase_returns where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!r.rowCount){await c.query("rollback");return deny(res,404,"برگشت خرید پیدا نشد");}
  const old=r.rows[0];
  if(!flow[old.status]?.includes(to)){await c.query("rollback");return deny(res,409,"تغییر وضعیت برگشت مجاز نیست");}
  const order=await c.query("select * from purchase_orders where id=$1 and tenant_id=$2 for update",[old.order_id,t.id]);
  if(!order.rowCount||!["invoiced","paid"].includes(order.rows[0].status)){await c.query("rollback");return deny(res,409,"سفارش مرتبط برای گردش برگشت معتبر نیست");}
  if(to==="credited"){
   const invoice=await c.query("select * from purchase_invoices where order_id=$1 and tenant_id=$2 for update",[old.order_id,t.id]);
   if(!invoice.rowCount){await c.query("rollback");return deny(res,409,"فاکتور مرتبط با برگشت پیدا نشد");}
   const prior=await c.query("select coalesce(sum(amount),0)::numeric amount from purchase_returns where tenant_id=$1 and order_id=$2 and id<>$3 and status='credited'",[t.id,old.order_id,old.id]);
   const credited=Number(prior.rows[0].amount),total=Number(invoice.rows[0].total),amount=Number(old.amount);
   if(!Number.isFinite(credited)||!Number.isFinite(total)||!Number.isFinite(amount)||amount<=0||credited+amount>total+0.000001){await c.query("rollback");return deny(res,409,"مبلغ بستانکاری از مانده فاکتور بیشتر است");}
  }
  const updated=await c.query("update purchase_returns set status=$1 where id=$2 and tenant_id=$3 and status=$4 returning *",[to,old.id,t.id,old.status]);
  if(!updated.rowCount){await c.query("rollback");return deny(res,409,"برگشت در این فاصله تغییر کرده است");}
  if(to==="credited"){
   await c.query("insert into purchase_financial_events(tenant_id,source_type,source_id,event_type,amount,state,reference_no) values($1,'purchase_return',$2,'supplier_credit_note',$3,'pending_accounting',$4)",[t.id,old.id,-Number(old.amount),old.return_no]);
  }
  await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,reason,actor_user_id) values($1,'return',$2,$3,$4,'status_change',$5,$6)",[t.id,old.id,old.status,to,reason,(req as any).user.id]);
  await c.query("commit");res.json(updated.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/purchasing/evaluations",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{};
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const scores=[n(b.qualityScore),n(b.deliveryScore),n(b.priceScore),n(b.serviceScore)];
 const start=String(b.periodStart||""),end=String(b.periodEnd||"");
 if(!b.supplierId||scores.some(x=>!Number.isFinite(x)||x<0||x>100)||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)return deny(res,400,"تأمین‌کننده، بازه ارزیابی یا امتیازهای صفر تا صد معتبر نیست");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const supplier=await c.query("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active' for update",[b.supplierId,t.id]);
  if(!supplier.rowCount){await c.query("rollback");return deny(res,400,"تأمین‌کننده فعال و متعلق به سازمان انتخاب نشده است");}
  const total=scores.reduce((a,x)=>a+x,0)/4;
  const r=await c.query("insert into supplier_evaluations(tenant_id,supplier_id,period_start,period_end,quality_score,delivery_score,price_score,service_score,total_score,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",[t.id,b.supplierId,start,end,...scores,total,String(b.notes||"").trim().slice(0,2000),(req as any).user.id]);
  await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,to_status,event_type,actor_user_id) values($1,'supplier_evaluation',$2,'recorded','create',$3)",[t.id,r.rows[0].id,(req as any).user.id]);
  await c.query("commit");res.status(201).json(r.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/purchasing/contracts",requireAuth,requirePermission("modules:21-purchasing-supply:write"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{},value=n(b.value),no=String(b.contractNo||"SC-"+Date.now()).trim(),title=String(b.title||"").trim();
 const status=String(b.status||"draft"),start=b.startDate?String(b.startDate):null,end=b.endDate?String(b.endDate):null;
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 if(!b.supplierId||!no||no.length>100||!title||title.length>240||!Number.isFinite(value)||value<0||!["draft","active","expired","terminated"].includes(status)||start&&!/^\d{4}-\d{2}-\d{2}$/.test(start)||end&&!/^\d{4}-\d{2}-\d{2}$/.test(end)||start&&end&&start>end)return deny(res,400,"تأمین‌کننده، شماره، عنوان، مبلغ، وضعیت یا تاریخ قرارداد معتبر نیست");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const supplier=await c.query("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active' for update",[b.supplierId,t.id]);
  if(!supplier.rowCount){await c.query("rollback");return deny(res,400,"تأمین‌کننده فعال و متعلق به سازمان انتخاب نشده است");}
  const r=await c.query("insert into supplier_contracts(tenant_id,contract_no,supplier_id,title,status,start_date,end_date,value,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,no,b.supplierId,title,status,start,end,value,String(b.notes||"").trim().slice(0,4000),(req as any).user.id]);
  await c.query("insert into purchase_events(tenant_id,entity_type,entity_id,to_status,event_type,actor_user_id) values($1,'supplier_contract',$2,$3,'create',$4)",[t.id,r.rows[0].id,status,(req as any).user.id]);
  await c.query("commit");res.status(201).json(r.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
export {router as purchasingSupplyRouter};