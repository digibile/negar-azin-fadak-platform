"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";

type Application={id:string;application_no:string;customer_ref:string;product_code:string;requested_amount:string;term_months:number;status:string;kyc_status:string;eligibility_status:string;latest_score?:{score:number;band:string}|null;latest_decision?:{decision:string;approved_amount:number}|null};

export default function LendTechAdmin(){
 const [portfolio,setPortfolio]=useState<any>(null),[items,setItems]=useState<Application[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function load(){
  setLoading(true);setError("");
  try{
   const [p,a]=await Promise.all([api<any>("/api/lendtech/portfolio"),api<any>("/api/lendtech/applications")]);
   setPortfolio(p);setItems(a.items||[]);
  }catch(e){setError(e instanceof Error?e.message:"دریافت اطلاعات اعتبار ناموفق بود");}
  finally{setLoading(false);}
 }
 useEffect(()=>{load();},[]);
 return <main className="admin-dashboard">
  <section className="dashboard-hero"><div className="dashboard-hero-copy"><span className="hero-kicker">LendTech · اعتبار و تسهیلات · عملیاتی</span><h1>مرکز اعتبارات و تسهیلات</h1><p>نمای زنده درخواست‌ها، سقف اعتبار، قراردادها و مطالبات معوق. این صفحه از سرویس واقعی PostgreSQL تغذیه می‌شود.</p><div className="dashboard-identity"><span className="identity-dot"/><b>چرخه درخواست تا وصول</b><span>2026</span></div></div><div className="dashboard-hero-side"><Link className="command-trigger" href="/pay/apply">ثبت درخواست</Link><button className="top-icon-button" onClick={load} disabled={loading}>↻</button></div></section>
  {error&&<div className="error dashboard-error">{error}</div>}
  <section className="executive-kpis">
   <article><span>درخواست‌ها</span><b>{Number(portfolio?.applications?.count||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.applications?.amount||0).toLocaleString("fa-IR")} ریال درخواست‌شده</small></article>
   <article><span>سقف مصوب/فعال</span><b>{Number(portfolio?.facilities?.amount||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.facilities?.count||0).toLocaleString("fa-IR")} تسهیلات</small></article>
   <article><span>قراردادهای فعال</span><b>{Number(portfolio?.contracts?.count||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.contracts?.amount||0).toLocaleString("fa-IR")} ریال اصل قرارداد</small></article>
   <article><span>مطالبات معوق</span><b>{Number(portfolio?.overdue?.amount||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.overdue?.contracts||0).toLocaleString("fa-IR")} قرارداد دارای پرونده باز</small></article>
  </section>
  <section className="dashboard-toolbar"><div><span className="section-kicker">APPLICATIONS</span><h2>درخواست‌های واقعی</h2><p>آخرین وضعیت چرخه اعتبار و نتیجه آخرین امتیاز و تصمیم.</p></div></section>
  <section className="executive-grid">
   <article className="executive-group" style={{gridColumn:"1 / -1"}}><header><div><span>LIVE</span><h3>پرونده‌های اعتباری</h3></div><b>{items.length.toLocaleString("fa-IR")}</b></header>
    <div className="executive-module-list">
     {items.map(a=><div key={a.id} className="module-row"><span className="module-seal">{a.application_no.slice(-4)}</span><div><strong>{a.customer_ref}</strong><small>{a.application_no} · {a.product_code} · {a.term_months} ماه</small></div><span>{Number(a.requested_amount).toLocaleString("fa-IR")} ریال</span><span>{a.latest_score ? ("امتیاز "+Number(a.latest_score.score).toLocaleString("fa-IR")+" · "+a.latest_score.band) : "بدون امتیاز"}</span><span>{a.latest_decision?.decision||a.status}</span></div>)}
     {!items.length&&!loading&&<div className="dashboard-empty">هنوز درخواست واقعی در این محدوده ثبت نشده است.</div>}
    </div>
   </article>
  </section>
 </main>;
}
