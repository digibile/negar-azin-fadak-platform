"use client";

import {useEffect,useMemo,useState} from "react";

type Module={id:number;code:string;title:string;core:string;lifecycle:string;record_count:number};
const target=["commission","settlement","payments","providers-integrations","communications","events-notifications","crm","contact-center","tickets-support"];
const api=(process.env.NEXT_PUBLIC_API_BASE_URL||"").replace(/\/$/,"");
export default function OperationsPage(){
 const [items,setItems]=useState<Module[]>([]); const [q,setQ]=useState(""); const [error,setError]=useState("");
 useEffect(()=>{fetch(api+"/api/platform/modules",{credentials:"include"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b?.error||"دریافت مرکز عملیات ناموفق بود");setItems((b.items||[]).filter((m:Module)=>target.includes(m.code)))}).catch(e=>setError(e instanceof Error?e.message:"خطای ارتباط"))},[]);
 const shown=useMemo(()=>items.filter(m=>(m.title+" "+m.code).toLowerCase().includes(q.toLowerCase())),[items,q]);
 return <main dir="rtl" className="command-page"><header className="command-hero"><div><span className="eyebrow">هسته‌های تجارت و ارتباطات</span><h1>مرکز عملیات ۱۹ تا ۲۷</h1><p>فضای عملیاتی برای کمیسیون، تسویه، پرداخت، ارائه‌دهندگان، ارتباطات، اعلان، CRM، مرکز تماس و پشتیبانی.</p></div><a className="command-link" href="/">منوی مرکزی</a></header>{error&&<div className="command-error">{error}</div>}<section className="module-toolbar"><input placeholder="جستجو در عملیات..." value={q} onChange={e=>setQ(e.target.value)}/></section><section className="control-grid">{shown.map(m=><a className="control-card" key={m.id} href={"/modules/?code="+encodeURIComponent(m.code)}><div><span>ماژول {String(m.id).padStart(2,"0")} · {m.code}</span><h2>{m.title}</h2><small>{m.core} · {m.lifecycle}</small></div><strong>{m.record_count}</strong><small>رکورد واقعی PostgreSQL</small></a>)}</section></main>;
}
