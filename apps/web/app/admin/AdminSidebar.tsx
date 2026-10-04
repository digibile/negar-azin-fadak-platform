"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {usePathname,useRouter,useSearchParams} from "next/navigation";
import {api} from "../../lib/api";

type ModuleItem={id:number;code:string;title:string;core:string;route?:string|null;is_active?:boolean};
type MenuDef={code:string;title:string;core:string;children:string[]};



export default function AdminSidebar(){
 const pathname=usePathname(),search=useSearchParams(),router=useRouter();
 const [modules,setModules]=useState<ModuleItem[]>([]);
 const [error,setError]=useState("");
 const [query,setQuery]=useState("");
 const [openGroups,setOpenGroups]=useState<Record<string,boolean>>({core:true,finance:true,credit:false,commerce:false,communication:false,"documents-content":false,organization:false,"command-platform":true});
 const [openModule,setOpenModule]=useState<string|null>(null);

 useEffect(()=>{let alive=true;
  api<{items:ModuleItem[]}>("/api/platform/modules").then(x=>{if(alive)setModules(x.items||[])}).catch(e=>{if(alive)setError(e instanceof Error?e.message:"خطا در دریافت ساختار سامانه")});
  return()=>{alive=false};
 },[]);

 const visible=useMemo(()=>new Map(modules.map(m=>[m.code,m])),[modules]);
 const filtered=useMemo(()=>{
  const q=query.trim().toLowerCase();
  return MENUS.filter(m=>visible.has(m.code)&&(!q||(m.title+m.children.join(" ")).toLowerCase().includes(q)));
 },[query,visible]);
 const isActive=(code:string)=>pathname==="/modules"&&search.get("code")===code;
 const go=(code:string)=>{if(visible.has(code))router.push("/modules/?code="+encodeURIComponent(code))};

 const groups=[
  ["core","هسته مرکزی کسب‌وکار","01 تا 07"],
  ["finance","مالی و خزانه","08 تا 10"],
  ["credit","اعتبار و تسهیلات","11 تا 15"],
  ["commerce","تجارت و پرداخت","16 تا 22"],
  ["communication","ارتباطات و مشتری","23 تا 27"],
  ["documents-content","اسناد و محتوا","28 تا 34"],
  ["organization","سازمان و عملیات","35 تا 37"],
  ["command-platform","مرکز فرماندهی و پلتفرم","38 تا 45"]
 ] as const;

 return <aside className="enterprise-sidebar">
  <div className="enterprise-brand">
   <div className="brand-symbol">ن</div>
   <div className="enterprise-brand-copy"><strong>مرکز مدیریت نگار آذین فدک</strong><span>کنترل و راهبری یکپارچه سازمان</span></div>
  </div>

  <div className="sidebar-command">
   <Link className={"sidebar-command-main "+(pathname==="/admin"?"active":"")} href="/admin"><span>⌂</span><div><b>مرکز فرماندهی</b><small>نمای کلی و وضعیت سامانه</small></div></Link>
   <div className="sidebar-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجوی بخش، ماژول یا قابلیت..." /></div>
  </div>

  <div className="sidebar-caption"><span>کاتالوگ عملیاتی</span><b>{modules.length}/45</b></div>
  {error&&<div className="sidebar-menu-error">{error}</div>}

  <nav className="tree-nav">
   {groups.map(([key,label,range])=>{
    const groupItems=filtered.filter(m=>m.core===key);
    if(query && !groupItems.length)return null;
    const expanded=Boolean(openGroups[key]);
    return <section className="tree-group" key={key}>
     <button className={"tree-group-head "+(expanded?"expanded":"")} type="button" onClick={()=>setOpenGroups(v=>({...v,[key]:!v[key]}))}>
      <span className="tree-group-chevron">{expanded?"⌄":"‹"}</span>
      <div><b>{label}</b><small>{range} · {groupItems.length} بخش</small></div>
     </button>
     {expanded&&<div className="tree-module-list">
      {groupItems.map((m)=>{
       const active=isActive(m.code), expandedModule=openModule===m.code||active;
       return <div className={"tree-module "+(active?"selected":"")} key={m.code}>
        <div className="tree-module-line">
         <button className="tree-module-link" type="button" onClick={()=>go(m.code)}>
          <span className="tree-module-number">{m.title.match(/^\d+/)?.[0]||""}</span>
          <span>{m.title.replace(/^\d+\. /,"")}</span>
         </button>
         <button className="tree-module-expand" type="button" aria-label="نمایش قابلیت‌ها" onClick={()=>setOpenModule(expandedModule?null:m.code)}>{expandedModule?"⌃":"⌄"}</button>
        </div>
        {expandedModule&&<div className="tree-capabilities-panel">
          <div className="capability-title">قابلیت‌های این بخش</div>
          <div className="capability-grid">{m.children.map((x,i)=><span key={x}><i>{String(i+1).padStart(2,"0")}</i>{x}</span>)}</div>
        </div>}
       </div>
      })}
     </div>}
    </section>
   })}
  </nav>

  <div className="sidebar-footer">
   <Link href="/admin/editors"><span>▦</span> استودیوهای طراحی و ویرایش</Link>
   <small>ساختار منو از کاتالوگ واقعی سامانه دریافت می‌شود.</small>
  </div>
 </aside>;
}
