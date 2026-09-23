export const API_URL=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
export async function api<T>(path:string,options:RequestInit={}){
 const token=typeof window!=="undefined"?localStorage.getItem("naf_token"):null;
 const headers=new Headers(options.headers);
 if(options.body) headers.set("Content-Type","application/json");
 if(token) headers.set("Authorization","Bearer "+token);
 const res=await fetch(API_URL+path,{...options,headers});
 const data=await res.json().catch(()=>({}));
 if(!res.ok) throw new Error(data.error||"خطا در ارتباط با سرویس");
 return data as T;
}