import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {randomBytes,randomUUID} from "node:crypto";
import {Request,Response,NextFunction} from "express";
import {query} from "./db.js";
const secret=process.env.JWT_SECRET||"development-only-change-me";
const isProduction=process.env.NODE_ENV==="production";
const cookieOptions=`Path=/; HttpOnly; SameSite=${process.env.COOKIE_SAMESITE||"Lax"}${isProduction?"; Secure":""}`;
const csrfOptions=`Path=/; SameSite=${process.env.COOKIE_SAMESITE||"Lax"}${isProduction?"; Secure":""}`;
export type AuthUser={id:string,email:string,role:string,sessionId?:string};
declare global { namespace Express { interface Request { user?: AuthUser } } }
export function sign(user:AuthUser,sessionId:string){return jwt.sign({...user,sid:sessionId},secret,{expiresIn:"8h"});}
export function hashPassword(value:string){return bcrypt.hash(value,12);}
export function verifyPassword(value:string,hash:string){return bcrypt.compare(value,hash);}
export async function issueSession(req:Request,res:Response,user:AuthUser){
 const sessionId=randomUUID();
 const agent=String(req.headers["user-agent"]||"").slice(0,1000)||null;
 await query("insert into security_sessions(id,user_id,ip_address,user_agent,expires_at) values($1,$2,$3::inet,$4,now()+interval '8 hours')",[sessionId,user.id,req.ip||null,agent]);
 const token=sign(user,sessionId);
 const csrf=randomBytes(32).toString("hex");
 res.setHeader("Set-Cookie",[`naf_auth=${token}; ${cookieOptions}`,`naf_csrf=${csrf}; ${csrfOptions}`]);
}
export function clearSession(res:Response){
 res.setHeader("Set-Cookie",[`naf_auth=; ${cookieOptions}; Max-Age=0`,`naf_csrf=; ${csrfOptions}; Max-Age=0`]);
}
function readCookie(req:Request,name:string){
 const raw=req.headers.cookie||"";
 return raw.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1);
}
export async function requireAuth(req:Request,res:Response,next:NextFunction){
 const bearer=req.headers.authorization?.startsWith("Bearer ")?req.headers.authorization.slice(7):undefined;
 const token=bearer||readCookie(req,"naf_auth");
 if(!token)return res.status(401).json({error:"احراز هویت لازم است"});
 try{
  const claims=jwt.verify(token,secret) as AuthUser&{sid?:string};
  if(!claims.id||!claims.sid)return res.status(401).json({error:"نشست معتبر نیست؛ دوباره وارد شوید"});
  const active=await query("select u.id,u.email,u.role from users u join security_sessions s on s.user_id=u.id where u.id=$1 and s.id=$2 and s.revoked_at is null and (s.expires_at is null or s.expires_at>now()) and u.status='active'",[claims.id,claims.sid]);
  if(!active.rowCount)return res.status(401).json({error:"نشست لغو شده، منقضی یا حساب غیرفعال است"});
  (req as any).user={id:active.rows[0].id,email:active.rows[0].email,role:active.rows[0].role,sessionId:claims.sid};
  await query("update security_sessions set last_seen_at=now() where id=$1",[claims.sid]);
  next();
 }catch(error){
  if((error as any)?.name==="JsonWebTokenError"||(error as any)?.name==="TokenExpiredError")return res.status(401).json({error:"نشست نامعتبر یا منقضی شده است"});
  next(error);
 }
}
export function requireCsrf(req:Request,res:Response,next:NextFunction){
 if(["GET","HEAD","OPTIONS"].includes(req.method))return next();
 const cookie=readCookie(req,"naf_csrf"),header=req.headers["x-csrf-token"];
 if(!cookie||typeof header!=="string"||cookie!==header)return res.status(403).json({error:"درخواست امن نیست"});
 next();
}
export function requirePermission(permission:string){
 return async(req:Request,res:Response,next:NextFunction)=>{
  const user=(req as any).user as AuthUser|undefined;
  if(!user)return res.status(401).json({error:"احراز هویت لازم است"});
  if(user.role==="admin")return next();
  try{const r=await query("select 1 from role_permissions where role=$1 and permission=$2",[user.role,permission]);if(!r.rowCount)return res.status(403).json({error:"دسترسی کافی نیست"});next();}catch(error){next(error);}
 };
}
export const requireAdmin=requirePermission("users:manage");
export async function ensureAdmin(email:string,password:string){
 const normalizedEmail=email.trim().toLowerCase();
 if(!normalizedEmail||!password)throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required for admin bootstrap");
 const hash=await hashPassword(password);
 const found=await query("select id from users where lower(email)=$1 order by created_at asc limit 1",[normalizedEmail]);
 if(found.rowCount){
  await query("update users set email=$1,password_hash=$2,full_name=$3,role='admin',status='active' where id=$4",[normalizedEmail,hash,"مدیر سامانه",found.rows[0].id]);
  return;
 }
 await query("insert into users(email,password_hash,full_name,role,status) values($1,$2,$3,'admin','active')",[normalizedEmail,hash,"مدیر سامانه"]);
}