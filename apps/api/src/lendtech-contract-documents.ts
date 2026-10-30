import {Router} from "express";
import {createHash,randomUUID} from "node:crypto";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";
import {evaluateContractCondition,renderContractTemplate,validateContractTemplate,type ContractInstallment,type ContractVariable} from "./contract-engine.js";

export const lendtechContractRouter=Router();
const s=(v:unknown,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const tenant=async(req:any)=>resolveTenant(req,req.user);
const actor=(req:any)=>String(req.user?.id||"system");
const safeTags="p div span h1 h2 h3 h4 b strong i em u br hr ul ol li table thead tbody tfoot tr th td blockquote sub sup small".split(" ");
function cleanHtml(value:unknown):string{
 const html=s(value,100_000);
 return html
  .replace(/<(script|style|iframe|object|embed|form|svg|math|input|button|link|meta)[^>]*>[\s\S]*?<\/\1\s*>/gi,"")
  .replace(/<(script|style|iframe|object|embed|form|svg|math|input|button|link|meta)\b[^>]*\/?\s*>/gi,"")
  .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,"")
  .replace(/\s+(href|src|style|srcdoc)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,"")
  .replace(/<(\/?)\s*([a-z][a-z0-9]*)\b([^>]*)>/gi,(whole,slash:string,tag:string,attrs:string)=>{
    if(!safeTags.includes(tag.toLowerCase()))return "";
    const allowed=attrs.replace(/\s+(?!class\b|dir\b|align\b|colspan\b|rowspan\b|width\b|height\b)[a-z_:][-a-z0-9_:]*\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,"");
    return "<"+slash+tag.toLowerCase()+allowed+">";
  });
}
function esc(v:unknown):string{return String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]!));}
function page(title:string,header:string,body:string,footer:string):string{
 return "<!doctype html><html lang=\"fa\" dir=\"rtl\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>"+esc(title)+"</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;font-family:Tahoma,Arial,sans-serif;font-size:13px;line-height:2;color:#111;direction:rtl;background:#fff}.page{max-width:850px;margin:auto}.header,.footer{padding:10px 0}.body{padding:16px 0}table{width:100%;border-collapse:collapse}th,td{border:1px solid #777;padding:6px;text-align:center}@media print{body{padding:0}.page{max-width:none}}</style></head><body><main class=\"page\"><header class=\"header\">"+header+"</header><article class=\"body\">"+body+"</article><footer class=\"footer\">"+footer+"</footer></main></body></html>";
}
async function event(client:any,tenantRef:string,documentId:string,req:any,action:string,note=""){
 await client.query("insert into lendtech_contract_events(tenant_ref,document_id,actor_ref,action,note,ip) values($1,$2,$3,$4,$5,$6::inet)",[tenantRef,documentId,actor(req),action,note,req.ip||null]);
}
const DEFAULTS=[
 ["applicant_name","نام و نام خانوادگی متقاضی","text","applicant","FullName",true,"","Normal"],
 ["applicant_national_code","کد ملی متقاضی","text","applicant","NationalCode",true,"","Sensitive"],
 ["applicant_phone","شماره تماس متقاضی","text","applicant","PhoneNumber",false,"","Sensitive"],
 ["applicant_email","ایمیل متقاضی","text","applicant","Email",false,"","Normal"],
 ["product_name","نام طرح تسهیلات","text","loan","product_name",true,"","Normal"],
 ["loan_amount","مبلغ اصل تسهیلات","money","loan","amount",true,"تومان","Normal"],
 ["loan_months","تعداد اقساط","number","loan","months",true,"ماه","Normal"],
 ["loan_interest_percent","نرخ سود/کارمزد","number","loan","interest_percent",false,"درصد","Normal"],
 ["loan_installment_amount","مبلغ اولین قسط","money","loan","installment_amount",false,"تومان","Normal"],
 ["loan_total_repay","مجموع بازپرداخت","money","loan","total_repay",false,"تومان","Normal"],
 ["loan_first_due","اولین سررسید","date","loan","first_due",false,"","Normal"],
 ["company_name","نام سازمان","text","party","company_name",true,"","Normal"],
 ["contract_number","شماره قرارداد","text","system","number",true,"","Normal"],
 ["contract_date","تاریخ تولید قرارداد","date","system","created_date",true,"","Normal"],
 ["contract_version","نسخه قالب","number","system","template_version",true,"","Normal"],
 ["request_id","شماره درخواست","text","system","request_id",false,"","Normal"]
] as const;
async function ensureDefaults(tenantRef:string){
 for(const d of DEFAULTS)await query("insert into lendtech_contract_variable_defs(tenant_ref,key,label,data_type,source,path,required,format,sensitivity) values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(tenant_ref,key) do nothing",[tenantRef,...d]);
}
async function definitions(tenantRef:string){
 const rows=await query("select key,label,data_type,source,path,required,format,sensitivity,default_value,validation from lendtech_contract_variable_defs where tenant_ref=$1 order by key",[tenantRef]);
 const defs:Record<string,ContractVariable>={};
 for(const r of rows.rows)defs[r.key]={key:r.key,label:r.label,dataType:r.data_type,required:r.required,format:r.format} as ContractVariable;
 return {rows:rows.rows,defs};
}
function validateHtmlSet(body:string,header:string,footer:string,defs:Record<string,ContractVariable>):string[]{
 return [...validateContractTemplate(body,defs).map(x=>"متن: "+x),...validateContractTemplate(header,defs).map(x=>"سربرگ: "+x),...validateContractTemplate(footer,defs).map(x=>"پابرگ: "+x)];
}

