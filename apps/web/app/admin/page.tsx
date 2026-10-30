"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {api} from "../../lib/api";

type ModuleItem={id:number;code:string;title:string;core:string;lifecycle:string;record_count:number;route?:string|null;description?:string|null};
type MenuNode={id:string|number;menu_key:string|null;parent_id:string|number|null;title:string;path:string;sort_order:number;permission:string|null;child_items?:MenuNode[]};
const flattenMenuTitles=(nodes:MenuNode[]):string[]=>nodes.flatMap(node=>[node.title,...flattenMenuTitles(node.child_items||[])]);
const menuHref=(path:string|undefined,parent:string,title:string)=>path&&path!=="#"?path:parent+(parent.includes("?")?"&":"?")+"menu="+encodeURIComponent(title);

const PANEL_DESCRIPTIONS:Record<string,string>={
 "01-dashboard":"وضعیت کل سامانه، شاخص‌ها و فرمان‌های مدیریتی",
 "02-organizations":"هلدینگ، شرکت، شعب، واحدها و ساختار سازمانی",
 "03-users-access":"حساب‌ها، نقش‌ها، مجوزها و امنیت ورود",
 "04-customers-360":"پرونده یکپارچه مشتری، ارتباطات و خدمات",
 "05-smart-calendar":"تقویم سازمانی، تعطیلات و زمان‌بندی",
 "06-business-rules":"قواعد کسب‌وکار، گردش کار و اتوماسیون",
 "07-sla":"سطح خدمت، تعهدات و پایش عملکرد",
 "08-accounting-finance":"حسابداری، خزانه، بودجه و کنترل مالی",
 "09-commerce-stores":"کالاها، فروشگاه‌ها، سفارش و زنجیره تأمین",
 "10-domains":"دامنه‌های سازمانی، فروشگاهی و گواهی اتصال",
 "11-merchants":"پذیرندگان، قراردادها و تسویه",
 "12-sellers":"فروشندگان، فروشگاه، کمیسیون و تسویه",
 "13-payments-settlement":"درگاه‌ها، پرداخت، بازپرداخت و دفترکل",
 "14-form-builder":"تعریف فرم، فیلد، اعتبارسنجی و انتشار",
 "15-menu-builder":"منوی مرکزی، ترتیب، جایگاه و مجوزها",
 "16-page-builder":"صفحه‌ها، بلوک‌ها، قالب و انتشار",
 "17-frontend-management":"قالب ظاهری، Header، Footer و ترجمه",
 "18-notifications":"پیامک، ایمیل، اعلان درون‌سامانه و صف ارسال",
 "19-documents-governance":"زونکن دیجیتال، OCR، گردش اسناد و ممیزی",
 "20-system-settings":"یکپارچه‌سازی، API، نگهداری و سلامت سامانه"
};se client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {api} from "../../lib/api";

