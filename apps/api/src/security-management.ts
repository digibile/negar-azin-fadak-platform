import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requirePermission,requireCsrf} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";
const router=Router();
router.get("/api/security/overview",requireAuth,requirePermission("users:manage"),async(req,res)=>{
 const t=await resolveTenant(req,(req as any).user); if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const [users,roles,sessions,logins,policies]=await Promise.all([
  query("select id,email,full_name,role,status,created_at from users order by created_at desc"),
  query("select role,count(*)::int user_count from users group by role order by role"),
  query("select id,user_id,ip_address,user_agent,started_at,last_seen_at,expires_at,revoked_at from security_sessions where tenant_id=$1 order by last_seen_at desc limit 100",[t.id]),
  query("select id,email,success,failure_reason,ip_address,occurred_at from security_login_events where tenant_id=$1 order by occurred_at desc limit 100",[t.id]),
  query("select * from security_policies where tenant_id=$1 order by policy_key",[t.id])
 ]);
 res.json({users:users.rows,roles:roles.rows,sessions:sessions.rows,logins:logins.rows,policies:policies.rows});
});
router.patch("/api/security/users/:id",requireAuth,requirePermission("users:manage"),requireCsrf,async(req,res)=>{
 const {fullName,role,status}=req.body||{};
 const r=await query("update users set full_name=coalesce($1,full_name),role=coalesce($2,role),status=coalesce($3,status) where id=$4 returning id,email,full_name,role,status,created_at",[fullName,role,status,req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"کاربر پیدا نشد"});res.json(r.rows[0]);
});
router.post("/api/security/sessions/:id/revoke",requireAuth,requirePermission("users:manage"),requireCsrf,async(req,res)=>{
 const r=await query("update security_sessions set revoked_at=now() where id=$1 and revoked_at is null returning id",[req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"نشست فعال پیدا نشد"});res.status(204).end();
});
router.put("/api/security/policies/:key",requireAuth,requirePermission("users:manage"),requireCsrf,async(req,res)=>{
 const t=await resolveTenant(req,(req as any).user);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const title=String(req.body?.title||req.params.key),enabled=Boolean(req.body?.enabled),config=req.body?.config||{};
 const r=await query("insert into security_policies(tenant_id,policy_key,title,enabled,config) values($1,$2,$3,$4,$5) on conflict(tenant_id,policy_key) do update set title=excluded.title,enabled=excluded.enabled,config=excluded.config,updated_at=now() returning *",[t.id,req.params.key,title,enabled,config]);
 res.json(r.rows[0]);
});
export {router as securityManagementRouter};