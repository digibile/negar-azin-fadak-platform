"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {usePathname} from "next/navigation";
import {api} from "../../lib/api";
import {MASTER_MENU} from "./master-menu";
import type {MasterMenuItem} from "./master-menu";

type ModuleItem={id:number;code:string;title:string;core:string;route?:string|null;is_active?:boolean};

function SearchIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
function ChevronIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function HomeIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10.5a1 1 0 0 1-1 1h-5.5v-6h-4v6H4.5a1 1 0 0 1-1-1V10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}

export default function AdminSidebar(){
 const pathname=usePathname();
 const [modules,setModules]=useState<ModuleItem[]>([]);
 const [query,setQuery]=useState("");
 const [error,setError]=useState("");

 useEffect(()=>{let alive=true;
  api<{items:ModuleItem[]}>("/api/platform/modules")
   .then(x=>{if(alive)setModules(x.items||[])})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:"خطا در دریافت ساختار سامانه")});
  return()=>{alive=false};
 },[]);

 const visible=useMemo(()=>new Map(modules.map(m=>[m.code,m])),[modules]);
 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase("fa-IR");
  if(!q)return MASTER_MENU;
  return MASTER_MENU.filter(item=>
   (item.number+" "+item.title+" "+item.children.join(" ")).toLocaleLowerCase("fa-IR").includes(q)
  );
 },[query]);

 const moduleUrl=(item:MasterMenuItem)=>{
  const code=item.moduleCode;
  return code&&visible.has(code)?"/modules/?code="+encodeURIComponent(code):null;
 };
 const active=(item:MasterMenuItem)=>{
  const url=moduleUrl(item);
  return Boolean(url&&pathname==="/modules");
 };

 return <aside className="enterprise-sidebar" aria-label="منوی مرکزی سازمان">
  <div className="enterprise-brand">
   <div className="brand-symbol" aria-hidden="true">ن</div>
   <div className="enterprise-brand-copy">
    <strong>مرکز مدیریت نگار آذین فدک</strong>
    <span>منوی مرکزی سازمان · نسخه ۲۰۲۶</span>
   </div>
  </div>

  <div className="sidebar-command">
   <Link className={"sidebar-command-main "+(pathname==="/admin"?"active":"")} href="/admin">
    <span className="sidebar-command-icon"><HomeIcon/></span>
    <div><b>مرکز فرماندهی</b><small>نمای کلی و وضعیت سامانه</small></div>
   </Link>
   <label className="sidebar-search">
    <span><SearchIcon/></span>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجوی منو و زیرمنو..." aria-label="جستجوی منو"/>
    {query&&<button type="button" aria-label="پاک کردن جستجو" onClick={()=>setQuery("")}>×</button>}
   </label>
  </div>

  <div className="sidebar-caption">
   <span>کاتالوگ عملیاتی</span>
   <b>{filtered.length}/۵۰</b>
  </div>
  {error&&<div className="sidebar-menu-error">{error}</div>}

  <nav className="master-nav">
   {filtered.map(item=>{
    const url=moduleUrl(item);
    const isCurrent=active(item);
    return <details className={"master-item "+(isCurrent?"is-current":"")} key={item.code} open={Boolean(query)||isCurrent}>
     <summary>
      <span className="master-chevron"><ChevronIcon/></span>
      <span className="master-icon" aria-hidden="true">{item.icon}</span>
      <span className="master-copy"><strong>{item.title}</strong><small>{item.children.length} قابلیت عملیاتی</small></span>
      {url?<Link className="master-open" href={url} onClick={e=>e.stopPropagation()} aria-label={"ورود به "+item.title}>↗</Link>:<span className="master-open disabled" aria-hidden="true">•</span>}
     </summary>
     <div className="master-children">
      {item.children.map((child,i)=><div className="master-child" key={child}>
       <span className="master-child-index">{String(i+1).padStart(2,"0")}</span>
       <span>{child}</span>
      </div>)}
      {url&&<Link className="master-enter" href={url}>ورود به ماژول <span>←</span></Link>}
     </div>
    </details>;
   })}
  </nav>

  <footer className="sidebar-footer">
   <Link href="/admin/editors"><span>✦</span><div><b>ویرایشگرهای سامانه</b><small>قالب، صفحه، فرم و منو</small></div></Link>
   <small className="sidebar-version">50 بخش · طراحی مینیمال · CSS-first · RTL</small>
  </footer>
 </aside>
}