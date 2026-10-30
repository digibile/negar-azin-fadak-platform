"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
type Application={id:string;application_no:string;customer_ref:string;product_code:string;requested_amount:string;term_months:number;status:string;kyc_status:string;eligibility_status:string;latest_score?:{score:number;band:string}|null;latest_decision?:{decision:string;approved_amount:number}|null};
type PaymentDeclaration={id:string;contract_id:string;contract_no:string;user_ref:string;amount:string;method:string;payment_ref:string;paid_at:string;note?:string|null;status:string};
type ContractDocument={id:string;document_no:string;title:string;stage:string;status:string;contract_no:string;application_no:string;product_code:string;template_version:number};
export default function LendTechAdmin(){
 const [portfolio,setPortfolio]=useState<any>(null),[items,setItems]=useState<Application[]>([]),[selected,setSelected]=useState<any>(null),[documents,setDocuments]=useState<ContractDocument[]>([]),[declarations,setDeclarations]=useState<PaymentDeclaration[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [approvedAmount,setApprovedAmount]=useState(""),[term,setTerm]=useState("12"),[rate,setRate]=useState("18"),[reason,setReason]=useState("");
 const [repay,setRepay]=useState(""),[restructureTerm,setRestructureTerm]=useState("12"),[reviewNote,setReviewNote]=useState("");
 async function load(){setLoading(true);setError("");try{const [p,a,d,pd]=await Promise.all([api<any>("/api/lendtech/portfolio"),api<any>("/api/lendtech/applications"),api<any>("/api/lendtech/contract-documents"),api<any>("/api/lendtech/payment-declarations?status=pending")]);setPortfolio(p);setItems(a.items||[]);setDocuments(d.items||[]);setDeclarations(pd.items||[]);}catch(e){setError(e instanceof Error?e.message:"دریافت اطلاعات اعتبار ناموفق بود");}finally{setLoading(false);}}
 async function reviewDeclaration(id:string,status:"approved"|"rejected"){
  const note=status==="rejected"?(reviewNote.trim()||window.prompt("علت رد اعلام واریز را وارد کنید")||"") : reviewNote.trim();
  if(status==="rejected"&&!note){setError("برای رد اعلام واریز، دلیل الزامی است.");return;}
  setBusy(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/lendtech/payment-declarations/"+id+"/review",{method:"POST",credentials:"include",headers:{"content-type":"application/json","x-csrf-token":getCookie("naf_csrf")},body:JSON.stringify({status,note})});
   const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||"بررسی اعلام واریز ناموفق بود");
   setReviewNote("");setMessage(status==="approved"?"اعلام واریز تأیید و در بازپرداخت مرکزی ثبت شد.":"اعلام واریز رد شد.");await load();
  }catch(e){setError(e instanceof Error?e.message:"خطا در بررسی اعلام واریز")}finally{setBusy(false);}
 }
 async function detail(id:string){try{const d=await api<any>("/api/lendtech/applications/"+id);setSelected(d);setApprovedAmount(String(d.decisions?.[0]?.approved_amount||d.application.requested_amount));setTerm(String(d.decisions?.[0]?.approved_term_months||d.application.term_months));setRate(String(d.decisions?.[0]?.interest_rate??18));}catch(e){setError(e instanceof Error?e.message:"دریافت پرونده ناموفق بود");}}
 async function action(path:string,body:any={}){
  setBusy(true);setError("");setMessage("");
  try{const r=await fetch(path,{method:"POST",credentials:"include",headers:{"content-type":"application/json","x-csrf-token":getCookie("naf_csrf")},body:JSON.stringify(body)});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||"عملیات ناموفق بود");setMessage("عملیات با موفقیت ثبت شد.");await load();if(selected)await detail(selected.application.id);}
  catch(e){setError(e instanceof Error?e.message:"خطا");}finally{setBusy(false);}
 }
 useEffect(()=>{load();},[]);
 const app=selected?.application,facility=selected?.facilities?.[0],contract=selected?.contracts?.[0];
 const contractDocs=contract?documents.filter(d=>d.contract_no===contract.contract_no):[];
 return <main className="admin-dashboard">
  <section className="dashboard-hero"><div className="dashboard-hero-copy"><span className="hero-kicker">LendTech · اعتبار · تسهیلات · وصول</span><h1>مرکز عملیاتی اعتبارات و تسهیلات</h1><p>کل چرخه از درخواست تا تصمیم، کمیته، قرارداد، پرداخت، قسط، معوق و بازسازی از سرویس واقعی سامانه کنترل می‌شود.</p><div className="dashboard-identity"><span className="identity-dot"/><b>PostgreSQL · Tenant Scoped</b><span>2026</span></div></div><div className="dashboard-hero-side"><Link className="command-trigger" href="/pay/apply">ثبت درخواست</Link><Link className="command-trigger" href="/admin/lendtech/templates">قالب قراردادها</Link><button className="top-icon-button" onClick={load} disabled={loading}>↻</button></div></section>
  {error&&<div className="error dashboard-error">{error}</div>}{message&&<div className="dashboard-empty">{message}</div>}
  <section className="executive-kpis">
   <article><span>درخواست‌ها</span><b>{Number(portfolio?.applications?.count||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.applications?.amount||0).toLocaleString("fa-IR")} ریال</small></article>
   <article><span>سقف مصوب/فعال</span><b>{Number(portfolio?.facilities?.amount||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.facilities?.count||0).toLocaleString("fa-IR")} تسهیلات</small></article>
   <article><span>قراردادهای فعال</span><b>{Number(portfolio?.contracts?.count||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.contracts?.amount||0).toLocaleString("fa-IR")} ریال</small></article>
   <article><span>مطالبات معوق</span><b>{Number(portfolio?.overdue?.amount||0).toLocaleString("fa-IR")}</b><small>{Number(portfolio?.overdue?.contracts||0).toLocaleString("fa-IR")} قرارداد</small></article>
  </section>
  <section className="executive-grid"><article className="executive-group" style={{gridColumn:"1 / -1"}}><header><div><span>PAYMENT REVIEW</span><h3>اعلام واریزهای در انتظار بررسی</h3></div><b>{declarations.length.toLocaleString("fa-IR")}</b></header>
   <div className="product-card"><label>یادداشت بررسی (برای رد الزامی)<input value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="توضیح بررسی یا علت رد"/></label></div>
   <div className="executive-module-list">{declarations.map(d=><article className="module-row" key={d.id}><div><strong>{d.contract_no}</strong><small>{d.user_ref} · {d.method==="CardToCard"?"کارت‌به‌کارت":"انتقال بانکی"} · {d.payment_ref}</small></div><b>{Number(d.amount).toLocaleString("fa-IR")} ریال</b><span>{new Date(d.paid_at).toLocaleDateString("fa-IR")}</span><div className="dashboard-toolbar"><button disabled={busy} onClick={()=>reviewDeclaration(d.id,"approved")}>تأیید و ثبت بازپرداخت</button><button disabled={busy} onClick={()=>reviewDeclaration(d.id,"rejected")}>رد با دلیل</button></div></article>)}{!declarations.length&&!loading&&<div className="dashboard-empty">اعلام واریز در انتظار بررسی وجود ندارد.</div>}</div>
  </article></section>
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
   {contract&&<div className="product-card"><h3>قرارداد {contract.contract_no}</h3><p>اصل: {Number(contract.principal).toLocaleString("fa-IR")} · وضعیت: {contract.status}</p><div className="dashboard-toolbar"><button disabled={busy} onClick={()=>action("/api/lendtech/contracts/"+contract.id+"/render")}>تولید سند از قالب منتشرشده</button><button disabled={busy} onClick={()=>action("/api/lendtech/contracts/"+contract.id+"/disburse")}>پرداخت تسهیلات و ساخت اقساط</button><button disabled={busy} onClick={()=>action("/api/lendtech/contracts/"+contract.id+"/delinquency/refresh")}>به‌روزرسانی معوقات</button></div>{contractDocs.map(d=><div key={d.id} className="product-card"><b>{d.title} · {d.document_no}</b><p>نسخه {d.template_version} · وضعیت: {d.status}</p><div className="dashboard-toolbar"><a href={"/api/lendtech/contract-documents/"+d.id+"/html"} target="_blank" rel="noreferrer">مشاهده سند</a>{d.status==="draft"&&<button disabled={busy} onClick={()=>action("/api/lendtech/contract-documents/"+d.id+"/present")}>ارائه برای امضای مشتری</button>}</div></div>)}<input value={repay} onChange={e=>setRepay(e.target.value)} placeholder="مبلغ بازپرداخت"/><button disabled={busy||!repay} onClick={()=>action("/api/lendtech/contracts/"+contract.id+"/repay",{amount:Number(repay),method:"manual"})}>ثبت بازپرداخت</button><input value={restructureTerm} onChange={e=>setRestructureTerm(e.target.value)} placeholder="مدت جدید"/><button disabled={busy||!reason} onClick={()=>action("/api/lendtech/contracts/"+contract.id+"/restructure",{newTermMonths:Number(restructureTerm),reason})}>بازسازی قرارداد</button></div>}
   <div className="product-card"><h3>رویدادهای پرونده</h3>{(selected.events||[]).map((e:any)=><div key={e.id} className="module-row"><span>{e.event_type}</span><small>{new Date(e.created_at).toLocaleString("fa-IR")}</small></div>)}</div>
  </article></section>}
 </main>;
}
function getCookie(name:string){if(typeof document==="undefined")return "";return document.cookie.split("; ").find(x=>x.startsWith(name+"="))?.split("=")[1]||"";}
