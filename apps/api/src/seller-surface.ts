import {Router} from "express";
import {randomBytes} from "node:crypto";
import {query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";

type User={id:string;role:string};
const router=Router();
const str=(v:unknown,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
async function context(req:any,user:User){return resolveTenant(req,user);}async function sellerAccess(req:any,user:User,sellerId:string){
 const ctx=await context(req,user); if(!ctx)return null;
 const r=user.role==="admin"||user.role==="manager"
  ?await query("select id from sellers where id=$1 and tenant_id=$2",[sellerId,ctx.id])
  :await query("select s.id from sellers s join seller_users su on su.seller_id=s.id where s.id=$1 and s.tenant_id=$2 and su.user_id=$3",[sellerId,ctx.id,user.id]);
 return r.rowCount?ctx:null;
}

router.get("/api/marketplace/sellers/:sellerId/domains",requireAuth,requirePermission("seller:domain:view"),asyncHandler(async(req,res)=>{
 const ctx=await sellerAccess(req,(req as any).user,String(req.params.sellerId));if(!ctx)return res.status(403).json({error:"دسترسی به فروشنده مجاز نیست"});
 const r=await query("select * from seller_domains where tenant_id=$1 and seller_id=$2 order by created_at desc",[ctx.id,String(req.params.sellerId)]);res.json({items:r.rows,total:r.rowCount});
}));
router.post("/api/marketplace/sellers/:sellerId/domains",requireAuth,requirePermission("seller:domain:manage"),asyncHandler(async(req,res)=>{
 const ctx=await sellerAccess(req,(req as any).user,String(req.params.sellerId));if(!ctx)return res.status(403).json({error:"دسترسی به فروشنده مجاز نیست"});
 const hostname=str(req.body?.hostname,253).toLowerCase().replace(/^https?:\/\//,"").split("/")[0];
 const storeId=str(req.body?.storeId,100)||null;
 if(!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname))return res.status(400).json({error:"نام دامنه معتبر نیست"});
 if(storeId){const s=await query("select id from stores where id=$1 and tenant_id=$2 and seller_id=$3",[storeId,ctx.id,String(req.params.sellerId)]);if(!s.rowCount)return res.status(404).json({error:"فروشگاه معتبر نیست"});}
 const r=await query("insert into seller_domains(tenant_id,seller_id,store_id,hostname,verification_token,is_primary,ssl_mode) values($1,$2,$3,$4,$5,$6,$7) returning *",[ctx.id,String(req.params.sellerId),storeId,hostname,randomBytes(24).toString("hex"),Boolean(req.body?.isPrimary),req.body?.sslMode==="external"?"external":"managed"]);
 res.status(201).json(r.rows[0]);
}));
router.post("/api/marketplace/domains/:id/verify",requireAuth,requirePermission("seller:domain:manage"),asyncHandler(async(req,res)=>{
 const d=await query("select * from seller_domains where id=$1",[req.params.id]);if(!d.rowCount)return res.status(404).json({error:"دامنه پیدا نشد"});
 const ctx=await sellerAccess(req,(req as any).user,d.rows[0].seller_id);if(!ctx)return res.status(403).json({error:"دسترسی به دامنه مجاز نیست"});
 if(str(req.body?.token,200)!==d.rows[0].verification_token)return res.status(400).json({error:"کد تأیید دامنه نادرست است"});
 const r=await query("update seller_domains set verification_status='verified',verified_at=now(),updated_at=now() where id=$1 returning *",[req.params.id]);res.json(r.rows[0]);
}));
router.get("/api/marketplace/sellers/:sellerId/licenses",requireAuth,requirePermission("seller:license:view"),asyncHandler(async(req,res)=>{
 const ctx=await sellerAccess(req,(req as any).user,String(req.params.sellerId));if(!ctx)return res.status(403).json({error:"دسترسی به فروشنده مجاز نیست"});
 const r=await query("select * from seller_licenses where tenant_id=$1 and seller_id=$2 order by created_at desc",[ctx.id,String(req.params.sellerId)]);res.json({items:r.rows,total:r.rowCount});
}));
router.post("/api/marketplace/sellers/:sellerId/licenses",requireAuth,requirePermission("seller:license:manage"),asyncHandler(async(req,res)=>{
 const ctx=await sellerAccess(req,(req as any).user,String(req.params.sellerId));if(!ctx)return res.status(403).json({error:"دسترسی به فروشنده مجاز نیست"});
 const type=str(req.body?.licenseType,100),no=str(req.body?.licenseNo,150);if(!type||!no)return res.status(400).json({error:"نوع و شماره مجوز الزامی است"});
 const r=await query("insert into seller_licenses(tenant_id,seller_id,license_type,license_no,issuer,issued_at,expires_at,status,document_ref,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[ctx.id,String(req.params.sellerId),type,no,str(req.body?.issuer,200)||null,req.body?.issuedAt||null,req.body?.expiresAt||null,["pending","active","expired","revoked"].includes(req.body?.status)?req.body.status:"pending",str(req.body?.documentRef,500)||null,req.body?.metadata&&typeof req.body.metadata==="object"?req.body.metadata:{}]);res.status(201).json(r.rows[0]);
}));
router.get("/api/marketplace/sellers/:sellerId/permissions",requireAuth,requirePermission("seller:permission:view"),asyncHandler(async(req,res)=>{
 const ctx=await sellerAccess(req,(req as any).user,String(req.params.sellerId));if(!ctx)return res.status(403).json({error:"دسترسی به فروشنده مجاز نیست"});
 const r=await query("select permission,enabled from seller_permissions where tenant_id=$1 and seller_id=$2 order by permission",[ctx.id,String(req.params.sellerId)]);res.json({items:r.rows,total:r.rowCount});
}));
router.put("/api/marketplace/sellers/:sellerId/permissions",requireAuth,requirePermission("seller:permission:manage"),asyncHandler(async(req,res)=>{
 const ctx=await sellerAccess(req,(req as any).user,String(req.params.sellerId));if(!ctx)return res.status(403).json({error:"دسترسی به فروشنده مجاز نیست"});
 const items=Array.isArray(req.body?.items)?req.body.items:[];if(items.length>100)return res.status(400).json({error:"تعداد مجوزها بیش از حد مجاز است"});
 for(const item of items){const permission=str(item?.permission,120);if(permission)await query("insert into seller_permissions(seller_id,tenant_id,permission,enabled) values($1,$2,$3,$4) on conflict(seller_id,permission) do update set enabled=excluded.enabled",[String(req.params.sellerId),ctx.id,permission,Boolean(item?.enabled)]);}
 const r=await query("select permission,enabled from seller_permissions where tenant_id=$1 and seller_id=$2 order by permission",[ctx.id,String(req.params.sellerId)]);res.json({items:r.rows,total:r.rowCount});
}));

export {router as sellerSurfaceRouter};