lendtechContractRouter.get("/api/lendtech/contract-templates",requireAuth,requirePermission("modules:lendtech:contract:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select id,group_key,version,title,template_type,issuer_party,status,restricted,valid_from,valid_to,created_at,approved_at,published_at from lendtech_contract_templates where tenant_ref=$1 order by title,version desc",[t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechContractRouter.post("/api/lendtech/contract-templates",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 await ensureDefaults(t.id);
 const title=s(req.body?.title,160),type=s(req.body?.type,20)||"Company";
 const body=cleanHtml(req.body?.bodyHtml),header=cleanHtml(req.body?.headerHtml),footer=cleanHtml(req.body?.footerHtml);
 if(!title||!["Company","Bank","Financier","Guarantee","Other"].includes(type)||!body.replace(/<[^>]*>/g,"").trim())return res.status(400).json({error:"عنوان، نوع و متن قرارداد الزامی است"});
 const groupKey=randomUUID();
 const r=await query("insert into lendtech_contract_templates(tenant_ref,group_key,version,title,template_type,issuer_party,parties,description,usage_conditions,counter_party_ref,restricted,header_html,body_html,footer_html,change_note,valid_from,valid_to,created_by) values($1,$2,1,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) returning id,group_key,version,status",[t.id,groupKey,title,type,s(req.body?.issuerParty,160),JSON.stringify(Array.isArray(req.body?.parties)?req.body.parties.slice(0,10).map((x:unknown)=>s(x,80)):[]),s(req.body?.description,600),s(req.body?.usageConditions,600),s(req.body?.counterPartyRef,100)||null,req.body?.restricted===true,header,body,footer,s(req.body?.changeNote,300),req.body?.validFrom||null,req.body?.validTo||null,actor(req)]);
 res.status(201).json({item:r.rows[0]});
}));

lendtechContractRouter.get("/api/lendtech/contract-templates/:id",requireAuth,requirePermission("modules:lendtech:contract:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select * from lendtech_contract_templates where tenant_ref=$1 and id=$2",[t.id,req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"قالب قرارداد پیدا نشد"});
 res.json({item:r.rows[0]});
}));

