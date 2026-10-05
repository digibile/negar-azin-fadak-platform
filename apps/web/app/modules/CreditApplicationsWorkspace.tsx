"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./CreditApplicationsWorkspace.module.css";

type RecordItem={id:number;record_type:string;title:string;status:string;data:Record<string,unknown>;created_at:string;updated_at:string};
const API=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";

const TABS=[
 ["applications","درخواست‌ها"],["review","بررسی اولیه"],["documents","مدارک"],["scoring","اعتبارسنجی"],["decisions","نتیجه بررسی"]
] as const;

const initial={code:"",applicant:"",product:"",amount:"",term:"",purpose:"",status:"ثبت اولیه",submittedAt:"",notes:""};

export default function CreditApplicationsWorkspace(){
 const [tab,setTab]=useState("applications"),[items,setItems]=useState<RecordItem[]>([]);
 const [form,setForm]=useState<Record<string,unknown>>(initial),[editing,setEditing]=useState<number|null>(null);
 const [q,setQ]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");

 const load=async()=>{
  setLoading(true);setError("");
  try{
   const r=await fetch(API+"/api/platform/modules/12-credit-applications/records?page=1&pageSize=100&q="+encodeURIComponent(q),{credentials:"include"});
   const b=await r.json().catch(()=>null); if(!r.ok)throw new Error(b?.error||"دریافت درخواست‌های اعتباری انجام نشد.");
   setItems(b?.items||[]);
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات")}finally{setLoading(false)}
 };
 useEffect(()=>{load()},[]);
 const filtered=useMemo(()=>items.filter(x=>!q||x.title.includes(q)||JSON.stringify(x.data).includes(q)),[items,q]);
 const set=(k:string,v:unknown)=>setForm(x=>({...x,[k]:v}));
 const reset=()=>{setEditing(null);setForm(initial)};
 const save=async()=>{
  if(!String(form.code||"").trim()||!String(form.applicant||"").trim()||!String(form.product||"").trim()||!String(form.amount||"").trim())return setError("کد درخواست، متقاضی، محصول و مبلغ الزامی است.");
  setSaving(true);setError("");
  try{
   const data={"application-code":form.code,"applicant-id":form.applicant,"credit-product":form.product,"requested-amount":Number(form.amount),"requested-term":form.term===""?null:Number(form.term),"purpose":form.purpose,"application-status":form.status,"submitted-at":form.submittedAt||null,"review-notes":form.notes};
   const r=await fetch(API+"/api/platform/modules/12-credit-applications/records"+(editing?"/"+editing:""),{method:editing?"PATCH":"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},body:JSON.stringify({recordType:"credit-application",title:String(form.code),status:"active",data})});
   const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||"ثبت درخواست انجام نشد.");
   reset();await load();
  }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت")}finally{setSaving(false)}
 };
 const edit=(r:RecordItem)=>{const d=r.data||{};setEditing(r.id);setForm({code:d["application-code"]||r.title,applicant:d["applicant-id"]||"",product:d["credit-product"]||"",amount:d["requested-amount"]??"",term:d["requested-term"]??"",purpose:d["purpose"]||"",status:d["application-status"]||"ثبت اولیه",submittedAt:d["submitted-at"]||"",notes:d["review-notes"]||""});window.scrollTo({top:0,behavior:"smooth"})};
 const remove=async(id:number)=>{if(!confirm("این درخواست حذف شود؟"))return;const r=await fetch(API+"/api/platform/modules/12-credit-applications/records/"+id,{method:"DELETE",credentials:"include",headers:{"X-CSRF-Token":csrf()}});if(!r.ok){const b=await r.json().catch(()=>null);setError(b?.error||"حذف انجام نشد.");return}await load()};

 return <main className={styles.page} dir="rtl">
  <header className={styles.hero}><div><span>اعتبار و تسهیلات · ماژول ۱۲</span><h1>درخواست‌های اعتباری</h1><p>ثبت، پیگیری و آماده‌سازی درخواست اعتبار تا بررسی و تصمیم‌گیری.</p></div><strong>{items.length.toLocaleString("fa-IR")} درخواست</strong></header>
  <nav className={styles.tabs}>{TABS.map(([k,t])=><button key={k} className={tab===k?styles.active:""} onClick={()=>setTab(k)}>{t}</button>)}</nav>
  {error&&<div className={styles.error}>{error}</div>}
  {tab!=="applications"?<section className={styles.placeholder}><h2>{TABS.find(x=>x[0]===tab)?.[1]}</h2><p>این بخش به جریان عملیاتی درخواست متصل است و در ادامه همین ماژول تکمیل می‌شود.</p><button onClick={()=>setTab("applications")}>بازگشت</button></section>:
  <section className={styles.grid}>
   <form className={styles.card} onSubmit={e=>{e.preventDefault();save()}}>
    <div className={styles.head}><div><small>ثبت واقعی</small><h2>{editing?"ویرایش درخواست":"ثبت درخواست اعتباری"}</h2></div>{editing&&<button type="button" onClick={reset}>انصراف</button>}</div>
    <div className={styles.fields}>
     <label>کد درخواست *<input value={String(form.code)} onChange={e=>set("code",e.target.value)}/></label>
     <label>شناسه متقاضی *<input value={String(form.applicant)} onChange={e=>set("applicant",e.target.value)}/></label>
     <label>محصول اعتباری *<input value={String(form.product)} onChange={e=>set("product",e.target.value)}/></label>
     <label>مبلغ درخواستی *<input type="number" min="0" value={String(form.amount)} onChange={e=>set("amount",e.target.value)}/></label>
     <label>مدت، ماه<input type="number" min="0" value={String(form.term)} onChange={e=>set("term",e.target.value)}/></label>
     <label>وضعیت<select value={String(form.status)} onChange={e=>set("status",e.target.value)}>{["ثبت اولیه","در حال بررسی","نیازمند تکمیل مدارک","در انتظار اعتبارسنجی","تأیید شده","رد شده","لغو شده"].map(x=><option key={x}>{x}</option>)}</select></label>
     <label className={styles.full}>هدف مصرف<textarea rows={3} value={String(form.purpose)} onChange={e=>set("purpose",e.target.value)}/></label>
     <label className={styles.full}>یادداشت بررسی<textarea rows={3} value={String(form.notes)} onChange={e=>set("notes",e.target.value)}/></label>
    </div>
    <button className={styles.primary} disabled={saving}>{saving?"در حال ذخیره...":editing?"ذخیره تغییرات":"ثبت در PostgreSQL"}</button>
   </form>
   <section className={styles.card}><div className={styles.head}><div><small>داده عملیاتی</small><h2>درخواست‌های ثبت‌شده</h2></div><button onClick={load}>به‌روزرسانی</button></div>
    <div className={styles.search}><input placeholder="جستجو..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/><button onClick={load}>جستجو</button></div>
    {loading?<div className={styles.empty}>در حال دریافت داده واقعی...</div>:<div className={styles.list}>{filtered.map(r=><article className={styles.row} key={r.id}><div><b>{r.title}</b><small>{String(r.data?.["applicant-id"]||"")} · {String(r.data?.["application-status"]||"")}</small><span>{Number(r.data?.["requested-amount"]||0).toLocaleString("fa-IR")} ریال</span></div><div><button onClick={()=>edit(r)}>ویرایش</button><button className={styles.danger} onClick={()=>remove(r.id)}>حذف</button></div></article>)}{!filtered.length&&<div className={styles.empty}>درخواستی ثبت نشده است.</div>}</div>}
   </section>
  </section>}
 </main>
}
