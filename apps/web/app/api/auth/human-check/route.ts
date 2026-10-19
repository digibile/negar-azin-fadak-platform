import {NextResponse} from "next/server";

export async function GET(){
 const base=process.env.API_INTERNAL_URL||"http://api:4000";
 let upstream:Response;
 try{
  upstream=await fetch(base+"/api/auth/human-check",{method:"GET",cache:"no-store"});
 }catch{
  return NextResponse.json({error:"تأیید انسانی موقتاً در دسترس نیست"},{status:503});
 }
 const data=await upstream.json().catch(()=>({error:"پاسخ تأیید انسانی نامعتبر است"}));
 return NextResponse.json(data,{status:upstream.status,headers:{"cache-control":"no-store, max-age=0"}});
}