lendtechContractRouter.patch("/api/lendtech/contract-templates/:id",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const old=await query("select * from lendtech_contract_templates where tenant_ref=$1 and id=$2",[t.id,req.params.id]);
 if(!old.rowCount)return res.status(404).json({error:"قالب قرارداد پیدا نشد"});
 if(old.rows[0].status!=="draft")return res.status(409).json({error:"فقط پیش‌نویس قابل ویرایش است؛ برای تغییر نسخه جدید بسازید"});
 const current=old.rows[0],title=req.body?.title===undefined?current.title:s(req.body.title,160);
 const body=req.body?.bodyHtml===undefined?current.body_html:cleanHtml(req.body.bodyHtml);
 const header=req.body?.headerHtml===undefined?current.header_html:cleanHtml(req.body.headerHtml);
 const footer=req.body?.footerHtml===undefined?current.footer_html:cleanHtml(req.body.footerHtml);
 if(!title||!body.replace(/<[^>]*>/g,"").trim())return res.status(400).json({error:"عنوان و متن قرارداد الزامی است"});
 const r=await query("update lendtech_contract_templates set title=$1,issuer_party=$2,parties=$3::jsonb,description=$4,usage_conditions=$5,counter_party_ref=$6,restricted=$7,header_html=$8,body_html=$9,footer_html=$10,change_note=$11,valid_from=$12,valid_to=$13 where tenant_ref=$14 and id=$15 returning *",[title,req.body?.issuerParty===undefined?current.issuer_party:s(req.body.issuerParty,160),JSON.stringify(Array.isArray(req.body?.parties)?req.body.parties.slice(0,10).map((x:unknown)=>s(x,80)):current.parties),req.body?.description===undefined?current.description:s(req.body.description,600),req.body?.usageConditions===undefined?current.usage_conditions:s(req.body.usageConditions,600),req.body?.counterPartyRef===undefined?current.counter_party_ref:s(req.body.counterPartyRef,100)||null,req.body?.restricted===undefined?current.restricted:req.body.restricted===true,header,body,footer,req.body?.changeNote===undefined?current.change_note:s(req.body.changeNote,300),req.body?.validFrom===undefined?current.valid_from:req.body.validFrom,req.body?.validTo===undefined?current.valid_to:req.body.validTo,t.id,req.params.id]);
 res.json({item:r.rows[0]});
}));

lendtechContractRouter.post("/api/lendtech/contract-templates/:id/validate",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select body_html,header_html,footer_html from lendtech_contract_templates where tenant_ref=$1 and id=$2",[t.id,req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"قالب قرارداد پیدا نشد"});
 await ensureDefaults(t.id);const {defs}=await definitions(t.id);
 const problems=validateHtmlSet(r.rows[0].body_html,r.rows[0].header_html,r.rows[0].footer_html,defs);
 res.json({valid:problems.length===0,problems});
}));

lendtechContractRouter.post("/api/lendtech/contract-templates/:id/new-version",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const old=await query("select * from lendtech_contract_templates where tenant_ref=$1 and id=$2",[t.id,req.params.id]);
 if(!old.rowCount)return res.status(404).json({error:"قالب قرارداد پیدا نشد"});
 const source=old.rows[0],draft=await query("select id from lendtech_contract_templates where tenant_ref=$1 and group_key=$2 and status='draft' limit 1",[t.id,source.group_key]);
 if(draft.rowCount)return res.status(409).json({error:"برای این قالب پیش‌نویس باز وجود دارد"});
 const max=await query("select coalesce(max(version),0)::int as version from lendtech_contract_templates where tenant_ref=$1 and group_key=$2",[t.id,source.group_key]);
 const r=await query("insert into lendtech_contract_templates(tenant_ref,group_key,version,title,template_type,issuer_party,parties,description,usage_conditions,counter_party_ref,restricted,header_html,body_html,footer_html,change_note,valid_from,valid_to,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) returning id,group_key,version,status",[t.id,source.group_key,Number(max.rows[0].version)+1,source.title,source.template_type,source.issuer_party,JSON.stringify(source.parties||[]),source.description,source.usage_conditions,source.counter_party_ref,source.restricted,source.header_html,source.body_html,source.footer_html,s(req.body?.changeNote,300),source.valid_from,source.valid_to,actor(req)]);
 res.status(201).json({item:r.rows[0]});
}));

