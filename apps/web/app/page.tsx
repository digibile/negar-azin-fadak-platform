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
    api<MenuItem[]>("/api/dashboard/menu-tree")
      .then(rows=>{
        if(!alive)return;
        setItems(rows);
        const first=rows.find(x=>x.parent_id===null&&x.path!==" /".trim());
        setOpen(first?.id??null);
      })
      .catch(()=>{if(alive)window.location.href="/login";})
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
  if(error)return <main className="enterprise-loading error">{error}</main>;

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
