"use client";

import {Suspense} from "react";
import Link from "next/link";
import AdminSidebar from "../admin/AdminSidebar";
import AdminAppearance from "../admin/AdminAppearance";

export default function ModulesLayout({children}:{children:React.ReactNode}){
 return <div className="enterprise-shell">
  <Suspense fallback={<aside className="enterprise-sidebar" aria-hidden="true"/>}><AdminSidebar/></Suspense>
  <main className="enterprise-main">
   <div className="enterprise-topbar">
    <div><span className="section-kicker">پلتفرم بیزینس نگار آذین فدک ایران</span><h1>مرکز مدیریت</h1></div>
    <div className="top-actions"><Link className="module-back-button" href="/admin">‹ بازگشت به منوی مرکزی</Link><AdminAppearance/><span className="system-state"><i/> سرویس مرکزی متصل</span></div>
   </div>
   {children}
  </main>
 </div>;
}