lendtechContractRouter.post("/api/lendtech/contract-templates/:id/approve",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 await ensureDefaults(t.id);const {defs}=await definitions(t.id);
 const r=await query("select * from lendtech_contract_templates where tenant_ref=$1 and id=$2",[t.id,req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"قالب قرارداد پیدا نشد"});
 const row=r.rows[0];if(row.status!=="draft")return res.status(409).json({error:"فقط پیش‌نویس تأیید می‌شود"});
 if(row.created_by===actor(req)&&req.user?.role!=="admin")return res.status(403).json({error:"تأیید باید توسط کاربر دیگری انجام شود"});
 const problems=validateHtmlSet(row.body_html,row.header_html,row.footer_html,defs);
 if(problems.length)return res.status(422).json({error:"قالب قرارداد ایراد دارد",problems});
 const saved=await query("update lendtech_contract_templates set status='approved',approved_by=$1,approved_at=now() where tenant_ref=$2 and id=$3 returning id,status,approved_by,approved_at",[actor(req),t.id,req.params.id]);
 res.json({item:saved.rows[0]});
}));

lendtechContractRouter.post("/api/lendtech/contract-templates/:id/publish",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update lendtech_contract_templates set status='published',published_at=now() where tenant_ref=$1 and id=$2 and status='approved' and (valid_from is null or valid_from<=current_date) and (valid_to is null or valid_to>=current_date) returning id,group_key,version,status,published_at",[t.id,req.params.id]);
 if(!r.rowCount)return res.status(409).json({error:"قالب باید تأیید شده و در بازه اعتبار باشد"});
 res.json({item:r.rows[0]});
}));

lendtechContractRouter.post("/api/lendtech/contract-templates/:id/archive",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update lendtech_contract_templates set status='archived' where tenant_ref=$1 and id=$2 and status='published' returning id,status",[t.id,req.params.id]);
 if(!r.rowCount)return res.status(409).json({error:"فقط قالب منتشرشده قابل بایگانی است"});
 res.json({item:r.rows[0]});
}));

lendtechContractRouter.get("/api/lendtech/contract-variables",requireAuth,requirePermission("modules:lendtech:contract:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 await ensureDefaults(t.id);const r=await query("select * from lendtech_contract_variable_defs where tenant_ref=$1 order by key",[t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechContractRouter.post("/api/lendtech/contract-variables/sync-defaults",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 await ensureDefaults(t.id);const r=await query("select count(*)::int as total from lendtech_contract_variable_defs where tenant_ref=$1",[t.id]);
 res.json({synced:true,total:r.rows[0].total});
}));

lendtechContractRouter.post("/api/lendtech/contract-variables",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const key=s(req.body?.key,60),label=s(req.body?.label,120),dataType=s(req.body?.dataType,12)||"text",source=s(req.body?.source,12)||"custom",path=s(req.body?.path,60);
 if(!/^[a-z][a-z0-9_]{0,59}$/.test(key)||!label||!["text","date","number","money"].includes(dataType)||!["applicant","loan","party","system","document","custom"].includes(source))return res.status(400).json({error:"تعریف متغیر قرارداد معتبر نیست"});
 const r=await query("insert into lendtech_contract_variable_defs(tenant_ref,key,label,data_type,source,path,required,format,sensitivity,default_value,validation) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'') on conflict(tenant_ref,key) do nothing returning *",[t.id,key,label,dataType,source,path,req.body?.required===true,s(req.body?.format,40),req.body?.sensitivity==="Sensitive"?"Sensitive":"Normal",s(req.body?.defaultValue,300)]);
 if(!r.rowCount)return res.status(409).json({error:"کلید این متغیر قبلاً ثبت شده است"});
 res.status(201).json({item:r.rows[0]});
}));

