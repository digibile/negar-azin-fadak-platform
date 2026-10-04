"use client";

import { useMemo, useState } from "react";

type Module={id:number;title:string;core:string;code:string};

const modules:Module[]=[
{id:1,title:"حاکمیت و ساختار سازمانی",core:"هسته مرکزی",code:"governance"},
{id:2,title:"هویت، کاربران و امنیت",core:"هسته مرکزی",code:"identity"},
{id:3,title:"داده‌های پایه سازمان",core:"هسته مرکزی",code:"master-data"},
{id:4,title:"مشتری 360",core:"هسته مرکزی",code:"customer-360"},
{id:5,title:"تقویم سازمانی هوشمند",core:"هسته مرکزی",code:"smart-calendar"},
{id:6,title:"موتور قوانین کسب‌وکار",core:"هسته مرکزی",code:"business-rules"},
{id:7,title:"موتور SLA",core:"هسته مرکزی",code:"sla"},
{id:8,title:"حسابداری و مالی",core:"مالی",code:"accounting-finance"},
{id:9,title:"خزانه و بانک",core:"مالی",code:"treasury-bank"},
{id:10,title:"کیف پول و دفتر تراکنش",core:"مالی",code:"wallet-ledger"},
{id:11,title:"اعتبار و تسهیلات",core:"اعتبار",code:"credit-facilities"},
{id:12,title:"موتور اعتبارسنجی",core:"اعتبار",code:"credit-scoring"},
{id:13,title:"وام و قرارداد",core:"اعتبار",code:"loans-contracts"},
{id:14,title:"اقساط",core:"اعتبار",code:"installments"},
{id:15,title:"وصول مطالبات",core:"اعتبار",code:"collections"},
{id:16,title:"فروش و تجارت",core:"تجارت",code:"sales-trade"},
{id:17,title:"Marketplace",core:"تجارت",code:"marketplace"},
{id:18,title:"تحویل و لجستیک",core:"تجارت",code:"delivery-logistics"},
{id:19,title:"کمیسیون",core:"تجارت",code:"commission"},
{id:20,title:"تسویه",core:"تجارت",code:"settlement"},
{id:21,title:"پرداخت",core:"تجارت",code:"payments"},
{id:22,title:"مرکز ارائه‌دهندگان و یکپارچه‌سازی",core:"تجارت",code:"providers-integrations"},
{id:23,title:"مرکز ارتباطات",core:"ارتباطات",code:"communications"},
{id:24,title:"موتور رویداد و اعلان",core:"ارتباطات",code:"events-notifications"},
{id:25,title:"CRM",core:"ارتباطات",code:"crm"},
{id:26,title:"مرکز تماس",core:"ارتباطات",code:"contact-center"},
{id:27,title:"تیکت و پشتیبانی",core:"ارتباطات",code:"tickets-support"},
{id:28,title:"اسناد و اتوماسیون اداری",core:"اسناد و محتوا",code:"documents-office"},
{id:29,title:"زونکن دیجیتال",core:"اسناد و محتوا",code:"digital-binder"},
{id:30,title:"مدیریت وب‌سایت و دامنه",core:"اسناد و محتوا",code:"web-domain"},
{id:31,title:"صفحه‌ساز",core:"اسناد و محتوا",code:"page-builder"},
{id:32,title:"فرم‌ساز",core:"اسناد و محتوا",code:"form-builder"},
{id:33,title:"مدیریت محتوا",core:"اسناد و محتوا",code:"content-management"},
{id:34,title:"هوش نگار",core:"اسناد و محتوا",code:"negar-ai"},
{id:35,title:"منابع انسانی",core:"سازمان و عملیات",code:"human-resources"},
{id:36,title:"پروژه و عملیات",core:"سازمان و عملیات",code:"projects-operations"},
{id:37,title:"گزارش و تحلیل",core:"سازمان و عملیات",code:"reports-analytics"},
{id:38,title:"مرکز فرماندهی",core:"مرکز فرمان",code:"command-center"},
{id:39,title:"مانیتورینگ و رخدادها",core:"مرکز فرمان",code:"monitoring-events"},
{id:40,title:"حسابرسی و کنترل",core:"مرکز فرمان",code:"audit-control"},
{id:41,title:"مستندات",core:"مرکز فرمان",code:"documentation"},
{id:42,title:"API و یکپارچه‌سازی",core:"مرکز فرمان",code:"api-integration"},
{id:43,title:"زیرساخت و داده",core:"مرکز فرمان",code:"infrastructure-data"},
{id:44,title:"اپلیکیشن موبایل",core:"مرکز فرمان",code:"mobile-app"},
{id:45,title:"کیفیت و چرخه توسعه",core:"مرکز فرمان",code:"quality-lifecycle"}
];

