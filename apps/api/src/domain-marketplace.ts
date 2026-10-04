import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";

export const domainMarketplaceRouter=Router();

type User={id:string;role:string};
type TenantContext={id:string;name:string;code:string};

async function tenantContext(req:any,user:User):Promise<TenantContext|null>{
  const requested=typeof req.headers["x-tenant-id"]==="string"?req.headers["x-tenant-id"].trim():"";
  if(user.role==="admin"){
    if(requested){
      const r=await query("select id,name,code from tenants where id=$1 and status='active'",[requested]);
      return r.rowCount?r.rows[0]:null;
    }
    const r=await query("select id,name,code from tenants where status='active' order by created_at limit 1");
    return r.rowCount?r.rows[0]:null;
  }
  const sql=requested
    ?"select t.id,t.name,t.code from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 and t.id=$2 and t.status='active'"
    :"select t.id,t.name,t.code from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 and t.status='active' order by ut.is_default desc,t.created_at limit 1";
  const params=requested?[user.id,requested]:[user.id];
  const r=await query(sql,params);
  return r.rowCount?r.rows[0]:null;
}

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

domainMarketplaceRouter.get("/api/marketplace/settlements",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select id,settlement_no,seller_id,period_start,period_end,gross_amount,commission_amount,adjustment_amount,net_amount,status,created_at,updated_at from seller_settlements where tenant_id=$1 order by created_at desc",[ctx.id]);
  res.json({tenant:ctx,items:r.rows,total:r.rowCount});
}));
