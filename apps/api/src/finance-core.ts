import {Router} from "express";
import crypto from "node:crypto";
import {query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";

const router=Router();
const tenantOf=async(req:any)=>resolveTenant(req,req.user);
const deny=(res:any,n:number,error:string)=>res.status(n).json({error});
const audit=async(t:string,u:string,entityType:string,entityId:string,action:string,before:any,after:any,req?:any)=>{
 await query("insert into accounting_finance_audit(tenant_id,entity_type,entity_id,action,actor_user_id,before_data,after_data) values($1,$2,$3,$4,$5,$6,$7)",[t,entityType,entityId,action,u,before||null,after||null]);
 if(entityType!=="document_vault")return;
 const b=await query("select id from finance_audit_binders where tenant_id=$1 and vault_id=$2 and entity_type=$3 and entity_id=$4",[t,entityId,entityType,entityId]).catch(()=>({rowCount:0,rows:[] as any[]}));
 if(b.rowCount) await query("update finance_audit_binders set event_count=event_count+1,last_event_at=now() where id=$1",[b.rows[0].id]);
};

router.get("/api/finance-core/overview",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const [companies,products,warehouses,vaults,purchases,sales]=await Promise.all([
  query("select * from accounting_companies where tenant_id=$1 order by code",[t.id]),
  query("select * from finance_products where tenant_id=$1 order by code",[t.id]),
  query("select * from finance_warehouses where tenant_id=$1 order by code",[t.id]),
  query("select v.id,v.vault_no,v.title,v.document_type,v.status,v.entity_type,v.entity_id,count(f.id)::int file_count from finance_document_vaults v left join finance_document_files f on f.vault_id=v.id where v.tenant_id=$1 group by v.id order by v.created_at desc limit 100",[t.id]),
  query("select * from finance_purchases where tenant_id=$1 order by created_at desc limit 100",[t.id]),
  query("select * from finance_sales where tenant_id=$1 order by created_at desc limit 100",[t.id])
 ]);
 res.json({companies:companies.rows,products:products.rows,warehouses:warehouses.rows,vaults:vaults.rows,purchases:purchases.rows,sales:sales.rows});
});

router.post("/api/finance-core/companies",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const {code,name,legalName="",taxId="",nationalId="",accountingMode="hybrid",parentCompanyId=null,baseCurrency="IRR"}=req.body||{};
 if(typeof code!=="string"||typeof name!=="string"||!["official","internal","hybrid"].includes(accountingMode))return deny(res,400,"اطلاعات شرکت نامعتبر است");
 const r=await query("insert into accounting_companies(tenant_id,code,name,legal_name,tax_id,national_id,accounting_mode,parent_company_id,base_currency) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",[t.id,code.trim(),name.trim(),legalName,taxId,nationalId,accountingMode,parentCompanyId,baseCurrency]);
 await audit(t.id,req.user.id,"company",r.rows[0].id,"create",null,r.rows[0],req);res.status(201).json(r.rows[0]);
});

router.post("/api/finance-core/products",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const {code,title,sku=null,barcode=null,productType="goods",unit="عدد",secondaryUnit=null,brand=null,category=null,purchasePrice=0,salePrice=0,taxRate=0,reorderPoint=0,trackingMode="none",expiryRequired=false}=req.body||{};
 if(typeof code!=="string"||typeof title!=="string")return deny(res,400,"کد و عنوان محصول الزامی است");
 const r=await query("insert into finance_products(tenant_id,code,title,sku,barcode,product_type,unit,secondary_unit,brand,category,purchase_price,sale_price,tax_rate,reorder_point,tracking_mode,expiry_required) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning *",[t.id,code.trim(),title.trim(),sku,barcode,productType,unit,secondaryUnit,brand,category,Number(purchasePrice)||0,Number(salePrice)||0,Number(taxRate)||0,Number(reorderPoint)||0,trackingMode,Boolean(expiryRequired)]);
 await audit(t.id,req.user.id,"product",r.rows[0].id,"create",null,r.rows[0],req);res.status(201).json(r.rows[0]);
});

router.post("/api/finance-core/warehouses",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const {code,title,address="",companyId=null,managerUserId=null}=req.body||{};
 if(typeof code!=="string"||typeof title!=="string")return deny(res,400,"کد و عنوان انبار الزامی است");
 const r=await query("insert into finance_warehouses(tenant_id,company_id,code,title,address,manager_user_id) values($1,$2,$3,$4,$5,$6) returning *",[t.id,companyId,code.trim(),title.trim(),address,managerUserId]);
 await audit(t.id,req.user.id,"warehouse",r.rows[0].id,"create",null,r.rows[0],req);res.status(201).json(r.rows[0]);
});

router.post("/api/finance-core/vaults",requireAuth,requirePermission("accounting-finance.documents"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const {title,documentType="other",entityType=null,entityId=null,confidentiality="internal",retentionUntil=null}=req.body||{};
 if(typeof title!=="string")return deny(res,400,"عنوان سند الزامی است");
 const vaultNo="V-"+new Date().toISOString().replace(/\D/g,"").slice(0,14)+"-"+crypto.randomBytes(3).toString("hex");
 const r=await query("insert into finance_document_vaults(tenant_id,vault_no,title,document_type,entity_type,entity_id,confidentiality,retention_until,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",[t.id,vaultNo,title.trim(),documentType,entityType,entityId,confidentiality,retentionUntil,req.user.id]);
 await query("insert into finance_audit_binders(tenant_id,vault_id,entity_type,entity_id,event_count,last_event_at) values($1,$2,$3,$4,1,now())",[t.id,r.rows[0].id,entityType||"document_vault",entityId||r.rows[0].id]);
 await audit(t.id,req.user.id,"document_vault",r.rows[0].id,"create",null,r.rows[0],req);res.status(201).json(r.rows[0]);
});

