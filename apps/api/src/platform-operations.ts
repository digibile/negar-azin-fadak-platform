import {Router} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
export const platformOperationsRouter=Router();
type User={id:string;role:string}; type Ctx={id:string;name:string;code:string};
async function ctx(req:any,user:User):Promise<Ctx|null>{
 const requested=typeof req.headers["x-tenant-id"]==="string"?req.headers["x-tenant-id"].trim():"";
 const r=user.role==="admin"
  ?(requested?await query("select id,name,code from tenants where id=$1 and status='active'",[requested]):await query("select id,name,code from tenants where status='active' order by created_at limit 1"))
  :(requested?await query("select t.id,t.name,t.code from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 and ut.tenant_id=$2 and t.status='active'",[user.id,requested]):await query("select t.id,t.name,t.code from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 and t.status='active' order by ut.is_default desc,t.created_at limit 1",[user.id]));
 return r.rowCount?r.rows[0]:null;
}
const s=(v:unknown,max=200)=>typeof v==="string"?v.trim().slice(0,max):"";
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null};
async function audit(c:Ctx,u:User,action:string,type:string,id:string|null,after:any,before:any=null){await query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data,before_data) values($1,$2,$3,$4,$5,$6,$7)",[c.id,u.id,action,type,id,after,before]);}

