"use client";

import {useCallback,useEffect,useState} from "react";
import {api} from "../../../lib/api";
import "./shipping-workspace.css";

type ShippingAddress={recipientName?:string;recipientPhone?:string;province?:string;city?:string;addressLine?:string;postalCode?:string;unit?:string};
type Order={id:string;order_no:string;status:string;shipping_address?:ShippingAddress|null;customer_ref?:string|null;latest_shipment_id?:string|null;shipment_no?:string|null;tracking_code?:string|null;shipment_status?:string|null};
type Vehicle={id:string;title:string;plate_no:string;status:string};
type Driver={id:string;name:string;mobile?:string|null;status:string};
type Route={id:string;name:string;origin:string;destination:string;distance_km?:number;status:string};
type Shipment={id:string;shipment_no:string;marketplace_order_id?:string|null;order_no?:string|null;status:string;tracking_code?:string|null;origin:string;destination:string;vehicle_id?:string;driver_id?:string;driver_name?:string;plate_no?:string;created_at:string};
const statusLabel:Record<string,string>={planned:"برنامه‌ریزی‌شده",assigned:"اختصاص‌یافته",picked_up:"تحویل راننده",in_transit:"در مسیر",delivered:"تحویل‌شده",failed:"ناموفق",cancelled:"لغوشده"};
const transitions:Record<string,string[]>={planned:["assigned","cancelled"],assigned:["picked_up","cancelled"],picked_up:["in_transit","failed"],in_transit:["delivered","failed"],failed:["assigned","cancelled"]};
const actionLabel:Record<string,string>={assigned:"تخصیص ناوگان",picked_up:"ثبت دریافت از انبار",in_transit:"شروع حرکت",delivered:"ثبت تحویل",failed:"ثبت عدم تحویل",cancelled:"لغو مرسوله"};

