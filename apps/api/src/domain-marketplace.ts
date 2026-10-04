import {Router} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant,resolvePublicTenant} from "./tenant-context.js";

export const domainMarketplaceRouter=Router();

type User={id:string;role:string};
type TenantContext={id:string;name:string;code:string};

async function tenantContext(req:any,user:User):Promise<TenantContext|null>{return resolveTenant(req,user);}
function bodyString(value:unknown,max=500){return typeof value==="string"?value.trim().slice(0,max):""}
function bodyNumber(value:unknown){const n=Number(value);return Number.isFinite(n)?n:null}

domainMarketplaceRouter.get("/api/tenancy/context",requireAuth,asyncHandler(async(req,res)=>{
  const user=(req as any).user as User;
  const ctx=await tenantContext(req,user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const choices=user.role==="admin"
    ?(await query("select id,name,code from tenants where status='active' order by name")).rows
    :(await query("select t.id,t.name,t.code from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 and t.status='active' order by t.name",[user.id])).rows;
  res.json({current:ctx,items:choices});
}));

domainMarketplaceRouter.get("/api/tenancy/tenants",requireAuth,requirePermission("tenant:view"),asyncHandler(async(req,res)=>{
  const user=(req as any).user as User;
  const r=user.role==="admin"
    ?await query("select id,code,name,status,created_at,updated_at from tenants order by created_at desc")
    :await query("select t.id,t.code,t.name,t.status,t.created_at,t.updated_at from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 order by t.created_at desc",[user.id]);
  res.json({items:r.rows,total:r.rowCount});
}));

domainMarketplaceRouter.post("/api/tenancy/tenants",requireAuth,requirePermission("tenant:manage"),asyncHandler(async(req,res)=>{
  const code=bodyString(req.body?.code,100),name=bodyString(req.body?.name,200);
  if(!code||!name)return res.status(400).json({error:"کد و نام مستاجر الزامی است"});
  const r=await query("insert into tenants(code,name) values($1,$2) returning *",[code,name]);
  res.status(201).json(r.rows[0]);
}));

domainMarketplaceRouter.get("/api/marketplace/sellers",requireAuth,requirePermission("seller:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select id,legal_name,display_name,status,commission_rate,created_at,updated_at from sellers where tenant_id=$1 order by created_at desc",[ctx.id]);
  res.json({tenant:ctx,items:r.rows,total:r.rowCount});
}));

domainMarketplaceRouter.post("/api/marketplace/sellers",requireAuth,requirePermission("seller:manage"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const legal=bodyString(req.body?.legalName,250),display=bodyString(req.body?.displayName,250);
  const rate=bodyNumber(req.body?.commissionRate??0);
  if(!legal||!display||rate===null||rate<0||rate>100)return res.status(400).json({error:"اطلاعات فروشنده نامعتبر است"});
  const r=await query("insert into sellers(tenant_id,legal_name,display_name,commission_rate) values($1,$2,$3,$4) returning *",[ctx.id,legal,display,rate]);
  res.status(201).json(r.rows[0]);
}));

domainMarketplaceRouter.get("/api/marketplace/stores",requireAuth,requirePermission("store:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select s.id,s.code,s.name,s.slug,s.status,s.domain,s.seller_id,sl.display_name as seller_name from stores s join sellers sl on sl.id=s.seller_id where s.tenant_id=$1 order by s.created_at desc",[ctx.id]);
  res.json({tenant:ctx,items:r.rows,total:r.rowCount});
}));

domainMarketplaceRouter.post("/api/marketplace/stores",requireAuth,requirePermission("store:manage"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const seller=bodyString(req.body?.sellerId,100),code=bodyString(req.body?.code,100),name=bodyString(req.body?.name,200),slug=bodyString(req.body?.slug,120);
  if(!seller||!code||!name||!slug)return res.status(400).json({error:"اطلاعات فروشگاه ناقص است"});
  const owned=await query("select id from sellers where id=$1 and tenant_id=$2",[seller,ctx.id]);
  if(!owned.rowCount)return res.status(404).json({error:"فروشنده در این محدوده پیدا نشد"});
  const r=await query("insert into stores(tenant_id,seller_id,code,name,slug) values($1,$2,$3,$4,$5) returning *",[ctx.id,seller,code,name,slug]);
  res.status(201).json(r.rows[0]);
}));

domainMarketplaceRouter.get("/api/marketplace/products",requireAuth,requirePermission("product:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const q=bodyString(req.query.q,150);
  const params:any[]=[ctx.id];
  let where="p.tenant_id=$1";
  if(q){params.push("%"+q+"%");where+=" and (p.title ilike $2 or p.sku ilike $2)";}
  const r=await query("select p.id,p.sku,p.title,p.description,p.category,p.price,p.currency,p.status,p.seller_id,p.store_id,sl.display_name as seller_name from products p join sellers sl on sl.id=p.seller_id where "+where+" order by p.updated_at desc",params);
  res.json({tenant:ctx,items:r.rows,total:r.rowCount});
}));

