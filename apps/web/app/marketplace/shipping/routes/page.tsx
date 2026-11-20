"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {api} from "../../../../lib/api";
import "../shipping-workspace.css";
import "./routes-workspace.css";

type Route={id:string;code:string;name:string;origin:string;destination:string;distance_km?:number;status:string};

export default function ShippingRoutesPage(){
 const [items,setItems]=useState<Route[]>([]);
 const [form,setForm]=useState({code:"",name:"",origin:"",destination:"",distanceKm:""});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{const r=await api<Route[]>("/api/logistics/routes");setItems(r||[]);}
  catch(e){setError(e instanceof Error?e.message:"دریافت مسیرها ناموفق بود.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   await api("/api/logistics/routes",{method:"POST",body:JSON.stringify({...form,distanceKm:Number(form.distanceKm||0)})});
   setForm({code:"",name:"",origin:"",destination:"",distanceKm:""});setNotice("مسیر حمل ثبت شد.");await load();
  }catch(e){setError(e instanceof Error?e.message:"ثبت مسیر ناموفق بود.");}
  finally{setBusy(false);}
 }
 return <main className="enterprise-main shipping-workspace route-workspace" dir="rtl">
  <header className="platform-header shipping-header">
   <div><span className="section-kicker">تجارت · زنجیره تأمین و لجستیک</span><h1>مدیریت مسیرهای حمل</h1><p>تعریف مسیرهای مبدأ و مقصد برای تخصیص به مرسوله‌های فروشگاه</p></div>
   <div className="resource-header-actions"><Link href="/marketplace/shipping">بازگشت به ارسال‌ها</Link><Link href="/marketplace/shipping/resources">ناوگان و رانندگان</Link></div>
  </header>
  {error&&<p className="shipping-message error" role="alert">{error}</p>}
  {notice&&<p className="shipping-message success" role="status">{notice}</p>}
  <section className="platform-panel route-form-panel">
   <form className="route-form" onSubmit={submit}>
    <h2>ثبت مسیر جدید</h2>
    <label>کد مسیر<input required value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} placeholder="مثلاً THR-MHD"/></label>
    <label>عنوان مسیر<input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="تهران به مشهد"/></label>
    <label>مبدأ<input required value={form.origin} onChange={e=>setForm(p=>({...p,origin:e.target.value}))} placeholder="شهر یا نشانی مبدأ"/></label>
    <label>مقصد<input required value={form.destination} onChange={e=>setForm(p=>({...p,destination:e.target.value}))} placeholder="شهر یا نشانی مقصد"/></label>
    <label>مسافت تقریبی (کیلومتر)<input type="number" min="0" step="0.1" value={form.distanceKm} onChange={e=>setForm(p=>({...p,distanceKm:e.target.value}))} placeholder="اختیاری"/></label>
    <button type="submit" disabled={busy}>{busy?"در حال ثبت…":"ثبت مسیر"}</button>
   </form>
  </section>
  <section className="platform-panel route-list-panel">
   <div className="resource-list-heading"><h2>مسیرهای تعریف‌شده</h2><b>{items.length.toLocaleString("fa-IR")} مسیر</b></div>
   {loading?<p className="empty">در حال دریافت مسیرها…</p>:items.map(r=><article className="route-item" key={r.id}>
    <div><b>{r.name}</b><small>{r.code} · {r.origin} ← {r.destination}</small></div>
    <span>{Number(r.distance_km||0).toLocaleString("fa-IR")} کیلومتر</span>
    <span className={"resource-status "+r.status}>{r.status==="active"?"فعال":r.status}</span>
   </article>)}
   {!loading&&!items.length&&<p className="empty">هنوز مسیری ثبت نشده است.</p>}
  </section>
  <p className="shipping-footnote">مسافت در این مرحله اطلاعات مرجع مسیر است و به‌تنهایی هزینه حمل یا زمان تحویل را محاسبه نمی‌کند. محاسبه تعرفه پس از تعریف قراردادهای حمل و قواعد مالی انجام می‌شود.</p>
 </main>;
}
