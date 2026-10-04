"use client";

import {useEffect,useState} from "react";

const api=(process.env.NEXT_PUBLIC_API_BASE_URL||"").replace(/\/$/,"");
const modules=[
 ["documentation","مستندات و دبیرخانه","/api/domain/documentation"],
 ["api-integration","یکپارچه‌سازی API","/api/domain/api-integration"],
 ["infrastructure-data","زیرساخت و داده","/api/domain/infrastructure-data"],
 ["mobile-app","اپلیکیشن موبایل","/api/domain/mobile-app"],
 ["quality-lifecycle","کیفیت و چرخه عمر","/api/domain/quality-lifecycle"],
 ["monitoring-events","پایش رویدادها","/api/domain/monitoring-events"],
 ["command-center","فرمان‌ها","/api/domain/command-center"],
 ["audit-control","حسابرسی","/api/domain/audit-control"]
] as const;

export default function PlatformControlPage(){
 const [stats,setStats]=useState<Record<string,number>>({});
 const [error,setError]=useState("");
 useEffect(()=>{
  Promise.all(modules.map(async([code])=>{
   const r=await fetch(api+"/api/domain/"+code,{credentials:"include"});
   if(!r.ok)throw new Error("دریافت اطلاعات مرکز کنترل ناموفق بود");
   const b=await r.json();
   return [code,Array.isArray(b.items)?b.items.length:0] as const;
  })).then(x=>setStats(Object.fromEntries(x))).catch(e=>setError(e instanceof Error?e.message:"خطای ارتباط"));
 },[]);
 return <main dir="rtl" className="command-page">
  <header className="command-hero"><div><span className="eyebrow">مرکز مدیریت نگار آذین فدک</span><h1>کنترل و عملیات پلتفرم</h1><p>نمای عملیاتی ماژول‌های فرمان، داده، یکپارچه‌سازی، موبایل و کیفیت.</p></div><a className="command-link" href="/command-center/">مرکز فرماندهی</a></header>
  {error&&<div className="command-error">{error}</div>}
  <section className="control-grid">{modules.map(([code,title])=><a className="control-card" href={"/modules/?code="+code} key={code}><div><span>{code}</span><h2>{title}</h2></div><strong>{stats[code]??"…"}</strong><small>رکورد عملیاتی</small></a>)}</section>
 </main>;
}
