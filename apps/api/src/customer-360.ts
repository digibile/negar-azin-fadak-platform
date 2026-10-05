import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requireCsrf,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";
const router=Router();
const read=requirePermission("customer-360.read");
const write=requirePermission("customer-360.write");
const tenant=async(req:any)=>resolveTenant(req,req.user);
async function audit(req:any,t:any,id:string|null,action:string,before:any,after:any){
 await query("insert into crm_customer_audit(tenant_id,customer_id,action,actor_user_id,before_data,after_data) values($1,$2,$3,$4,$5,$6)",[t.id,id,action,req.user.id,before?JSON.stringify(before):null,after?JSON.stringify(after):null]);
}
router.get("/api/customer-360/overview",requireAuth,read,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const [customers,interactions,purchases,financial]=await Promise.all([
  query("select id,customer_no,customer_type,full_name,national_id,mobile,email,birth_date,status,notes,created_at from crm_customers where tenant_id=$1 order by created_at desc limit 500",[t.id]),
  query("select i.id,i.customer_id,i.channel,i.subject,i.body,i.occurred_at,c.full_name from crm_customer_interactions i join crm_customers c on c.id=i.customer_id where i.tenant_id=$1 order by i.occurred_at desc limit 200",[t.id]),
  query("select p.id,p.customer_id,p.external_ref,p.description,p.amount,p.status,p.purchased_at,c.full_name from crm_customer_purchases p join crm_customers c on c.id=p.customer_id where p.tenant_id=$1 order by p.purchased_at desc limit 200",[t.id]),
  query("select f.id,f.customer_id,f.receivable,f.payable,f.credit_limit,f.credit_used,f.snapshot_at,c.full_name from crm_customer_financial_snapshots f join crm_customers c on c.id=f.customer_id where f.tenant_id=$1 order by f.snapshot_at desc limit 200",[t.id])
 ]);
 res.json({customers:customers.rows,interactions:interactions.rows,purchases:purchases.rows,financial:financial.rows,tenant:t});
});
router.post("/api/customer-360/customers",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const b=req.body||{};if(!String(b.customerNo||"").trim()||!String(b.fullName||"").trim())return res.status(400).json({error:"شماره مشتری و نام الزامی است"});
 const r=await query("insert into crm_customers(tenant_id,customer_no,customer_type,full_name,national_id,mobile,email,birth_date,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",[t.id,b.customerNo,b.customerType||"individual",b.fullName,b.nationalId||null,b.mobile||null,b.email||null,b.birthDate||null,b.status||"active",b.notes||"",req.user.id]);
 await audit(req,t,r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/customer-360/customers/:id",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const old=await query("select * from crm_customers where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!old.rowCount)return res.status(404).json({error:"مشتری پیدا نشد"});
 const b=req.body||{};const r=await query("update crm_customers set full_name=coalesce($1,full_name),mobile=coalesce($2,mobile),email=coalesce($3,email),status=coalesce($4,status),notes=coalesce($5,notes),updated_at=now() where id=$6 and tenant_id=$7 returning *",[b.fullName??null,b.mobile??null,b.email??null,b.status??null,b.notes??null,req.params.id,t.id]);
 await audit(req,t,req.params.id,"update",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});
router.post("/api/customer-360/customers/:id/identities",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const own=await query("select 1 from crm_customers where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!own.rowCount)return res.status(404).json({error:"مشتری پیدا نشد"});
 const b=req.body||{};const r=await query("insert into crm_customer_identities(customer_id,document_type,document_number,first_name,last_name,father_name,gender,birth_place,address,postal_code,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",[req.params.id,b.documentType||"national-id",b.documentNumber||null,b.firstName||null,b.lastName||null,b.fatherName||null,b.gender||null,b.birthPlace||null,b.address||null,b.postalCode||null,b.metadata||{}]);res.status(201).json(r.rows[0]);
});
router.post("/api/customer-360/customers/:id/interactions",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const b=req.body||{};const own=await query("select 1 from crm_customers where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!own.rowCount)return res.status(404).json({error:"مشتری پیدا نشد"});
 const r=await query("insert into crm_customer_interactions(tenant_id,customer_id,channel,subject,body,actor_user_id,metadata) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,req.params.id,b.channel||"internal",b.subject||"تعامل جدید",b.body||"",req.user.id,b.metadata||{}]);res.status(201).json(r.rows[0]);
});
router.post("/api/customer-360/customers/:id/purchases",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const b=req.body||{};const own=await query("select 1 from crm_customers where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!own.rowCount)return res.status(404).json({error:"مشتری پیدا نشد"});
 const r=await query("insert into crm_customer_purchases(tenant_id,customer_id,external_ref,description,amount,status) values($1,$2,$3,$4,$5,$6) returning *",[t.id,req.params.id,b.externalRef||null,b.description||"خرید",Number(b.amount||0),b.status||"completed"]);res.status(201).json(r.rows[0]);
});
router.post("/api/customer-360/customers/:id/financial",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const b=req.body||{};const own=await query("select 1 from crm_customers where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!own.rowCount)return res.status(404).json({error:"مشتری پیدا نشد"});
 const r=await query("insert into crm_customer_financial_snapshots(tenant_id,customer_id,receivable,payable,credit_limit,credit_used) values($1,$2,$3,$4,$5,$6) returning *",[t.id,req.params.id,Number(b.receivable||0),Number(b.payable||0),Number(b.creditLimit||0),Number(b.creditUsed||0)]);res.status(201).json(r.rows[0]);
});
export {router as customer360Router};