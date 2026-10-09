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
 const entityType=clean(b.entityType),code=clean(b.code),name=clean(b.name);
 if(!code||!name||!entityType)return res.status(400).json({error:"نوع، کد و نام موجودیت الزامی است"});
 if(!["holding","company","branch","unit","department"].includes(entityType))return res.status(400).json({error:"نوع موجودیت معتبر نیست"});
 if(code.length>80||name.length>200)return res.status(400).json({error:"کد یا نام از حد مجاز طولانی‌تر است"});
 if(b.organizationId){
  const organization=await query("select 1 from organizations where id=$1 and tenant_id=$2",[b.organizationId,t.id]);
  if(!organization.rowCount)return res.status(400).json({error:"سازمان انتخاب‌شده متعلق به این محدوده نیست"});
 }
 if(b.parentId){
  const parent=await query("select 1 from organization_entities where id=$1 and tenant_id=$2",[b.parentId,t.id]);
  if(!parent.rowCount)return res.status(400).json({error:"موجودیت والد متعلق به این محدوده نیست"});
 }
 const r=await query("insert into organization_entities(tenant_id,organization_id,parent_id,entity_type,code,name,address,phone,manager_name,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,b.organizationId||null,b.parentId||null,entityType,code,name,clean(b.address)||null,clean(b.phone)||null,clean(b.managerName)||null,b.metadata||{}]);
 res.status(201).json(r.rows[0]);
});
router.patch("/api/organization/entities/:id",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;const b=req.body||{};
 const current=await query("select id from organization_entities where id=$1 and tenant_id=$2",[req.params.id,t.id]);
 if(!current.rowCount)return res.status(404).json({error:"موجودیت پیدا نشد"});
 const entityType=clean(b.entityType),code=clean(b.code),name=clean(b.name);
 if(entityType&&!["holding","company","branch","unit","department"].includes(entityType))return res.status(400).json({error:"نوع موجودیت معتبر نیست"});
 if(code!==undefined&&(!code||code.length>80))return res.status(400).json({error:"کد موجودیت نامعتبر است"});
 if(name!==undefined&&(!name||name.length>200))return res.status(400).json({error:"نام موجودیت نامعتبر است"});
 if(b.organizationId){
  const organization=await query("select 1 from organizations where id=$1 and tenant_id=$2",[b.organizationId,t.id]);
  if(!organization.rowCount)return res.status(400).json({error:"سازمان انتخاب‌شده متعلق به این محدوده نیست"});
 }
 if(b.parentId){
  if(b.parentId===req.params.id)return res.status(400).json({error:"موجودیت نمی‌تواند والد خودش باشد"});
  const parent=await query("select 1 from organization_entities where id=$1 and tenant_id=$2",[b.parentId,t.id]);
  if(!parent.rowCount)return res.status(400).json({error:"موجودیت والد متعلق به این محدوده نیست"});
  const cycle=await query("with recursive descendants(id) as (select id from organization_entities where parent_id=$1 and tenant_id=$2 union all select e.id from organization_entities e join descendants d on e.parent_id=d.id where e.tenant_id=$2) select 1 from descendants where id=$3 limit 1",[req.params.id,t.id,b.parentId]);
  if(cycle.rowCount)return res.status(400).json({error:"انتخاب این والد باعث ایجاد چرخه در ساختار سازمان می‌شود"});
 }
 const r=await query("update organization_entities set organization_id=coalesce($1,organization_id),parent_id=$2,entity_type=coalesce($3,entity_type),code=coalesce($4,code),name=coalesce($5,name),address=$6,phone=$7,manager_name=$8,status=coalesce($9,status),metadata=coalesce($10,metadata),updated_at=now() where id=$11 and tenant_id=$12 returning *",[b.organizationId||null,b.parentId||null,entityType,code,name,clean(b.address)||null,clean(b.phone)||null,clean(b.managerName)||null,clean(b.status),b.metadata||null,req.params.id,t.id]);
 res.json(r.rows[0]);
});
router.delete("/api/organization/entities/:id",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;const r=await query("delete from organization_entities where id=$1 and tenant_id=$2 returning id",[req.params.id,t.id]);if(!r.rowCount)return res.status(404).json({error:"موجودیت پیدا نشد"});res.status(204).end();
});
router.post("/api/organization/centers",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;const b=req.body||{};
 const type=clean(b.centerType),code=clean(b.code),name=clean(b.name);
 if(!["cost","revenue","profit"].includes(type)||!code||!name)return res.status(400).json({error:"نوع معتبر، کد و نام مرکز الزامی است"});
 if(code.length>80||name.length>200)return res.status(400).json({error:"کد یا نام مرکز از حد مجاز طولانی‌تر است"});
 if(b.organizationId){const org=await query("select 1 from organizations where id=$1 and tenant_id=$2",[b.organizationId,t.id]);if(!org.rowCount)return res.status(400).json({error:"سازمان انتخاب‌شده متعلق به این محدوده نیست"});}
 if(b.parentId){const parent=await query("select 1 from organization_centers where id=$1 and tenant_id=$2 and center_type=$3",[b.parentId,t.id,type]);if(!parent.rowCount)return res.status(400).json({error:"مرکز والد نامعتبر است"});}
 const r=await query("insert into organization_centers(tenant_id,organization_id,center_type,code,name,parent_id,metadata) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,b.organizationId||null,type,code,name,b.parentId||null,b.metadata||{}]);res.status(201).json(r.rows[0]);
});
router.patch("/api/organization/centers/:id",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;const b=req.body||{};
 const current=await query("select id,center_type from organization_centers where id=$1 and tenant_id=$2",[req.params.id,t.id]);
 if(!current.rowCount)return res.status(404).json({error:"مرکز پیدا نشد"});
 const type=clean(b.centerType)||current.rows[0].center_type,code=clean(b.code),name=clean(b.name);
 if(!["cost","revenue","profit"].includes(type))return res.status(400).json({error:"نوع مرکز معتبر نیست"});
 if(code!==undefined&&(!code||code.length>80))return res.status(400).json({error:"کد مرکز نامعتبر است"});
 if(name!==undefined&&(!name||name.length>200))return res.status(400).json({error:"نام مرکز نامعتبر است"});
 if(b.organizationId){const org=await query("select 1 from organizations where id=$1 and tenant_id=$2",[b.organizationId,t.id]);if(!org.rowCount)return res.status(400).json({error:"سازمان انتخاب‌شده متعلق به این محدوده نیست"});}
 if(b.parentId){if(b.parentId===req.params.id)return res.status(400).json({error:"مرکز نمی‌تواند والد خودش باشد"});const parent=await query("select 1 from organization_centers where id=$1 and tenant_id=$2 and center_type=$3",[b.parentId,t.id,type]);if(!parent.rowCount)return res.status(400).json({error:"مرکز والد نامعتبر است"});const cycle=await query("with recursive descendants(id) as (select id from organization_centers where parent_id=$1 and tenant_id=$2 union all select c.id from organization_centers c join descendants d on c.parent_id=d.id where c.tenant_id=$2) select 1 from descendants where id=$3 limit 1",[req.params.id,t.id,b.parentId]);if(cycle.rowCount)return res.status(400).json({error:"انتخاب این والد باعث ایجاد چرخه در مراکز می‌شود"});}
 const r=await query("update organization_centers set organization_id=coalesce($1,organization_id),center_type=$2,code=coalesce($3,code),name=coalesce($4,name),parent_id=$5,status=coalesce($6,status),metadata=coalesce($7,metadata),updated_at=now() where id=$8 and tenant_id=$9 returning *",[b.organizationId||null,type,code,name,b.parentId||null,clean(b.status),b.metadata||null,req.params.id,t.id]);
 res.json(r.rows[0]);
});
router.post("/api/organization/ownership",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;const b=req.body||{};const pct=Number(b.ownershipPercent);
 if(!b.ownerEntityId||!b.ownedEntityId||b.ownerEntityId===b.ownedEntityId||!Number.isFinite(pct)||pct<0||pct>100)return res.status(400).json({error:"مالک و زیرمجموعه متفاوت و درصد مالکیت بین صفر تا صد الزامی است"});
 const [owner,owned]=await Promise.all([
  query("select 1 from organization_entities where id=$1 and tenant_id=$2",[b.ownerEntityId,t.id]),
  query("select 1 from organization_entities where id=$1 and tenant_id=$2",[b.ownedEntityId,t.id])
 ]);
 if(!owner.rowCount||!owned.rowCount)return res.status(400).json({error:"هر دو موجودیت باید متعلق به همین محدوده سازمانی باشند"});
 const ownershipType=clean(b.ownershipType)||"direct";
 if(!["direct","indirect","joint"].includes(ownershipType))return res.status(400).json({error:"نوع مالکیت معتبر نیست"});
 const r=await query("insert into organization_ownership(tenant_id,owner_entity_id,owned_entity_id,ownership_percent,ownership_type) values($1,$2,$3,$4,$5) on conflict(tenant_id,owner_entity_id,owned_entity_id) do update set ownership_percent=excluded.ownership_percent,ownership_type=excluded.ownership_type,status='active' returning *",[t.id,b.ownerEntityId,b.ownedEntityId,pct,ownershipType]);
 res.status(201).json(r.rows[0]);
});
router.put("/api/organization/settings/:organizationId/:key",requireAuth,requireCsrf,async(req:any,res)=>{
 const t=await guard(req,res);if(!t)return;
 const key=clean(req.params.key);
 if(!key||key.length>120)return res.status(400).json({error:"کلید تنظیمات نامعتبر است"});
 const organization=await query("select 1 from organizations where id=$1 and tenant_id=$2",[req.params.organizationId,t.id]);
 if(!organization.rowCount)return res.status(404).json({error:"سازمان تنظیمات پیدا نشد"});
 const r=await query("insert into organization_settings(tenant_id,organization_id,setting_key,setting_value) values($1,$2,$3,$4) on conflict(tenant_id,organization_id,setting_key) do update set setting_value=excluded.setting_value,updated_at=now() returning *",[t.id,req.params.organizationId,key,req.body?.value??{}]);res.json(r.rows[0]);
});
export {router as organizationManagementRouter};
