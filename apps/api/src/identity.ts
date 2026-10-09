import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requirePermission,requireCsrf} from "./auth.js";
const router=Router();
const guardRead=async(req:any,res:any,next:any)=>{
 if(req.user?.role==="admin")return next();
 const r=await query("select 1 from identity_role_permissions where role_key=$1 and permission_key='identity.users.read' and granted=true",[req.user?.role]);
 if(!r.rowCount)return res.status(403).json({error:"مجوز مشاهده هویت و دسترسی وجود ندارد"});
 next();
};
const guardWrite=async(req:any,res:any,next:any)=>{
 if(req.user?.role==="admin")return next();
 const r=await query("select 1 from identity_role_permissions where role_key=$1 and permission_key='identity.users.write' and granted=true",[req.user?.role]);
 if(!r.rowCount)return res.status(403).json({error:"مجوز تغییر هویت و دسترسی وجود ندارد"});
 next();
};
const guardAdmin=async(req:any,res:any,next:any)=>{
 if(req.user?.role==="admin")return next();
 return res.status(403).json({error:"تغییر نقش‌ها و انتساب مجوزها فقط برای مدیر سامانه مجاز است"});
};
router.get("/api/identity/overview",requireAuth,guardRead,async(_req,res)=>{
 const [users,roles,groups,permissions,grants,sessions,logins]=await Promise.all([
  query("select id,email,full_name,role,status,created_at from users order by created_at desc"),
  query("select r.role_key,r.title,r.description,r.is_system,r.is_active,count(u.id)::int user_count from identity_roles r left join users u on u.role=r.role_key group by r.role_key order by r.title"),
  query("select g.id,g.group_key,g.title,g.description,g.is_active,count(gm.user_id)::int member_count from identity_groups g left join identity_group_members gm on gm.group_id=g.id group by g.id order by g.title"),
  query("select permission_key,title,module_key,action,description,is_active from identity_permissions order by module_key,permission_key"),
  query("select role_key,permission_key from identity_role_permissions where granted=true order by role_key,permission_key"),
  query("select id,user_id,ip_address,user_agent,started_at,last_seen_at,expires_at,revoked_at from security_sessions order by last_seen_at desc limit 100"),
  query("select id,email,success,failure_reason,ip_address,occurred_at from security_login_events order by occurred_at desc limit 100")
 ]);
 res.json({users:users.rows,roles:roles.rows,groups:groups.rows,permissions:permissions.rows,grants:grants.rows,sessions:sessions.rows,logins:logins.rows,access:{canManageRoles:req.user?.role==="admin",canWriteUsers:req.user?.role==="admin"||true}});
});
router.post("/api/identity/users",requireAuth,guardWrite,requireCsrf,async(req,res)=>{
 const {email,fullName,role="viewer",status="active"}=req.body||{};
 if(!String(email).includes("@")||!String(fullName).trim())return res.status(400).json({error:"ایمیل و نام کاربر الزامی است"});
 const roleRow=await query("select 1 from identity_roles where role_key=$1 and is_active=true",[role]);
 if(!roleRow.rowCount)return res.status(400).json({error:"نقش انتخاب‌شده معتبر نیست"});
 const r=await query("update users set full_name=$1,role=$2,status=$3 where lower(email)=lower($4) returning id,email,full_name,role,status,created_at",[String(fullName).trim(),role,status,String(email).trim()]);
 if(!r.rowCount)return res.status(404).json({error:"کاربر موجود نیست؛ ساخت کاربر از مسیر ثبت‌نام امن انجام می‌شود"});
 res.json(r.rows[0]);
});
router.patch("/api/identity/users/:id",requireAuth,guardWrite,requireCsrf,async(req,res)=>{
 const {fullName,role,status}=req.body||{};
 if(req.user?.role!=="admin"&&(role!==undefined||status!==undefined))return res.status(403).json({error:"تغییر نقش یا وضعیت حساب فقط برای مدیر سامانه مجاز است"});
 if(role!==undefined){const x=await query("select 1 from identity_roles where role_key=$1 and is_active=true",[role]);if(!x.rowCount)return res.status(400).json({error:"نقش معتبر نیست"});}
 const r=await query("update users set full_name=coalesce($1,full_name),role=coalesce($2,role),status=coalesce($3,status) where id=$4 returning id,email,full_name,role,status,created_at",[fullName||null,role||null,status||null,req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"کاربر پیدا نشد"});res.json(r.rows[0]);
});
router.post("/api/identity/roles",requireAuth,guardAdmin,requireCsrf,async(req,res)=>{
 const {roleKey,title,description=""}=req.body||{};
 if(!String(roleKey).match(/^[a-z][a-z0-9_-]{1,40}$/)||!String(title).trim())return res.status(400).json({error:"شناسه نقش یا عنوان نامعتبر است"});
 const r=await query("insert into identity_roles(role_key,title,description) values($1,$2,$3) returning *",[roleKey,String(title).trim(),description]);res.status(201).json(r.rows[0]);
});
router.post("/api/identity/groups",requireAuth,guardWrite,requireCsrf,async(req,res)=>{
 const {groupKey,title,description=""}=req.body||{};
 if(!String(groupKey).match(/^[a-z][a-z0-9_-]{1,40}$/)||!String(title).trim())return res.status(400).json({error:"شناسه گروه یا عنوان نامعتبر است"});
 const r=await query("insert into identity_groups(group_key,title,description) values($1,$2,$3) returning *",[groupKey,String(title).trim(),description]);res.status(201).json(r.rows[0]);
});
router.post("/api/identity/groups/:id/members",requireAuth,guardWrite,requireCsrf,async(req,res)=>{
 const userId=String(req.body?.userId||""); if(!userId)return res.status(400).json({error:"کاربر مشخص نشده است"});
 const r=await query("insert into identity_group_members(group_id,user_id) values($1,$2) on conflict do nothing returning *",[req.params.id,userId]);res.status(201).json(r.rows[0]||{group_id:req.params.id,user_id:userId});
});
router.put("/api/identity/roles/:roleKey/permissions",requireAuth,guardAdmin,requireCsrf,async(req,res)=>{
 const permissionKeys=Array.isArray(req.body?.permissionKeys)?[...new Set(req.body.permissionKeys.map(String))]:[];
 const role=await query("select 1 from identity_roles where role_key=$1 and is_active=true",[req.params.roleKey]);
 if(!role.rowCount)return res.status(404).json({error:"نقش فعال پیدا نشد"});
 if(permissionKeys.length){const known=await query("select permission_key from identity_permissions where permission_key=any($1::text[]) and is_active=true",[permissionKeys]);if(known.rowCount!==permissionKeys.length)return res.status(400).json({error:"یک یا چند مجوز معتبر نیست یا غیرفعال است"});}
 await query("delete from identity_role_permissions where role_key=$1",[req.params.roleKey]);
 if(permissionKeys.length)await query("insert into identity_role_permissions(role_key,permission_key) select $1,permission_key from identity_permissions where permission_key=any($2::text[])",[req.params.roleKey,permissionKeys]);
 res.json({roleKey:req.params.roleKey,permissionKeys});
});
router.post("/api/identity/sessions/:id/revoke",requireAuth,guardWrite,requireCsrf,async(req,res)=>{
 const r=await query("update security_sessions set revoked_at=now() where id=$1 and revoked_at is null returning id",[req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"نشست فعال پیدا نشد"});res.status(204).end();
});
export {router as identityRouter};
