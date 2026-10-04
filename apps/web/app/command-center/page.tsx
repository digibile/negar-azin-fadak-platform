"use client";

import {useEffect,useState} from "react";

type Item={id:number;event_type?:string;severity?:string;message?:string;occurred_at?:string;command_no?:string;action_type?:string};
const api=process.env.NEXT_PUBLIC_API_BASE_URL||"";

export default function CommandCenterPage(){
  const [monitoring,setMonitoring]=useState<Item[]>([]);
  const [commands,setCommands]=useState<Item[]>([]);
  const [audit,setAudit]=useState<Item[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let live=true;
    Promise.all([
      fetch(api+"/api/domain/monitoring-events",{credentials:"include"}).then(r=>r.ok?r.json():Promise.reject(new Error("خطا در دریافت رویدادهای پایش"))),
      fetch(api+"/api/domain/command-center",{credentials:"include"}).then(r=>r.ok?r.json():Promise.reject(new Error("خطا در دریافت فرمان‌ها"))),
      fetch(api+"/api/domain/audit-control",{credentials:"include"}).then(r=>r.ok?r.json():Promise.reject(new Error("خطا در دریافت حسابرسی")))
    ]).then(([m,c,a])=>{if(!live)return;setMonitoring(m.items||[]);setCommands(c.items||[]);setAudit(a.items||[]);})
      .catch(e=>live&&setError(e instanceof Error?e.message:"خطای ارتباط با سامانه"))
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[]);

  return <main dir="rtl" className="command-page">
    <header className="command-hero">
      <div>
        <span className="eyebrow">مرکز مدیریت نگار آذین فدک</span>
        <h1>مرکز فرماندهی</h1>
        <p>نمای زنده فرمان‌ها، پایش رویدادها و تاریخچه حسابرسی متصل به API عملیاتی.</p>
      </div>
      <a href="/modules/" className="command-link">فهرست ماژول‌ها</a>
    </header>
    {error&&<div className="command-error">{error}</div>}
    {loading?<div className="command-loading">در حال دریافت داده‌های واقعی...</div>:
    <section className="command-grid">
      <Panel title="پایش رویدادها" count={monitoring.length}>
        {monitoring.slice(0,8).map(x=><article className="command-row" key={x.id}><strong>{x.event_type}</strong><span>{x.message}</span><small>{x.severity}</small></article>)}
        {!monitoring.length&&<Empty/>}
      </Panel>
      <Panel title="فرمان‌های ثبت‌شده" count={commands.length}>
        {commands.slice(0,8).map(x=><article className="command-row" key={x.id}><strong>{x.command_no}</strong><span>{x.action_type}</span><small>ثبت‌شده</small></article>)}
        {!commands.length&&<Empty/>}
      </Panel>
      <Panel title="حسابرسی" count={audit.length}>
        {audit.slice(0,8).map(x=><article className="command-row" key={x.id}><strong>{x.event_type}</strong><span>{x.entity_type||"رویداد سیستم"}</span><small>{x.actor_ref||"سیستم"}</small></article>)}
        {!audit.length&&<Empty/>}
      </Panel>
    </section>}
  </main>;
}

function Panel({title,count,children}:{title:string;count:number;children:React.ReactNode}){
  return <section className="command-panel"><div className="command-panel-head"><h2>{title}</h2><b>{count}</b></div>{children}</section>;
}
function Empty(){return <div className="command-empty">داده‌ای ثبت نشده است.</div>}
