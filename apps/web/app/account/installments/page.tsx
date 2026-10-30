"use client";
import Link from "next/link";
import {useEffect,useMemo,useState,type FormEvent} from "react";
type Contract={id:string;contract_no:string;principal:string;interest_rate:string;term_months:number;status:string;installments:Array<{id:string;installmentNo:number;dueDate:string;totalDue:string;principalPaid:string;interestPaid:string;status:string}>};
type Declaration={id:string;contract_id:string;amount:string;method:string;payment_ref:string;paid_at:string;status:string;review_note?:string|null;created_at:string};
const API=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const csrf=()=>typeof document==="undefined"?"":document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";
const money=(v:unknown)=>Number(v||0).toLocaleString("fa-IR")+" ریال";
const date=(v:string)=>{try{return new Date(/^\\d{4}-\\d{2}-\\d{2}$/.test(v)?v+"T12:00:00":v).toLocaleDateString("fa-IR")}catch{return v}};
export default function Installments(){
 const [contracts,setContracts]=useState<Contract[]>([]),[declarations,setDeclarations]=useState<Declaration[]>([]);
 const [contractId,setContractId]=useState(""),[amount,setAmount]=useState(""),[method,setMethod]=useState("BankTransfer"),[reference,setReference]=useState(""),[paidAt,setPaidAt]=useState(new Date().toISOString().slice(0,10)),[note,setNote]=useState("");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function load(){
  setLoading(true);setError("");
  try{
   const [cr,dr]=await Promise.all([
    fetch(API+"/api/lendtech/my-contracts",{credentials:"include"}),
    fetch(API+"/api/lendtech/my-payment-declarations",{credentials:"include"})
   ]);
   const [cb,db]=await Promise.all([cr.json().catch(()=>null),dr.json().catch(()=>null)]);
   if(!cr.ok)throw new Error(cb?.error||"دریافت قراردادها انجام نشد");
   if(!dr.ok)throw new Error(db?.error||"دریافت اعلام‌های واریز انجام نشد");
   setContracts(cb?.items||[]);setDeclarations(db?.items||[]);
   if(!contractId&&cb?.items?.length)setContractId(cb.items[0].id);
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات اقساط")}finally{setLoading(false)}
 }
 useEffect(()=>{load()},[]);
 const selected=useMemo(()=>contracts.find(x=>x.id===contractId)||contracts[0],[contracts,contractId]);
 async function submit(e:FormEvent){
  e.preventDefault();setError("");setMessage("");
  if(!selected)return setError("قرارداد فعالی برای اعلام واریز پیدا نشد.");
  if(!amount.trim()||!reference.trim()||!paidAt)return setError("مبلغ، شماره پیگیری و تاریخ پرداخت الزامی است.");
  setSaving(true);
  try{
   const r=await fetch(API+"/api/lendtech/my-payment-declarations",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},body:JSON.stringify({contractId:selected.id,amount,method,reference,paidAt,note})});
   const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||"ثبت اعلام واریز انجام نشد");
   setAmount("");setReference("");setNote("");setMessage("اعلام واریز ثبت شد و تا بررسی مدیر، پرداخت‌شده محسوب نمی‌شود.");await load();
  }catch(e){setError(e instanceof Error?e.message:"ثبت اعلام واریز ناموفق بود")}finally{setSaving(false)}
 }
 const statusLabel=(s:string)=>s==="pending"?"در انتظار بررسی":s==="approved"?"تأیید و در دفتر بازپرداخت ثبت شد":"رد شده";
 return <main className="sookar-store" dir="rtl"><section className="store-section">
  <span>حساب مشتری · بازپرداخت</span><h1>اقساط و اعلام واریز</h1>
  <p>قراردادها و اقساط از پرونده مرکزی نمایش داده می‌شوند. اعلام واریز پس از بررسی مدیر و تطبیق با قرارداد در دفتر بازپرداخت ثبت می‌شود.</p>
  {error&&<div role="alert" className="error">{error}</div>}{message&&<div className="dashboard-empty">{message}</div>}
  {loading?<p>در حال دریافت اطلاعات واقعی...</p>:!contracts.length?<article className="product-card"><h3>قراردادی برای این حساب پیدا نشد</h3><p>قرارداد فقط وقتی نمایش داده می‌شود که شناسه مشتری حساب با پرونده اعتباری و قرارداد مرکزی مرتبط باشد.</p></article>:<>
   <article className="product-card"><h2>قراردادهای من</h2><label>انتخاب قرارداد<select value={selected?.id||""} onChange={e=>setContractId(e.target.value)}>{contracts.map(c=><option key={c.id} value={c.id}>{c.contract_no} · {c.status}</option>)}</select></label>
    {selected&&<><div className="plan-grid"><div><b>اصل قرارداد</b><p>{money(selected.principal)}</p></div><div><b>نرخ</b><p>{Number(selected.interest_rate).toLocaleString("fa-IR")}٪</p></div><div><b>مدت</b><p>{selected.term_months.toLocaleString("fa-IR")} ماه</p></div><div><b>وضعیت</b><p>{selected.status}</p></div></div>
     <h3>برنامه اقساط</h3><div className="plan-grid">{selected.installments.map(i=><article className="product-card" key={i.id}><b>قسط {i.installmentNo.toLocaleString("fa-IR")}</b><p>سررسید: {date(i.dueDate)}</p><p>مبلغ: {money(i.totalDue)}</p><p>پرداخت‌شده: {money(Number(i.principalPaid)+Number(i.interestPaid))}</p><small>وضعیت: {i.status}</small></article>)}</div>
    </>}
   </article>
   <article className="product-card"><h2>اعلام واریز</h2><p>فقط واریز کارت‌به‌کارت یا انتقال بانکی را ثبت کن. ثبت این فرم به‌تنهایی به معنی تأیید پرداخت نیست.</p>
    <form onSubmit={submit} className="plan-grid">
     <label>مبلغ پرداختی (ریال)<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} required/></label>
     <label>روش پرداخت<select value={method} onChange={e=>setMethod(e.target.value)}><option value="BankTransfer">انتقال بانکی</option><option value="CardToCard">کارت‌به‌کارت</option></select></label>
     <label>شماره پیگیری<input value={reference} onChange={e=>setReference(e.target.value)} maxLength={30} required/></label>
     <label>تاریخ پرداخت<input type="date" value={paidAt} onChange={e=>setPaidAt(e.target.value)} required/></label>
     <label style={{gridColumn:"1 / -1"}}>توضیحات<input value={note} onChange={e=>setNote(e.target.value)} maxLength={300}/></label>
     <button type="submit" disabled={saving}>{saving?"در حال ثبت...":"ثبت اعلام واریز"}</button>
    </form>
   </article>
  </>}
  <article className="product-card"><div className="dashboard-toolbar"><h2>سوابق اعلام واریز</h2><button onClick={load} disabled={loading}>به‌روزرسانی</button></div>
   {!declarations.length&&!loading?<p>هنوز اعلام واریزی ثبت نشده است.</p>:declarations.map(d=><div className="module-row" key={d.id}><div><b>{money(d.amount)}</b><small>{d.method==="CardToCard"?"کارت‌به‌کارت":"انتقال بانکی"} · پیگیری {d.payment_ref} · {date(d.paid_at)}</small><small>{statusLabel(d.status)}{d.review_note?" · "+d.review_note:""}</small></div></div>)}
  </article>
  <Link href="/account">بازگشت به حساب ←</Link>
 </section></main>
}
