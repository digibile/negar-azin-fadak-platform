"use client";

import Link from "next/link";
import {useParams} from "next/navigation";
import {useCallback,useEffect,useState} from "react";
import {api} from "../../../../../lib/api";
import "./tracking-workspace.css";

type Event={id:string|number;status:string;location?:string|null;description?:string|null;occurred_at:string};
type Shipment={id:string;shipment_no:string;status:string;tracking_code?:string|null;origin:string;destination:string;dispatch_at?:string|null;delivered_at?:string|null;delivered_reason?:string|null};
type Tracking={order:{id:string;order_no:string};shipment:Shipment|null;events:Event[]};
const labels:Record<string,string>={planned:"برنامه‌ریزی‌شده",assigned:"ناوگان تخصیص یافته",picked_up:"دریافت از انبار",in_transit:"در مسیر",delivered:"تحویل‌شده",failed:"عدم تحویل",cancelled:"لغوشده"};
const date=(v?:string|null)=>v?new Date(v).toLocaleString("fa-IR"):"—";

export default function OrderTrackingPage(){
 const params=useParams<{id:string}>();
 const [data,setData]=useState<Tracking|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const load=useCallback(async()=>{
  if(!params?.id)return;
  setLoading(true);setError("");
  try{setData(await api<Tracking>("/api/marketplace/orders/"+encodeURIComponent(params.id)+"/shipment"));}
  catch(e){setError(e instanceof Error?e.message:"دریافت اطلاعات رهگیری ناموفق بود.");}
  finally{setLoading(false);}
 },[params?.id]);
 useEffect(()=>{void load();},[load]);
 return <main className="sookar-store customer-tracking" dir="rtl">
  <header className="store-header"><Link href="/account/orders" className="store-logo"><b>سوکار</b><span>رهگیری سفارش</span></Link><nav><Link href="/store">فروشگاه</Link><Link href="/account/orders">سفارش‌های من</Link></nav></header>
  <section className="store-section tracking-content">
   <Link className="tracking-back" href="/account/orders">← بازگشت به سفارش‌ها</Link>
   <div className="tracking-heading"><span>پیگیری خرید</span><h1>رهگیری مرسوله</h1><p>وضعیت حمل و رویدادهای ثبت‌شده برای سفارش را مشاهده کنید.</p></div>
   {error&&<div className="tracking-error" role="alert">{error}</div>}
   {loading?<div className="tracking-empty">در حال دریافت اطلاعات رهگیری…</div>:!data?.shipment?<div className="tracking-empty"><h2>هنوز مرسوله‌ای ثبت نشده است</h2><p>پس از تحویل سفارش به واحد ارسال، اطلاعات مرسوله در این صفحه نمایش داده می‌شود.</p></div>:<>
    <article className="tracking-summary">
     <div><small>شماره سفارش</small><b>{data.order.order_no}</b></div>
     <div><small>شماره مرسوله</small><b>{data.shipment.shipment_no}</b></div>
     <div><small>کد رهگیری</small><b>{data.shipment.tracking_code||"ثبت نشده"}</b></div>
     <span className={"tracking-status status-"+data.shipment.status}>{labels[data.shipment.status]||data.shipment.status}</span>
    </article>
    <div className="tracking-route"><div><small>مبدأ</small><b>{data.shipment.origin}</b></div><span>←</span><div><small>مقصد</small><b>{data.shipment.destination}</b></div></div>
    <section className="tracking-timeline"><header><h2>تاریخچه جابه‌جایی</h2><button type="button" onClick={()=>void load()} disabled={loading}>به‌روزرسانی</button></header>
     {data.events.length?<ol>{data.events.map((event,i)=><li key={event.id}><span className="tracking-dot"/><div><b>{labels[event.status]||event.status}</b><time>{date(event.occurred_at)}</time>{event.location&&<small>موقعیت: {event.location}</small>}{event.description&&<p>{event.description}</p>}</div></li>)}</ol>:<p className="tracking-empty">هنوز رویدادی برای این مرسوله ثبت نشده است.</p>}
    </section>
    <p className="tracking-disclaimer">این اطلاعات بر اساس رویدادهای ثبت‌شده در سامانه نمایش داده می‌شود؛ اتصال زنده به سامانه شرکت‌های حمل‌ونقل در این مرحله فعال نیست.</p>
   </>}
  </section>
 </main>;
}
