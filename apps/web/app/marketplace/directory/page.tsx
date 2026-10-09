"use client";

import Link from "next/link";
import {useEffect,useState} from "react";

type Store={id:string;name:string;slug:string;domain?:string|null;seller_id:string;seller_name:string};
type Product={id:string;store_id:string|null;title:string;category:string|null;price:string;currency:string;image_url?:string|null};
type Catalog={stores:Store[];products:Product[];tenant?:{name:string};error?:string};

export default function StoreDirectoryPage(){
 const [data,setData]=useState<Catalog|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/public/marketplace",{cache:"no-store",headers:{accept:"application/json"},signal:controller.signal})
   .then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||"فهرست فروشگاه‌ها دریافت نشد.");setData(body as Catalog)})
   .catch(e=>{if(e instanceof Error&&e.name==="AbortError")return;setError(e instanceof Error?e.message:"خطا در دریافت فهرست فروشگاه‌ها")})
   .finally(()=>setLoading(false));
  return()=>controller.abort();
 },[]);
 const stores=data?.stores||[];
 const products=data?.products||[];
 return <main className="sk-store" dir="rtl">
  <div className="sk-service-strip"><div className="sk-wrap sk-service-inner"><span>فروشگاه‌های فعال بازارگاه سوکار</span><div><Link href="/">صفحه اصلی</Link><Link href="/store/shop">همه کالاها</Link><Link href="/login">ورود به حساب</Link></div></div></div>
  <header className="sk-header"><div className="sk-wrap sk-header-main"><Link href="/" className="sk-logo"><span className="sk-logo-mark">س</span><span><b>سوکار</b><small>خرید هوشمند، انتخاب مطمئن</small></span></Link><div className="sk-header-actions"><Link className="sk-login" href="/login">ورود به حساب</Link><Link className="sk-cart" href="/store/cart" aria-label="سبد خرید">♧</Link></div></div><nav className="sk-main-nav"><div className="sk-wrap sk-nav-inner"><Link className="sk-all-cats" href="/store/shop">☰ دسته‌بندی کالاها</Link><Link href="/marketplace/directory">فروشگاه‌ها</Link><Link href="/pay">خرید اعتباری</Link><Link href="/store/orders">پیگیری سفارش</Link></div></nav></header>
  <div className="sk-wrap">
   <section className="sk-catalog" aria-labelledby="directory-title">
    <div className="sk-section-heading"><div><span className="sk-eyebrow">فروشندگان تأییدشده</span><h1 id="directory-title">فروشگاه‌های بازارگاه</h1><p>فقط فروشگاه‌های فعال و متصل به فروشنده فعال نمایش داده می‌شوند.</p></div><Link href="/store/shop" className="sk-section-link">مشاهده کالاها ←</Link></div>
    {loading?<div className="sk-state"><span className="sk-loader"/>در حال دریافت فهرست واقعی فروشگاه‌ها…</div>
    :error?<div className="sk-state sk-state-error"><b>دریافت فروشگاه‌ها انجام نشد</b><p>{error}</p><button type="button" onClick={()=>window.location.reload()}>تلاش دوباره</button></div>
    :stores.length?<div className="sk-product-grid">{stores.map(store=>{
      const count=products.filter(p=>p.store_id===store.id).length;
      return <article className="sk-product-card" key={store.id}><div className="sk-product-visual"><span className="sk-product-category">فروشگاه فعال</span><span className="sk-product-glyph">▦</span><span className="sk-visual-brand">SOOKAR</span></div><div className="sk-product-info"><span className="sk-seller-name"><i/>{store.seller_name}</span><h2 className="sk-product-title">{store.name}</h2><p>{store.domain||("شناسه فروشگاه: "+store.slug)}</p><div className="sk-product-price"><strong>{count.toLocaleString("fa-IR")} کالا</strong><small>از کاتالوگ فعال</small></div><Link className="sk-product-cta" href={"/store/shop"}>مشاهده کالاها <span>←</span></Link></div></article>;
    })}</div>
    :<div className="sk-state"><b>هنوز فروشگاه فعالی برای نمایش ثبت نشده است.</b><p>فروشگاه پس از فعال‌شدن وضعیت فروشنده و انتشار فروشگاه در این فهرست قرار می‌گیرد.</p><Link href="/login" className="sk-primary-btn">ورود فروشندگان <span>←</span></Link></div>}
    <div className="sk-bottom-links"><Link href="/"><span>⌂</span><b>صفحه اصلی</b><small>بازگشت به ویترین</small><em>←</em></Link><Link href="/store/shop"><span>▦</span><b>همه کالاها</b><small>مرور محصولات فعال</small><em>←</em></Link><Link href="/login"><span>♙</span><b>ورود فروشندگان</b><small>مدیریت حساب فروشنده</small><em>←</em></Link></div>
   </section>
  </div>
  <footer className="sk-footer"><div className="sk-wrap sk-footer-bottom"><span>سوکار · بازارگاه و فروشگاه اینترنتی</span><span>فقط اطلاعات فعال ثبت‌شده نمایش داده می‌شود.</span></div></footer>
 </main>;
}
