import {Router} from "express";
import {randomUUID} from "node:crypto";
import {query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";

export const aiWorkshopRouter=Router();
const tools={
 "page":{label:"صفحه‌ساز",permission:"frontend:manage",description:"صفحه کامل با بلوک‌ها، ترتیب، متن، CTA، تصاویر و تنظیمات واکنش‌گرا"},
 "menu":{label:"منوساز",permission:"menus:manage",description:"درخت منو با گروه‌ها و زیرمنوها، مسیرها، آیکون‌ها و سطح دسترسی"},
 "layout":{label:"چیدمان‌ساز",permission:"frontend:manage",description:"سیستم چیدمان، گرید، فاصله‌ها، هدر، فوتر و ساختار دسکتاپ و موبایل"},
 "size":{label:"سایزبندی و ابعادساز",permission:"frontend:manage",description:"توکن‌های اندازه، نقاط شکست، عرض محتوا، فاصله‌ها و مقیاس تایپوگرافی"},
 "form":{label:"فرم‌ساز",permission:"form:manage",description:"فیلدها، نوع داده، اعتبارسنجی، شرط نمایش و گردش ثبت"},
 "section":{label:"بخش‌ساز",permission:"frontend:manage",description:"بخش مستقل قابل استفاده مجدد برای صفحات"},
 "advertorial":{label:"رپورتاژ و محتوای تبلیغاتی",permission:"frontend:manage",description:"محتوای رپورتاژ، تیترها، ساختار سئو، CTA و لینک‌های تبلیغاتی با برچسب شفاف"},
 "report":{label:"گزارش‌ساز",permission:"frontend:manage",description:"تعریف گزارش، فیلترها، ستون‌ها، شاخص‌ها و نمودارهای مورد نیاز؛ بدون جعل داده"},
 "template":{label:"قالب‌ساز",permission:"templates:manage",description:"ساختار کامل قالب و سیستم طراحی"}
} as const;
type ToolKey=keyof typeof tools;
const textValue=(v:unknown,n=1600)=>typeof v==="string"?v.trim().slice(0,n):"";
const slugify=(v:string)=>v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"ai-artifact";
const safeObject=(v:any)=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
const list=(v:any,max=24)=>Array.isArray(v)?v.slice(0,max).map((x:any)=>safeObject(x)):[];

async function tenant(req:any){return resolveTenant(req,(req as any).user);}
function promptFor(tool:ToolKey,request:string,framework:string,language:string,name:string){
 const rules=[
  "Return only valid JSON. No markdown, no executable source code, no SQL, no shell commands.",
  "You are an expert product designer and information architect for Sookar, a Persian RTL multi-tenant platform.",
  "Design a practical artifact, not a generic landing page. All labels and user-facing copy must use the requested language.",
  "Never invent operational data, real prices, legal claims, live integrations, payment success, analytics values or credentials.",
  "All output is a draft specification. Do not request or expose secrets. Do not include personally identifying data.",
  "Use responsive desktop, tablet and mobile rules. Include accessibility, keyboard behavior and empty/loading/error states where relevant.",
  "JSON shape: {title:string,summary:string,slug:string,sections:[{type,title,description,content,order}],components:[{name,type,props}],fields:[{key,label,type,required,validation,options}],menuItems:[{title,path,icon,permission,children:[{title,path,icon,permission}]}],layout:{columns,containerWidth,header,footer,spacing},breakpoints:[{name,minWidth,maxWidth,columns}],tokens:{spacing:[],fontSizes:[],radii:[],widths:[]},seo:{title,description,keywords},content:{headline,body,cta,disclosure},filters:[],metrics:[],charts:[],acceptanceCriteria:[]}. Use only relevant keys and concise structured values."
 ];
 const task={
  page:"Create a complete page-builder definition with ordered page sections, editable blocks, CTA, responsive rules and SEO metadata.",
  menu:"Create a safe draft navigation tree. Use relative internal paths only. Include 1-3 root groups and 2-6 useful children per group. Do not activate or overwrite existing menu roots.",
  layout:"Create a reusable design layout specification with header, footer, grid, container widths, responsive behavior and reusable component slots.",
  size:"Create a coherent responsive sizing system: content widths, spacing scale, typography scale, radii, control heights and breakpoint rules. Use CSS-friendly numeric values with units.",
  form:"Create a form definition with useful field keys, field types, required flags, validation constraints, option arrays where relevant, conditional rules and submission states.",
  section:"Create a reusable page section with content schema, component slots, variants, responsive behavior and accessibility guidance.",
  advertorial:"Create a Persian advertorial content package with editorial outline, headline alternatives, article body outline, transparent advertising disclosure, CTA, SEO metadata and internal/external link placeholders. Do not fabricate endorsements or factual claims.",
  report:"Create a report specification with purpose, dimensions, filters, columns, aggregation definitions, chart types and empty-state behavior. Do not provide invented numbers or pretend data is connected.",
  template:"Create a complete design-system and page-template specification for a professional Sookar website."
 }[tool];
 return rules.join("\n")+"\nArtifact type: "+tools[tool].label+"\nTask: "+task+"\nName: "+name+"\nFramework: "+framework+"\nLanguage: "+language+"\nUser requirements:\n"+request;
}
function normalizeArtifact(value:any){
 const raw=safeObject(value);
 const clean=(v:any,max=300)=>Array.isArray(v)?v.slice(0,max).map((x:any)=>typeof x==="string"?x.slice(0,500):safeObject(x)):[];
 return {
  title:textValue(raw.title,180)||"خروجی کارگاه هوشمند",
  summary:textValue(raw.summary,1000),
  slug:slugify(textValue(raw.slug,100)||"ai-artifact"),
  sections:clean(raw.sections,30),
  components:clean(raw.components,40),
  fields:clean(raw.fields,40),
  menuItems:clean(raw.menuItems,20),
  layout:safeObject(raw.layout),
  breakpoints:clean(raw.breakpoints,12),
  tokens:safeObject(raw.tokens),
  seo:safeObject(raw.seo),
  content:safeObject(raw.content),
  filters:clean(raw.filters,20),
  metrics:clean(raw.metrics,20),
  charts:clean(raw.charts,20),
  acceptanceCriteria:clean(raw.acceptanceCriteria,20),
  sourceFiles:Array.isArray(raw.sourceFiles)?raw.sourceFiles.slice(0,6).map((file:any)=>({path:textValue(file?.path,300),language:textValue(file?.language,30),content:textValue(file?.content,24000)})).filter((file:any)=>file.path&&!file.path.includes("..")&&file.content):[]
 };
}
aiWorkshopRouter.post("/api/ai/workshop/generate",requireAuth,asyncHandler(async(req,res)=>{
 const key=textValue(req.body?.tool,40) as ToolKey;
 if(!(key in tools))return res.status(400).json({error:"ابزار انتخاب‌شده معتبر نیست."});
 const config=tools[key];
 const permission=await query("select 1 from role_permissions where role=$1 and permission=$2",[(req as any).user.role,config.permission]);
 if((req as any).user.role!=="admin"&&!permission.rowCount)return res.status(403).json({error:"برای این ابزار مجوز لازم را ندارید."});
 const request=textValue(req.body?.prompt,5000),framework=textValue(req.body?.framework,100)||"Next.js + TypeScript",language=textValue(req.body?.language,60)||"فارسی",name=textValue(req.body?.name,180)||config.label;
 if(request.length<12)return res.status(400).json({error:"شرح نیاز باید حداقل ۱۲ نویسه باشد."});
 const apiKey=(process.env.AI_API_KEY||process.env.OPENAI_API_KEY||"").trim();
 if(!apiKey)return res.status(503).json({error:"سرویس هوش مصنوعی پیکربندی نشده است؛ AI_API_KEY را در محیط API تنظیم کنید."});
 const base=(process.env.AI_API_BASE_URL||"https://api.openai.com/v1").replace(/\/+$/,"");
 const model=(process.env.AI_MODEL||"gpt-4.1-mini").trim();
 const response=await fetch(base+"/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:0.3,response_format:{type:"json_object"},messages:[{role:"system",content:promptFor(key,request,framework,language,name)},{role:"user",content:"Generate the requested draft artifact. Keep it implementable and specific."}] }),signal:AbortSignal.timeout(45000)});
 const payload:any=await response.json().catch(()=>({}));
 if(!response.ok)return res.status(502).json({error:textValue(payload?.error?.message,350)||"ارتباط با مدل هوش مصنوعی ناموفق بود."});
 let parsed:any;try{parsed=JSON.parse(payload?.choices?.[0]?.message?.content||"")}catch{return res.status(502).json({error:"خروجی مدل JSON معتبر نیست."});}
 res.json({tool:key,label:config.label,framework,model,artifact:normalizeArtifact(parsed)});
}));
aiWorkshopRouter.post("/api/ai/workshop/code",requireAuth,asyncHandler(async(req,res)=>{
 const key=textValue(req.body?.tool,40) as ToolKey;
 if(!(key in tools))return res.status(400).json({error:"ابزار انتخاب‌شده معتبر نیست."});
 const config=tools[key],user=(req as any).user;
 const permission=await query("select 1 from role_permissions where role=$1 and permission=$2",[user.role,config.permission]);
 if(user.role!=="admin"&&!permission.rowCount)return res.status(403).json({error:"برای تولید کد این ابزار مجوز لازم را ندارید."});
 const artifact=normalizeArtifact(req.body?.artifact),framework=textValue(req.body?.framework,100)||"Next.js + TypeScript";
 const apiKey=(process.env.AI_API_KEY||process.env.OPENAI_API_KEY||"").trim();
 if(!apiKey)return res.status(503).json({error:"سرویس هوش مصنوعی پیکربندی نشده است؛ AI_API_KEY را در محیط API تنظیم کنید."});
 const base=(process.env.AI_API_BASE_URL||"https://api.openai.com/v1").replace(/\/+$/,"");
 const model=(process.env.AI_MODEL||"gpt-4.1-mini").trim(),slug=slugify(artifact.slug);
 const webPrefix=framework==="React + TypeScript"?"apps/web/components/ai-generated/"+slug+"/":"apps/web/app/ai-generated/"+slug+"/";
 const apiPrefix="apps/api/src/ai-generated/"+slug+"/";
 const system=[
  "You are a senior software engineer implementing a reviewed draft for Sookar.",
  "Return only valid JSON with shape {files:[{path:string,language:string,content:string}],notes:string[],tests:string[]}.",
  "Generate source code, not a design description. No markdown fences.",
  "Use the selected framework. Use Persian RTL and responsive design where a UI is requested.",
  "Do not add dependencies, modify existing files, access secrets, call external services, or invent real data.",
  "Do not include environment files, credentials, shell scripts, SQL migrations, package manifests, or deployment scripts.",
  "Generate at most 6 files. Every path must stay inside the approved generated folder. No ../ segments.",
  "Use accessible semantic components, typed props, safe text rendering, and clear empty/loading/error states.",
  "The output is an untrusted draft. Do not claim it was compiled, installed, or deployed.",
  "Artifact specification: "+JSON.stringify(artifact).slice(0,18000),
  "Framework: "+framework,
  "Allowed web file prefix: "+webPrefix,
  "Allowed API file prefix: "+apiPrefix,
  "For Python + FastAPI generate Python service code under the API prefix. For Next.js generate page.tsx and optional scoped CSS under the web prefix. For React generate a component .tsx and optional scoped CSS under the web prefix."
 ].join("\n");
 const response=await fetch(base+"/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:0.2,response_format:{type:"json_object"},messages:[{role:"system",content:system},{role:"user",content:"Generate complete implementation source files for this reviewed draft. Return concise, complete files."}]}),signal:AbortSignal.timeout(60000)});
 const payload:any=await response.json().catch(()=>({}));
 if(!response.ok)return res.status(502).json({error:textValue(payload?.error?.message,350)||"تولید کد توسط مدل ناموفق بود."});
 let parsed:any;try{parsed=JSON.parse(payload?.choices?.[0]?.message?.content||"")}catch{return res.status(502).json({error:"خروجی کد ساختار JSON معتبر ندارد."});}
 const files=Array.isArray(parsed.files)?parsed.files.slice(0,6).map((file:any)=>{
  const path=textValue(file?.path,300),content=textValue(file?.content,24000);
  const allowed=(path.startsWith(webPrefix)||path.startsWith(apiPrefix))&&!path.includes("..")&&!path.startsWith("/")&&/\.(tsx|ts|css|py)$/.test(path);
  return allowed&&content?{path,language:textValue(file?.language,30)||"text",content}:null;
 }).filter(Boolean):[];
 if(!files.length)return res.status(502).json({error:"مدل فایل منبع معتبر در مسیر مجاز تولید نکرد."});
 res.json({files,notes:Array.isArray(parsed.notes)?parsed.notes.slice(0,8).map((x:any)=>textValue(x,300)):[],tests:Array.isArray(parsed.tests)?parsed.tests.slice(0,8).map((x:any)=>textValue(x,300)):[],status:"draft-not-executed"});
}));
aiWorkshopRouter.post("/api/ai/workshop/save",requireAuth,asyncHandler(async(req,res)=>{
 const key=textValue(req.body?.tool,40) as ToolKey;
 if(!(key in tools))return res.status(400).json({error:"ابزار انتخاب‌شده معتبر نیست."});
 const config=tools[key],user=(req as any).user;
 const permission=await query("select 1 from role_permissions where role=$1 and permission=$2",[user.role,config.permission]);
 if(user.role!=="admin"&&!permission.rowCount)return res.status(403).json({error:"برای ذخیره این خروجی مجوز لازم را ندارید."});
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد."});
 const artifact=normalizeArtifact(req.body?.artifact);
 const name=textValue(req.body?.name,180)||artifact.title;
 const framework=textValue(req.body?.framework,100)||"Next.js + TypeScript";
 if(key==="menu"){
  const rootKey="ai-"+slugify(artifact.slug)+"-"+randomUUID().slice(0,8);
  const root=await query("insert into menu_items(menu_key,parent_id,title,path,icon,sort_order,permission,is_active,children) values($1,null,$2,'#','layout-grid',900,null,false,'[]'::jsonb) returning id,menu_key,title",[rootKey,name]);
  const created=[];
  for(const [i,item] of artifact.menuItems.entries()){
   const title=textValue(item.title,120);if(!title)continue;
   const menuKey=rootKey+"-"+i;
   const parent=await query("insert into menu_items(menu_key,parent_id,title,path,icon,sort_order,permission,is_active,children) values($1,$2,$3,'#','folder',"+(i+1)*10+",null,false,'[]'::jsonb) returning id",[menuKey,root.rows[0].id,title]);
   for(const [j,child] of list(item.children,12).entries()){
    const childTitle=textValue(child.title,120),path=textValue(child.path,300);
    if(!childTitle||!path.startsWith("/")||path.startsWith("//"))continue;
    await query("insert into menu_items(menu_key,parent_id,title,path,icon,sort_order,permission,is_active,children) values($1,$2,$3,$4,$5,$6,$7,false,'[]'::jsonb)",[menuKey+"-"+(j+1),parent.rows[0].id,childTitle,path,textValue(child.icon,40)||null,(j+1)*10,textValue(child.permission,100)||null]);
   }
   created.push({id:parent.rows[0].id,title});
  }
  return res.status(201).json({kind:"menu-draft",rootId:root.rows[0].id,items:created,message:"درخت منو به‌صورت غیرفعال ذخیره شد؛ منوی جاری تغییر نکرد."});
 }
 if(key==="form"){
  const code="ai-"+randomUUID().slice(0,12),slug=slugify(artifact.slug)+"-"+Date.now();
  const schema={fields:artifact.fields,aiGenerated:true,acceptanceCriteria:artifact.acceptanceCriteria};
  const saved=await query("insert into form_definitions(tenant_id,code,name,slug,module_key,schema,category,validation_mode,access_level,submit_mode,notes,status,version) values($1,$2,$3,$4,'frontend',$5::jsonb,'هوشمند','قابل تنظیم','کاربران مجاز','ثبت مستقیم','پیش‌نویس تولیدشده با هوش مصنوعی','draft',1) returning id,name,slug,status,version",[t.id,code,name,slug,JSON.stringify(schema)]);
  return res.status(201).json({kind:"form-draft",item:saved.rows[0],message:"فرم در وضعیت پیش‌نویس ذخیره شد و منتشر نشده است."});
 }
 const slug=slugify(artifact.slug)+"-"+Date.now();
 const definition={aiGenerated:true,artifactType:key,framework,artifact,publicationStatus:"draft",note:"خروجی هوش مصنوعی پیش‌نویس است و تا تأیید مدیر روی سایت فعال نمی‌شود."};
 const saved=await query("insert into page_definitions(tenant_id,name,slug,module_key,definition) values($1,$2,$3,'frontend',$4::jsonb) returning id,name,slug,version,updated_at",[t.id,name,slug,JSON.stringify(definition)]);
 res.status(201).json({kind:key+"-draft",item:saved.rows[0],message:"خروجی در صفحه‌ساز مرکزی ذخیره شد؛ هنوز منتشر نشده است."});
}));
