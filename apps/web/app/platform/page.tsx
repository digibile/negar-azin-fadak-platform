"use client";
import {useEffect,useState} from "react";
import {api} from "../../lib/api";
type Ctx={current:{id:string;name:string;code:string};companies:any[];brands:any[];branches:any[];stores:any[]};
export default function PlatformPage(){
 const [data,setData]=useState<Ctx|null>(null),[tab,setTab]=useState("context"),[rows,setRows]=useState<any[]>([]),[q,setQ]=useState(""),[error,setError]=useState("");
 async function load(t:string){setError("");try{const path=t==="search"?"/api/platform/search?q="+encodeURIComponent(q):t==="inventory"?"/api/marketplace/inventory":t==="ledger"?"/api/finance/ledger":t==="audit"?"/api/platform/audit":t==="notifications"?"/api/platform/notifications":t==="rules"?"/api/platform/rules":t==="sla"?"/api/platform/slas":"/api/platform/calendar";const r:any=await api(path);setRows(r.items||[])}catch(e){setError(e instanceof Error?e.message:"خطا")}}
 useEffect(()=>{api<Ctx>("/api/platform/context").then(setData).catch(e=>setError(e.message||"خطا"))},[]);
 useEffect(()=>{if(tab!=="context")load(tab)},[tab]);
 if(error&&!data)return <main className="enterprise-loading error">{error}</main>;
 return <main className="enterprise-main" dir="rtl"><header className="platform-header"><div><span className="section-kicker">هسته مرکزی کسب‌وکار</span><h1>مرکز عملیات پلتفرم</h1><p>{data?.current.name||"در حال بارگذاری..."}</p></div><a href="/marketplace">بازارگاه</a></header>
 <nav className="platform-tabs">{[["context","ساختار سازمانی"],["inventory","موجودی"],["ledger","دفتر مالی"],["audit","ممیزی"],["notifications","اعلان‌ها"],["rules","قواعد"],["sla","SLA"],["calendar","تقویم"]].map(x=><button className={tab===x[0]?"active":""} onClick={()=>setTab(x[0])} key={x[0]}>{x[1]}</button>)}</nav>
 {error&&<div className="enterprise-loading error">{error}</div>}
 {tab==="context"&&data?<section className="platform-grid">{[["شرکت‌ها",data.companies],["برندها",data.brands],["شعب",data.branches],["فروشگاه‌های فعال",data.stores]].map(([title,list]:any)=><article className="platform-panel" key={title}><h2>{title}</h2>{list.map((x:any)=><div className="platform-row" key={x.id}><b>{x.name}</b><small>{x.code||x.slug}</small></div>)}{!list.length&&<p className="empty">رکوردی ثبت نشده است.</p>}</article>)}</section>:
 <section className="platform-panel"><div className="platform-toolbar">{tab==="search"&&<input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجوی سراسری"/>}<button onClick={()=>load(tab)}>بروزرسانی</button></div><div className="platform-table">{rows.map((x:any)=><pre key={x.id}>{JSON.stringify(x,null,2)}</pre>)}{!rows.length&&<p className="empty">داده‌ای در این محدوده وجود ندارد.</p>}</div></section>}
 </main>;
}