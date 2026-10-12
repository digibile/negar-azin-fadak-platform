"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton, CartCount } from "../store/cart-actions";
import "./marketplace-pro.css";

type Product = {
  id: string; sku: string; title: string; description?: string | null;
  category?: string | null; price: string | number; currency?: string;
  seller_name?: string | null; store_id?: string | null; image_url?: string | null;
  brand?: string | null; rating?: number | null; is_demo_product?: boolean;
};
type Catalog = { tenant?: { name?: string }; products?: Product[]; stores?: Array<{id:string;name:string;slug:string;seller_name?:string}>; categories?: string[]; total?: number };
const categories = [
  {name:"کالای دیجیتال",icon:"▣",detail:"موبایل، لپ‌تاپ و لوازم جانبی"},
  {name:"خانه و آشپزخانه",icon:"⌂",detail:"لوازم خانه و زندگی"},
  {name:"مد و پوشاک",icon:"◇",detail:"پوشاک، کیف و کفش"},
  {name:"زیبایی و سلامت",icon:"✳",detail:"مراقبت و بهداشت"},
  {name:"ورزش و سفر",icon:"↗",detail:"تجهیزات و لوازم سفر"},
  {name:"کتاب و سرگرمی",icon:"▤",detail:"کتاب، هنر و بازی"},
  {name:"ابزار و خودرو",icon:"⚙",detail:"ابزارآلات و لوازم خودرو"},
  {name:"سوپرمارکت",icon:"◉",detail:"کالاهای روزمره"}
];
const formatPrice = (price: string | number, currency = "IRR") => {
  const value = Number(price);
  return Number.isFinite(value) ? value.toLocaleString("fa-IR") + " " + (currency === "IRR" ? "ریال" : currency) : String(price);
};
export default function MarketplacePro() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [sort, setSort] = useState("newest");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/marketplace", { headers: { accept: "application/json" }, cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "دریافت کاتالوگ محصولات ناموفق بود.");
        setCatalog(body as Catalog);
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "ارتباط با بازارگاه برقرار نشد."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const products = useMemo(() => {
    const list = (catalog?.products || []).filter(p => {
      const q = search.trim().toLocaleLowerCase("fa");
      const matchesSearch = !q || [p.title, p.brand, p.category, p.seller_name, p.description].some(v => String(v || "").toLocaleLowerCase("fa").includes(q));
      return matchesSearch && (!activeCategory || String(p.category || "").includes(activeCategory));
    });
    if (sort === "price-asc") list.sort((a,b) => Number(a.price)-Number(b.price));
    if (sort === "price-desc") list.sort((a,b) => Number(b.price)-Number(a.price));
    if (sort === "title") list.sort((a,b) => a.title.localeCompare(b.title, "fa"));
    return list;
  }, [catalog, search, activeCategory, sort]);
  return <main className="mp-pro" dir="rtl">
    <div className="mp-topline"><div className="mp-container mp-topline-inner"><span>بازارگاه یکپارچه نگار آذین فدک</span><div><Link href="/store/faq">راهنمای خرید</Link><Link href="/store/terms">قوانین و مقررات</Link><Link href="/store">فروشگاه سوکار</Link></div></div></div>
    <header className="mp-header"><div className="mp-container mp-header-main">
      <Link href="/marketplace" className="mp-brand" aria-label="نگار آذین فدک، صفحه بازارگاه"><span className="mp-brand-symbol">ن</span><span><b>نگار آذین فدک</b><small>بازارگاه هوشمند خرید و فروش</small></span></Link>
      <form className="mp-search" onSubmit={e => {e.preventDefault(); document.getElementById("mp-catalog")?.scrollIntoView({behavior:"smooth"});}}><span aria-hidden="true">⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="نام کالا، برند یا فروشگاه را جست‌وجو کنید..." aria-label="جست‌وجوی کالا"/>{search && <button type="button" onClick={()=>setSearch("")} aria-label="پاک کردن جست‌وجو">×</button>}<button type="submit" className="mp-search-submit">جست‌وجو</button></form>
      <div className="mp-header-actions"><Link href="/login" className="mp-account"><span>♙</span><span>ورود / ثبت‌نام</span></Link><Link href="/store/cart" className="mp-cart" aria-label="سبد خرید"><span>🛒</span><CartCount/></Link></div>
    </div>
    <nav className="mp-nav"><div className="mp-container mp-nav-inner"><a href="#mp-categories" className="mp-nav-categories"><span>☰</span> دسته‌بندی کالاها</a><a href="#mp-catalog">همه محصولات</a><a href="#mp-sellers">فروشندگان بازارگاه</a><a href="#mp-benefits">چرا نگار آذین فدک؟</a><a href="#mp-sell" className="mp-nav-sell">فروشنده شوید <span>←</span></a></div></nav></header>
    <div className="mp-container">
      <section className="mp-hero">
        <div className="mp-hero-copy"><span className="mp-eyebrow"><i/> بازارگاه یکپارچه کسب‌وکار</span><h1>بازار بزرگ انتخاب‌های شما،<br/><em>با خریدی شفاف و مطمئن</em></h1><p>محصولات فروشندگان را در یک فضای منظم کشف کنید، مشخصات را مقایسه کنید و با آگاهی بیشتر انتخاب کنید.</p><div className="mp-hero-actions"><a href="#mp-catalog" className="mp-button-primary">مشاهده محصولات <span>←</span></a><a href="#mp-sell" className="mp-button-outline">معرفی فروشگاه من</a></div><div className="mp-hero-assurance"><span>✓</span> اطلاعات محصول و فروشنده در کنار هم، برای انتخاب آگاهانه‌تر</div></div>
        <div className="mp-hero-visual" aria-hidden="true"><div className="mp-hero-glow"/><div className="mp-hero-orbit mp-orbit-a"/><div className="mp-hero-orbit mp-orbit-b"/><div className="mp-hero-stack"><div className="mp-stack-top"><span>NAF MARKETPLACE</span><b>۰۱</b></div><div className="mp-stack-emblem">ن</div><strong>یک بازار، انتخاب‌های بیشتر</strong><small>NEGAR AZIN FADAK</small></div><div className="mp-float mp-float-top"><span>✓</span><div><b>انتخاب شفاف</b><small>اطلاعات قابل بررسی</small></div></div><div className="mp-float mp-float-bottom"><span>⌕</span><div><b>کشف آسان کالا</b><small>جست‌وجو و دسته‌بندی</small></div></div></div>
      </section>
      <section className="mp-benefit-row" id="mp-benefits"><article><span>⌕</span><div><b>جست‌وجوی یکپارچه</b><small>کشف کالا در دسته‌بندی‌های متنوع</small></div></article><article><span>▤</span><div><b>اطلاعات روشن</b><small>مشخصات و قیمت ثبت‌شده محصول</small></div></article><article><span>♧</span><div><b>فروشندگان بازارگاه</b><small>مشاهده فروشگاه و عرضه‌کننده</small></div></article><article><span>↗</span><div><b>تجربه سازگار با موبایل</b><small>دسترسی راحت در هر اندازه صفحه</small></div></article></section>
      <section className="mp-categories" id="mp-categories"><div className="mp-section-heading"><div><span className="mp-section-kicker">دسته‌بندی‌ها</span><h2>از کجا شروع کنیم؟</h2><p>برای رسیدن سریع‌تر به محصول موردنظر، یک دسته را انتخاب کنید.</p></div><a href="#mp-catalog">مشاهده همه کالاها <span>←</span></a></div><div className="mp-category-grid">{categories.map(item=><button key={item.name} type="button" onClick={()=>{setActiveCategory(activeCategory===item.name?"":item.name);document.getElementById("mp-catalog")?.scrollIntoView({behavior:"smooth"});}} className={"mp-category-card"+(activeCategory===item.name?" is-active":"")}><span className="mp-category-icon">{item.icon}</span><span className="mp-category-text"><b>{item.name}</b><small>{item.detail}</small></span><span className="mp-category-arrow">←</span></button>)}</div></section>
      <section className="mp-catalog" id="mp-catalog"><div className="mp-section-heading"><div><span className="mp-section-kicker">کاتالوگ بازارگاه</span><h2>{activeCategory || (search ? "نتایج جست‌وجو" : "محصولات بازارگاه")}</h2><p>محصولات از کاتالوگ عمومی بازارگاه دریافت می‌شوند.</p></div><label className="mp-sort">مرتب‌سازی <select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">پیشنهاد بازارگاه</option><option value="price-asc">ارزان‌ترین</option><option value="price-desc">گران‌ترین</option><option value="title">نام کالا</option></select></label></div>
        <div className="mp-results-meta"><span>{loading ? "در حال دریافت محصولات…" : products.length.toLocaleString("fa-IR")+" محصول قابل نمایش"}</span>{activeCategory && <button type="button" onClick={()=>setActiveCategory("")}>حذف فیلتر ×</button>}</div>
        {loading ? <div className="mp-state"><span className="mp-spinner"/><b>در حال بارگذاری کاتالوگ</b><p>محصولات بازارگاه در حال دریافت هستند.</p></div> : error ? <div className="mp-state mp-state-error"><b>دریافت محصولات انجام نشد</b><p>{error}</p><button type="button" onClick={()=>window.location.reload()}>تلاش دوباره</button></div> : products.length ? <div className="mp-product-grid">{products.map(product=><article className="mp-product-card" key={product.id}><Link className="mp-product-image" href={"/store/product/"+encodeURIComponent(product.sku||product.id)+"?site=marketplace-pro"}>{product.image_url ? <img src={product.image_url} alt={product.title} loading="lazy"/> : <span className="mp-product-placeholder">◇</span>}{product.category && <small>{product.category}</small>}</Link><div className="mp-product-body"><span className="mp-seller"><i/>{product.seller_name || "فروشنده بازارگاه"}</span><Link className="mp-product-title" href={"/store/product/"+encodeURIComponent(product.sku||product.id)+"?site=marketplace-pro"}>{product.title}</Link>{product.description && <p>{product.description}</p>}<div className="mp-product-price"><span>قیمت ثبت‌شده</span><b>{formatPrice(product.price,product.currency)}</b></div><AddToCartButton compact product={{id:product.id,sku:product.sku,title:product.title,price:product.price,currency:product.currency||"IRR",seller_name:product.seller_name,store_id:product.store_id,image_url:product.image_url,is_demo_product:product.is_demo_product,site:"marketplace-pro"}}/></div></article>)}</div> : <div className="mp-state"><span className="mp-empty-icon">⌕</span><b>{search || activeCategory ? "محصولی با این مشخصات پیدا نشد" : "هنوز محصولی برای نمایش ثبت نشده است"}</b><p>{search || activeCategory ? "عبارت جست‌وجو یا دسته‌بندی را تغییر دهید." : "با ثبت کالا توسط فروشندگان، محصولات در این بخش نمایش داده می‌شوند."}</p>{(search||activeCategory)&&<button type="button" onClick={()=>{setSearch("");setActiveCategory("");}}>نمایش همه محصولات</button>}</div>}
        {!loading && !error && products.length>0 && <div className="mp-catalog-footer"><span>در حال مشاهده {products.length.toLocaleString("fa-IR")} محصول</span><a href="#mp-categories">بازگشت به دسته‌بندی‌ها ↑</a></div>}
      </section>
      <section className="mp-sell-banner" id="mp-sell"><div className="mp-sell-mark">ن</div><div><span>برای کسب‌وکارها</span><h2>فروشگاه شما، در بازارگاه نگار آذین فدک</h2><p>مسیر معرفی فروشگاه و عرضه محصولات خود را از مرکز مدیریت پیگیری کنید.</p></div><Link href="/login">ورود فروشندگان <span>←</span></Link></section>
      <section className="mp-sellers" id="mp-sellers"><div className="mp-section-heading"><div><span className="mp-section-kicker">بازارگاه چندفروشنده</span><h2>یک مسیر روشن برای خریدار و فروشنده</h2><p>محصول، اطلاعات فروشنده و مسیر ادامه خرید در یک تجربه یکپارچه.</p></div></div><div className="mp-seller-cards"><article><span>۰۱</span><b>کشف محصول</b><p>جست‌وجو و دسته‌بندی برای پیدا کردن گزینه‌های مرتبط.</p></article><article><span>۰۲</span><b>بررسی اطلاعات</b><p>مشخصات، قیمت و اطلاعات عرضه‌کننده را پیش از انتخاب ببینید.</p></article><article><span>۰۳</span><b>ادامه مسیر خرید</b><p>محصول را به سبد اضافه کنید و مراحل بعدی را دنبال کنید.</p></article></div></section>
    </div>
    <footer className="mp-footer"><div className="mp-container mp-footer-main"><div className="mp-footer-brand"><Link href="/marketplace" className="mp-brand"><span className="mp-brand-symbol">ن</span><span><b>نگار آذین فدک</b><small>بازارگاه هوشمند خرید و فروش</small></span></Link><p>تجربه‌ای یکپارچه برای کشف کالاها و فروشندگان، با تمرکز بر اطلاعات روشن و دسترسی آسان.</p></div><div><b>خدمات مشتریان</b><Link href="/store/faq">راهنمای خرید</Link><Link href="/store/terms">قوانین و مقررات</Link><Link href="/store/cart">سبد خرید</Link></div><div><b>برای فروشندگان</b><a href="#mp-sell">معرفی فروشگاه</a><Link href="/login">ورود به مرکز مدیریت</Link><a href="#mp-sellers">آشنایی با بازارگاه</a></div><div><b>نگار آذین فدک</b><Link href="/marketplace">صفحه بازارگاه</Link><Link href="/store">فروشگاه سوکار</Link><Link href="/">صفحه اصلی</Link></div></div><div className="mp-footer-bottom"><div className="mp-container"><span>© نگار آذین فدک ایران</span><span>بازارگاه حرفه‌ای · نسخه واکنش‌گرا</span></div></div></footer>
  </main>;
}
