"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {usePathname} from "next/navigation";
import {api} from "../../lib/api";
import styles from "./AdminSidebar.module.css";

type ModuleItem={id:number;code:string;title:string;core:string;route?:string|null;is_active?:boolean};
type DynamicMenuItem={id:string;menu_key:string|null;parent_id:string|null;title:string;path:string;permission:string|null;children:string[];sort_order:number;panel_sort_order:number;is_shared:boolean};

function SearchIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
function ChevronIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function HomeIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10.5a1 1 0 0 1-1 1h-5.5v-6h-4v6H4.5a1 1 0 0 1-1-1V10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}

export default function AdminSidebar(){
 const pathname=usePathname();
 const [modules,setModules]=useState<ModuleItem[]>([]);
 const [menuItems,setMenuItems]=useState<DynamicMenuItem[]>([]);
 const [query,setQuery]=useState("");
 const [error,setError]=useState("");

 useEffect(()=>{let alive=true;
  Promise.all([
   api<{items:ModuleItem[]}>("/api/platform/modules"),
   api<{items:DynamicMenuItem[]}>("/api/dashboard/menu-tree?panel=admin")
  ]).then(([mods,menus])=>{if(alive){setModules(mods.items||[]);setMenuItems(menus.items||[])}})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:"خطا در دریافت ساختار سامانه")});
  return()=>{alive=false};
 },[]);

 const visible=useMemo(()=>new Map(modules.map(m=>[m.code,m])),[modules]);
 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase("fa-IR");
  if(!q)return menuItems;
  return menuItems.filter(item=>
   (item.title+" "+(item.children||[]).join(" ")).toLocaleLowerCase("fa-IR").includes(q)
  );
 },[query,menuItems]);

 const moduleUrl=(item:DynamicMenuItem)=>{
  if(item.path&&item.path!=="#")return item.path;
  return null;
 };
 const active=(item:DynamicMenuItem)=>{
  const url=moduleUrl(item);
  return Boolean(url&&pathname===url.split("?")[0]);
 };

 return <aside className={styles["enterprise-sidebar"]} aria-label="منوی مرکزی سازمان">
  <div className={styles["enterprise-brand"]}>
   <div className={styles["brand-symbol"]} aria-hidden="true">ن</div>
   <div className={styles["enterprise-brand-copy"]}>
    <strong>مرکز مدیریت نگار آذین فدک</strong>
    <span>منوی مرکزی سازمان · نسخه ۲۰۲۶</span>
   </div>
  </div>

  <div className={styles["sidebar-command"]}>
   <Link className={styles["sidebar-command-main"]+" "+(pathname==="/admin"?styles["active"]:"")} href="/admin">
    <span className={styles["sidebar-command-icon"]}><HomeIcon/></span>
    <div><b>مرکز فرماندهی</b><small>نمای کلی و وضعیت سامانه</small></div>
   </Link>
   <label className={styles["sidebar-search"]}>
    <span><SearchIcon/></span>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجوی منو و زیرمنو..." aria-label="جستجوی منو"/>
    {query&&<button type="button" aria-label="پاک کردن جستجو" onClick={()=>setQuery("")}>×</button>}
   </label>
  </div>

  <div className={styles["sidebar-caption"]}>
   <span>کاتالوگ عملیاتی</span>
   <b>{filtered.length}/{menuItems.length||۵۰}</b>
  </div>
  {error&&<div className={styles["sidebar-menu-error"]}>{error}</div>}

  <nav className={styles["master-nav"]}>
   {filtered.map(item=>{
    const url=moduleUrl(item);
    const isCurrent=active(item);
    return <details className={styles["master-item"]+" "+(isCurrent?styles["is-current"]:"")} key={item.id} open={Boolean(query)||isCurrent}>
     <summary>
      <span className={styles["master-chevron"]}><ChevronIcon/></span>
      <span className={styles["master-copy"]}><strong>{item.title}</strong><small>{(item.children||[]).length} قابلیت عملیاتی{item.is_shared?" · مشترک":"")}</small></span>
      {url?<Link className={styles["master-open"]} href={url} onClick={e=>e.stopPropagation()} aria-label={"ورود به "+item.title}>↗</Link>:<span className={styles["master-open"]+" "+styles["disabled"]} aria-hidden="true">•</span>}
     </summary>
     <div className={styles["master-children"]}>
      {item.children.map((child,i)=><div className={styles["master-child"]} key={child}>
       <span className={styles["master-child-index"]}>{String(i+1).padStart(2,"0")}</span>
       <span>{child}</span>
      </div>)}
      {url&&<Link className={styles["master-enter"]} href={url}>ورود به ماژول <span>←</span></Link>}
     </div>
    </details>;
   })}
  </nav>

  <footer className={styles["sidebar-footer"]}>
   <Link href="/admin/editors"><span>✦</span><div><b>ویرایشگرهای سامانه</b><small>قالب، صفحه، فرم و منو</small></div></Link>
   <small className={styles["sidebar-version"]}>50 بخش · طراحی مینیمال · CSS-first · RTL</small>
  </footer>
 </aside>
}