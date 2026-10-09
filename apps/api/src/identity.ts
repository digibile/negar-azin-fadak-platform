import {Router} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requireCsrf} from "./auth.js";

const router=Router();
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLE_KEY=/^[a-z][a-z0-9_-]{1,40}$/;
const isAdmin=(req:any)=>req.user?.role==="admin";

const guardRead=async(req:any,res:any,next:any)=>{
 if(isAdmin(req))return next();
 try{
  const r=await query("select 1 from identity_role_permissions where role_key=$1 and permission_key='identity.users.read' and granted=true",[req.user?.role]);
  if(!r.rowCount)return res.status(403).json({error:"مجوز مشاهده هویت و دسترسی وجود ندارد"});
  next();
 }catch(error){next(error);}
};
const guardWrite=async(req:any,res:any,next:any)=>{
 if(isAdmin(req))return next();
 try{
  const r=await query("select 1 from identity_role_permissions where role_key=$1 and permission_key='identity.users.write' and granted=true",[req.user?.role]);
  if(!r.rowCount)return res.status(403).json({error:"مجوز تغییر هویت و دسترسی وجود ندارد"});
  next();
 }catch(error){next(error);}
};
const guardAdmin=(req:any,res:any,next:any)=>{
 if(isAdmin(req))return next();
 return res.status(403).json({error:"این عملیات فقط برای مدیر سامانه مجاز است"});
};

router.get("/api/identity/overview",requireAuth,guardRead,async(req:any,res)=>{
 const admin=isAdmin(req);
 const [users,roles,groups,members,permissions,grants,sessions,logins]=await Promise.all([
  admin
   ? query("select id,email,national_id,full_name,role,status,created_at from users order by created_at desc")
   : query("select id,email,national_id,full_name,role,status,created_at from users where id=$1",[req.user.id]),
  query("select r.role_key,r.title,r.description,r.is_system,r.is_active,count(u.id)::int user_count from identity_roles r left join users u on u.role=r.role_key group by r.role_key order by r.title"),
  query("select g.id,g.group_key,g.title,g.description,g.is_active,count(gm.user_id)::int member_count from identity_groups g left join identity_group_members gm on gm.group_id=g.id group by g.id order by g.title"),
  query("select gm.group_id,gm.user_id,u.full_name,u.email from identity_group_members gm join users u on u.id::text=gm.user_id order by gm.group_id,u.full_name"),
  query("select permission_key,title,module_key,action,description,is_active from identity_permissions order by module_key,permission_key"),
  query("select role_key,permission_key from identity_role_permissions where granted=true order by role_key,permission_key"),
  admin
   ? query("select id,user_id,ip_address,user_agent,started_at,last_seen_at,expires_at,revoked_at from security_sessions order by last_seen_at desc limit 100")
   : query("select id,user_id,ip_address,user_agent,started_at,last_seen_at,expires_at,revoked_at from security_sessions where user_id=$1 order by last_seen_at desc limit 100",[req.user.id]),
  admin
   ? query("select id,email,success,failure_reason,ip_address,occurred_at from security_login_events order by occurred_at desc limit 100")
   : query("select id,email,success,failure_reason,ip_address,occurred_at from security_login_events where user_id=$1 order by occurred_at desc limit 100",[req.user.id])
 ]);
 res.json({users:users.rows,roles:roles.rows,groups:groups.rows,members:members.rows,permissions:permissions.rows,grants:grants.rows,sessions:sessions.rows,logins:logins.rows,access:{canManageRoles:admin,canManageUsers:admin,canViewGlobalAudit:admin}});
});