type ModuleItem={id:number;code:string;title:string;core:string;lifecycle:string;record_count:number;route?:string|null;description?:string|null};
type MenuNode={id:string|number;menu_key:string|null;parent_id:string|number|null;title:string;path:string;sort_order:number;permission:string|null;child_items?:MenuNode[]};
const flattenMenuTitles=(nodes:MenuNode[]):string[]=>nodes.flatMap(node=>[node.title,...flattenMenuTitles(node.child_items||[])]);
const menuHref=(path:string|undefined,parent:string,title:string)=>path&&path!=="#"?path:parent+(parent.includes("?")?"&":"?")+"menu="+encodeURIComponent(title);

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
 const [modules,setModules]=useState<ModuleItem[]>([]);\n const [menuItems,setMenuItems]=useState<MenuNode[]>([]);
 const [health,setHealth]=useState<{status?:string;database?:string}>({});
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [q,setQ]=useState("");

 useEffect(()=>{let alive=true;
  (async()=>{
   try{
    const [session,catalog,tree,h]=await Promise.allSettled([
     api<any>("/api/auth/me"),
     api<any>("/api/platform/modules"),\n     api<any>("/api/dashboard/menu-tree?panel=admin"),
     fetch("/health",{credentials:"include",cache:"no-store"}).then(x=>x.ok?x.json():{})
    ]);
    if(!alive)return;
    if(session.status==="fulfilled")setMe(session.value.user);
    if(catalog.status==="fulfilled")setModules(catalog.value.items||[]);\n    if(tree.status==="fulfilled")setMenuItems(tree.value.items||[]);
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
  return menuItems.filter(panel=>{
   if(!needle)return true;
   const hay=[panel.menu_key||"",panel.title,PANEL_DESCRIPTIONS[panel.menu_key||""]||"",...flattenMenuTitles(panel.child_items||[])].join(" ").toLocaleLowerCase("fa-IR");
   return hay.includes(needle);
  });
 },[menuItems,q]);

 return <main className="admin-dashboard canonical-dashboard" dir="rtl">
  <section className="dashboard-hero">
   <div className="dashboard-hero-copy">
    <span className="hero-kicker">مرکز فرماندهی · نگار آذین فدک · نسخه ۲۰۲۶</span>
    <h1>مرکز مدیریت سازمان</h1>
    <p>یک داشبورد واحد برای ۲۰ پنل اصلی سازمان. هر پنل از همان منوی مرکزی استفاده می‌کند تا ساختار قدیمی و مسیرهای موازی دوباره‌کاری نسازند.</p>
    <div className="dashboard-identity"><span className="identity-dot"/><b>{me?.fullName||me?.email||"کاربر مدیریتی"}</b><span>فضای مدیریت</span></div>
    <nav className="dashboard-quick-actions" aria-label="دسترسی سریع">
     <Link href="/admin" className="dashboard-quick-action dashboard-quick-action-primary"><span aria-hidden="true">▦</span><span><b>پیشخوان مدیریت</b><small>بازگشت به داشبورد مرکزی</small></span><i aria-hidden="true">←</i></Link>
     <Link href="/" target="_blank" rel="noopener noreferrer" className="dashboard-quick-action"><span aria-hidden="true">↗</span><span><b>مشاهده سایت اصلی</b><small>sookar.ir · باز شدن در زبانه جدید</small></span><i aria-hidden="true">↗</i></Link>
     <Link href="/store" target="_blank" rel="noopener noreferrer" className="dashboard-quick-action"><span aria-hidden="true">▣</span><span><b>مشاهده فروشگاه</b><small>صفحه اصلی کالاها و دسته‌بندی‌ها</small></span><i aria-hidden="true">↗</i></Link>
    </nav>
   </div>
   <div className="dashboard-hero-side">
    <div className="hero-status"><i className={health.database==="ok"?"online":""}/><span>پایگاه داده</span><b>{health.database==="ok"?"متصل":"در حال بررسی"}</b></div>
    <div className="hero-clock">ساختار مرکزی · ۲۰ پنل<br/><small>زیرمنوها از منوی مرکزی سازمان</small></div>
   </div>
  </section>

  {error&&<div className="error dashboard-error" role="alert">{error}</div>}

  <section className="executive-kpis">
   <article><span>پنل‌های اصلی</span><b>{menuItems.length.toLocaleString("fa-IR")}</b><small>ساختار دریافت‌شده از پایگاه داده مرکزی</small></article>
   <article><span>ماژول‌های دریافتی</span><b>{modules.length.toLocaleString("fa-IR")}</b><small>از API مرکزی</small></article>
   <article><span>ماژول‌های فعال</span><b>{totals.active.toLocaleString("fa-IR")}</b><small>طبق وضعیت ثبت‌شده</small></article>
   <article><span>رکوردهای عملیاتی</span><b>{totals.records.toLocaleString("fa-IR")}</b><small>طبق شمارش API</small></article>
  </section>

  <section className="dashboard-toolbar">
   <div><span className="section-kicker">منوی مرکزی پویا · ۲۰۲۶</span><h2>۲۰ پنل مرکزی سازمان</h2><p>انتخاب هر پنل یا زیرمنو، شما را به مسیر مربوط به همان بخش می‌برد.</p></div>
   <label className="dashboard-search"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجوی پنل یا زیرمنو..." aria-label="جستجوی پنل یا زیرمنو"/></label>
  </section>

  <section className="canonical-panel-grid">
   {panels.map(panel=>{
    const code=panel.menu_key||String(panel.id);
    const number=code.match(/^\\d{2}/)?.[0]||String(panel.sort_order).padStart(2,"0");
    const route=menuHref(panel.path,"/admin",panel.title);
    const moduleCode=new URLSearchParams(route.split("?")[1]||"").get("code")||code;
    const module=moduleByCode.get(moduleCode);
    const children=panel.child_items||[];
    return <article className="canonical-panel-card" key={code}>
     <header className="canonical-panel-head">
      <span className="canonical-panel-number">{number}</span>
      <div className="canonical-panel-heading"><h3>{panel.title}</h3><p>{PANEL_DESCRIPTIONS[code]||"دسترسی یکپارچه به قابلیت‌های این پنل"}</p></div>
      <span className={"canonical-panel-status "+(module?(module.lifecycle==="active"||module.lifecycle==="operational"?"is-active":"is-idle"):"is-unknown")}>{module?(module.lifecycle==="active"||module.lifecycle==="operational"?"فعال":"ثبت‌شده"):"پنل مرجع"}</span>
     </header>
     <div className="canonical-panel-links">
      {children.slice(0,5).map((child,index)=><Link href={menuHref(child.path,route,child.title)} key={child.id}><span>{String(index+1).padStart(2,"0")}</span><b>{child.title}</b><i>↗</i></Link>)}
      {children.length>5&&<div className="canonical-panel-more">+{(children.length-5).toLocaleString("fa-IR")} زیرمنوی دیگر در منوی مرکزی</div>}
     </div>
     <footer><span>{children.length.toLocaleString("fa-IR")} زیرمنو</span><Link href={route}>ورود به پنل <b>←</b></Link></footer>
    </article>;
   })}
   {!panels.length&&<div className="dashboard-empty large">پنل یا زیرمنویی با این عبارت پیدا نشد.</div>}
  </section>
  {!loading&&modules.length===0&&<div className="dashboard-empty large">منوی مرکزی از API دریافت شد، اما کاتالوگ وضعیت ماژول‌ها در دسترس نیست. وضعیت سرویس مرکزی باید بررسی شود.</div>}
 </main>;
}
