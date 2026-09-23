"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {api} from "../../lib/api";
export default function AdminLayout({children}:{children:React.ReactNode}){
 const router=useRouter();
 async function logout(){try{await api("/api/auth/logout",{method:"POST"})}finally{router.replace("/login");router.refresh()}}
 return <div className="admin-shell"><aside className="admin-nav"><strong>مرکز مدیریت نگار آذین فدک</strong><Link href="/admin">داشبورد</Link><Link href="/admin/editors">ویرایشگرهای سامانه</Link><button onClick={logout}>خروج</button></aside><main className="admin-main">{children}</main></div>
}