"use client";

import {useMemo,useState} from "react";

type Module={id:number;title:string;core:string;code:string};
type Group={name:string;range:string;description:string};

const modules:Module[]=[[1,"حاکمیت و ساختار سازمانی","هسته مرکزی","governance"],[2,"هویت، کاربران و امنیت","هسته مرکزی","identity"],[3,"داده‌های پایه سازمان","هسته مرکزی","master-data"],[4,"مشتری 360","هسته مرکزی","customer-360"],[5,"تقویم سازمانی هوشمند","هسته مرکزی","smart-calendar"],[6,"موتور قوانین کسب‌وکار","هسته مرکزی","business-rules"],[7,"موتور SLA","هسته مرکزی","sla"],[8,"حسابداری و مالی","مالی","accounting-finance"],[9,"خزانه و بانک","مالی","treasury-bank"],[10,"کیف پول و دفتر تراکنش","مالی","wallet-ledger"],[11,"اعتبار و تسهیلات","اعتبار","credit-facilities"],[12,"موتور اعتبارسنجی","اعتبار","credit-scoring"],[13,"وام و قرارداد","اعتبار","loans-contracts"],[14,"اقساط","اعتبار","installments"],[15,"وصول مطالبات","اعتبار","collections"],[16,"فروش و تجارت","تجارت","sales-trade"],[17,"Marketplace","تجارت","marketplace"],[18,"تحویل و لجستیک","تجارت","delivery-logistics"],[19,"کمیسیون","تجارت","commission"],[20,"تسویه","تجارت","settlement"],[21,"پرداخت","تجارت","payments"],[22,"مرکز ارائه‌دهندگان و یکپارچه‌سازی","تجارت","providers-integrations"],[23,"مرکز ارتباطات","ارتباطات","communications"],[24,"موتور رویداد و اعلان","ارتباطات","events-notifications"],[25,"CRM","ارتباطات","crm"],[26,"مرکز تماس","ارتباطات","contact-center"],[27,"تیکت و پشتیبانی","ارتباطات","tickets-support"],[28,"اسناد و اتوماسیون اداری","اسناد و محتوا","documents-office"],[29,"زونکن دیجیتال","اسناد و محتوا","digital-binder"],[30,"مدیریت وب‌سایت و دامنه","اسناد و محتوا","web-domain"],[31,"صفحه‌ساز","اسناد و محتوا","page-builder"],[32,"فرم‌ساز","اسناد و محتوا","form-builder"],[33,"مدیریت محتوا","اسناد و محتوا","content-management"],[34,"هوش نگار","اسناد و محتوا","negar-ai"],[35,"منابع انسانی","سازمان و عملیات","human-resources"],[36,"پروژه و عملیات","سازمان و عملیات","projects-operations"],[37,"گزارش و تحلیل","سازمان و عملیات","reports-analytics"],[38,"مرکز فرماندهی","مرکز فرمان","command-center"],[39,"مانیتورینگ و رخدادها","مرکز فرمان","monitoring-events"],[40,"حسابرسی و کنترل","مرکز فرمان","audit-control"],[41,"مستندات","مرکز فرمان","documentation"],[42,"API و یکپارچه‌سازی","مرکز فرمان","api-integration"],[43,"زیرساخت و داده","مرکز فرمان","infrastructure-data"],[44,"اپلیکیشن موبایل","مرکز فرمان","mobile-app"],[45,"کیفیت و چرخه توسعه","مرکز فرمان","quality-lifecycle"]];
const groups:Group[]=[["هسته مرکزی","01–07","حاکمیت، هویت، داده، مشتری و قواعد سازمانی"],["مالی","08–10","حسابداری، خزانه و دفتر تراکنش"],["اعتبار","11–15","تسهیلات، اعتبارسنجی، قرارداد، اقساط و وصول"],["تجارت","16–22","فروش، بازار، تحویل، کمیسیون، تسویه و پرداخت"],["ارتباطات","23–27","ارتباطات، اعلان، CRM، تماس و پشتیبانی"],["اسناد و محتوا","28–34","اسناد، زونکن، وب، صفحه‌ساز، فرم‌ساز و محتوا"],["سازمان و عملیات","35–37","منابع انسانی، پروژه و گزارش"],["مرکز فرمان","38–45","فرماندهی، مانیتورینگ، حسابرسی، API و زیرساخت"]];

