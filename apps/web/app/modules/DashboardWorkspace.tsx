"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./DashboardWorkspace.module.css";

type Tab={key:string;title:string;description:string};
const tabs:Tab[]=[
 {key:"dashboard",title:"داشبورد اصلی",description:"نمای زنده و تجمیعی سازمان"},
 {key:"executive",title:"داشبورد مدیرعامل",description:"شاخص‌های کلیدی برای تصمیم‌گیری"},
 {key:"finance",title:"داشبورد مدیر مالی",description:"دفترکل، حساب‌ها و تعهدات تسویه"},
 {key:"sales",title:"داشبورد فروش",description:"سفارش‌ها، وضعیت فروش و مبالغ واقعی"},
 {key:"operations",title:"داشبورد عملیات",description:"موجودی، فروشگاه‌ها و سفارش‌های در جریان"},
 {key:"branches",title:"داشبورد شعب",description:"وضعیت واقعی شعب سازمان"},
 {key:"kpi",title:"KPI سازمان",description:"شاخص‌های عملکردی محاسبه‌شده از PostgreSQL"},
 {key:"alerts",title:"هشدارهای مدیریتی",description:"SLA و اعلان‌های نیازمند توجه"},
 {key:"activity",title:"فعالیت‌های اخیر",description:"رخدادهای حسابرسی سازمان"},
 {key:"notifications",title:"اعلان‌های مهم",description:"اعلان‌های واقعی سامانه"}
];

const api=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";
const nf=(v:any)=>Number(v||0).toLocaleString("fa-IR");
const money=(v:any)=>Number(v||0).toLocaleString("fa-IR")+" ریال";