platformOperationsRouter.get("/api/platform/context",requireAuth,asyncHandler(async(req,res)=>{
 const u=(req as any).user as User,c=await ctx(req,u); if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const [companies,brands,branches,stores]=await Promise.all([
  query("select id,code,name,status from companies where tenant_id=$1 and status='active' order by name",[c.id]),
  query("select id,code,name,status,company_id from brands where tenant_id=$1 and status='active' order by name",[c.id]),
  query("select id,code,name,status,company_id,brand_id from branches where tenant_id=$1 and status='active' order by name",[c.id]),
  query("select id,code,name,slug,status,seller_id,brand_id,branch_id from stores where tenant_id=$1 and status='active' order by name",[c.id])]);
 res.json({current:c,companies:companies.rows,brands:brands.rows,branches:branches.rows,stores:stores.rows});
}));
platformOperationsRouter.put("/api/platform/context/default",requireAuth,asyncHandler(async(req,res)=>{
 const u=(req as any).user as User,c=await ctx(req,u); if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 await query("update user_tenants set is_default=false where user_id=$1",[u.id]);
 await query("insert into user_tenants(user_id,tenant_id,is_default) values($1,$2,true) on conflict(user_id,tenant_id) do update set is_default=true",[u.id,c.id]);
 res.json({current:c});
}));
platformOperationsRouter.get("/api/platform/search",requireAuth,asyncHandler(async(req,res)=>{
 const c=await ctx(req,(req as any).user);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const q=s(req.query.q,120);if(!q)return res.json({items:[]});const like="%"+q+"%";
 const [p,sl,st,o]=await Promise.all([
  query("select id,'product' type,title,sku code from products where tenant_id=$1 and (title ilike $2 or sku ilike $2) order by updated_at desc limit 10",[c.id,like]),
  query("select id,'seller' type,display_name title,null code from sellers where tenant_id=$1 and display_name ilike $2 limit 10",[c.id,like]),
  query("select id,'store' type,name title,slug code from stores where tenant_id=$1 and name ilike $2 limit 10",[c.id,like]),
  query("select id,'order' type,order_no title,customer_ref code from marketplace_orders where tenant_id=$1 and order_no ilike $2 limit 10",[c.id,like])]);
 res.json({items:[...p.rows,...sl.rows,...st.rows,...o.rows]});
}));
platformOperationsRouter.get("/api/marketplace/inventory",requireAuth,requirePermission("inventory:view"),asyncHandler(async(req,res)=>{
 const c=await ctx(req,(req as any).user);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select pi.id,pi.product_id,pi.store_id,p.sku,p.title,pi.quantity,pi.reserved_quantity,(pi.quantity-pi.reserved_quantity) available from product_inventory pi join products p on p.id=pi.product_id where pi.tenant_id=$1 order by p.title",[c.id]);res.json({items:r.rows,total:r.rowCount});
}));
platformOperationsRouter.post("/api/marketplace/inventory/movements",requireAuth,requirePermission("inventory:manage"),asyncHandler(async(req,res)=>{
 const u=(req as any).user as User,c=await ctx(req,u);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const productId=s(req.body?.productId,100),storeId=s(req.body?.storeId,100)||null,type=s(req.body?.movementType,30),qty=n(req.body?.quantity);
 if(!productId||!type||qty===null||qty===0)return res.status(400).json({error:"حرکت موجودی نامعتبر است"});
 const client=await pool.connect();
 try{await client.query("begin");
  const p=await client.query("select id from products where id=$1 and tenant_id=$2",[productId,c.id]);if(!p.rowCount)throw Object.assign(new Error("محصول در این محدوده پیدا نشد"),{status:404});
  const inv=await client.query("select id,quantity from product_inventory where tenant_id=$1 and product_id=$2 and store_id is not distinct from $3 for update",[c.id,productId,storeId]);
  const next=(inv.rowCount?Number(inv.rows[0].quantity):0)+Number(qty);if(next<0)throw Object.assign(new Error("موجودی نمی‌تواند منفی شود"),{status:409});
  if(inv.rowCount)await client.query("update product_inventory set quantity=$1,updated_at=now() where id=$2",[next,inv.rows[0].id]);
  else await client.query("insert into product_inventory(tenant_id,product_id,store_id,quantity) values($1,$2,$3,$4)",[c.id,productId,storeId,next]);
  const m=await client.query("insert into inventory_movements(tenant_id,product_id,store_id,movement_type,quantity,note,created_by) values($1,$2,$3,$4,$5,$6,$7) returning *",[c.id,productId,storeId,type,qty,s(req.body?.note,500)||null,u.id]);
  await client.query("commit");await audit(c,u,"inventory.movement","inventory_movement",m.rows[0].id,m.rows[0]);res.status(201).json(m.rows[0]);
 }catch(e){await client.query("rollback");throw e}finally{client.release()}
}));
platformOperationsRouter.post("/api/marketplace/cart",requireAuth,requirePermission("cart:manage"),asyncHandler(async(req,res)=>{
 const c=await ctx(req,(req as any).user);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const customer=s(req.body?.customerRef,200),storeId=s(req.body?.storeId,100);if(!customer||!storeId)return res.status(400).json({error:"مشتری و فروشگاه الزامی است"});
 const own=await query("select id from stores where id=$1 and tenant_id=$2 and status='active'",[storeId,c.id]);if(!own.rowCount)return res.status(404).json({error:"فروشگاه پیدا نشد"});
 const r=await query("insert into cart_sessions(tenant_id,customer_ref,store_id) values($1,$2,$3) returning *",[c.id,customer,storeId]);res.status(201).json(r.rows[0]);
}));
platformOperationsRouter.post("/api/marketplace/cart/:id/items",requireAuth,requirePermission("cart:manage"),asyncHandler(async(req,res)=>{
 const c=await ctx(req,(req as any).user);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const productId=s(req.body?.productId,100),qty=n(req.body?.quantity);if(!productId||qty===null||qty<=0)return res.status(400).json({error:"قلم سبد نامعتبر است"});
 const p=await query("select id,price,store_id from products where id=$1 and tenant_id=$2 and status='active'",[productId,c.id]);
 const cart=await query("select id,store_id,status from cart_sessions where id=$1 and tenant_id=$2",[req.params.id,c.id]);if(!p.rowCount||!cart.rowCount)return res.status(404).json({error:"سبد یا محصول پیدا نشد"});
 if(cart.rows[0].status!=="open")return res.status(409).json({error:"سبد بسته شده است"});if(p.rows[0].store_id&&p.rows[0].store_id!==cart.rows[0].store_id)return res.status(409).json({error:"محصول متعلق به این فروشگاه نیست"});
 const r=await query("insert into cart_items(cart_id,product_id,quantity,unit_price) values($1,$2,$3,$4) on conflict(cart_id,product_id) do update set quantity=excluded.quantity,unit_price=excluded.unit_price returning *",[req.params.id,productId,qty,p.rows[0].price]);res.status(201).json(r.rows[0]);
}));
platformOperationsRouter.post("/api/marketplace/cart/:id/checkout",requireAuth,requirePermission("checkout:manage"),asyncHandler(async(req,res)=>{
 const u=(req as any).user as User,c=await ctx(req,u);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{await client.query("begin");
  const cart=await client.query("select * from cart_sessions where id=$1 and tenant_id=$2 and status='open' for update",[req.params.id,c.id]);if(!cart.rowCount)throw Object.assign(new Error("سبد فعال پیدا نشد"),{status:404});
  const items=await client.query("select ci.product_id,ci.quantity,ci.unit_price,p.seller_id,p.store_id from cart_items ci join products p on p.id=ci.product_id where ci.cart_id=$1",[req.params.id]);if(!items.rowCount)throw Object.assign(new Error("سبد خالی است"),{status:409});
  const groups=new Map<string,any>();for(const x of items.rows){const key=x.seller_id+"|"+x.store_id;const g=groups.get(key)||{sellerId:x.seller_id,storeId:x.store_id,subtotal:0,items:[]};g.subtotal+=Number(x.quantity)*Number(x.unit_price);g.items.push(x);groups.set(key,g)}
  const created:any[]=[];for(const g of groups.values()){
   const seller=await client.query("select commission_rate from sellers where id=$1 and tenant_id=$2",[g.sellerId,c.id]);const rate=Number(seller.rows[0]?.commission_rate||0),commission=Number((g.subtotal*rate/100).toFixed(2)),payable=g.subtotal-commission;
   const orderNo="ORD-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,7).toUpperCase();
   const o=await client.query("insert into marketplace_orders(tenant_id,store_id,seller_id,order_no,customer_ref,subtotal,total_amount,commission_amount,seller_payable,payment_method) values($1,$2,$3,$4,$5,$6,$6,$7,$8,$9) returning *",[c.id,g.storeId,g.sellerId,orderNo,cart.rows[0].customer_ref,g.subtotal,commission,payable,s(req.body?.paymentMethod,50)||"pending"]);
   for(const item of g.items){
    const inv=await client.query("select id,quantity,reserved_quantity from product_inventory where tenant_id=$1 and product_id=$2 and store_id is not distinct from $3 for update",[c.id,item.product_id,g.storeId]);
    if(!inv.rowCount||Number(inv.rows[0].quantity)-Number(inv.rows[0].reserved_quantity)<Number(item.quantity))throw Object.assign(new Error("موجودی کافی نیست"),{status:409});
    await client.query("update product_inventory set reserved_quantity=reserved_quantity+$1,updated_at=now() where id=$2",[item.quantity,inv.rows[0].id]);
    await client.query("insert into marketplace_order_items(order_id,product_id,quantity,unit_price,line_total) values($1,$2,$3,$4,$5)",[o.rows[0].id,item.product_id,item.quantity,item.unit_price,Number(item.quantity)*Number(item.unit_price)]);
  }
   created.push(o.rows[0]);
  }
  await client.query("update cart_sessions set status='checked_out',updated_at=now() where id=$1",[req.params.id]);await client.query("commit");await audit(c,u,"commerce.checkout","cart",String(req.params.id),{orders:created.map(x=>x.id)});res.status(201).json({orders:created});
 }catch(e){await client.query("rollback");throw e}finally{client.release()}
}));
const transitions:any={pending:["confirmed","cancelled"],confirmed:["paid","cancelled"],paid:["processing","refunded"],processing:["shipped","cancelled"],shipped:["delivered","returned"],delivered:["returned"],returned:["refunded"],cancelled:[],refunded:[]};
platformOperationsRouter.patch("/api/marketplace/orders/:id/status",requireAuth,requirePermission("order:manage"),asyncHandler(async(req,res)=>{
 const u=(req as any).user as User,c=await ctx(req,u);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const next=s(req.body?.status,30),r=await query("select * from marketplace_orders where id=$1 and tenant_id=$2",[req.params.id,c.id]);if(!r.rowCount)return res.status(404).json({error:"سفارش پیدا نشد"});
 const current=r.rows[0].status;if(!transitions[current]?.includes(next))return res.status(409).json({error:"تغییر وضعیت سفارش مجاز نیست",current,allowed:transitions[current]||[]});
 const out=await query("update marketplace_orders set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[next,req.params.id,c.id]);await audit(c,u,"order.status","marketplace_order",String(req.params.id),out.rows[0],r.rows[0]);res.json(out.rows[0]);
}));
platformOperationsRouter.get("/api/finance/ledger",requireAuth,requirePermission("ledger:view"),asyncHandler(async(req,res)=>{
 const c=await ctx(req,(req as any).user);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select e.id,e.entry_no,e.source_type,e.source_id,e.description,e.status,e.posted_at,json_agg(json_build_object('account',a.code,'name',a.name,'debit',l.debit,'credit',l.credit)) lines from ledger_entries e join ledger_lines l on l.entry_id=e.id join ledger_accounts a on a.id=l.account_id where e.tenant_id=$1 group by e.id order by e.posted_at desc",[c.id]);res.json({items:r.rows,total:r.rowCount});
}));
platformOperationsRouter.post("/api/finance/ledger/post-order/:id",requireAuth,requirePermission("ledger:manage"),asyncHandler(async(req,res)=>{
 const u=(req as any).user as User,c=await ctx(req,u);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const client=await pool.connect();
 try{await client.query("begin");
  const o=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.id,c.id]);if(!o.rowCount)throw Object.assign(new Error("سفارش پیدا نشد"),{status:404});
  const order=o.rows[0],exists=await client.query("select id from ledger_entries where tenant_id=$1 and source_type='marketplace_order' and source_id=$2",[c.id,order.id]);if(exists.rowCount){await client.query("rollback");return res.json({entryId:exists.rows[0].id,reused:true})}
  const accounts=await client.query("insert into ledger_accounts(tenant_id,code,name,account_type) values($1,'1100','مطالبات مشتریان','asset'),($1,'4100','درآمد فروش','revenue'),($1,'2100','بستانکاری فروشندگان','liability'),($1,'5100','کارمزد خدمات','revenue') on conflict(tenant_id,code) do update set name=excluded.name returning id,code");
  const byCode=new Map(accounts.rows.map((x:any)=>[x.code,x.id])),entryNo="JE-"+Date.now().toString(36).toUpperCase();
  const e=await client.query("insert into ledger_entries(tenant_id,entry_no,source_type,source_id,description,created_by) values($1,$2,'marketplace_order',$3,$4,$5) returning *",[c.id,entryNo,order.id,"ثبت مالی سفارش "+order.order_no,u.id]);
  const total=Number(order.total_amount),commission=Number(order.commission_amount),payable=Number(order.seller_payable);
  await client.query("insert into ledger_lines(entry_id,account_id,debit,credit,description) values($1,$2,$3,0,'مطالبات مشتری'),($1,$4,0,$5,'درآمد فروش'),($1,$6,0,$7,'بستانکاری فروشنده'),($1,$8,0,$9,'کارمزد خدمات')",[e.rows[0].id,byCode.get("1100"),total,byCode.get("4100"),payable,byCode.get("2100"),commission,byCode.get("5100")]);
  await client.query("commit");await audit(c,u,"ledger.post","ledger_entry",String(e.rows[0].id),e.rows[0]);res.status(201).json(e.rows[0]);
 }catch(e){await client.query("rollback");throw e}finally{client.release()}
}));
platformOperationsRouter.get("/api/platform/audit",requireAuth,requirePermission("audit:view"),asyncHandler(async(req,res)=>{
 const c=await ctx(req,(req as any).user);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const r=await query("select id,action,entity_type,entity_id,actor_user_id,created_at,after_data,before_data from platform_audit_events where tenant_id=$1 order by created_at desc limit 200",[c.id]);res.json({items:r.rows,total:r.rowCount});
}));
platformOperationsRouter.get("/api/platform/platform_notifications",requireAuth,requirePermission("notification:view"),asyncHandler(async(req,res)=>{
 const u=(req as any).user,c=await ctx(req,u);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const r=await query("select id,channel,title,body,status,created_at,read_at from platform_notifications where tenant_id=$1 and (user_id=$2 or user_id is null) order by created_at desc limit 100",[c.id,u.id]);res.json({items:r.rows,total:r.rowCount});
}));
platformOperationsRouter.get("/api/platform/rules",requireAuth,requirePermission("rule:view"),asyncHandler(async(req,res)=>{
 const c=await ctx(req,(req as any).user);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const r=await query("select * from business_rules where tenant_id=$1 order by priority,code",[c.id]);res.json({items:r.rows,total:r.rowCount});
}));
platformOperationsRouter.get("/api/platform/slas",requireAuth,requirePermission("sla:view"),asyncHandler(async(req,res)=>{
 const c=await ctx(req,(req as any).user);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const r=await query("select * from sla_policies where tenant_id=$1 order by name",[c.id]);res.json({items:r.rows,total:r.rowCount});
}));
platformOperationsRouter.get("/api/platform/calendar",requireAuth,requirePermission("calendar:view"),asyncHandler(async(req,res)=>{
 const c=await ctx(req,(req as any).user);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const r=await query("select * from calendar_definitions where tenant_id=$1 order by name",[c.id]);res.json({items:r.rows,total:r.rowCount});
}));

