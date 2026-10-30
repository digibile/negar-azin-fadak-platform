import {Router} from "express";
import {createHash} from "node:crypto";
import {isValidIranianNationalCode,normalizeIranianDigits} from "./iranian-validation.js";
import {pool,query} from "./db.js";
import {requireAuth,requireCsrf} from "./auth.js";

const router=Router();
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLE_KEY=/^[a-z][a-z0-9_-]{1,40}$/;
const hashProfileValue=(value:unknown)=>createHash("sha256").update(String(value??""),"utf8").digest("hex");
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
 const nationalId=nationalIdRaw===undefined?undefined:(typeof nationalIdRaw==="string"&&nationalIdRaw.trim()?normalizeIranianDigits(nationalIdRaw.trim()).replace(/\D/g,""):null);
 if(nationalId!==undefined&&nationalId!==null&&!isValidIranianNationalCode(nationalId))return res.status(400).json({error:"کد ملی معتبر نیست"});
 if(fullName!==undefined&&(typeof fullName!=="string"||fullName.trim().length<2||fullName.trim().length>160))return res.status(400).json({error:"نام کاربر معتبر نیست"});
 if(!isAdmin(req)){
  if(String(req.params.id)!==String(req.user.id))return res.status(403).json({error:"ویرایش حساب دیگران مجاز نیست"});
  if(fullName!==undefined||nationalIdRaw!==undefined)return res.status(409).json({error:"تغییر اطلاعات قانونی باید از مسیر درخواست اصلاح پروفایل و تأیید مدیر انجام شود"});
 }
 if(!isAdmin(req)&&(role!==undefined||status!==undefined))return res.status(403).json({error:"تغییر نقش یا وضعیت حساب فقط برای مدیر سامانه مجاز است"});
 if(role!==undefined){if(typeof role!=="string")return res.status(400).json({error:"نقش معتبر نیست"});const x=await query("select 1 from identity_roles where role_key=$1 and is_active=true",[role]);if(!x.rowCount)return res.status(400).json({error:"نقش معتبر نیست"});}
 if(status!==undefined&&![ "active","pending","suspended"].includes(status))return res.status(400).json({error:"وضعیت حساب معتبر نیست"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const old=await client.query("select id,email,full_name,national_id,role,status from users where id=$1 for update",[req.params.id]);
  if(!old.rowCount){await client.query("rollback");return res.status(404).json({error:"کاربر پیدا نشد"});}
  const r=await client.query("update users set full_name=coalesce($1,full_name),role=coalesce($2,role),status=coalesce($3,status),national_id=case when $4::boolean then $5 else national_id end,updated_at=now() where id=$6 returning id,email,national_id,full_name,role,status,created_at",[fullName?.trim()||null,role??null,status??null,nationalIdRaw!==undefined,nationalId??null,req.params.id]);
  const before={fullName:old.rows[0].full_name,nationalId:old.rows[0].national_id,role:old.rows[0].role,status:old.rows[0].status};
  const after={fullName:r.rows[0].full_name,nationalId:r.rows[0].national_id,role:r.rows[0].role,status:r.rows[0].status};
  if(isAdmin(req)){
   for(const [key,value] of [["full_name",r.rows[0].full_name],["national_id",r.rows[0].national_id]] as const){
    if(before[key==="full_name"?"fullName":"nationalId"]!==value){
     await client.query("insert into identity_profile_field_provenance(user_id,field_key,source_type,value_hash,source_reference,confidence,verified_by,verified_at,updated_at) values($1,$2,'reviewer_approved',$3,'identity_admin_update',1,$4,now(),now()) on conflict(user_id,field_key) do update set source_type='reviewer_approved',value_hash=excluded.value_hash,source_reference=excluded.source_reference,confidence=1,verified_by=excluded.verified_by,verified_at=now(),updated_at=now()",[req.params.id,key,hashProfileValue(value),req.user.id]);
    }
   }
   await client.query("insert into identity_profile_change_events(request_id,user_id,actor_user_id,event_type,before_values,after_values,note) values(null,$1,$2,'admin_update',$3,$4,'اصلاح مستقیم توسط مدیر سامانه')",[req.params.id,req.user.id,before,after]);
  }
  await client.query("commit");
  res.json(r.rows[0]);
 }catch(error:any){
  await client.query("rollback");
  if(error?.code==="23505")return res.status(409).json({error:"کد ملی انتخاب‌شده قبلاً به حساب دیگری اختصاص یافته است"});
  throw error;
 }finally{client.release();}
});