domainMarketplaceRouter.post("/api/marketplace/products",requireAuth,requirePermission("product:manage"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const seller=bodyString(req.body?.sellerId,100),sku=bodyString(req.body?.sku,120),title=bodyString(req.body?.title,250);
  const price=bodyNumber(req.body?.price);
  if(!seller||!sku||!title||price===null||price<0)return res.status(400).json({error:"اطلاعات محصول نامعتبر است"});
  const owned=await query("select id from sellers where id=$1 and tenant_id=$2",[seller,ctx.id]);
  if(!owned.rowCount)return res.status(404).json({error:"فروشنده در این محدوده پیدا نشد"});
  const r=await query("insert into products(tenant_id,seller_id,store_id,sku,title,description,category,price,currency,status,attributes) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10) returning *",[ctx.id,seller,bodyString(req.body?.storeId,100)||null,sku,title,bodyString(req.body?.description,2000)||null,bodyString(req.body?.category,200)||null,price,bodyString(req.body?.currency,10)||"IRR",req.body?.attributes&&typeof req.body.attributes==="object"?req.body.attributes:{}]);
  res.status(201).json(r.rows[0]);
}));

domainMarketplaceRouter.get("/api/marketplace/orders",requireAuth,requirePermission("order:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select id,order_no,store_id,seller_id,customer_ref,status,currency,subtotal,discount_amount,shipping_amount,total_amount,commission_amount,seller_payable,payment_method,delivery_due_at,created_at,updated_at from marketplace_orders where tenant_id=$1 order by created_at desc",[ctx.id]);
  res.json({tenant:ctx,items:r.rows,total:r.rowCount});
}));

domainMarketplaceRouter.post("/api/marketplace/orders",requireAuth,requirePermission("order:manage"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const storeId=bodyString(req.body?.storeId,100),sellerId=bodyString(req.body?.sellerId,100),orderNo=bodyString(req.body?.orderNo,100);
  const subtotal=bodyNumber(req.body?.subtotal);
  if(!storeId||!sellerId||!orderNo||subtotal===null||subtotal<0)return res.status(400).json({error:"اطلاعات سفارش نامعتبر است"});
  const ownership=await query("select 1 from stores where id=$1 and tenant_id=$2 and seller_id=$3",[storeId,ctx.id,sellerId]);
  if(!ownership.rowCount)return res.status(404).json({error:"فروشگاه متعلق به این محدوده یا فروشنده نیست"});
  const discount=bodyNumber(req.body?.discountAmount??0)??0;
  const shipping=bodyNumber(req.body?.shippingAmount??0)??0;
  const total=Math.max(0,subtotal-discount+shipping);
  const seller=await query("select commission_rate from sellers where id=$1 and tenant_id=$2",[sellerId,ctx.id]);
  if(!seller.rowCount)return res.status(404).json({error:"فروشنده پیدا نشد"});
  const commission=Number((total*Number(seller.rows[0].commission_rate)/100).toFixed(2));
  const payable=Math.max(0,total-commission);
  const r=await query("insert into marketplace_orders(tenant_id,store_id,seller_id,order_no,customer_ref,subtotal,discount_amount,shipping_amount,total_amount,commission_amount,seller_payable,payment_method,delivery_due_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *",[ctx.id,storeId,sellerId,orderNo,bodyString(req.body?.customerRef,200)||null,subtotal,discount,shipping,total,commission,payable,bodyString(req.body?.paymentMethod,50)||null,req.body?.deliveryDueAt||null]);
  res.status(201).json(r.rows[0]);
}));

