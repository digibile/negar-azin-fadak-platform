"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {usePathname} from "next/navigation";
import {api} from "../../lib/api";
import {MASTER_MENU} from "./master-menu";
import styles from "./AdminSidebar.module.css";

type MenuNode={
 id:string|number;
 menu_key:string|null;
 parent_id:string|number|null;
 title:string;
 path:string|null;
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
function flattenTitles(nodes:MenuNode[]):string[]{return nodes.flatMap(node=>[node.title,...flattenTitles(node.child_items||[])])}
function menuHref(node:MenuNode){
 if(node.path&&node.path!=="#")return node.path;
 const canonicalChild=MASTER_MENU.flatMap(item=>item.children).find(child=>child.legacyCode===node.menu_key&&child.title===node.title);
 if(canonicalChild){const child=canonicalChild;const childRoute=child.route;if(childRoute)return childRoute;}
 if(node.menu_key)return "/modules/?code="+encodeURIComponent(node.menu_key);
 return "/admin";
}
function containsPath(node:MenuNode,path:string):boolean{
 return menuHref(node)===path||(node.child_items||[]).some(child=>containsPath(child,path));
}
function filterTree(nodes:MenuNode[],query:string):MenuNode[]{
 if(!query)return normalize(nodes);
 return normalize(nodes).flatMap(node=>{
  const children=filterTree(node.child_items||[],query);
  return node.title.toLocaleLowerCase("fa-IR").includes(query)||String(node.menu_key||"").toLocaleLowerCase("fa-IR").includes(query)||children.length?[{...node,child_items:children}]:[];
 });
}

function TreeNode({node,pathname,closeMobile,depth,forceExpanded}:{node:MenuNode;pathname:string;closeMobile:()=>void;depth:number;forceExpanded:boolean}){
 const [expanded,setExpanded]=useState(false);
 const children=normalize(node.child_items||[]);
 const href=menuHref(node);
 const active=containsPath(node,pathname);
 useEffect(()=>{if(active)setExpanded(true)},[active]);
 const isExpanded=forceExpanded||expanded;
 const nodeClass=depth===0?styles["tree-child-node"]:styles["tree-child-node"];
 return <div className={nodeClass+" "+(active?styles["child-active"]:"")}>
  <div className={styles["tree-child-head"]}>
   <span className={styles["master-child-index"]}>{String(node.sort_order+1).padStart(2,"0")}</span>
   <Link href={href} onClick={closeMobile}>{node.title}</Link>
   {children.length>0&&<button type="button" onClick={()=>setExpanded(x=>!x)} aria-expanded={isExpanded} aria-label={(isExpanded?"بستن ":"باز کردن ")+node.title}><span className={styles["master-chevron"]}><ChevronIcon/></span></button>}
  </div>
  {isExpanded&&children.length>0&&<div className={styles["tree-grandchildren"]}>
   {children.map(child=><TreeNode key={child.id} node={child} pathname={pathname} closeMobile={closeMobile} depth={depth+1} forceExpanded={forceExpanded}/>)}
  </div>}
 </div>;
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
   .then(tree=>{if(alive)setMenuItems(normalize(tree.items||[]))})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:"خطا در دریافت ساختار منوی مرکزی")});
  api<{updateAvailable?:boolean}>("/api/platform/update-status")
   .then(x=>{if(alive)setUpdateAvailable(Boolean(x.updateAvailable))}).catch(()=>{});
  const timer=window.setInterval(async()=>{
   try{const x=await api<{updateAvailable?:boolean}>("/api/platform/update-status");if(alive)setUpdateAvailable(Boolean(x.updateAvailable))}catch{}
  },30000);
  return()=>{alive=false;window.clearInterval(timer)};
 },[]);

 const normalizedQuery=query.trim().toLocaleLowerCase("fa-IR");
 const filtered=useMemo(()=>filterTree(menuItems,normalizedQuery),[menuItems,normalizedQuery]);
 useEffect(()=>{
  const activeKeys:Record<string,boolean>={};
  for(const item of menuItems)if(containsPath(item,pathname))activeKeys[String(item.id)]=true;
  setOpen(v=>({...v,...activeKeys}));
 },[pathname,menuItems]);

 function toggle(id:string){setOpen(v=>({...v,[id]:!v[id]}))}
 function closeMobile(){if(window.innerWidth<=900)setMobileOpen(false)}

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
   <div className={styles["sidebar-scroll-region"]}>
    <div className={styles["sidebar-caption"]}><span>منوی مرکزی سازمان</span><span>{menuItems.length.toLocaleString("fa-IR")} پنل</span></div>
    {error&&<div className={styles["sidebar-menu-error"]}>{error}</div>}
    <nav className={styles["master-nav"]}>
     {filtered.map((item,index)=>{
      const expanded=Boolean(normalizedQuery)||Boolean(open[String(item.id)]);
      const current=menuHref(item)===pathname;
      const children=normalize(item.child_items||[]);
      return <section className={styles["master-item"]+" "+(current?styles["is-current"]:"")+" "+(expanded?styles["is-open"]:"")} key={item.id}>
       <div className={styles["master-header"]}>
        <span className={styles["master-open"]}>{String(index+1).padStart(2,"0")}</span>
        <Link className={styles["master-title-button"]} href={menuHref(item)} onClick={closeMobile}>
         <span className={styles["master-copy"]}><strong>{item.title}</strong><small>{children.length.toLocaleString("fa-IR")} زیرمنو · {item.menu_key||"منوی سازمان"}</small></span>
        </Link>
        {children.length>0?<button type="button" className={styles["master-chevron-button"]} onClick={()=>toggle(String(item.id))} aria-expanded={expanded} aria-label={(expanded?"بستن ":"باز کردن ")+item.title}><span className={styles["master-chevron"]}><ChevronIcon/></span></button>:<span className={styles["master-chevron-button"]+" "+styles["empty-chevron"]}/>}
       </div>
       {expanded&&children.length>0&&<div className={styles["master-children"]}>
        {children.map(child=><TreeNode key={child.id} node={child} pathname={pathname} closeMobile={closeMobile} depth={0} forceExpanded={Boolean(normalizedQuery)}/>)}
       </div>}
      </section>;
     })}
     {!error&&menuItems.length===0&&<div className={styles["sidebar-menu-error"]}>در انتظار دریافت منوی مرکزی از سرویس...</div>}
    </nav>
    <div className={styles["sidebar-caption"]}><span>امکانات تکمیلی پنل قبلی</span></div>
    <nav className={styles["master-nav"]} aria-label="امکانات تکمیلی پنل قبلی">
     <div className={styles["master-children"]}>
      <Link className={styles["master-child"]} href="/admin" onClick={closeMobile}><span className={styles["master-child-index"]}>01</span>داشبورد مدیریت و مرکز فرماندهی</Link>
      <Link className={styles["master-child"]} href="/admin/lendtech" onClick={closeMobile}><span className={styles["master-child-index"]}>02</span>مدیریت وام و لندتک</Link>
      <Link className={styles["master-child"]} href="/admin/templates" onClick={closeMobile}><span className={styles["master-child-index"]}>03</span>قالب‌ها و پوسته‌های سایت</Link>
      <Link className={styles["master-child"]} href="/admin/editors" onClick={closeMobile}><span className={styles["master-child-index"]}>04</span>ویرایشگر صفحه، فرم و منو</Link>
      <Link className={styles["master-child"]} href="/admin/updates" onClick={closeMobile}><span className={styles["master-child-index"]}>05</span>نسخه‌ها و به‌روزرسانی سامانه</Link>
      <Link className={styles["master-child"]} href="/modules/?code=20-system-settings" onClick={closeMobile}><span className={styles["master-child-index"]}>06</span>تنظیمات اپلیکیشن و سامانه</Link>
      <Link className={styles["master-child"]} href="/modules/?code=50-release-health" onClick={closeMobile}><span className={styles["master-child-index"]}>07</span>پشتیبان‌گیری، بازیابی و سلامت سامانه</Link>
     </div>
    </nav>
   </div>
   <footer className={styles["sidebar-footer"]}>
    <Link href="/admin/templates" onClick={closeMobile}><span>▦</span><div><b>کتابخانه مرکزی قالب‌ها</b><small>قالب پایه، فروشگاه، لندتک و پرداخت</small></div></Link>
    <Link href="/admin/editors" onClick={closeMobile}><span>✦</span><div><b>ویرایشگرهای سامانه</b><small>صفحه، فرم و منو</small></div></Link>
    <Link className={updateAvailable?styles["update-available"]:""} href="/admin/updates" onClick={closeMobile}><span>↻</span><div><b>نسخه و بروزرسانی {updateAvailable&&<em>نسخه جدید</em>}</b><small>{updateAvailable?"نسخه جدید GitHub آماده نصب است":"بررسی نسخه و نصب امن از GitHub"}</small></div></Link>
    <small className={styles["sidebar-version"]}>پنل‌های سازمانی · زیرمنوهای واقعی · درخت چندلایه · RTL · Responsive</small>
   </footer>
  </aside>
 </>;
}