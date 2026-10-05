"use client";

import {useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";
import styles from "./DashboardWorkspace.module.css";

type Tab={key:string;title:string;description:string;eyebrow:string};
const tabs:Tab[]=[
 {key:"dashboard",title:"داشبورد اصلی",description:"نمای زنده و یکپارچه وضعیت سازمان",eyebrow:"OVERVIEW"},
 {key:"executive",title:"داشبورد مدیرعامل",description:"تصمیم‌گیری بر پایه شاخص‌های واقعی سازمان",eyebrow:"EXECUTIVE"},
 {key:"finance",title:"داشبورد مدیر مالی",description:"وضعیت دفترکل، حساب‌ها و تعهدات تسویه",eyebrow:"FINANCE"},
 {key:"sales",title:"داشبورد فروش",description:"سفارش‌ها، وضعیت فروش و ارزش معاملات",eyebrow:"SALES"},
 {key:"operations",title:"داشبورد عملیات",description:"موجودی، فروشگاه‌ها و جریان سفارش‌ها",eyebrow:"OPERATIONS"},
 {key:"branches",title:"داشبورد شعب",description:"وضعیت عملیاتی شعب سازمان",eyebrow:"BRANCHES"},
 {key:"kpi",title:"KPI سازمان",description:"شاخص‌های عملکردی محاسبه‌شده از داده واقعی",eyebrow:"KPI"},
 {key:"alerts",title:"هشدارهای مدیریتی",description:"مواردی که نیاز به اقدام یا پیگیری دارند",eyebrow:"ALERTS"},
 {key:"activity",title:"فعالیت‌های اخیر",description:"ردپای عملیاتی و حسابرسی سامانه",eyebrow:"ACTIVITY"},
 {key:"notifications",title:"اعلان‌های مهم",description:"مرکز اعلان‌های واقعی سازمان",eyebrow:"NOTIFICATIONS"}
];

const api=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";
const nf=(v:any)=>Number(v||0).toLocaleString("fa-IR");
const money=(v:any)=>Number(v||0).toLocaleString("fa-IR")+" ریال";

export default function DashboardWorkspace(){
 const searchParams=useSearchParams();
 const [tab,setTab]=useState("dashboard"),[data,setData]=useState<any>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[q,setQ]=useState("");
 const current=useMemo(()=>tabs.find(x=>x.key===tab)||tabs[0],[tab]);

 const load=async(nextTab=tab)=>{
  setLoading(true);setError("");
  try{
   const r=await fetch(api+"/api/dashboard/workspace?tab="+encodeURIComponent(nextTab)+"&limit=100"+(q?"&q="+encodeURIComponent(q):""),{credentials:"include",cache:"no-store"});
   const b=await r.json().catch(()=>null);
   if(!r.ok)throw new Error(b?.error||"دریافت داده‌های داشبورد ناموفق بود");
   setData(b);
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات")}
  finally{setLoading(false)}
 };

 useEffect(()=>{
  const t=searchParams.get("tab")||"dashboard";
  setTab(tabs.some(x=>x.key===t)?t:"dashboard");
 },[searchParams]);
 useEffect(()=>{load(tab)},[tab]);

 const markRead=async(id:string)=>{
  const r=await fetch(api+"/api/dashboard/notifications/"+id+"/read",{method:"POST",credentials:"include",headers:{"X-CSRF-Token":csrf()}});
  if(r.ok)load("notifications");
 };

 return <main className={styles.workspace} dir="rtl">
  <header className={styles.hero}>
   <div className={styles.heroCopy}>
    <div className={styles.eyebrow}><span>{current.eyebrow}</span><i/> منوی ۰۱ · داشبورد و مرکز مدیریت</div>
    <h1>{current.title}</h1>
    <p>{data?.tenant?.name||"سازمان جاری"} <span>·</span> {current.description}</p>
   </div>
   <div className={styles.heroActions}><a className={styles.backButton} href="/admin">‹ بازگشت به منوی مرکزی</a>
    <span className={styles.live}><i/> LIVE DATA</span>
    <button onClick={()=>load(tab)} disabled={loading}>{loading?"در حال دریافت":"↻ به‌روزرسانی"}</button>
   </div>
  </header>

  {error&&<div className={styles.error}><b>خطا</b><span>{error}</span></div>}
  {loading?<section className={styles.loading}><div className={styles.spinner}/><b>در حال دریافت داده واقعی</b><span>اطلاعات مستقیم از PostgreSQL خوانده می‌شود.</span></section>:data&&<section className={styles.content}>

   {(tab==="dashboard"||tab==="executive"||tab==="kpi")&&<div className={styles.cards}>
    {[
     ["کاربران",data.kpis?.users,"کاربران متصل به سازمان"],["شرکت‌های فعال",data.kpis?.companies,"ساختار حقوقی"],["شعب فعال",data.kpis?.branches,"شبکه عملیاتی"],
     ["فروشندگان فعال",data.kpis?.sellers,"فروشندگان"],["فروشگاه‌های فعال",data.kpis?.stores,"کانال‌های فروش"],["محصولات فعال",data.kpis?.products,"کاتالوگ"],
     ["کل سفارش‌ها",data.kpis?.orders,"معاملات ثبت‌شده"],["سفارش‌های باز",data.kpis?.openOrders,"در چرخه عملیات"],["ارزش سفارش‌ها",money(data.kpis?.totalOrdersAmount),"جمع مبلغ"],["درآمد ثبت‌شده",money(data.kpis?.revenue),"پس از حذف وضعیت‌های برگشتی"]
    ].map(([label,value,note],i)=><article key={String(label)} className={styles.card}><div className={styles.cardIndex}>{String(i+1).padStart(2,"0")}</div><span>{label}</span><b>{typeof value==="number"?nf(value):value}</b><small>{note}</small></article>)}
   </div>}

   {tab==="finance"&&<div className={styles.cards}>{[
    ["اسناد دفترکل",data.kpis.entries,"تعداد اسناد ثبت‌شده"],["حساب‌های فعال",data.kpis.accounts,"حساب‌های قابل استفاده"],["جمع بدهکار",money(data.kpis.debit),"گردش بدهکار"],["جمع بستانکار",money(data.kpis.credit),"گردش بستانکار"],["تسویه‌های باز",data.kpis.pending_count,"نیازمند اقدام"],["مبلغ تسویه‌های باز",money(data.kpis.pending_amount),"تعهد تسویه"]
   ].map(([l,v,n],i)=><article className={styles.card} key={String(l)}><div className={styles.cardIndex}>{String(i+1).padStart(2,"0")}</div><span>{l}</span><b>{typeof v==="number"?nf(v):v}</b><small>{n}</small></article>)}</div>}

   {tab==="sales"&&<div className={styles.grid}><section className={styles.panel}><header><div><small>ORDER FLOW</small><h2>وضعیت سفارش‌ها</h2></div><span>{data.statuses.length} وضعیت</span></header>{data.statuses.map((x:any)=><div className={styles.row} key={x.status}><div><strong>{x.status}</strong><small>{nf(x.count)} سفارش</small></div><b>{money(x.amount)}</b></div>)}</section><section className={styles.panel}><header><div><small>RECENT ORDERS</small><h2>آخرین سفارش‌ها</h2></div></header>{data.recent.map((x:any)=><div className={styles.row} key={x.order_no}><div><strong>{x.order_no}</strong><small>{x.status} · {new Date(x.created_at).toLocaleString("fa-IR")}</small></div><b>{money(x.total_amount)}</b></div>)}{!data.recent.length&&<div className={styles.empty}>هنوز سفارشی ثبت نشده است.</div>}</section></div>}

   {tab==="operations"&&<div className={styles.cards}>{[
    ["محصولات دارای موجودی",data.kpis.inventory.products,"کالاهای دارای رکورد موجودی"],["موجودی",data.kpis.inventory.quantity,"تعداد موجودی"],["رزرو شده",data.kpis.inventory.reserved,"موجودی رزروشده"],["فروشگاه‌ها",data.kpis.stores.total,"کل فروشگاه‌ها"],["فروشگاه فعال",data.kpis.stores.active,"کانال فعال"],["سفارش در عملیات",data.kpis.orders.processing,"پردازش یا ارسال"]
   ].map(([l,v,n],i)=><article className={styles.card} key={String(l)}><div className={styles.cardIndex}>{String(i+1).padStart(2,"0")}</div><span>{l}</span><b>{nf(v)}</b><small>{n}</small></article>)}</div>}

   {tab==="branches"&&<section className={styles.panel}><header><div><small>NETWORK</small><h2>شبکه شعب</h2></div><span>{nf(data.items.length)} شعبه</span></header>{data.items.map((x:any)=><div className={styles.row} key={x.id}><div><strong>{x.name}</strong><small>{x.code} · {x.status}</small></div><time>{new Date(x.updated_at).toLocaleString("fa-IR")}</time></div>)}{!data.items.length&&<div className={styles.empty}>هنوز شعبه‌ای ثبت نشده است.</div>}</section>}

   {tab==="alerts"&&<div className={styles.cards}>{[
    ["SLA باز",data.sla.open,"پرونده‌های در حال رسیدگی"],["SLA نقض‌شده",data.sla.breached,"نیازمند اقدام فوری"],["SLA متوقف",data.sla.paused,"در وضعیت توقف"],["اعلان در صف",data.notifications.queued,"در انتظار ارسال"],["اعلان ناموفق",data.notifications.failed,"ارسال ناموفق"],["اعلان خوانده‌نشده",data.notifications.unread,"نیازمند مشاهده"]
   ].map(([l,v,n],i)=><article className={styles.card} key={String(l)}><div className={styles.cardIndex}>{String(i+1).padStart(2,"0")}</div><span>{l}</span><b>{nf(v)}</b><small>{n}</small></article>)}</div>}

   {tab==="activity"&&<section className={styles.panel}><header><div><small>AUDIT TRAIL</small><h2>فعالیت‌های اخیر</h2></div><div className={styles.search}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجوی رخداد..." onKeyDown={e=>e.key==="Enter"&&load("activity")}/><button onClick={()=>load("activity")}>جستجو</button></div></header>{data.items.map((x:any)=><div className={styles.row} key={x.id}><div><strong>{x.action}</strong><small>{x.entity_type} · {x.entity_id||"بدون شناسه"} · کاربر {x.actor_user_id||"سیستمی"}</small></div><time>{new Date(x.created_at).toLocaleString("fa-IR")}</time></div>)}{!data.items.length&&<div className={styles.empty}>رخداد حسابرسی ثبت نشده است.</div>}</section>}

   {tab==="notifications"&&<section className={styles.panel}><header><div><small>NOTIFICATION CENTER</small><h2>اعلان‌های مهم</h2></div><span>{nf(data.items.length)} مورد</span></header>{data.items.map((x:any)=><div className={styles.notification} key={x.id}><div><strong>{x.title}</strong><p>{x.body}</p><small>{x.channel} · {x.status} · {new Date(x.created_at).toLocaleString("fa-IR")}</small></div>{x.read_at?<span className={styles.read}>خوانده‌شده</span>:<button onClick={()=>markRead(x.id)}>خوانده شد</button>}</div>)}{!data.items.length&&<div className={styles.empty}>اعلان ثبت‌شده‌ای وجود ندارد.</div>}</section>}
  </section>}
 </main>;
}
