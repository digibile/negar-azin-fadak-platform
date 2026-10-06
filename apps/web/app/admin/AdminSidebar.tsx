"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {usePathname} from "next/navigation";
import {api} from "../../lib/api";
import styles from "./AdminSidebar.module.css";

import {MASTER_MENU} from "./master-menu";
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

type ModuleItem={code:string;title:string;is_active?:boolean;route?:string|null};

function SearchIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
function ChevronIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function HomeIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10.5a1 1 0 0 1-1 1h-5.5v-6h-4v6H4.5a1 1 0 0 1-1-1V10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
function CloseIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}

function normalize(nodes:MenuNode[]):MenuNode[]{return [...nodes].sort((a,b)=>a.sort_order-b.sort_order||String(a.id).localeCompare(String(b.id)))}
function allTitles(node:MenuNode):string{return [node.title,...(node.child_items||[]).map(allTitles)].join(" ")}

const LEGACY_BY_MASTER:Record<string,string>={
 dashboard:"01-dashboard",
 organization:"02-organizations",
 users-security:"03-users-access",
 central-settings:"20-system-settings",
 accounting:"08-accounting-finance",
 financial-reports:"33-budget-financial-control",
 treasury:"26-treasury-bank",
 checks:"26-treasury-bank",
 sales:"22-sales-revenue",
 purchasing:"21-purchasing-supply",
 inventory:"23-inventory-warehouse",
 supply-logistics:"48-shipping-delivery",
 crm:"04-customers-360",
 marketing:"44-marketing-content",
 marketplace:"09-commerce-stores",
 credit:"35-credit-financing",
 digital-file:"19-documents-governance",
 collections:"38-collections",
 hr:"39-human-resources",
 payroll:"39-human-resources",
 attendance:"39-human-resources",
 office-automation:"19-documents-governance",
 documents:"19-documents-governance",
 contracts:"47-contracts-legal",
 workflow:"06-business-rules",
 projects:"30-projects-cost-centers",
 production:"24-production",
 maintenance:"24-production",
 assets:"31-fixed-assets",
 tax:"32-tax-e-invoicing",
 bi:"45-search-analytics",
 ai-center:"40-ai-finance",
 smart-analysis:"40-ai-finance",
 ai-finance:"40-ai-finance",
 ai-sales-crm:"40-ai-finance",
 ai-credit:"35-credit-financing",
 ai-documents:"41-ai-documents-ocr",
 ai-contact:"43-communication-hub",
 ai-agents:"40-ai-finance",
 smart-automation:"06-business-rules",
 integrations:"46-unified-applications",
 developer-api:"46-unified-applications",
 apps-portals:"46-unified-applications",
 appearance-content:"16-page-builder",
 notifications:"18-notifications",
 support:"43-communication-hub",
 audit:"42-audit-internal-control",
 monitoring:"50-release-health",
 backup:"50-release-health",
 profile:"03-users-access"
};

