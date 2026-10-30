"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {api} from "../../../lib/api";
import styles from "./identity-documents.module.css";

type Application={id:string;application_no:string;product_code:string;status:string};
type DocumentItem={id:string;original_name:string;mime_type:string;size_bytes:number;ocr_status:string;created_at:string;document_type:string;application_no:string;application_id:string};

const types=[
 ["national-id-front","روی کارت ملی"],
 ["national-id-back","پشت کارت ملی"],
 ["birth-certificate","شناسنامه"],
 ["passport","گذرنامه"],
 ["address-proof","مدرک نشانی"],
 ["other","سایر مدارک"]
];

export default function CustomerIdentityDocumentsPage(){
 const [applications,setApplications]=useState<Application[]>([]);
 const [items,setItems]=useState<DocumentItem[]>([]);
 const [applicationId,setApplicationId]=useState("");
 const [documentType,setDocumentType]=useState("national-id-front");
 const [documentNumber,setDocumentNumber]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(""),[message,setMessage]=useState("");

 async function load(){
  setLoading(true);setError("");
  try{
   const [a,d]=await Promise.all([api<{items:Application[]}>("/api/lendtech/my-applications"),api<{items:DocumentItem[]}>("/api/lendtech/my-documents")]);
   setApplications(a.items||[]);setItems(d.items||[]);
   setApplicationId(current=>current||(a.items?.[0]?.id||""));
  }catch(e){setError(e instanceof Error?e.message:"دریافت مدارک ناموفق بود");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load()},[]);

 async function upload(){
  if(!applicationId)return setError("ابتدا پرونده اعتباری خود را انتخاب کنید.");
  if(!file)return setError("فایل مدرک را انتخاب کنید.");
  if(file.size>10*1024*1024)return setError("حجم فایل باید حداکثر ۱۰ مگابایت باشد.");
  setSaving(true);setError("");setMessage("");
  try{
   const data=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);
   });
   await api("/api/lendtech/my-documents",{method:"POST",body:JSON.stringify({applicationId,documentType,documentNumber,fileName:file.name,originalSizeBytes:file.size,data})});
   setFile(null);setDocumentNumber("");setMessage("مدرک به پرونده انتخاب‌شده پیوست شد و برای بررسی اپراتور ثبت شد.");
   const input=document.getElementById("identity-document-file") as HTMLInputElement|null;if(input)input.value="";
   await load();
  }catch(e){setError(e instanceof Error?e.message:"ثبت مدرک ناموفق بود");}
  finally{setSaving(false);}
 }

 const label=(key:string)=>types.find(x=>x[0]===key)?.[1]||"سایر مدارک";
 return <main className={styles.page} dir="rtl">
  <header className={styles.header}>
   <div><span>پروفایل مشتری · مدارک</span><h1>مدارک هویتی و پرونده‌های من</h1><p>مدارک مستقیماً به پرونده اعتباری متعلق به حساب شما متصل می‌شوند. دسترسی دانلود نیز فقط برای صاحب همان پرونده مجاز است.</p></div>
   <Link href="/customer">بازگشت به داشبورد</Link>
  </header>
  {error&&<div className={styles.error}>{error}</div>}
  {message&&<div className={styles.success}>{message}</div>}
  <section className={styles.panel}>
   <div className={styles.panelHead}><div><small>UPLOAD · SECURE</small><h2>ثبت مدرک جدید</h2></div><span>PDF / JPG / PNG / WEBP · حداکثر ۱۰ مگابایت</span></div>
   {!applications.length&&!loading?<div className={styles.empty}>برای حساب شما پرونده اعتباری فعالی پیدا نشد. ابتدا درخواست اعتبار ثبت کنید.</div>:<div className={styles.form}>
    <label>پرونده اعتباری<select value={applicationId} onChange={e=>setApplicationId(e.target.value)}><option value="">انتخاب پرونده</option>{applications.map(a=><option key={a.id} value={a.id}>{a.application_no} · {a.product_code} · {a.status}</option>)}</select></label>
    <label>نوع مدرک<select value={documentType} onChange={e=>setDocumentType(e.target.value)}>{types.map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label>
    <label>شماره مدرک (اختیاری)<input maxLength={60} value={documentNumber} onChange={e=>setDocumentNumber(e.target.value)} placeholder="در صورت نیاز"/></label>
    <label>فایل مدرک<input id="identity-document-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
    {file&&<div className={styles.fileInfo}>{file.name} · {(file.size/1024/1024).toFixed(2)} مگابایت</div>}
    <button disabled={saving||loading||!applicationId||!file} onClick={upload}>{saving?"در حال بارگذاری...":"ثبت امن مدرک"}</button>
   </div>}
  </section>
  <section className={styles.panel}>
   <div className={styles.panelHead}><div><small>MY DOCUMENTS</small><h2>مدارک ثبت‌شده</h2></div><button onClick={load} disabled={loading}>به‌روزرسانی</button></div>
   {loading?<div className={styles.empty}>در حال دریافت مدارک...</div>:items.length?<div className={styles.list}>{items.map(d=><article className={styles.row} key={d.id}>
    <div><strong>{label(d.document_type)}</strong><small>{d.application_no} · {d.original_name}</small><small>{new Date(d.created_at).toLocaleString("fa-IR")} · {(Number(d.size_bytes)/1024).toFixed(0)} کیلوبایت</small></div>
    <span>ثبت‌شده · در انتظار بررسی</span>
    <a href={"/api/lendtech/my-documents/"+d.id+"/file"}>دریافت فایل</a>
   </article>)}</div>:<div className={styles.empty}>هنوز مدرکی برای پرونده‌های شما ثبت نشده است.</div>}
  </section>
 </main>;
}
