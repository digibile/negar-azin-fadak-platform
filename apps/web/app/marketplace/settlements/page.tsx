"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
import "./settlements-workspace.css";

type RecoveryClaim={id:string;seller_name?:string;settlement_no:string;order_no:string;refund_no:string;amount:string|number;currency?:string;status:string;created_at?:string;payment_ref?:string};
type Settlement={
 id:string;settlement_no:string;seller_name?:string;currency?:string;gross_amount:string|number;
 commission_amount?:string|number;shipping_amount_total?:string|number;net_amount:string|number;status:string;
 order_count?:number;created_at?:string;
};
const statusLabels:Record<string,string>={pending:"در انتظار تأیید",approved:"تأییدشده",paid:"پرداخت‌شده",reversed:"برگشت‌خورده"};
const amount=(value:unknown)=>Number(value||0).toLocaleString("fa-IR");
const date=(value?:string)=>value?new Date(value).toLocaleDateString("fa-IR"):"—";

export default function SettlementsPage(){
 const [items,setItems]=useState<Settlement[]>([]);
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
   .then(x=>{if(active)setItems(Array.isArray(x)?x:Array.isArray(x?.items)?x.items:[]);})
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
 const collect=async(id:string)=>{
  const paymentRef=(paymentRefs[id]||"").trim();if(!paymentRef){setClaimError("شماره مرجع دریافت وجه را وارد کنید");return;}
  setCollecting(id);setClaimError("");
  try{await api<any>(`/api/marketplace/seller-recoveries/${id}/collect`,{method:"POST",body:JSON.stringify({paymentRef})});const r=await api<any>("/api/marketplace/seller-recoveries");setClaims(Array.isArray(r?.items)?r.items:[]);}
  catch(e:any){setClaimError(e.message||"ثبت وصول مطالبه ناموفق بود");}
  finally{setCollecting("");}
 };
 return <main className="enterprise-main commerce-settlements" dir="rtl">
  <header className="platform-header settlements-intro">
   <div><span className="section-kicker">تجارت و تسویه</span><h1>تسویه فروشندگان</h1><p>مبالغ ناخالص، کارمزد و خالص قابل پرداخت هر دوره</p></div>
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
