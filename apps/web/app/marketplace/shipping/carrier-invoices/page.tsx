"use client";

import {useCallback,useEffect,useState} from "react";
import {api} from "../../../../lib/api";
import "./carrier-invoices.css";

type Candidate={shipment_id:string;shipment_no:string;delivered_at?:string|null;order_id:string;order_no:string;currency:string;quote_id:string;carrier_name?:string|null;service_name?:string|null;carrier_cost:string|number;quote_currency:string};
type Invoice={id:string;shipment_id:string;shipment_no:string;order_id:string;order_no:string;invoice_no:string;carrier_name:string;currency:string;quoted_cost:string|number;invoice_amount:string|number;variance_amount:string|number;status:string;notes?:string|null;resolution_note?:string|null;created_at:string;reviewed_at?:string|null;supplier_name?:string|null;payable_status?:string|null;payable_id?:string|null;payable_amount?:string|number|null;payable_settled_amount?:string|number|null;};
type Supplier={id:string;party_code:string;title:string};
type BankAccount={id:string;code:string;bank_name:string;currency:string;current_balance:string|number;ledger_code:string;ledger_name:string};
type Data={items:Invoice[];candidates:Candidate[];suppliers:Supplier[];bankAccounts:BankAccount[]};
const labels:Record<string,string>={matched:"منطبق با پیش‌فاکتور",disputed:"دارای اختلاف",approved:"تأیید عملیاتی",void:"باطل‌شده"};
const amount=(v:unknown)=>Number(v||0).toLocaleString("fa-IR");
const date=(v?:string|null)=>v?new Date(v).toLocaleString("fa-IR"):"—";

