"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {api} from "../../lib/api";
import {MASTER_MENU} from "./master-menu";

type ModuleItem={id:number;code:string;title:string;core:string;lifecycle:string;record_count:number;route?:string|null;description?:string|null};

const PANEL_DESCRIPTIONS:Record<string,string>={
 management:"وضعیت کل سامانه، شاخص‌ها و فرمان‌های مدیریتی",
 organization:"هلدینگ، شرکت، شعب، واحدها و ساختار سازمانی",
 "users-access":"حساب‌ها، نقش‌ها، مجوزها و امنیت ورود",
 "customers-360":"پرونده یکپارچه مشتری، ارتباطات و خدمات",
 "smart-calendar":"تقویم سازمانی، تعطیلات و زمان‌بندی",
 "business-rules":"قواعد کسب‌وکار، گردش کار و اتوماسیون",
 sla:"سطح خدمت، تعهدات و پایش عملکرد",
 "accounting-finance":"حسابداری، خزانه، بودجه و کنترل مالی",
 commerce:"کالاها، فروشگاه‌ها، سفارش و زنجیره تأمین",
 domains:"دامنه‌های سازمانی، فروشگاهی و گواهی اتصال",
 acceptors:"پذیرندگان، قراردادها و تسویه",
 sellers:"فروشندگان، فروشگاه، کمیسیون و تسویه",
 "payments-settlement":"درگاه‌ها، پرداخت، بازپرداخت و دفترکل",
 "form-builder":"تعریف فرم، فیلد، اعتبارسنجی و انتشار",
 "menu-builder":"منوی مرکزی، ترتیب، جایگاه و مجوزها",
 "page-builder":"صفحه‌ها، بلوک‌ها، قالب و انتشار",
 "frontend-management":"قالب ظاهری، Header، Footer و ترجمه",
 notifications:"پیامک، ایمیل، اعلان درون‌سامانه و صف ارسال",
 "documents-governance":"زونکن دیجیتال، OCR، گردش اسناد و ممیزی",
 "system-settings":"یکپارچه‌سازی، API، نگهداری و سلامت سامانه"
};

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
     fetch("/health",{credentials:"include",cache:"no-store"}).then(x=>x.ok?x.json():{})
    ]);
    if(!alive)return;
    if(session.status==="fulfilled")setMe(session.value.user);
    if(catalog.status==="fulfilled")setModules(catalog.value.items||[]);
    if(h.status==="fulfilled")setHealth(h.value);
    if(session.status==="rejected"&&catalog.status==="rejected")setError("نشست یا سرویس مرکزی در دسترس نیست.");
   }catch(e){
    if(alive)setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات مرکز مدیریت");
   }finally{if(alive)setLoading(false)}
  })();
  return()=>{alive=false};
 },[]);

 const totals=useMemo(()=>({
  records:modules.reduce((n,m)=>n+(m.record_count||0),0),
  active:modules.filter(m=>m.lifecycle==="active"||m.lifecycle==="operational").length,
  cores:new Set(modules.map(m=>m.core)).size
 }),[modules]);
 const moduleByCode=useMemo(()=>new Map(modules.map(m=>[m.code,m])),[modules]);
 const panels=useMemo(()=>{
  const needle=q.trim().toLocaleLowerCase("fa-IR");
  return MASTER_MENU.filter(panel=>{
   if(!needle)return true;
   return [panel.number,panel.title,PANEL_DESCRIPTIONS[panel.code]||"",...panel.children.map(x=>x.title)].join(" ").toLocaleLowerCase("fa-IR").includes(needle);
  });
 },[q]);

 return <main className="admin-dashboard canonical-dashboard" dir="rtl">
  <section className="dashboard-hero">
   <div className="dashboard-hero-copy">
    <span className="hero-kicker">مرکز فرماندهی · نگار آذین فدک · نسخه ۲۰۲۶</span>
    <h1>مرکز مدیریت سازمان</h1>
    <p>یک داشبورد واحد برای ۲۰ پنل اصلی سازمان. هر پنل از همان منوی مرکزی استفاده می‌کند تا ساختار قدیمی و مسیرهای موازی دوباره‌کاری نسازند.</p>
    <div className="dashboard-identity"><span className="identity-dot"/><b>{me?.fullName||me?.email||"کاربر مدیریتی"}</b><span>فضای مدیریت</span></div>
   </div>
   <div className="dashboard-hero-side">
    <div className="hero-status"><i className={health.database==="ok"?"online":""}/><span>پایگاه داده</span><b>{health.database==="ok"?"متصل":"در حال بررسی"}</b></div>
    <div className="hero-clock">ساختار مرکزی · ۲۰ پنل<br/><small>زیرمنوها از منوی مرکزی سازمان</small></div>
   </div>
  </section>

  {error&&<div className="error dashboard-error" role="alert">{error}</div>}

  <section className="executive-kpis">
   <article><span>پنل‌های اصلی</span><b>{MASTER_MENU.length.toLocaleString("fa-IR")}</b><small>ساختار مرجع واحد</small></article>
   <article><span>ماژول‌های دریافتی</span><b>{modules.length.toLocaleString("fa-IR")}</b><small>از API مرکزی</small></article>
   <article><span>ماژول‌های فعال</span><b>{totals.active.toLocaleString("fa-IR")}</b><small>طبق وضعیت ثبت‌شده</small></article>
   <article><span>رکوردهای عملیاتی</span><b>{totals.records.toLocaleString("fa-IR")}</b><small>طبق شمارش API</small></article>
  </section>

  <section className="dashboard-toolbar">
   <div><span className="section-kicker">MASTER MENU · 2026</span><h2>۲۰ پنل مرکزی سازمان</h2><p>انتخاب هر پنل یا زیرمنو، شما را به مسیر مربوط به همان بخش می‌برد.</p></div>
   <label className="dashboard-search"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجوی پنل یا زیرمنو..." aria-label="جستجوی پنل یا زیرمنو"/></label>
  </section>

  <section className="canonical-panel-grid">
   {panels.map(panel=>{
    const module=panel.moduleCode?moduleByCode.get(panel.moduleCode):undefined;
    const route=panel.route||"/admin";
    const children=panel.children;
    return <article className="canonical-panel-card" key={panel.code}>
     <header className="canonical-panel-head">
      <span className="canonical-panel-number">{panel.number}</span>
      <div className="canonical-panel-heading"><h3>{panel.title}</h3><p>{PANEL_DESCRIPTIONS[panel.code]||"دسترسی یکپارچه به قابلیت‌های این پنل"}</p></div>
      <span className={"canonical-panel-status "+(module?(module.lifecycle==="active"||module.lifecycle==="operational"?"is-active":"is-idle"):"is-unknown")}>{module?(module.lifecycle==="active"||module.lifecycle==="operational"?"فعال":"ثبت‌شده"):"پنل مرجع"}</span>
     </header>
     <div className="canonical-panel-links">
      {children.slice(0,5).map((child,index)=><Link href={child.route||route} key={panel.code+"-"+index}><span>{String(index+1).padStart(2,"0")}</span><b>{child.title}</b><i>↗</i></Link>)}
      {children.length>5&&<div className="canonical-panel-more">+{(children.length-5).toLocaleString("fa-IR")} زیرمنوی دیگر در منوی مرکزی</div>}
     </div>
     <footer><span>{children.length.toLocaleString("fa-IR")} زیرمنو</span><Link href={route}>ورود به پنل <b>←</b></Link></footer>
    </article>;
   })}
   {!panels.length&&<div className="dashboard-empty large">پنل یا زیرمنویی با این عبارت پیدا نشد.</div>}
  </section>
  {!loading&&modules.length===0&&<div className="dashboard-empty large">ساختار ۲۰ پنل نمایش داده می‌شود، اما کاتالوگ وضعیت ماژول‌ها از API دریافت نشد. وضعیت سرویس مرکزی باید بررسی شود.</div>}
 </main>;
}