const cores=["همه","هسته مرکزی","مالی","اعتبار","تجارت","ارتباطات","اسناد و محتوا","سازمان و عملیات","مرکز فرمان"];

export default function HomePage(){
 const [core,setCore]=useState("همه");
 const [query,setQuery]=useState("");
 const [selected,setSelected]=useState<Module|null>(null);
 const filtered=useMemo(()=>modules.filter(m=>(core==="همه"||m.core===core)&&m.title.toLowerCase().includes(query.toLowerCase())),[core,query]);
 return <main className="shell">
  <aside className="sidebar">
   <div className="brand"><span className="brand-mark">ن</span><div><strong>نگار آذین فدک</strong><small>مرکز مدیریت</small></div></div>
   <nav aria-label="منوی مرکزی سازمان">
    <div className="nav-item active"><span className="nav-icon">⌂</span><span>داشبورد مرکزی</span></div>
    <a className="nav-item" href="/operations/"><span className="nav-icon">27</span><span>مرکز عملیات ۱۹ تا ۲۷</span></a>
    <div className="nav-item"><span className="nav-icon">45</span><span>هسته‌های کسب‌وکار</span></div>
    <div className="nav-item"><span className="nav-icon">▦</span><span>صفحه‌ساز و فرم‌ساز</span></div>
    <div className="nav-item"><span className="nav-icon">⚙</span><span>مدیریت دسترسی</span></div>
   </nav>
  </aside>
  <section className="content">
   <header className="topbar"><div><span className="eyebrow">منوی مرکزی سازمان</span><h1>مرکز مدیریت نگار آذین فدک</h1></div><div className="status">معماری ۴۵ ماژول</div></header>
   <section className="hero">
    <span className="eyebrow">پلتفرم بیزینس نگار آذین فدک ایران</span>
    <h2>هسته مرکزی کسب‌وکار</h2>
    <p>نمایش زنده ساختار ماژولار سامانه. هر ماژول در مسیر توسعه به سرویس واقعی، مجوز، مهاجرت پایگاه داده، آزمون و رابط کاربری متصل می‌شود.</p>
    <div className="hero-stats"><span><b>45</b> ماژول</span><span><b>8</b> هسته اجرایی</span><span><b>PostgreSQL</b> پایگاه داده</span></div>
   </section>
   <section className="module-toolbar">
    <input aria-label="جستجوی ماژول" placeholder="جستجو در ماژول‌ها..." value={query} onChange={e=>setQuery(e.target.value)}/>
    <div className="tabs">{cores.map(c=><button key={c} className={core===c?"primary":""} onClick={()=>setCore(c)}>{c}</button>)}</div>
   </section>
   <div className="module-grid">{filtered.map(m=><article className="module-card" key={m.id} onClick={()=>setSelected(m)} role="button" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&setSelected(m)}><div className="module-head"><span className="module-id">{String(m.id).padStart(2,"0")}</span><span className="pill">{m.core}</span></div><h3>{m.title}</h3><small>{m.code}</small><div className="module-state">در معماری مرکزی</div></article>)}</div>
  </section>
  {selected&&<div className="modal-backdrop" role="presentation" onClick={()=>setSelected(null)}><section className="modal-card" role="dialog" aria-modal="true" aria-label={selected.title} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">ماژول {String(selected.id).padStart(2,"0")}</span><h2>{selected.title}</h2></div><button onClick={()=>setSelected(null)} aria-label="بستن">×</button></div><div className="modal-meta"><span className="pill">{selected.core}</span><code>{selected.code}</code></div><p>این ماژول به رجیستری مرکزی، مجوز، API و چرخه اجرای واقعی سامانه متصل می‌شود.</p><div className="modal-actions"><a href={"/modules?code="+encodeURIComponent(selected.code)}>ورود به فضای ماژول</a><button onClick={()=>setSelected(null)}>بستن</button></div></section></div>}
 </main>;
}
