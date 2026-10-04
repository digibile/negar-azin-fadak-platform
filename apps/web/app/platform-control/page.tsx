"use client";

import {useEffect,useMemo,useState} from "react";

type Module={id:number;code:string;title:string;core:string;lifecycle:string;record_count:number;route:string|null;api_prefix:string|null};
const api=(process.env.NEXT_PUBLIC_API_BASE_URL||"").replace(/\/$/,"");

export default function PlatformControlPage(){
 const [modules,setModules]=useState<Module[]>([]);
 const [query,setQuery]=useState("");
 const [core,setCore]=useState("همه");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{fetch(api+"/api/platform/modules",{credentials:"include"}).then(async r=>{const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||"دریافت رجیستری ماژول‌ها ناموفق بود");setModules(b.items||[])}).catch(e=>setError(e instanceof Error?e.message:"خطای ارتباط")).finally(()=>setLoading(false))},[]);
 const cores=useMemo(()=>["همه",...Array.from(new Set(modules.map(m=>m.core)))],[modules]);
 const filtered=useMemo(()=>modules.filter(m=>(core==="همه"||m.core===core)&&(m.title+" "+m.code).toLowerCase().includes(query.toLowerCase())),[modules,core,query]);
 const totalRecords=modules.reduce((n,m)=>n+m.record_count,0);
 return <main dir="rtl" className="command-page"><header className="command-hero"><div><span className="eyebrow">مرکز مدیریت نگار آذین فدک</span><h1>کنترل و عملیات پلتفرم</h1><p>رجیستری زنده ۴۵ ماژول با وضعیت اجرا و تعداد رکوردهای واقعی.</p></div><a className="command-link" href="/command-center/">مرکز فرماندهی</a></header>
  {error&&<div className="command-error">{error}</div>}
  <section className="control-summary"><div><b>{modules.length}</b><span>ماژول قابل مشاهده</span></div><div><b>{totalRecords}</b><span>رکورد عملیاتی</span></div><div><b>{modules.filter(m=>m.lifecycle==="active").length}</b><span>ماژول فعال</span></div></section>
  <section className="module-toolbar"><input placeholder="جستجو در ماژول‌ها..." value={query} onChange={e=>setQuery(e.target.value)}/><div className="tabs">{cores.map(c=><button key={c} className={core===c?"primary":""} onClick={()=>setCore(c)}>{c}</button>)}</div></section>
  {loading?<div className="command-loading">در حال دریافت رجیستری واقعی...</div>:<section className="control-grid">{filtered.map(m=><a className="control-card" href={"/modules/?code="+encodeURIComponent(m.code)} key={m.id}><div><span>{String(m.id).padStart(2,"0")} · {m.code}</span><h2>{m.title}</h2><small>{m.core} · {m.lifecycle}</small></div><strong>{m.record_count}</strong><small>رکورد عملیاتی</small></a>)}</section>}
 </main>;
}
