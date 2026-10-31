import {NextResponse} from "next/server";

export async function POST(request:Request){
 let input:{method?:unknown;identifier?:unknown;phone?:unknown;code?:unknown};
 try{input=await request.json();}catch{return NextResponse.json({error:"درخواست نامعتبر است"},{status:400});}
 const method=input.method==="email"?"email":input.method==="nationalId"?"nationalId":"mobile";
 const identifier=String(input.identifier??input.phone??"");
 const base=process.env.API_INTERNAL_URL||"http://api:4000";
 let upstream:Response;
 try{
  upstream=await fetch(base+"/api/auth/otp/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({method,identifier,code:String(input.code||"")}),cache:"no-store"});
 }catch{return NextResponse.json({error:"سرویس تأیید کد ورود موقتاً در دسترس نیست"},{status:503});}
 const data=await upstream.json().catch(()=>({error:"پاسخ سرویس ورود نامعتبر است"}));
 const response=NextResponse.json(data,{status:upstream.status});
 for(const cookie of upstream.headers.getSetCookie?.()||[])response.headers.append("set-cookie",cookie);
 response.headers.set("cache-control","no-store");
 return response;
}
