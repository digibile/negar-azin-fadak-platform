export const API_URL=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
function csrf(){return typeof document==="undefined"?null:document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||null;}
export async function api<T>(path:string,options:RequestInit={}){
 const headers=new Headers(options.headers);
 if(options.body) headers.set("Content-Type","application/json");
 const token=csrf(); if(token)headers.set("X-CSRF-Token",token);
 const res=await fetch(API_URL+path,{...options,headers,credentials:"include"});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(data.error||"خطا در ارتباط با سرویس");
 return data as T;
}