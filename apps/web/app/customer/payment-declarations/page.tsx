"use client";

import {useEffect,useState,type FormEvent} from "react";
import {api} from "../../../lib/api";

type Contract={id:string;contract_no:string;principal:string;status:string;installments:Array<{installmentNo:number;dueDate:string;totalDue:string;status:string}>};
type Declaration={id:string;contract_id:string;amount:string;method:string;payment_ref:string;paid_at:string;status:string;review_note?:string|null;created_at:string;reviewed_at?:string|null};

const statusLabel:Record<string,string>={pending:"در انتظار بررسی",approved:"تأیید و در بازپرداخت ثبت شد",rejected:"رد شده"};
const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};

export default function CustomerPaymentDeclarations(){
 const [contracts,setContracts]=useState<Contract[]>([]),[items,setItems]=useState<Declaration[]>([]);
 const [contractId,setContractId]=useState(""),[amount,setAmount]=useState(""),[method,setMethod]=useState("CardToCard"),[reference,setReference]=useState(""),[paidAt,setPaidAt]=useState(today()),[note,setNote]=useState("");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function load(){
  setLoading(true);setError("");
  try{
   const [c,d]=await Promise.all([api<{items:Contract[]}>("/api/lendtech/my-contracts"),api<{items:Declaration[]}>("/api/lendtech/my-payment-declarations")]);
   setContracts(c.items||[]);setItems(d.items||[]);
   setContractId(current=>current||(c.items?.[0]?.id||""));
  }catch(e){setError(e instanceof Error?e.message:"دریافت قراردادها و اعلام واریزها ناموفق بود");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 async function submit(e:FormEvent){
  e.preventDefault();setSaving(true);setError("");setMessage("");
  try{
   await api("/api/lendtech/my-payment-declarations",{method:"POST",body:JSON.stringify({contractId,amount,method,reference,paidAt,note})});
   setAmount("");setReference("");setNote("");setPaidAt(today());setMessage("اعلام واریز ثبت شد و پس از بررسی مدیر، نتیجه در همین صفحه نمایش داده می‌شود.");await load();
  }catch(e){setError(e instanceof Error?e.message:"ثبت اعلام واریز انجام نشد");}
  finally{setSaving(false);}
 }
 const money=(v:string)=>Number(v||0).toLocaleString("fa-IR");
 return <main className="customer-dashboard" dir="rtl">
  <header className="customer-topbar"><div><span className="section-kicker">خدمات اعتباری · تسویه اقساط</span><h1>اعلام و پیگیری واریز</h1><p>واریز بانکی یا کارت‌به‌کارت را برای یکی از قراردادهای فعال ثبت کنید.</p></div><div className="customer-actions"><a href="/customer">داشبورد مشتری</a><a href="/customer/contracts">قراردادهای من</a></div></header>
  {error&&<div className="error" role="alert">{error}</div>}{message&&<div className="dashboard-empty" role="status">{message}</div>}
  <section className="customer-grid" style={{gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",alignItems:"start"}}>
   <form className="customer-card" onSubmit={submit} style={{display:"grid",gap:14}}>
    <div><b>ثبت اعلام واریز جدید</b><p>ثبت این فرم به معنی پرداخت قطعی قسط نیست؛ ابتدا اطلاعات توسط واحد مالی بررسی می‌شود.</p></div>
    <label>قرارداد فعال<select required value={contractId} onChange={e=>setContractId(e.target.value)} style={{display:"block",width:"100%",marginTop:6,padding:10}}><option value="">انتخاب قرارداد</option>{contracts.map(c=><option key={c.id} value={c.id}>{c.contract_no} · اصل {money(c.principal)} ریال</option>)}</select></label>
    <label>مبلغ واریزی (ریال)<input required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="مثلاً ۲۵۰۰۰۰۰" style={{display:"block",width:"100%",marginTop:6,padding:10}}/></label>
    <label>روش پرداخت<select value={method} onChange={e=>setMethod(e.target.value)} style={{display:"block",width:"100%",marginTop:6,padding:10}}><option value="CardToCard">کارت‌به‌کارت</option><option value="BankTransfer">انتقال بانکی</option></select></label>
    <label>شماره پیگیری بانکی<input required inputMode="numeric" value={reference} onChange={e=>setReference(e.target.value)} placeholder="۴ تا ۳۰ رقم" style={{display:"block",width:"100%",marginTop:6,padding:10}}/></label>
    <label>تاریخ پرداخت<input required type="date" value={paidAt} onChange={e=>setPaidAt(e.target.value)} style={{display:"block",width:"100%",marginTop:6,padding:10}}/></label>
    <label>توضیحات (اختیاری)<textarea rows={3} maxLength={300} value={note} onChange={e=>setNote(e.target.value)} style={{display:"block",width:"100%",marginTop:6,padding:10}}/></label>
    <button type="submit" disabled={saving||loading||!contracts.length||!contractId}>{saving?"در حال ثبت...":"ثبت اعلام واریز"}</button>
    {!loading&&!contracts.length&&<small>قرارداد فعال یا دارای معوق برای این حساب پیدا نشد.</small>}
   </form>
   <section className="customer-card" style={{display:"grid",gap:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><b>سوابق اعلام واریز</b><button type="button" onClick={load} disabled={loading}>به‌روزرسانی</button></div>
    {loading?<p>در حال دریافت اطلاعات...</p>:items.map(d=><article key={d.id} style={{borderBottom:"1px solid var(--border,#ddd)",padding:"12px 0",display:"grid",gap:6}}>
     <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><b>{money(d.amount)} ریال</b><strong>{statusLabel[d.status]||d.status}</strong></div>
     <small>{contracts.find(c=>c.id===d.contract_id)?.contract_no||"قرارداد"} · {d.method==="CardToCard"?"کارت‌به‌کارت":"انتقال بانکی"}</small>
     <small>پیگیری: {d.payment_ref} · تاریخ: {new Date(d.paid_at).toLocaleDateString("fa-IR")}</small>
     {d.review_note&&<p>توضیح بررسی: {d.review_note}</p>}
    </article>)}
    {!loading&&!items.length&&<p>هنوز اعلام واریزی ثبت نشده است.</p>}
   </section>
  </section>
 </main>;
}