router.get("/api/identity/profile",requireAuth,async(req:any,res)=>{
 const user=await query("select id,email,full_name,national_id,role,status,created_at,updated_at from users where id=$1 and status='active'",[req.user.id]);
 if(!user.rowCount)return res.status(404).json({error:"پروفایل فعال پیدا نشد"});
 const [provenance,pending]=await Promise.all([
  query("select field_key,source_type,source_reference,confidence,verified_by,verified_at,updated_at from identity_profile_field_provenance where user_id=$1 order by field_key",[req.user.id]),
  query("select id,proposed_values,reason,status,created_at from identity_profile_change_requests where user_id=$1 and status='pending' order by created_at desc limit 1",[req.user.id])
 ]);
 res.json({user:user.rows[0],provenance:provenance.rows,pendingRequest:pending.rows[0]||null});
});

router.get("/api/identity/profile-change-requests",requireAuth,async(req:any,res)=>{
 const r=isAdmin(req)
  ? await query("select r.*,u.email,u.full_name,u.national_id from identity_profile_change_requests r join users u on u.id=r.user_id order by case when r.status='pending' then 0 else 1 end,r.created_at desc limit 200")
  : await query("select * from identity_profile_change_requests where user_id=$1 order by created_at desc limit 50",[req.user.id]);
 res.json({items:r.rows,total:r.rowCount});
});

