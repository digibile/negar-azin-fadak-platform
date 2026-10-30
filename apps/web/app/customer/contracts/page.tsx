"use client";

import {useEffect,useState} from "react";
import {api} from "../../../lib/api";

type DocumentItem={id:string;document_no:string;title:string;stage:string;status:string;template_version:number;presented_at?:string|null;expires_at?:string|null;signed_at?:string|null};
export default function CustomerContracts(){
 const [items,setItems]=useState<DocumentItem[]>([]);
 const [accepted,setAccepted]=useState<Record<string,boolean>>({});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function load(){
  setLoading(true);setError("");
  try{const r=await api<{items:DocumentItem[]}>("/api/lendtech/my-contract-documents");setItems(r.items||[]);}
  catch(e){setError(e instanceof Error?e.message:"دریافت قراردادها انجام نشد");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 async function sign(id:string){
  if(!accepted[id])return setError("ابتدا متن قرارداد را بخوانید و پذیرش آن را تأیید کنید");
  setBusy(id);setError("");setMessage("");
  try{await api("/api/lendtech/contract-documents/"+id+"/sign",{method:"POST",body:JSON.stringify({acceptTerms:true})});setMessage("پذیرش الکترونیکی قرارداد ثبت شد.");setAccepted(x=>({...x,[id]:false}));await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت پذیرش قرارداد انجام نشد");}
  finally{setBusy("");}
 }
 async function reject(id:string){
  const note=window.prompt("علت رد قرارداد (اختیاری):")||"";
  setBusy(id);setError("");setMessage("");
  try{await api("/api/lendtech/contract-documents/"+id+"/reject",{method:"POST",body:JSON.stringify({note})});setMessage("رد قرارداد ثبت شد.");await load();}
  catch(e){setError(e instanceof Error?e.message:"رد قرارداد انجام نشد");}
  finally{setBusy("");}
 }
 return <main className="customer-dashboard" dir="rtl">
  <header className="customer-topbar"><div><span className="section-kicker">خدمات اعتباری</span><h1>قراردادهای من</h1><p>مشاهده سند، بررسی نسخه منتشرشده و ثبت پذیرش الکترونیکی.</p></div><div className="customer-actions"><a href="/customer">داشبورد مشتری</a><a href="/pay">اعتبار و پرداخت</a></div></header>
  {error&&<div className="error" role="alert">{error}</div>}{message&&<div className="dashboard-empty" role="status">{message}</div>}
  <section className="customer-grid" style={{gridTemplateColumns:"1fr"}}>
   {loading?<div className="customer-card">در حال دریافت قراردادها...</div>:items.map(d=><article className="customer-card" key={d.id} style={{display:"grid",gap:12}}>
    <div><b>{d.title}</b><span>{d.document_no} · نسخه {d.template_version} · مرحله {d.stage}</span><span>وضعیت: {d.status}</span>{d.expires_at&&<span>مهلت: {new Date(d.expires_at).toLocaleString("fa-IR")}</span>}</div>
    <div className="customer-actions"><a href={"/api/lendtech/contract-documents/"+d.id+"/html"} target="_blank" rel="noreferrer">مشاهده متن کامل قرارداد</a></div>
    {d.status==="presented"&&<><label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={!!accepted[d.id]} onChange={e=>setAccepted(x=>({...x,[d.id]:e.target.checked}))}/><span>متن کامل قرارداد را مطالعه کرده‌ام و مفاد آن را می‌پذیرم.</span></label><div className="customer-actions"><button disabled={busy===d.id||!accepted[d.id]} onClick={()=>sign(d.id)}>پذیرش و امضای الکترونیکی</button><button disabled={busy===d.id} onClick={()=>reject(d.id)}>رد قرارداد</button></div></>}
    {d.status==="signed"&&<span>زمان پذیرش: {d.signed_at?new Date(d.signed_at).toLocaleString("fa-IR"):"ثبت شده"}</span>}
   </article>)}
   {!loading&&!items.length&&<div className="customer-card"><b>قراردادی برای نمایش وجود ندارد.</b><span>پس از تولید و ارائه قرارداد از مرکز تسهیلات، سند در این بخش نمایش داده می‌شود.</span></div>}
  </section>
 </main>;
}
