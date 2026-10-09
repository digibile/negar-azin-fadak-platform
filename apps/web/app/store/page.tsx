"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  category: string | null;
  price: string;
  currency: string;
  seller_name: string;
  store_id: string | null;
};
type Store = { id: string; name: string; slug: string; seller_name: string };
type Catalog = { tenant?: { name?: string }; products: Product[]; stores?: Store[] };

const money = (value: string, currency: string) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency}`;
  return `${amount.toLocaleString("fa-IR")} ${currency === "IRR" ? "ریال" : currency}`;
};

const categoryGlyph = (category: string | null, title: string) => {
  const value = `${category || ""} ${title}`.toLocaleLowerCase("fa");
  if (/موبایل|گوشی|تلفن|تبلت/.test(value)) return "▯";
  if (/لپ.?تاپ|کامپیوتر|مانیتور|الکترونیک/.test(value)) return "▰";
  if (/پوشاک|لباس|کفش|مد/.test(value)) return "◇";
  if (/خانه|آشپزخانه|لوازم خانگی/.test(value)) return "⌂";
  if (/زیبایی|آرایش|بهداشت/.test(value)) return "✳";
  if (/کتاب|فرهنگ/.test(value)) return "▤";
  return "◈";
};

export default function StorePage() {
  const [data, setData] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/marketplace", { headers: { accept: "application/json" }, cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "دریافت کاتالوگ ناموفق بود.");
        if (!body || !Array.isArray(body.products)) throw new Error("ساختار کاتالوگ معتبر نیست.");
        setData(body as Catalog);
      })
      .catch(reason => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "اتصال به کاتالوگ برقرار نشد.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => [...new Set((data?.products || [])
    .map(product => product.category?.trim()).filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b, "fa")), [data]);

  const products = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fa");
    return (data?.products || []).filter(product => {
      const matchesCategory = !category || product.category === category;
      const searchable = [product.title, product.sku, product.category || "", product.seller_name, product.description || ""]
        .join(" ").toLocaleLowerCase("fa");
      return matchesCategory && (!needle || searchable.includes(needle));
    });
  }, [data, query, category]);

  return (
    <main className="sk-store" dir="rtl">
      <div className="sk-service-strip">
        <div className="sk-wrap sk-service-inner">
          <span>سوکار، بازارگاه یکپارچه خرید و فروش</span>
          <div><Link href="/marketplace/stores">فروشندگان</Link><Link href="/pay">خدمات اعتباری</Link><Link href="/store/orders">پیگیری سفارش</Link></div>
        </div>
      </div>

      <header className="sk-header">
        <div className="sk-wrap sk-header-main">
          <Link href="/" className="sk-logo" aria-label="سوکار، صفحه اصلی">
            <span className="sk-logo-mark">س</span>
            <span><b>سوکار</b><small>خرید هوشمند، انتخاب مطمئن</small></span>
          </Link>
          <form className="sk-search" role="search" onSubmit={event => { event.preventDefault(); document.getElementById("sk-products")?.scrollIntoView({ behavior: "smooth" }); }}>
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="جستجوی کالا، دسته‌بندی یا فروشنده..." aria-label="جستجوی کالا، دسته‌بندی یا فروشنده" />
            {query && <button type="button" aria-label="پاک کردن جستجو" onClick={() => setQuery("")}>×</button>}
          </form>
          <div className="sk-header-actions">
            <Link className="sk-login" href="/login"><span aria-hidden="true">♙</span><span>ورود به حساب</span></Link>
            <Link className="sk-cart" href="/store/cart" aria-label="سبد خرید"><span aria-hidden="true">♧</span></Link>
          </div>
        </div>
        <nav className="sk-main-nav" aria-label="ناوبری اصلی">
          <div className="sk-wrap sk-nav-inner">
            <Link className="sk-all-cats" href="/store/shop"><span>☰</span> دسته‌بندی کالاها</Link>
            <Link href="/store/shop">فروشگاه</Link>
            <Link href="/marketplace">بازارگاه</Link>
            <Link href="/marketplace/stores">فروشگاه‌های فروشندگان</Link>
            <Link href="/pay">خرید اعتباری</Link>
            <Link href="/store/orders">پیگیری سفارش</Link>
          </div>
        </nav>
      </header>

      <div className="sk-wrap">
        <section className="sk-hero" aria-labelledby="sk-hero-title">
          <div className="sk-hero-copy">
            <span className="sk-hero-kicker"><i /> تجربه خرید یکپارچه سوکار</span>
            <h1 id="sk-hero-title">انتخابت را پیدا کن.<br /><em>با خیال راحت‌تر</em> خرید کن.</h1>
            <p>کالاها و فروشندگان را یک‌جا جستجو کن، اطلاعات ثبت‌شده را مقایسه کن و جزئیات هر محصول را پیش از خرید ببین.</p>
            <div className="sk-hero-actions"><Link href="/store/shop" className="sk-primary-btn">دیدن همه کالاها <span>←</span></Link><Link href="/marketplace/stores" className="sk-quiet-btn">آشنایی با فروشندگان</Link></div>
            <div className="sk-hero-note"><span>✓</span> نمایش اطلاعات کاتالوگ ثبت‌شده، بدون قیمت‌سازی یا موجودی ساختگی</div>
          </div>
          <div className="sk-hero-art" aria-hidden="true">
            <div className="sk-orbit sk-orbit-one" /><div className="sk-orbit sk-orbit-two" />
            <div className="sk-art-panel"><div className="sk-art-top"><span>SOOKAR</span><b>بازارگاه</b></div><div className="sk-art-core"><span>س</span></div><div className="sk-art-caption"><b>یک مسیر ساده برای خرید</b><small>کالا · فروشگاه · انتخاب</small></div></div>
            <div className="sk-art-chip sk-art-chip-a"><span>⌕</span> جستجوی یکپارچه</div><div className="sk-art-chip sk-art-chip-b"><span>◇</span> انتخاب آگاهانه</div>
          </div>
        </section>

        <section className="sk-benefits" aria-label="ویژگی‌های تجربه خرید">
          <article><span className="sk-benefit-icon">⌕</span><div><b>جستجوی آسان</b><small>کالا و فروشنده را سریع‌تر پیدا کن</small></div></article>
          <article><span className="sk-benefit-icon">▦</span><div><b>بازارگاه چندفروشنده</b><small>محصولات فروشندگان در یک کاتالوگ</small></div></article>
          <article><span className="sk-benefit-icon">↗</span><div><b>جزئیات شفاف</b><small>مشاهده اطلاعات ثبت‌شده محصول</small></div></article>
          <article><span className="sk-benefit-icon">◷</span><div><b>پیگیری سفارش</b><small>دسترسی به مسیر سفارش‌های شما</small></div></article>
        </section>

        <section className="sk-catalog" id="sk-products" aria-labelledby="sk-products-title">
          <div className="sk-section-heading"><div><span className="sk-eyebrow">کاتالوگ بازارگاه</span><h2 id="sk-products-title">محصولات برای انتخاب تو</h2><p>کالاهای نمایش‌داده‌شده از کاتالوگ واقعی سوکار دریافت می‌شوند.</p></div><Link href="/marketplace" className="sk-section-link">رفتن به بازارگاه <span>←</span></Link></div>

          <div className="sk-category-row" aria-label="فیلتر دسته‌بندی">
            <button type="button" className={!category ? "sk-category-chip is-active" : "sk-category-chip"} onClick={() => setCategory("")}>همه کالاها</button>
            {categories.map((item, index) => <button type="button" key={item} className={category === item ? "sk-category-chip is-active" : "sk-category-chip"} onClick={() => setCategory(category === item ? "" : item)}><span>{["◈", "▯", "◇", "⌂", "✳", "▤"][index % 6]}</span>{item}</button>)}
          </div>

          <div className="sk-catalog-meta"><span>{loading ? "در حال دریافت کاتالوگ…" : <><b>{products.length.toLocaleString("fa-IR")}</b> نتیجه</>}</span>{(query || category) && <button type="button" onClick={() => { setQuery(""); setCategory(""); }}>پاک‌کردن فیلترها ×</button>}</div>

          {loading ? <div className="sk-state"><span className="sk-loader" />در حال دریافت اطلاعات واقعی محصولات…</div>
          : error ? <div className="sk-state sk-state-error"><b>دریافت محصولات انجام نشد</b><p>{error}</p><button type="button" onClick={() => window.location.reload()}>تلاش دوباره</button></div>
          : products.length ? <div className="sk-product-grid">{products.slice(0, 12).map(product => <article className="sk-product-card" key={product.id}>
            <Link href={"/store/product/" + encodeURIComponent(product.id)} className="sk-product-visual" aria-label={"مشاهده " + product.title}>
              <span className="sk-product-category">{product.category || "محصول"}</span><span className="sk-product-glyph">{categoryGlyph(product.category, product.title)}</span><span className="sk-visual-brand">SOOKAR</span>
            </Link>
            <div className="sk-product-info"><span className="sk-seller-name"><i />{product.seller_name || "فروشنده ثبت‌شده"}</span><Link href={"/store/product/" + encodeURIComponent(product.id)} className="sk-product-title">{product.title}</Link><p>{product.description || "توضیحات تکمیلی از سوی فروشنده ثبت نشده است."}</p><div className="sk-product-price"><strong>{money(product.price, product.currency)}</strong><small>قیمت ثبت‌شده</small></div><Link href={"/store/product/" + encodeURIComponent(product.id)} className="sk-product-cta">مشاهده و بررسی کالا <span>←</span></Link></div>
          </article>)}</div>
          : <div className="sk-state"><b>{data?.products?.length ? "محصولی با این فیلتر پیدا نشد." : "هنوز محصول فعالی برای نمایش عمومی ثبت نشده است."}</b><p>{data?.products?.length ? "فیلتر دسته‌بندی یا عبارت جستجو را تغییر بده." : "پس از ثبت و فعال‌سازی محصولات واقعی، کالاها در این بخش نمایش داده می‌شوند."}</p>{(query || category) && <button type="button" onClick={() => { setQuery(""); setCategory(""); }}>نمایش همه کالاها</button>}</div>}
          {products.length > 12 && <div className="sk-more"><Link href="/store/shop">مشاهده همه نتایج <span>←</span></Link></div>}
        </section>

        <section className="sk-market-banner">
          <div><span className="sk-eyebrow">برای فروشندگان</span><h2>کسب‌وکارت را به بازارگاه سوکار وصل کن.</h2><p>مسیر فروشندگان و فروشگاه‌های ثبت‌شده را ببین و درباره حضور در بازارگاه اطلاعات بگیر.</p><Link href="/marketplace/seller">ورود به بخش فروشندگان <span>←</span></Link></div>
          <div className="sk-banner-symbol" aria-hidden="true"><span>س</span><i /><i /><i /></div>
        </section>

        <section className="sk-bottom-links"><Link href="/marketplace/stores"><span>▦</span><b>فروشگاه‌های بازارگاه</b><small>مرور فروشگاه‌های ثبت‌شده</small><em>←</em></Link><Link href="/pay"><span>◇</span><b>خدمات اعتباری</b><small>مشاهده مسیرهای فعال</small><em>←</em></Link><Link href="/store/orders"><span>◷</span><b>پیگیری سفارش</b><small>رفتن به بخش سفارش‌ها</small><em>←</em></Link></section>
      </div>

      <footer className="sk-footer"><div className="sk-wrap sk-footer-main"><div className="sk-footer-brand"><Link href="/" className="sk-logo"><span className="sk-logo-mark">س</span><span><b>سوکار</b><small>فروشگاه و بازارگاه</small></span></Link><p>یک مسیر روشن برای کشف کالا، فروشگاه و انتخاب آگاهانه.</p></div><div><b>خرید</b><Link href="/store/shop">همه کالاها</Link><Link href="/marketplace">بازارگاه</Link><Link href="/marketplace/stores">فروشگاه‌ها</Link></div><div><b>خدمات</b><Link href="/store/orders">پیگیری سفارش</Link><Link href="/pay">خدمات اعتباری</Link><Link href="/marketplace/seller">فروشندگان</Link></div><div><b>حساب کاربری</b><Link href="/login">ورود</Link><Link href="/account/orders">سفارش‌های من</Link><Link href="/store/terms">قوانین و شرایط</Link></div></div><div className="sk-footer-bottom"><div className="sk-wrap"><span>سوکار · بازارگاه و فروشگاه اینترنتی</span><span>دامنه رسمی: sookar.ir</span></div></div></footer>
    </main>
  );
}
