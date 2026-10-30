export const API_URL = "";

function cookieValue(name:string){
  if(typeof document==="undefined") return null;
  const prefix=name+"=";
  return document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(prefix))?.slice(prefix.length)||null;
}

function csrf(){
  return cookieValue("naf_csrf");
}

function activeTenant(){
  return cookieValue("naf_tenant_id");
}

export async function api<T>(path:string,options:RequestInit={}){
  const headers=new Headers(options.headers);
  if(options.body && !headers.has("Content-Type")) headers.set("Content-Type","application/json");
  const token=csrf();
  if(token) headers.set("X-CSRF-Token",token);
  const tenantId=activeTenant();
  if(tenantId) headers.set("X-Tenant-ID",decodeURIComponent(tenantId));

  const target=path.startsWith("/")?path:`/${path}`;
  const res=await fetch(target,{...options,headers,credentials:"include"});
  const data=await res.json().catch(()=>({}));

  if(!res.ok) throw new Error(data.error||"خطا در ارتباط با سرویس");
  return data as T;
}
