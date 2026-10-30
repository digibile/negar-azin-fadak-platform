"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {api} from "../../lib/api";
import styles from "./profile.module.css";

type Profile={id:string;email:string;full_name:string|null;national_id:string|null;role:string;status:string};
type RequestItem={id:string;proposed_values:Record<string,unknown>;reason:string;status:string;review_note?:string|null;created_at:string;reviewed_at?:string|null};
type Provenance={field_key:string;source_type:string;source_reference?:string|null;verified_at?:string|null};

const statusLabel=(s:string)=>s==="pending"?"در انتظار بررسی":s==="approved"?"تأییدشده":s==="rejected"?"ردشده":s;

export default function ProfilePage(){
 const [profile,setProfile]=useState<Profile|null>(null);
 const [requests,setRequests]=useState<RequestItem[]>([]);
 const [provenance,setProvenance]=useState<Provenance[]>([]);
 const [fullName,setFullName]=useState("");
 const [nationalId,setNationalId]=useState("");
 const [reason,setReason]=useState("");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(""),[message,setMessage]=useState("");

 async function load(){
  setLoading(true);setError("");
  try{
   const [p,r]=await Promise.all([
    api<{user:Profile;provenance:Provenance[]}>("/api/identity/profile"),
    api<{items:RequestItem[]}>("/api/identity/profile-change-requests")
   ]);
   setProfile(p.user);setProvenance(p.provenance||[]);setRequests(r.items||[]);
   setFullName(p.user.full_name||"");setNationalId(p.user.national_id||"");
  }catch(e){setError(e instanceof Error?e.message:"دریافت پروفایل ناموفق بود");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load()},[]);

 async function submit(e:React.FormEvent){
  e.preventDefault();setSaving(true);setError("");setMessage("");
  try{
   const body={fullName,nationalId,reason};
   await api("/api/identity/profile-change-requests",{method:"POST",body:JSON.stringify(body)});
   setReason("");setMessage("درخواست اصلاح اطلاعات ثبت شد و تا زمان تأیید مدیر، اطلاعات اصلی حساب تغییر نمی‌کند.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"ثبت درخواست ناموفق بود");}
  finally{setSaving(false);}
 }
 const pending=requests.some(x=>x.status==="pending");
 const sourceLabel=(s:string)=>s==="legacy_unknown"?"منشأ تاریخی نامشخص":s==="reviewer_approved"?"تأییدشده توسط بازبین":s==="provider_verified"?"تأییدشده توسط سرویس معتبر":s==="user_confirmed"?"تأییدشده توسط کاربر":s==="ocr_extracted"?"استخراج‌شده از OCR":"ورودی کاربر";
 return <main className={styles.page} dir="rtl">
  <header className={styles.header}><div><span>حساب کاربری · هویت مرکزی</span><h1>پروفایل من</h1><p>اطلاعات هویتی به‌صورت کنترل‌شده اصلاح می‌شود و تغییر قانونی بدون بررسی ثبت نهایی نخواهد شد.</p></div><Link href="/customer">بازگشت به داشبورد</Link></header>
  {error&&<div className={styles.error} role="alert">{error}</div>}{message&&<div className={styles.success}>{message}</div>}
  {loading?<section className={styles.panel}>در حال دریافت پروفایل...</section>:profile&&<>
   <section className={styles.panel}><div className={styles.panelHead}><div><small>اطلاعات فعلی</small><h2>{profile.full_name||"نام ثبت نشده"}</h2></div><span>{profile.email}</span></div><dl><div><dt>نام و نام خانوادگی</dt><dd>{profile.full_name||"ثبت نشده"}</dd></div><div><dt>کد ملی</dt><dd>{profile.national_id||"ثبت نشده"}</dd></div><div><dt>وضعیت حساب</dt><dd>{profile.status==="active"?"فعال":profile.status}</dd></div></dl></section>
   <section className={styles.panel}><div className={styles.panelHead}><div><small>درخواست تغییر اطلاعات</small><h2>درخواست اصلاح پروفایل</h2></div>{pending&&<span className={styles.pending}>یک درخواست در انتظار بررسی</span>}</div>
    <form onSubmit={submit} className={styles.form}>
     <label>نام و نام خانوادگی<input value={fullName} maxLength={160} onChange={e=>setFullName(e.target.value)} required/></label>
     <label>کد ملی<input value={nationalId} inputMode="numeric" maxLength={10} onChange={e=>setNationalId(e.target.value)} placeholder="۱۰ رقم کد ملی"/></label>
     <label className={styles.full}>دلیل اصلاح اطلاعات<textarea value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={1000} rows={3} required placeholder="علت اصلاح و در صورت نیاز توضیح مدرک پشتیبان"/></label>
     <button disabled={saving||pending}>{saving?"در حال ثبت...":"ارسال برای بررسی مدیر"}</button>
     <p className={styles.note}>تغییرات پس از تأیید مدیر در اطلاعات اصلی اعمال می‌شوند. درخواست‌های قبلی و منشأ هر فیلد برای ممیزی نگهداری می‌شود.</p>
    </form>
   </section>
   <section className={styles.panel}><h2>منشأ اطلاعات هویتی</h2><div className={styles.list}>{provenance.map(p=><article key={p.field_key}><b>{p.field_key==="full_name"?"نام و نام خانوادگی":"کد ملی"}</b><span>{sourceLabel(p.source_type)}</span><small>{p.verified_at?new Date(p.verified_at).toLocaleString("fa-IR"):"زمان تأیید ثبت نشده"}</small></article>)}{!provenance.length&&<p>برای فیلدهای فعلی هنوز سابقه منشأ ثبت نشده است.</p>}</div></section>
   <section className={styles.panel}><h2>تاریخچه درخواست‌ها</h2><div className={styles.list}>{requests.map(r=><article key={r.id}><div><b>{statusLabel(r.status)}</b><small>{new Date(r.created_at).toLocaleString("fa-IR")}</small><small>{r.reason}</small>{r.review_note&&<small>یادداشت مدیر: {r.review_note}</small>}</div><span>{r.proposed_values.fullName?("نام: "+String(r.proposed_values.fullName)):""} {r.proposed_values.nationalId!==undefined?("کد ملی: "+String(r.proposed_values.nationalId||"حذف‌شده")):""}</span></article>)}{!requests.length&&<p>درخواستی ثبت نشده است.</p>}</div></section>
  </>}
 </main>;
}
