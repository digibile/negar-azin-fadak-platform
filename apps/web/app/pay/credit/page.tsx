"use client";

import Link from "next/link";
import {useEffect,useState} from "react";

export default function CreditPage(){
 const [data,setData]=useState<any>(null),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/lendtech/portfolio",{credentials:"include"}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||"برای مشاهده اعتبار وارد شوید");return b}).then(setData).catch(e=>setError(e instanceof Error?e.message:"خطا"));},[]);
 return <main className="sookar-store" dir="rtl"><section className="store-section"><span>LendTech</span><h1>اعتبار خرید</h1><p>سقف اعتبار، مصرف، قرارداد و مانده از داده‌های واقعی چرخه تأمین مالی خوانده می‌شوند.</p>
  {error&&<div className="product-card"><p>{error}</p><Link href="/login">ورود به حساب ←</Link></div>}
  {data&&<div className="plan-grid"><article><h3>درخواست‌ها</h3><strong>{Number(data.applications?.count||0).toLocaleString("fa-IR")}</strong><p>مجموع درخواست‌ها · {Number(data.applications?.amount||0).toLocaleString("fa-IR")} ریال</p></article><article><h3>سقف فعال</h3><strong>{Number(data.facilities?.amount||0).toLocaleString("fa-IR")} ریال</strong><p>{Number(data.facilities?.count||0).toLocaleString("fa-IR")} تسهیلات</p></article><article><h3>قراردادهای فعال</h3><strong>{Number(data.contracts?.count||0).toLocaleString("fa-IR")}</strong><p>اصل قراردادها · {Number(data.contracts?.amount||0).toLocaleString("fa-IR")} ریال</p></article><article><h3>وصول معوق</h3><strong>{Number(data.overdue?.amount||0).toLocaleString("fa-IR")} ریال</strong><p>{Number(data.overdue?.contracts||0).toLocaleString("fa-IR")} قرارداد دارای پرونده باز</p></article></div>}
  <div className="plan-grid"><article><h3>اعتبار خرید</h3><p>خرید از فروشگاه‌های مجاز با کنترل سقف اعتبار در Checkout.</p><Link href="/pay/apply">درخواست اعتبار ←</Link></article><article><h3>اعتبار گردشی</h3><p>مصرف، بازپرداخت و آزادسازی سقف در چرخه واقعی ثبت می‌شود.</p><Link href="/pay/plans">مشاهده طرح‌ها ←</Link></article></div>
 </section></main>;
}
