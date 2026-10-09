"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./storefront.css";
import { AddToCartButton, CartCount } from "./cart-actions";
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
  brand?: string | null;
  rating?: number | null;
};
type Store = { id: string; name: string; slug: string; seller_name: string };
type Catalog = { tenant?: { name?: string }; products: Product[]; stores?: Store[]; categories?: string[]; total?: number };

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
  "موبایل",
  "ابزارآلات",
  "لپ تاپ",
  "پزشکی و سلامت",
  "کالای دیجیتال",
  "شهر کتاب و هنر",
  "خانه و آشپزخانه",
  "ورزش و سفر",
  "لوازم خانگی برقی",
  "کارت هدیه",
  "آرایشی بهداشتی",
  "سوپرمارکتی",
  "مد و پوشاک",
  "اسباب‌بازی و کودک",
  "طلا و نقره",
  "بومی و محلی",
  "خودرو و موتور",
  "پت شاپ"
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
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc" | "title">("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/marketplace", {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal
    }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "دریافت کاتالوگ ناموفق بود.");
      if (!Array.isArray(body.products)) throw new Error("ساختار کاتالوگ معتبر نیست.");
      if (!controller.signal.aborted) {
        setData({
          ...body,
          products: body.products,
          categories: Array.isArray(body.categories) ? body.categories : [],
          total: Number(body.total || body.products.length)
        } as Catalog);
        setError("");
      }
    }).catch(reason => {
      if (controller.signal.aborted || (reason instanceof Error && reason.name === "AbortError")) return;
      setError(reason instanceof Error ? reason.message : "اتصال به کاتالوگ برقرار نشد.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const canonicalCategory = (value: string | null | undefined) => {
    const key = normalizeText(value || "");
    if (!key) return "";
    const aliases: Array<[RegExp, string]> = [
      [/موبایل|گوشی|تبلت|mobile|phone|tablet/, "موبایل"],
      [/ابزارآلات|ابزار|tool|hardware/, "ابزارآلات"],
      [/لپ.?تاپ|کامپیوتر|مانیتور|computer|laptop/, "لپ تاپ"],
      [/پزشکی|سلامت|دارو|medical|health/, "پزشکی و سلامت"],
      [/کالای دیجیتال|صوتی|تصویری|هدفون|اسپیکر|دوربین|digital|audio|video/, "کالای دیجیتال"],
      [/کتاب|هنر|فرهنگ|لوازم.?التحریر|stationery|book|art|اداری|office/, "شهر کتاب و هنر"],
      [/لوازم خانگی برقی|جاروبرقی|یخچال|ماشین لباسشویی|appliance/, "لوازم خانگی برقی"],
      [/خانه|آشپزخانه|لوازم خانگی|home|kitchen/, "خانه و آشپزخانه"],
      [/ورزش|سفر|sport|travel/, "ورزش و سفر"],
      [/کارت هدیه|gift.?card/, "کارت هدیه"],
      [/آرایشی|زیبایی|مراقبت پوست|cosmetic|beauty/, "آرایشی بهداشتی"],
      [/سوپرمارکت|سوپرمارکتی|خوراک|مواد غذایی|grocery|supermarket/, "سوپرمارکتی"],
      [/پوشاک|لباس|کفش|مد|fashion|apparel|clothing/, "مد و پوشاک"],
      [/اسباب.?بازی|کودک|نوزاد|baby|toy|kid/, "اسباب‌بازی و کودک"],
      [/طلا|نقره|gold|silver/, "طلا و نقره"],
      [/بومی|محلی|صنایع دستی|local/, "بومی و محلی"],
      [/خودرو|موتور|car|auto|motor/, "خودرو و موتور"],
      [/پت.?شاپ|حیوان خانگی|pet|animal/, "پت شاپ"]
    ];
    return aliases.find(([pattern]) => pattern.test(key))?.[1] || BROWSE_CATEGORIES.find(name => normalizeText(name) === key) || key;
  };

  const categories = [...new Set([
    ...(data?.categories || []),
    ...(data?.products || []).map(product => product.category || ""),
    ...BROWSE_CATEGORIES
  ].map(name => name.trim()).filter(Boolean))]
    .map(name => canonicalCategory(name))
    .filter((name, index, all) => all.findIndex(item => normalizeText(item) === normalizeText(name)) === index)
    .map(name => [normalizeText(name), name] as [string, string]);

  const products = useMemo(() => {
    const needle = normalizeText(query);
    const selectedCategory = canonicalCategory(category);
    const filtered = (data?.products || []).filter(product => {
      const matchesCategory = !selectedCategory || canonicalCategory(product.category) === selectedCategory;
      const searchable = normalizeText([product.title, product.sku, product.category || "", product.seller_name, product.description || "", product.brand || ""].join(" "));
      return matchesCategory && (!needle || searchable.includes(needle));
    });
    if (sortBy === "price-asc") filtered.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "price-desc") filtered.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === "title") filtered.sort((a, b) => a.title.localeCompare(b.title, "fa"));
    return filtered;
  }, [data, query, category, sortBy]);

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
            <Link className="sk-cart" href="/store/cart" aria-label="سبد خرید"><span aria-hidden="true">🛒</span><CartCount /></Link>
          </div>
        </div>
        <nav className="sk-main-nav" aria-label="ناوبری اصلی">
          <div className="sk-wrap sk-nav-inner">
            <div className="sk-category-nav-menu">
              <button type="button" className="sk-all-cats" aria-expanded={showCategoryMenu} aria-haspopup="menu" onClick={() => setShowCategoryMenu(open => !open)}><span>☰</span> دسته‌بندی کالاها <span className="sk-category-nav-chevron">{showCategoryMenu ? "⌃" : "⌄"}</span></button>
              {showCategoryMenu && <div className="sk-category-nav-dropdown" role="menu" aria-label="دسته‌بندی کالاها">
                {categories.map(([key,name]) => <button type="button" role="menuitem" key={key} onClick={() => { setCategory(name); setShowCategoryMenu(false); document.getElementById("sk-products")?.scrollIntoView({behavior:"smooth",block:"start"}); }}><span>{categoryGlyph(name,name)}</span><b>{name}</b><i>←</i></button>)}
              </div>}
            </div>
            <Link href="/store/shop">فروشگاه و فروشندگان</Link>
            <Link href="/pay">خرید اعتباری</Link>
            <Link href="/store/orders">پیگیری سفارش</Link>
          </div>
        </nav>
      </header>

      <div className="sk-wrap">
        <section className="sk-hero sk-retail-hero" aria-labelledby="sk-hero-title">
          <div className="sk-hero-copy">
            <span className="sk-hero-kicker"><i /> بازارگاه سوکار</span>
            <h1 id="sk-hero-title">هرچی لازم داری،<br /><em>یک‌جا پیدا کن.</em></h1>
            <p>کالاهای فروشگاه‌های فعال را ببین، مشخصات و قیمت ثبت‌شده را بررسی کن و محصولات موردنظرت را به سبد خرید اضافه کن.</p>
            <div className="sk-hero-actions"><Link href="/store/shop" className="sk-primary-btn">خرید از همه دسته‌ها <span>←</span></Link><Link href="/marketplace/directory" className="sk-quiet-btn">فروشگاه‌های بازارگاه</Link></div>
            <div className="sk-hero-note"><span>✓</span> فقط اطلاعات کاتالوگ واقعی؛ بدون محصول و قیمت ساختگی</div>
          </div>
          <div className="sk-hero-products" aria-label="محصولات منتخب از کاتالوگ">
            {(data?.products || []).filter(product => safeImageUrl(product.image_url)).slice(0, 3).map((product, index) => (
              <Link href={"/store/product/" + encodeURIComponent(product.sku || product.id)} className={"sk-hero-product sk-hero-product-" + index} key={product.id}>
                <img src={safeImageUrl(product.image_url) || ""} alt={product.title} />
                <span>{product.title}</span><b>{money(product.price, product.currency)}</b>
              </Link>
            ))}
            {(!data?.products?.length) && <div className="sk-hero-empty"><span>س</span><b>خرید ساده‌تر، انتخاب آگاهانه‌تر</b><small>محصولات فعال فروشگاه در اینجا نمایش داده می‌شوند</small></div>}
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
              const count = (data?.products || []).filter(product => normalizeText(canonicalCategory(product.category)) === key).length;
              const active = normalizeText(canonicalCategory(category)) === key;
              return <button type="button" key={key} className={active ? "sk-featured-category is-active" : "sk-featured-category"} aria-pressed={active} onClick={() => { setCategory(active ? "" : name); document.getElementById("sk-products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                <span className="sk-featured-image sk-category-art" style={(() => { const image = safeImageUrl((data?.products || []).find(product => normalizeText(product.category || "") === key && safeImageUrl(product.image_url))?.image_url); return image ? { backgroundImage: `linear-gradient(0deg,rgba(20,32,45,.12),rgba(20,32,45,.02)),url("${image}")` } : undefined; })()}><i>{categoryGlyph(name, name)}</i></span>
                <span className="sk-featured-copy"><b>{name}</b><small>{count.toLocaleString("fa-IR")} محصول ثبت‌شده</small></span><span className="sk-featured-arrow">←</span>
              </button>;
            })}
          </div> : <div className="sk-category-empty"><span>▦</span><div><b>دسته‌بندی‌های اصلی بازارگاه</b><p>این فهرست برای مرور دسته‌ها آماده است؛ تعداد کالاها فقط از محصولات واقعی و منتشرشده محاسبه می‌شود.</p></div></div>}
        </section>

        <section className="sk-catalog" id="sk-products" aria-labelledby="sk-products-title">
          <div className="sk-section-heading"><div><span className="sk-eyebrow">کاتالوگ بازارگاه</span><h2 id="sk-products-title">محصولات برای انتخاب تو</h2><p>فقط محصولاتی نمایش داده می‌شوند که در کاتالوگ خود سوکار ثبت و برای فروش فعال شده‌اند.</p></div><Link href="/marketplace" className="sk-section-link">رفتن به بازارگاه <span>←</span></Link></div>

          <div className="sk-category-row" aria-label="فیلتر دسته‌بندی">
            <button type="button" className={!category ? "sk-category-chip is-active" : "sk-category-chip"} onClick={() => setCategory("")}>همه کالاها</button>
            {categories.map(([key, item]) => {
              const active = normalizeText(category) === key;
              const count = (data?.products || []).filter(product => normalizeText(canonicalCategory(product.category)) === key).length;
              return <button type="button" key={key} aria-pressed={active} className={active ? "sk-category-chip is-active" : "sk-category-chip"} onClick={() => setCategory(active ? "" : item)}><span>{categoryGlyph(item, item)}</span>{item} <small>({count.toLocaleString("fa-IR")})</small></button>;
            })}
          </div>

          <div className="sk-catalog-meta"><span>{loading ? "در حال دریافت کاتالوگ…" : <><b>{products.length.toLocaleString("fa-IR")}</b> نتیجه</>}</span><label className="sk-sort-control">مرتب‌سازی <select value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)}><option value="newest">جدیدترین ثبت‌شده</option><option value="price-asc">ارزان‌ترین</option><option value="price-desc">گران‌ترین</option><option value="title">نام کالا</option></select></label>{(query || category) && <button type="button" onClick={() => { setQuery(""); setCategory(""); }}>پاک‌کردن فیلترها ×</button>}</div>

          {loading ? <div className="sk-state"><span className="sk-loader" />در حال دریافت اطلاعات واقعی محصولات…</div>
          : error ? <div className="sk-state sk-state-error"><b>دریافت محصولات انجام نشد</b><p>{error}</p><button type="button" onClick={() => window.location.reload()}>تلاش دوباره</button></div>
          : products.length ? <div className="sk-product-grid">{products.slice(0, showAllProducts ? products.length : 20).map(product => {
            const productHref = "/store/product/" + encodeURIComponent(product.sku || product.id);
            const image = safeImageUrl(product.image_url);
            return <article className="sk-product-card" key={product.id}>
              <Link href={productHref} className="sk-product-visual" aria-label={"مشاهده " + product.title}>
                <span className="sk-product-category">{canonicalCategory(product.category) || "سایر کالاها"}</span>
                {image ? <img src={image} alt={product.title} loading="lazy" decoding="async" /> : <span className="sk-product-glyph"><span aria-hidden="true">{categoryGlyph(product.category, product.title)}</span><small>تصویر کالا هنوز ثبت نشده</small></span>}
                <span className="sk-visual-brand">SOOKAR</span>
              </Link>
              <div className="sk-product-info">
                <span className="sk-seller-name"><i />{product.seller_name || "فروشنده ثبت‌شده"}</span>
                <Link href={productHref} className="sk-product-title">{product.title}</Link>
                <p>{product.description || "مشخصات تکمیلی این کالا هنوز توسط فروشنده ثبت نشده است."}</p>
                <div className="sk-product-price"><strong>{money(product.price, product.currency)}</strong><small>قیمت ثبت‌شده در کاتالوگ سوکار</small></div>
                <Link href={productHref} className="sk-product-cta">مشاهده جزئیات و خرید <span>←</span></Link>
               <AddToCartButton compact product={{ id: product.id, sku: product.sku, title: product.title, price: product.price, currency: product.currency, seller_name: product.seller_name, store_id: product.store_id, image_url: product.image_url }} />
              </div>
            </article>;
          })}</div>
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