platformOperationsRouter.post("/api/platform/companies",requireAuth,requirePermission("company:manage"),asyncHandler(async(req,res)=>{
 const u=(req as any).user as User,c=await ctx(req,u);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const code=s(req.body?.code,80),name=s(req.body?.name,200);if(!code||!name)return res.status(400).json({error:"کد و نام شرکت الزامی است"});
 const r=await query("insert into companies(tenant_id,code,name) values($1,$2,$3) returning *",[c.id,code,name]);await audit(c,u,"company.create","company",String(r.rows[0].id),r.rows[0]);res.status(201).json(r.rows[0]);
}));
platformOperationsRouter.post("/api/platform/brands",requireAuth,requirePermission("brand:manage"),asyncHandler(async(req,res)=>{
 const u=(req as any).user as User,c=await ctx(req,u);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const code=s(req.body?.code,80),name=s(req.body?.name,200),companyId=s(req.body?.companyId,100)||null;if(!code||!name)return res.status(400).json({error:"کد و نام برند الزامی است"});
 if(companyId&&!(await query("select 1 from companies where id=$1 and tenant_id=$2",[companyId,c.id])).rowCount)return res.status(404).json({error:"شرکت پیدا نشد"});
 const r=await query("insert into brands(tenant_id,company_id,code,name) values($1,$2,$3,$4) returning *",[c.id,companyId,code,name]);await audit(c,u,"brand.create","brand",String(r.rows[0].id),r.rows[0]);res.status(201).json(r.rows[0]);
}));
platformOperationsRouter.post("/api/platform/branches",requireAuth,requirePermission("branch:manage"),asyncHandler(async(req,res)=>{
 const u=(req as any).user as User,c=await ctx(req,u);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const code=s(req.body?.code,80),name=s(req.body?.name,200),companyId=s(req.body?.companyId,100)||null,brandId=s(req.body?.brandId,100)||null;if(!code||!name)return res.status(400).json({error:"کد و نام شعبه الزامی است"});
 const r=await query("insert into branches(tenant_id,company_id,brand_id,code,name) values($1,$2,$3,$4,$5) returning *",[c.id,companyId,brandId,code,name]);await audit(c,u,"branch.create","branch",String(r.rows[0].id),r.rows[0]);res.status(201).json(r.rows[0]);
}));
platformOperationsRouter.post("/api/marketplace/settlements/generate",requireAuth,requirePermission("settlement:manage"),asyncHandler(async(req,res)=>{
 const u=(req as any).user as User,c=await ctx(req,u);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const sellerId=s(req.body?.sellerId,100),start=req.body?.periodStart,end=req.body?.periodEnd;if(!sellerId||!start||!end)return res.status(400).json({error:"فروشنده و بازه تسویه الزامی است"});
 const seller=await query("select id,display_name from sellers where id=$1 and tenant_id=$2",[sellerId,c.id]);if(!seller.rowCount)return res.status(404).json({error:"فروشنده پیدا نشد"});
 const sums=await query("select coalesce(sum(total_amount),0) gross,coalesce(sum(commission_amount),0) commission,coalesce(sum(seller_payable),0) net from marketplace_orders where tenant_id=$1 and seller_id=$2 and status in ('paid','processing','shipped','delivered') and created_at>= $3 and created_at<=$4",[c.id,sellerId,start,end]);
 const x=sums.rows[0],no="SET-"+Date.now().toString(36).toUpperCase();
 const r=await query("insert into seller_settlements(tenant_id,seller_id,settlement_no,period_start,period_end,gross_amount,commission_amount,net_amount,status) values($1,$2,$3,$4,$5,$6,$7,$8,'pending') returning *",[c.id,sellerId,no,start,end,x.gross,x.commission,x.net]);
 await audit(c,u,"settlement.generate","seller_settlement",String(r.rows[0].id),r.rows[0]);res.status(201).json(r.rows[0]);
}));
platformOperationsRouter.patch("/api/platform/notifications/:id/read",requireAuth,requirePermission("notification:view"),asyncHandler(async(req,res)=>{
 const u=(req as any).user,c=await ctx(req,u);if(!c)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update platform_notifications set status='read',read_at=now() where id=$1 and tenant_id=$2 and (user_id=$3 or user_id is null) returning *",[req.params.id,c.id,u.id]);if(!r.rowCount)return res.status(404).json({error:"اعلان پیدا نشد"});res.json(r.rows[0]);
}));
