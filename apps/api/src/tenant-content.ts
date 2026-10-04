import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {formSchema,pageSchema} from "./validation.js";

const router=Router();
async function tenantId(req:any,user:any){
 const requested=typeof req.headers["x-tenant-id"]==="string"?req.headers["x-tenant-id"].trim():"";
 if(user.role==="admin"){
  const r=requested?await query("select id from tenants where id=$1 and status='active'",[requested]):await query("select id from tenants where status='active' order by created_at limit 1");
  return r.rowCount?r.rows[0].id:null;
 }
 const r=requested
  ?await query("select t.id from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 and ut.tenant_id=$2 and t.status='active'",[user.id,requested])
  :await query("select t.id from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 and t.status='active' order by ut.is_default desc,t.created_at limit 1",[user.id]);
 return r.rowCount?r.rows[0].id:null;
}
router.get("/forms",requireAuth,requirePermission("templates:manage"),asyncHandler(async(req,res)=>{
 const id=await tenantId(req,(req as any).user);if(!id)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 res.json((await query("select * from form_definitions where tenant_id=$1 order by updated_at desc",[id])).rows);
}));
router.post("/forms",requireAuth,requirePermission("templates:manage"),asyncHandler(async(req,res)=>{
 const input=formSchema.parse(req.body),id=await tenantId(req,(req as any).user);if(!id)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("insert into form_definitions(tenant_id,name,slug,module_key,schema) values($1,$2,$3,$4,$5) returning *",[id,input.name,input.slug,input.moduleKey,input.schema]);res.status(201).json(r.rows[0]);
}));
router.put("/forms/:id",requireAuth,requirePermission("templates:manage"),asyncHandler(async(req,res)=>{
 const input=formSchema.parse(req.body),id=await tenantId(req,(req as any).user);if(!id)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update form_definitions set name=$1,module_key=$2,schema=$3,version=version+1,updated_at=now() where id=$4 and tenant_id=$5 returning *",[input.name,input.moduleKey,input.schema,req.params.id,id]);if(!r.rowCount)return res.status(404).json({error:"فرم پیدا نشد"});res.json(r.rows[0]);
}));
router.get("/pages",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(req,res)=>{
 const id=await tenantId(req,(req as any).user);if(!id)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 res.json((await query("select * from page_definitions where tenant_id=$1 order by updated_at desc",[id])).rows);
}));
router.post("/pages",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(req,res)=>{
 const input=pageSchema.parse(req.body),id=await tenantId(req,(req as any).user);if(!id)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("insert into page_definitions(tenant_id,name,slug,module_key,definition) values($1,$2,$3,$4,$5) returning *",[id,input.name,input.slug,input.moduleKey,input.definition]);res.status(201).json(r.rows[0]);
}));
router.put("/pages/:id",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(req,res)=>{
 const input=pageSchema.parse(req.body),id=await tenantId(req,(req as any).user);if(!id)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update page_definitions set name=$1,module_key=$2,definition=$3,version=version+1,updated_at=now() where id=$4 and tenant_id=$5 returning *",[input.name,input.moduleKey,input.definition,req.params.id,id]);if(!r.rowCount)return res.status(404).json({error:"صفحه پیدا نشد"});res.json(r.rows[0]);
}));
export {router as tenantContentRouter};
