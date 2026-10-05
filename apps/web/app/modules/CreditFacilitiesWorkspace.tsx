"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./CreditFacilitiesWorkspace.module.css";

type RecordItem={id:number;record_type:string;title:string;status:string;data:Record<string,unknown>;created_at:string;updated_at:string};
type Tab={key:string;title:string;icon:string};

const API=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const TABS:Tab[]=[
 {key:"credit-facilities-1",title:"محصولات اعتباری",icon:"01"},
 {key:"credit-facilities-2",title:"سقف اعتبار",icon:"02"},
 {key:"credit-facilities-3",title:"درخواست اعتبار",icon:"03"},
 {key:"credit-facilities-4",title:"مصوبه اعتبار",icon:"04"},
 {key:"credit-facilities-5",title:"پرونده اعتباری",icon:"05"}
];

const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";

export default function CreditFacilitiesWorkspace(){
 const [tab,setTab]=useState("credit-facilities-1");
 const [items,setItems]=useState<RecordItem[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [editingId,setEditingId]=useState<number|null>(null);
 const [q,setQ]=useState("");
 const [form,setForm]=useState<Record<string,unknown>>({
  creditCode:"",creditTitle:"",creditType:"خرید",creditLimit:"",creditRate:"",
  creditTerm:"",creditStatus:"فعال",creditNotes:""
 });

 const load=async()=>{
  setLoading(true);setError("");
  try{
   const r=await fetch(API+"/api/platform/modules/11-credit-facilities/records?page=1&pageSize=100&q="+encodeURIComponent(q),{credentials:"include"});
   const body=await r.json().catch(()=>null);
   if(!r.ok)throw new Error(body?.error||"دریافت اطلاعات محصول اعتباری انجام نشد.");
   setItems(body?.items||[]);
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات");}
  finally{setLoading(false)}
 };
 useEffect(()=>{load()},[]);

 const filtered=useMemo(()=>items.filter(x=>!q.trim()||x.title.includes(q)||JSON.stringify(x.data).includes(q)),[items,q]);
 const set=(key:string,value:unknown)=>setForm(x=>({...x,[key]:value}));
 const reset=()=>{setEditingId(null);setForm({creditCode:"",creditTitle:"",creditType:"خرید",creditLimit:"",creditRate:"",creditTerm:"",creditStatus:"فعال",creditNotes:""});};

 const save=async()=>{
  if(!String(form.creditCode||"").trim()||!String(form.creditTitle||"").trim()||!String(form.creditLimit||"").trim())return setError("کد محصول، عنوان محصول و سقف اعتبار الزامی است.");
  setSaving(true);setError("");
  try{
   const data={
    "credit-code":form.creditCode,"credit-title":form.creditTitle,"credit-type":form.creditType,
    "credit-limit":Number(form.creditLimit),"credit-rate":form.creditRate===""?null:Number(form.creditRate),
    "credit-term":form.creditTerm===""?null:Number(form.creditTerm),"credit-status":form.creditStatus,
    "credit-notes":form.creditNotes
   };
   const r=await fetch(API+"/api/platform/modules/11-credit-facilities/records"+(editingId?"/"+editingId:""),{
    method:editingId?"PATCH":"POST",credentials:"include",
    headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},
    body:JSON.stringify({recordType:"credit-product",title:String(form.creditTitle),status:"active",data})
   });
   const body=await r.json().catch(()=>null);
   if(!r.ok)throw new Error(body?.error||"ثبت محصول اعتباری انجام نشد.");
   reset();await load();
  }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت");}
  finally{setSaving(false)}
 };

 const edit=(r:RecordItem)=>{
  const d=r.data||{};
  setEditingId(r.id);
  setForm({
   creditCode:d["credit-code"]||"",creditTitle:d["credit-title"]||r.title,creditType:d["credit-type"]||"خرید",
   creditLimit:d["credit-limit"]??"",creditRate:d["credit-rate"]??"",creditTerm:d["credit-term"]??"",
   creditStatus:d["credit-status"]||"فعال",creditNotes:d["credit-notes"]||""
  });
  window.scrollTo({top:0,behavior:"smooth"});
 };
 const remove=async(id:number)=>{
  if(!window.confirm("این رکورد حذف شود؟"))return;
  const r=await fetch(API+"/api/platform/modules/11-credit-facilities/records/"+id,{method:"DELETE",credentials:"include",headers:{"X-CSRF-Token":csrf()}});
  if(!r.ok){const b=await r.json().catch(()=>null);setError(b?.error||"حذف انجام نشد.");return}
  await load();
 };

 return <main className={styles.page} dir="rtl">
  <header className={styles.hero}>
   <div>
    <span className={styles.kicker}>اعتبار و تسهیلات · ماژول ۱۱</span>
    <h1>محصولات اعتباری</h1>
    <p>تعریف و راهبری محصولات اعتبار، سقف‌های قابل تخصیص و چرخه درخواست تا تشکیل پرونده.</p>
   </div>
   <div className={styles.metric}><b>{items.length.toLocaleString("fa-IR")}</b><span>رکورد واقعی</span></div>
  </header>

  <nav className={styles.tabs} aria-label="منوی ماژول ۱۱">
   {TABS.map(t=><button key={t.key} className={tab===t.key?styles.active:""} onClick={()=>setTab(t.key)}>
    <span>{t.icon}</span><strong>{t.title}</strong>
   </button>)}
  </nav>

  {error&&<div className={styles.error}>{error}</div>}

  {tab!=="credit-facilities-1"?<section className={styles.placeholder}>
   <span>{TABS.find(x=>x.key===tab)?.icon}</span>
   <h2>{TABS.find(x=>x.key===tab)?.title}</h2>
   <p>ساختار این بخش به منوی عملیاتی متصل است. داده‌ها از سرویس مرکزی و PostgreSQL خوانده می‌شوند.</p>
   <button onClick={()=>setTab("credit-facilities-1")}>بازگشت به محصولات اعتباری</button>
  </section>:
  <section className={styles.grid}>
   <form className={styles.card} onSubmit={e=>{e.preventDefault();save()}}>
    <div className={styles.cardHead}><div><span>ثبت واقعی</span><h2>{editingId?"ویرایش محصول":"تعریف محصول اعتباری"}</h2></div>{editingId&&<button type="button" onClick={reset}>انصراف</button>}</div>
    <div className={styles.fields}>
     <label>کد محصول *<input value={String(form.creditCode)} onChange={e=>set("creditCode",e.target.value)} /></label>
     <label>عنوان محصول *<input value={String(form.creditTitle)} onChange={e=>set("creditTitle",e.target.value)} /></label>
     <label>نوع اعتبار<select value={String(form.creditType)} onChange={e=>set("creditType",e.target.value)}>{["خرید","نقدی","اقساطی","اعتبار فروشگاهی","سایر"].map(x=><option key={x}>{x}</option>)}</select></label>
     <label>سقف اعتبار *<input type="number" min="0" value={String(form.creditLimit)} onChange={e=>set("creditLimit",e.target.value)} /></label>
     <label>نرخ / کارمزد<input type="number" min="0" step="0.01" value={String(form.creditRate)} onChange={e=>set("creditRate",e.target.value)} /></label>
     <label>مدت اعتبار، ماه<input type="number" min="0" value={String(form.creditTerm)} onChange={e=>set("creditTerm",e.target.value)} /></label>
     <label>وضعیت<select value={String(form.creditStatus)} onChange={e=>set("creditStatus",e.target.value)}>{["پیش‌نویس","فعال","متوقف","بسته"].map(x=><option key={x}>{x}</option>)}</select></label>
     <label className={styles.full}>ضوابط و توضیحات<textarea rows={4} value={String(form.creditNotes)} onChange={e=>set("creditNotes",e.target.value)} /></label>
    </div>
    <button className={styles.primary} disabled={saving}>{saving?"در حال ذخیره...":editingId?"ذخیره تغییرات":"ثبت محصول در PostgreSQL"}</button>
   </form>

   <section className={styles.card}>
    <div className={styles.cardHead}><div><span>داده عملیاتی</span><h2>محصولات ثبت‌شده</h2></div><button type="button" onClick={load}>به‌روزرسانی</button></div>
    <div className={styles.search}><input placeholder="جستجو..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/><button onClick={load}>جستجو</button></div>
    {loading?<div className={styles.empty}>در حال دریافت داده واقعی...</div>:<div className={styles.list}>{filtered.map(r=><article key={r.id} className={styles.row}>
      <div><strong>{r.title}</strong><small>{String(r.data?.["credit-code"]||"بدون کد")} · {String(r.data?.["credit-type"]||"")}</small><span>{Number(r.data?.["credit-limit"]||0).toLocaleString("fa-IR")} ریال</span></div>
      <div><button onClick={()=>edit(r)}>ویرایش</button><button className={styles.danger} onClick={()=>remove(r.id)}>حذف</button></div>
    </article>)}{!filtered.length&&<div className={styles.empty}>رکوردی ثبت نشده است.</div>}</div>}
   </section>
  </section>}
 </main>
}
