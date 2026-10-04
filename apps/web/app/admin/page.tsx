"use client";

import {useEffect,useMemo,useState} from "react";
import {api} from "../../lib/api";

type ModuleItem={id:number;code:string;title:string;core:string;lifecycle:string;record_count:number;route?:string|null;description?:string|null};

const GROUPS=[
 ["core","هسته مرکزی کسب‌وکار","01 تا 07"],
 ["finance","مالی و خزانه","08 تا 10"],
 ["credit","اعتبار و تسهیلات","11 تا 15"],
 ["commerce","تجارت و پرداخت","16 تا 22"],
 ["communication","ارتباطات و مشتری","23 تا 27"],
 ["documents-content","اسناد و محتوا","28 تا 34"],
 ["organization","سازمان و عملیات","35 تا 37"],
 ["command-platform","مرکز فرماندهی و پلتفرم","38 تا 45"]
] as const;

export default function Admin(){
 const [me,setMe]=useState<any>(null);
 const [modules,setModules]=useState<ModuleItem[]>([]);
 const [health,setHealth]=useState<{status?:string;database?:string}>({});
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [q,setQ]=useState("");

 useEffect(()=>{let alive=true;
  (async()=>{
   try{
    const [session,catalog,h]=await Promise.allSettled([
     api<any>("/api/auth/me"),
     api<any>("/api/platform/modules"),
     fetch("/health",{credentials:"include"}).then(x=>x.ok?x.json():{})
    ]);
    if(!alive)return;
    if(session.status==="fulfilled")setMe(session.value.user);
    if(catalog.status==="fulfilled")setModules(catalog.value.items||[]);
    if(h.status==="fulfilled")setHealth(h.value);
    if(session.status==="rejected" && catalog.status==="rejected")setError("نشست یا سرویس مرکزی در دسترس نیست.");
   }catch(e){
    if(alive)setError(e instanceof Error?e.message:"نشست معتبر نیست.");
   }finally{if(alive)setLoading(false)}
  })();
  return()=>{alive=false};
 },[]);

 const totals=useMemo(()=>({
  records:modules.reduce((n,m)=>n+(m.record_count||0),0),
  active:modules.filter(m=>m.lifecycle==="active"||m.lifecycle==="operational").length,
  cores:new Set(modules.map(m=>m.core)).size
 }),[modules]);

 const filtered=useMemo(()=>{
  const s=q.trim().toLowerCase();
  return modules.filter(m=>!s||(m.title+" "+m.code+" "+m.core+" "+(m.description||"")).toLowerCase().includes(s));
 },[modules,q]);

 return <main className="admin-dashboard">
  <section className="dashboard-hero">
   <div className="dashboard-hero-copy">
    <span className="hero-kicker">مرکز فرماندهی · نگار آذین فدک</span>
    <h1>مرکز مدیریت سازمان</h1>
    <p>نمای واحد برای راهبری ساختار سازمان، عملیات، مالی، اعتبار، تجارت و سرویس‌های پلتفرم. هر بخش مستقیماً به ماژول عملیاتی واقعی متصل است.</p>
    <div className="dashboard-identity"><span className="identity-dot"/><b>{me?.fullName||me?.email||"کاربر مدیریتی"}</b><span>مدیر سامانه</span></div>
   </div>
   <div className="dashboard-hero-side">
    <div className="hero-status"><i className={health.database==="ok"?"online":""}/><span>وضعیت سرویس مرکزی</span><b>{health.database==="ok"?"فعال":"در حال بررسی"}</b></div>
    <div className="hero-clock">45 بخش عملیاتی<br/><small>ساختار یکپارچه سازمان</small></div>
   </div>
  </section>

  {error&&<div className="error dashboard-error">{error}</div>}

  <section className="executive-kpis">
   <article><span>ماژول‌های در دسترس</span><b>{modules.length}</b><small>از ۴۵ بخش تعریف‌شده</small></article>
   <article><span>بخش‌های عملیاتی</span><b>{totals.active}</b><small>وضعیت فعال یا عملیاتی</small></article>
   <article><span>رکوردهای واقعی</span><b>{totals.records.toLocaleString("fa-IR")}</b><small>ثبت‌شده در PostgreSQL</small></article>
   <article><span>هسته‌های سازمانی</span><b>{totals.cores}</b><small>گروه‌های عملیاتی</small></article>
  </section>

  <section className="dashboard-toolbar">
   <div><span className="section-kicker">CATALOG</span><h2>نقشه عملیاتی سامانه</h2><p>یک مسیر برای هر ماژول، بدون منوی تکراری.</p></div>
   <label className="dashboard-search"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجوی ماژول..." /></label>
  </section>

  <section className="executive-grid">
   {GROUPS.map(([key,label,range])=>{
    const rows=filtered.filter(m=>m.core===key);
    return <article className="executive-group" key={key}>
     <header><div><span>{range}</span><h3>{label}</h3></div><b>{rows.length}</b></header>
     <div className="executive-module-list">
      {rows.map(m=><a key={m.code} href={"/modules/?code="+encodeURIComponent(m.code)}>
       <span className="module-seal">{m.title.match(/^\d+/)?.[0]||"•"}</span>
       <div><strong>{m.title.replace(/^\d+\. /,"")}</strong><small>{m.code} · {m.lifecycle}</small></div>
       <span className="module-arrow">‹</span>
      </a>)}
      {!rows.length&&<div className="dashboard-empty">موردی با این جستجو پیدا نشد.</div>}
     </div>
    </article>;
   })}
  </section>

  {!loading&&modules.length===0&&<div className="dashboard-empty large">کاتالوگ ماژول‌ها از سرویس مرکزی دریافت نشد. ابتدا وضعیت API و نشست ورود بررسی شود.</div>}
 </main>;
}
