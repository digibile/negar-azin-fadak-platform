"use client";
import {useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";
import styles from "./CentralSettingsWorkspace.module.css";
type Setting={id:string;setting_key:string;category:string;title:string;value:any;is_sensitive:boolean;is_editable:boolean;updated_at:string};
const base=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";
const labels:any={general:"عمومی",localization:"تقویم و منطقه",numbering:"شماره‌گذاری",notifications:"اعلان‌ها",security:"امنیت",files:"فایل‌ها",workflow:"گردش‌کار",maintenance:"نگهداری"};
export default function CentralSettingsWorkspace(){
 const searchParams=useSearchParams();
 const [items,setItems]=useState<Setting[]>([]),[audit,setAudit]=useState<any[]>([]),[tab,setTab]=useState("general"),[error,setError]=useState(""),[saving,setSaving]=useState<string|null>(null);
 const load=async()=>{try{setError("");const [a,b]=await Promise.all([fetch(base+"/api/settings/central",{credentials:"include"}),fetch(base+"/api/settings/central/audit",{credentials:"include"})]);const x=await a.json();const y=await b.json();if(!a.ok)throw new Error(x?.error||"خطا");setItems(x.items||[]);setAudit(Array.isArray(y)?y:[])}catch(e){setError(e instanceof Error?e.message:"خطا در دریافت تنظیمات")}};
 useEffect(()=>{const t=searchParams.get("tab");if(t)setTab(t);load()},[searchParams]);
 useEffect(()=>{if(tab!=="audit")history.replaceState(null,"","/modules/?code=central-settings&tab="+encodeURIComponent(tab))},[tab]);
 const cats=useMemo(()=>[...new Set(items.map(x=>x.category))], [items]);
 useEffect(()=>{if(cats.length&&!cats.includes(tab))setTab(cats[0])},[cats,tab]);
 const setValue=(id:string,value:any)=>setItems(v=>v.map(x=>x.id===id?{...x,value}:x));
 const save=async(s:Setting)=>{setSaving(s.id);setError("");try{const r=await fetch(base+"/api/settings/central/"+encodeURIComponent(s.setting_key),{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},body:JSON.stringify({value:s.value})});const b=await r.json();if(!r.ok)throw new Error(b?.error||"ذخیره انجام نشد");await load()}catch(e){setError(e instanceof Error?e.message:"خطا در ذخیره")}finally{setSaving(null)}};
 const input=(s:Setting)=>{if(typeof s.value==="boolean")return <label className={styles.toggle}><input type="checkbox" checked={s.value} onChange={e=>setValue(s.id,e.target.checked)}/><span>{s.value?"فعال":"غیرفعال"}</span></label>;if(Array.isArray(s.value))return <input value={s.value.join(", ")} onChange={e=>setValue(s.id,e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}/>;return <input value={String(s.value??"")} onChange={e=>setValue(s.id,e.target.value)}/>};
 return <main className={styles.wrap}><header className={styles.head}><div><span className={styles.muted}>منوی مرکزی سازمان · ۰۴</span><h1>تنظیمات مرکزی</h1><p className={styles.muted}>پیکربندی واقعی و سازمان‌محور هسته مرکزی کسب‌وکار</p></div><button className={styles.primary} onClick={load}>به‌روزرسانی</button></header>
 {error&&<div className={styles.error}>{error}</div>}
 <nav className={styles.tabs}>{cats.map(c=><button key={c} className={tab===c?styles.active:""} onClick={()=>setTab(c)}>{labels[c]||c}</button>)}<button className={tab==="audit"?styles.active:""} onClick={()=>setTab("audit")}>تاریخچه تغییرات</button></nav>
 {tab!=="audit"?<section className={styles.panel}><div className={styles.panelHead}><h2>{labels[tab]||tab}</h2><span>{items.filter(x=>x.category===tab).length} تنظیم</span></div><div className={styles.rows}>{items.filter(x=>x.category===tab).map(s=><div className={styles.row} key={s.id}><div><b>{s.title}</b><small>{s.setting_key}</small></div><div className={styles.control}>{input(s)}<button className={styles.save} disabled={!s.is_editable||saving===s.id} onClick={()=>save(s)}>{saving===s.id?"در حال ذخیره...":"ذخیره"}</button></div></div>)}</div></section>:<section className={styles.panel}><div className={styles.panelHead}><h2>تاریخچه تغییرات</h2><span>{audit.length} رویداد</span></div><div className={styles.rows}>{audit.map(x=><div className={styles.row} key={x.id}><div><b>{x.title||x.setting_id}</b><small>{x.setting_key} · {new Date(x.changed_at).toLocaleString("fa-IR")}</small></div><code>{JSON.stringify(x.new_value)}</code></div>)}</div></section>}
 </main>
}
