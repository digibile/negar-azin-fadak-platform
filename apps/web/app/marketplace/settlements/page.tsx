"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
import "./settlements-workspace.css";

type BankAccount={id:string;code:string;bank_name:string;currency:string;current_balance:string|number};
type PaymentHistory={id:string;amount:string|number;currency:string;payment_date:string;reference_no:string;ledger_entry_id?:string|null};
type RecoveryClaim={id:string;seller_name?:string;settlement_no:string;order_no:string;refund_no:string;amount:string|number;currency?:string;status:string;created_at?:string;payment_ref?:string};
type Settlement={
 id:string;settlement_no:string;seller_name?:string;currency?:string;gross_amount:string|number;
 commission_amount?:string|number;shipping_amount_total?:string|number;net_amount:string|number;status:string;payable_id?:string|null;payable_amount?:string|number;payable_settled_amount?:string|number;payable_status?:string;payment_history?:PaymentHistory[];
 order_count?:number;created_at?:string;
};
const statusLabels:Record<string,string>={pending:"در انتظار تأیید",approved:"تأییدشده",partially_paid:"پرداخت بخشی",paid:"پرداخت‌شده",reversed:"برگشت‌خورده"};
const amount=(value:unknown)=>Number(value||0).toLocaleString("fa-IR");
const date=(value?:string)=>value?new Date(value).toLocaleDateString("fa-IR"):"—";

