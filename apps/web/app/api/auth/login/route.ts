import {NextResponse} from "next/server";

function publicOrigin(request:Request){
 const forwardedHost=request.headers.get("x-forwarded-host");
 const forwardedProto=request.headers.get("x-forwarded-proto");
 if(forwardedHost)return `${forwardedProto||"https"}://${forwardedHost}`;
 const codespace=process.env.CODESPACE_NAME;
 if(codespace)return `https://${codespace}-3000.app.github.dev`;
 const publicUrl=process.env.NEXT_PUBLIC_APP_URL;
 if(publicUrl)return publicUrl.replace(/\/$/,"");
 const host=request.headers.get("host")||"localhost:3000";
 return `http://${host}`;
}

export async function POST(request:Request){
 const form=await request.formData();
 const base=process.env.API_INTERNAL_URL||"http://api:4000";
 const upstream=await fetch(base+"/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
  email:String(form.get("email")||""),
  password:String(form.get("password")||""),
  humanCheck:String(form.get("humanCheck")||""),
  humanAnswer:String(form.get("humanAnswer")||"")
 }),cache:"no-store"});
 const origin=publicOrigin(request);
 if(!upstream.ok){
  const data=await upstream.json().catch(()=>({error:"ورود ناموفق بود"}));
  const url=new URL("/login",origin);url.searchParams.set("error",String(data.error||"ورود ناموفق بود"));
  return NextResponse.redirect(url,303);
 }
 const response=NextResponse.redirect(new URL("/admin",origin),303);
 const cookies=upstream.headers.getSetCookie?.()||[];
 for(const cookie of cookies)response.headers.append("set-cookie",cookie);
 return response;
}
