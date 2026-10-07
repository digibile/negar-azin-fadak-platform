"use client";

import {useRef,useState} from "react";
import styles from "./documents-center.module.css";

type Props={entityType?:string;entityId?:string;onUploaded?:(item:any)=>void};

async function compressImage(file:File){
  if(!file.type.startsWith("image/")) return {blob:file,mime:file.type,originalSize:file.size};
  const bitmap=await createImageBitmap(file);
  const max=1800;
  const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext("2d");if(!ctx)return {blob:file,mime:file.type,originalSize:file.size};
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/webp",.82));
  return blob?{blob,mime:"image/webp",originalSize:file.size}:{blob:file,mime:file.type,originalSize:file.size};
}

function csrf(){return document.cookie.split("; ").find(x=>x.startsWith("naf_csrf="))?.split("=")[1]||""}

export default function AttachmentCapture({entityType,entityId,onUploaded}:Props){
 const input=useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(""),[error,setError]=useState("");
 const upload=async(file:File)=>{
  setError("");setBusy(true);setProgress("در حال آماده‌سازی و فشرده‌سازی...");
  try{
   const normalized=await compressImage(file);
   const reader=new FileReader();
   const data=await new Promise<string>((resolve,reject)=>{reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(normalized.blob)});
   setProgress("در حال ثبت امن سند...");
   const r=await fetch("/api/enterprise/attachments",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},body:JSON.stringify({
    fileName:file.name,mimeType:file.type||"application/octet-stream",normalizedMime:normalized.mime,originalSizeBytes:normalized.originalSize,data,
    entityType,entityId,requestOcr:file.type.startsWith("image/"),languageHint:"fa"
   })});
   const body=await r.json();if(!r.ok)throw new Error(body.error||"ثبت سند ناموفق بود");
   setProgress("سند ثبت شد؛ پردازش OCR در صف قرار گرفت.");
   onUploaded?.(body);
  }catch(e){setError(e instanceof Error?e.message:"خطا در بارگذاری سند");setProgress("")}
  finally{setBusy(false)}
 };
 return <section className={styles.capture}>
  <div className={styles.captureHead}><div><span>ثبت بدون تایپ</span><h2>اسکن، عکس، PDF یا صدای توضیح</h2><p>دوربین موبایل یا فایل سیستم را انتخاب کنید. تصویر در مرورگر به WebP کم‌حجم تبدیل می‌شود و متن OCR به‌صورت خودکار وارد صف پردازش می‌شود.</p></div><button disabled={busy} onClick={()=>input.current?.click()}>{busy?"در حال پردازش…":"افزودن سند"}</button></div>
  <div className={styles.drop} onClick={()=>input.current?.click()} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")input.current?.click()}}>
   <div className={styles.camera}>⌁</div><strong>دوربین یا انتخاب فایل</strong><span>تصویر، PDF و فایل صوتی</span><small>برای موبایل، دوربین دستگاه نیز قابل استفاده است.</small>
  </div>
  <input ref={input} hidden type="file" accept="image/*,.pdf,audio/*" capture="environment" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f);e.currentTarget.value=""}}/>
  {progress&&<div className={styles.progress} role="status">{progress}</div>}
  {error&&<div className={styles.error} role="alert">{error}</div>}
 </section>;
}
