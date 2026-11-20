import {Router,type Request,type Response} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";
import {salesOrderTransitions,isAllowedLifecycleTransition} from "./commerce-lifecycle.js";
const router=Router();
const tenantOf=async(req:Request)=>resolveTenant(req,(req as any).user);
const deny=(res:Response,s:number,e:string)=>res.status(s).json({error:e});
async function event(t:string,type:string,id:string,from:string|null,to:string,ev:string,reason:string|null,user:string){
 await query("insert into sales_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,reason,actor_user_id) values($1,$2,$3,$4,$5,$6,$7,$8)",[t,type,id,from,to,ev,reason,user]);
}
const num=(x:any)=>Number(x||0);
function totals(items:any[]){let sub=0,disc=0,tax=0;for(const x of items){const base=num(x.quantity)*num(x.unitPrice);const d=base*num(x.discountRate)/100;const net=base-d;sub+=base;disc+=d;tax+=net*num(x.taxRate)/100}return {subtotal:sub,discountTotal:disc,taxTotal:tax,total:sub-disc+tax};}
router.get("/api/sales/overview",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const [partners,products,quotes,orders,invoices,payments,returns,commissions,targets,events]=await Promise.all([
  query("select * from sales_partners where tenant_id=$1 order by created_at desc limit 500",[t.id]),
  query("select * from sales_products where tenant_id=$1 order by created_at desc limit 500",[t.id]),
  query("select q.*,p.name partner_name from sales_quotes q join sales_partners p on p.id=q.partner_id where q.tenant_id=$1 order by q.created_at desc limit 300",[t.id]),
  query("select o.*,p.name partner_name from sales_orders o join sales_partners p on p.id=o.partner_id where o.tenant_id=$1 order by o.created_at desc limit 500",[t.id]),
  query("select i.*,p.name partner_name from sales_invoices i join sales_partners p on p.id=i.partner_id where i.tenant_id=$1 order by i.created_at desc limit 500",[t.id]),
  query("select * from sales_payments where tenant_id=$1 order by paid_at desc limit 500",[t.id]),
  query("select r.*,i.invoice_no from sales_returns r join sales_invoices i on i.id=r.invoice_id where r.tenant_id=$1 order by r.created_at desc limit 300",[t.id]),
  query("select * from sales_commissions where tenant_id=$1 order by created_at desc limit 300",[t.id]),
  query("select * from sales_targets where tenant_id=$1 order by period_start desc limit 100",[t.id]),
  query("select * from sales_events where tenant_id=$1 order by created_at desc limit 500",[t.id])
 ]);
 res.json({partners:partners.rows,products:products.rows,quotes:quotes.rows,orders:orders.rows,invoices:invoices.rows,payments:payments.rows,returns:returns.rows,commissions:commissions.rows,targets:targets.rows,events:events.rows});
});
router.post("/api/sales/partners",requireAuth,requirePermission("modules:22-sales-revenue:write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(!b.code||!b.name)return deny(res,400,"کد و نام مشتری الزامی است");
 const r=await query("insert into sales_partners(tenant_id,code,name,national_id,phone,email,credit_limit) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,b.code,b.name,b.nationalId||null,b.phone||null,b.email||null,num(b.creditLimit)]);res.status(201).json(r.rows[0]);
});
router.post("/api/sales/products",requireAuth,requirePermission("modules:22-sales-revenue:write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};if(!b.sku||!b.name)return deny(res,400,"کد کالا و نام کالا الزامی است");
 const r=await query("insert into sales_products(tenant_id,sku,name,unit,sale_price,tax_rate,discount_rate,stock_available) values($1,$2,$3,$4,$5,$6,$7,$8) returning *",[t.id,b.sku,b.name,b.unit||"عدد",num(b.salePrice),num(b.taxRate),num(b.discountRate),num(b.stockAvailable)]);res.status(201).json(r.rows[0]);
});
router.post("/api/sales/quotes",requireAuth,requirePermission("modules:22-sales-revenue:write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const b=req.body||{},items=Array.isArray(b.items)?b.items:[];
 if(!b.partnerId||!items.length)return deny(res,400,"مشتری و اقلام پیش‌فاکتور الزامی است");
 const partner=await query("select id from sales_partners where id=$1 and tenant_id=$2 and status='active'",[b.partnerId,t.id]);
 if(!partner.rowCount)return deny(res,400,"مشتری فعال و متعلق به سازمان انتخاب نشده است");
 const ids=items.map((x:any)=>x.productId);
 const ps=await query("select * from sales_products where tenant_id=$1 and status='active' and id=any($2::uuid[])",[t.id,ids]);
 if(ps.rowCount!==new Set(ids).size)return deny(res,400,"یکی از کالاها متعلق به سازمان نیست یا فعال نیست");
 const map=new Map(ps.rows.map((x:any)=>[x.id,x]));
 const norm=items.map((x:any)=>({productId:x.productId,quantity:num(x.quantity),unitPrice:x.unitPrice===undefined?num(map.get(x.productId).sale_price):num(x.unitPrice),discountRate:x.discountRate===undefined?num(map.get(x.productId).discount_rate):num(x.discountRate),taxRate:x.taxRate===undefined?num(map.get(x.productId).tax_rate):num(x.taxRate)}));
 if(norm.some((x:any)=>![x.quantity,x.unitPrice,x.discountRate,x.taxRate].every(Number.isFinite)||x.quantity<=0||x.unitPrice<0||x.discountRate<0||x.discountRate>100||x.taxRate<0||x.taxRate>100))return deny(res,400,"تعداد، قیمت، تخفیف یا مالیات یکی از اقلام معتبر نیست");
 const tt=totals(norm),no=String(b.quoteNo||"QT-"+Date.now()).trim();
 if(!no||no.length>100)return deny(res,400,"شماره پیش‌فاکتور معتبر نیست");
 const cx=await pool.connect();
 try{
  await cx.query("begin");
  const q=await cx.query("insert into sales_quotes(tenant_id,quote_no,partner_id,valid_until,subtotal,discount_total,tax_total,total,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,no,b.partnerId,b.validUntil||null,tt.subtotal,tt.discountTotal,tt.taxTotal,tt.total,b.notes||"",(req as any).user.id]);
  for(const x of norm)await cx.query("insert into sales_quote_items(quote_id,product_id,quantity,unit_price,discount_rate,tax_rate,line_total) values($1,$2,$3,$4,$5,$6,$7)",[q.rows[0].id,x.productId,x.quantity,x.unitPrice,x.discountRate,x.taxRate,x.quantity*x.unitPrice*(1-x.discountRate/100)*(1+x.taxRate/100)]);
  await cx.query("insert into sales_events(tenant_id,entity_type,entity_id,to_status,event_type,actor_user_id) values($1,'quote',$2,'draft','create',$3)",[t.id,q.rows[0].id,(req as any).user.id]);
  await cx.query("commit");res.status(201).json(q.rows[0]);
 }catch(error){await cx.query("rollback");throw error;}finally{cx.release();}
});
router.patch("/api/sales/quotes/:id/status",requireAuth,requirePermission("modules:22-sales-revenue:approve"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const to=String(req.body?.status||""),reason=String(req.body?.reason||"").trim().slice(0,500)||null,cx=await pool.connect();
 const flow:Record<string,string[]>={draft:["submitted","cancelled"],submitted:["approved","rejected","expired"],approved:["cancelled"],rejected:[],expired:[],converted:[],cancelled:[]};
 try{
  await cx.query("begin");
  const q=await cx.query("select * from sales_quotes where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!q.rowCount){await cx.query("rollback");return deny(res,404,"پیش‌فاکتور پیدا نشد");}
  const old=q.rows[0];
  if(!flow[old.status]?.includes(to)){await cx.query("rollback");return deny(res,409,"تغییر وضعیت پیش‌فاکتور مجاز نیست");}
  const updated=await cx.query("update sales_quotes set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[to,old.id,t.id]);
  if(!updated.rowCount){await cx.query("rollback");return deny(res,409,"پیش‌فاکتور در این فاصله تغییر کرده است");}
  await cx.query("insert into sales_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,reason,actor_user_id) values($1,'quote',$2,$3,$4,'status_change',$5,$6)",[t.id,old.id,old.status,to,reason,(req as any).user.id]);
  await cx.query("commit");res.json(updated.rows[0]);
 }catch(error){await cx.query("rollback");throw error;}finally{cx.release();}
});
router.post("/api/sales/quotes/:id/convert",requireAuth,requirePermission("modules:22-sales-revenue:write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const cx=await pool.connect();
 try{
  await cx.query("begin");
  const q=await cx.query("select * from sales_quotes where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!q.rowCount){await cx.query("rollback");return deny(res,404,"پیش‌فاکتور پیدا نشد");}
  if(q.rows[0].status!=="approved"){await cx.query("rollback");return deny(res,409,"فقط پیش‌فاکتور تأییدشده قابل تبدیل است");}
  const old=q.rows[0],partner=await cx.query("select id from sales_partners where id=$1 and tenant_id=$2 and status='active' for update",[old.partner_id,t.id]);
  if(!partner.rowCount){await cx.query("rollback");return deny(res,409,"مشتری پیش‌فاکتور دیگر فعال یا متعلق به سازمان نیست");}
  const no=String(req.body?.orderNo||"SO-"+Date.now()).trim();
  if(!no||no.length>100){await cx.query("rollback");return deny(res,400,"شماره سفارش معتبر نیست");}
  const o=await cx.query("insert into sales_orders(tenant_id,order_no,partner_id,quote_id,due_date,subtotal,discount_total,tax_total,total,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",[t.id,no,old.partner_id,old.id,null,old.subtotal,old.discount_total,old.tax_total,old.total,old.notes,(req as any).user.id]);
  const qi=await cx.query("select * from sales_quote_items where quote_id=$1 order by id",[old.id]);
  if(!qi.rowCount){await cx.query("rollback");return deny(res,409,"پیش‌فاکتور قلم قابل تبدیل ندارد");}
  for(const x of qi.rows){
   const product=await cx.query("select id,status from sales_products where id=$1 and tenant_id=$2 for update",[x.product_id,t.id]);
   if(!product.rowCount||product.rows[0].status!=="active"){await cx.query("rollback");return deny(res,409,"یکی از کالاهای پیش‌فاکتور دیگر فعال یا متعلق به سازمان نیست");}
   await cx.query("insert into sales_order_items(order_id,product_id,quantity,unit_price,discount_rate,tax_rate,line_total) values($1,$2,$3,$4,$5,$6,$7)",[o.rows[0].id,x.product_id,x.quantity,x.unit_price,x.discount_rate,x.tax_rate,x.line_total]);
  }
  const changed=await cx.query("update sales_quotes set status='converted',updated_at=now() where id=$1 and tenant_id=$2 and status='approved' returning id",[old.id,t.id]);
  if(!changed.rowCount){await cx.query("rollback");return deny(res,409,"پیش‌فاکتور هنگام تبدیل تغییر کرده است");}
  await cx.query("insert into sales_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id) values($1,'quote',$2,'approved','converted','convert',$3)",[t.id,old.id,(req as any).user.id]);
  await cx.query("commit");res.status(201).json(o.rows[0]);
 }catch(error){await cx.query("rollback");throw error;}finally{cx.release();}
});
router.post("/api/sales/price-lists",requireAuth,requirePermission("modules:22-sales-revenue:write"),async(req,res)=>{const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const r=await query("insert into sales_price_lists(tenant_id,name,currency,valid_from,valid_to) values($1,$2,$3,$4,$5) returning *",[t.id,req.body?.name,req.body?.currency||"IRR",req.body?.validFrom||null,req.body?.validTo||null]);res.status(201).json(r.rows[0])});
router.post("/api/sales/commissions",requireAuth,requirePermission("modules:22-sales-revenue:write"),async(req,res)=>{const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const rate=num(req.body?.rate),base=num(req.body?.baseAmount);const r=await query("insert into sales_commissions(tenant_id,order_id,seller_user_id,rate,base_amount,amount) values($1,$2,$3,$4,$5,$6) returning *",[t.id,req.body?.orderId,req.body?.sellerUserId||null,rate,base,base*rate/100]);res.status(201).json(r.rows[0])});
router.post("/api/sales/orders",requireAuth,requirePermission("modules:22-sales-revenue:write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{},items=Array.isArray(b.items)?b.items:[];if(!b.partnerId||!items.length)return deny(res,400,"مشتری و اقلام سفارش الزامی است");
 const partner=await query("select id from sales_partners where id=$1 and tenant_id=$2 and status='active'",[b.partnerId,t.id]);
 if(!partner.rowCount)return deny(res,400,"مشتری فعال و متعلق به سازمان انتخاب نشده است");
 const ids=items.map((x:any)=>x.productId);const ps=await query("select * from sales_products where tenant_id=$1 and status='active' and id=any($2::uuid[])",[t.id,ids]);
 if(ps.rowCount!==ids.length)return deny(res,400,"یکی از کالاها متعلق به سازمان نیست یا فعال نیست");
 const map=new Map(ps.rows.map((x:any)=>[x.id,x]));const normalized=items.map((x:any)=>({productId:x.productId,quantity:num(x.quantity),unitPrice:x.unitPrice===undefined?num(map.get(x.productId).sale_price):num(x.unitPrice),discountRate:x.discountRate===undefined?num(map.get(x.productId).discount_rate):num(x.discountRate),taxRate:x.taxRate===undefined?num(map.get(x.productId).tax_rate):num(x.taxRate)}));
 if(normalized.some((x:any)=>![x.quantity,x.unitPrice,x.discountRate,x.taxRate].every(Number.isFinite)||x.quantity<=0||x.unitPrice<0||x.discountRate<0||x.discountRate>100||x.taxRate<0||x.taxRate>100))return deny(res,400,"تعداد، قیمت، تخفیف یا مالیات یکی از اقلام معتبر نیست");
 const tt=totals(normalized);const orderNo=String(b.orderNo||"SO-"+Date.now()).trim();
 if(!orderNo||orderNo.length>100)return deny(res,400,"شماره سفارش معتبر نیست");
 const c=await pool.connect();try{await c.query("begin");const o=await c.query("insert into sales_orders(tenant_id,order_no,partner_id,due_date,subtotal,discount_total,tax_total,total,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,orderNo,b.partnerId,b.dueDate||null,tt.subtotal,tt.discountTotal,tt.taxTotal,tt.total,b.notes||"",(req as any).user.id]);for(const x of normalized)await c.query("insert into sales_order_items(order_id,product_id,quantity,unit_price,discount_rate,tax_rate,line_total) values($1,$2,$3,$4,$5,$6,$7)",[o.rows[0].id,x.productId,x.quantity,x.unitPrice,x.discountRate,x.taxRate,x.quantity*x.unitPrice*(1-x.discountRate/100)*(1+x.taxRate/100)]);await c.query("insert into sales_events(tenant_id,entity_type,entity_id,to_status,event_type,actor_user_id) values($1,'order',$2,'draft','create',$3)",[t.id,o.rows[0].id,(req as any).user.id]);await c.query("commit");res.status(201).json(o.rows[0])}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
router.patch("/api/sales/orders/:id/status",requireAuth,requirePermission("modules:22-sales-revenue:approve"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const to=String(req.body?.status||""),reason=String(req.body?.reason||"").trim().slice(0,500)||null;
 const c=await pool.connect();
 try{
  await c.query("begin");
  const locked=await c.query("select * from sales_orders where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!locked.rowCount){await c.query("rollback");return deny(res,404,"سفارش پیدا نشد");}
  const old=locked.rows[0];
  if(!isAllowedLifecycleTransition(salesOrderTransitions,old.status,to)){await c.query("rollback");return deny(res,409,"تغییر وضعیت سفارش مجاز نیست");}
  if(to==="confirmed"){
   const partner=await c.query("select credit_limit,credit_used from sales_partners where id=$1 and tenant_id=$2 for update",[old.partner_id,t.id]);
   if(!partner.rowCount){await c.query("rollback");return deny(res,409,"مشتری سفارش در این سازمان پیدا نشد");}
   const limit=num(partner.rows[0].credit_limit),used=num(partner.rows[0].credit_used),total=num(old.total);
   if(![limit,used,total].every(Number.isFinite)||total<0||(limit>0&&used+total>limit)){await c.query("rollback");return deny(res,409,"سقف اعتبار مشتری کافی نیست");}
   await c.query("update sales_partners set credit_used=credit_used+$1,updated_at=now() where id=$2 and tenant_id=$3",[total,old.partner_id,t.id]);
  }
  if(to==="reserved"){
   const items=await c.query("select * from sales_order_items where order_id=$1 order by product_id for update",[old.id]);
   if(!items.rowCount){await c.query("rollback");return deny(res,409,"سفارش قلم قابل رزرو ندارد");}
   for(const item of items.rows){
    const quantity=num(item.quantity);
    if(!Number.isFinite(quantity)||quantity<=0){await c.query("rollback");return deny(res,409,"مقدار یکی از اقلام سفارش معتبر نیست");}
    const product=await c.query("select stock_available from sales_products where id=$1 and tenant_id=$2 for update",[item.product_id,t.id]);
    if(!product.rowCount||num(product.rows[0].stock_available)<quantity){await c.query("rollback");return deny(res,409,"موجودی کافی نیست");}
    await c.query("update sales_products set stock_available=stock_available-$1,updated_at=now() where id=$2 and tenant_id=$3",[quantity,item.product_id,t.id]);
    await c.query("update sales_order_items set reserved_qty=quantity where id=$1",[item.id]);
   }
  }
  if(to==="cancelled"&&["confirmed","reserved","delivering"].includes(old.status)){
   if(["reserved","delivering"].includes(old.status)){
    const items=await c.query("select product_id,reserved_qty from sales_order_items where order_id=$1 for update",[old.id]);
    for(const item of items.rows){
     const reserved=num(item.reserved_qty);
     if(reserved>0)await c.query("update sales_products set stock_available=stock_available+$1,updated_at=now() where id=$2 and tenant_id=$3",[reserved,item.product_id,t.id]);
     await c.query("update sales_order_items set reserved_qty=0 where order_id=$1 and product_id=$2",[old.id,item.product_id]);
    }
   }
   await c.query("update sales_partners set credit_used=greatest(0,credit_used-$1),updated_at=now() where id=$2 and tenant_id=$3",[num(old.total),old.partner_id,t.id]);
  }
  const updated=await c.query("update sales_orders set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[to,old.id,t.id]);
  if(!updated.rowCount){await c.query("rollback");return deny(res,409,"سفارش در این فاصله تغییر کرده است");}
  await c.query("insert into sales_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,reason,actor_user_id) values($1,'order',$2,$3,$4,'status_change',$5,$6)",[t.id,old.id,old.status,to,reason,(req as any).user.id]);
  await c.query("commit");
  res.json(updated.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/sales/invoices",requireAuth,requirePermission("modules:22-sales-revenue:invoice"),async(req,res)=>{
 const t=await tenantOf(req),b=req.body||{};
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 if(!b.orderId)return deny(res,400,"سفارش فروش الزامی است");
 const no=String(b.invoiceNo||"INV-"+Date.now()).trim();
 if(!no||no.length>100)return deny(res,400,"شماره فاکتور معتبر نیست");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const order=await c.query("select * from sales_orders where id=$1 and tenant_id=$2 for update",[b.orderId,t.id]);
  if(!order.rowCount){await c.query("rollback");return deny(res,404,"سفارش فروش پیدا نشد");}
  const x=order.rows[0];
  if(x.status!=="delivered"){await c.query("rollback");return deny(res,409,"فقط سفارش تحویل‌شده و فاکتور‌نشده قابل صدور فاکتور است");}
  const existing=await c.query("select id from sales_invoices where tenant_id=$1 and order_id=$2 limit 1",[t.id,x.id]);
  if(existing.rowCount){await c.query("rollback");return deny(res,409,"برای این سفارش قبلاً فاکتور صادر شده است");}
  const i=await c.query("insert into sales_invoices(tenant_id,invoice_no,order_id,partner_id,status,due_date,subtotal,discount_total,tax_total,total,created_by) values($1,$2,$3,$4,'issued',$5,$6,$7,$8,$9,$10) returning *",[t.id,no,x.id,x.partner_id,x.due_date,x.subtotal,x.discount_total,x.tax_total,x.total,(req as any).user.id]);
  const changed=await c.query("update sales_orders set status='invoiced',updated_at=now() where id=$1 and tenant_id=$2 and status='delivered' returning id",[x.id,t.id]);
  if(!changed.rowCount){await c.query("rollback");return deny(res,409,"سفارش هنگام صدور فاکتور تغییر کرده است");}
  await c.query("insert into sales_financial_events(tenant_id,source_type,source_id,event_type,amount,state,reference_no) values($1,'invoice',$2,'invoice_issued',$3,'pending_accounting',$4)",[t.id,i.rows[0].id,x.total,no]);
  await c.query("insert into sales_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id) values($1,'invoice',$2,null,'issued','create',$3)",[t.id,i.rows[0].id,(req as any).user.id]);
  await c.query("commit");res.status(201).json(i.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/sales/invoices/:id/payments",requireAuth,requirePermission("modules:22-sales-revenue:payment"),async(req,res)=>{
 const t=await tenantOf(req),amount=num(req.body?.amount),method=String(req.body?.method||"bank");
 if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 if(!Number.isFinite(amount)||amount<=0||!["cash","bank","card","wallet","credit"].includes(method))return deny(res,400,"مبلغ یا روش دریافت معتبر نیست");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const i=await c.query("select * from sales_invoices where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!i.rowCount){await c.query("rollback");return deny(res,404,"فاکتور پیدا نشد");}
  const inv=i.rows[0],paidBefore=num(inv.paid_total),total=num(inv.total);
  if(!Number.isFinite(paidBefore)||!Number.isFinite(total)||!["issued","final","partially_paid"].includes(inv.status)||paidBefore+amount>total+0.000001){await c.query("rollback");return deny(res,400,"مبلغ دریافت از مانده فاکتور بیشتر است یا فاکتور قابل دریافت نیست");}
  const p=await c.query("insert into sales_payments(tenant_id,invoice_id,amount,method,reference_no,created_by) values($1,$2,$3,$4,$5,$6) returning *",[t.id,inv.id,amount,method,req.body?.referenceNo||null,(req as any).user.id]);
  const paid=paidBefore+amount,next=paid+0.000001>=total?"paid":"partially_paid";
  const updated=await c.query("update sales_invoices set paid_total=$1,status=$2,updated_at=now() where id=$3 and tenant_id=$4 returning id",[paid,next,inv.id,t.id]);
  if(!updated.rowCount){await c.query("rollback");return deny(res,409,"فاکتور هنگام ثبت دریافت تغییر کرده است");}
  await c.query("insert into sales_financial_events(tenant_id,source_type,source_id,event_type,amount,state,reference_no) values($1,'payment',$2,'customer_receipt',$3,'pending_accounting',$4)",[t.id,p.rows[0].id,amount,req.body?.referenceNo||null]);
  await c.query("commit");res.status(201).json(p.rows[0]);
 }catch(error){await c.query("rollback");throw error;}finally{c.release();}
});
router.post("/api/sales/returns",requireAuth,requirePermission("modules:22-sales-revenue:return"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};if(!b.invoiceId||num(b.amount)<=0)return deny(res,400,"فاکتور و مبلغ برگشت الزامی است");const inv=await query("select * from sales_invoices where id=$1 and tenant_id=$2",[b.invoiceId,t.id]);if(!inv.rowCount)return deny(res,404,"فاکتور پیدا نشد");const no=b.returnNo||"RET-"+Date.now();const r=await query("insert into sales_returns(tenant_id,return_no,invoice_id,amount,reason,created_by) values($1,$2,$3,$4,$5,$6) returning *",[t.id,no,b.invoiceId,num(b.amount),b.reason||"", (req as any).user.id]);res.status(201).json(r.rows[0]);
});
router.patch("/api/sales/returns/:id/status",requireAuth,requirePermission("modules:22-sales-revenue:return"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const r=await query("select * from sales_returns where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!r.rowCount)return deny(res,404,"برگشت پیدا نشد");const old=r.rows[0],to=String(req.body?.status||""),flow:Record<string,string[]>={requested:["approved","rejected","cancelled"],approved:["received","rejected"],received:["inspected"],inspected:["refunded","rejected"],refunded:[],rejected:[],cancelled:[]};if(!flow[old.status]?.includes(to))return deny(res,409,"تغییر وضعیت برگشت مجاز نیست");await query("update sales_returns set status=$1 where id=$2",[to,old.id]);await event(t.id,"return",old.id,old.status,to,"status_change",req.body?.reason||null,(req as any).user.id);res.json({...old,status:to});
});
router.post("/api/sales/targets",requireAuth,requirePermission("modules:22-sales-revenue:write"),async(req,res)=>{const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};const r=await query("insert into sales_targets(tenant_id,name,period_start,period_end,target_amount) values($1,$2,$3,$4,$5) returning *",[t.id,b.name,b.periodStart,b.periodEnd,num(b.targetAmount)]);res.status(201).json(r.rows[0])});
export {router as salesRouter};