router.post("/api/identity/users",requireAuth,guardWrite,requireCsrf,async(req:any,res)=>{
 const email=typeof req.body?.email==="string"?req.body.email.trim().toLowerCase():"";
 const fullName=typeof req.body?.fullName==="string"?req.body.fullName.trim():"";
 const role=typeof req.body?.role==="string"?req.body.role:"viewer";
 const status=typeof req.body?.status==="string"?req.body.status:"active";
 if(!email.includes("@")||!fullName)return res.status(400).json({error:"ایمیل و نام کاربر الزامی است"});
 if(!["active","pending","suspended"].includes(status))return res.status(400).json({error:"وضعیت حساب معتبر نیست"});
 if(!isAdmin(req)&&(role!=="viewer"||status!=="active"))return res.status(403).json({error:"تعیین نقش و وضعیت حساب فقط برای مدیر سامانه مجاز است"});
 const roleRow=await query("select 1 from identity_roles where role_key=$1 and is_active=true",[role]);
 if(!roleRow.rowCount)return res.status(400).json({error:"نقش انتخاب‌شده معتبر نیست"});
 const r=await query("update users set full_name=$1,role=$2,status=$3,updated_at=now() where lower(email)=lower($4) returning id,email,full_name,role,status,created_at",[fullName,role,status,email]);
 if(!r.rowCount)return res.status(404).json({error:"کاربر موجود نیست؛ ساخت حساب فقط از مسیر ثبت‌نام امن انجام می‌شود"});
 res.json(r.rows[0]);
});

router.patch("/api/identity/users/:id",requireAuth,guardWrite,requireCsrf,async(req:any,res)=>{
 if(!UUID.test(String(req.params.id)))return res.status(400).json({error:"شناسه کاربر معتبر نیست"});
 const {fullName,role,status}=req.body||{};
 const nationalIdRaw=req.body?.nationalId;
 const nationalId=nationalIdRaw===undefined?undefined:(typeof nationalIdRaw==="string"&&nationalIdRaw.trim()?nationalIdRaw.trim().replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))):null);
 if(nationalId!==undefined&&nationalId!==null&&!/^\d{10}$/.test(nationalId))return res.status(400).json({error:"کد ملی باید ۱۰ رقم باشد"});
 if(fullName!==undefined&&(typeof fullName!=="string"||!fullName.trim()))return res.status(400).json({error:"نام کاربر معتبر نیست"});
 if(!isAdmin(req)&&(role!==undefined||status!==undefined))return res.status(403).json({error:"تغییر نقش یا وضعیت حساب فقط برای مدیر سامانه مجاز است"});
 if(role!==undefined){if(typeof role!=="string")return res.status(400).json({error:"نقش معتبر نیست"});const x=await query("select 1 from identity_roles where role_key=$1 and is_active=true",[role]);if(!x.rowCount)return res.status(400).json({error:"نقش معتبر نیست"});}
 if(status!==undefined&&!["active","pending","suspended"].includes(status))return res.status(400).json({error:"وضعیت حساب معتبر نیست"});
 const r=await query("update users set full_name=coalesce($1,full_name),role=coalesce($2,role),status=coalesce($3,status),national_id=case when $4::boolean then $5 else national_id end,updated_at=now() where id=$6 returning id,email,national_id,full_name,role,status,created_at",[fullName?.trim()||null,role??null,status??null,nationalIdRaw!==undefined,nationalId??null,req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"کاربر پیدا نشد"});
 res.json(r.rows[0]);
});

router.post("/api/identity/roles",requireAuth,guardAdmin,requireCsrf,async(req:any,res)=>{
 const roleKey=typeof req.body?.roleKey==="string"?req.body.roleKey:"";
 const title=typeof req.body?.title==="string"?req.body.title.trim():"";
 const description=typeof req.body?.description==="string"?req.body.description.trim():"";
 if(!ROLE_KEY.test(roleKey)||!title)return res.status(400).json({error:"شناسه نقش یا عنوان نامعتبر است"});
 try{
  const r=await query("insert into identity_roles(role_key,title,description) values($1,$2,$3) returning *",[roleKey,title,description]);
  res.status(201).json(r.rows[0]);
 }catch(error:any){if(error?.code==="23505")return res.status(409).json({error:"این شناسه نقش قبلاً ثبت شده است"});throw error;}
});

router.post("/api/identity/groups",requireAuth,guardWrite,requireCsrf,async(req:any,res)=>{
 const groupKey=typeof req.body?.groupKey==="string"?req.body.groupKey:"";
 const title=typeof req.body?.title==="string"?req.body.title.trim():"";
 const description=typeof req.body?.description==="string"?req.body.description.trim():"";
 if(!ROLE_KEY.test(groupKey)||!title)return res.status(400).json({error:"شناسه گروه یا عنوان نامعتبر است"});
 try{
  const r=await query("insert into identity_groups(group_key,title,description) values($1,$2,$3) returning *",[groupKey,title,description]);
  res.status(201).json(r.rows[0]);
 }catch(error:any){if(error?.code==="23505")return res.status(409).json({error:"این شناسه گروه قبلاً ثبت شده است"});throw error;}
});

