import {Router} from "express";
import {query} from "./db.js";
import {requireAuth} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";

export const platformExperienceRouter=Router();

const tenantOf=async(req:any)=>resolveTenant(req,(req as any).user);
const adminOnly=(req:any,res:any)=>{
  if((req as any).user?.role!=="admin"){res.status(403).json({error:"این عملیات فقط برای مدیرکل مجاز است"});return false}
  return true;
};

platformExperienceRouter.get("/api/platform/experience/catalog",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req);
  const [locales,currencies,themes]=await Promise.all([
    query("select code,title,native_title,direction from platform_locales where is_active=true order by code"),
    query("select code,numeric_code,title,symbol,decimal_places from platform_currencies where is_active=true order by code"),
    query("select id,code,title,surface,version,status,config from platform_experience_themes where (tenant_id=$1 or tenant_id is null) and status in ('preview','published') order by tenant_id nulls first,surface,code,version desc",[t?.id||null])
  ]);
  res.json({locales:locales.rows,currencies:currencies.rows,themes:themes.rows});
}));

platformExperienceRouter.get("/api/platform/experience/settings",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select * from platform_tenant_settings where tenant_id=$1",[t.id]);
  res.json(r.rows[0]||{tenant_id:t.id,default_locale:"fa-IR",default_currency:"IRR",timezone:"Asia/Tehran",supported_locales:["fa-IR"],supported_currencies:["IRR"]});
}));

platformExperienceRouter.put("/api/platform/experience/settings",requireAuth,asyncHandler(async(req,res)=>{
  if(!adminOnly(req,res))return;
  const t=await tenantOf(req); if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const body=req.body||{};
  const locale=String(body.defaultLocale||"fa-IR");
  const currency=String(body.defaultCurrency||"IRR");
  const timezone=String(body.timezone||"Asia/Tehran");
  const locales=Array.isArray(body.supportedLocales)?body.supportedLocales.map(String):[locale];
  const currencies=Array.isArray(body.supportedCurrencies)?body.supportedCurrencies.map(String):[currency];
  const r=await query("insert into platform_tenant_settings(tenant_id,default_locale,default_currency,timezone,supported_locales,supported_currencies,updated_by,updated_at) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,now()) on conflict(tenant_id) do update set default_locale=excluded.default_locale,default_currency=excluded.default_currency,timezone=excluded.timezone,supported_locales=excluded.supported_locales,supported_currencies=excluded.supported_currencies,updated_by=excluded.updated_by,updated_at=now() returning *",[t.id,locale,currency,timezone,JSON.stringify(locales),JSON.stringify(currencies),(req as any).user.id]);
  res.json(r.rows[0]);
}));

platformExperienceRouter.get("/api/platform/experience/domains",requireAuth,asyncHandler(async(req,res)=>{
  if(!adminOnly(req,res))return;
  const t=await tenantOf(req); if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select d.*,th.code theme_code,th.title theme_title from platform_experience_domains d left join platform_experience_themes th on th.id=d.theme_id where d.tenant_id=$1 order by d.is_primary desc,d.hostname",[t.id]);
  res.json(r.rows);
}));

platformExperienceRouter.post("/api/platform/experience/domains",requireAuth,asyncHandler(async(req,res)=>{
  if(!adminOnly(req,res))return;
  const t=await tenantOf(req); if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const hostname=String(req.body?.hostname||"").trim().toLowerCase();
  const surface=String(req.body?.surface||"seller");
  if(!hostname||!/^[a-z0-9.-]+$/.test(hostname))return res.status(400).json({error:"دامنه معتبر نیست"});
  if(!["commerce","marketplace","seller","pay","corporate","management"].includes(surface))return res.status(400).json({error:"سطح محصول معتبر نیست"});
  const r=await query("insert into platform_experience_domains(tenant_id,hostname,surface,theme_id,is_primary) values($1,$2,$3,$4,$5) returning *",[t.id,hostname,surface,req.body?.themeId||null,Boolean(req.body?.isPrimary)]);
  res.status(201).json(r.rows[0]);
}));

platformExperienceRouter.get("/api/platform/experience/integrations",requireAuth,asyncHandler(async(req,res)=>{
  if(!adminOnly(req,res))return;
  const t=await tenantOf(req); if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select id,channel,provider,display_name,status,capabilities,settings,created_at,updated_at from platform_communication_integrations where tenant_id=$1 order by channel,provider",[t.id]);
  res.json(r.rows);
}));

platformExperienceRouter.post("/api/platform/experience/integrations",requireAuth,asyncHandler(async(req,res)=>{
  if(!adminOnly(req,res))return;
  const t=await tenantOf(req); if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const channel=String(req.body?.channel||"").trim();
  const provider=String(req.body?.provider||"").trim();
  const displayName=String(req.body?.displayName||"").trim();
  if(!channel||!provider||!displayName)return res.status(400).json({error:"کانال، ارائه‌دهنده و عنوان الزامی است"});
  const r=await query("insert into platform_communication_integrations(tenant_id,channel,provider,display_name,status,capabilities,settings,created_by,updated_by) values($1,$2,$3,$4,'draft',$5::jsonb,$6::jsonb,$7,$7) on conflict(tenant_id,channel,provider) do update set display_name=excluded.display_name,capabilities=excluded.capabilities,settings=excluded.settings,updated_by=excluded.updated_by,updated_at=now() returning id,channel,provider,display_name,status,capabilities,settings",[t.id,channel,provider,displayName,JSON.stringify(Array.isArray(req.body?.capabilities)?req.body.capabilities:[]),JSON.stringify(req.body?.settings&&typeof req.body.settings==="object"?req.body.settings:{}),(req as any).user.id]);
  res.status(201).json(r.rows[0]);
}));

platformExperienceRouter.get("/api/platform/experience/voice-agents",requireAuth,asyncHandler(async(req,res)=>{
  if(!adminOnly(req,res))return;
  const t=await tenantOf(req); if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select id,code,name,status,supported_locales,channels,provider,policy,created_at,updated_at from platform_voice_agents where tenant_id=$1 order by name",[t.id]);
  res.json(r.rows);
}));

platformExperienceRouter.post("/api/platform/experience/voice-agents",requireAuth,asyncHandler(async(req,res)=>{
  if(!adminOnly(req,res))return;
  const t=await tenantOf(req); if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const code=String(req.body?.code||"negar").trim();
  const name=String(req.body?.name||"دستیار صوتی نگار").trim();
  const r=await query("insert into platform_voice_agents(tenant_id,code,name,status,supported_locales,channels,provider,policy,created_by,updated_by) values($1,$2,$3,'draft',$4::jsonb,$5::jsonb,$6,$7::jsonb,$8,$8) on conflict(tenant_id,code) do update set name=excluded.name,supported_locales=excluded.supported_locales,channels=excluded.channels,provider=excluded.provider,policy=excluded.policy,updated_by=excluded.updated_by,updated_at=now() returning id,code,name,status,supported_locales,channels,provider,policy",[t.id,code,name,JSON.stringify(Array.isArray(req.body?.supportedLocales)?req.body.supportedLocales:["fa-IR"]),JSON.stringify(Array.isArray(req.body?.channels)?req.body.channels:["phone"]),req.body?.provider||null,JSON.stringify(req.body?.policy&&typeof req.body.policy==="object"?req.body.policy:{}),(req as any).user.id]);
  res.status(201).json(r.rows[0]);
}));
