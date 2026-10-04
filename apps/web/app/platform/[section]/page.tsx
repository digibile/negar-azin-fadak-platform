"use client";
import {useEffect,useMemo,useState} from "react";
import {api} from "../../../lib/api";

const labels:any={rules:["موتور قواعد","/api/platform/rules"],calendars:["تقویم عملیاتی","/api/platform/calendars"],sla:["مدیریت SLA","/api/platform/sla/cases"],notifications:["مرکز اعلان‌ها","/api/platform/notifications"],audit:["کاوش رویدادها","/api/platform/audit"]};
export default function EnginePage({params}:{params:Promise<{section:string}>}){
 const [section,setSection]=useState(""),[items,setItems]=useState<any[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{params.then(p=>setSection(p.section))},[params]);
 const meta=labels[section]||["بخش عملیاتی","/api/platform/modules"];
 useEffect(()=>{if(!section)return;setError("");api<any>(meta[1]).then(x=>setItems(Array.isArray(x)?x:(x.items||[]))).catch(e=>setError(e.message||"خطا در دریافت اطلاعات"))},[section,meta]);
 const summary=useMemo(()=>items.reduce((a,x)=>{const k=x.status||x.lifecycle||"active";a[k]=(a[k]||0)+1;return a},{} as Record<string,number>),[items]);
 async function markRead(id:string){setBusy(true);try{await api(meta[1]+"/"+id+"/read",{method:"POST"});setItems(v=>v.map(x=>x.id===id?{...x,status:"read"}:x))}catch(e){setError(e instanceof Error?e.message:"خطا")}finally{setBusy(false)}}
 return <main className="enterprise-main" dir="rtl">
  <header className="platform-header"><div><span className="section-kicker">مرکز مدیریت نگار آذین فدک</span><h1>{meta[0]}</h1><p>اطلاعات واقعی متصل به سرویس و پایگاه داده مرکزی</p></div><a href="/platform">مرکز عملیات</a></header>
  <section className="platform-panel"><div className="panel-title"><div><h2>{items.length} مورد</h2><span>{Object.entries(summary).map(([k,v])=>k+" "+v).join(" · ")||"بدون داده"}</span></div></div>
  {error&&<div className="error">{error}</div>}
  {items.map((x:any)=><article className="platform-row" key={x.id}><div><b>{x.name||x.title||x.code||x.action||x.subject_type||"رویداد"}</b><small>{x.event_key||x.channel||x.status||x.entity_type||x.created_at||""}</small></div><span>{x.priority??x.due_at??x.policy_name??""}</span>{section==="notifications"&&x.status!=="read"&&<button disabled={busy} onClick={()=>markRead(x.id)}>خوانده شد</button>}</article>)}
  {!items.length&&!error&&<div className="empty">داده‌ای ثبت نشده است.</div>}</section>
 </main>;
}