domainMarketplaceRouter.patch("/api/marketplace/orders/:id/status",requireAuth,requirePermission("order:lifecycle"),asyncHandler(async(req,res)=>{
 const ctx=await tenantContext(req,(req as any).user);
 if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const next=bodyString(req.body?.status,30);
 const reason=bodyString(req.body?.reason,500)||null;
 const allowed:Record<string,string[]>={
  pending:["confirmed","cancelled"],
  confirmed:["paid","cancelled"],
  paid:["processing","refunded"],
  processing:["shipped","returned"],
  shipped:["delivered","returned"],
  delivered:["returned","refunded"],
  returned:["refunded"],
  cancelled:[],
  refunded:[]
 };
 const client=await pool.connect();
 try{
  await client.query("begin");
  const current=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.id,ctx.id]);
  if(!current.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش پیدا نشد"});}
  const order=current.rows[0];
  if(!allowed[order.status]?.includes(next)){
   await client.query("rollback");
   return res.status(409).json({error:"تغییر وضعیت سفارش مجاز نیست",from:order.status,to:next});
  }
  if(next==="cancelled"&&["paid","processing"].includes(order.status)){
   await client.query("rollback");
   return res.status(409).json({error:"لغو سفارش پرداخت‌شده باید از مسیر بازپرداخت انجام شود"});
  }
  const nowColumn:Record<string,string>={
   confirmed:"confirmed_at",paid:"paid_at",processing:"processing_at",
   shipped:"shipped_at",delivered:"delivered_at",cancelled:"cancelled_at"
  };
  const column=nowColumn[next];
  const set=column
   ? `status=$1,updated_at=now(),${column}=now()${next==="cancelled"?",cancellation_reason=$2":""}`
   : "status=$1,updated_at=now()";
  const params=next==="cancelled"?[next,reason,order.id,ctx.id]:[next,order.id,ctx.id];
  const sql=next==="cancelled"
   ? `update marketplace_orders set ${set} where id=$3 and tenant_id=$4 returning *`
   : `update marketplace_orders set ${set} where id=$2 and tenant_id=$3 returning *`;
  const updated=await client.query(sql,params);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,$3,'marketplace_order',$4,$5,$6)",[
   ctx.id,(req as any).user.id,"order.status."+next,order.id,JSON.stringify({status:order.status}),JSON.stringify({status:next})
  ]);
  if(next==="processing"){
   await client.query(
    `insert into sla_cases(tenant_id,subject_type,subject_id,status,due_at,metadata)
     values($1,'marketplace_order',$2,'open',$3,$4)
     on conflict do nothing`,
    [ctx.id,order.id,order.delivery_due_at,JSON.stringify({stage:"processing",orderNo:order.order_no})]
   );
  }
  await client.query("commit");
  const eventMap:Record<string,string>={
   confirmed:"order.confirmed",paid:"payment.paid",processing:"order.processing",
   shipped:"order.shipped",delivered:"order.delivered",cancelled:"order.cancelled",
   returned:"order.returned",refunded:"order.refunded"
  };
  const eventKey=eventMap[next];
  if(eventKey)await emitBusinessEvent({
   tenantId:ctx.id,eventKey,subjectType:"marketplace_order",subjectId:order.id,
   userId:(req as any).user.id,input:{orderId:order.id,orderNo:order.order_no,status:next,previousStatus:order.status}
  });
  res.json({order:updated.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

domainMarketplaceRouter.get("/api/marketplace/settlements",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select id,settlement_no,seller_id,period_start,period_end,gross_amount,commission_amount,adjustment_amount,net_amount,status,created_at,updated_at from seller_settlements where tenant_id=$1 order by created_at desc",[ctx.id]);
  res.json({tenant:ctx,items:r.rows,total:r.rowCount});
}));


domainMarketplaceRouter.get("/api/public/marketplace",asyncHandler(async(req,res)=>{
  const code=typeof req.query.tenant==="string"?req.query.tenant.trim():"";
  const tenant=await resolvePublicTenant(req,code);
  if(!tenant)return res.status(404).json({error:"بازارگاه فعال پیدا نشد"});
  const tenantId=tenant.id;
  const [stores,products]=await Promise.all([
    query("select s.id,s.name,s.slug,s.domain,s.seller_id,sl.display_name as seller_name from stores s join sellers sl on sl.id=s.seller_id where s.tenant_id=$1 and s.status='active' order by s.name",[tenantId]),
    query("select p.id,p.sku,p.title,p.description,p.category,p.price,p.currency,p.store_id,p.seller_id,sl.display_name as seller_name from products p join sellers sl on sl.id=p.seller_id where p.tenant_id=$1 and p.status='active' order by p.updated_at desc",[tenantId])
  ]);
  res.json({tenant,stores:stores.rows,products:products.rows});
}));

domainMarketplaceRouter.patch("/api/marketplace/sellers/:id/status",requireAuth,requirePermission("seller:manage"),asyncHandler(async(req,res)=>{
 const ctx=await tenantContext(req,(req as any).user);if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=bodyString(req.body?.status,20);if(!["pending","active","suspended","closed"].includes(status))return res.status(400).json({error:"وضعیت فروشنده نامعتبر است"});
 const r=await query("update sellers set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[status,req.params.id,ctx.id]);if(!r.rowCount)return res.status(404).json({error:"فروشنده پیدا نشد"});res.json(r.rows[0]);
}));
domainMarketplaceRouter.patch("/api/marketplace/stores/:id/status",requireAuth,requirePermission("store:manage"),asyncHandler(async(req,res)=>{
 const ctx=await tenantContext(req,(req as any).user);if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=bodyString(req.body?.status,20);if(!["draft","active","suspended","closed"].includes(status))return res.status(400).json({error:"وضعیت فروشگاه نامعتبر است"});
 const r=await query("update stores set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[status,req.params.id,ctx.id]);if(!r.rowCount)return res.status(404).json({error:"فروشگاه پیدا نشد"});res.json(r.rows[0]);
}));
domainMarketplaceRouter.patch("/api/marketplace/products/:id/status",requireAuth,requirePermission("product:manage"),asyncHandler(async(req,res)=>{
 const ctx=await tenantContext(req,(req as any).user);if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=bodyString(req.body?.status,20);if(!["draft","active","archived"].includes(status))return res.status(400).json({error:"وضعیت محصول نامعتبر است"});
 const r=await query("update products set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[status,req.params.id,ctx.id]);if(!r.rowCount)return res.status(404).json({error:"محصول پیدا نشد"});res.json(r.rows[0]);
}));
