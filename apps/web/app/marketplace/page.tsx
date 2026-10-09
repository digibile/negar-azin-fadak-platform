"use client";

import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import styles from "./marketplace.module.css";

type Store={id:string;name:string;slug:string;seller_name:string};
type Product={id:string;sku:string;title:string;description:string|null;category:string|null;price:string;currency:string;seller_name:string;store_id:string|null};
type Catalog={tenant:{id:string;code:string;name:string};stores:Store[];products:Product[]};

const money=(value:string,currency:string)=> {
  const amount=Number(value);
  return Number.isFinite(amount)?amount.toLocaleString("fa-IR")+" "+currency:value+" "+currency;
};

export default function MarketplacePage(){
  const [catalog,setCatalog]=useState<Catalog|null>(null);
  const [q,setQ]=useState("");
  const [store,setStore]=useState("");
  const [category,setCategory]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    setError("");
    try{
      const response=await fetch("/api/public/marketplace",{headers:{accept:"application/json"},cache:"no-store"});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"دریافت کاتالوگ بازارگاه ناموفق بود.");
      if(!body||!Array.isArray(body.products)||!Array.isArray(body.stores))throw new Error("ساختار پاسخ بازارگاه معتبر نیست.");
      setCatalog(body as Catalog);
    }catch(e){
      setError(e instanceof Error?e.message:"اتصال به بازارگاه برقرار نشد.");
    }finally{
      setLoading(false);
    }
  },[]);

  useEffect(()=>{const params=new URLSearchParams(window.location.search);setStore(params.get("store")||"");void load()},[load]);

  const categories=useMemo(()=>{
    const values=(catalog?.products||[]).map(p=>p.category?.trim()).filter((x):x is string=>Boolean(x));
    return [...new Set(values)].sort((a,b)=>a.localeCompare(b,"fa"));
  },[catalog]);

  const products=useMemo(()=>{
    if(!catalog)return [];
    const needle=q.trim().toLocaleLowerCase("fa");
    return catalog.products.filter(p=>{
      const matchesStore=!store||p.store_id===store;
      const matchesCategory=!category||p.category===category;
      const searchable=[p.title,p.sku,p.category||"",p.seller_name,p.description||""].join(" ").toLocaleLowerCase("fa");
      return matchesStore&&matchesCategory&&(!needle||searchable.includes(needle));
    });
  },[catalog,q,store,category]);

  const resetFilters=()=>{setQ("");setStore("");setCategory("")};

  return <div className={styles.page} dir="rtl">
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/store" className={styles.brand} aria-label="سوکار، صفحه فروشگاه">
          <span className={styles.brandMark}>س</span>
          <span><b className={styles.brandName}>سوکار</b><small className={styles.brandSub}>بازارگاه و تجارت هوشمند</small></span>
        </Link>
        <nav className={styles.nav} aria-label="ناوبری اصلی">
          <Link href="/store">فروشگاه</Link>
          <Link href="/marketplace" className={styles.active} aria-current="page">بازارگاه</Link>
          <Link href="/marketplace/stores">فروشگاه‌ها</Link>
          <Link href="/marketplace/sellers">فروشندگان</Link>
          <Link href="/pay">اعتبار و تسهیلات</Link>
        </nav>
        <div className={styles.headerActions}>
          <Link href="/account/orders" className={styles.cart}>سفارش‌های من</Link>
          <Link href="/login" className={styles.account}>ورود / حساب کاربری</Link>
        </div>
      </div>
    </header>

    <main className={styles.main}>
      <div className={styles.breadcrumb}><Link href="/store">خانه</Link><span>‹</span><b>بازارگاه سوکار</b></div>

      <section className={styles.hero} aria-labelledby="marketplace-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><i className={styles.liveDot}/> بازارگاه چندفروشنده سوکار</span>
          <h1 id="marketplace-title">خرید بهتر، از فروشنده‌ای که می‌شناسی.</h1>
          <p>فروشگاه‌ها و کالاها را در یک بازارگاه یکپارچه پیدا کن، مشخصات و قیمت ثبت‌شده را بررسی کن و برای خرید نقدی یا اعتباری مسیر مناسب را انتخاب کن.</p>
          <div className={styles.heroActions}>
            <a href="#catalog" className={styles.primaryAction}>جستجو در بازارگاه <span aria-hidden="true">←</span></a>
            <Link href="/pay/apply" className={styles.secondaryAction}>بررسی مسیر درخواست اعتبار</Link>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.visualCard}>
            <div className={styles.visualTop}><b>بازارگاه سوکار</b><span className={styles.visualBadge}>تجربه یکپارچه</span></div>
            <div className={styles.visualPrice}><small>از کشف کالا تا پیگیری خرید</small><strong>یک مسیر روشن</strong><em>فروشگاه · سفارش · اعتبار</em></div>
            <div className={styles.visualBottom}>
              <div className={styles.visualStat}><small>کاتالوگ</small><b>داده زنده</b></div>
              <div className={styles.visualStat}><small>خرید اعتباری</small><b>بررسی شرایط</b></div>
            </div>
          </div>
          <div className={styles.heroFloat}><span className={styles.floatIcon}>✓</span><span>قیمت و اطلاعات از کاتالوگ ثبت‌شده</span></div>
        </div>
      </section>

      <section className={styles.trustRow} aria-label="قابلیت‌های بازارگاه">
        <article className={styles.trustItem}><span className={styles.trustIcon}>⌕</span><div><b>جستجوی یکپارچه</b><small>جستجو بین نام کالا، فروشنده و شناسه</small></div></article>
        <article className={styles.trustItem}><span className={styles.trustIcon}>▦</span><div><b>فروشگاه‌های مستقل</b><small>مشاهده فروشگاه و فروشنده ثبت‌شده</small></div></article>
        <article className={styles.trustItem}><span className={styles.trustIcon}>↗</span><div><b>پیگیری خرید</b><small>دسترسی مستقیم به مسیر سفارش‌ها</small></div></article>
        <article className={styles.trustItem}><span className={styles.trustIcon}>◇</span><div><b>مسیر اعتبار</b><small>شرایط طرح را جداگانه بررسی کن</small></div></article>
      </section>

      <section className={styles.section} id="catalog" aria-labelledby="catalog-title">
        <div className={styles.sectionHead}>
          <div><span className={styles.kicker}>کاتالوگ زنده</span><h2 id="catalog-title">کالاهای بازارگاه</h2><p>فهرست زیر از سرویس عمومی بازارگاه دریافت می‌شود؛ قیمت یا موجودی ثبت‌نشده حدس زده نمی‌شود.</p></div>
          <Link href="/marketplace/products" className={styles.textLink}>مدیریت کاتالوگ <span aria-hidden="true">←</span></Link>
        </div>

        <div className={styles.searchPanel}>
          <label className={styles.searchField}><span className={styles.searchIcon} aria-hidden="true">⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="نام کالا، برند، دسته یا فروشنده را جستجو کن" aria-label="جستجو در کاتالوگ"/></label>
          <label><select className={styles.select} value={store} onChange={e=>setStore(e.target.value)} aria-label="فیلتر فروشگاه"><option value="">همه فروشگاه‌ها</option>{(catalog?.stores||[]).map(s=><option key={s.id} value={s.id}>{s.name} · {s.seller_name}</option>)}</select></label>
          <label><select className={styles.select} value={category} onChange={e=>setCategory(e.target.value)} aria-label="فیلتر دسته‌بندی"><option value="">همه دسته‌بندی‌ها</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
        </div>

        <div className={styles.resultsMeta}><span>{loading?"در حال دریافت کاتالوگ…":<><b>{products.length.toLocaleString("fa-IR")}</b> کالا مطابق فیلتر</>}</span>{(q||store||category)&&<button type="button" className={styles.clearButton} onClick={resetFilters}>پاک‌کردن فیلترها</button>}</div>

        {loading?<div className={styles.loading} role="status" aria-live="polite">در حال دریافت اطلاعات واقعی بازارگاه…</div>
        :error?<div className={styles.error} role="alert"><b>دریافت کاتالوگ انجام نشد</b><p>{error}</p><button type="button" className={styles.clearButton} onClick={()=>void load()}>تلاش دوباره</button></div>
        :products.length>0?<div className={styles.productGrid}>{products.map(p=><article className={styles.productCard} key={p.id}>
          <div className={styles.productArt}><span className={styles.productTag}>{p.category||"کالا"}</span><span className={styles.artGlyph}>{(p.category||p.title||"س").trim().slice(0,1)}</span></div>
          <div className={styles.productBody}>
            <div className={styles.productMeta}><span className={styles.sellerLabel}><i/>{p.seller_name||"فروشنده ثبت‌شده"}</span><span>{p.category||"بدون دسته"}</span></div>
            <h3>{p.title}</h3>
            <p className={styles.productDescription}>{p.description||"توضیحات تکمیلی از سوی فروشنده ارائه نشده است."}</p>
            <div className={styles.productFooter}><strong className={styles.price}>{money(p.price,p.currency)}</strong><span className={styles.sku}>{p.sku}</span></div>
            <Link className={styles.productLink} href={"/store/product/"+encodeURIComponent(p.id)}>مشاهده جزئیات <span aria-hidden="true">←</span></Link>
          </div>
        </article>)}</div>
        :<div className={styles.empty}><span className={styles.emptyIcon}>⌕</span><b>{catalog?.products.length?"نتیجه‌ای با این فیلتر پیدا نشد.":"هنوز کالای فعالی برای نمایش ثبت نشده است."}</b><p>{catalog?.products.length?"فیلترها را تغییر بده تا نتایج بیشتری ببینی.":"با ثبت کالای واقعی در کاتالوگ، محصولات در همین بخش نمایش داده می‌شوند."}</p>{(q||store||category)&&<button type="button" className={styles.clearButton} onClick={resetFilters}>نمایش همه کالاها</button>}</div>}
      </section>

      <section className={styles.section} aria-labelledby="stores-title">
        <div className={styles.sectionHead}><div><span className={styles.kicker}>شبکه فروشندگان</span><h2 id="stores-title">از فروشگاه‌ها خرید کن</h2><p>فروشگاه‌های ثبت‌شده را ببین و وارد کاتالوگ آن‌ها شو.</p></div><Link href="/marketplace/stores" className={styles.textLink}>همه فروشگاه‌ها <span aria-hidden="true">←</span></Link></div>
        {loading?<div className={styles.loading}>در حال دریافت فهرست فروشگاه‌ها…</div>
        :catalog?.stores.length?<div className={styles.storeGrid}>{catalog.stores.slice(0,6).map(s=><Link href={"/marketplace?store="+encodeURIComponent(s.id)} className={styles.storeCard} key={s.id}><span className={styles.storeMark}>{s.name.trim().slice(0,1)||"ف"}</span><span className={styles.storeCopy}><b>{s.name}</b><small>{s.seller_name}</small></span><span className={styles.storeArrow} aria-hidden="true">‹</span></Link>)}</div>
        :<div className={styles.empty}><b>فروشگاهی برای نمایش ثبت نشده است.</b><p>فروشگاه‌های فعال پس از ثبت و تأیید در این بخش نمایش داده می‌شوند.</p></div>}
      </section>

      <section className={styles.creditBanner}>
        <div><h2>برای خرید، شرایط اعتبار را هم بررسی کن.</h2><p>مشاهده طرح‌ها به معنی تأیید یا تضمین دریافت اعتبار نیست. شرایط، احراز هویت و تصمیم نهایی از مسیر رسمی درخواست بررسی می‌شود.</p></div>
        <Link href="/pay/plans" className={styles.creditButton}>مشاهده طرح‌ها <span aria-hidden="true">←</span></Link>
      </section>
    </main>

    <footer className={styles.footer}><div className={styles.footerInner}>
      <div><b className={styles.footerBrand}>سوکار</b><p>بازارگاه، فروشگاه و مسیرهای اعتبار در یک تجربه متصل. اطلاعات عملیاتی باید از سرویس ثبت‌شده و قابل پیگیری بیاید.</p></div>
      <div><h3>خرید و بازارگاه</h3><nav className={styles.footerLinks}><Link href="/store">فروشگاه</Link><Link href="/marketplace">بازارگاه</Link><Link href="/marketplace/stores">فروشگاه‌ها</Link><Link href="/account/orders">سفارش‌های من</Link></nav></div>
      <div><h3>اعتبار و پشتیبانی</h3><nav className={styles.footerLinks}><Link href="/pay/plans">طرح‌های اعتباری</Link><Link href="/pay/apply">درخواست اعتبار</Link><Link href="/pay/faq">پرسش‌های متداول</Link><Link href="/pay/support">پشتیبانی</Link></nav></div>
    </div></footer>
  </div>;
}
