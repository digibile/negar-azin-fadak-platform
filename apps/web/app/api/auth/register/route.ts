import {NextResponse} from "next/server";

export async function POST(request:Request){
 let input:{email?:unknown;fullName?:unknown;password?:unknown;humanCheck?:unknown;humanAnswer?:unknown};
 try{input=await request.json();}catch{return NextResponse.json({error:"درخواست ثبت‌نام نامعتبر است"},{status:400});}
 const base=process.env.API_INTERNAL_URL||"http://api:4000";
 let upstream:Response;
 try{
  upstream=await fetch(base+"/api/auth/register",{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({email:String(input.email??""),fullName:String(input.fullName??""),password:String(input.password??""),humanCheck:String(input.humanCheck??""),humanAnswer:String(input.humanAnswer??"")}),
   cache:"no-store"
  });
 }catch{return NextResponse.json({error:"سرویس ثبت‌نام موقتاً در دسترس نیست"},{status:503});}
 const data=await upstream.json().catch(()=>({error:"پاسخ سرویس ثبت‌نام نامعتبر است"}));
 const response=NextResponse.json(data,{status:upstream.status});
 for(const cookie of upstream.headers.getSetCookie?.()||[])response.headers.append("set-cookie",cookie);
 response.headers.set("cache-control","no-store");
 return response;
}
