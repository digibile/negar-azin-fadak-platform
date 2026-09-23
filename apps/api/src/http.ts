import {Request,Response,NextFunction} from "express";
export function asyncHandler(fn:(req:Request,res:Response,next:NextFunction)=>Promise<unknown>){return (req:Request,res:Response,next:NextFunction)=>Promise.resolve(fn(req,res,next)).catch(next);}
export function notFound(_req:Request,res:Response){res.status(404).json({error:"مسیر پیدا نشد"});}
export function errorHandler(error:unknown,_req:Request,res:Response,_next:NextFunction){
 console.error(error);
 if(res.headersSent)return;
 const message=error instanceof Error?error.message:"خطای داخلی سرویس";
 const status=(error as {status?:number})?.status??500;
 res.status(status).json({error:status>=500?"خطای داخلی سرویس":message});
}