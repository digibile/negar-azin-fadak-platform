"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {api} from "../../../lib/api";

type Run={id:number;status:string;conclusion:string|null;sha:string;createdAt:string;updatedAt:string;url:string};
type Status={configured:boolean;repository:string;workflow:string;workflowState?:string;mainSha?:string|null;deployedSha?:string|null;updateAvailable?:boolean;runs?:Run[]};

export default function UpdatesPage(){
 const [status,setStatus]=useState<Status|null>(null);
 const [loading,setLoading]=useState(true);
 const [updating,setUpdating]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");

 const load=useCallback(async()=>{
  try{setError("");setStatus(await api<Status>("/api/platform/update-status"))}
  catch(e){setError(e instanceof Error?e.message:"خطا در دریافت وضعیت بروزرسانی")}
  finally{setLoading(false)}
 },[]);

 useEffect(()=>{load()},[load]);
 useEffect(()=>{const id=window.setInterval(()=>{if(status?.runs?.some(x=>["queued","in_progress","waiting","requested","pending"].includes(x.status)))load()},5000);return()=>window.clearInterval(id)},[status,load]);

 async function update(){
  if(updating)return;
  setUpdating(true);setMessage("");setError("");
  try{
   const r=await api<{message:string}>("/api/platform/update",{method:"POST"});
   setMessage(r.message||"درخواست بروزرسانی ثبت شد.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"بروزرسانی انجام نشد")}
  finally{setUpdating(false)}
 }

 const active=status?.runs?.find(x=>["queued","in_progress","waiting","requested","pending"].includes(x.status));
 const latest=status?.runs?.[0];

 return <main className="platform-update-page">
  <div className="platform-update-head">
   <div>
    <span className="section-kicker">PLATFORM LIFECYCLE · 2026</span>
    <h2>نسخه و بروزرسانی سامانه</h2>
    <p>نسخه منتشرشده از GitHub کنترل می‌شود. قبل از نصب، نسخه فعلی و پشتیبان پایگاه داده حفظ می‌شود.</p>{status?.updateAvailable&&<div className="update-badge online">نسخه جدید آماده نصب است</div>}
   </div>
   <Link className="admin-link" href="/admin">بازگشت به مرکز مدیریت</Link>
  </div>

  {error&&<div className="error">{error}</div>}
  {message&&<div className="update-success">{message}</div>}

  <section className="update-grid">
   <article className="update-card update-main-card">
    <div className="update-card-top"><span className="update-icon">↻</span><span className={status?.configured?"update-badge online":"update-badge"}>{status?.configured?"اتصال GitHub فعال":"نیازمند تنظیم اتصال"}</span></div>
    <h3>بروزرسانی مرکزی</h3>
    <p>با یک عملیات، آخرین commit شاخه اصلی پس از عبور از بررسی‌های Build و Test روی مقصد نصب می‌شود.</p>
    <button className="update-button" disabled={!status?.configured||Boolean(active)||updating} onClick={update}>
      {updating||active?"در حال بروزرسانی...":"بررسی و بروزرسانی"}
    </button>
    <small>نسخه قبلی با برچسب immutable نگهداری می‌شود و نسخه جدید بدون حذف داده‌های PostgreSQL نصب می‌شود.</small>
   </article>

   <article className="update-card">
    <span className="update-label">مخزن</span>
    <strong>{status?.repository||"digibile/negar-azin-fadak-platform"}</strong>
    <span className="update-label">نسخه نصب‌شده</span><code>{status?.deployedSha?.slice(0,12)||"در حال شناسایی"}</code><span className="update-label">آخرین نسخه GitHub</span><code>{status?.mainSha?.slice(0,12)||"در حال بررسی"}</code><span className="update-label">Workflow</span>
    <strong>{status?.workflow||"update.yml"}</strong>
    <span className="update-label">وضعیت Workflow</span>
    <strong>{status?.workflowState||"در حال بررسی"}</strong>
   </article>

   <article className="update-card">
    <span className="update-label">آخرین اجرای بروزرسانی</span>
    {latest?<><strong>{latest.status}{latest.conclusion ? " · "+latest.conclusion : ""}</strong><code>{latest.sha.slice(0,12)}</code><a href={latest.url} target="_blank" rel="noreferrer">مشاهده اجرای GitHub ↗</a></>:<strong>هنوز اجرایی ثبت نشده</strong>}
   </article>
  </section>

  {!status?.configured&&!loading&&<section className="update-note">
   <b>اتصال یک‌باره لازم است</b>
   <p>برای امنیت، کلید GitHub داخل کد یا PostgreSQL ذخیره نمی‌شود. سرویس API باید یک GitHub token با دسترسی Actions داشته باشد. پس از تنظیم آن، همین دکمه اجرای بروزرسانی را از داخل پنل مدیریت آغاز می‌کند.</p>
  </section>}

  {active&&<section className="update-note active-note">بروزرسانی در حال اجراست. پنل وضعیت GitHub را از همین صفحه دنبال می‌کند.</section>}
 </main>;
}
