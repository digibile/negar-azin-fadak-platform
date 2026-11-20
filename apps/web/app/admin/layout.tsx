"use client";

import {Suspense,useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {api} from "../../lib/api";
import AdminSidebar from "./AdminSidebar";
import AdminAppearance from "./AdminAppearance";
import styles from "./ExecutiveShell.module.css";

function CommandCenter(){
 const [open,setOpen]=useState(false),[query,setQuery]=useState("");
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setOpen(true)}if(e.key==="Escape")setOpen(false)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[]);
 const items=[["مرکز فرماندهی","/admin","نمای کلی و شاخص‌های سازمان"],["حسابداری و مالی","/modules/?code=08-accounting-finance","عملیات مالی و خزانه"],["مدیریت اسناد","/modules/?code=19-documents-governance","زونکن دیجیتال و حاکمیت اسناد"],["کاربران و دسترسی‌ها","/modules/?code=03-users-access","حساب‌ها، نقش‌ها و مجوزها"],["ویرایشگرهای سامانه","/admin/editors","مدیریت صفحه، فرم و منو"],["نسخه و بروزرسانی","/admin/updates","چرخه انتشار و نسخه‌ها"]].filter(x=>!query||x.join(" ").toLocaleLowerCase("fa-IR").includes(query.toLocaleLowerCase("fa-IR")));
 return <><button type="button" className={styles.commandTrigger} onClick={()=>setOpen(true)} aria-label="باز کردن جستجوی سریع"><span>⌕</span><b>جستجوی سریع</b><kbd>Ctrl K</kbd></button>{open&&<div className={styles.commandOverlay} role="dialog" aria-modal="true" onMouseDown={()=>setOpen(false)}><div className={styles.commandPalette} onMouseDown={e=>e.stopPropagation()}><div className={styles.commandHead}><div><small>مرکز مدیریت</small><b>فرمان سریع</b></div><button type="button" onClick={()=>setOpen(false)} aria-label="بستن">×</button></div><label className={styles.commandInput}><span>⌕</span><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="نام بخش یا عملیات را جستجو کنید..."/></label><div className={styles.commandResults}>{items.map(([title,href,desc])=><Link key={title} href={href} onClick={()=>setOpen(false)}><span className={styles.commandResultIcon}>↗</span><span><b>{title}</b><small>{desc}</small></span><kbd>↵</kbd></Link>)}{!items.length&&<div className={styles.commandEmpty}>نتیجه‌ای پیدا نشد.</div>}</div><footer><span>ESC بستن</span><span>Ctrl K جستجوی سریع</span></footer></div></div>}</>;
}

export default function AdminLayout({children}:{children:React.ReactNode}){
 const router=useRouter();
 async function logout(){try{await api("/api/auth/logout",{method:"POST"})}finally{router.replace("/login");router.refresh()}}
 return <div className={styles.shell} dir="rtl">
  <Suspense fallback={<aside className={styles.sidebarFallback} aria-hidden="true"/>}><AdminSidebar/></Suspense>
  <main className={styles.main}>
   <header className={styles.topbar}>
    <div className={styles.heading}><div className={styles.breadcrumb}><span>نگار آذین فدک</span><i>›</i><b>مرکز مدیریت</b></div><h1>مرکز مدیریت سازمان</h1><p>هسته مرکزی کسب‌وکار <span/> محیط مدیریتی یکپارچه</p></div>
    <div className={styles.actions}>
     <Link href="/admin/ai-workshop" className={styles.aiLink}><span>✳</span> کارگاه هوشمند</Link>
     <CommandCenter/>
     <AdminAppearance/>
     <button type="button" className={styles.userButton} title="خروج از حساب" onClick={logout}><span>ن</span><b>خروج</b></button>
    </div>
   </header>
   <div className={styles.content}>{children}</div>
  </main>
 </div>;
}