lendtechContractRouter.patch("/api/lendtech/contract-variables/:id",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update lendtech_contract_variable_defs set label=coalesce($1,label),data_type=coalesce($2,data_type),source=coalesce($3,source),path=coalesce($4,path),required=coalesce($5,required),format=coalesce($6,format),sensitivity=coalesce($7,sensitivity),default_value=coalesce($8,default_value),updated_at=now() where tenant_ref=$9 and id=$10 returning *",[req.body?.label===undefined?null:s(req.body.label,120),req.body?.dataType===undefined?null:s(req.body.dataType,12),req.body?.source===undefined?null:s(req.body.source,12),req.body?.path===undefined?null:s(req.body.path,60),req.body?.required===undefined?null:req.body.required===true,req.body?.format===undefined?null:s(req.body.format,40),req.body?.sensitivity===undefined?null:req.body.sensitivity==="Sensitive"?"Sensitive":"Normal",req.body?.defaultValue===undefined?null:s(req.body.defaultValue,300),t.id,req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"متغیر قرارداد پیدا نشد"});
 res.json({item:r.rows[0]});
}));

lendtechContractRouter.delete("/api/lendtech/contract-variables/:id",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const found=await query("select key from lendtech_contract_variable_defs where tenant_ref=$1 and id=$2",[t.id,req.params.id]);
 if(!found.rowCount)return res.status(404).json({error:"متغیر قرارداد پیدا نشد"});
 const token="%{{"+found.rows[0].key+"}}%";
 const used=await query("select 1 from lendtech_contract_templates where tenant_ref=$1 and status<>'archived' and (body_html like $2 or header_html like $2 or footer_html like $2) limit 1",[t.id,token]);
 if(used.rowCount)return res.status(409).json({error:"این متغیر در قالب فعال استفاده شده است"});
 await query("delete from lendtech_contract_variable_defs where tenant_ref=$1 and id=$2",[t.id,req.params.id]);
 res.json({deleted:true});
}));

lendtechContractRouter.get("/api/lendtech/products/:productCode/contract-templates",requireAuth,requirePermission("modules:lendtech:contract:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select m.*,x.title as template_title,x.version as published_version from lendtech_product_contract_templates m left join lateral (select title,version from lendtech_contract_templates t where t.tenant_ref=m.tenant_ref and t.group_key=m.group_key and t.status='published' order by version desc limit 1)x on true where m.tenant_ref=$1 and m.product_code=$2 order by m.stage,m.sort_order",[t.id,req.params.productCode]);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechContractRouter.put("/api/lendtech/products/:productCode/contract-templates",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const items=Array.isArray(req.body?.items)?req.body.items.slice(0,30):null;
 if(!items)return res.status(400).json({error:"فهرست قالب‌های محصول معتبر نیست"});
 for(const item of items){
  const group=s(item?.groupKey,80),stage=s(item?.stage,20)||"signature";
  if(!/^[0-9a-f-]{36}$/i.test(group)||!["approval","signature","disbursement"].includes(stage))return res.status(400).json({error:"شناسه گروه قالب یا مرحله نامعتبر است"});
  const published=await query("select 1 from lendtech_contract_templates where tenant_ref=$1 and group_key=$2 and status='published' limit 1",[t.id,group]);
  if(!published.rowCount)return res.status(400).json({error:"برای گروه قالب انتخاب‌شده نسخه منتشرشده وجود ندارد"});
 }
 const client=await pool.connect();
 try{
  await client.query("begin");
  await client.query("delete from lendtech_product_contract_templates where tenant_ref=$1 and product_code=$2",[t.id,req.params.productCode]);
  for(const item of items)await client.query("insert into lendtech_product_contract_templates(tenant_ref,product_code,group_key,stage,required,condition,requires_review,sort_order) values($1,$2,$3,$4,$5,$6,$7,$8)",[t.id,req.params.productCode,s(item.groupKey,80),s(item.stage,20)||"signature",item.required!==false,s(item.condition,300),item.requiresReview!==false,Number.isInteger(Number(item.sortOrder))?Number(item.sortOrder):0]);
  await client.query("commit");
 }catch(error){await client.query("rollback");throw error;}finally{client.release();}
 res.json({saved:true,count:items.length});
}));

