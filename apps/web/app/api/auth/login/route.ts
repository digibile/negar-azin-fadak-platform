import {NextResponse} from "next/server";

export async function POST(request:Request){
 const form=await request.formData();
 const base=process.env.API_INTERNAL_URL||"http://api:4000";
 const upstream=await fetch(base+"/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
  email:String(form.get("email")||""),
  password:String(form.get("password")||""),
  humanCheck:String(form.get("humanCheck")||""),
  humanAnswer:String(form.get("humanAnswer")||"")
 }),cache:"no-store"});
 if(!upstream.ok){
  const data=await upstream.json().catch(()=>({error:"ورود ناموفق بود"}));
  const url=new URL("/login",request.url);url.searchParams.set("error",String(data.error||"ورود ناموفق بود"));
  return NextResponse.redirect(url,303);
 }
 const response=NextResponse.redirect(new URL("/admin",request.url),303);
 const cookies=upstream.headers.getSetCookie?.()||[];
 for(const cookie of cookies)response.headers.append("set-cookie",cookie);
 return response;
}