export default function AdminSidebar(){
 const pathname=usePathname();
 const [menuItems,setMenuItems]=useState<MenuNode[]>([]);
 const [modules,setModules]=useState<ModuleItem[]>([]);
 const [query,setQuery]=useState("");
 const [error,setError]=useState("");
 const [open,setOpen]=useState<Record<string,boolean>>({});
 const [mobileOpen,setMobileOpen]=useState(false);
 const [updateAvailable,setUpdateAvailable]=useState(false);

 useEffect(()=>{
  let alive=true;
  Promise.all([
   api<{items:MenuNode[]}>("/api/dashboard/menu-tree?panel=admin"),
   api<{items:ModuleItem[]}>("/api/platform/modules")
  ]).then(([tree,mods])=>{
   if(!alive)return;
   setMenuItems(normalize(tree.items||[]));
   setModules(mods.items||[]);
  }).catch(e=>{if(alive)setError(e instanceof Error?e.message:"خطا در دریافت ساختار منوی مرکزی")});
  api<{updateAvailable?:boolean}>("/api/platform/update-status")
   .then(x=>{if(alive)setUpdateAvailable(Boolean(x.updateAvailable))}).catch(()=>{});
  const timer=window.setInterval(async()=>{
   try{const x=await api<{updateAvailable?:boolean}>("/api/platform/update-status");if(alive)setUpdateAvailable(Boolean(x.updateAvailable))}catch{}
  },30000);
  return()=>{alive=false;window.clearInterval(timer)};
 },[]);

 const moduleSet=useMemo(()=>new Set(modules.filter(x=>x.is_active!==false).map(x=>x.code)),[modules]);
 const dbByLegacy=useMemo(()=>new Map(menuItems.map(x=>[x.menu_key||"",x])),[menuItems]);

 const canonical=useMemo(()=>MASTER_MENU.map(item=>{
  const legacyKey=LEGACY_BY_MASTER[item.code]||item.moduleCode||"";
  const db=dbByLegacy.get(legacyKey);
  const canonicalCode=LEGACY_BY_MASTER[item.code];
  const route=canonicalCode
   ? "/modules/?code="+encodeURIComponent(canonicalCode)
   : db?.path || (item.moduleCode&&moduleSet.has(item.moduleCode)?"/modules/?code="+encodeURIComponent(item.moduleCode):item.moduleCode?"/modules/?code="+encodeURIComponent(item.moduleCode):"#");
  const dbChildren=normalize(db?.child_items||[]);
  const childByTitle=new Map(dbChildren.map(x=>[x.title,x]));
  const children=item.children.map((title,i)=>{
   const dbChild=childByTitle.get(title);
   return {id:item.code+"-static-"+i,title,path:dbChild?.path||route,sort_order:i,dbChild};
  });
  return {...item,route,children,dbChildren};
 }),[dbByLegacy,moduleSet]);

 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase("fa-IR");
  if(!q)return canonical;
  return canonical.filter(item=>{
   const hay=[item.number,item.title,...item.children.map(x=>x.title),...item.dbChildren.map(x=>x.title)].join(" ").toLocaleLowerCase("fa-IR");
   return hay.includes(q);
  });
 },[canonical,query]);

 useEffect(()=>{
  const activeKeys:Record<string,boolean>={};
  for(const item of canonical){
   const active=item.route===pathname||item.dbChildren.some(x=>x.path===pathname)||item.children.some(x=>x.path===pathname);
   if(active)activeKeys[item.code]=true;
  }
  setOpen(v=>({...v,...activeKeys}));
 },[pathname,canonical]);

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
   <div className={styles["sidebar-caption"]}><span>منوی مرکزی سازمان</span><b>{filtered.length}/۵۰</b></div>
   {error&&<div className={styles["sidebar-menu-error"]}>{error}</div>}
   <nav className={styles["master-nav"]}>
    {filtered.map(item=>{
     const expanded=Boolean(query)||Boolean(open[item.code]);
     const current=item.route===pathname;
     return <section className={styles["master-item"]+" "+(current?styles["is-current"]:"")+" "+(expanded?styles["is-open"]:"")} key={item.code}>
      <div className={styles["master-header"]}>
       <span className={styles["master-open"]}>{item.number}</span>
       <Link className={styles["master-title-button"]} href={item.route} onClick={closeMobile}>
        <span className={styles["master-copy"]}><strong>{item.title}</strong><small>{item.children.length} قابلیت اصلی · {item.moduleCode||"مرکز سازمان"}</small></span>
       </Link>
       {item.children.length>0?<button type="button" className={styles["master-chevron-button"]} onClick={()=>toggle(item.code)} aria-expanded={expanded} aria-label={(expanded?"بستن ":"باز کردن ")+item.title}><span className={styles["master-chevron"]}><ChevronIcon/></span></button>:<span className={styles["master-chevron-button"]+" "+styles["empty-chevron"]}/>}
      </div>
      {expanded&&item.children.length>0&&<div className={styles["master-children"]}>
       {item.children.map((child,i)=>{
        const href=child.path||item.route;
        const active=href===pathname;
        return <div className={styles["tree-child-node"]+" "+(active?styles["child-active"]:"")} key={child.id}>
         <div className={styles["tree-child-head"]}>
          <span className={styles["master-child-index"]}>{String(i+1).padStart(2,"0")}</span>
          <Link href={href} onClick={closeMobile}>{child.title}</Link>
         </div>
        </div>;
       })}
       {item.dbChildren.filter(x=>!item.children.some(c=>c.title===x.title)).map((child,i)=><div className={styles["tree-child-node"]} key={"db-"+child.id}>
        <div className={styles["tree-child-head"]}><span className={styles["master-child-index"]}>DB</span><Link href={child.path||item.route} onClick={closeMobile}>{child.title}</Link></div>
       </div>)}
      </div>}
     </section>;
    })}
   </nav>
   <footer className={styles["sidebar-footer"]}>
    <Link href="/admin/editors" onClick={closeMobile}><span>✦</span><div><b>ویرایشگرهای سامانه</b><small>قالب، صفحه، فرم و منو</small></div></Link>
    <Link className={updateAvailable?styles["update-available"]:""} href="/admin/updates" onClick={closeMobile}><span>↻</span><div><b>نسخه و بروزرسانی {updateAvailable&&<em>نسخه جدید</em>}</b><small>{updateAvailable?"نسخه جدید GitHub آماده نصب است":"بررسی نسخه و نصب امن از GitHub"}</small></div></Link>
    <small className={styles["sidebar-version"]}>۵۰ منوی اصلی · زیرمنوهای واقعی · درخت چندلایه · RTL · Responsive</small>
   </footer>
  </aside>
 </>;
}