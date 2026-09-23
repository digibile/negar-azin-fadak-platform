import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {Request,Response,NextFunction} from "express";
import {query} from "./db.js";
const secret=process.env.JWT_SECRET||"development-only-change-me";
export type AuthUser={id:string,email:string,role:string};
export function sign(user:AuthUser){return jwt.sign(user,secret,{expiresIn:"8h"});}
export async function hashPassword(value:string){return bcrypt.hash(value,12);}
export async function verifyPassword(value:string,hash:string){return bcrypt.compare(value,hash);}
export function requireAuth(req:Request,res:Response,next:NextFunction){
  const header=req.headers.authorization;
  if(!header?.startsWith("Bearer ")) return res.status(401).json({error:"احراز هویت لازم است"});
  try{(req as any).user=jwt.verify(header.slice(7),secret) as AuthUser;next();}
  catch{return res.status(401).json({error:"نشست نامعتبر یا منقضی شده است"});}
}
export async function ensureAdmin(email:string,password:string){
  const found=await query("select id from users where email=$1",[email]);
  if(found.rowCount) return;
  const hash=await hashPassword(password);
  await query("insert into users(email,password_hash,full_name,role) values($1,$2,$3,'admin')",[email,hash,"مدیر سامانه"]);
}