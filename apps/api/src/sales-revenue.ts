import {Router,type Request,type Response} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";
const router=Router();
const tenantOf=async(req:Request)=>resolveTenant(req,(req as any).user);
const deny=(res:Response,s:number,e:string)=>res.status(s).json({error:e});
const nextStatus:Record<string,string[]>={
 draft:["pending_credit","confirmed","cancelled"],pending_credit:["confirmed","cancelled"],
 confirmed:["reserved","cancelled"],reserved:["delivering","cancelled"],delivering:["delivered","cancelled"],
 delivered:["invoiced","returned"],invoiced:["returned"],returned:[],cancelled:[]
};
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
router.post("/api/sales/orders",requireAuth,requirePermission("modules:22-sales-revenue:write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{},items=Array.isArray(b.items)?b.items:[];if(!b.partnerId||!items.length)return deny(res,400,"مشتری و اقلام سفارش الزامی است");
 const ids=items.map(x=>x.productId);const ps=await query("select * from sales_products where tenant_id=$1 and id=any($2::uuid[])",[t.id,ids]);
 if(ps.rowCount!==ids.length)return deny(res,400,"یکی از کالاها متعلق به سازمان نیست");
 const map=new Map(ps.rows.map(x=>[x.id,x]));const normalized=items.map(x=>({productId:x.productId,quantity:num(x.quantity),unitPrice:num(x.unitPrice||map.get(x.productId).sale_price),discountRate:num(x.discountRate||map.get(x.productId).discount_rate),taxRate:num(x.taxRate||map.get(x.productId).tax_rate)}));
 if(normalized.some(x=>x.quantity<=0))return deny(res,400,"مقدار کالا نامعتبر است");const tt=totals(normalized);const orderNo=b.orderNo||"SO-"+Date.now();
 const c=await pool.connect();try{await c.query("begin");const o=await c.query("insert into sales_orders(tenant_id,order_no,partner_id,due_date,subtotal,discount_total,tax_total,total,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,orderNo,b.partnerId,b.dueDate||null,tt.subtotal,tt.discountTotal,tt.taxTotal,tt.total,b.notes||"",(req as any).user.id]);for(const x of normalized)await c.query("insert into sales_order_items(order_id,product_id,quantity,unit_price,discount_rate,tax_rate,line_total) values($1,$2,$3,$4,$5,$6,$7)",[o.rows[0].id,x.productId,x.quantity,x.unitPrice,x.discountRate,x.taxRate,x.quantity*x.unitPrice*(1-x.discountRate/100)*(1+x.taxRate/100)]);await c.query("insert into sales_events(tenant_id,entity_type,entity_id,to_status,event_type,actor_user_id) values($1,'order',$2,'draft','create',$3)",[t.id,o.rows[0].id,(req as any).user.id]);await c.query("commit");res.status(201).json(o.rows[0])}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
router.patch("/api/sales/orders/:id/status",requireAuth,requirePermission("modules:22-sales-revenue:approve"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const r=await query("select * from sales_orders where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!r.rowCount)return deny(res,404,"سفارش پیدا نشد");const old=r.rows[0],to=String(req.body?.status||"");if(!nextStatus[old.status]?.includes(to))return deny(res,409,"تغییر وضعیت سفارش مجاز نیست");
 const c=await pool.connect();try{await c.query("begin");if(to==="reserved"){const it=await c.query("select * from sales_order_items where order_id=$1 for update",[old.id]);for(const x of it.rows){const p=await c.query("select stock_available from sales_products where id=$1 and tenant_id=$2 for update",[x.product_id,t.id]);if(!p.rowCount||num(p.rows[0].stock_available)<num(x.quantity))return deny(res,409,"موجودی کافی نیست");await c.query("update sales_products set stock_available=stock_available-$1,updated_at=now() where id=$2",[x.quantity,x.product_id]);await c.query("update sales_order_items set reserved_qty=quantity where id=$1",[x.id]);}}
 const u=await c.query("update sales_orders set status=$1,updated_at=now() where id=$2 returning *",[to,old.id]);await c.query("insert into sales_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id) values($1,'order',$2,$3,$4,'status_change',$5)",[t.id,old.id,old.status,to,(req as any).user.id]);await c.query("commit");res.json(u.rows[0])}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
router.post("/api/sales/invoices",requireAuth,requirePermission("modules:22-sales-revenue:invoice"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};const o=await query("select * from sales_orders where id=$1 and tenant_id=$2",[b.orderId,t.id]);if(!o.rowCount||!["delivered","invoiced"].includes(o.rows[0].status))return deny(res,409,"سفارش هنوز قابل صدور فاکتور نیست");
 const x=o.rows[0],no=b.invoiceNo||"INV-"+Date.now();const c=await pool.connect();try{await c.query("begin");const i=await c.query("insert into sales_invoices(tenant_id,invoice_no,order_id,partner_id,status,due_date,subtotal,discount_total,tax_total,total,created_by) values($1,$2,$3,$4,'issued',$5,$6,$7,$8,$9,$10) returning *",[t.id,no,x.id,x.partner_id,x.due_date,x.subtotal,x.discount_total,x.tax_total,x.total,(req as any).user.id]);await c.query("update sales_orders set status='invoiced',updated_at=now() where id=$1",[x.id]);await c.query("insert into sales_financial_events(tenant_id,source_type,source_id,event_type,amount,state,reference_no) values($1,'invoice',$2,'invoice_issued',$3,'pending_accounting',$4)",[t.id,i.rows[0].id,x.total,no]);await c.query("insert into sales_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id) values($1,'invoice',$2,null,'issued','create',$3)",[t.id,i.rows[0].id,(req as any).user.id]);await c.query("commit");res.status(201).json(i.rows[0])}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
router.post("/api/sales/invoices/:id/payments",requireAuth,requirePermission("modules:22-sales-revenue:payment"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const c=await pool.connect();try{await c.query("begin");const i=await c.query("select * from sales_invoices where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);if(!i.rowCount)return deny(res,404,"فاکتور پیدا نشد");const inv=i.rows[0],amount=num(req.body?.amount);if(amount<=0||num(inv.paid_total)+amount>num(inv.total))return deny(res,400,"مبلغ دریافت نامعتبر است");const p=await c.query("insert into sales_payments(tenant_id,invoice_id,amount,method,reference_no,created_by) values($1,$2,$3,$4,$5,$6) returning *",[t.id,inv.id,amount,req.body?.method||"bank",req.body?.referenceNo||null,(req as any).user.id]);const paid=num(inv.paid_total)+amount;await c.query("update sales_invoices set paid_total=$1,status=$2,updated_at=now() where id=$3",[paid,paid>=num(inv.total)?"paid":"partially_paid",inv.id]);await c.query("insert into sales_financial_events(tenant_id,source_type,source_id,event_type,amount,state,reference_no) values($1,'payment',$2,'customer_receipt',$3,'pending_accounting',$4)",[t.id,p.rows[0].id,amount,req.body?.referenceNo||null]);await c.query("commit");res.status(201).json(p.rows[0])}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
router.post("/api/sales/returns",requireAuth,requirePermission("modules:22-sales-revenue:return"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};if(!b.invoiceId||num(b.amount)<=0)return deny(res,400,"فاکتور و مبلغ برگشت الزامی است");const inv=await query("select * from sales_invoices where id=$1 and tenant_id=$2",[b.invoiceId,t.id]);if(!inv.rowCount)return deny(res,404,"فاکتور پیدا نشد");const no=b.returnNo||"RET-"+Date.now();const r=await query("insert into sales_returns(tenant_id,return_no,invoice_id,amount,reason,created_by) values($1,$2,$3,$4,$5,$6) returning *",[t.id,no,b.invoiceId,num(b.amount),b.reason||"", (req as any).user.id]);res.status(201).json(r.rows[0]);
});
router.post("/api/sales/targets",requireAuth,requirePermission("modules:22-sales-revenue:write"),async(req,res)=>{const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};const r=await query("insert into sales_targets(tenant_id,name,period_start,period_end,target_amount) values($1,$2,$3,$4,$5) returning *",[t.id,b.name,b.periodStart,b.periodEnd,num(b.targetAmount)]);res.status(201).json(r.rows[0])});
export {router as salesRouter};