router.post("/api/identity/groups/:id/members",requireAuth,guardWrite,requireCsrf,async(req:any,res)=>{
 if(!/^\d+$/.test(String(req.params.id)))return res.status(400).json({error:"شناسه گروه معتبر نیست"});
 const userId=String(req.body?.userId||"");
 if(!UUID.test(userId))return res.status(400).json({error:"شناسه کاربر معتبر نیست"});
 const [group,user]=await Promise.all([
  query("select id from identity_groups where id=$1 and is_active=true",[req.params.id]),
  query("select id from users where id=$1",[userId])
 ]);
 if(!group.rowCount)return res.status(404).json({error:"گروه فعال پیدا نشد"});
 if(!user.rowCount)return res.status(404).json({error:"کاربر پیدا نشد"});
 const r=await query("insert into identity_group_members(group_id,user_id) values($1,$2) on conflict do nothing returning *",[req.params.id,userId]);
 res.status(201).json(r.rows[0]||{group_id:req.params.id,user_id:userId,alreadyMember:true});
});

router.delete("/api/identity/groups/:id/members/:userId",requireAuth,guardWrite,requireCsrf,async(req:any,res)=>{
 if(!/^\\d+$/.test(String(req.params.id))||!UUID.test(String(req.params.userId)))return res.status(400).json({error:"شناسه گروه یا کاربر معتبر نیست"});
 const r=await query("delete from identity_group_members where group_id=$1 and user_id=$2 returning group_id,user_id",[req.params.id,req.params.userId]);
 if(!r.rowCount)return res.status(404).json({error:"عضویت گروه پیدا نشد"});
 res.status(204).end();
});

router.put("/api/identity/roles/:roleKey/permissions",requireAuth,guardAdmin,requireCsrf,async(req:any,res)=>{
 const roleKey=String(req.params.roleKey||"");
 if(!ROLE_KEY.test(roleKey))return res.status(400).json({error:"شناسه نقش معتبر نیست"});
 if(!Array.isArray(req.body?.permissionKeys)||req.body.permissionKeys.some((x:unknown)=>typeof x!=="string"))return res.status(400).json({error:"فهرست مجوزها معتبر نیست"});
 const permissionKeys=[...new Set(req.body.permissionKeys as string[])];
 if(permissionKeys.length>500)return res.status(400).json({error:"تعداد مجوزها بیش از حد مجاز است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const role=await client.query("select 1 from identity_roles where role_key=$1 and is_active=true for update",[roleKey]);
  if(!role.rowCount){await client.query("rollback");return res.status(404).json({error:"نقش فعال پیدا نشد"});}
  if(permissionKeys.length){
   const known=await client.query("select permission_key from identity_permissions where permission_key=any($1::text[]) and is_active=true",[permissionKeys]);
   if(known.rowCount!==permissionKeys.length){await client.query("rollback");return res.status(400).json({error:"یک یا چند مجوز معتبر نیست یا غیرفعال است"});}
  }
  await client.query("delete from identity_role_permissions where role_key=$1",[roleKey]);
  if(permissionKeys.length)await client.query("insert into identity_role_permissions(role_key,permission_key,granted) select $1,permission_key,true from identity_permissions where permission_key=any($2::text[])",[roleKey,permissionKeys]);
  await client.query("commit");
  res.json({roleKey,permissionKeys});
 }catch(error){await client.query("rollback").catch(()=>{});throw error;}
 finally{client.release();}
});

router.post("/api/identity/sessions/:id/revoke",requireAuth,guardWrite,requireCsrf,async(req:any,res)=>{
 if(!UUID.test(String(req.params.id)))return res.status(400).json({error:"شناسه نشست معتبر نیست"});
 const r=isAdmin(req)
  ? await query("update security_sessions set revoked_at=now() where id=$1 and revoked_at is null returning id",[req.params.id])
  : await query("update security_sessions set revoked_at=now() where id=$1 and user_id=$2 and revoked_at is null returning id",[req.params.id,req.user?.id]);
 if(!r.rowCount)return res.status(404).json({error:"نشست فعال پیدا نشد یا اجازه لغو آن را ندارید"});
 res.status(204).end();
});

export {router as identityRouter};
