"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {usePathname} from "next/navigation";
import {api} from "../../lib/api";
import styles from "./AdminSidebar.module.css";

type MenuNode={
 id:string|number;
 menu_key:string|null;
 parent_id:string|number|null;
 title:string;
 path:string;
 icon?:string|null;
 sort_order:number;
 permission:string|null;
 children?:string[];
 child_items?:MenuNode[];
 is_shared?:boolean;
};

function SearchIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
function ChevronIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function HomeIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10.5a1 1 0 0 1-1 1h-5.5v-6h-4v6H4.5a1 1 0 0 1-1-1V10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
function CloseIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}

function normalize(nodes:MenuNode[]):MenuNode[]{return [...nodes].sort((a,b)=>a.sort_order-b.sort_order||String(a.id).localeCompare(String(b.id)))}
function allTitles(node:MenuNode):string{return [node.title,...(node.child_items||[]).map(allTitles)].join(" ")}
function hasPath(node:MenuNode,path:string):boolean{
 if(node.path===path)return true;
 return (node.child_items||[]).some(x=>hasPath(x,path));
}

export default function AdminSidebar(){
 const pathname=usePathname();
 const [menuItems,setMenuItems]=useState<MenuNode[]>([]);
 const [query,setQuery]=useState("");
 const [error,setError]=useState("");
 const [open,setOpen]=useState<Record<string,boolean>>({});
 const [mobileOpen,setMobileOpen]=useState(false);
 const [updateAvailable,setUpdateAvailable]=useState(false);

 useEffect(()=>{
  let alive=true;
  api<{items:MenuNode[]}>("/api/dashboard/menu-tree?panel=admin")
   .then(data=>{if(alive)setMenuItems(normalize(data.items||[]))})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:"خطا در دریافت ساختار منوی مرکزی")});
  api<{updateAvailable?:boolean}>("/api/platform/update-status")
   .then(x=>{if(alive)setUpdateAvailable(Boolean(x.updateAvailable))}).catch(()=>{});
  const timer=window.setInterval(async()=>{
   try{const x=await api<{updateAvailable?:boolean}>("/api/platform/update-status");if(alive)setUpdateAvailable(Boolean(x.updateAvailable))}catch{}
  },30000);
  return()=>{alive=false;window.clearInterval(timer)};
 },[]);

 useEffect(()=>{
  const activeKeys:Record<string,boolean>={};
  const walk=(nodes:MenuNode[])=>{
   for(const n of nodes){
    if(hasPath(n,pathname))activeKeys[String(n.id)]=true;
    walk(n.child_items||[]);
   }
  };
  walk(menuItems);
  setOpen(v=>({...v,...activeKeys}));
 },[pathname,menuItems]);

 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase("fa-IR");
  if(!q)return menuItems;
  const keep=(node:MenuNode):MenuNode|null=>{
   const direct=allTitles(node).toLocaleLowerCase("fa-IR").includes(q);
   const kids=(node.child_items||[]).map(keep).filter(Boolean) as MenuNode[];
   if(!direct&&!kids.length)return null;
   return {...node,child_items:direct?node.child_items:kids};
  };
  return menuItems.map(keep).filter(Boolean) as MenuNode[];
 },[query,menuItems]);

 function toggle(id:string|number){setOpen(v=>({...v,[String(id)]:!v[String(id)]}))}
 function closeMobile(){if(window.innerWidth<=900)setMobileOpen(false)}

 function renderNode(node:MenuNode,depth=0,index=0):React.ReactNode{
  const kids=normalize(node.child_items||[]);
  const id=String(node.id);
  const current=node.path===pathname;
  const expanded=Boolean(query)||Boolean(open[id])||current;
  const href=node.path&&node.path!=="#" ? node.path : null;
  if(depth===0){
   return <section className={styles["master-item"]+" "+(current?styles["is-current"]:"")+" "+(expanded?styles["is-open"]:"")} key={id}>
    <div className={styles["master-header"]}>
     <span className={styles["master-open"]}>{String(index+1).padStart(2,"0")}</span>
     <Link className={styles["master-title-button"]} href={href||"#"} onClick={closeMobile}>
      <span className={styles["master-copy"]}><strong>{node.title}</strong><small>{kids.length} بخش عملیاتی{node.is_shared?" · مشترک":""}</small></span>
     </Link>
     {kids.length>0?<button type="button" className={styles["master-chevron-button"]} onClick={()=>toggle(id)} aria-expanded={expanded} aria-label={(expanded?"بستن ":"باز کردن ")+node.title}><span className={styles["master-chevron"]}><ChevronIcon/></span></button>:<span className={styles["master-chevron-button"]+" "+styles["empty-chevron"]}/>}
    </div>
    {expanded&&kids.length>0&&<div className={styles["master-children"]}>{kids.map((child,i)=>renderNode(child,1,i))}</div>}
   </section>;
  }
  return <div className={styles["tree-child-node"]+" "+(current?styles["child-active"]:"")} key={id}>
   <div className={styles["tree-child-head"]}>
    <span className={styles["master-child-index"]}>{String(index+1).padStart(2,"0")}</span>
    {href?<Link href={href} onClick={closeMobile}>{node.title}</Link>:<span>{node.title}</span>}
    {kids.length>0&&<button type="button" onClick={()=>toggle(id)} aria-expanded={expanded} aria-label={(expanded?"بستن ":"باز کردن ")+node.title}><span className={styles["master-chevron"]}><ChevronIcon/></span></button>}
   </div>
   {expanded&&kids.length>0&&<div className={styles["tree-grandchildren"]}>{kids.map((child,i)=>renderNode(child,depth+1,i))}</div>}
  </div>;
 }

 return <>
  <button type="button" className={styles["mobile-menu-toggle"]} onClick={()=>setMobileOpen(true)} aria-label="باز کردن منوی مرکزی"><span>☰</span><b>منوی سازمان</b></button>
  {mobileOpen&&<button type="button" className={styles["mobile-menu-overlay"]} onClick={()=>setMobileOpen(false)} aria-label="بستن منو"/>}
  <aside className={styles["enterprise-sidebar"]+" "+(mobileOpen?styles["mobile-open"]:"")} aria-label="منوی مرکزی سازمان">
   <div className={styles["enterprise-brand"]}>
    <div className={styles["brand-symbol"]} aria-hidden="true">ن</div>
    <div className={styles["enterprise-brand-copy"]}><strong>مرکز مدیریت نگار آذین فدک</strong><span>منوی مرکزی سازمان · نسخه ۲۰۲۶</span></div>
    <button type="button" className={styles["mobile-close"]} onClick={()=>setMobileOpen(false)} aria-label="بستن منو"><CloseIcon/></button>
   </div>
   <div className={styles["sidebar-command"]}>
    <Link className={styles["sidebar-command-main"]+(pathname==="/admin"?" "+styles["active"]:"")} href="/admin" onClick={closeMobile}>
     <span className={styles["sidebar-command-icon"]}><HomeIcon/></span><div><b>مرکز فرماندهی</b><small>نمای کلی و وضعیت سامانه</small></div>
    </Link>
    <label className={styles["sidebar-search"]}><span><SearchIcon/></span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجوی منو و زیرمنو..." aria-label="جستجوی منو"/>{query&&<button type="button" aria-label="پاک کردن جستجو" onClick={()=>setQuery("")}>×</button>}</label>
   </div>
   <div className={styles["sidebar-caption"]}><span>کاتالوگ عملیاتی</span><b>{filtered.length}/50</b></div>
   {error&&<div className={styles["sidebar-menu-error"]}>{error}</div>}
   <nav className={styles["master-nav"]}>{filtered.map((item,i)=>renderNode(item,0,i))}</nav>
   <footer className={styles["sidebar-footer"]}>
    <Link href="/admin/editors" onClick={closeMobile}><span>✦</span><div><b>ویرایشگرهای سامانه</b><small>قالب، صفحه، فرم و منو</small></div></Link>
    <Link className={updateAvailable?styles["update-available"]:""} href="/admin/updates" onClick={closeMobile}><span>↻</span><div><b>نسخه و بروزرسانی {updateAvailable&&<em>نسخه جدید</em>}</b><small>{updateAvailable?"نسخه جدید GitHub آماده نصب است":"بررسی نسخه و نصب امن از GitHub"}</small></div></Link>
    <small className={styles["sidebar-version"]}>۵۰ بخش مرکزی · درخت چندلایه · RTL · Responsive</small>
   </footer>
  </aside>
 </>;
}
