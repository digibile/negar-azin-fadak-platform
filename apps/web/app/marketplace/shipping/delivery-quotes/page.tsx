"use client";

import {useCallback,useEffect,useState} from "react";
import {api} from "../../../../lib/api";
import "./delivery-quotes.css";

type Order={id:string;order_no:string;status:string;currency:string;total_amount:number;delivery_quote_required:boolean;delivery_method_snapshot?:{title?:string}|null};
type Quote={id:string;order_id:string;order_no:string;version:number;currency:string;carrier_cost:string;customer_charge:string;carrier_name?:string|null;service_name?:string|null;status:string;expires_at?:string|null;created_at:string;delivery_method_title?:string|null};
const statusLabel:Record<string,string>={offered:"در انتظار پاسخ مشتری",accepted:"پذیرفته‌شده",rejected:"ردشده",expired:"منقضی‌شده",superseded:"جایگزین‌شده"};

export default function DeliveryQuotesPage(){
 const [orders,setOrders]=useState<Order[]>([]);
 const [quotes,setQuotes]=useState<Quote[]>([]);
 const [orderId,setOrderId]=useState("");
 const [carrierCost,setCarrierCost]=useState("");
 const [customerCharge,setCustomerCharge]=useState("");
 const [carrierName,setCarrierName]=useState("");
 const [serviceName,setServiceName]=useState("");
 const [minDays,setMinDays]=useState("");
 const [maxDays,setMaxDays]=useState("");
 const [expiresAt,setExpiresAt]=useState("");
 const [notes,setNotes]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [o,q]=await Promise.all([
    api<{items:Order[]}>("/api/marketplace/orders"),
    api<Quote[]>("/api/logistics/marketplace-delivery-quotes")
   ]);
   setOrders((o.items||[]).filter(x=>x.delivery_quote_required&&["pending","confirmed"].includes(x.status)));
   setQuotes(q||[]);
  }catch(e){setError(e instanceof Error?e.message:"دریافت پیش‌فاکتورهای حمل ناموفق بود.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);

 async function submit(){
  const order=orders.find(x=>x.id===orderId);
  if(!order){setError("سفارش را انتخاب کنید.");return;}
  if(carrierCost.trim()===""||customerCharge.trim()===""){setError("هزینه شرکت حمل و مبلغ مشتری الزامی است.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   await api("/api/logistics/marketplace-orders/"+encodeURIComponent(orderId)+"/delivery-quotes",{method:"POST",body:JSON.stringify({
    carrierCost:Number(carrierCost),customerCharge:Number(customerCharge),currency:order.currency||"IRR",
    carrierName,serviceName,estimatedBusinessDaysMin:minDays===""?null:Number(minDays),
    estimatedBusinessDaysMax:maxDays===""?null:Number(maxDays),expiresAt:expiresAt?new Date(expiresAt).toISOString():null,notes
   })});
   setNotice("پیش‌فاکتور حمل برای سفارش "+order.order_no+" ثبت شد.");
   setCarrierCost("");setCustomerCharge("");setCarrierName("");setServiceName("");setMinDays("");setMaxDays("");setExpiresAt("");setNotes("");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"ثبت پیش‌فاکتور ناموفق بود.");}
  finally{setBusy(false);}
 }

 return <main className="enterprise-main delivery-quotes-page" dir="rtl">
  <header className="platform-header">
   <div><span className="section-kicker">تجارت · لجستیک</span><h1>استعلام و پیش‌فاکتور هزینه ارسال</h1><p>ثبت مبلغ اعلام‌شده شرکت حمل و مبلغ قابل اعلام به مشتری، بدون حدس‌زدن نرخ حمل</p></div>
   <div className="delivery-quotes-actions"><a href="/marketplace/shipping">بازگشت به ارسال و رهگیری</a><button type="button" onClick={()=>void load()} disabled={loading}>بازخوانی</button></div>
  </header>
  {error&&<p className="delivery-quotes-message error" role="alert">{error}</p>}
  {notice&&<p className="delivery-quotes-message success" role="status">{notice}</p>}
  <section className="platform-panel delivery-quotes-panel">
   <h2>صدور پیش‌فاکتور دستی</h2>
   <p>این مرحله صرفاً ثبت پیشنهاد اپراتور است. تا زمان پیاده‌سازی تأیید مشتری، مبلغ به سفارش یا پرداخت اضافه نمی‌شود.</p>
   <div className="delivery-quotes-form">
    <label>سفارش<select value={orderId} onChange={e=>setOrderId(e.target.value)}><option value="">انتخاب سفارش پرداخت‌نشده</option>{orders.map(o=><option key={o.id} value={o.id}>{o.order_no} · {o.delivery_method_snapshot?.title||"روش ارسال ثبت‌شده"} · {o.status}</option>)}</select></label>
    <label>نام شرکت حمل<input value={carrierName} onChange={e=>setCarrierName(e.target.value)} placeholder="نام شرکت یا ناوگان"/></label>
    <label>سرویس حمل<input value={serviceName} onChange={e=>setServiceName(e.target.value)} placeholder="نوع سرویس"/></label>
    <label>هزینه اعلامی شرکت حمل<input type="number" min="0" value={carrierCost} onChange={e=>setCarrierCost(e.target.value)}/></label>
    <label>مبلغ پیشنهادی به مشتری<input type="number" min="0" value={customerCharge} onChange={e=>setCustomerCharge(e.target.value)}/></label>
    <label>حداقل روز کاری<input type="number" min="0" value={minDays} onChange={e=>setMinDays(e.target.value)}/></label>
    <label>حداکثر روز کاری<input type="number" min="0" value={maxDays} onChange={e=>setMaxDays(e.target.value)}/></label>
    <label>اعتبار تا<input type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)}/></label>
    <label className="delivery-quotes-wide">توضیحات<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}/></label>
   </div>
   <button type="button" className="delivery-quotes-submit" disabled={busy||!orderId||carrierCost===""||customerCharge===""} onClick={()=>void submit()}>{busy?"در حال ثبت…":"ثبت پیش‌فاکتور حمل"}</button>
  </section>
  <section className="platform-panel delivery-quotes-panel">
   <div className="delivery-quotes-title"><h2>سوابق پیش‌فاکتور حمل</h2><span>{quotes.length.toLocaleString("fa-IR")} مورد</span></div>
   {loading?<p>در حال دریافت اطلاعات…</p>:quotes.length?quotes.map(q=><article className="delivery-quote-row" key={q.id}>
    <div><b>{q.order_no}</b><small>{q.delivery_method_title||"روش ارسال"} · نسخه {q.version}</small><small>{q.carrier_name||"شرکت حمل ثبت‌نشده"} {q.service_name?"· "+q.service_name:""}</small></div>
    <div><span>هزینه حمل: {Number(q.carrier_cost).toLocaleString("fa-IR")} {q.currency}</span><span>مبلغ مشتری: {Number(q.customer_charge).toLocaleString("fa-IR")} {q.currency}</span></div>
    <div><b>{statusLabel[q.status]||q.status}</b><small>{q.expires_at?"اعتبار تا: "+new Date(q.expires_at).toLocaleString("fa-IR"):"بدون مهلت انقضا"}</small></div>
   </article>):<p className="empty">هنوز پیش‌فاکتور حملی ثبت نشده است.</p>}
  </section>
  <p className="delivery-quotes-footnote">هیچ نرخ خودکاری از تعرفه پایه ساخته نمی‌شود. اطلاعات این صفحه تا پیش از مرحله تأیید مشتری، پیشنهاد عملیاتی محسوب می‌شود و قابل پرداخت نیست.</p>
 </main>;
}
