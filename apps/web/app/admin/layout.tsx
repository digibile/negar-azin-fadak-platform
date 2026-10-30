"use client";

import {Suspense,useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {api} from "../../lib/api";
import AdminSidebar from "./AdminSidebar";
import AdminAppearance from "./AdminAppearance";

type TenantChoice={id:string;code:string;name:string};

function TenantSwitcher(){
 const [items,setItems]=useState<TenantChoice[]>([]);
 const [active,setActive]=useState("");
 useEffect(()=>{
  let alive=true;
  api<{items:TenantChoice[]}>("/api/tenants/available").then(result=>{
   if(!alive)return;
   const choices=result.items||[];
   setItems(choices);
   const stored=decodeURIComponent(document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_tenant_id="))?.slice("naf_tenant_id=".length)||"");
   setActive(choices.some(x=>x.id===stored)?stored:(choices[0]?.id||""));
  }).catch(()=>{});
  return()=>{alive=false};
 },[]);
 function change(id:string){
  setActive(id);
  const secure=window.location.protocol==="https:"?"; Secure":"";
  document.cookie=`naf_tenant_id=${encodeURIComponent(id)}; Path=/; Max-Age=2592000; SameSite=Lax${secure}`;
  window.location.reload();
 }
 if(!items.length)return null;
 return <label className="tenant-switcher-label"><span>سازمان فعال</span><select aria-label="انتخاب سازمان فعال" value={active} onChange={e=>change(e.target.value)}>{items.map(item=><option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select></label>;
}

function CommandCenter(){
 const [open,setOpen]=useState(false),[query,setQuery]=useState("");
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setOpen(true)}if(e.key==="Escape")setOpen(false)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[]);
 const items=[["مرکز فرماندهی","/admin","نمای کلی سامانه"],["حسابداری و مالی","/modules/","عملیات مالی و خزانه"],["مدیریت اسناد","/modules/","اسناد و حاکمیت"],["اعتبارات و تسهیلات","/modules/","اعتبار، وام و وصول"],["ویرایشگرهای سامانه","/admin/editors","فرم، صفحه و منو"],["نسخه و بروزرسانی","/admin/updates","چرخه انتشار امن"]].filter(x=>!query||x.join(" ").toLocaleLowerCase("fa-IR").includes(query.toLocaleLowerCase("fa-IR")));
 return <><button type="button" className="command-trigger" onClick={()=>setOpen(true)} aria-label="باز کردن جستجوی سریع"><span>⌕</span><b>جستجوی سریع در مرکز مدیریت</b><kbd>Ctrl K</kbd></button>{open&&<div className="command-overlay" role="dialog" aria-modal="true" onMouseDown={()=>setOpen(false)}><div className="command-palette" onMouseDown={e=>e.stopPropagation()}><div className="command-palette-head"><span>فرمان سریع</span><button onClick={()=>setOpen(false)} aria-label="بستن">×</button></div><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجو در بخش‌های مرکز مدیریت..." /><div className="command-results">{items.map(([title,href,desc])=><Link key={title} href={href} onClick={()=>setOpen(false)}><span className="command-result-icon">↗</span><div><b>{title}</b><small>{desc}</small></div><kbd>↵</kbd></Link>)}{!items.length&&<div className="command-no-result">نتیجه‌ای پیدا نشد.</div>}</div><footer><span>ESC بستن</span><span>↑↓ پیمایش</span><span>Ctrl K جستجوی سریع</span></footer></div></div>}</>;
}

export default function AdminLayout({children}:{children:React.ReactNode}){
 const router=useRouter();
 async function logout(){try{await api("/api/auth/logout",{method:"POST"})}finally{router.replace("/login");router.refresh()}}
 return <div className="enterprise-shell"><Suspense fallback={<aside className="enterprise-sidebar" aria-hidden="true"/>}><AdminSidebar/></Suspense><main className="enterprise-main"><header className="enterprise-topbar"><div className="topbar-title"><div className="topbar-breadcrumb"><span>سازمان</span><i>›</i><b>مرکز مدیریت</b></div><h1>مرکز مدیریت نگار آذین فدک</h1><div className="topbar-context"><span>هسته مرکزی کسب‌وکار</span><span>۵۰ بخش عملیاتی</span><span>RTL · 2026</span></div></div><div className="topbar-actions"><CommandCenter/><button className="top-icon-button" type="button" title="اعلان‌ها" aria-label="اعلان‌ها">♢<i/></button><AdminAppearance/><span className="system-state"><i/> سرویس مرکزی متصل</span><button className="top-user" type="button" title="خروج" onClick={logout}><span>ن</span><b>مدیر</b></button></div></header><div className="enterprise-context-bar"><div><span className="context-label">محیط فعال</span><strong>مرکز مدیریت سازمان</strong></div><TenantSwitcher/><div className="context-selects"><span>شرکت فعال</span><span>دوره مالی جاری</span></div><Link href="/admin/updates">وضعیت انتشار ↗</Link></div>{children}</main></div>
}