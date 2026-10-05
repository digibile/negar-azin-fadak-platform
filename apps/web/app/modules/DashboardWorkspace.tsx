"use client";

import {useEffect,useState} from "react";
import styles from "./DashboardWorkspace.module.css";

type Overview={tenant:{id:string;name:string};kpis:any;recent:any[]};

export default function DashboardWorkspace(){
 const [data,setData]=useState<Overview|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [tab,setTab]=useState("dashboard");\n useEffect(()=>{const t=new URLSearchParams(window.location.search).get("tab");if(t)setTab(t)},[]);
 const load=async()=>{try{const r=await fetch("/api/dashboard/overview",{credentials:"include"});const b=await r.json();if(!r.ok)throw new Error(b.error||"دریافت داشبورد ناموفق بود");setData(b)}catch(e){setError(e instanceof Error?e.message:"خطا")}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const n=(v:any)=>Number(v||0).toLocaleString("fa-IR");
 return <main className={styles.workspace} dir="rtl">
  <header className={styles.hero}><div><span>منوی ۰۱ · داشبورد و مرکز مدیریت</span><h1>{({dashboard:"داشبورد اصلی",executive:"داشبورد مدیرعامل",finance:"داشبورد مدیر مالی",sales:"داشبورد فروش",operations:"داشبورد عملیات",branches:"داشبورد شعب",kpi:"KPI سازمان",alerts:"هشدارهای مدیریتی",activity:"فعالیت‌های اخیر",notifications:"اعلان‌های مهم"} as Record<string,string>)[tab]||"مرکز مدیریت سازمان"}</h1><p>{data?.tenant.name||"سازمان جاری"} · نمای زنده از داده‌های واقعی سامانه</p></div><button onClick={load}>↻ به‌روزرسانی</button></header>
  {error&&<div className={styles.error}>{error}</div>}
  {loading?<section className={styles.loading}>در حال دریافت وضعیت واقعی سازمان...</section>:data&&<>
   <section className={styles.cards}>
    <article><span>ماژول‌های فعال</span><b>{n(data.kpis.modules.active)}</b><small>از {n(data.kpis.modules.total)} ماژول</small></article>
    <article><span>رکوردهای عملیاتی</span><b>{n(data.kpis.records.active)}</b><small>{n(data.kpis.records.total)} رکورد واقعی</small></article>
    <article><span>اسناد دفترکل</span><b>{n(data.kpis.ledger.total)}</b><small>بدهکار {n(data.kpis.ledger.debit)}</small></article>
    <article><span>اعلان‌های خوانده‌نشده</span><b>{n(data.kpis.notifications.unread)}</b><small>{n(data.kpis.notifications.queued)} در صف</small></article>
    <article><span>رخدادهای حسابرسی</span><b>{n(data.kpis.audit.total)}</b><small>ثبت‌شده در سازمان</small></article>
    <article><span>حرکت‌های انبار</span><b>{n(data.kpis.inventory.total)}</b><small>مقدار {n(data.kpis.inventory.quantity)}</small></article>
   </section>
   <section className={styles.grid}>
    <article className={styles.panel}><header><h2>فعالیت‌های اخیر</h2><span>۱۲ مورد آخر</span></header>{data.recent.map(x=><div className={styles.event} key={x.id}><div><strong>{x.action}</strong><small>{x.entity_type} · {x.entity_id||"بدون شناسه"}</small></div><time>{new Date(x.created_at).toLocaleString("fa-IR")}</time></div>)}{!data.recent.length&&<div className={styles.empty}>هنوز رخداد حسابرسی ثبت نشده است.</div>}</article>
    <article className={styles.panel}><header><h2>دسترسی سریع</h2><span>صفحات اصلی</span></header><div className={styles.links}><a href="/modules/?code=governance">ساختار سازمان</a><a href="/modules/?code=security">کاربران و امنیت</a><a href="/modules/?code=accounting-finance">حسابداری</a><a href="/modules/?code=crm">CRM</a><a href="/modules/?code=marketplace">مارکت‌پلیس</a><a href="/admin/editors">ویرایش منو و صفحات</a></div></article>
   </section>
  </>}
 </main>;
}