lendtechContractRouter.post("/api/lendtech/contracts/:id/render",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const c=await query("select c.*,f.application_id,a.application_no,a.customer_ref,a.product_code from lendtech_contracts c join lendtech_facilities f on f.id=c.facility_id and f.tenant_ref=c.tenant_ref join lendtech_applications a on a.id=f.application_id and a.tenant_ref=f.tenant_ref where c.id=$1 and c.tenant_ref=$2",[req.params.id,t.id]);
 if(!c.rowCount)return res.status(404).json({error:"قرارداد تسهیلات پیدا نشد"});
 const contract=c.rows[0];
 if(contract.status!=="draft")return res.status(409).json({error:"فقط قرارداد پیش‌نویس قابل تولید سند است"});
 const mappings=await query("select * from lendtech_product_contract_templates where tenant_ref=$1 and product_code=$2 order by stage,sort_order",[t.id,contract.product_code]);
 if(!mappings.rowCount)return res.status(409).json({error:"برای این طرح قالب قراردادی منتشرشده تعریف نشده است"});
 await ensureDefaults(t.id);
 const {rows:variableRows,defs}=await definitions(t.id);
 const applicant=await query("select id,full_name,email,national_id from users where id::text=$1 and status='active'",[contract.customer_ref]);
 const phone=applicant.rowCount?await query("select value from user_contact_methods where user_id=$1 and channel='sms' and status='active' and verified_at is not null order by is_primary desc limit 1",[applicant.rows[0].id]):{rows:[]};
 const schedule=await query("select installment_no,due_date,total_due,interest_due from lendtech_installments where tenant_ref=$1 and contract_id=$2 order by installment_no",[t.id,contract.id]);
 const installments:ContractInstallment[]=schedule.rows.map((x:any)=>({no:Number(x.installment_no),due:new Date(x.due_date),amount:Number(x.total_due)}));
 const tenantRow=await query("select name from tenants where id=$1",[t.id]);
 const raw:Record<string,unknown>={
  "applicant:FullName":applicant.rows[0]?.full_name||null,
  "applicant:NationalCode":applicant.rows[0]?.national_id||null,
  "applicant:PhoneNumber":phone.rows[0]?.value||null,
  "applicant:Email":applicant.rows[0]?.email||null,
  "loan:product_name":contract.product_code,
  "loan:amount":Number(contract.principal),
  "loan:months":Number(contract.term_months),
  "loan:interest_percent":Number(contract.interest_rate),
  "loan:installment_amount":installments[0]?.amount??null,
  "loan:total_repay":installments.reduce((sum,x)=>sum+x.amount,0),
  "loan:first_due":installments[0]?.due??null,
  "party:company_name":tenantRow.rows[0]?.name||t.name,
  "system:number":contract.contract_no,
  "system:created_date":new Date(),
  "system:template_version":0,
  "system:request_id":contract.application_no
 };
 const get=(key:string)=>{const d=variableRows.find((x:any)=>x.key===key);if(!d)return null;if(d.source==="custom")return d.default_value||null;return raw[d.source+":"+d.path]??null;};
 const client=await pool.connect(),created:any[]=[];
 try{
  await client.query("begin");
  for(const mapping of mappings.rows){
   if(mapping.condition&&!evaluateContractCondition(mapping.condition,get))continue;
   const template=await client.query("select * from lendtech_contract_templates where tenant_ref=$1 and group_key=$2 and status='published' and (valid_from is null or valid_from<=current_date) and (valid_to is null or valid_to>=current_date) order by version desc limit 1",[t.id,mapping.group_key]);
   if(!template.rowCount){if(mapping.required)throw new Error("نسخه معتبر قالب الزامی منتشر نشده است");continue;}
   const row=template.rows[0];raw["system:template_version"]=row.version;
   const header=renderContractTemplate(row.header_html,defs,get),body=renderContractTemplate(row.body_html,defs,get,installments),footer=renderContractTemplate(row.footer_html,defs,get);
   const missing=[...header.missing,...body.missing,...footer.missing],errors=[...header.errors,...body.errors,...footer.errors];
   if(missing.length||errors.length)throw new Error("متغیرهای الزامی یا ساختار قالب کامل نیست: "+[...missing.map(x=>x.label),...errors].join("، "));
   const html=page(row.title,header.html,body.html,footer.html),number="CT-"+Date.now()+"-"+randomUUID().slice(0,8).toUpperCase();
   const saved=await client.query("insert into lendtech_contract_documents(tenant_ref,application_id,contract_id,template_id,group_key,template_version,document_no,title,stage,status,requires_review,html,body_hash,values_json,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10,$11,$12,$13::jsonb,$14) returning id,document_no,title,stage,status,template_version",[t.id,contract.application_id,contract.id,row.id,row.group_key,row.version,number,row.title,mapping.stage,mapping.requires_review,html,createHash("sha256").update(html).digest("hex"),JSON.stringify(Object.fromEntries(variableRows.map((d:any)=>[d.key,get(d.key)]))),actor(req)]);
   created.push(saved.rows[0]);
   await event(client,t.id,saved.rows[0].id,req,"document.generated","نسخه "+row.version);
  }
  await client.query("commit");
 }catch(error){await client.query("rollback");return res.status(422).json({error:error instanceof Error?error.message:"تولید سند قرارداد انجام نشد"});}finally{client.release();}
 if(!created.length)return res.status(409).json({error:"هیچ قالب منطبق با شرایط قرارداد پیدا نشد"});
 res.status(201).json({items:created,total:created.length});
}));

