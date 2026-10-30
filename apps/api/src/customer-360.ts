import {Router} from "express";
import {randomUUID} from "node:crypto";
import {query} from "./db.js";
import {requireAuth,requireCsrf,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";
const router=Router();
const read=requirePermission("customer-360.read");
const write=requirePermission("customer-360.write");
const tenant=async(req:any)=>resolveTenant(req,req.user);
async function audit(req:any,t:any,id:string|null,action:string,before:any,after:any){
 await query("insert into crm_customer_audit(tenant_id,customer_id,action,actor_user_id,before_data,after_data) values($1,$2,$3,$4,$5,$6)",[t.id,id,action,(req as any).user.id,before?JSON.stringify(before):null,after?JSON.stringify(after):null]);
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
 const r=await query("insert into crm_customers(tenant_id,customer_no,customer_type,full_name,national_id,mobile,email,birth_date,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",[t.id,b.customerNo,b.customerType||"individual",b.fullName,b.nationalId||null,b.mobile||null,b.email||null,b.birthDate||null,b.status||"active",b.notes||"",(req as any).user.id]);
 await audit(req,t,r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/customer-360/customers/:id",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const old=await query("select * from crm_customers where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!old.rowCount)return res.status(404).json({error:"مشتری پیدا نشد"});
 const b=req.body||{};const r=await query("update crm_customers set full_name=coalesce($1,full_name),mobile=coalesce($2,mobile),email=coalesce($3,email),status=coalesce($4,status),notes=coalesce($5,notes),updated_at=now() where id=$6 and tenant_id=$7 returning *",[b.fullName??null,b.mobile??null,b.email??null,b.status??null,b.notes??null,String(String(req.params.id)),t.id]);
 await audit(req,t,String(String(req.params.id)),"update",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});
router.post("/api/customer-360/customers/:id/identities",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const own=await query("select 1 from crm_customers where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!own.rowCount)return res.status(404).json({error:"مشتری پیدا نشد"});
 const b=req.body||{};const r=await query("insert into crm_customer_identities(customer_id,document_type,document_number,first_name,last_name,father_name,gender,birth_place,address,postal_code,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",[String(String(req.params.id)),b.documentType||"national-id",b.documentNumber||null,b.firstName||null,b.lastName||null,b.fatherName||null,b.gender||null,b.birthPlace||null,b.address||null,b.postalCode||null,b.metadata||{}]);res.status(201).json(r.rows[0]);
});
router.post("/api/customer-360/customers/:id/interactions",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const b=req.body||{};const own=await query("select 1 from crm_customers where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!own.rowCount)return res.status(404).json({error:"مشتری پیدا نشد"});
 const r=await query("insert into crm_customer_interactions(tenant_id,customer_id,channel,subject,body,actor_user_id,metadata) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,String(String(req.params.id)),b.channel||"internal",b.subject||"تعامل جدید",b.body||"",(req as any).user.id,b.metadata||{}]);res.status(201).json(r.rows[0]);
});
router.post("/api/customer-360/customers/:id/purchases",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const b=req.body||{};const own=await query("select 1 from crm_customers where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!own.rowCount)return res.status(404).json({error:"مشتری پیدا نشد"});
 const r=await query("insert into crm_customer_purchases(tenant_id,customer_id,external_ref,description,amount,status) values($1,$2,$3,$4,$5,$6) returning *",[t.id,String(String(req.params.id)),b.externalRef||null,b.description||"خرید",Number(b.amount||0),b.status||"completed"]);res.status(201).json(r.rows[0]);
});
router.post("/api/customer-360/customers/:id/financial",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const b=req.body||{};const own=await query("select 1 from crm_customers where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!own.rowCount)return res.status(404).json({error:"مشتری پیدا نشد"});
 const r=await query("insert into crm_customer_financial_snapshots(tenant_id,customer_id,receivable,payable,credit_limit,credit_used) values($1,$2,$3,$4,$5,$6) returning *",[t.id,String(String(req.params.id)),Number(b.receivable||0),Number(b.payable||0),Number(b.creditLimit||0),Number(b.creditUsed||0)]);res.status(201).json(r.rows[0]);
});

const marketingRead=requirePermission("marketing:read");
const marketingManage=requirePermission("marketing:manage");
const normalizeMobile=(value:unknown)=>{
 let digits=String(value??"").replace(/[۰-۹]/g,ch=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(ch))).replace(/[٠-٩]/g,ch=>String("٠١٢٣٤٥٦٧٨٩".indexOf(ch))).replace(/\\D/g,"");
 if(digits.startsWith("0098"))digits="0"+digits.slice(4);
 else if(digits.startsWith("98"))digits="0"+digits.slice(2);
 else if(digits.length===10&&digits.startsWith("9"))digits="0"+digits;
 return /^09\\d{9}$/.test(digits)?digits:"";
};
async function auditMarketer(req:any,t:any,id:string|null,action:string,before:any,after:any){
 await query("insert into crm_marketer_audit(tenant_id,marketer_id,action,actor_user_id,before_data,after_data) values($1,$2,$3,$4,$5,$6)",[
  t.id,id,action,req.user.id,before?JSON.stringify(before):null,after?JSON.stringify(after):null
 ]);
}
router.get("/api/marketing/marketers",requireAuth,marketingRead,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=String(req.query.status||"").trim();
 if(status&&!["active","inactive"].includes(status))return res.status(400).json({error:"فیلتر وضعیت بازاریاب نامعتبر است"});
 const params:any[]=[t.id];let where="tenant_id=$1";
 if(status){params.push(status);where+=" and status=$2";}
 const r=await query("select id,name,phone,referral_code,commission_rate,status,created_at,updated_at from crm_marketers where "+where+" order by created_at desc limit 500",params);
 res.json({items:r.rows,total:r.rowCount});
});
router.post("/api/marketing/marketers",requireAuth,marketingManage,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const b=req.body||{},name=String(b.name||"").trim().slice(0,120),phone=normalizeMobile(b.phone);
 const rate=Number(b.commissionRate??0);
 if(name.length<2||!phone)return res.status(400).json({error:"نام و شماره موبایل معتبر الزامی است"});
 if(!Number.isFinite(rate)||rate<0||rate>100)return res.status(400).json({error:"درصد پورسانت باید بین صفر تا صد باشد"});
 const existing=await query("select id from crm_marketers where tenant_id=$1 and phone=$2",[t.id,phone]);
 if(existing.rowCount)return res.status(409).json({error:"این شماره موبایل قبلاً به بازاریاب دیگری اختصاص یافته است"});
 const code="MK"+randomUUID().replace(/-/g,"").slice(0,10).toUpperCase();
 const r=await query("insert into crm_marketers(tenant_id,name,phone,referral_code,commission_rate,created_by) values($1,$2,$3,$4,$5,$6) returning id,name,phone,referral_code,commission_rate,status,created_at,updated_at",[t.id,name,phone,code,rate,req.user.id]);
 await auditMarketer(req,t,r.rows[0].id,"create",null,r.rows[0]);
 res.status(201).json(r.rows[0]);
});
router.patch("/api/marketing/marketers/:id",requireAuth,marketingManage,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const old=await query("select id,name,phone,referral_code,commission_rate,status,created_at,updated_at from crm_marketers where id=$1 and tenant_id=$2",[req.params.id,t.id]);
 if(!old.rowCount)return res.status(404).json({error:"بازاریاب پیدا نشد"});
 const b=req.body||{},name=b.name===undefined?old.rows[0].name:String(b.name).trim().slice(0,120);
 const phone=b.phone===undefined?old.rows[0].phone:normalizeMobile(b.phone);
 const rate=b.commissionRate===undefined?Number(old.rows[0].commission_rate):Number(b.commissionRate);
 const status=b.status===undefined?old.rows[0].status:String(b.status);
 if(name.length<2||!phone)return res.status(400).json({error:"نام و شماره موبایل معتبر الزامی است"});
 if(!Number.isFinite(rate)||rate<0||rate>100)return res.status(400).json({error:"درصد پورسانت باید بین صفر تا صد باشد"});
 if(!["active","inactive"].includes(status))return res.status(400).json({error:"وضعیت بازاریاب نامعتبر است"});
 const duplicate=await query("select id from crm_marketers where tenant_id=$1 and phone=$2 and id<>$3",[t.id,phone,req.params.id]);
 if(duplicate.rowCount)return res.status(409).json({error:"این شماره موبایل قبلاً ثبت شده است"});
 const r=await query("update crm_marketers set name=$1,phone=$2,commission_rate=$3,status=$4,updated_at=now() where id=$5 and tenant_id=$6 returning id,name,phone,referral_code,commission_rate,status,created_at,updated_at",[name,phone,rate,status,req.params.id,t.id]);
 await auditMarketer(req,t,req.params.id,"update",old.rows[0],r.rows[0]);
 res.json(r.rows[0]);
});
router.get("/api/marketing/marketers/audit",requireAuth,marketingRead,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select a.id,a.marketer_id,a.action,a.actor_user_id,a.before_data,a.after_data,a.created_at from crm_marketer_audit a where a.tenant_id=$1 order by a.created_at desc limit 200",[t.id]);
 res.json({items:r.rows,total:r.rowCount});
});

export {router as customer360Router};