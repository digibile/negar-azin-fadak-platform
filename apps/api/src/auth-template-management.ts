import {Router} from "express";
import {query,pool} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";

export const authTemplateManagementRouter=Router();
const defaults={loginTemplate:"unified-login",registerTemplate:"current-register",loginEnabled:true,registerEnabled:true,allowedIdentifiers:["mobile","email","nationalId"],loginMethods:["password","otp"],registrationFields:["fullName","email","password","confirmPassword"],captchaEnabled:true};
async function tenantFor(req:any){
 const user=(req as any).user;
 return resolveTenant(req,user);
}
authTemplateManagementRouter.get("/api/admin/auth-template-settings",requireAuth,requirePermission("templates:manage"),asyncHandler(async(req,res)=>{
 const tenant=await tenantFor(req);if(!tenant)return res.status(403).json({error:"سازمان فعال برای مدیریت قالب‌ها پیدا نشد"});
 const r=await query("select id,data,updated_at from module_records where tenant_id=$1 and record_type='auth-template-settings' order by updated_at desc limit 1",[tenant.id]);
 res.setHeader("Cache-Control","no-store");
 res.json({settings:{...defaults,...(r.rows[0]?.data||{})},updatedAt:r.rows[0]?.updated_at||null});
}));
authTemplateManagementRouter.put("/api/admin/auth-template-settings",requireAuth,requirePermission("templates:manage"),asyncHandler(async(req,res)=>{
 const tenant=await tenantFor(req);if(!tenant)return res.status(403).json({error:"سازمان فعال برای مدیریت قالب‌ها پیدا نشد"});
 const body=req.body||{};
 const loginTemplate=body.loginTemplate==="unified-login"?"unified-login":null;
 const registerTemplate=body.registerTemplate==="current-register"?"current-register":null;
 if(!loginTemplate||!registerTemplate)return res.status(400).json({error:"قالب انتخاب‌شده معتبر نیست"});
 const settings={...defaults,loginTemplate,registerTemplate,loginEnabled:body.loginEnabled!==false,registerEnabled:body.registerEnabled!==false,
 allowedIdentifiers:Array.isArray(body.allowedIdentifiers)&&body.allowedIdentifiers.some((x:string)=>["mobile","email","nationalId"].includes(x))?body.allowedIdentifiers.filter((x:string)=>["mobile","email","nationalId"].includes(x)):defaults.allowedIdentifiers,
 loginMethods:Array.isArray(body.loginMethods)&&body.loginMethods.some((x:string)=>["password","otp"].includes(x))?body.loginMethods.filter((x:string)=>["password","otp"].includes(x)):defaults.loginMethods,
 registrationFields:["fullName","email","password","confirmPassword"],
 captchaEnabled:body.captchaEnabled!==false};
 const user=(req as any).user,client=await pool.connect();
 try{await client.query("begin");
 const existing=await client.query("select id from module_records where tenant_id=$1 and record_type='auth-template-settings' order by updated_at desc limit 1 for update",[tenant.id]);
 let saved;
 if(existing.rowCount){saved=await client.query("update module_records set title='تنظیمات قالب ورود و ثبت‌نام',status='active',data=$1,updated_by=$2,updated_at=now() where id=$3 returning id,data,updated_at",[settings,user.id,existing.rows[0].id]);}
 else{
 const module=await client.query("select id from platform_modules where code='36-page-templates' and is_active=true limit 1");
 if(!module.rowCount)throw new Error("ماژول مدیریت قالب‌ها فعال نیست");
 saved=await client.query("insert into module_records(tenant_id,module_id,record_type,title,status,data,created_by,updated_by) values($1,$2,'auth-template-settings','تنظیمات قالب ورود و ثبت‌نام','active',$3,$4,$4) returning id,data,updated_at",[tenant.id,module.rows[0].id,settings,user.id]);
 }
 await client.query("commit");res.json({settings:saved.rows[0].data,updatedAt:saved.rows[0].updated_at});
 }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}));
authTemplateManagementRouter.get("/api/public/auth-template-settings",asyncHandler(async(req,res)=>{
 const {resolvePublicTenant}=await import("./tenant-context.js");
 const tenant=await resolvePublicTenant({hostname:String(req.headers["x-forwarded-host"]||req.hostname||"").trim().toLowerCase().split(":")[0]});
 res.setHeader("Cache-Control","no-store");
 if(!tenant)return res.json({settings:defaults});
 const r=await query("select data from module_records where tenant_id=$1 and record_type='auth-template-settings' and status='active' order by updated_at desc limit 1",[tenant.id]);
 res.json({settings:{...defaults,...(r.rows[0]?.data||{})}});
}));