lendtechContractRouter.get("/api/lendtech/contract-documents",requireAuth,requirePermission("modules:lendtech:contract:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=s(req.query.status,20),params:any[]=[t.id];
 let where="d.tenant_ref=$1";
 if(status){params.push(status);where+=" and d.status=$2";}
 const r=await query("select d.id,d.document_no,d.title,d.stage,d.status,d.template_version,d.requires_review,d.created_at,d.presented_at,d.expires_at,d.signed_at,c.contract_no,c.status as loan_contract_status,a.application_no,a.customer_ref,a.product_code from lendtech_contract_documents d join lendtech_contracts c on c.id=d.contract_id and c.tenant_ref=d.tenant_ref join lendtech_applications a on a.id=d.application_id and a.tenant_ref=d.tenant_ref where "+where+" order by d.created_at desc limit 250",params);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechContractRouter.get("/api/lendtech/contracts/:id/documents",requireAuth,requirePermission("modules:lendtech:contract:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select id,document_no,title,stage,status,template_version,requires_review,created_at,presented_at,signed_at from lendtech_contract_documents where tenant_ref=$1 and contract_id=$2 order by created_at desc",[t.id,req.params.id]);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechContractRouter.post("/api/lendtech/contract-documents/:id/present",requireAuth,requirePermission("modules:lendtech:contract:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const d=await client.query("select id,status,contract_id from lendtech_contract_documents where tenant_ref=$1 and id=$2 for update",[t.id,req.params.id]);
  if(!d.rowCount){await client.query("rollback");return res.status(404).json({error:"سند قرارداد پیدا نشد"});}
  if(d.rows[0].status!=="draft"){await client.query("rollback");return res.status(409).json({error:"فقط سند پیش‌نویس قابل ارائه است"});}
  await client.query("update lendtech_contract_documents set status='presented',reviewed_by=$1,reviewed_at=now(),presented_at=now(),expires_at=now()+interval '7 days' where tenant_ref=$2 and id=$3",[actor(req),t.id,req.params.id]);
  await event(client,t.id,req.params.id,req,"document.presented");
  await client.query("commit");
 }catch(error){await client.query("rollback");throw error;}finally{client.release();}
 res.json({presented:true});
}));

lendtechContractRouter.get("/api/lendtech/my-contract-documents",requireAuth,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select d.id,d.document_no,d.title,d.stage,d.status,d.template_version,d.presented_at,d.expires_at,d.signed_at from lendtech_contract_documents d join lendtech_applications a on a.id=d.application_id and a.tenant_ref=d.tenant_ref where d.tenant_ref=$1 and a.customer_ref=$2 order by d.created_at desc",[t.id,req.user!.id]);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechContractRouter.get("/api/lendtech/contract-documents/:id/html",requireAuth,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select d.id,d.html,d.document_no,d.title,d.status,a.customer_ref from lendtech_contract_documents d join lendtech_applications a on a.id=d.application_id and a.tenant_ref=d.tenant_ref where d.tenant_ref=$1 and d.id=$2",[t.id,req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"سند قرارداد پیدا نشد"});
 const isAdmin=req.user?.role==="admin"||req.user?.role==="manager";
 if(!isAdmin&&r.rows[0].customer_ref!==req.user!.id)return res.status(403).json({error:"این سند متعلق به حساب شما نیست"});
 res.type("html").set("cache-control","no-store").send(r.rows[0].html);
}));

