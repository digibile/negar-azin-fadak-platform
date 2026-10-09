"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./storefront.css";
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
  image_url?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  source_type?: string | null;
  brand?: string | null;
  rating?: number | null;
};
type Store = { id: string; name: string; slug: string; seller_name: string };
type Catalog = { tenant?: { name?: string }; products: Product[]; stores?: Store[]; categories?: string[]; total?: number; referenceCatalogStatus?: "live" | "unavailable" };

const money = (value: string, currency: string) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency}`;
  return `${amount.toLocaleString("fa-IR")} ${currency === "IRR" ? "ریال" : currency}`;
};

const safeImageUrl = (value: string | null | undefined) => value && (value.startsWith("https://") || value.startsWith("http://") || (value.startsWith("/") && !value.startsWith("//"))) ? value : null;
const normalizeText = (value: string) => value
  .normalize("NFKC")
  .replace(/[يى]/g, "ی")
  .replace(/ك/g, "ک")
  .replace(/[\u200c\s]+/g, " ")
  .trim()
  .toLocaleLowerCase("fa");

const BROWSE_CATEGORIES = [
  "موبایل و تبلت",
  "لپ‌تاپ و کامپیوتر",
  "خانه و آشپزخانه",
  "مد و پوشاک",
  "زیبایی و سلامت",
  "صوتی و تصویری",
  "ورزش و سفر",
  "کتاب و لوازم‌التحریر",
  "کودک و نوزاد",
  "خودرو و ابزار",
  "سوپرمارکت",
  "لوازم اداری"
];

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
  const pathname = usePathname();
  const showAllProducts = pathname === "/store/shop";
  const [data, setData] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const readJson = async (url: string) => {
      const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store", signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "دریافت کاتالوگ ناموفق بود.");
      return body;
    };
    Promise.allSettled([
      readJson("/api/public/marketplace"),
      readJson("/api/public/digikala-catalog")
    ]).then(([marketplaceResult, referenceResult]) => {
      if (controller.signal.aborted) return;
      const marketplace = marketplaceResult.status === "fulfilled" && Array.isArray(marketplaceResult.value.products)
        ? marketplaceResult.value as Catalog
        : null;
      const reference = referenceResult.status === "fulfilled" && Array.isArray(referenceResult.value.products)
        ? referenceResult.value.products as Product[]
        : [];
      if (!marketplace && !reference.length) {
        const reason = marketplaceResult.status === "rejected" ? marketplaceResult.reason : referenceResult.status === "rejected" ? referenceResult.reason : null;
        throw reason instanceof Error ? reason : new Error("کاتالوگ در دسترس نیست.");
      }
      const ownProducts = marketplace?.products || [];
      const combined = [...ownProducts, ...reference.filter(item => !ownProducts.some(own => own.id === item.id))];
      const categoryNames = [
        ...(marketplace?.categories || []),
        ...combined.map(product => product.category || "")
      ].filter((name): name is string => Boolean(name.trim()));
      setData({
        ...(marketplace || { products: [], stores: [], categories: [] }),
        products: combined,
        categories: [...new Set(categoryNames)],
        total: combined.length,
        referenceCatalogStatus: referenceResult.status === "fulfilled" ? referenceResult.value.sourceStatus : "unavailable"
      });
      setError("");
    }).catch(reason => {
      if (reason instanceof Error && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "اتصال به کاتالوگ برقرار نشد.");
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => {
    const names = [
      ...(data?.categories || []),
      ...(data?.products || []).map(product => product.category?.trim() || "")
    ].filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
    const unique = new Map<string, string>();
    for (const name of names) {
      const key = normalizeText(name);
      if (key && !unique.has(key)) unique.set(key, name.trim());
    }
    const registered = [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1], "fa"));
    // Keep the browse taxonomy visible even before the first real product is published.
    // Counts and product cards remain driven exclusively by the live catalog API.
    return registered.length ? registered : BROWSE_CATEGORIES.map(name => [normalizeText(name), name] as [string, string]);
  }, [data]);

  const products = useMemo(() => {
    const needle = normalizeText(query);
    const selectedCategory = normalizeText(category);
    return (data?.products || []).filter(product => {
      const matchesCategory = !selectedCategory || normalizeText(product.category || "") === selectedCategory;
      const searchable = normalizeText([product.title, product.sku, product.category || "", product.seller_name, product.description || ""].join(" "));
      return matchesCategory && (!needle || searchable.includes(needle));
    });
  }, [data, query, category]);

  return (
    <main className="sk-store" dir="rtl">
      <div className="sk-service-strip">
        <div className="sk-wrap sk-service-inner">
          <span>سوکار، بازارگاه یکپارچه خرید و فروش</span>
          <div><Link href="/marketplace/directory">فروشندگان</Link><Link href="/pay">خدمات اعتباری</Link><Link href="/store/orders">پیگیری سفارش</Link></div>
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
            <Link className="sk-register" href="/register">عضویت</Link>
            <Link className="sk-cart" href="/store/cart" aria-label="سبد خرید"><span aria-hidden="true">♧</span></Link>
          </div>
        </div>
        <nav className="sk-main-nav" aria-label="ناوبری اصلی">
          <div className="sk-wrap sk-nav-inner">
            <Link className="sk-all-cats" href="/store/shop"><span>☰</span> دسته‌بندی کالاها</Link>
            <Link href="/store/shop">فروشگاه و فروشندگان</Link>
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
            <div className="sk-hero-actions"><Link href="/store/shop" className="sk-primary-btn">دیدن همه کالاها <span>←</span></Link><Link href="/marketplace/directory" className="sk-quiet-btn">آشنایی با فروشندگان</Link></div>
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

        <section className="sk-featured-categories" aria-labelledby="sk-featured-categories-title">
          <div className="sk-section-heading"><div><span className="sk-eyebrow">دسته‌بندی‌های بازارگاه</span><h2 id="sk-featured-categories-title">از کجا شروع کنیم؟</h2><p>دستهٔ موردنظرت را انتخاب کن تا کالاهای مرتبط از کاتالوگ نمایش داده شوند.</p></div><Link href="/store/shop" className="sk-section-link">همه کالاها <span>←</span></Link></div>
          {categories.length ? <div className="sk-featured-grid">
            {categories.slice(0, 8).map(([key, name]) => {
              const count = (data?.products || []).filter(product => normalizeText(product.category || "") === key).length;
              const active = normalizeText(category) === key;
              return <button type="button" key={key} className={active ? "sk-featured-category is-active" : "sk-featured-category"} aria-pressed={active} onClick={() => { setCategory(active ? "" : name); document.getElementById("sk-products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                <span className="sk-featured-image sk-category-art" style={(() => { const image = safeImageUrl((data?.products || []).find(product => normalizeText(product.category || "") === key && safeImageUrl(product.image_url))?.image_url); return image ? { backgroundImage: `linear-gradient(0deg,rgba(20,32,45,.12),rgba(20,32,45,.02)),url("${image}")` } : undefined; })()}><i>{categoryGlyph(name, name)}</i></span>
                <span className="sk-featured-copy"><b>{name}</b><small>{count.toLocaleString("fa-IR")} محصول ثبت‌شده</small></span><span className="sk-featured-arrow">←</span>
              </button>;
            })}
          </div> : <div className="sk-category-empty"><span>▦</span><div><b>دسته‌بندی‌های اصلی بازارگاه</b><p>این فهرست برای مرور دسته‌ها آماده است؛ تعداد کالاها فقط از محصولات واقعی و منتشرشده محاسبه می‌شود.</p></div></div>}
        </section>

        <section className="sk-catalog" id="sk-products" aria-labelledby="sk-products-title">
          <div className="sk-section-heading"><div><span className="sk-eyebrow">کاتالوگ بازارگاه</span><h2 id="sk-products-title">محصولات برای انتخاب تو</h2><p>کالاهای فعال بازارگاه و محصولات مرجع با پیوند به منبع اصلی نمایش داده می‌شوند.</p>{data?.referenceCatalogStatus === "unavailable" && <small className="sk-source-status-note">منبع زندهٔ دیجی‌کالا در دسترس نیست؛ فقط کالاهای داخلی نمایش داده می‌شوند.</small>}</div><Link href="/marketplace" className="sk-section-link">رفتن به بازارگاه <span>←</span></Link></div>

          <div className="sk-category-row" aria-label="فیلتر دسته‌بندی">
            <button type="button" className={!category ? "sk-category-chip is-active" : "sk-category-chip"} onClick={() => setCategory("")}>همه کالاها</button>
            {categories.map(([key, item]) => {
              const active = normalizeText(category) === key;
              const count = (data?.products || []).filter(product => normalizeText(product.category || "") === key).length;
              return <button type="button" key={key} aria-pressed={active} className={active ? "sk-category-chip is-active" : "sk-category-chip"} onClick={() => setCategory(active ? "" : item)}><span>{categoryGlyph(item, item)}</span>{item} <small>({count.toLocaleString("fa-IR")})</small></button>;
            })}
          </div>

          <div className="sk-catalog-meta"><span>{loading ? "در حال دریافت کاتالوگ…" : <><b>{products.length.toLocaleString("fa-IR")}</b> نتیجه</>}</span>{(query || category) && <button type="button" onClick={() => { setQuery(""); setCategory(""); }}>پاک‌کردن فیلترها ×</button>}</div>

          {loading ? <div className="sk-state"><span className="sk-loader" />در حال دریافت اطلاعات واقعی محصولات…</div>
          : error ? <div className="sk-state sk-state-error"><b>دریافت محصولات انجام نشد</b><p>{error}</p><button type="button" onClick={() => window.location.reload()}>تلاش دوباره</button></div>
          : products.length ? <div className="sk-product-grid">{products.slice(0, showAllProducts ? products.length : 20).map(product => <article className="sk-product-card" key={product.id}>
            <Link href={product.source_url || ("/store/product/" + encodeURIComponent(product.id))} target={product.source_url ? "_blank" : undefined} rel={product.source_url ? "noopener noreferrer" : undefined} className="sk-product-visual" aria-label={"مشاهده " + product.title}>
              <span className="sk-product-category">{product.category || "محصول"}</span>{product.source_name && <span className="sk-product-source">مرجع: {product.source_name}</span>}{safeImageUrl(product.image_url) ? <img src={safeImageUrl(product.image_url)!} alt={product.title} loading="lazy" decoding="async" /> : <span className="sk-product-glyph"><span aria-hidden="true">{categoryGlyph(product.category, product.title)}</span><small>تصویر توسط فروشنده ثبت نشده</small></span>}<span className="sk-visual-brand">SOOKAR</span>
            </Link>
            <div className="sk-product-info"><span className="sk-seller-name"><i />{product.seller_name || "فروشنده ثبت‌شده"}</span><Link href={product.source_url || ("/store/product/" + encodeURIComponent(product.id))} target={product.source_url ? "_blank" : undefined} rel={product.source_url ? "noopener noreferrer" : undefined} className="sk-product-title">{product.title}</Link><p>{product.description || (product.source_url ? "برای مشخصات کامل، قیمت روز و وضعیت موجودی، صفحه اصلی دیجی‌کالا را ببینید." : "توضیحات تکمیلی از سوی فروشنده ثبت نشده است.")}</p><div className="sk-product-price"><strong>{money(product.price, product.currency)}</strong><small>{product.source_url ? "قیمت ثبت‌شده در منبع · پیش از خرید بررسی شود" : "قیمت ثبت‌شده"}</small></div><Link href={product.source_url || ("/store/product/" + encodeURIComponent(product.id))} target={product.source_url ? "_blank" : undefined} rel={product.source_url ? "noopener noreferrer" : undefined} className="sk-product-cta">{product.source_url ? "مشاهده در دیجی‌کالا" : "مشاهده و بررسی کالا"} <span>←</span></Link></div>
          </article>)}</div>
          : <div className="sk-state"><b>{data?.products?.length ? "محصولی با این فیلتر پیدا نشد." : "هنوز محصول فعالی برای نمایش عمومی ثبت نشده است."}</b><p>{data?.products?.length ? "فیلتر دسته‌بندی یا عبارت جستجو را تغییر بده." : "پس از ثبت و فعال‌سازی محصولات واقعی، کالاها در این بخش نمایش داده می‌شوند."}</p>{(query || category) && <button type="button" onClick={() => { setQuery(""); setCategory(""); }}>نمایش همه کالاها</button>}</div>}
          {products.length > 12 && !showAllProducts && <div className="sk-more"><Link href="/store/shop">مشاهده همه {products.length.toLocaleString("fa-IR")} نتیجه <span>←</span></Link></div>}
          {showAllProducts && products.length > 12 && <div className="sk-catalog-meta"><span>نمایش همه نتایج دریافت‌شده از کاتالوگ</span><Link href="/">بازگشت به صفحه اصلی</Link></div>}
        </section>

        <section className="sk-market-banner">
          <div><span className="sk-eyebrow">برای فروشندگان</span><h2>کسب‌وکارت را به بازارگاه سوکار وصل کن.</h2><p>مسیر فروشندگان و فروشگاه‌های ثبت‌شده را ببین و درباره حضور در بازارگاه اطلاعات بگیر.</p><Link href="/login">ورود به بخش فروشندگان <span>←</span></Link></div>
          <div className="sk-banner-symbol" aria-hidden="true"><span>س</span><i /><i /><i /></div>
        </section>

        <section className="sk-bottom-links"><Link href="/marketplace/directory"><span>▦</span><b>فروشگاه‌های بازارگاه</b><small>مرور فروشگاه‌های ثبت‌شده</small><em>←</em></Link><Link href="/pay"><span>◇</span><b>خدمات اعتباری</b><small>مشاهده مسیرهای فعال</small><em>←</em></Link><Link href="/store/orders"><span>◷</span><b>پیگیری سفارش</b><small>رفتن به بخش سفارش‌ها</small><em>←</em></Link></section>
      </div>

      <footer className="sk-footer">
        <div className="sk-wrap sk-footer-main">
          <div className="sk-footer-brand">
            <Link href="/" className="sk-logo"><span className="sk-logo-mark">س</span><span><b>سوکار</b><small>فروشگاه و بازارگاه</small></span></Link>
            <p>یک مسیر یکپارچه برای کشف کالا، مقایسه انتخاب‌ها و خرید از فروشگاه‌های ثبت‌شده.</p>
            <div className="sk-footer-domain"><span aria-hidden="true">↗</span><span><small>نشانی رسمی</small><b>sookar.ir</b></span></div>
          </div>
          <div className="sk-footer-column"><b>خرید و کشف کالا</b><Link href="/store/shop">همه کالاها</Link><Link href="/marketplace">بازارگاه</Link><Link href="/marketplace/directory">فروشگاه‌های ثبت‌شده</Link><Link href="/store">دسته‌بندی‌های کالا</Link></div>
          <div className="sk-footer-column"><b>سفارش و پرداخت</b><Link href="/store/cart">سبد خرید</Link><Link href="/store/orders">پیگیری سفارش</Link><Link href="/pay">خدمات اعتباری</Link><Link href="/store/returns">بازگشت کالا</Link></div>
          <div className="sk-footer-column"><b>حساب کاربری</b><Link href="/login">ورود به حساب</Link><Link href="/account/orders">سفارش‌های من</Link><Link href="/login">پنل فروشندگان</Link><Link href="/store/faq">پرسش‌های متداول</Link></div>
          <div className="sk-footer-column"><b>راهنما و قوانین</b><Link href="/store/terms">قوانین و شرایط</Link><Link href="/store/faq">راهنمای خرید</Link><Link href="/marketplace/directory">معرفی فروشگاه‌ها</Link><Link href="/login">ارتباط با پشتیبانی</Link></div>
        </div>
        <div className="sk-footer-trust"><div className="sk-wrap"><span><i>✓</i> نمایش اطلاعات ثبت‌شدهٔ کاتالوگ</span><span><i>⌕</i> جستجو و دسته‌بندی کالاها</span><span><i>↗</i> دسترسی مستقیم به صفحات فروشگاه</span></div></div>
        <div className="sk-footer-bottom"><div className="sk-wrap"><span>سوکار · فروشگاه اینترنتی و بازارگاه</span><span>نشانی سایت: <a href="https://sookar.ir" target="_blank" rel="noopener noreferrer">sookar.ir ↗</a></span><span>اطلاعات قیمت و موجودی باید پیش از خرید بررسی شود.</span></div></div>
      </footer>
    </main>
  );
}
