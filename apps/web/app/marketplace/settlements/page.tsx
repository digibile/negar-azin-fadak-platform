"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
import {ManagementDialog,ManagementToolbar} from "../../components/ManagementWorkspaceTools";

type Settlement={id:string;settlement_no:string;seller_name:string;gross_amount:string|number;commission_amount:string|number;net_amount:string|number;status:string;period_start:string;period_end:string;order_count:number;[key:string]:unknown};
const statusLabel:Record<string,string>={pending:"در انتظار تأیید",approved:"تأییدشده و آماده پرداخت",paid:"پرداخت‌شده"};

export default function SettlementsPage(){
 const [items,setItems]=useState<Settlement[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState("");
 const [selected,setSelected]=useState<Settlement|null>(null);
 const [periodStart,setPeriodStart]=useState(()=>{const d=new Date();d.setDate(d.getDate()-30);return d.toISOString().slice(0,10)});
 const [periodEnd,setPeriodEnd]=useState(()=>new Date().toISOString().slice(0,10));

 async function load(){
  setError("");
  try{const result=await api<Settlement[]|{items:Settlement[]}>("/api/marketplace/settlements");setItems(Array.isArray(result)?result:result.items||[]);}
  catch(e){setError(e instanceof Error?e.message:"دریافت تسویه‌ها ناموفق بود.");}
 }
 useEffect(()=>{void load()},[]);

 async function generate(){
  setBusy("generate");setError("");
  try{await api("/api/marketplace/settlements/generate",{method:"POST",body:JSON.stringify({periodStart,periodEnd})});await load();}
  catch(e){setError(e instanceof Error?e.message:"تولید تسویه ناموفق بود.");}
  finally{setBusy("");}
 }
 async function approve(item:Settlement){
  setBusy(item.id);setError("");
  try{await api("/api/marketplace/settlements/"+encodeURIComponent(item.id)+"/approve",{method:"PATCH",body:"{}"});await load();}
  catch(e){setError(e instanceof Error?e.message:"تأیید تسویه ناموفق بود.");}
  finally{setBusy("");}
 }
 async function pay(item:Settlement){
  const paymentRef=window.prompt("شناسه یا مرجع پرداخت ثبت‌شده را وارد کنید:")||"";
  if(!paymentRef.trim())return;
  setBusy(item.id);setError("");
  try{await api("/api/marketplace/settlements/"+encodeURIComponent(item.id)+"/pay",{method:"POST",body:JSON.stringify({paymentRef})});await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت پرداخت تسویه ناموفق بود.");}
  finally{setBusy("");}
 }
 const money=(v:unknown)=>Number(v||0).toLocaleString("fa-IR")+" ریال";
 return <main className="enterprise-main" dir="rtl">
  <header className="platform-header"><div><span className="section-kicker">تسویه</span><h1>تسویه فروشندگان</h1><p>تولید دوره‌ای، تأیید، ثبت پرداخت و اتصال به دفترکل مالی</p></div><a href="/platform">مرکز عملیات</a></header>
  {error&&<p className="enterprise-loading error" role="alert">{error}</p>}
  <ManagementToolbar rows={items as unknown as Record<string,unknown>[]} filename="marketplace-settlements" onCreate={()=>document.getElementById("settlement-generate")?.scrollIntoView({behavior:"smooth",block:"center"})}/>
  <section id="settlement-generate" className="platform-panel">
   <h2>تولید تسویه از سفارش‌های پرداخت‌شده</h2>
   <p>سامانه فقط سفارش‌های پرداخت‌شده و تسویه‌نشده در بازه انتخابی را پردازش می‌کند. ثبت سند مالی هنگام پرداخت نهایی در سرویس دفترکل انجام می‌شود.</p>
   <div className="platform-form"><label>از تاریخ<input type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)}/></label><label>تا تاریخ<input type="date" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)}/></label><button type="button" disabled={busy!==""||!periodStart||!periodEnd||periodEnd<=periodStart} onClick={()=>void generate()}>{busy==="generate"?"در حال تولید…":"تولید تسویه"}</button></div>
  </section>
  <section className="platform-panel">
   <div className="panel-title"><div><h2>فهرست تسویه‌ها</h2><span>{items.length.toLocaleString("fa-IR")} رکورد</span></div><button type="button" onClick={()=>void load()}>بازخوانی</button></div>
   {items.map(x=><article className="platform-row" key={x.id}>
    <div><b>{x.settlement_no}</b><small>{x.seller_name||"فروشنده"} · {Number(x.order_count||0).toLocaleString("fa-IR")} سفارش</small></div>
    <span>ناخالص: {money(x.gross_amount)}</span><span>کارمزد: {money(x.commission_amount)}</span><strong>خالص: {money(x.net_amount)}</strong>
    <span>{statusLabel[x.status]||x.status}</span>
    <div className="record-actions"><button type="button" onClick={()=>setSelected(x)}>مشاهده</button>{x.status==="pending"&&<button type="button" disabled={busy===x.id} onClick={()=>void approve(x)}>تأیید</button>}{x.status==="approved"&&<button type="button" disabled={busy===x.id} onClick={()=>void pay(x)}>ثبت پرداخت</button>}</div>
   </article>)}
   {!items.length&&<p className="empty">تسویه‌ای ثبت نشده است.</p>}
  </section>
  {selected&&<ManagementDialog title={"جزئیات تسویه "+selected.settlement_no} onClose={()=>setSelected(null)}><dl className="management-detail-grid">{Object.entries(selected).filter(([key])=>key!=="id").map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value===null||value===undefined?"—":String(value)}</dd></div>)}</dl></ManagementDialog>}
 </main>;
}
