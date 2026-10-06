"use client";

import {useEffect,useState} from "react";
import {api} from "../../lib/api";

type User={id:string;email:string;role:string;fullName?:string};

export default function CustomerDashboard(){
 const [user,setUser]=useState<User|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
  api<{user:User}>("/api/auth/me")
   .then(x=>setUser(x.user))
   .catch(()=>{setError("نشست کاربری معتبر نیست.");window.location.assign("/login");})
   .finally(()=>setLoading(false));
 },[]);

 async function logout(){
  try{await api("/api/auth/logout",{method:"POST"});}finally{window.location.assign("/login");}
 }

 if(loading)return <main className="enterprise-loading">در حال بارگذاری داشبورد شما...</main>;

 return <main className="customer-dashboard" dir="rtl">
  <header className="customer-topbar">
   <div>
    <span className="section-kicker">پروفایل مشتری</span>
    <h1>داشبورد مشتری</h1>
    <p>فضای اختصاصی حساب شما در سوکار</p>
   </div>
   <div className="customer-actions">
    <a href="/store">فروشگاه</a>
    <a href="/marketplace">بازار</a>
    <a href="/pay">اعتبار و پرداخت</a>
    <button onClick={logout}>خروج امن</button>
   </div>
  </header>

  {error&&<div className="error">{error}</div>}

  <section className="customer-welcome">
   <div>
    <span>خوش آمدید</span>
    <h2>{user?.fullName||user?.email}</h2>
    <p>اینجا مرکز دسترسی شما به پروفایل، سفارش‌ها، پرداخت‌ها و خدمات اعتباری است.</p>
   </div>
   <div className="customer-avatar">{(user?.fullName||user?.email||"ک").slice(0,1)}</div>
  </section>

  <section className="customer-grid">
   <a href="/profile" className="customer-card"><b>پروفایل من</b><span>اطلاعات حساب و مشخصات کاربری</span><i>‹</i></a>
   <a href="/store/cart" className="customer-card"><b>سبد خرید</b><span>مشاهده اقلام و ادامه خرید</span><i>‹</i></a>
   <a href="/marketplace/orders" className="customer-card"><b>سفارش‌های من</b><span>پیگیری سفارش‌ها و وضعیت تحویل</span><i>‹</i></a>
   <a href="/pay" className="customer-card"><b>اعتبار و پرداخت</b><span>اعتبار خرید، پرداخت و اقساط</span><i>‹</i></a>
   <a href="/pay/repayment" className="customer-card"><b>بازپرداخت</b><span>مدیریت پرداخت‌های اعتباری</span><i>‹</i></a>
   <a href="/pay/support" className="customer-card"><b>پشتیبانی</b><span>درخواست‌ها و ارتباط با پشتیبانی</span><i>‹</i></a>
  </section>
 </main>;
}
