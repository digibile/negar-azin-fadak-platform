"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./InstallmentSchedulesWorkspace.module.css";

type RecordItem={id:number;record_type:string;title:string;status:string;data:Record<string,unknown>;created_at:string;updated_at:string};
const API=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";
const TABS=[
 ["schedule","برنامه اقساط"],["due","سررسیدها"],["paid","پرداخت‌شده"],["overdue","معوقات"],["settlement","ثبت پرداخت"]
] as const;
const STATUSES=["برنامه‌ریزی‌شده","سررسید شده","پرداخت ناقص","پرداخت‌شده","معوق","بخشوده"];
const initial={contract:"",number:"",due:"",principal:"",interest:"",total:"",paid:"",paymentDate:"",status:"برنامه‌ریزی‌شده",reference:"",lateFee:"",notes:""};

export default function InstallmentSchedulesWorkspace(){
 const [tab,setTab]=useState("schedule"),[items,setItems]=useState<RecordItem[]>([]);
 const [form,setForm]=useState<Record<string,unknown>>({...initial}),[editing,setEditing]=useState<number|null>(null);
 const [q,setQ]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");

 const load=async()=>{
  setLoading(true);setError("");
  try{
   const r=await fetch(API+"/api/platform/modules/14-installment-schedules/records?page=1&pageSize=200&q="+encodeURIComponent(q),{credentials:"include"});
   const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||"دریافت برنامه اقساط انجام نشد.");
   setItems(b?.items||[]);
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات")}finally{setLoading(false)}
 };
 useEffect(()=>{load()},[]);

 const base=useMemo(()=>{
  if(tab==="due")return items.filter(x=>["سررسید شده","پرداخت ناقص"].includes(String(x.data?.["installment-status"]||"")));
  if(tab==="paid")return items.filter(x=>String(x.data?.["installment-status"]||"")==="پرداخت‌شده");
  if(tab==="overdue")return items.filter(x=>String(x.data?.["installment-status"]||"")==="معوق");
  return items;
 },[items,tab]);
 const filtered=useMemo(()=>!q?base:base.filter(x=>x.title.includes(q)||JSON.stringify(x.data).includes(q)),[base,q]);
 const set=(k:string,v:unknown)=>setForm(x=>({...x,[k]:v}));
 const reset=()=>{setEditing(null);setForm({...initial})};

 const save=async()=>{
  if(!String(form.contract||"").trim()||!String(form.number||"").trim()||!String(form.due||"").trim()||!String(form.total||"").trim())return setError("شماره قرارداد، شماره قسط، سررسید و مبلغ کل الزامی است.");
  setSaving(true);setError("");
  try{
   const data={
    "contract-code":form.contract,"installment-no":Number(form.number),"due-date":form.due,
    "principal-amount":Number(form.principal||0),"interest-amount":Number(form.interest||0),
    "total-amount":Number(form.total),"paid-amount":Number(form.paid||0),
    "payment-date":form.paymentDate||null,"installment-status":form.status,
    "payment-reference":form.reference,"late-fee":Number(form.lateFee||0),"notes":form.notes
   };
   const r=await fetch(API+"/api/platform/modules/14-installment-schedules/records"+(editing?"/"+editing:""),{
    method:editing?"PATCH":"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},
    body:JSON.stringify({recordType:"installment",title:String(form.contract)+" / قسط "+String(form.number),status:String(form.status),data})
   });
   const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||"ثبت قسط انجام نشد.");
   reset();await load();
  }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت")}finally{setSaving(false)}
 };

 const edit=(r:RecordItem)=>{
  const d=r.data||{};
  setEditing(r.id);setForm({
   contract:d["contract-code"]||"",number:d["installment-no"]??"",due:d["due-date"]||"",
   principal:d["principal-amount"]??"",interest:d["interest-amount"]??"",total:d["total-amount"]??"",
   paid:d["paid-amount"]??"",paymentDate:d["payment-date"]||"",status:d["installment-status"]||"برنامه‌ریزی‌شده",
   reference:d["payment-reference"]||"",lateFee:d["late-fee"]??"",notes:d.notes||""
  });
  setTab("schedule");window.scrollTo({top:0,behavior:"smooth"});
 };
 const settle=(r:RecordItem)=>{
  edit(r);setForm(x=>({...x,status:"پرداخت‌شده",paymentDate:x.paymentDate||new Date().toISOString().slice(0,10),paid:x.paid||x.total}));
  setTab("settlement");
 };
 const remove=async(id:number)=>{
  if(!confirm("این قسط حذف شود؟"))return;
  const r=await fetch(API+"/api/platform/modules/14-installment-schedules/records/"+id,{method:"DELETE",credentials:"include",headers:{"X-CSRF-Token":csrf()}});
  if(!r.ok){const b=await r.json().catch(()=>null);setError(b?.error||"حذف انجام نشد.");return}
  await load();
 };
 const label=TABS.find(x=>x[0]===tab)?.[1]||"برنامه اقساط";

 return <main className={styles.page} dir="rtl">
  <header className={styles.hero}>
   <div><span>اعتبار و تسهیلات · ماژول ۱۴</span><h1>برنامه اقساط و بازپرداخت</h1><p>مدیریت برنامه اقساط، سررسید، پرداخت، معوقات و ثبت تسویه واقعی.</p></div>
   <div className={styles.stats}><div><strong>{items.length.toLocaleString("fa-IR")}</strong><small>قسط</small></div><div><strong>{items.filter(x=>String(x.data?.["installment-status"]||"")==="معوق").length.toLocaleString("fa-IR")}</strong><small>معوق</small></div></div>
  </header>
  <nav className={styles.tabs}>{TABS.map(([k,t])=><button key={k} className={tab===k?styles.active:""} onClick={()=>{setTab(k);setError("")}}>{t}</button>)}</nav>
  {error&&<div className={styles.error}>{error}</div>}
  <section className={styles.grid}>
   {(tab==="schedule"||tab==="settlement")&&<form className={styles.card} onSubmit={e=>{e.preventDefault();save()}}>
    <div className={styles.head}><div><small>ثبت واقعی در PostgreSQL</small><h2>{editing?"ویرایش قسط":"ثبت قسط"}</h2></div>{editing&&<button type="button" onClick={reset}>انصراف</button>}</div>
    <div className={styles.fields}>
     <label>شماره قرارداد *<input value={String(form.contract)} onChange={e=>set("contract",e.target.value)}/></label>
     <label>شماره قسط *<input type="number" min="1" value={String(form.number)} onChange={e=>set("number",e.target.value)}/></label>
     <label>تاریخ سررسید *<input type="date" value={String(form.due)} onChange={e=>set("due",e.target.value)}/></label>
     <label>مبلغ اصل قسط<input type="number" min="0" value={String(form.principal)} onChange={e=>set("principal",e.target.value)}/></label>
     <label>سود / کارمزد<input type="number" min="0" value={String(form.interest)} onChange={e=>set("interest",e.target.value)}/></label>
     <label>مبلغ کل قسط *<input type="number" min="0" value={String(form.total)} onChange={e=>set("total",e.target.value)}/></label>
     <label>مبلغ پرداخت‌شده<input type="number" min="0" value={String(form.paid)} onChange={e=>set("paid",e.target.value)}/></label>
     <label>تاریخ پرداخت<input type="date" value={String(form.paymentDate)} onChange={e=>set("paymentDate",e.target.value)}/></label>
     <label>وضعیت *<select value={String(form.status)} onChange={e=>set("status",e.target.value)}>{STATUSES.map(x=><option key={x}>{x}</option>)}</select></label>
     <label>مرجع پرداخت<input value={String(form.reference)} onChange={e=>set("reference",e.target.value)}/></label>
     <label>جریمه دیرکرد<input type="number" min="0" value={String(form.lateFee)} onChange={e=>set("lateFee",e.target.value)}/></label>
     <label className={styles.full}>یادداشت<textarea rows={3} value={String(form.notes)} onChange={e=>set("notes",e.target.value)}/></label>
    </div>
    <button className={styles.primary} disabled={saving}>{saving?"در حال ذخیره...":editing?"ذخیره تغییرات":"ثبت قسط در PostgreSQL"}</button>
   </form>}
   <section className={styles.card}>
    <div className={styles.head}><div><small>{label}</small><h2>{tab==="overdue"?"اقساط معوق":tab==="paid"?"اقساط پرداخت‌شده":"اقساط ثبت‌شده"}</h2></div><button onClick={load}>به‌روزرسانی</button></div>
    <div className={styles.search}><input placeholder="جستجو در قرارداد و اقساط..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/><button onClick={load}>جستجو</button></div>
    <div className={styles.list}>
     {loading?<div className={styles.empty}>در حال دریافت داده واقعی...</div>:filtered.map(r=><article className={styles.row} key={r.id}>
      <div><b>{r.title}</b><small>سررسید: {String(r.data?.["due-date"]||"")} · {String(r.data?.["installment-status"]||"")}</small><span>{Number(r.data?.["total-amount"]||0).toLocaleString("fa-IR")} ریال · پرداخت {Number(r.data?.["paid-amount"]||0).toLocaleString("fa-IR")}</span></div>
      <div className={styles.actions}><button onClick={()=>edit(r)}>ویرایش</button>{tab==="settlement"&&<button className={styles.settle} onClick={()=>settle(r)}>ثبت پرداخت</button>}<button className={styles.danger} onClick={()=>remove(r.id)}>حذف</button></div>
     </article>)}
     {!loading&&!filtered.length&&<div className={styles.empty}>رکوردی ثبت نشده است.</div>}
    </div>
   </section>
  </section>
 </main>
}
