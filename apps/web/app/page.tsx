"use client";

import {useEffect,useMemo,useState} from "react";
import {api} from "../lib/api";

type MenuItem={
  id:string;
  parent_id:string|null;
  title:string;
  path:string;
  icon:string|null;
  sort_order:number;
  permission:string|null;
};

export default function HomePage(){
  const [items,setItems]=useState<MenuItem[]>([]);
  const [query,setQuery]=useState("");
  const [open,setOpen]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let alive=true;
    api<{items:MenuItem[]}>("/api/dashboard/menu-tree")
      .then(body=>{
        if(!alive)return;
        const rows=body.items||[];
        setItems(rows);
        const first=rows.find(x=>x.parent_id===null&&x.path!==" /".trim());
        setOpen(first?.id??null);
      })
      .catch(()=>{if(alive)setError("نمای زنده منوی سازمان در دسترس نیست؛ از بخش‌های عمومی سامانه استفاده کنید یا پس از بررسی اتصال، دوباره وارد مرکز مدیریت شوید.");})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false};
  },[]);

  const roots=useMemo(()=>items.filter(x=>x.parent_id===null).sort((a,b)=>a.sort_order-b.sort_order),[items]);
  const children=useMemo(()=>items.filter(x=>x.parent_id!==null).sort((a,b)=>a.sort_order-b.sort_order),[items]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return q?children.filter(x=>(x.title+" "+x.path).toLowerCase().includes(q)):children;
  },[children,query]);

  if(loading)return <main className="enterprise-loading">در حال بارگذاری ساختار واقعی سامانه...</main>;
  if(error)return <main className="public-home" dir="rtl">
    <header className="public-home-header"><a className="public-home-brand" href="/"><span>ن</span><div><b>نگار آذین فدک</b><small>پلتفرم بیزینس ایران</small></div></a><nav><a href="/marketplace">بازارگاه</a><a href="/pay">اعتبار و پرداخت</a><a href="/store">فروشگاه</a><a className="public-home-login" href="/login">ورود سازمانی ↗</a></nav></header>
    <section className="public-home-hero"><div className="public-home-copy"><span className="public-home-eyebrow"><i/> سامانه یکپارچه مدیریت کسب‌وکار · نسخه ۲۰۲۶</span><h1>همه بخش‌های کسب‌وکار،<br/><em>در یک مسیر روشن.</em></h1><p>فضای یکپارچه نگار آذین فدک برای مدیریت سازمان، تجارت، پرداخت، اعتبار و عملیات؛ با مسیرهای مشخص و بدون پرش ناخواسته به صفحه ورود.</p><div className="public-home-actions"><a className="public-home-primary" href="/login">ورود به مرکز مدیریت ←</a><a className="public-home-secondary" href="/marketplace">مشاهده بخش‌های عمومی</a></div><div className="public-home-proof"><span><b>۲۰۲۶</b><small>طراحی به‌روز</small></span><span><b>یکپارچه</b><small>مسیرهای روشن</small></span><span><b>RTL</b><small>فارسی و موبایل‌محور</small></span></div></div>
    <div className="public-home-visual" aria-hidden="true"><div className="public-home-orbit orbit-one"/><div className="public-home-orbit orbit-two"/><div className="public-home-orbit orbit-three"/><div className="public-home-core"><span>ن</span><b>هسته مرکزی</b><small>نگار آذین فدک</small></div><div className="public-home-float float-top">مدیریت سازمان <i>✓</i></div><div className="public-home-float float-bottom">تجارت و پرداخت <i>↗</i></div></div></section>
    <section className="public-home-sections"><div className="public-home-section-title"><span>ورود به بخش‌ها</span><h2>از مسیر درست وارد شوید</h2><p>بخش‌های عمومی مستقیماً باز می‌شوند؛ ورود سازمانی فقط برای امکانات مدیریتی لازم است.</p></div><div className="public-home-grid">
    <a className="public-home-card" href="/marketplace"><span className="public-home-card-icon">◈</span><small>۰۱ · COMMERCE</small><b>بازارگاه و فروشندگان</b><p>مشاهده فروشگاه‌ها، محصولات و مسیرهای تجاری.</p><span className="public-home-arrow">←</span></a>
    <a className="public-home-card" href="/store"><span className="public-home-card-icon">▦</span><small>۰۲ · STORE</small><b>فروشگاه اینترنتی</b><p>ورود به فضای عمومی فروشگاه و محصولات.</p><span className="public-home-arrow">←</span></a>
    <a className="public-home-card" href="/pay"><span className="public-home-card-icon">◇</span><small>۰۳ · PAYMENTS</small><b>اعتبار و پرداخت</b><p>طرح‌های اعتباری، پرداخت‌ها و خدمات مرتبط.</p><span className="public-home-arrow">←</span></a>
    <a className="public-home-card" href="/login"><span className="public-home-card-icon">⌘</span><small>۰۴ · ORGANIZATION</small><b>مرکز مدیریت سازمان</b><p>ورود امن برای مدیریت و عملیات داخلی سازمان.</p><span className="public-home-arrow">←</span></a>
    </div></section><footer className="public-home-footer"><span>نگار آذین فدک ایران</span><span>هسته مرکزی کسب‌وکار · طراحی فارسی و راست‌چین</span><a href="/login">ورود سازمانی ↗</a></footer>
  </main>;

  return <main className="enterprise-shell" dir="rtl">
    <aside className="enterprise-sidebar">
      <div className="enterprise-brand">
        <div className="brand-symbol">ن</div>
        <div><strong>نگار آذین فدک</strong><span>مرکز مدیریت سازمان</span></div>
      </div>
      <div className="sidebar-section-title">منوی مرکزی سازمان</div>
      <nav className="tree-nav">
        {roots.map(root=>{
          const childItems=filtered.filter(x=>x.parent_id===root.id);
          return <div className="tree-group" key={root.id}>
            <a className={root.path==="/"?"tree-root active":"tree-root"} href={root.path}>
              <span className="tree-icon">•</span><span>{root.title}</span>
            </a>
            {root.path!=="/"&&<button className="tree-group-head" onClick={()=>setOpen(open===root.id?null:root.id)}>
              <span className="tree-chevron">{open===root.id?"⌄":"‹"}</span>
              <span className="tree-group-name">{root.title}</span>
              <b>{childItems.length}</b>
            </button>}
            {root.path!=="/"&&open===root.id&&<div className="tree-children">
              {childItems.map(item=><a key={item.id} href={item.path}><span>{item.sort_order}</span><em>{item.title}</em></a>)}
            </div>}
          </div>
        })}
      </nav>
      <div className="sidebar-footer">
        <a href="/admin">مرکز مدیریت</a>
        <small>{children.length} ورودی از منوی پایگاه داده</small>
      </div>
    </aside>

    <section className="enterprise-main">
      <header className="enterprise-topbar">
        <div><span className="section-kicker">پلتفرم بیزینس نگار آذین فدک ایران</span><h1>مرکز مدیریت نگار آذین فدک</h1></div>
        <div className="top-actions"><span className="system-state"><i/>اتصال پایگاه داده فعال</span><a href="/admin">مدیریت</a></div>
      </header>

      <section className="command-hero">
        <div>
          <span className="hero-kicker">منوی مرکزی سازمان</span>
          <h2>مرکز فرمان مدیریت کسب‌وکار</h2>
          <p>ساختار ناوبری، دسترسی‌ها و ماژول‌های عملیاتی از سرویس واقعی سامانه دریافت می‌شوند.</p>
        </div>
        <div className="hero-metrics">
          <div><b>{roots.length}</b><span>هسته اصلی</span></div>
          <div><b>{children.length}</b><span>ورودی عملیاتی</span></div>
          <div><b>{items.length}</b><span>آیتم منو</span></div>
        </div>
      </section>

      <section className="workspace-head">
        <div><span className="section-kicker">ساختار عملیاتی</span><h2>ماژول‌های سامانه</h2></div>
        <label className="global-search">جستجو در منوی مرکزی<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="نام ماژول یا مسیر..." /></label>
      </section>

      <section className="core-board">
        {roots.filter(x=>x.path!=="/").map(root=>{
          const list=filtered.filter(x=>x.parent_id===root.id);
          return <article className="core-panel" key={root.id}>
            <button className="core-panel-head" onClick={()=>setOpen(root.id)}>
              <div><span>{root.sort_order}</span><h3>{root.title}</h3><p>ماژول‌های متصل به این هسته از منوی مرکزی خوانده می‌شوند.</p></div>
              <strong>{list.length}</strong>
            </button>
            <div className="core-module-list">
              {list.map(item=><a key={item.id} href={item.path}>
                <span className="module-number">{item.sort_order}</span>
                <span><b>{item.title}</b><small>{item.path}</small></span>
                <i>‹</i>
              </a>)}
              {!list.length&&<div className="empty">موردی مطابق جستجو پیدا نشد.</div>}
            </div>
          </article>;
        })}
      </section>
    </section>
  </main>;
}
