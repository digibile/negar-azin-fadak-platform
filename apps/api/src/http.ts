import {Request,Response,NextFunction} from "express";
import {ZodError} from "zod";
export function asyncHandler(fn:(req:Request,res:Response,next:NextFunction)=>Promise<unknown>){return (req:Request,res:Response,next:NextFunction)=>Promise.resolve(fn(req,res,next)).catch(next);}
export function notFound(_req:Request,res:Response){res.status(404).json({error:"مسیر پیدا نشد"});}
export function errorHandler(error:unknown,_req:Request,res:Response,_next:NextFunction){
 if(res.headersSent)return;
 // Invalid request data is a client error, not a server failure.
 if(error instanceof ZodError){
  console.warn("Request validation failed:",error.issues.map(issue=>({path:issue.path,message:issue.message})));
  return res.status(400).json({error:"اطلاعات ارسالی معتبر نیست؛ فیلدهای لازم را بررسی کنید"});
 }
 // Invalid JSON must not be reported as an internal server error.
 if(error instanceof SyntaxError && error!==null && typeof error==="object" && "body" in error){
  return res.status(400).json({error:"ساختار JSON درخواست نامعتبر است"});
 }
 const status=(error as {status?:number;statusCode?:number})?.status??(error as {statusCode?:number})?.statusCode??500;
 if(status>=500)console.error(error);
 const message=error instanceof Error?error.message:"خطای داخلی سرویس";
 return res.status(status).json({error:status>=500?"خطای داخلی سرویس":message});
}