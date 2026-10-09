import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";

export const formBuilderRouter=Router();
const s=(v:unknown,n=500)=>typeof v==="string"?v.trim().slice(0,n):"";
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null;};
const tenant=async(req:any)=>resolveTenant(req,(req as any).user);

formBuilderRouter.get("/api/form-builder/forms",requireAuth,requirePermission("form:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const q=s(req.query.q,150),params:any[]=[t.id];let where="f.tenant_id=$1";
 if(q){params.push("%"+q+"%");where+=" and (f.code ilike $2 or f.name ilike $2 or f.slug ilike $2)";}
 const r=await query("select f.*,coalesce((select count(*)::int from form_submissions fs where fs.form_id=f.id and fs.tenant_id=f.tenant_id),0) submission_count from form_definitions f where "+where+" order by f.updated_at desc",params);
 res.json({items:r.rows,total:r.rowCount});
}));

formBuilderRouter.post("/api/form-builder/forms",requireAuth,requirePermission("form:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const code=s(req.body?.code,100),name=s(req.body?.title,250),slug=s(req.body?.key,150);
 if(!code||!name||!slug)return res.status(400).json({error:"کد، عنوان و کلید فرم الزامی است"});
 const schema=req.body?.schema&&typeof req.body.schema==="object"?req.body.schema:{fields:[]};
 const version=n(req.body?.version??1)??1;
 const r=await query("insert into form_definitions(tenant_id,code,name,slug,module_key,schema,category,validation_mode,access_level,submit_mode,owner_ref,notes,status,version,published_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning *",[t.id,code,name,slug,s(req.body?.moduleKey,150)||"form-builder",schema,s(req.body?.category,80)||"عمومی",s(req.body?.validationMode,80)||"قابل تنظیم",s(req.body?.accessLevel,80)||"کاربران واردشده",s(req.body?.submitMode,80)||"ثبت مستقیم",s(req.body?.ownerRef,150)||null,s(req.body?.notes,2000)||null,"draft",version,null]);
 res.status(201).json(r.rows[0]);
}));

formBuilderRouter.patch("/api/form-builder/forms/:id",requireAuth,requirePermission("form:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update form_definitions set name=coalesce($1,name),slug=coalesce($2,slug),schema=coalesce($3,schema),category=coalesce($4,category),validation_mode=coalesce($5,validation_mode),access_level=coalesce($6,access_level),submit_mode=coalesce($7,submit_mode),owner_ref=coalesce($8,owner_ref),notes=coalesce($9,notes),version=coalesce($10,version),updated_at=now() where id=$11 and tenant_id=$12 returning *",[s(req.body?.title,250)||null,s(req.body?.key,150)||null,req.body?.schema&&typeof req.body.schema==="object"?req.body.schema:null,s(req.body?.category,80)||null,s(req.body?.validationMode,80)||null,s(req.body?.accessLevel,80)||null,s(req.body?.submitMode,80)||null,s(req.body?.ownerRef,150)||null,s(req.body?.notes,2000)||null,n(req.body?.version),req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"فرم پیدا نشد"});
 res.json(r.rows[0]);
}));

formBuilderRouter.post("/api/form-builder/forms/:id/publish",requireAuth,requirePermission("form:publish"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);
 if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update form_definitions set status='published',published_at=now(),updated_at=now() where id=$1 and tenant_id=$2 and status in ('draft','disabled') returning *",[req.params.id,t.id]);
 if(!r.rowCount)return res.status(409).json({error:"فرم در وضعیت قابل انتشار نیست یا پیدا نشد"});
 res.json(r.rows[0]);
}));

formBuilderRouter.post("/api/form-builder/forms/:id/disable",requireAuth,requirePermission("form:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update form_definitions set status='disabled',updated_at=now() where id=$1 and tenant_id=$2 and status='published' returning *",[req.params.id,t.id]);
 if(!r.rowCount)return res.status(409).json({error:"فقط فرم منتشرشده قابل غیرفعال‌سازی است"});
 res.json(r.rows[0]);
}));

formBuilderRouter.delete("/api/form-builder/forms/:id",requireAuth,requirePermission("form:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("delete from form_definitions f where f.id=$1 and f.tenant_id=$2 and not exists (select 1 from form_submissions fs where fs.form_id=f.id and fs.tenant_id=f.tenant_id) returning f.id",[req.params.id,t.id]);
 if(!r.rowCount){
  const exists=await query("select 1 from form_definitions where id=$1 and tenant_id=$2",[req.params.id,t.id]);
  if(!exists.rowCount)return res.status(404).json({error:"فرم پیدا نشد"});
  return res.status(409).json({error:"فرم دارای Submission است و برای حفظ سوابق قابل حذف نیست؛ وضعیت آن را به آرشیو تغییر دهید."});
 }
 res.status(204).end();
}));

formBuilderRouter.get("/api/form-builder/forms/:id/submissions",requireAuth,requirePermission("form:submission:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select fs.id,fs.form_id,fs.form_version,fs.status,fs.payload,fs.submitted_by,fs.submitted_at,fs.reviewed_by,fs.reviewed_at,fs.review_note,fs.created_at,fs.updated_at from form_submissions fs join form_definitions f on f.id=fs.form_id and f.tenant_id=fs.tenant_id where fs.form_id=$1 and fs.tenant_id=$2 order by fs.submitted_at desc",[req.params.id,t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));

formBuilderRouter.post("/api/form-builder/forms/:id/submissions",requireAuth,requirePermission("form:submission:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const f=await query("select id,version,status from form_definitions where id=$1 and tenant_id=$2",[req.params.id,t.id]);
 if(!f.rowCount)return res.status(404).json({error:"فرم پیدا نشد"});
 if(f.rows[0].status!=="published")return res.status(409).json({error:"فقط فرم منتشرشده پذیرش Submission دارد"});
 const payload=req.body?.payload&&typeof req.body.payload==="object"?req.body.payload:{};
 const r=await query("insert into form_submissions(tenant_id,form_id,form_version,payload,submitted_by) values($1,$2,$3,$4,$5) returning *",[t.id,f.rows[0].id,f.rows[0].version,payload,(req as any).user.id]);
 res.status(201).json(r.rows[0]);
}));