export default function DashboardWorkspace(){
 const [tab,setTab]=useState("dashboard"),[data,setData]=useState<any>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[q,setQ]=useState("");
 const current=useMemo(()=>tabs.find(x=>x.key===tab)||tabs[0],[tab]);

 const load=async(nextTab=tab)=>{
  setLoading(true);setError("");
  try{
   const effective=nextTab==="dashboard"?"kpi":nextTab;
   const r=await fetch(api+"/api/dashboard/workspace?tab="+encodeURIComponent(effective)+"&limit=100"+(q?"&q="+encodeURIComponent(q):""),{credentials:"include"});
   const b=await r.json();if(!r.ok)throw new Error(b?.error||"دریافت اطلاعات ناموفق بود");
   setData(b);
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات")}
  finally{setLoading(false)}
 };
 useEffect(()=>{const t=new URLSearchParams(window.location.search).get("tab");if(t&&tabs.some(x=>x.key===t))setTab(t)},[]);
 useEffect(()=>{load(tab)},[tab]);

 const changeTab=(k:string)=>{setTab(k);history.replaceState(null,"","/modules/?code=command-center&tab="+encodeURIComponent(k));};
 const markRead=async(id:string)=>{const r=await fetch(api+"/api/dashboard/notifications/"+id+"/read",{method:"POST",credentials:"include",headers:{"X-CSRF-Token":csrf()}});if(r.ok)load("notifications")};

 return <main className={styles.workspace} dir="rtl">
  <header className={styles.hero}>
   <div><span>منوی ۰۱ · داشبورد و مرکز مدیریت</span><h1>{current.title}</h1><p>{data?.tenant?.name||"سازمان جاری"} · {current.description}</p></div>
   <button onClick={()=>load(tab)}>↻ به‌روزرسانی داده واقعی</button>
  </header>

  <nav className={styles.tabs}>{tabs.map(x=><button key={x.key} className={tab===x.key?styles.active:""} onClick={()=>changeTab(x.key)}>{x.title}</button>)}</nav>
  {error&&<div className={styles.error}>{error}</div>}
  {loading?<section className={styles.loading}>در حال دریافت داده واقعی از PostgreSQL...</section>:data&&<section className={styles.content}>

   {(tab==="dashboard"||tab==="executive"||tab==="kpi")&&<div className={styles.cards}>
    {[
     ["کاربران",data.kpis?.users],["شرکت‌های فعال",data.kpis?.companies],["شعب فعال",data.kpis?.branches],
     ["فروشندگان فعال",data.kpis?.sellers],["فروشگاه‌های فعال",data.kpis?.stores],["محصولات فعال",data.kpis?.products],
     ["کل سفارش‌ها",data.kpis?.orders],["سفارش‌های باز",data.kpis?.openOrders],["مبلغ سفارش‌ها",money(data.kpis?.totalOrdersAmount)],["درآمد ثبت‌شده",money(data.kpis?.revenue)]
    ].map(([label,value])=><article key={String(label)}><span>{label}</span><b>{typeof value==="number"?nf(value):value}</b><small>داده واقعی سازمان</small></article>)}
   </div>}

   {tab==="finance"&&<div className={styles.cards}>{[
    ["اسناد دفترکل",data.kpis.entries],["حساب‌های فعال",data.kpis.accounts],["جمع بدهکار",money(data.kpis.debit)],["جمع بستانکار",money(data.kpis.credit)],["تسویه‌های باز",data.kpis.pending_count],["مبلغ تسویه‌های باز",money(data.kpis.pending_amount)]
   ].map(([l,v])=><article key={String(l)}><span>{l}</span><b>{typeof v==="number"?nf(v):v}</b><small>منبع: PostgreSQL</small></article>)}</div>}

   {tab==="sales"&&<div className={styles.grid}><section className={styles.panel}><header><h2>وضعیت سفارش‌ها</h2><span>{data.statuses.length} وضعیت</span></header>{data.statuses.map((x:any)=><div className={styles.row} key={x.status}><div><strong>{x.status}</strong><small>{nf(x.count)} سفارش</small></div><b>{money(x.amount)}</b></div>)}</section><section className={styles.panel}><header><h2>آخرین سفارش‌ها</h2></header>{data.recent.map((x:any)=><div className={styles.row} key={x.order_no}><div><strong>{x.order_no}</strong><small>{x.status} · {new Date(x.created_at).toLocaleString("fa-IR")}</small></div><b>{money(x.total_amount)}</b></div>)}</section></div>}

   {tab==="operations"&&<div className={styles.cards}>{[
    ["محصولات دارای موجودی",data.kpis.inventory.products],["موجودی",data.kpis.inventory.quantity],["رزرو شده",data.kpis.inventory.reserved],["فروشگاه‌ها",data.kpis.stores.total],["فروشگاه فعال",data.kpis.stores.active],["سفارش در عملیات",data.kpis.orders.processing]
   ].map(([l,v])=><article key={String(l)}><span>{l}</span><b>{nf(v)}</b><small>داده واقعی</small></article>)}</div>}

   {tab==="branches"&&<section className={styles.panel}><header><h2>شعب سازمان</h2><span>{nf(data.items.length)} شعبه</span></header>{data.items.map((x:any)=><div className={styles.row} key={x.id}><div><strong>{x.name}</strong><small>{x.code} · {x.status}</small></div><time>{new Date(x.updated_at).toLocaleString("fa-IR")}</time></div>)}{!data.items.length&&<div className={styles.empty}>هنوز شعبه‌ای ثبت نشده است.</div>}</section>}

   {tab==="alerts"&&<div className={styles.cards}>{[
    ["SLA باز",data.sla.open],["SLA نقض‌شده",data.sla.breached],["SLA متوقف",data.sla.paused],["اعلان در صف",data.notifications.queued],["اعلان ناموفق",data.notifications.failed],["اعلان خوانده‌نشده",data.notifications.unread]
   ].map(([l,v])=><article key={String(l)}><span>{l}</span><b>{nf(v)}</b><small>وضعیت زنده</small></article>)}</div>}

   {tab==="activity"&&<section className={styles.panel}><header><div><h2>رخدادهای حسابرسی</h2><span>{nf(data.items.length)} مورد</span></div><div className={styles.search}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجو..." onKeyDown={e=>e.key==="Enter"&&load("activity")}/><button onClick={()=>load("activity")}>جستجو</button></div></header>{data.items.map((x:any)=><div className={styles.row} key={x.id}><div><strong>{x.action}</strong><small>{x.entity_type} · {x.entity_id||"بدون شناسه"} · کاربر {x.actor_user_id||"سیستمی"}</small></div><time>{new Date(x.created_at).toLocaleString("fa-IR")}</time></div>)}</section>}

   {tab==="notifications"&&<section className={styles.panel}><header><h2>اعلان‌های سامانه</h2><span>{nf(data.items.length)} مورد</span></header>{data.items.map((x:any)=><div className={styles.notification} key={x.id}><div><strong>{x.title}</strong><p>{x.body}</p><small>{x.channel} · {x.status} · {new Date(x.created_at).toLocaleString("fa-IR")}</small></div>{x.read_at?<span>خوانده‌شده</span>:<button onClick={()=>markRead(x.id)}>علامت به‌عنوان خوانده‌شده</button>}</div>)}{!data.items.length&&<div className={styles.empty}>اعلانی ثبت نشده است.</div>}</section>}
  </section>}
 </main>;
}