router.post("/api/identity/profile-change-requests",requireAuth,requireCsrf,async(req:any,res)=>{
 const body=req.body||{},proposed:Record<string,string|null>={},before:Record<string,string|null>={};
 if(body.fullName!==undefined){
  if(typeof body.fullName!=="string"||body.fullName.trim().length<2||body.fullName.trim().length>160)return res.status(400).json({error:"نام و نام خانوادگی باید بین ۲ تا ۱۶۰ نویسه باشد"});
  proposed.fullName=body.fullName.trim();
 }
 if(body.nationalId!==undefined){
  if(typeof body.nationalId!=="string")return res.status(400).json({error:"کد ملی معتبر نیست"});
  const normalized=normalizeIranianDigits(body.nationalId.trim()).replace(/\D/g,"");
  if(normalized&&!isValidIranianNationalCode(normalized))return res.status(400).json({error:"کد ملی معتبر نیست"});
  proposed.nationalId=normalized||null;
 }
 if(!Object.keys(proposed).length)return res.status(400).json({error:"حداقل یک فیلد هویتی برای اصلاح لازم است"});
 const reason=typeof body.reason==="string"?body.reason.trim():"";
 if(reason.length<10||reason.length>1000)return res.status(400).json({error:"دلیل درخواست باید بین ۱۰ تا ۱۰۰۰ نویسه باشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const current=await client.query("select id,full_name,national_id from users where id=$1 and status='active' for update",[req.user.id]);
  if(!current.rowCount){await client.query("rollback");return res.status(404).json({error:"حساب فعال پیدا نشد"});}
  if(Object.prototype.hasOwnProperty.call(proposed,"fullName")){
   before.fullName=current.rows[0].full_name;
   if(proposed.fullName===before.fullName){await client.query("rollback");return res.status(409).json({error:"نام واردشده با اطلاعات فعلی تفاوتی ندارد"});}
  }
  if(Object.prototype.hasOwnProperty.call(proposed,"nationalId")){
   before.nationalId=current.rows[0].national_id;
   if(proposed.nationalId===before.nationalId){await client.query("rollback");return res.status(409).json({error:"کد ملی واردشده با اطلاعات فعلی تفاوتی ندارد"});}
  }
  const created=await client.query("insert into identity_profile_change_requests(user_id,requested_by,before_values,proposed_values,reason) values($1,$2,$3,$4,$5) returning *",[req.user.id,req.user.id,before,proposed,reason]);
  await client.query("insert into identity_profile_change_events(request_id,user_id,actor_user_id,event_type,before_values,after_values,note) values($1,$2,$3,'requested',$4,$5,$6)",[created.rows[0].id,req.user.id,req.user.id,before,proposed,reason]);
  await client.query("commit");
  res.status(201).json(created.rows[0]);
 }catch(error:any){
  await client.query("rollback");
  if(error?.code==="23505")return res.status(409).json({error:"برای این حساب یک درخواست تغییر اطلاعات در انتظار بررسی وجود دارد"});
  throw error;
 }finally{client.release();}
});

router.patch("/api/identity/profile-change-requests/:id/review",requireAuth,guardAdmin,requireCsrf,async(req:any,res)=>{
 if(!UUID.test(String(req.params.id)))return res.status(400).json({error:"شناسه درخواست معتبر نیست"});
 const decision=req.body?.decision;
 const note=typeof req.body?.note==="string"?req.body.note.trim():"";
 if(!["approved","rejected"].includes(decision))return res.status(400).json({error:"تصمیم بررسی معتبر نیست"});
 if(decision==="rejected"&&note.length<5)return res.status(400).json({error:"برای رد درخواست، دلیل حداقل ۵ نویسه‌ای لازم است"});
 if(note.length>1000)return res.status(400).json({error:"یادداشت بررسی بیش از حد مجاز است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const request=await client.query("select * from identity_profile_change_requests where id=$1 for update",[req.params.id]);
  if(!request.rowCount){await client.query("rollback");return res.status(404).json({error:"درخواست تغییر اطلاعات پیدا نشد"});}
  const item=request.rows[0];
  if(item.status!=="pending"){await client.query("rollback");return res.status(409).json({error:"این درخواست قبلاً تعیین تکلیف شده است"});}
  const user=await client.query("select id,full_name,national_id from users where id=$1 for update",[item.user_id]);
  if(!user.rowCount){await client.query("rollback");return res.status(404).json({error:"حساب کاربری درخواست پیدا نشد"});}
  const before=(item.before_values||{}) as Record<string,unknown>;
  const proposed=(item.proposed_values||{}) as Record<string,unknown>;
  for(const [key,column] of [["fullName","full_name"],["nationalId","national_id"]] as const){
   if(Object.prototype.hasOwnProperty.call(before,key)&&user.rows[0][column]!==before[key]){
    await client.query("rollback");
    return res.status(409).json({error:"اطلاعات حساب پس از ثبت درخواست تغییر کرده است؛ درخواست قدیمی قابل اعمال نیست"});
   }
  }
  if(decision==="approved"){
   const hasName=Object.prototype.hasOwnProperty.call(proposed,"fullName");
   const hasNationalId=Object.prototype.hasOwnProperty.call(proposed,"nationalId");
   await client.query("update users set full_name=case when $2 then $3 else full_name end,national_id=case when $4 then $5 else national_id end,updated_at=now() where id=$1",[item.user_id,hasName,proposed.fullName??null,hasNationalId,proposed.nationalId??null]);
   for(const [key,value] of Object.entries(proposed)){
    const fieldKey=key==="fullName"?"full_name":key==="nationalId"?"national_id":null;
    if(!fieldKey)continue;
    await client.query("insert into identity_profile_field_provenance(user_id,field_key,source_type,value_hash,source_reference,confidence,verified_by,verified_at,updated_at) values($1,$2,'reviewer_approved',$3,$4,1,$5,now(),now()) on conflict(user_id,field_key) do update set source_type='reviewer_approved',value_hash=excluded.value_hash,source_reference=excluded.source_reference,confidence=1,verified_by=excluded.verified_by,verified_at=now(),updated_at=now()",[item.user_id,fieldKey,hashProfileValue(value),String(item.id),req.user.id]);
   }
  }
  const updated=await client.query("update identity_profile_change_requests set status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3,updated_at=now() where id=$4 returning *",[decision,req.user.id,note||null,item.id]);
  await client.query("insert into identity_profile_change_events(request_id,user_id,actor_user_id,event_type,before_values,after_values,note) values($1,$2,$3,$4,$5,$6,$7)",[item.id,item.user_id,req.user.id,decision,before,proposed,note||null]);
  await client.query("commit");
  res.json(updated.rows[0]);
 }catch(error:any){
  await client.query("rollback");
  if(error?.code==="23505")return res.status(409).json({error:"کد ملی انتخاب‌شده قبلاً به حساب دیگری اختصاص یافته است"});
  throw error;
 }finally{client.release();}
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
