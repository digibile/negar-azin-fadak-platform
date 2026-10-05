"use client";

import {useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import styles from "./AccountingWorkspace.module.css";

type Book={id:string;code:string;title:string;book_mode:"official"|"internal"|"hybrid";currency:string;fiscal_year:number|null;is_default:boolean;status:string};
type Account={id:string;code:string;name:string;account_type:string;account_mode:"official"|"internal"|"hybrid";book_id:string|null;book_code?:string;book_title?:string;external_code?:string|null};
const api=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const url=(p:string)=>api+p;
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";

async function request<T>(path:string,options:RequestInit={}):Promise<T>{
 const r=await fetch(url(path),{credentials:"include",...options,headers:{"Content-Type":"application/json","X-CSRF-Token":csrf(),...(options.headers||{})}});
 const b=await r.json().catch(()=>null); if(!r.ok)throw new Error(b?.error||"عملیات حسابداری ناموفق بود"); return b;
}

export default function AccountingWorkspace(){
 const searchParams=useSearchParams();
 const [tab,setTab]=useState<"books"|"accounts"|"transfer">("books");
 useEffect(()=>{const t=searchParams.get("tab") as "books"|"accounts"|"transfer"|null;if(t&&["books","accounts","transfer"].includes(t))setTab(t)},[searchParams]);
 const [books,setBooks]=useState<Book[]>([]); const [accounts,setAccounts]=useState<Account[]>([]);
 const [book,setBook]=useState({code:"",title:"",bookMode:"hybrid",currency:"IRR",fiscalYear:"",isDefault:false});
 const [account,setAccount]=useState({code:"",name:"",accountType:"general",accountMode:"hybrid",bookId:"",externalCode:""});
 const [transfer,setTransfer]=useState({sourceAccountId:"",targetAccountId:"",transferType:"reclassify",amount:"",reason:""});
 const [error,setError]=useState(""); const [saving,setSaving]=useState(false);

 const load=async()=>{try{const [b,a]=await Promise.all([request<{items:Book[]}>("/api/accounting/books"),request<{items:Account[]}>("/api/accounting/accounts")]);setBooks(b.items||[]);setAccounts(a.items||[])}catch(e){setError(e instanceof Error?e.message:"خطا در دریافت حسابداری")}};
 useEffect(()=>{load()},[searchParams]);

 const saveBook=async()=>{setSaving(true);setError("");try{await request("/api/accounting/books",{method:"POST",body:JSON.stringify({...book,fiscalYear:book.fiscalYear?Number(book.fiscalYear):null})});setBook({code:"",title:"",bookMode:"hybrid",currency:"IRR",fiscalYear:"",isDefault:false});await load()}catch(e){setError(e instanceof Error?e.message:"خطا")}finally{setSaving(false)}};
 const saveAccount=async()=>{setSaving(true);setError("");try{await request("/api/accounting/accounts",{method:"POST",body:JSON.stringify({...account,bookId:account.bookId||null,externalCode:account.externalCode||null})});setAccount({code:"",name:"",accountType:"general",accountMode:"hybrid",bookId:"",externalCode:""});await load()}catch(e){setError(e instanceof Error?e.message:"خطا")}finally{setSaving(false)}};
 const doTransfer=async()=>{setSaving(true);setError("");try{await request("/api/accounting/accounts/transfer",{method:"POST",body:JSON.stringify({...transfer,amount:Number(transfer.amount)})});setTransfer({sourceAccountId:"",targetAccountId:"",transferType:"reclassify",amount:"",reason:""});await load();setTab("accounts")}catch(e){setError(e instanceof Error?e.message:"خطا")}finally{setSaving(false)}};

 const mode=(m:string)=>m==="official"?"رسمی":m==="internal"?"غیررسمی":"ترکیبی";
 return <main className={styles.workspace} dir="rtl">
  <header className={styles.header}><div><span>هسته مالی</span><h1>مرکز حسابداری</h1><p>دفاتر رسمی، حساب‌های داخلی و ساختار ترکیبی با قابلیت نگاشت و جابجایی کنترل‌شده اطلاعات.</p></div><div className={styles.badge}>{books.length} دفتر · {accounts.length} حساب</div></header>
  {error&&<div className={styles.error}>{error}</div>}
  <nav className={styles.tabs}><button className={tab==="books"?styles.active:""} onClick={()=>setTab("books")}>دفاتر حسابداری</button><button className={tab==="accounts"?styles.active:""} onClick={()=>setTab("accounts")}>حساب‌ها</button><button className={tab==="transfer"?styles.active:""} onClick={()=>setTab("transfer")}>جابجایی و نگاشت</button></nav>

  {tab==="books"&&<section className={styles.grid}>
   <article className={styles.panel}><h2>ایجاد دفتر حسابداری</h2><div className={styles.form}>
    <label>کد دفتر<input value={book.code} onChange={e=>setBook({...book,code:e.target.value})}/></label>
    <label>عنوان دفتر<input value={book.title} onChange={e=>setBook({...book,title:e.target.value})}/></label>
    <label>نوع دفتر<select value={book.bookMode} onChange={e=>setBook({...book,bookMode:e.target.value})}><option value="official">رسمی</option><option value="internal">غیررسمی</option><option value="hybrid">ترکیبی</option></select></label>
    <label>ارز<input value={book.currency} onChange={e=>setBook({...book,currency:e.target.value})}/></label>
    <label>سال مالی<input type="number" value={book.fiscalYear} onChange={e=>setBook({...book,fiscalYear:e.target.value})}/></label>
    <label className={styles.check}><input type="checkbox" checked={book.isDefault} onChange={e=>setBook({...book,isDefault:e.target.checked})}/> دفتر پیش‌فرض</label>
    <button className={styles.primary} disabled={saving||!book.code||!book.title} onClick={saveBook}>{saving?"در حال ثبت...":"ایجاد دفتر"}</button>
   </div></article>
   <article className={styles.panel}><h2>دفاتر موجود</h2><div className={styles.list}>{books.map(b=><div className={styles.row} key={b.id}><div><strong>{b.title}</strong><small>{b.code} · {mode(b.book_mode)} · {b.currency}</small></div>{b.is_default&&<span className={styles.pill}>پیش‌فرض</span>}</div>)}{!books.length&&<div className={styles.empty}>هنوز دفتری ایجاد نشده است.</div>}</div></article>
  </section>}

  {tab==="accounts"&&<section className={styles.grid}>
   <article className={styles.panel}><h2>ایجاد حساب</h2><div className={styles.form}>
    <label>کد حساب<input value={account.code} onChange={e=>setAccount({...account,code:e.target.value})}/></label>
    <label>نام حساب<input value={account.name} onChange={e=>setAccount({...account,name:e.target.value})}/></label>
    <label>نوع حساب<input value={account.accountType} onChange={e=>setAccount({...account,accountType:e.target.value})}/></label>
    <label>ماهیت حساب<select value={account.accountMode} onChange={e=>setAccount({...account,accountMode:e.target.value})}><option value="official">رسمی</option><option value="internal">غیررسمی</option><option value="hybrid">ترکیبی</option></select></label>
    <label>دفتر<select value={account.bookId} onChange={e=>setAccount({...account,bookId:e.target.value})}><option value="">بدون دفتر مشخص</option>{books.map(b=><option key={b.id} value={b.id}>{b.code} · {b.title} · {mode(b.book_mode)}</option>)}</select></label>
    <label>کد خارجی / متناظر<input value={account.externalCode} onChange={e=>setAccount({...account,externalCode:e.target.value})}/></label>
    <button className={styles.primary} disabled={saving||!account.code||!account.name} onClick={saveAccount}>{saving?"در حال ثبت...":"ایجاد حساب"}</button>
   </div></article>
   <article className={styles.panel}><h2>ساختار حساب‌ها</h2><div className={styles.list}>{accounts.map(a=><div className={styles.row} key={a.id}><div><strong>{a.code} · {a.name}</strong><small>{mode(a.account_mode)} · {a.book_title||"بدون دفتر"}{a.external_code?" · "+a.external_code:""}</small></div><button className={styles.link} onClick={()=>{setTransfer({...transfer,sourceAccountId:a.id});setTab("transfer")}}>جابجایی</button></div>)}{!accounts.length&&<div className={styles.empty}>هنوز حسابی ایجاد نشده است.</div>}</div></article>
  </section>}

  {tab==="transfer"&&<section className={styles.panelWide}><h2>جابجایی اطلاعات و مانده بین حساب‌ها</h2><p className={styles.note}>جابجایی «طبقه‌بندی» برای انتقال مبلغ واقعی، یک سند دفترکل متوازن ایجاد می‌کند. «کپی» و «نگاشت» فقط رابطه و اطلاعات انتقالی را ثبت می‌کنند.</p>
   <div className={styles.transferGrid}>
    <label>حساب مبدأ<select value={transfer.sourceAccountId} onChange={e=>setTransfer({...transfer,sourceAccountId:e.target.value})}><option value="">انتخاب حساب</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.code} · {a.name} · {mode(a.account_mode)}</option>)}</select></label>
    <label>حساب مقصد<select value={transfer.targetAccountId} onChange={e=>setTransfer({...transfer,targetAccountId:e.target.value})}><option value="">انتخاب حساب</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.code} · {a.name} · {mode(a.account_mode)}</option>)}</select></label>
    <label>نوع عملیات<select value={transfer.transferType} onChange={e=>setTransfer({...transfer,transferType:e.target.value})}><option value="reclassify">جابجایی / طبقه‌بندی</option><option value="move">انتقال</option><option value="copy">کپی اطلاعات</option><option value="map">نگاشت حساب</option></select></label>
    <label>مبلغ<input type="number" min="0" value={transfer.amount} onChange={e=>setTransfer({...transfer,amount:e.target.value})}/></label>
    <label className={styles.full}>دلیل / شرح<input value={transfer.reason} onChange={e=>setTransfer({...transfer,reason:e.target.value})}/></label>
   </div>
   <button className={styles.primary} disabled={saving||!transfer.sourceAccountId||!transfer.targetAccountId||transfer.sourceAccountId===transfer.targetAccountId} onClick={doTransfer}>{saving?"در حال ثبت...":"ثبت جابجایی"}</button>
  </section>}
 </main>;
}
