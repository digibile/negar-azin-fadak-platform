import {Router,type Request,type Response} from "express";
import {query} from "./db.js";
import {requireAuth} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";

const router=Router();
const defaults=[
 {key:"organization.name",category:"general",title:"نام سازمان",value:""},
 {key:"organization.default_currency",category:"general",title:"واحد پول پیش‌فرض",value:"IRR"},
 {key:"localization.calendar",category:"localization",title:"تقویم پیش‌فرض",value:"jalali"},
 {key:"localization.timezone",category:"localization",title:"منطقه زمانی",value:"Asia/Tehran"},
 {key:"localization.language",category:"localization",title:"زبان پیش‌فرض",value:"fa-IR"},
 {key:"numbering.document_prefix",category:"numbering",title:"پیشوند اسناد",value:"NAF"},
 {key:"numbering.invoice_prefix",category:"numbering",title:"پیشوند فاکتور",value:"INV"},
 {key:"notifications.enabled",category:"notifications",title:"اعلان‌های سامانه",value:true},
 {key:"security.session_minutes",category:"security",title:"مدت نشست به دقیقه",value:120},
 {key:"security.require_2fa",category:"security",title:"اجبار احراز هویت دومرحله‌ای",value:false},
 {key:"files.max_upload_mb",category:"files",title:"حداکثر حجم فایل (MB)",value:64},
 {key:"files.allowed_extensions",category:"files",title:"پسوندهای مجاز",value:["pdf","jpg","jpeg","png","docx","xlsx"]},
 {key:"workflow.approval_required",category:"workflow",title:"الزام تأیید گردش‌کار",value:true},
 {key:"maintenance.read_only",category:"maintenance",title:"حالت فقط خواندنی",value:false}
];

async function tenant(req:Request){return resolveTenant(req,(req as any).user)}
async function canWrite(user:any){
 if(user?.role==="admin")return true;
 const r=await query("select 1 from role_permissions where role=$1 and permission='settings:manage' limit 1",[user?.role]);
 return Boolean(r.rowCount);
}
router.get("/api/settings/central",requireAuth,async(req:Request,res:Response)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 for(const d of defaults) await query(
  "insert into central_settings(tenant_id,setting_key,category,title,value) values($1,$2,$3,$4,$5) on conflict(tenant_id,setting_key) do nothing",
  [t.id,d.key,d.category,d.title,JSON.stringify(d.value)]
 );
 const r=await query("select id,setting_key,category,title,value,is_sensitive,is_editable,updated_at from central_settings where tenant_id=$1 order by category,setting_key",[t.id]);
 res.json({items:r.rows,categories:[...new Set(r.rows.map((x:any)=>x.category))]});
});
router.put("/api/settings/central/:key",requireAuth,async(req:Request,res:Response)=>{
 const user=(req as any).user,t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 if(!(await canWrite(user)))return res.status(403).json({error:"دسترسی ویرایش تنظیمات مرکزی مجاز نیست"});
 const value=req.body?.value;
 if(value===undefined)return res.status(400).json({error:"مقدار تنظیم ارسال نشده است"});
 const client=await (await import("./db.js")).pool.connect();
 try{
  await client.query("begin");
  const old=await client.query("select id,value,is_editable from central_settings where tenant_id=$1 and setting_key=$2 for update",[t.id,req.params.key]);
  if(!old.rowCount){await client.query("rollback");return res.status(404).json({error:"تنظیم موردنظر پیدا نشد"});}
  if(!old.rows[0].is_editable){await client.query("rollback");return res.status(409).json({error:"این تنظیم قابل ویرایش نیست"});}
  const updated=await client.query("update central_settings set value=$1,updated_by=$2,updated_at=now() where id=$3 returning id,setting_key,category,title,value,is_sensitive,is_editable,updated_at",[JSON.stringify(value),user.id,old.rows[0].id]);
  await client.query("insert into central_setting_audit(tenant_id,setting_id,user_id,old_value,new_value) values($1,$2,$3,$4,$5)",[t.id,old.rows[0].id,user.id,old.rows[0].value,JSON.stringify(value)]);
  await client.query("commit");
  res.json(updated.rows[0]);
 }catch(e){await client.query("rollback");throw e}finally{client.release()}
});
router.get("/api/settings/central/audit",requireAuth,async(req:Request,res:Response)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select a.id,a.setting_id,a.user_id,a.old_value,a.new_value,a.changed_at,s.title,s.setting_key from central_setting_audit a left join central_settings s on s.id=a.setting_id where a.tenant_id=$1 order by a.changed_at desc limit 100",[t.id]);
 res.json(r.rows);
});
export {router as centralSettingsRouter};
