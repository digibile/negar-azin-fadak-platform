import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {Request,Response,NextFunction} from "express";
import {query} from "./db.js";
const secret=process.env.JWT_SECRET||"development-only-change-me";
export type AuthUser={id:string,email:string,role:string};
export function sign(user:AuthUser){return jwt.sign(user,secret,{expiresIn:"8h"});}
export function hashPassword(value:string){return bcrypt.hash(value,12);}
export function verifyPassword(value:string,hash:string){return bcrypt.compare(value,hash);}
export function requireAuth(req:Request,res:Response,next:NextFunction){
 const header=req.headers.authorization;
 if(!header?.startsWith("Bearer ")) return res.status(401).json({error:"احراز هویت لازم است"});
 try{(req as any).user=jwt.verify(header.slice(7),secret) as AuthUser;next();}catch{return res.status(401).json({error:"نشست نامعتبر یا منقضی شده است"});}
}
export function requirePermission(permission:string){
 return async(req:Request,res:Response,next:NextFunction)=>{
  const user=(req as any).user as AuthUser|undefined;
  if(!user)return res.status(401).json({error:"احراز هویت لازم است"});
  if(user.role==="admin")return next();
  try{
   const r=await query("select 1 from role_permissions where role=$1 and permission=$2",[user.role,permission]);
   if(!r.rowCount)return res.status(403).json({error:"دسترسی کافی نیست"});
   next();
  }catch(error){next(error);}
 };
}
export const requireAdmin=requirePermission("users:manage");
export async function ensureAdmin(email:string,password:string){
 const found=await query("select id from users where email=$1",[email.toLowerCase()]);
 if(found.rowCount)return;
 const hash=await hashPassword(password);
 await query("insert into users(email,password_hash,full_name,role) values($1,$2,$3,'admin')",[email.toLowerCase(),hash,"مدیر سامانه"]);
}