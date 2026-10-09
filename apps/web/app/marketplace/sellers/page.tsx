"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";

type Seller={id:string;legal_name:string;display_name:string;status:string;commission_rate:string|number};
const statusLabel:Record<string,string>={pending:"در انتظار بررسی",active:"فعال",suspended:"تعلیق‌شده",closed:"بسته"};

export default function SellersPage(){
 const [items,setItems]=useState<Seller[]>([]);
 const [legal,setLegal]=useState("");
 const [display,setDisplay]=useState("");
 const [rate,setRate]=useState("0");
 const [error,setError]=useState("");
 const [savingId,setSavingId]=useState("");
 async function load(){try{const r=await api<{items:Seller[]}>("/api/marketplace/sellers");setItems(r.items||[])}catch(e){setError(e instanceof Error?e.message:"خطا در دریافت فروشندگان")}}
 useEffect(()=>{void load()},[]);
 async function create(){setError("");try{await api("/api/marketplace/sellers",{method:"POST",body:JSON.stringify({legalName:legal,displayName:display,commissionRate:Number(rate)})});setLegal("");setDisplay("");await load()}catch(e){setError(e instanceof Error?e.message:"ثبت فروشنده ناموفق بود")}}
 async function changeStatus(item:Seller,status:"active"|"suspended"){
  setError("");setSavingId(item.id);
  try{await api("/api/marketplace/sellers/"+encodeURIComponent(item.id)+"/status",{method:"PATCH",body:JSON.stringify({status})});await load()}
  catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت فروشنده ناموفق بود")}
  finally{setSavingId("")}
 }
 return <main className="enterprise-main" dir="rtl">
  <header className="platform-header"><div><span className="section-kicker">مرکز فروشندگان</span><h1>فروشندگان</h1><p>مدیریت واقعی فروشندگان در محدوده سازمانی. فقط فروشنده فعال می‌تواند کالای خود را در کاتالوگ عمومی نمایش دهد.</p></div><a href="/platform">مرکز عملیات</a></header>
  <section className="platform-panel">
   <div className="platform-form"><input value={legal} onChange={e=>setLegal(e.target.value)} placeholder="نام حقوقی"/><input value={display} onChange={e=>setDisplay(e.target.value)} placeholder="نام نمایشی"/><input value={rate} onChange={e=>setRate(e.target.value)} type="number" min="0" max="100" placeholder="درصد کارمزد"/><button onClick={create} disabled={!legal.trim()||!display.trim()}>ثبت فروشنده</button></div>
   {error&&<p className="enterprise-loading error" role="alert">{error}</p>}
   <div className="platform-list">{items.map(item=><article className="platform-row" key={item.id}>
    <div><b>{item.display_name}</b><small>{item.legal_name}</small></div><span>کارمزد {Number(item.commission_rate).toLocaleString("fa-IR")}%</span><strong>{statusLabel[item.status]||item.status}</strong>
    <div className="record-actions">{item.status==="active"?<button onClick={()=>changeStatus(item,"suspended")} disabled={savingId===item.id}>تعلیق</button>:<button onClick={()=>changeStatus(item,"active")} disabled={savingId===item.id}>{savingId===item.id?"در حال ذخیره…":"فعال‌سازی فروشنده"}</button>}</div>
   </article>)}</div>
   {!items.length&&<div className="enterprise-loading">فروشنده‌ای ثبت نشده است.</div>}
  </section>
 </main>;
}