lendtechContractRouter.get("/api/lendtech/contract-documents/:id/events",requireAuth,requirePermission("modules:lendtech:contract:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select action,note,actor_ref,ip,created_at from lendtech_contract_events where tenant_ref=$1 and document_id=$2 order by created_at",[t.id,req.params.id]);
 res.json({items:r.rows});
}));

lendtechContractRouter.post("/api/lendtech/contract-documents/:id/sign",requireAuth,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 if(req.body?.acceptTerms!==true)return res.status(400).json({error:"برای امضای الکترونیکی باید متن قرارداد را صریحاً بپذیرید"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const d=await client.query("select d.*,a.customer_ref from lendtech_contract_documents d join lendtech_applications a on a.id=d.application_id and a.tenant_ref=d.tenant_ref where d.tenant_ref=$1 and d.id=$2 for update of d",[t.id,req.params.id]);
  if(!d.rowCount){await client.query("rollback");return res.status(404).json({error:"سند قرارداد پیدا نشد"});}
  const row=d.rows[0];
  if(row.customer_ref!==req.user!.id){await client.query("rollback");return res.status(403).json({error:"این قرارداد متعلق به حساب شما نیست"});}
  if(row.status!=="presented"||!row.expires_at||new Date(row.expires_at).getTime()<Date.now()){await client.query("rollback");return res.status(409).json({error:"سند ارائه‌شده معتبر نیست یا مهلت آن پایان یافته است"});}
  await client.query("update lendtech_contract_documents set status='signed',signed_at=now(),signed_ip=$1::inet,signed_ua=$2,signature_method='authenticated_account_acceptance' where tenant_ref=$3 and id=$4",[req.ip||null,String(req.headers["user-agent"]||"").slice(0,200)||"",t.id,row.id]);
  await client.query("update lendtech_contracts set status='signed',signed_at=now(),updated_at=now() where tenant_ref=$1 and id=$2 and status='draft'",[t.id,row.contract_id]);
  await event(client,t.id,row.id,req,"document.signed","پذیرش صریح در نشست کاربری");
  await client.query("commit");
 }catch(error){await client.query("rollback");throw error;}finally{client.release();}
 res.json({signed:true,signatureMethod:"authenticated_account_acceptance"});
}));

lendtechContractRouter.post("/api/lendtech/contract-documents/:id/reject",requireAuth,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const note=s(req.body?.note,300);
 const r=await query("update lendtech_contract_documents d set status='rejected',rejection_note=$1 where d.tenant_ref=$2 and d.id=$3 and d.status='presented' and exists(select 1 from lendtech_applications a where a.id=d.application_id and a.tenant_ref=d.tenant_ref and a.customer_ref=$4) returning d.id,d.contract_id",[note,t.id,req.params.id,req.user!.id]);
 if(!r.rowCount)return res.status(404).json({error:"سند قابل رد متعلق به حساب شما پیدا نشد"});
 await query("insert into lendtech_contract_events(tenant_ref,document_id,actor_ref,action,note,ip) values($1,$2,$3,'document.rejected',$4,$5::inet)",[t.id,r.rows[0].id,actor(req),note,req.ip||null]);
 res.json({rejected:true});
}));
