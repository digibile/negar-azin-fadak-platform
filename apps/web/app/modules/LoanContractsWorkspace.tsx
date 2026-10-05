"use client";

import {useEffect,useMemo,useState} from "react";
import styles from "./LoanContractsWorkspace.module.css";

type RecordItem={id:number;record_type:string;title:string;status:string;data:Record<string,unknown>;created_at:string;updated_at:string};
const API=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";

const TABS=[
 ["contracts","قراردادهای وام"],
 ["active","تسهیلات فعال"],
 ["collateral","وثایق"],
 ["guarantors","ضامنین"],
 ["termination","فسخ و خاتمه"]
] as const;

const STATUS=["پیش‌نویس","فعال","تسویه‌شده","فسخ‌شده","خاتمه‌یافته"];
const initial={code:"",application:"",borrower:"",product:"",principal:"",rate:"",term:"",installment:"",start:"",maturity:"",status:"پیش‌نویس",collateral:"",guarantor:"",termination:"",notes:""};

export default function LoanContractsWorkspace(){
 const [tab,setTab]=useState("contracts"),[items,setItems]=useState<RecordItem[]>([]);
 const [form,setForm]=useState<Record<string,unknown>>(initial),[editing,setEditing]=useState<number|null>(null);
 const [q,setQ]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");

 const load=async()=>{
  setLoading(true);setError("");
  try{
   const r=await fetch(API+"/api/platform/modules/13-loan-contracts/records?page=1&pageSize=200&q="+encodeURIComponent(q),{credentials:"include"});
   const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||"دریافت قراردادهای وام انجام نشد.");
   setItems(b?.items||[]);
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات")}finally{setLoading(false)}
 };
 useEffect(()=>{load()},[]);

 const contracts=useMemo(()=>items.filter(x=>x.record_type==="loan-contract"),[items]);
 const active=useMemo(()=>contracts.filter(x=>String(x.data?.["contract-status"]||"") === "فعال"),[contracts]);
 const filtered=useMemo(()=>{
  const base=tab==="active"?active:tab==="contracts"||tab==="termination"?contracts:items.filter(x=>x.record_type===tab);
  if(!q)return base;
  return base.filter(x=>x.title.includes(q)||JSON.stringify(x.data).includes(q));
 },[items,contracts,active,tab,q]);

 const set=(k:string,v:unknown)=>setForm(x=>({...x,[k]:v}));
 const reset=()=>{setEditing(null);setForm({...initial})};
 const save=async()=>{
  if(!String(form.code||"").trim()||!String(form.borrower||"").trim()||!String(form.product||"").trim()||!String(form.principal||"").trim()||!String(form.term||"").trim())return setError("شماره قرارداد، وام‌گیرنده، محصول، مبلغ اصل و مدت الزامی است.");
  setSaving(true);setError("");
  try{
   const data={
    "contract-code":form.code,"application-code":form.application,"borrower-id":form.borrower,
    "credit-product":form.product,"principal-amount":Number(form.principal),"interest-rate":form.rate===""?null:Number(form.rate),
    "term-months":Number(form.term),"installment-amount":form.installment===""?null:Number(form.installment),
    "start-date":form.start||null,"maturity-date":form.maturity||null,"contract-status":form.status,
    "collateral-summary":form.collateral,"guarantor-summary":form.guarantor,
    "termination-reason":form.termination,"contract-notes":form.notes
   };
   const r=await fetch(API+"/api/platform/modules/13-loan-contracts/records"+(editing?"/"+editing:""),{
    method:editing?"PATCH":"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},
    body:JSON.stringify({recordType:"loan-contract",title:String(form.code),status:String(form.status),data})
   });
   const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||"ثبت قرارداد انجام نشد.");
   reset();await load();
  }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت")}finally{setSaving(false)}
 };

 const edit=(r:RecordItem)=>{
  const d=r.data||{};
  setEditing(r.id);
  setForm({
   code:d["contract-code"]||r.title,application:d["application-code"]||"",borrower:d["borrower-id"]||"",
   product:d["credit-product"]||"",principal:d["principal-amount"]??"",rate:d["interest-rate"]??"",
   term:d["term-months"]??"",installment:d["installment-amount"]??"",start:d["start-date"]||"",
   maturity:d["maturity-date"]||"",status:d["contract-status"]||"پیش‌نویس",
   collateral:d["collateral-summary"]||"",guarantor:d["guarantor-summary"]||"",
   termination:d["termination-reason"]||"",notes:d["contract-notes"]||""
  });
  setTab("contracts");window.scrollTo({top:0,behavior:"smooth"});
 };

 const remove=async(id:number)=>{
  if(!confirm("این رکورد حذف شود؟"))return;
  const r=await fetch(API+"/api/platform/modules/13-loan-contracts/records/"+id,{method:"DELETE",credentials:"include",headers:{"X-CSRF-Token":csrf()}});
  if(!r.ok){const b=await r.json().catch(()=>null);setError(b?.error||"حذف انجام نشد.");return}
  await load();
 };

 const terminate=(r:RecordItem)=>{
  edit(r);
  setForm(x=>({...x,status:"خاتمه‌یافته"}));
  setTab("termination");
 };

 const labelForTab=TABS.find(x=>x[0]===tab)?.[1]||"قراردادهای وام";

 return <main className={styles.page} dir="rtl">
  <header className={styles.hero}>
   <div><span>اعتبار و تسهیلات · ماژول ۱۳</span><h1>قراردادهای وام</h1><p>ثبت و مدیریت قرارداد، تسهیلات فعال، وثایق، ضامنین و فرآیند فسخ و خاتمه.</p></div>
   <div className={styles.stats}><strong>{contracts.length.toLocaleString("fa-IR")}</strong><small>قرارداد</small><strong>{active.length.toLocaleString("fa-IR")}</strong><small>فعال</small></div>
  </header>

  <nav className={styles.tabs}>{TABS.map(([k,t])=><button key={k} className={tab===k?styles.active:""} onClick={()=>{setTab(k);setEditing(null);setError("")}}>{t}</button>)}</nav>
  {error&&<div className={styles.error}>{error}</div>}

  {(tab==="contracts"||tab==="termination")&&<section className={styles.grid}>
   <form className={styles.card} onSubmit={e=>{e.preventDefault();save()}}>
    <div className={styles.head}><div><small>ثبت واقعی در PostgreSQL</small><h2>{editing?"ویرایش قرارداد":"ثبت قرارداد وام"}</h2></div>{editing&&<button type="button" onClick={reset}>انصراف</button>}</div>
    <div className={styles.fields}>
     <label>شماره قرارداد *<input value={String(form.code)} onChange={e=>set("code",e.target.value)}/></label>
     <label>کد درخواست اعتباری<input value={String(form.application)} onChange={e=>set("application",e.target.value)}/></label>
     <label>شناسه وام‌گیرنده *<input value={String(form.borrower)} onChange={e=>set("borrower",e.target.value)}/></label>
     <label>محصول اعتباری *<input value={String(form.product)} onChange={e=>set("product",e.target.value)}/></label>
     <label>مبلغ اصل تسهیلات *<input type="number" min="0" value={String(form.principal)} onChange={e=>set("principal",e.target.value)}/></label>
     <label>نرخ / کارمزد<input type="number" min="0" step="0.01" value={String(form.rate)} onChange={e=>set("rate",e.target.value)}/></label>
     <label>مدت قرارداد، ماه *<input type="number" min="1" value={String(form.term)} onChange={e=>set("term",e.target.value)}/></label>
     <label>مبلغ قسط<input type="number" min="0" value={String(form.installment)} onChange={e=>set("installment",e.target.value)}/></label>
     <label>تاریخ شروع<input type="date" value={String(form.start)} onChange={e=>set("start",e.target.value)}/></label>
     <label>تاریخ سررسید<input type="date" value={String(form.maturity)} onChange={e=>set("maturity",e.target.value)}/></label>
     <label>وضعیت قرارداد *<select value={String(form.status)} onChange={e=>set("status",e.target.value)}>{STATUS.map(x=><option key={x}>{x}</option>)}</select></label>
     <label>خلاصه وثایق<textarea rows={2} value={String(form.collateral)} onChange={e=>set("collateral",e.target.value)}/></label>
     <label>خلاصه ضامنین<textarea rows={2} value={String(form.guarantor)} onChange={e=>set("guarantor",e.target.value)}/></label>
     <label>علت فسخ / خاتمه<textarea rows={2} value={String(form.termination)} onChange={e=>set("termination",e.target.value)}/></label>
     <label className={styles.full}>یادداشت قرارداد<textarea rows={3} value={String(form.notes)} onChange={e=>set("notes",e.target.value)}/></label>
    </div>
    <button className={styles.primary} disabled={saving}>{saving?"در حال ذخیره...":editing?"ذخیره تغییرات":"ثبت قرارداد در PostgreSQL"}</button>
   </form>

   <section className={styles.card}>
    <div className={styles.head}><div><small>{labelForTab}</small><h2>{tab==="termination"?"قراردادهای قابل خاتمه":"قراردادهای ثبت‌شده"}</h2></div><button onClick={load}>به‌روزرسانی</button></div>
    <div className={styles.search}><input placeholder="جستجو در قرارداد و اطلاعات..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/><button onClick={load}>جستجو</button></div>
    <div className={styles.list}>
     {loading?<div className={styles.empty}>در حال دریافت داده واقعی...</div>:filtered.map(r=><article className={styles.row} key={r.id}>
      <div><b>{r.title}</b><small>{String(r.data?.["borrower-id"]||"")} · {String(r.data?.["contract-status"]||"")}</small><span>{Number(r.data?.["principal-amount"]||0).toLocaleString("fa-IR")} ریال · {String(r.data?.["term-months"]||"")} ماه</span></div>
      <div className={styles.actions}><button onClick={()=>edit(r)}>ویرایش</button>{tab==="termination"?<button className={styles.terminate} onClick={()=>terminate(r)}>خاتمه</button>:<button className={styles.danger} onClick={()=>remove(r.id)}>حذف</button>}</div>
     </article>)}
     {!loading&&!filtered.length&&<div className={styles.empty}>رکوردی ثبت نشده است.</div>}
    </div>
   </section>
  </section>}

  {(tab==="active"||tab==="collateral"||tab==="guarantors")&&<section className={styles.card}>
   <div className={styles.head}><div><small>داده عملیاتی واقعی</small><h2>{labelForTab}</h2></div><button onClick={load}>به‌روزرسانی</button></div>
   <div className={styles.search}><input placeholder="جستجو..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/><button onClick={load}>جستجو</button></div>
   <div className={styles.list}>
    {loading?<div className={styles.empty}>در حال دریافت داده واقعی...</div>:filtered.map(r=><article className={styles.row} key={r.id}>
     <div><b>{r.title}</b><small>{String(r.data?.["borrower-id"]||"")} · {String(r.data?.["credit-product"]||"")}</small><span>{Number(r.data?.["principal-amount"]||0).toLocaleString("fa-IR")} ریال</span></div>
     <div className={styles.actions}><button onClick={()=>edit(r)}>مشاهده / ویرایش</button></div>
    </article>)}
    {!loading&&!filtered.length&&<div className={styles.empty}>داده‌ای برای نمایش وجود ندارد.</div>}
   </div>
  </section>}
 </main>
}
