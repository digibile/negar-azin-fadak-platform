import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requireCsrf} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";

const router=Router();
const tenant=async(req:any)=>resolveTenant(req,req.user);
const guard=async(req:any,res:any)=>{const t=await tenant(req);if(!t)res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});return t};
const clean=(v:any)=>typeof v==="string"?v.trim():v;

router.get("/api/organization/overview",requireAuth,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;
 const [orgs,entities,centers,ownership,settings]=await Promise.all([
  query("select * from organizations where tenant_id=$1 order by created_at",[t.id]),
  query("select e.*,o.name as organization_name from organization_entities e left join organizations o on o.id=e.organization_id where e.tenant_id=$1 order by e.entity_type,e.name",[t.id]),
  query("select * from organization_centers where tenant_id=$1 order by center_type,name",[t.id]),
  query("select oo.*,a.name as owner_name,b.name as owned_name from organization_ownership oo join organization_entities a on a.id=oo.owner_entity_id join organization_entities b on b.id=oo.owned_entity_id where oo.tenant_id=$1 order by a.name,b.name",[t.id]),
  query("select * from organization_settings where tenant_id=$1 order by setting_key",[t.id])
 ]);
 res.json({organizations:orgs.rows,entities:entities.rows,centers:centers.rows,ownership:ownership.rows,settings:settings.rows});
});

router.post("/api/organization/organizations",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return; const b=req.body||{};
 if(!clean(b.code)||!clean(b.name))return res.status(400).json({error:"کد و نام سازمان الزامی است"});
 const r=await query("insert into organizations(tenant_id,code,name,organization_type,national_id,registration_no,economic_code) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,clean(b.code),clean(b.name),clean(b.organizationType)||"company",clean(b.nationalId)||null,clean(b.registrationNo)||null,clean(b.economicCode)||null]);
 res.status(201).json(r.rows[0]);
});
router.patch("/api/organization/organizations/:id",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return; const b=req.body||{};
 const r=await query("update organizations set name=coalesce($1,name),organization_type=coalesce($2,organization_type),national_id=$3,registration_no=$4,economic_code=$5,status=coalesce($6,status),updated_at=now() where id=$7 and tenant_id=$8 returning *",[clean(b.name),clean(b.organizationType),clean(b.nationalId)||null,clean(b.registrationNo)||null,clean(b.economicCode)||null,clean(b.status),req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"سازمان پیدا نشد"});res.json(r.rows[0]);
});
router.post("/api/organization/entities",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return; const b=req.body||{};
 if(!clean(b.code)||!clean(b.name)||!clean(b.entityType))return res.status(400).json({error:"نوع، کد و نام موجودیت الزامی است"});
 const r=await query("insert into organization_entities(tenant_id,organization_id,parent_id,entity_type,code,name,address,phone,manager_name,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,b.organizationId||null,b.parentId||null,clean(b.entityType),clean(b.code),clean(b.name),clean(b.address)||null,clean(b.phone)||null,clean(b.managerName)||null,b.metadata||{}]);
 res.status(201).json(r.rows[0]);
});
router.patch("/api/organization/entities/:id",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;const b=req.body||{};
 const r=await query("update organization_entities set parent_id=$1,entity_type=coalesce($2,entity_type),code=coalesce($3,code),name=coalesce($4,name),address=$5,phone=$6,manager_name=$7,status=coalesce($8,status),metadata=coalesce($9,metadata),updated_at=now() where id=$10 and tenant_id=$11 returning *",[b.parentId||null,clean(b.entityType),clean(b.code),clean(b.name),clean(b.address)||null,clean(b.phone)||null,clean(b.managerName)||null,clean(b.status),b.metadata||null,req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"موجودیت پیدا نشد"});res.json(r.rows[0]);
});
router.delete("/api/organization/entities/:id",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;const r=await query("delete from organization_entities where id=$1 and tenant_id=$2 returning id",[req.params.id,t.id]);if(!r.rowCount)return res.status(404).json({error:"موجودیت پیدا نشد"});res.status(204).end();
});
router.post("/api/organization/centers",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;const b=req.body||{};
 if(!clean(b.code)||!clean(b.name)||!clean(b.centerType))return res.status(400).json({error:"نوع، کد و نام مرکز الزامی است"});
 const r=await query("insert into organization_centers(tenant_id,organization_id,center_type,code,name,parent_id,metadata) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,b.organizationId||null,clean(b.centerType),clean(b.code),clean(b.name),b.parentId||null,b.metadata||{}]);res.status(201).json(r.rows[0]);
});
router.patch("/api/organization/centers/:id",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;const b=req.body||{};const r=await query("update organization_centers set code=coalesce($1,code),name=coalesce($2,name),parent_id=$3,status=coalesce($4,status),metadata=coalesce($5,metadata),updated_at=now() where id=$6 and tenant_id=$7 returning *",[clean(b.code),clean(b.name),b.parentId||null,clean(b.status),b.metadata||null,req.params.id,t.id]);if(!r.rowCount)return res.status(404).json({error:"مرکز پیدا نشد"});res.json(r.rows[0]);
});
router.post("/api/organization/ownership",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;const b=req.body||{};const pct=Number(b.ownershipPercent);if(!b.ownerEntityId||!b.ownedEntityId||!Number.isFinite(pct))return res.status(400).json({error:"مالک، زیرمجموعه و درصد مالکیت الزامی است"});
 const r=await query("insert into organization_ownership(tenant_id,owner_entity_id,owned_entity_id,ownership_percent,ownership_type) values($1,$2,$3,$4,$5) returning *",[t.id,b.ownerEntityId,b.ownedEntityId,pct,clean(b.ownershipType)||"direct"]);res.status(201).json(r.rows[0]);
});
router.put("/api/organization/settings/:organizationId/:key",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;const r=await query("insert into organization_settings(tenant_id,organization_id,setting_key,setting_value) values($1,$2,$3,$4) on conflict(tenant_id,organization_id,setting_key) do update set setting_value=excluded.setting_value,updated_at=now() returning *",[t.id,req.params.organizationId,req.params.key,req.body?.value??{}]);res.json(r.rows[0]);
});
export {router as organizationManagementRouter};
