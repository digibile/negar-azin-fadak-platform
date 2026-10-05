"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./InstallmentCollectionsWorkspace.module.css";

type RecordItem={id:number;record_type:string;title:string;status:string;data:Record<string,unknown>;created_at:string;updated_at:string};
const API=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";
const TABS=[["collections","وصول‌ها"],["pending","در انتظار تأیید"],["confirmed","تأییدشده"],["reversed","برگشتی"],["confirm","تأیید وصول"]] as const;
const STATUSES=["ثبت اولیه","تأیید شده","رد شده","برگشت خورده","لغو شده"];
const initial={contract:"",number:"",date:"",amount:"",method:"واریز بانکی",reference:"",collector:"",status:"ثبت اولیه",account:"",receipt:"",notes:""};

export default function InstallmentCollectionsWorkspace(){
 const [tab,setTab]=useState("collections"),[items,setItems]=useState<RecordItem[]>([]);
 const [form,setForm]=useState<Record<string,unknown>>({...initial}),[editing,setEditing]=useState<number|null>(null);
 const [q,setQ]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");

 const load=async()=>{
  setLoading(true);setError("");
  try{
   const r=await fetch(API+"/api/platform/modules/15-installment-collections/records?page=1&pageSize=200&q="+encodeURIComponent(q),{credentials:"include"});
   const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||"دریافت اطلاعات وصول انجام نشد.");
   setItems(b?.items||[]);
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات")}finally{setLoading(false)}
 };
 useEffect(()=>{load()},[]);

 const base=useMemo(()=>{
  if(tab==="pending")return items.filter(x=>String(x.data?.["collection-status"]||"")==="ثبت اولیه");
  if(tab==="confirmed")return items.filter(x=>String(x.data?.["collection-status"]||"")==="تأیید شده");
  if(tab==="reversed")return items.filter(x=>String(x.data?.["collection-status"]||"")==="برگشت خورده");
  return items;
 },[items,tab]);
 const filtered=useMemo(()=>!q?base:base.filter(x=>x.title.includes(q)||JSON.stringify(x.data).includes(q)),[base,q]);
 const set=(k:string,v:unknown)=>setForm(x=>({...x,[k]:v}));
 const reset=()=>{setEditing(null);setForm({...initial})};

 const save=async()=>{
  if(!String(form.contract||"").trim()||!String(form.number||"").trim()||!String(form.date||"").trim()||!String(form.amount||"").trim())return setError("شماره قرارداد، شماره قسط، تاریخ وصول و مبلغ وصولی الزامی است.");
  setSaving(true);setError("");
  try{
   const data={"contract-code":form.contract,"installment-no":Number(form.number),"collection-date":form.date,"amount":Number(form.amount),
    "payment-method":form.method,"payment-reference":form.reference,"collector":form.collector,"collection-status":form.status,
    "bank-account":form.account,"receipt-code":form.receipt,"notes":form.notes};
   const r=await fetch(API+"/api/platform/modules/15-installment-collections/records"+(editing?"/"+editing:""),{
    method:editing?"PATCH":"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},
    body:JSON.stringify({recordType:"installment-collection",title:String(form.contract)+" / قسط "+String(form.number),status:String(form.status),data})
   });
   const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||"ثبت وصول انجام نشد.");
   reset();await load();
  }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت")}finally{setSaving(false)}
 };

 const edit=(r:RecordItem)=>{
  const d=r.data||{};setEditing(r.id);setForm({contract:d["contract-code"]||"",number:d["installment-no"]??"",date:d["collection-date"]||"",
   amount:d.amount??"",method:d["payment-method"]||"واریز بانکی",reference:d["payment-reference"]||"",collector:d.collector||"",
   status:d["collection-status"]||"ثبت اولیه",account:d["bank-account"]||"",receipt:d["receipt-code"]||"",notes:d.notes||""});
  setTab("collections");window.scrollTo({top:0,behavior:"smooth"});
 };
 const setStatus=async(r:RecordItem,status:string)=>{
  setEditing(r.id);
  const d={...r.data,"collection-status":status};
  const res=await fetch(API+"/api/platform/modules/15-installment-collections/records/"+r.id,{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},
   body:JSON.stringify({recordType:r.record_type,title:r.title,status,data:d})});
  if(!res.ok){const b=await res.json().catch(()=>null);setError(b?.error||"تغییر وضعیت انجام نشد.");return}
  setEditing(null);await load();
 };
 const remove=async(id:number)=>{
  if(!confirm("این وصول حذف شود؟"))return;
  const r=await fetch(API+"/api/platform/modules/15-installment-collections/records/"+id,{method:"DELETE",credentials:"include",headers:{"X-CSRF-Token":csrf()}});
  if(!r.ok){const b=await r.json().catch(()=>null);setError(b?.error||"حذف انجام نشد.");return}
  await load();
 };
 const label=TABS.find(x=>x[0]===tab)?.[1]||"وصول‌ها";

 return <main className={styles.page} dir="rtl">
  <header className={styles.hero}><div><span>اعتبار و تسهیلات · ماژول ۱۵</span><h1>وصول اقساط</h1><p>ثبت، بررسی، تأیید و برگشت وصول‌های مرتبط با اقساط و قراردادها.</p></div>
   <div className={styles.stats}><strong>{items.length.toLocaleString("fa-IR")}</strong><small>وصول</small><strong>{items.filter(x=>String(x.data?.["collection-status"]||"")==="تأیید شده").length.toLocaleString("fa-IR")}</strong><small>تأییدشده</small></div>
  </header>
  <nav className={styles.tabs}>{TABS.map(([k,t])=><button key={k} className={tab===k?styles.active:""} onClick={()=>{setTab(k);setError("")}}>{t}</button>)}</nav>
  {error&&<div className={styles.error}>{error}</div>}
  <section className={styles.grid}>
   {(tab==="collections"||tab==="confirm")&&<form className={styles.card} onSubmit={e=>{e.preventDefault();save()}}>
    <div className={styles.head}><div><small>ثبت واقعی در PostgreSQL</small><h2>{editing?"ویرایش وصول":"ثبت وصول قسط"}</h2></div>{editing&&<button type="button" onClick={reset}>انصراف</button>}</div>
    <div className={styles.fields}>
     <label>شماره قرارداد *<input value={String(form.contract)} onChange={e=>set("contract",e.target.value)}/></label>
     <label>شماره قسط *<input type="number" min="1" value={String(form.number)} onChange={e=>set("number",e.target.value)}/></label>
     <label>تاریخ وصول *<input type="date" value={String(form.date)} onChange={e=>set("date",e.target.value)}/></label>
     <label>مبلغ وصولی *<input type="number" min="0" value={String(form.amount)} onChange={e=>set("amount",e.target.value)}/></label>
     <label>روش پرداخت *<select value={String(form.method)} onChange={e=>set("method",e.target.value)}>{["واریز بانکی","درگاه پرداخت","کارتخوان","پرداخت نقدی","تهاتر"].map(x=><option key={x}>{x}</option>)}</select></label>
     <label>مرجع پرداخت<input value={String(form.reference)} onChange={e=>set("reference",e.target.value)}/></label>
     <label>ثبت‌کننده وصول<input value={String(form.collector)} onChange={e=>set("collector",e.target.value)}/></label>
     <label>وضعیت *<select value={String(form.status)} onChange={e=>set("status",e.target.value)}>{STATUSES.map(x=><option key={x}>{x}</option>)}</select></label>
     <label>حساب مقصد<input value={String(form.account)} onChange={e=>set("account",e.target.value)}/></label>
     <label>شماره رسید<input value={String(form.receipt)} onChange={e=>set("receipt",e.target.value)}/></label>
     <label className={styles.full}>یادداشت<textarea rows={3} value={String(form.notes)} onChange={e=>set("notes",e.target.value)}/></label>
    </div>
    <button className={styles.primary} disabled={saving}>{saving?"در حال ذخیره...":editing?"ذخیره تغییرات":"ثبت وصول در PostgreSQL"}</button>
   </form>}
   <section className={styles.card}><div className={styles.head}><div><small>{label}</small><h2>سوابق وصول</h2></div><button onClick={load}>به‌روزرسانی</button></div>
    <div className={styles.search}><input placeholder="جستجو در قرارداد، قسط یا مرجع پرداخت..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/><button onClick={load}>جستجو</button></div>
    <div className={styles.list}>{loading?<div className={styles.empty}>در حال دریافت داده واقعی...</div>:filtered.map(r=><article className={styles.row} key={r.id}>
     <div><b>{r.title}</b><small>{String(r.data?.["collection-date"]||"")} · {String(r.data?.["payment-method"]||"")} · {String(r.data?.["collection-status"]||"")}</small><span>{Number(r.data?.amount||0).toLocaleString("fa-IR")} ریال · رسید {String(r.data?.["receipt-code"]||"-")}</span></div>
     <div className={styles.actions}><button onClick={()=>edit(r)}>ویرایش</button>{tab==="confirm"&&<><button className={styles.confirm} onClick={()=>setStatus(r,"تأیید شده")}>تأیید</button><button className={styles.reverse} onClick={()=>setStatus(r,"برگشت خورده")}>برگشت</button></>}<button className={styles.danger} onClick={()=>remove(r.id)}>حذف</button></div>
    </article>)}{!loading&&!filtered.length&&<div className={styles.empty}>رکوردی ثبت نشده است.</div>}</div>
   </section>
  </section>
 </main>
}