export default function MarketplaceShippingPage(){
 const [orders,setOrders]=useState<Order[]>([]);
 const [shipments,setShipments]=useState<Shipment[]>([]);
 const [vehicles,setVehicles]=useState<Vehicle[]>([]);
 const [drivers,setDrivers]=useState<Driver[]>([]);
 const [routes,setRoutes]=useState<Route[]>([]);
 const [vehicleByOrder,setVehicleByOrder]=useState<Record<string,string>>({});
 const [driverByOrder,setDriverByOrder]=useState<Record<string,string>>({});
 const [routeByOrder,setRouteByOrder]=useState<Record<string,string>>({});
 const [trackingByOrder,setTrackingByOrder]=useState<Record<string,string>>({});
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState("");
 const [loading,setLoading]=useState(true);

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [o,s,v,d,r]=await Promise.all([
    api<{items:Order[]}>("/api/marketplace/orders"),
    api<Shipment[]>("/api/logistics/shipments"),
    api<Vehicle[]>("/api/logistics/vehicles"),
    api<Driver[]>("/api/logistics/drivers"),
    api<Route[]>("/api/logistics/routes")
   ]);
   setOrders(o.items||[]);
   setShipments((s||[]).filter(x=>x.marketplace_order_id));
   setVehicles(v||[]);
   setDrivers(d||[]);
   setRoutes((r||[]).filter(x=>x.status==="active"));
  }catch(e){setError(e instanceof Error?e.message:"دریافت اطلاعات ارسال ناموفق بود.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);

 async function createShipment(order:Order){
  const vehicleId=vehicleByOrder[order.id],driverId=driverByOrder[order.id];
  if(!vehicleId||!driverId){setError("برای ثبت ارسال، ناوگان و راننده را انتخاب کنید.");return;}
  setBusy(order.id);setError("");setNotice("");
  try{
   await api("/api/logistics/marketplace-orders/"+encodeURIComponent(order.id)+"/shipments",{method:"POST",body:JSON.stringify({vehicleId,driverId,routeId:routeByOrder[order.id]||null,trackingCode:trackingByOrder[order.id]||null,shipmentNo:"SHP-"+order.order_no})});
   setNotice("مرسوله سفارش "+order.order_no+" ثبت شد.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"ثبت مرسوله ناموفق بود.");}
  finally{setBusy("");}
 }

 async function moveShipment(s:Shipment,next:string){
  let payload:any={status:next};
  if(next==="delivered"){
   const location=window.prompt("محل تحویل را وارد کنید:");
   if(location===null)return;
   if(!location.trim()){setError("محل تحویل الزامی است.");return;}
   payload.location=location.trim();
  }
  if(next==="failed"){
   const reason=window.prompt("علت عدم تحویل را وارد کنید:");
   if(reason===null)return;
   if(!reason.trim()){setError("علت عدم تحویل الزامی است.");return;}
   payload.reason=reason.trim();
  }
  setBusy(s.id);setError("");setNotice("");
  try{
   await api("/api/logistics/shipments/"+encodeURIComponent(s.id)+"/status",{method:"PATCH",body:JSON.stringify(payload)});
   setNotice("وضعیت مرسوله "+s.shipment_no+" ثبت شد.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت مرسوله ناموفق بود.");}
  finally{setBusy("");}
 }

 const availableVehicles=vehicles.filter(v=>v.status==="available");
 const activeDrivers=drivers.filter(d=>d.status==="active");
 return <main className="enterprise-main shipping-workspace" dir="rtl">
  <header className="platform-header shipping-header">
   <div><span className="section-kicker">تجارت · زنجیره تأمین و لجستیک</span><h1>ارسال و رهگیری سفارش‌ها</h1><p>اتصال مستقیم سفارش فروشگاه به ناوگان، راننده و رویدادهای تحویل</p></div>
   <div className="shipping-header-actions"><a href="/marketplace/shipping/resources">مدیریت ناوگان و رانندگان</a><a href="/marketplace/shipping/delivery-methods">روش‌ها و تعرفه‌های ارسال</a><a href="/marketplace/shipping/routes">مدیریت مسیرها</a><button type="button" onClick={()=>void load()} disabled={loading}>بازخوانی اطلاعات</button></div>
  </header>
  {error&&<p className="shipping-message error" role="alert">{error}</p>}
  {notice&&<p className="shipping-message success" role="status">{notice}</p>}
  <section className="shipping-stats">
   <article><span>سفارش‌های آماده ارسال</span><b>{orders.filter(o=>o.status==="processing"&&!o.latest_shipment_id).length.toLocaleString("fa-IR")}</b></article>
   <article><span>مرسوله‌های فعال</span><b>{shipments.filter(s=>["planned","assigned","picked_up","in_transit"].includes(s.status)).length.toLocaleString("fa-IR")}</b></article>
   <article><span>تحویل‌شده</span><b>{shipments.filter(s=>s.status==="delivered").length.toLocaleString("fa-IR")}</b></article>
   <article><span>ناوگان آماده</span><b>{availableVehicles.length.toLocaleString("fa-IR")}</b></article>
  </section>
  <section className="platform-panel shipping-panel">
   <div className="shipping-section-title"><div><h2>سفارش‌های آماده ارسال</h2><p>فقط سفارش‌های در حال آماده‌سازی امکان ایجاد مرسوله دارند.</p></div></div>
   {loading?<p className="empty">در حال دریافت اطلاعات…</p>:orders.filter(o=>o.status==="processing").map(order=><article className="shipping-order" key={order.id}>
    <div className="shipping-order-info"><b>{order.order_no}</b><span>مشتری: {order.shipping_address?.recipientName||order.customer_ref||"ثبت نشده"}</span><small>{order.shipping_address?[order.shipping_address.province,order.shipping_address.city,order.shipping_address.addressLine,order.shipping_address.postalCode].filter(Boolean).join("، "):"نشانی تحویل ثبت نشده"}</small></div>
    {order.latest_shipment_id?<div className="shipping-existing"><span className="shipping-pill">{statusLabel[order.shipment_status||""]||order.shipment_status}</span><b>{order.shipment_no}</b><small>کد رهگیری: {order.tracking_code||"ثبت نشده"}</small></div>:<div className="shipping-create">
     <label>ناوگان<select value={vehicleByOrder[order.id]||""} onChange={e=>setVehicleByOrder(p=>({...p,[order.id]:e.target.value}))}><option value="">انتخاب خودرو</option>{availableVehicles.map(v=><option key={v.id} value={v.id}>{v.title} · {v.plate_no}</option>)}</select></label>
     <label>راننده<select value={driverByOrder[order.id]||""} onChange={e=>setDriverByOrder(p=>({...p,[order.id]:e.target.value}))}><option value="">انتخاب راننده</option>{activeDrivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
     <label>مسیر حمل<select value={routeByOrder[order.id]||""} onChange={e=>setRouteByOrder(p=>({...p,[order.id]:e.target.value}))}><option value="">بدون مسیر مشخص</option>{routes.map(r=><option key={r.id} value={r.id}>{r.name} · {r.origin} ← {r.destination}</option>)}</select></label>
     <label>کد رهگیری<input value={trackingByOrder[order.id]||""} onChange={e=>setTrackingByOrder(p=>({...p,[order.id]:e.target.value}))} placeholder="اختیاری"/></label>
     <button type="button" disabled={busy===order.id||!order.shipping_address?.addressLine||!order.shipping_address?.postalCode} onClick={()=>void createShipment(order)}>{busy===order.id?"در حال ثبت…":"ایجاد مرسوله"}</button>
    </div>}
   </article>)}
   {!loading&&!orders.some(o=>o.status==="processing")&&<p className="empty">سفارش آماده ارسال وجود ندارد.</p>}
  </section>
  <section className="platform-panel shipping-panel">
   <div className="shipping-section-title"><div><h2>مرسوله‌های فروشگاه</h2><p>هر تغییر وضعیت همراه با ثبت رویداد و زمان انجام می‌شود.</p></div><span>{shipments.length.toLocaleString("fa-IR")} مرسوله</span></div>
   {loading?<p className="empty">در حال دریافت مرسوله‌ها…</p>:shipments.map(s=><article className="shipping-shipment" key={s.id}>
    <div className="shipping-shipment-main"><b>{s.shipment_no}</b><span>سفارش: {s.order_no||"—"}</span><small>{s.origin} ← {s.destination}</small><small>رهگیری: {s.tracking_code||"ثبت نشده"} · {s.plate_no||"ناوگان"} · {s.driver_name||"راننده"}</small></div>
    <div className="shipping-shipment-state"><span className={"shipping-pill state-"+s.status}>{statusLabel[s.status]||s.status}</span><div className="shipping-actions">{(transitions[s.status]||[]).filter(next=>!(s.marketplace_order_id&&next==="cancelled")).map(next=><button type="button" key={next} disabled={busy===s.id} onClick={()=>void moveShipment(s,next)}>{actionLabel[next]}</button>)}</div></div>
   </article>)}
   {!loading&&!shipments.length&&<p className="empty">هنوز مرسوله‌ای برای سفارش‌های فروشگاه ثبت نشده است.</p>}
  </section>
  <p className="shipping-footnote">این صفحه رهگیری داخلی بر پایه رویدادهای ثبت‌شده را ارائه می‌کند. اتصال زنده به شرکت‌های پستی تا زمان دریافت قرارداد و کلید رسمی هر شرکت فعال نیست.</p>
 </main>;
}
