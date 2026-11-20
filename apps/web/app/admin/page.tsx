"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {api} from "../../lib/api";
import styles from "./ExecutiveDashboard.module.css";
import {MASTER_MENU} from "./master-menu";

type MenuNode={id:string|number;menu_key?:string|null;title:string;path?:string|null;icon?:string|null;sort_order?:number;child_items?:MenuNode[]};
type ModuleItem={id?:number;code:string;title:string;core?:string;lifecycle?:string;record_count?:number;route?:string|null;description?:string|null};
type Health={status?:string;database?:string};
type SessionUser={fullName?:string;email?:string};

const number=(value:number)=>value.toLocaleString("fa-IR");
const isActive=(value?:string)=>value==="active"||value==="operational";

function Icon({name}:{name:string}) {
 const common={width:21,height:21,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round" as const,strokeLinejoin:"round" as const, "aria-hidden":true as const};
 const paths:Record<string,React.ReactNode>={
  home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,
  org:<><rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="8" y="14" width="8" height="7" rx="1.5"/><path d="M7 11v2h10v-2M12 13v1"/></>,
  shield:<><path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></>,
  users:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/></>,
  finance:<><path d="M3 9h18M5 9v10M9 9v10M15 9v10M19 9v10M3 21h18M12 3l9 4H3l9-4Z"/></>,
  shop:<><path d="M4 8h16l-1 12H5L4 8Z"/><path d="m4 8 2-5h12l2 5M9 12v4M15 12v4"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-3l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.5-2.6 1.4-1.1a8 8 0 0 1 0-2l-1.4-1.1 1.5-2.6 1.7.6a8 8 0 0 1 1.7-1L12 7h3l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.5 2.6-1.4 1.1a8 8 0 0 1 0 2Z"/></>,
  file:<><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
  chart:<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
 };
 return <svg {...common}>{paths[name]||paths.org}</svg>;
}
function iconFor(title:string){if(/مالی|حساب|پرداخت|تسویه|اعتبار|وام/.test(title))return "finance";if(/کاربر|مشتری|فروشنده|پذیرنده/.test(title))return "users";if(/سازمان|شرکت|ساختار/.test(title))return "org";if(/امنیت|دسترسی|نقش/.test(title))return "shield";if(/تجارت|فروشگاه|کالا|فروش/.test(title))return "shop";if(/سند|بایگانی|مدرک/.test(title))return "file";if(/گزارش|هوش|تحلیل/.test(title))return "chart";if(/تنظیم/.test(title))return "settings";return "org";}

export default function Admin(){
 const [me,setMe]=useState<SessionUser|null>(null);
 const [modules,setModules]=useState<ModuleItem[]>([]);
 const [menu,setMenu]=useState<MenuNode[]>([]);
 const [health,setHealth]=useState<Health>({});
 const [error,setError]=useState("");
 const [menuError,setMenuError]=useState("");
 const [loading,setLoading]=useState(true);
 const [query,setQuery]=useState("");
 const [updatedAt,setUpdatedAt]=useState("");

 useEffect(()=>{let alive=true;
  (async()=>{
   const [session,catalog,tree,h]=await Promise.allSettled([
    api<any>("/api/auth/me"),
    api<any>("/api/platform/modules"),
    api<any>("/api/dashboard/menu-tree?panel=admin"),
    fetch("/health",{credentials:"include",cache:"no-store"}).then(x=>x.ok?x.json():{})
   ]);
   if(!alive)return;
   if(session.status==="fulfilled")setMe(session.value.user||null);
   if(catalog.status==="fulfilled")setModules(catalog.value.items||[]);
   else setError("دریافت کاتالوگ ماژول‌ها با خطا روبه‌رو شد.");
   if(tree.status==="fulfilled")setMenu([...(tree.value.items||[])].sort((a:MenuNode,b:MenuNode)=>(a.sort_order||0)-(b.sort_order||0)));
   else setMenuError("منوی مرکزی از سرویس دریافت نشد. پس از بررسی دسترسی یا سرویس، دوباره تلاش کنید.");
   if(h.status==="fulfilled")setHealth(h.value||{});
   setUpdatedAt(new Date().toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"}));
   setLoading(false);
  })();
  return()=>{alive=false};
 },[]);

 const totals=useMemo(()=>({
  active:modules.filter(x=>isActive(x.lifecycle)).length,
  records:modules.reduce((n,x)=>n+(Number(x.record_count)||0),0),
  cores:new Set(modules.map(x=>x.core).filter(Boolean)).size,
  inactive:modules.filter(x=>x.lifecycle&&!isActive(x.lifecycle)).length
 }),[modules]);
 const panels=useMemo(()=>{
  const needle=query.trim().toLocaleLowerCase("fa-IR");
  const flatten=(nodes:MenuNode[]):string[]=>nodes.flatMap(n=>[n.title,...flatten(n.child_items||[])]);
  return menu.filter(item=>!needle||[item.title,item.menu_key||"",...flatten(item.child_items||[])].join(" ").toLocaleLowerCase("fa-IR").includes(needle));
 },[menu,query]);

 return <main className={styles.page} dir="rtl">
  <section className={styles.hero}>
   <div className={styles.heroGlow}/>
   <div className={styles.heroMain}>
    <div className={styles.eyebrow}><span className={styles.eyebrowDot}/> مرکز فرماندهی سازمان <span className={styles.eyebrowDivider}/><span>داشبورد مدیرکل</span></div>
    <h2>تصویر یکپارچه از کسب‌وکار</h2>
    <p>وضعیت ماژول‌ها، ساختار مدیریتی و دسترسی به عملیات سازمان را از یک نقطه کنترل کنید.</p>
    <div className={styles.heroMeta}><span className={styles.avatar}>{(me?.fullName||me?.email||"م").slice(0,1)}</span><span><b>{me?.fullName||me?.email||"مدیر سامانه"}</b><small>دسترسی مدیریت مرکزی</small></span><i/><span>آخرین دریافت اطلاعات: {updatedAt||"در حال دریافت"}</span></div>
   </div>
   <div className={styles.heroAside}>
    <div className={styles.heroMark}><span>ن</span><small>NAF</small></div>
    <div className={styles.heroAsideLabel}>وضعیت زیرساخت</div>
    <div className={styles.healthLine}><span className={health.status==="ok"||health.database==="ok"?styles.healthGood:styles.healthUnknown}/><b>{health.status==="ok"||health.database==="ok"?"پاسخ‌گو":"نیازمند بررسی"}</b></div>
    <small className={styles.healthHint}>بر اساس پاسخ سرویس سلامت</small>
    <Link href="/admin/updates" className={styles.heroLink}>مدیریت نسخه و انتشار <span>←</span></Link>
   </div>
  </section>

  <section className="naf-action-toolbar no-print" aria-label="عملیات داشبورد">
   <div className="naf-action-group">
    <button type="button" data-action="view" onClick={()=>window.location.reload()}><span className="action-icon">↻</span>به‌روزرسانی</button>
    <button type="button" data-action="print" onClick={()=>window.print()}><span className="action-icon">▣</span>چاپ</button>
    <button type="button" data-action="export" onClick={()=>{const payload={generatedAt:new Date().toISOString(),modules,menu,health};const blob=new Blob(["\\uFEFF",JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="naf-dashboard-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url);}}><span className="action-icon">⇩</span>خروجی اطلاعات</button>
   </div>
   <div className="naf-action-group"><span className="muted">اطلاعات از سرویس مرکزی دریافت می‌شود</span></div>
  </section>

  {error&&<div className={styles.notice} role="alert">{error}</div>}
  <section className={styles.metrics} aria-label="شاخص‌های سامانه">
   <article className={styles.metricCard}><span className={styles.metricIcon}><Icon name="org"/></span><div><small>ماژول‌های ثبت‌شده</small><b>{loading?"—":number(modules.length)}</b><em>کاتالوگ مرکزی</em></div><span className={styles.metricIndex}>01</span></article>
   <article className={styles.metricCard}><span className={styles.metricIcon+" "+styles.metricGreen}><Icon name="chart"/></span><div><small>ماژول‌های فعال</small><b>{loading?"—":number(totals.active)}</b><em>وضعیت عملیاتی ثبت‌شده</em></div><span className={styles.metricIndex}>02</span></article>
   <article className={styles.metricCard}><span className={styles.metricIcon+" "+styles.metricBlue}><Icon name="file"/></span><div><small>رکوردهای عملیاتی</small><b>{loading?"—":number(totals.records)}</b><em>جمع شمارنده‌های API</em></div><span className={styles.metricIndex}>03</span></article>
   <article className={styles.metricCard}><span className={styles.metricIcon+" "+styles.metricGold}><Icon name="shield"/></span><div><small>هسته‌های ثبت‌شده</small><b>{loading?"—":number(totals.cores)}</b><em>بر اساس کاتالوگ موجود</em></div><span className={styles.metricIndex}>04</span></article>
  </section>

  <section className={styles.sectionHead}>
   <div><span className={styles.sectionEyebrow}>ORGANIZATION WORKSPACE</span><h3>ساختار مدیریتی سازمان</h3><p>دسترسی به پنل‌ها از منوی مرکزی دریافت‌شده از سرویس.</p></div>
   <label className={styles.search}><Icon name="chart"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجوی پنل یا زیرمجموعه..." aria-label="جستجوی پنل یا زیرمجموعه"/>{query&&<button type="button" onClick={()=>setQuery("")} aria-label="پاک کردن">×</button>}<kbd>⌕</kbd></label>
  </section>

  {menuError?<div className={styles.emptyState}><span>!</span><b>منوی مدیریتی در دسترس نیست</b><p>{menuError}</p></div>:loading?<div className={styles.loadingGrid}>{Array.from({length:6},(_,i)=><div key={i}/>)}</div>:<>
   <section className={styles.panelGrid+" canonical-panel-grid"} data-canonical-panel-count={MASTER_MENU.length}>
    {panels.map((panel,index)=>{
     const children=panel.child_items||[];
     const href=panel.path&&panel.path!=="#"?panel.path:"/modules/";
     return <article className={styles.panelCard} key={panel.id}>
      <div className={styles.panelTop}><span className={styles.panelIcon}><Icon name={iconFor(panel.title)}/></span><span className={styles.panelNumber}>{String(index+1).padStart(2,"0")}</span></div>
      <h4>{panel.title}</h4><p>{panel.menu_key||"پنل مرکزی سازمان"}</p>
      <div className={styles.panelChildren}>{children.slice(0,4).map((child,i)=><Link href={child.path&&child.path!=="#"?child.path:href} key={child.id}><span>{String(i+1).padStart(2,"0")}</span><b>{child.title}</b><i>↗</i></Link>)}
       {!children.length&&<span className={styles.noChildren}>دسترسی به بخش اصلی پنل</span>}
      </div>
      <footer><span>{number(children.length)} زیرمجموعه</span><Link href={href}>ورود به پنل <b>←</b></Link></footer>
     </article>;
    })}
    {!panels.length&&<div className={styles.emptyState}><b>نتیجه‌ای پیدا نشد</b><p>عبارت جستجو را تغییر دهید.</p></div>}
   </section>
   {menu.length===0&&<div className={styles.emptyState}><b>هنوز موردی برای نمایش دریافت نشده است</b><p>فهرست پنل‌ها پس از پاسخ منوی مرکزی نمایش داده می‌شود.</p></div>}
  </>}
  <section className={styles.bottomStrip}><div><span className={styles.bottomIcon}><Icon name="shield"/></span><span><b>حاکمیت و کنترل دسترسی</b><small>مدیریت نقش‌ها، سیاست‌ها و ممیزی در مسیرهای موجود سامانه</small></span></div><Link href="/modules/?code=03-users-access">مشاهده مدیریت دسترسی <b>←</b></Link></section>
 </main>;
}
