"use client";

import {useEffect,useState} from "react";
import AttachmentCapture from "./AttachmentCapture";
import VoiceInput from "../components/VoiceInput";
import styles from "./documents-center.module.css";

type Binder={id:string;binder_no:string;title:string;owner_ref?:string|null};

export default function DocumentsCenter(){
 const [binders,setBinders]=useState<Binder[]>([]),[binderId,setBinderId]=useState(""),[q,setQ]=useState(""),[note,setNote]=useState(""),[message,setMessage]=useState("");
 useEffect(()=>{
  fetch("/api/enterprise/binders",{credentials:"include"}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(b=>setBinders(b.items||[])).catch(()=>setBinders([]));
 },[]);
 const filtered=binders.filter(x=>(x.title+" "+x.binder_no).toLowerCase().includes(q.toLowerCase()));
 return <main dir="rtl" className="command-page">
  <header className="command-hero"><div><span className="eyebrow">حاکمیت اسناد و پرونده دیجیتال</span><h1>مرکز اسناد و زونکن دیجیتال</h1><p>یک نقطه امن برای سند، تصویر، PDF، توضیح صوتی، OCR، نسخه‌گذاری، دسترسی و ردپای حسابرسی. سند فقط «آپلود» نمی‌شود، وارد چرخه عمر خودش می‌شود.</p></div><a className="command-link" href="/">منوی مرکزی سازمان</a></header>

  <section className="control-summary"><div><b>{binders.length}</b><span>زونکن‌های قابل دسترس</span></div><div><b>WebP</b><span>فشرده‌سازی تصویر در سمت کاربر</span></div><div><b>OCR</b><span>پردازش خودکار و قابل رهگیری</span></div></section>

  <section className={styles.capture}>
   <div className={styles.captureHead}><div><span>ثبت سند در زونکن واقعی</span><h2>اول زونکن را انتخاب کن، بعد اسکن کن</h2><p>هیچ داده نمایشی ساختگی نیست. سند به پرونده انتخاب‌شده لینک می‌شود و وضعیت پردازش آن قابل پیگیری است.</p></div></div>
   <label style={{display:"grid",gap:8,marginTop:16,fontSize:12,color:"#475467"}}>زونکن دیجیتال
    <select value={binderId} onChange={e=>setBinderId(e.target.value)} style={{padding:11,borderRadius:10,border:"1px solid #dfe5ed",background:"#fff"}}>
     <option value="">انتخاب زونکن...</option>{binders.map(b=><option key={b.id} value={b.id}>{b.title} · {b.binder_no}</option>)}
    </select>
   </label>
   <AttachmentCapture entityType="digital_binder" entityId={binderId||undefined} onUploaded={x=>setMessage("سند «"+x.original_name+"» ثبت شد و پردازش OCR آن در صف قرار گرفت.")}/>
   {message&&<div className={styles.progress} role="status">{message}</div>}
  </section>

  <section className={styles.capture}>
   <div className={styles.captureHead}><div><span>ورودی کم‌خطا</span><h2>توضیحات را هم می‌توان گفت</h2><p>برای نماینده‌ای که تایپ برایش سخت است، توضیحات را با صدای فارسی وارد کن. همین الگو در فرم‌های ثبت، فروش، حسابداری و پشتیبانی قابل استفاده است.</p></div><VoiceInput value={note} onChange={setNote}/></div>
   <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="توضیح سند، علت، شرح معامله یا یادداشت..." style={{marginTop:14,minHeight:110,padding:13,borderRadius:12,border:"1px solid #dfe5ed",resize:"vertical"}}/>
  </section>

  <section className="control-grid" style={{marginTop:18}}>
   {[
    ["۱","ثبت منبع","دوربین، اسکنر سیستم، PDF، تصویر یا صوت"],
    ["۲","فشرده‌سازی","تصاویر قابل فشرده‌سازی قبل از ارسال، بدون پایین آوردن بی‌دلیل کیفیت"],
    ["۳","OCR","استخراج متن و داده با وضعیت queued / processing / completed / needs review"],
    ["۴","ردپای حسابرسی","ثبت کاربر، زمان، تغییر وضعیت و ارتباط سند با موجودیت اصلی"],
    ["۵","بازیابی","مشاهده، دانلود و اتصال دوباره سند به فاکتور، پرداخت، قرارداد یا پرونده"],
    ["۶","اتوماسیون","صف پیام، خروجی، OCR و چرخه وضعیت برای حذف کار دستی تکراری"]
   ].map(x=><article className="control-card" key={x[0]}><div><span>{x[0]}</span><h2>{x[1]}</h2><small>{x[2]}</small></div></article>)}
  </section>

  <section style={{marginTop:28}}>
   <header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><span className="eyebrow">پرونده‌های موجود</span><h2 style={{fontSize:20,margin:"7px 0"}}>زونکن‌ها</h2></div><input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجو..." style={{maxWidth:320}}/></header>
   <div className="control-grid" style={{marginTop:14}}>{filtered.map(b=><a key={b.id} className="control-card" href={"/modules/?code=digital-binder&record="+encodeURIComponent(b.id)}><div><span>{b.binder_no}</span><h2>{b.title}</h2><small>{b.owner_ref||"بدون مالک مرجع"}</small></div><strong>›</strong></a>)}</div>
  </section>
 </main>;
}
