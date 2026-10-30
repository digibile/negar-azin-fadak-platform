"use client";

import {useEffect,useState} from "react";
import {api} from "../../lib/api";
import {CanonicalPartyReference} from "../../components/CanonicalPartyReference";

type Merchant={
 id:string;party_id:string|null;canonical_party_title:string|null;code:string;legal_name:string;display_name:string;business_type:string;
 national_id:string|null;tax_id:string|null;iban:string|null;settlement_account_ref:string|null;
 contract_ref:string|null;commission_rate:string|number;status:string;verification_status:string;
 verified_at:string|null;verification_reason:string|null;
};

const statusLabel:Record<string,string>={pending:"در انتظار",review:"در بررسی",active:"فعال",suspended:"تعلیق‌شده",rejected:"ردشده",closed:"بسته"};
const verifyLabel:Record<string,string>={pending:"احراز نشده",verified:"احراز شده",rejected:"رد شده"};

export default function MerchantManagementWorkspace(){
 const [items,setItems]=useState<Merchant[]>([]);
 const [q,setQ]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [editingId,setEditingId]=useState<string|null>(null);
 const [form,setForm]=useState({code:"",legalName:"",displayName:"",businessType:"company",nationalId:"",taxId:"",iban:"",settlementAccountRef:"",contractRef:"",commissionRate:"0"});
 const load=async()=>{
   setLoading(true);setError("");
   try{
     const b=await api<{items:Merchant[]}>("/api/merchants?q="+encodeURIComponent(q));
     setItems(b.items||[]);
   }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت پذیرندگان");}
   finally{setLoading(false);}
 };
 useEffect(()=>{load()},[q]);
 const set=(k:string,v:string)=>setForm(x=>({...x,[k]:v}));
 const reset=()=>{setEditingId(null);setForm({code:"",legalName:"",displayName:"",businessType:"company",nationalId:"",taxId:"",iban:"",settlementAccountRef:"",contractRef:"",commissionRate:"0"});};
 const save=async()=>{
   if(!form.code.trim()||!form.legalName.trim()||!form.displayName.trim())return setError("کد، نام حقوقی و نام نمایشی الزامی است.");
   setSaving(true);setError("");
   try{
     await api("/api/merchants"+(editingId?"/"+editingId:""),{method:editingId?"PATCH":"POST",body:JSON.stringify(form)});
     reset();await load();
   }catch(e){setError(e instanceof Error?e.message:"خطا در ذخیره");}
   finally{setSaving(false);}
 };
 const edit=(m:Merchant)=>{setEditingId(m.id);setForm({code:m.code,legalName:m.legal_name,displayName:m.display_name,businessType:m.business_type,nationalId:m.national_id||"",taxId:m.tax_id||"",iban:m.iban||"",settlementAccountRef:m.settlement_account_ref||"",contractRef:m.contract_ref||"",commissionRate:String(m.commission_rate)});window.scrollTo({top:0,behavior:"smooth"});};
 const mutate=async(path:string,body:Record<string,string>)=>{
   setError("");
   await api(path,{method:path.endsWith("/verify")?"POST":"PATCH",body:JSON.stringify(body)});
   await load();
 };
 const verify=async(id:string,decision:"approve"|"reject")=>{
   try{await mutate("/api/merchants/"+id+"/verify",{decision,reason:decision==="approve"?"تأیید توسط کاربر مجاز":""});}catch(e){setError(e instanceof Error?e.message:"خطا در احراز");}
 };
 return <main className="module-runtime canonical-module" dir="rtl">
  <header className="page-head">
   <div><span className="eyebrow">پنل ۱۱ · منوی مرکزی سازمان</span><h1>پذیرندگان</h1><p className="muted">مدیریت واقعی پذیرندگان، احراز، قرارداد، نرخ کارمزد و مرجع تسویه. داده‌ها مستقیم از PostgreSQL خوانده می‌شوند.</p></div>
   <a className="back-link" href="/admin">مرکز مدیریت</a>
  </header>
  {error&&<div className="error runtime-error">{error}</div>}
  <section className="runtime-panel">
   <div className="panel-title"><div><h2>{editingId?"ویرایش پذیرنده":"ثبت پذیرنده"}</h2><span>اطلاعات هویتی و مالی بدون نگهداری اسرار در کد</span></div></div>
   <div className="control-grid">
    <label>کد پذیرنده<input value={form.code} disabled={!!editingId} onChange={e=>set("code",e.target.value)}/></label>
    <label>نام حقوقی<input value={form.legalName} onChange={e=>set("legalName",e.target.value)}/></label>
    <label>نام نمایشی<input value={form.displayName} onChange={e=>set("displayName",e.target.value)}/></label>
    <label>نوع<select value={form.businessType} onChange={e=>set("businessType",e.target.value)}><option value="company">شرکت</option><option value="individual">شخص</option><option value="organization">سازمان</option></select></label>
    <label>شناسه ملی<input value={form.nationalId} onChange={e=>set("nationalId",e.target.value)}/></label>
    <label>شناسه مالیاتی<input value={form.taxId} onChange={e=>set("taxId",e.target.value)}/></label>
    <label>شبا<input value={form.iban} onChange={e=>set("iban",e.target.value)}/></label>
    <label>مرجع حساب تسویه<input value={form.settlementAccountRef} onChange={e=>set("settlementAccountRef",e.target.value)}/></label>
    <label>مرجع قرارداد<input value={form.contractRef} onChange={e=>set("contractRef",e.target.value)}/></label>
    <label>نرخ کارمزد ٪<input type="number" min="0" max="100" step="0.01" value={form.commissionRate} onChange={e=>set("commissionRate",e.target.value)}/></label>
   </div>
   <div className="command-bar"><button type="button" onClick={save} disabled={saving}>{saving?"در حال ذخیره…":editingId?"ذخیره تغییرات":"ثبت پذیرنده"}</button>{editingId&&<button type="button" onClick={reset}>انصراف</button>}</div>
  </section>
  <section className="runtime-panel">
   <div className="panel-title"><div><h2>فهرست پذیرندگان</h2><span>{items.length} رکورد واقعی در محدوده سازمانی فعلی</span></div><input aria-label="جست‌وجو" placeholder="جست‌وجوی کد، نام یا شناسه ملی" value={q} onChange={e=>setQ(e.target.value)}/></div>
   {loading?<p className="muted">در حال دریافت...</p>:items.length===0?<p className="muted">پذیرنده‌ای ثبت نشده است.</p>:<div className="record-list">
    {items.map(m=><article className="record-row" key={m.id}>
      <div><strong>{m.display_name}</strong><small>{m.code} · {m.legal_name} · کارمزد {m.commission_rate}%</small><small><CanonicalPartyReference partyId={m.party_id} title={m.canonical_party_title}/></small><small>وضعیت: {statusLabel[m.status]||m.status} · احراز: {verifyLabel[m.verification_status]||m.verification_status}</small></div>
      <div className="command-bar"><button type="button" onClick={()=>edit(m)}>ویرایش</button>{m.verification_status==="pending"&&<><button type="button" onClick={()=>verify(m.id,"approve")}>تأیید</button><button type="button" onClick={()=>verify(m.id,"reject")}>رد</button></>}<select value={m.status} onChange={e=>mutate("/api/merchants/"+m.id+"/status",{status:e.target.value}).catch(x=>setError(x instanceof Error?x.message:"خطا"))}><option value="pending">در انتظار</option><option value="review">در بررسی</option><option value="active">فعال</option><option value="suspended">تعلیق‌شده</option><option value="rejected">ردشده</option><option value="closed">بسته</option></select></div>
    </article>)}
   </div>}
  </section>
 </main>;
}