export default function HomePage(){
 const [open,setOpen]=useState<string>("هسته مرکزی");
 const [query,setQuery]=useState("");
 const filtered=useMemo(()=>modules.filter(m=>(m.title+" "+m.code+" "+m.core).toLowerCase().includes(query.toLowerCase())),[query]);
 const count=(core:string)=>modules.filter(m=>m.core===core).length;
 return <main className="enterprise-shell" dir="rtl">
  <aside className="enterprise-sidebar">
   <div className="enterprise-brand"><div className="brand-symbol">ن</div><div><strong>نگار آذین فدک</strong><span>مرکز مدیریت سازمان</span></div></div>
   <div className="sidebar-section-title">منوی مرکزی سازمان</div>
   <nav className="tree-nav">
    <a className="tree-root active" href="/"><span className="tree-icon">⌂</span><span>داشبورد مرکزی</span></a>
    {groups.map(g=><div className="tree-group" key={g.name}>
      <button className="tree-group-head" onClick={()=>setOpen(open===g.name?"":g.name)}>
       <span className="tree-chevron">{open===g.name?"⌄":"‹"}</span><span className="tree-index">{g.range}</span><span className="tree-group-name">{g.name}</span><b>{count(g.name)}</b>
      </button>
      {open===g.name&&<div className="tree-children">{modules.filter(m=>m.core===g.name).map(m=><a key={m.code} href={"/modules/?code="+encodeURIComponent(m.code)}><span>{String(m.id).padStart(2,"0")}</span><em>{m.title}</em></a>)}</div>}
    </div>)}
   </nav>
   <div className="sidebar-footer"><a href="/admin/">مدیریت دسترسی و تنظیمات</a><small>هسته مرکزی · ۴۵ ماژول · ۸ هسته</small></div>
  </aside>

  <section className="enterprise-main">
   <header className="enterprise-topbar">
    <div><span className="section-kicker">منوی مرکزی سازمان</span><h1>مرکز مدیریت نگار آذین فدک</h1></div>
    <div className="top-actions"><span className="system-state"><i/>ساختار سامانه</span><a href="/admin/">مدیریت</a></div>
   </header>

   <section className="command-hero">
    <div><span className="hero-kicker">پلتفرم بیزینس نگار آذین فدک ایران</span><h2>مرکز فرمان مدیریت کسب‌وکار</h2><p>دسترسی یکپارچه به هشت هسته اجرایی و ۴۵ ماژول عملیاتی، بر پایه ساختار مرکزی سازمان.</p></div>
    <div className="hero-metrics"><div><b>۴۵</b><span>ماژول فعال معماری</span></div><div><b>۸</b><span>هسته اجرایی</span></div><div><b>۱۴</b><span>مهاجرت پایگاه داده</span></div></div>
   </section>

   <section className="workspace-head"><div><span className="section-kicker">ساختار عملیاتی</span><h2>درخت هسته‌های کسب‌وکار</h2></div><label className="global-search">جستجو در ساختار<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="نام ماژول، کد یا هسته..." /></label></section>

   <section className="core-board">
    {groups.map(g=><article className="core-panel" key={g.name}>
      <button className="core-panel-head" onClick={()=>setOpen(g.name)}><div><span>{g.range}</span><h3>{g.name}</h3><p>{g.description}</p></div><strong>{count(g.name)}</strong></button>
      <div className="core-module-list">{filtered.filter(m=>m.core===g.name).map(m=><a key={m.code} href={"/modules/?code="+encodeURIComponent(m.code)}><span className="module-number">{String(m.id).padStart(2,"0")}</span><span><b>{m.title}</b><small>{m.code}</small></span><i>›</i></a>)}</div>
    </article>)}
   </section>
  </section>
 </main>;
}
