import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {randomBytes} from "node:crypto";
import {Request,Response,NextFunction} from "express";
import {query} from "./db.js";
const secret=process.env.JWT_SECRET||"development-only-change-me";
const isProduction=process.env.NODE_ENV==="production";
const cookieOptions=`Path=/; HttpOnly; SameSite=${process.env.COOKIE_SAMESITE||"Lax"}${isProduction?"; Secure":""}`;
const csrfOptions=`Path=/; SameSite=${process.env.COOKIE_SAMESITE||"Lax"}${isProduction?"; Secure":""}`;
export type AuthUser={id:string,email:string,role:string};
declare global { namespace Express { interface Request { user?: AuthUser } } }
export function sign(user:AuthUser){return jwt.sign(user,secret,{expiresIn:"8h"});}
export function hashPassword(value:string){return bcrypt.hash(value,12);}
export function verifyPassword(value:string,hash:string){return bcrypt.compare(value,hash);}
export function issueSession(res:Response,user:AuthUser){
 const token=sign(user);
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
export function requireAuth(req:Request,res:Response,next:NextFunction){
 const bearer=req.headers.authorization?.startsWith("Bearer ")?req.headers.authorization.slice(7):undefined;
 const token=bearer||readCookie(req,"naf_auth");
 if(!token)return res.status(401).json({error:"احراز هویت لازم است"});
 try{(req as any).user=jwt.verify(token,secret) as AuthUser;next();}catch{return res.status(401).json({error:"نشست نامعتبر یا منقضی شده است"});}
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
 const found=await query("select id from users where email=$1",[email.toLowerCase()]);
 if(found.rowCount)return;
 const hash=await hashPassword(password);
 await query("insert into users(email,password_hash,full_name,role) values($1,$2,$3,'admin')",[email.toLowerCase(),hash,"مدیر سامانه"]);
}