export default function SettlementsPage(){
 const [items,setItems]=useState<Settlement[]>([]);\n const [bankAccounts,setBankAccounts]=useState<BankAccount[]>([]);\n const [paymentForms,setPaymentForms]=useState<Record<string,{bankAccountId:string;amount:string;referenceNo:string;paymentDate:string}>>({});\n const [paymentKeys,setPaymentKeys]=useState<Record<string,string>>({});\n const [actionBusy,setActionBusy]=useState("");
 const [error,setError]=useState("");
 const [claims,setClaims]=useState<RecoveryClaim[]>([]);
 const [claimError,setClaimError]=useState("");
 const [collecting,setCollecting]=useState("");
 const [paymentRefs,setPaymentRefs]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [expanded,setExpanded]=useState("");
 const [detail,setDetail]=useState<any>(null);
 const [detailLoading,setDetailLoading]=useState(false);
 const [detailError,setDetailError]=useState("");
 useEffect(()=>{
  let active=true;
  api<any>("/api/marketplace/settlements")
   .then(x=>{if(active){const rows=Array.isArray(x)?x:Array.isArray(x?.items)?x.items:[];setItems(rows);setBankAccounts(x?.bankAccounts||[]);setPaymentForms(old=>{const next={...old};for(const row of rows){if(!next[row.id])next[row.id]={bankAccountId:x?.bankAccounts?.[0]?.id||"",amount:String(Math.max(0,Number(row.payable_amount||row.net_amount)-Number(row.payable_settled_amount||0))),referenceNo:"",paymentDate:new Date().toISOString().slice(0,10)};}return next;});}})
   .catch(e=>{if(active)setError(e.message||"دریافت فهرست تسویه‌ها ناموفق بود");})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);
 const toggleDetail=async(id:string)=>{
  if(expanded===id){setExpanded("");setDetail(null);return;}
  setExpanded(id);setDetail(null);setDetailError("");setDetailLoading(true);
  try{setDetail(await api<any>(`/api/marketplace/settlements/${id}`));}
  catch(e:any){setDetailError(e.message||"دریافت جزئیات تسویه ناموفق بود");}
  finally{setDetailLoading(false);}
 };
 const updatePaymentForm=(id:string,patch:Partial<{bankAccountId:string;amount:string;referenceNo:string;paymentDate:string}>)=>setPaymentForms(old=>({...old,[id]:{...(old[id]||{bankAccountId:bankAccounts[0]?.id||"",amount:"",referenceNo:"",paymentDate:new Date().toISOString().slice(0,10)}),...patch}}));
 const approve=async(id:string)=>{
  setActionBusy(id);setError("");
  try{await api<any>(`/api/marketplace/settlements/${id}/approve`,{method:"PATCH"});const x=await api<any>("/api/marketplace/settlements");setItems(x?.items||[]);setBankAccounts(x?.bankAccounts||[]);}
  catch(e:any){setError(e.message||"تأیید تسویه ناموفق بود");}
  finally{setActionBusy("");}
 };
 const pay=async(id:string)=>{
  const f=paymentForms[id];if(!f?.bankAccountId||!f.referenceNo.trim()||!(Number(f.amount)>0)){setError("حساب بانکی، مبلغ و شماره مرجع پرداخت را کامل کنید");return;}
  setActionBusy(id);setError("");
  const idempotencyKey=paymentKeys[id]||crypto.randomUUID();setPaymentKeys(old=>({...old,[id]:idempotencyKey}));
  try{await api<any>(`/api/marketplace/settlements/${id}/pay`,{method:"POST",body:JSON.stringify({...f,referenceNo:f.referenceNo.trim(),idempotencyKey})});setPaymentKeys(old=>{const next={...old};delete next[id];return next;});const x=await api<any>("/api/marketplace/settlements");setItems(x?.items||[]);setBankAccounts(x?.bankAccounts||[]);}
  catch(e:any){setError(e.message||"ثبت پرداخت تسویه ناموفق بود");}
  finally{setActionBusy("");}
 };
 const collect=async(id:string)=>{
  const paymentRef=(paymentRefs[id]||"").trim();if(!paymentRef){setClaimError("شماره مرجع دریافت وجه را وارد کنید");return;}
  setCollecting(id);setClaimError("");
  try{await api<any>(`/api/marketplace/seller-recoveries/${id}/collect`,{method:"POST",body:JSON.stringify({paymentRef})});const r=await api<any>("/api/marketplace/seller-recoveries");setClaims(Array.isArray(r?.items)?r.items:[]);}
  catch(e:any){setClaimError(e.message||"ثبت وصول مطالبه ناموفق بود");}
  finally{setCollecting("");}
 };
 return <main className="enterprise-main commerce-settlements" dir="rtl">
  <header className="platform-header settlements-intro">
   <div><span className="section-kicker">تجارت و تسویه</span><h1>تسویه فروشندگان</h1><p>مبالغ ناخالص، کارمزد، بدهی فروشنده و پرداخت‌های بانکی قابل پیگیری</p>{error&&<p className="settlements-action-error" role="alert">{error}</p>}</div>
   <div className="settlements-count"><strong>{items.length.toLocaleString("fa-IR")}</strong><span>پرونده تسویه</span></div>
   <a href="/platform">مرکز عملیات</a>
  </header>
  <section className="platform-panel settlements-list" aria-live="polite">
   {loading&&<p className="settlements-state">در حال دریافت اطلاعات تسویه…</p>}
   {!loading&&error&&<p className="settlements-state error" role="alert">{error}</p>}
   {!loading&&!error&&items.map(x=><article className="settlement-card" key={x.id}>
    <div className="settlement-number"><b>{x.settlement_no}</b><small>{x.seller_name||"فروشنده"} · {date(x.created_at)}</small></div>
    <div className="settlement-metric"><small>مبلغ ناخالص</small><strong>{amount(x.gross_amount)} {x.currency||"IRR"}</strong></div>
    <div className="settlement-metric"><small>کارمزد</small><strong>{amount(x.commission_amount)} {x.currency||"IRR"}</strong></div>
    <div className="settlement-metric"><small>هزینه ارسال ثبت‌شده</small><strong>{amount(x.shipping_amount_total)} {x.currency||"IRR"}</strong></div>
    <div className="settlement-metric"><small>خالص فروشنده</small><strong>{amount(x.net_amount)} {x.currency||"IRR"}</strong></div>
    <span className="settlement-status" data-status={x.status}>{statusLabels[x.status]||x.status}</span>
    {x.status==="pending"&&<button type="button" className="settlement-approve" disabled={actionBusy===x.id} onClick={()=>approve(x.id)}>{actionBusy===x.id?"در حال ثبت…":"تأیید و ایجاد بدهی مالی"}</button>}
    {["approved","partially_paid"].includes(x.status)&&<section className="seller-settlement-payment">
     <b>پرداخت از حساب بانکی سازمان</b>
     <small>مانده بدهی: {amount(Math.max(0,Number(x.payable_amount||x.net_amount)-Number(x.payable_settled_amount||0)))} {x.currency||"IRR"}</small>
     <div className="seller-settlement-payment-fields">
      <label>حساب بانکی<select value={paymentForms[x.id]?.bankAccountId||""} onChange={e=>updatePaymentForm(x.id,{bankAccountId:e.target.value})}><option value="">انتخاب حساب</option>{bankAccounts.filter(b=>b.currency=== (x.currency||"IRR")).map(b=><option key={b.id} value={b.id}>{b.bank_name} · {b.code} · مانده {amount(b.current_balance)} {b.currency}</option>)}</select></label>
      <label>مبلغ پرداخت<input type="number" min="0.01" max={Math.max(0,Number(x.payable_amount||x.net_amount)-Number(x.payable_settled_amount||0))} value={paymentForms[x.id]?.amount||""} onChange={e=>updatePaymentForm(x.id,{amount:e.target.value})}/></label>
      <label>شماره مرجع بانکی<input value={paymentForms[x.id]?.referenceNo||""} onChange={e=>updatePaymentForm(x.id,{referenceNo:e.target.value})} placeholder="شماره پیگیری انتقال وجه"/></label>
      <label>تاریخ پرداخت<input type="date" value={paymentForms[x.id]?.paymentDate||""} onChange={e=>updatePaymentForm(x.id,{paymentDate:e.target.value})}/></label>
     </div>
     <button type="button" className="settlement-pay" disabled={actionBusy===x.id||!bankAccounts.some(b=>b.id===paymentForms[x.id]?.bankAccountId)} onClick={()=>pay(x.id)}>{actionBusy===x.id?"در حال ثبت پرداخت…":"ثبت پرداخت و سند بانکی"}</button>
    </section>}
    {!!x.payment_history?.length&&<div className="seller-settlement-history"><b>سوابق پرداخت</b>{x.payment_history.map(p=><div key={p.id}><span>{date(p.payment_date)} · مرجع {p.reference_no}</span><strong>{amount(p.amount)} {p.currency}</strong><small>{p.ledger_entry_id?"سند دفترکل ثبت شده":"فاقد شناسه سند"}</small></div>)}</div>}
    <small>{Number(x.order_count||0).toLocaleString("fa-IR")} سفارش</small>
    <button type="button" className="settlement-detail-toggle" onClick={()=>toggleDetail(x.id)}>{expanded===x.id?"بستن جزئیات":"جزئیات سفارش‌ها"}</button>
    {expanded===x.id&&<div className="settlement-order-details">
     {detailLoading&&<p>در حال دریافت جزئیات…</p>}
     {detailError&&<p role="alert" className="error">{detailError}</p>}
     {detail?.id===x.id&&(detail.orders||[]).map((order:any)=><div className="settlement-order-row" key={order.orderId}><b>{order.orderNo}</b><span>ناخالص: {amount(order.grossAmount)}</span><span>ارسال: {amount(order.shippingAmount)}</span><span>کارمزد: {amount(order.commissionAmount)}</span><strong>خالص: {amount(order.netAmount)} {order.currency||x.currency||"IRR"}</strong></div>)}
    </div>}
   </article>)}
   {!loading&&!error&&!items.length&&<p className="settlements-state">هنوز پرونده تسویه‌ای ثبت نشده است.</p>}
  </section>
 </main>;
}
