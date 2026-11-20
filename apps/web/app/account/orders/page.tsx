"use client";

import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {api} from "../../../lib/api";
import "./orders-workspace.css";

type Order={
 id:string;order_no:string;status:string;currency:string;total_amount:string|number;
 seller_name?:string|null;created_at?:string|null;updated_at?:string|null;
 latest_payment_status?:string|null;latest_payment_no?:string|null;latest_refund_status?:string|null;latest_shipment_id?:string|null;shipment_no?:string|null;tracking_code?:string|null;shipment_status?:string|null;
};
const orderLabels:Record<string,string>={pending:"در انتظار تأیید",confirmed:"تأییدشده",paid:"پرداخت‌شده",processing:"در حال آماده‌سازی",shipped:"ارسال‌شده",delivered:"تحویل‌شده",returned:"مرجوع‌شده",cancelled:"لغوشده",refunded:"بازپرداخت‌شده"};
const paymentLabels:Record<string,string>={pending:"در انتظار پرداخت",authorized:"در انتظار نهایی‌سازی",paid:"پرداخت موفق",failed:"پرداخت ناموفق",refunded:"بازپرداخت‌شده"};
const money=(v:string|number,c:string)=>Number(v||0).toLocaleString("fa-IR")+" "+(c==="IRR"?"ریال":c);
const date=(v?:string|null)=>v?new Date(v).toLocaleString("fa-IR"):"-";

export default function OrdersPage(){
 const [items,setItems]=useState<Order[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [filter,setFilter]=useState("all");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{const result=await api<{items:Order[]}>("/api/marketplace/orders");setItems(result.items||[]);}
  catch(e){setError(e instanceof Error?e.message:"دریافت سفارش‌ها ناموفق بود.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const visible=filter==="all"?items:items.filter(x=>x.status===filter);
 return <main className="sookar-store" dir="rtl">
  <header className="store-header"><Link href="/account" className="store-logo"><b>سوکار</b><span>سفارش‌های من</span></Link><nav><Link href="/store">فروشگاه</Link><Link href="/account">حساب کاربری</Link></nav></header>
  <section className="store-section account-orders">
   <header className="account-orders-heading"><div><span>پیگیری خرید</span><h1>سفارش‌های من</h1><p>وضعیت سفارش، پرداخت و بازپرداخت را از اطلاعات ثبت‌شده سامانه دنبال کنید.</p></div><Link href="/store" className="account-orders-shop">ادامه خرید</Link></header>
   <div className="account-orders-toolbar"><label htmlFor="account-order-filter">فیلتر سفارش‌ها</label><select id="account-order-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">همه سفارش‌ها</option>{Object.entries(orderLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><button type="button" onClick={()=>void load()} disabled={loading}>به‌روزرسانی</button></div>
   {error&&<div className="account-orders-error" role="alert">{error}</div>}
   {loading?<div className="account-orders-empty" role="status">در حال دریافت سفارش‌ها…</div>:visible.length===0?<div className="account-orders-empty"><h2>{items.length?"سفارشی با این وضعیت پیدا نشد":"هنوز سفارشی ثبت نکرده‌اید"}</h2><p>پس از ثبت سفارش واقعی، اطلاعات آن در همین صفحه نمایش داده می‌شود.</p><Link href="/store">مشاهده کالاها</Link></div>:<div className="account-orders-list">{visible.map(o=><article className="account-order-card" key={o.id}>
    <div className="account-order-top"><div><small>شماره سفارش</small><strong>{o.order_no}</strong></div><span className={"account-order-status status-"+o.status}>{orderLabels[o.status]||o.status}</span></div>
    <div className="account-order-details"><div><small>مبلغ سفارش</small><b>{money(o.total_amount,o.currency)}</b></div><div><small>فروشنده</small><b>{o.seller_name||"فروشنده بازارگاه"}</b></div><div><small>زمان ثبت</small><b>{date(o.created_at)}</b></div></div>
    <div className="account-order-payment"><span>وضعیت پرداخت</span><b>{paymentLabels[o.latest_payment_status||""]||"هنوز پرداختی ثبت نشده"}</b>{o.latest_refund_status==="refunded"&&<em>بازپرداخت انجام شده</em>}</div>{o.latest_shipment_id&&<div className="account-order-shipping"><span>وضعیت مرسوله</span><b>{o.shipment_status==="delivered"?"تحویل‌شده":o.shipment_status==="in_transit"?"در مسیر":o.shipment_status==="failed"?"عدم تحویل":o.shipment_status==="cancelled"?"لغوشده":"در حال آماده‌سازی ارسال"}</b><small>کد رهگیری: {o.tracking_code||"ثبت نشده"}</small><Link href={"/account/orders/"+encodeURIComponent(o.id)+"/tracking"}>مشاهده تاریخچه ارسال ←</Link></div>}
    <div className="account-order-footer"><small>شناسه سفارش: {o.id}</small><Link href={"/store/checkout?order="+encodeURIComponent(o.id)+"&cart=history"}>پیگیری سفارش ←</Link></div>
   </article>)}</div>}
  </section>
 </main>;
}
