"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
type Application={id:string;application_no:string;customer_ref:string;product_code:string;requested_amount:string;term_months:number;status:string;kyc_status:string;eligibility_status:string;latest_score?:{score:number;band:string}|null;latest_decision?:{decision:string;approved_amount:number}|null};
export default function LendTechAdmin(){
 const [portfolio,setPortfolio]=useState<any>(null),[items,setItems]=useState<Application[]>([]),[selected,setSelected]=useState<any>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [approvedAmount,setApprovedAmount]=useState(""),[term,setTerm]=useState("12"),[rate,setRate]=useState("18"),[reason,setReason]=useState("");
 const [repay,setRepay]=useState(""),[restructureTerm,setRestructureTerm]=useState("12");
 async function load(){setLoading(true);setError("");try{const [p,a]=await Promise.all([api<any>("/api/lendtech/portfolio"),api<any>("/api/lendtech/applications")]);setPortfolio(p);setItems(a.items||[]);}catch(e){setError(e instanceof Error?e.message:"دریافت اطلاعات اعتبار ناموفق بود");}finally{setLoading(false);}}
 async function detail(id:string){try{const d=await api<any>("/api/lendtech/applications/"+id);setSelected(d);setApprovedAmount(String(d.decisions?.[0]?.approved_amount||d.application.requested_amount));setTerm(String(d.decisions?.[0]?.approved_term_months||d.application.term_months));setRate(String(d.decisions?.[0]?.interest_rate??18));}catch(e){setError(e instanceof Error?e.message:"دریافت پرونده ناموفق بود");}}
 async function action(path:string,body:any={}){
  setBusy(true);setError("");setMessage("");
  try{const r=await fetch(path,{method:"POST",credentials:"include",headers:{"content-type":"application/json","x-csrf-token":getCookie("naf_csrf")},body:JSON.stringify(body)});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||"عملیات ناموفق بود");setMessage("عملیات با موفقیت ثبت شد.");await load();if(selected)await detail(selected.application.id);}
  catch(e){setError(e instanceof Error?e.message:"خطا");}finally{setBusy(false);}
 }
 useEffect(()=>{load();},[]);
 const app=selected?.application,facility=selected?.facilities?.[0],contract=selected?.contracts?.[0];
 return <main className="admin-dashboard">
  <section className="dashboard-hero"><div className="dashboard-hero-copy"><span className="hero-kicker">LendTech · اعتبار · تسهیلات · وصول</span><h1>مرکز عملیاتی اعتبارات و تسهیلات</h1><p>کل چرخه از درخواست تا تصمیم، کمیته، قرارداد، پرداخت، قسط، معوق و بازسازی از سرویس واقعی سامانه کنترل می‌شود.</p><div className="dashboard-identity"><span className="identity-dot"/><b>PostgreSQL · Tenant Scoped</b><span>2026</span></div></div><div className="dashboard-hero-side"><Link className="command-trigger" href="/pay/apply">ثبت درخواست</Link><button className="top-icon-button" onClick={load} disabled={loading}>↻</button></div></section>
  {error&&<div className="error dashboard-error">{error}</div>}{message&&<div className="dashboard-empty">{message}</div>}
  <section className="executive-kpis">
   <article><span>درخواست‌ها</span><b>{Number(portfolio?.applications?.count||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.applications?.amount||0).toLocaleString("fa-IR")} ریال</small></article>
   <article><span>سقف مصوب/فعال</span><b>{Number(portfolio?.facilities?.amount||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.facilities?.count||0).toLocaleString("fa-IR")} تسهیلات</small></article>
   <article><span>قراردادهای فعال</span><b>{Number(portfolio?.contracts?.count||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.contracts?.amount||0).toLocaleString("fa-IR")} ریال</small></article>
   <article><span>مطالبات معوق</span><b>{Number(portfolio?.overdue?.amount||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.overdue?.contracts||0).toLocaleString("fa-IR")} قرارداد</small></article>
  </section>
  <section className="dashboard-toolbar"><div><span className="section-kicker">APPLICATIONS</span><h2>پرونده‌های واقعی</h2><p>پرونده را انتخاب کن تا عملیات مرحله بعد روی همان رکورد اجرا شود.</p></div></section>
  <section className="executive-grid"><article className="executive-group" style={{gridColumn:"1 / -1"}}><header><div><span>LIVE</span><h3>درخواست‌های اعتباری</h3></div><b>{items.length.toLocaleString("fa-IR")}</b></header>
   <div className="executive-module-list">{items.map(a=><button key={a.id} className="module-row" onClick={()=>detail(a.id)}><span className="module-seal">{a.application_no.slice(-4)}</span><div><strong>{a.customer_ref}</strong><small>{a.application_no} · {a.product_code} · {a.term_months} ماه</small></div><span>{Number(a.requested_amount).toLocaleString("fa-IR")} ریال</span><span>{a.latest_score?("امتیاز "+Number(a.latest_score.score).toLocaleString("fa-IR")+" · "+a.latest_score.band):"بدون امتیاز"}</span><span>{a.latest_decision?.decision||a.status}</span></button>)}{!items.length&&!loading&&<div className="dashboard-empty">هنوز درخواست واقعی ثبت نشده است.</div>}</div>
  </article></section>
  {app&&<section className="executive-grid"><article className="executive-group" style={{gridColumn:"1 / -1"}}><header><div><span>CASE {app.application_no}</span><h3>پرونده عملیاتی</h3></div><b>{app.status}</b></header>
   <div className="plan-grid">
    <div className="product-card"><p>مشتری: <strong>{app.customer_ref}</strong></p><p>درخواست: {Number(app.requested_amount).toLocaleString("fa-IR")} ریال · {app.term_months} ماه</p><p>KYC: {app.kyc_status} · صلاحیت: {app.eligibility_status}</p><p>امتیاز: {selected.scores?.[0]?Number(selected.scores[0].score).toLocaleString("fa-IR")+" · "+selected.scores[0].band:"ثبت نشده"}</p></div>
    <div className="product-card"><h3>تصمیم و کمیته</h3><input value={approvedAmount} onChange={e=>setApprovedAmount(e.target.value)} placeholder="مبلغ مصوب"/><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="مدت ماه"/><input value={rate} onChange={e=>setRate(e.target.value)} placeholder="نرخ"/><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="علت/یادداشت"/><div className="dashboard-toolbar"><button disabled={busy} onClick={()=>action("/api/lendtech/applications/"+app.id+"/decision",{decision:"approve",approvedAmount:Number(approvedAmount),approvedTermMonths:Number(term),interestRate:Number(rate),reason})}>ثبت مصوبه</button><button disabled={busy} onClick={()=>action("/api/lendtech/applications/"+app.id+"/committee")}>تأیید کمیته و ایجاد تسهیلات</button></div></div>
   </div>
   {facility&&<div className="product-card"><h3>تسهیلات {facility.facility_no}</h3><p>مصوب: {Number(facility.approved_amount).toLocaleString("fa-IR")} · مانده قابل مصرف: {Number(facility.available_amount).toLocaleString("fa-IR")} {facility.currency}</p><button disabled={busy} onClick={()=>action("/api/lendtech/facilities/"+facility.id+"/contract")}>ایجاد قرارداد</button></div>}
   {contract&&<div className="product-card"><h3>قرارداد {contract.contract_no}</h3><p>اصل: {Number(contract.principal).toLocaleString("fa-IR")} · وضعیت: {contract.status}</p><div className="dashboard-toolbar"><button disabled={busy} onClick={()=>action("/api/lendtech/contracts/"+contract.id+"/disburse")}>پرداخت تسهیلات و ساخت اقساط</button><button disabled={busy} onClick={()=>action("/api/lendtech/contracts/"+contract.id+"/delinquency/refresh")}>به‌روزرسانی معوقات</button></div><input value={repay} onChange={e=>setRepay(e.target.value)} placeholder="مبلغ بازپرداخت"/><button disabled={busy||!repay} onClick={()=>action("/api/lendtech/contracts/"+contract.id+"/repay",{amount:Number(repay),method:"manual"})}>ثبت بازپرداخت</button><input value={restructureTerm} onChange={e=>setRestructureTerm(e.target.value)} placeholder="مدت جدید"/><button disabled={busy||!reason} onClick={()=>action("/api/lendtech/contracts/"+contract.id+"/restructure",{newTermMonths:Number(restructureTerm),reason})}>بازسازی قرارداد</button></div>}
   <div className="product-card"><h3>رویدادهای پرونده</h3>{(selected.events||[]).map((e:any)=><div key={e.id} className="module-row"><span>{e.event_type}</span><small>{new Date(e.created_at).toLocaleString("fa-IR")}</small></div>)}</div>
  </article></section>}
 </main>;
}
function getCookie(name:string){if(typeof document==="undefined")return "";return document.cookie.split("; ").find(x=>x.startsWith(name+"="))?.split("=")[1]||"";}