router.post("/api/finance-core/vaults/:id/files",requireAuth,requirePermission("accounting-finance.documents"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const {fileName,mimeType,fileBase64,documentType=null}=req.body||{};
 if(typeof fileName!=="string"||typeof mimeType!=="string"||typeof fileBase64!=="string")return deny(res,400,"فایل نامعتبر است");
 const raw=fileBase64.replace(/^data:[^;]+;base64,/,"");let data:Buffer;
 try{data=Buffer.from(raw,"base64")}catch{return deny(res,400,"فایل قابل خواندن نیست")}
 if(data.length>8*1024*1024)return deny(res,413,"حداکثر حجم هر سند ۸ مگابایت است");
 const v=await query("select * from finance_document_vaults where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!v.rowCount)return deny(res,404,"زونکن پیدا نشد");
 const sha=crypto.createHash("sha256").update(data).digest("hex");
 const existing=await query("select id from finance_document_files where tenant_id=$1 and vault_id=$2 and sha256=$3",[t.id,req.params.id,sha]);if(existing.rowCount)return deny(res,409,"این فایل قبلاً در زونکن ثبت شده است");
 const version=await query("select coalesce(max(version_no),0)+1::int version_no from finance_document_files where vault_id=$1",[req.params.id]);
 const r=await query("insert into finance_document_files(tenant_id,vault_id,file_name,mime_type,file_size,storage_key,sha256,file_data,version_no,is_original,ocr_status,uploaded_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11) returning id,file_name,mime_type,file_size,version_no,ocr_status,created_at",[t.id,req.params.id,fileName,mimeType,data.length,"db://finance-document-files/"+sha,sha,data,version.rows[0].version_no,version.rows[0].version_no===1,req.user.id]);
 const job=await query("insert into finance_ocr_jobs(tenant_id,file_id,provider,status,language) values($1,$2,$3,'queued','fas') returning id,status,provider,language",[t.id,r.rows[0].id,process.env.OCR_PROVIDER||"pending"]);
 await audit(t.id,req.user.id,"document_vault",req.params.id,"file_upload",null,{file:r.rows[0],ocr_job:job.rows[0]},req);
 res.status(201).json({file:r.rows[0],ocrJob:job.rows[0],next:"ocr-worker"});
});

router.get("/api/finance-core/vaults/:id",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const v=await query("select * from finance_document_vaults where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!v.rowCount)return deny(res,404,"زونکن پیدا نشد");
 const files=await query("select id,file_name,mime_type,file_size,version_no,is_original,ocr_status,ocr_text,extracted_data,created_at from finance_document_files where vault_id=$1 and tenant_id=$2 order by version_no desc",[req.params.id,t.id]);
 const events=await query("select id,action,actor_user_id,before_data,after_data,created_at from finance_audit_events where tenant_id=$1 and binder_id=(select id from finance_audit_binders where vault_id=$2 limit 1) order by created_at desc limit 200",[t.id,req.params.id]);
 res.json({vault:v.rows[0],files:files.rows,audit:events.rows});
});

router.post("/api/finance-core/ocr/:jobId/result",requireAuth,requirePermission("accounting-finance.documents"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const {status="needs_review",rawText="",extractedData={},confidence=null,errorMessage=null}=req.body||{};
 if(!["completed","failed","needs_review"].includes(status))return deny(res,400,"وضعیت OCR نامعتبر است");
 const j=await query("select j.*,f.vault_id from finance_ocr_jobs j join finance_document_files f on f.id=j.file_id where j.id=$1 and j.tenant_id=$2",[req.params.jobId,t.id]);if(!j.rowCount)return deny(res,404,"کار OCR پیدا نشد");
 const r=await query("update finance_ocr_jobs set status=$1,raw_text=$2,extracted_data=$3,confidence=$4,error_message=$5,completed_at=now() where id=$6 and tenant_id=$7 returning *",[status,rawText,extractedData,confidence,errorMessage,req.params.jobId,t.id]);
 await query("update finance_document_files set ocr_status=$1,ocr_text=$2,extracted_data=$3 where id=$4 and tenant_id=$5",[status==="completed"?"completed":status==="failed"?"failed":"processing",rawText,extractedData,j.rows[0].file_id,t.id]);
 await audit(t.id,req.user.id,"document_vault",j.rows[0].vault_id,"ocr_result",null,r.rows[0],req);res.json(r.rows[0]);
});

router.get("/api/finance-core/audit/:entityType/:entityId",requireAuth,requirePermission("accounting-finance.audit"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const r=await query("select * from accounting_finance_audit where tenant_id=$1 and entity_type=$2 and entity_id=$3 order by created_at desc limit 500",[t.id,req.params.entityType,req.params.entityId]);
 const e=await query("select * from finance_audit_events where tenant_id=$1 and entity_type=$2 and entity_id=$3 order by created_at desc limit 500",[t.id,req.params.entityType,req.params.entityId]);
 res.json({accounting:r.rows,audit:e.rows});
});

export {router as financeCoreRouter};
