"use client";

import {useRouter} from "next/navigation";
import {api} from "../../lib/api";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({children}:{children:React.ReactNode}){
 const router=useRouter();
 async function logout(){
  try{await api("/api/auth/logout",{method:"POST"})}
  finally{router.replace("/login");router.refresh()}
 }
 return <div className="enterprise-shell">
  <AdminSidebar/>
  <main className="enterprise-main">
   <div className="enterprise-topbar">
    <div><span className="section-kicker">پلتفرم بیزینس نگار آذین فدک ایران</span><h1>مرکز مدیریت</h1></div>
    <div className="top-actions">
     <span className="system-state"><i/> سرویس مرکزی متصل</span>
     <button className="admin-link" type="button" onClick={logout}>خروج</button>
    </div>
   </div>
   {children}
  </main>
 </div>
}