export default function CarrierInvoicesPage(){
 const [data,setData]=useState<Data>({items:[],candidates:[],suppliers:[],bankAccounts:[]});
 const [shipmentId,setShipmentId]=useState("");
 const [invoiceNo,setInvoiceNo]=useState("");
 const [invoiceAmount,setInvoiceAmount]=useState("");
 const [notes,setNotes]=useState("");
 const [resolution,setResolution]=useState<Record<string,string>>({});
 const [supplierByInvoice,setSupplierByInvoice]=useState<Record<string,string>>({});
 const [bankByInvoice,setBankByInvoice]=useState<Record<string,string>>({});
 const [payAmountByInvoice,setPayAmountByInvoice]=useState<Record<string,string>>({});
 const [payReferenceByInvoice,setPayReferenceByInvoice]=useState<Record<string,string>>({});
 const [paymentKeys,setPaymentKeys]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{setData(await api<Data>("/api/logistics/carrier-invoices"));}
  catch(e){setError(e instanceof Error?e.message:"دریافت صورتحساب‌های شرکت حمل ناموفق بود.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);

 async function submit(){
  if(!shipmentId||!invoiceNo.trim()||invoiceAmount===""){setError("مرسوله، شماره صورتحساب و مبلغ آن الزامی است.");return;}
  setBusy("new");setError("");setNotice("");
  try{
   await api("/api/logistics/carrier-invoices",{method:"POST",body:JSON.stringify({shipmentId,invoiceNo,invoiceAmount:Number(invoiceAmount),notes})});
   setShipmentId("");setInvoiceNo("");setInvoiceAmount("");setNotes("");
   setNotice("صورتحساب شرکت حمل ثبت و با مبلغ پیش‌فاکتور تطبیق شد.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"ثبت صورتحساب شرکت حمل ناموفق بود.");}
  finally{setBusy("");}
 }

 async function approve(item:Invoice){
  setBusy(item.id);setError("");setNotice("");
  try{
   await api("/api/logistics/carrier-invoices/"+encodeURIComponent(item.id)+"/approve",{method:"POST",body:JSON.stringify({partyId:supplierByInvoice[item.id]||"",resolutionNote:resolution[item.id]||""})});
   setNotice("صورتحساب "+item.invoice_no+" تأیید شد؛ بدهی تأمین‌کننده ثبت و اختلاف مبلغ در دفترکل تعدیل شد. پرداخت نقدی هنوز انجام نشده است.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"تأیید صورتحساب ناموفق بود.");}
  finally{setBusy("");}
 }

 async function pay(item:Invoice){
 const remaining=Number(item.payable_amount||0)-Number(item.payable_settled_amount||0);
 const amountValue=Number(payAmountByInvoice[item.id]||remaining),bankAccountId=bankByInvoice[item.id]||"",referenceNo=(payReferenceByInvoice[item.id]||"").trim();
 if(!bankAccountId||!referenceNo||!Number.isFinite(amountValue)||amountValue<=0){setError("حساب بانکی، مبلغ و شماره مرجع پرداخت الزامی است.");return;}
 const key=paymentKeys[item.id]||crypto.randomUUID();setPaymentKeys(p=>({...p,[item.id]:key}));setBusy("pay-"+item.id);setError("");setNotice("");
 try{
  const result=await api("/api/logistics/carrier-invoices/"+encodeURIComponent(item.id)+"/pay",{method:"POST",body:JSON.stringify({bankAccountId,amount:amountValue,referenceNo,paymentDate:new Date().toISOString().slice(0,10),idempotencyKey:key})});
  setPaymentKeys(p=>{const n={...p};delete n[item.id];return n;});setPayReferenceByInvoice(p=>({...p,[item.id]:""}));
  setNotice("پرداخت "+amount(amountValue)+" "+item.currency+" ثبت شد. مانده بدهی: "+amount(result.outstandingAmount));await load();
 }catch(e){setError(e instanceof Error?e.message:"ثبت پرداخت شرکت حمل ناموفق بود.");}finally{setBusy("");}
}

const selected=data.candidates.find(x=>x.shipment_id===shipmentId);
 return <main className="enterprise-main carrier-invoices-page" dir="rtl">
  <header className="platform-header">
   <div><span className="section-kicker">تجارت · لجستیک · تطبیق هزینه</span><h1>صورتحساب شرکت‌های حمل</h1><p>تطبیق صورتحساب واقعی، ثبت بدهی تأمین‌کننده و تعدیل اختلاف در دفترکل</p></div>
   <div className="carrier-invoice-actions"><a href="/marketplace/shipping">بازگشت به ارسال</a><a href="/marketplace/shipping/delivery-quotes">پیش‌فاکتورهای حمل</a><button type="button" onClick={()=>void load()} disabled={loading}>بازخوانی</button></div>
  </header>
  {error&&<p className="carrier-invoice-message error" role="alert">{error}</p>}
  {notice&&<p className="carrier-invoice-message success" role="status">{notice}</p>}
  <section className="platform-panel carrier-invoice-panel">
   <h2>ثبت صورتحساب شرکت حمل</h2>
   <p>فقط مرسوله تحویل‌شده با پیش‌فاکتور پذیرفته‌شده در این فهرست قرار می‌گیرد. اختلاف مبلغ به‌صورت خودکار مشخص می‌شود.</p>
   <div className="carrier-invoice-form">
    <label>مرسوله<select value={shipmentId} onChange={e=>setShipmentId(e.target.value)}><option value="">انتخاب مرسوله تحویل‌شده</option>{data.candidates.map(x=><option key={x.shipment_id} value={x.shipment_id}>{x.shipment_no} · {x.order_no} · {x.carrier_name||"شرکت حمل"}</option>)}</select></label>
    <label>شماره صورتحساب<input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} maxLength={120} placeholder="شماره سند شرکت حمل"/></label>
    <label>مبلغ صورتحساب<input type="number" min="0" value={invoiceAmount} onChange={e=>setInvoiceAmount(e.target.value)} placeholder="مبلغ واقعی"/></label>
    <label className="carrier-invoice-wide">توضیحات<textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="توضیحات یا مرجع سند"/></label>
   </div>
   {selected&&<div className="carrier-invoice-reference"><span>شرکت حمل: <b>{selected.carrier_name||"ثبت‌نشده"}</b></span><span>هزینه مرجع: <b>{amount(selected.carrier_cost)} {selected.quote_currency}</b></span><span>سفارش: <b>{selected.order_no}</b></span><span>تاریخ تحویل: <b>{date(selected.delivered_at)}</b></span></div>}
   <button className="carrier-invoice-submit" type="button" disabled={busy==="new"||!shipmentId||!invoiceNo.trim()||invoiceAmount===""} onClick={()=>void submit()}>{busy==="new"?"در حال ثبت…":"ثبت و تطبیق صورتحساب"}</button>
   {!data.candidates.length&&!loading&&<p className="carrier-invoice-empty">در حال حاضر مرسوله تحویل‌شده بدون صورتحساب وجود ندارد.</p>}
  </section>
  <section className="platform-panel carrier-invoice-panel">
   <div className="carrier-invoice-list-title"><div><h2>سوابق صورتحساب و تطبیق</h2><p>پس از تأیید، بدهی در حساب‌های پرداختنی ثبت می‌شود؛ پرداخت وجه در گردش پرداخت‌های مالی انجام خواهد شد.</p></div><b>{data.items.length.toLocaleString("fa-IR")} مورد</b></div>
   {loading?<p className="carrier-invoice-empty">در حال دریافت اطلاعات…</p>:data.items.length?data.items.map(item=><article className="carrier-invoice-row" key={item.id}>
    <div className="carrier-invoice-main"><b>{item.carrier_name} · {item.invoice_no}</b><small>مرسوله {item.shipment_no} · سفارش {item.order_no}</small><small>ثبت: {date(item.created_at)}</small></div>
    <div className="carrier-invoice-amounts"><span>پیش‌فاکتور: {amount(item.quoted_cost)} {item.currency}</span><span>صورتحساب: {amount(item.invoice_amount)} {item.currency}</span><b data-variance={Number(item.variance_amount)===0?"zero":"diff"}>اختلاف: {amount(item.variance_amount)} {item.currency}</b></div>
    <div className="carrier-invoice-review"><span className={"carrier-invoice-status status-"+item.status}>{labels[item.status]||item.status}</span>
     {item.status==="disputed"&&<label>توضیح رفع اختلاف<input value={resolution[item.id]||""} onChange={e=>setResolution(p=>({...p,[item.id]:e.target.value}))} placeholder="مبنای پذیرش اختلاف مبلغ"/></label>}
     {(item.status==="matched"||item.status==="disputed")&&<label>طرف حساب تأمین‌کننده<select value={supplierByInvoice[item.id]||""} onChange={e=>setSupplierByInvoice(p=>({...p,[item.id]:e.target.value}))}><option value="">انتخاب تأمین‌کننده در حسابداری</option>{data.suppliers.map(p=><option key={p.id} value={p.id}>{p.title} · {p.party_code}</option>)}</select></label>}
     {(item.status==="matched"||item.status==="disputed")&&<button type="button" disabled={busy===item.id||!supplierByInvoice[item.id]||(item.status==="disputed"&&!(resolution[item.id]||"").trim())} onClick={()=>void approve(item)}>{busy===item.id?"در حال ثبت…":"تأیید و ثبت بدهی"}</button>}
     {item.status==="approved"&&<small>طرف حساب: {item.supplier_name||"ثبت‌شده"} · وضعیت بدهی: {item.payable_status||"ثبت شد"}</small>}
     {item.resolution_note&&<small>توضیح تأیید: {item.resolution_note}</small>}
    </div>
   </article>):<p className="carrier-invoice-empty">هنوز صورتحسابی برای شرکت‌های حمل ثبت نشده است.</p>}
  </section>
  <p className="carrier-invoice-footnote">تأیید صورتحساب، بدهی شرکت حمل را در حساب‌های پرداختنی ثبت می‌کند و اختلاف پیش‌فاکتور با صورتحساب را روی حساب‌های موجود ۲۲۰۱ و ۵۲۰۱ تعدیل می‌کند. پرداخت واقعی باید از گردش پرداخت‌های مالی انجام شود.</p>
 </main>;
}
