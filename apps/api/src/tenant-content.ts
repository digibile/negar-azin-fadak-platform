import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {formSchema,pageSchema} from "./validation.js";
import {resolveTenant} from "./tenant-context.js";

const router=Router();
async function tenantId(req:any,user:any){const tenant=await resolveTenant(req,user);return tenant?.id||null;}
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
 const r=await query("update form_definitions set name=$1,slug=$2,module_key=$3,schema=$4,version=version+1,updated_at=now() where id=$5 and tenant_id=$6 returning *",[input.name,input.slug,input.moduleKey,input.schema,req.params.id,id]);if(!r.rowCount)return res.status(404).json({error:"فرم پیدا نشد"});res.json(r.rows[0]);
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
 const r=await query("update page_definitions set name=$1,slug=$2,module_key=$3,definition=$4,version=version+1,updated_at=now() where id=$5 and tenant_id=$6 returning *",[input.name,input.slug,input.moduleKey,input.definition,req.params.id,id]);if(!r.rowCount)return res.status(404).json({error:"صفحه پیدا نشد"});res.json(r.rows[0]);
}));
export {router as tenantContentRouter};
