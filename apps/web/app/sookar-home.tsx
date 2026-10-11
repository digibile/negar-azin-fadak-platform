"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "./store/cart-actions";
import "./sookar-home.css";

type Product = {
  id: string; sku: string; title: string; description: string | null;
  category: string | null; price: string; currency: string; seller_name: string;
  store_id: string | null; image_url?: string | null; brand?: string | null;
  is_reference?: boolean; is_demo_product?: boolean; source_url?: string | null;
};
type Catalog = { products: Product[]; categories?: string[]; total?: number };

const safeImage = (value?: string | null) =>
  value && (value.startsWith("https://") || value.startsWith("http://") || (value.startsWith("/") && !value.startsWith("//"))) ? value : null;
const money = (value: string, currency: string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString("fa-IR") + " " + (currency === "IRR" ? "ریال" : currency) : value + " " + currency;
};
const normalize = (value: string) => value.normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\s]+/g, " ").trim().toLocaleLowerCase("fa");
const glyph = (value: string) => /موبایل|گوشی|تبلت/.test(value) ? "▯" : /لپ.?تاپ|کامپیوتر|دیجیتال/.test(value) ? "▰" : /خانه|آشپزخانه/.test(value) ? "⌂" : /پوشاک|مد|کفش/.test(value) ? "◇" : /کتاب|هنر/.test(value) ? "▤" : "◈";
const categoriesFallback = ["موبایل و تبلت", "لپ‌تاپ و کامپیوتر", "صوتی و تصویری", "لوازم جانبی", "خانه و آشپزخانه", "مد و پوشاک", "سلامت و زیبایی", "ورزش و سفر"];

export default function SookarHome() {
  const [catalog, setCatalog] = useState<Catalog>({ products: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("featured");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/marketplace", { headers: { accept: "application/json" }, cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "دریافت محصولات ناموفق بود.");
        if (!Array.isArray(body.products)) throw new Error("ساختار کاتالوگ معتبر نیست.");
        if (!controller.signal.aborted) setCatalog({ products: body.products, categories: Array.isArray(body.categories) ? body.categories : [], total: Number(body.total || body.products.length) });
      })
      .catch(reason => {
        if (controller.signal.aborted || (reason instanceof Error && reason.name === "AbortError")) return;
        setError(reason instanceof Error ? reason.message : "اتصال به کاتالوگ برقرار نشد.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => {
    const fromProducts = catalog.products.map(p => (p.category || "").trim()).filter(Boolean);
    return Array.from(new Set([...(catalog.categories || []), ...fromProducts])).filter(Boolean).slice(0, 8);
  }, [catalog]);
  const products = useMemo(() => {
    let list = catalog.products.filter(p => {
      const term = normalize(search);
      const matchesSearch = !term || normalize([p.title, p.brand || "", p.category || "", p.seller_name || ""].join(" ")).includes(term);
      const productCategory = normalize(p.category || "");\n      const selectedCategory = normalize(category);\n      const matchesCategory = !selectedCategory || (!!productCategory && (productCategory.includes(selectedCategory) || selectedCategory.includes(productCategory)));
      return matchesSearch && matchesCategory;
    });
    if (sort === "price-asc") list = [...list].sort((a,b) => Number(a.price)-Number(b.price));
    if (sort === "price-desc") list = [...list].sort((a,b) => Number(b.price)-Number(a.price));
    if (sort === "name") list = [...list].sort((a,b) => a.title.localeCompare(b.title, "fa"));
    return list;
  }, [catalog, search, category, sort]);
  const shown = showAll ? products : products.slice(0, 12);

  return (
    <main className="sookar-home" dir="rtl">
      <div className="sh-announcement"><span className="sh-announcement-dot" /> بازارگاه سوکار؛ محصولات و فروشندگان در یک تجربهٔ یکپارچه <Link href="/marketplace">آشنایی با بازارگاه <span>←</span></Link></div>
      <header className="sh-header">
        <div className="sh-header-main sh-container">
          <Link href="/" className="sh-brand" aria-label="صفحه اصلی سوکار"><span className="sh-brand-mark">س</span><span><b>سوکار</b><small>بازارگاه خرید هوشمند</small></span></Link>
          <form className="sh-search" onSubmit={e => { e.preventDefault(); document.getElementById("sh-products")?.scrollIntoView({ behavior: "smooth" }); }}>
            <span aria-hidden="true">⌕</span><input value={search} onChange={e => { setSearch(e.target.value); setShowAll(false); }} placeholder="نام کالا، برند یا دسته‌بندی را جستجو کن..." aria-label="جستجوی کالا" /><button type="submit">جستجو</button>
          </form>
          <div className="sh-header-actions"><Link href="/login?brand=naf" className="sh-account"><span>♙</span><span>ورود / عضویت</span></Link><Link href="/store/cart" className="sh-cart"><span>▱</span><span>سبد خرید</span></Link></div>
        </div>
        <nav className="sh-nav sh-container" aria-label="ناوبری اصلی"><Link href="/marketplace">بازارگاه</Link><Link href="#sh-categories">دسته‌بندی کالاها</Link><Link href="#sh-products">محصولات منتخب</Link><Link href="/marketplace/directory">فروشگاه‌ها</Link><Link href="/pay">خرید اعتباری</Link><Link href="/store/faq">راهنمای خرید</Link></nav>
      </header>

      <div className="sh-container sh-page">
        <section className="sh-hero">
          <div className="sh-hero-copy"><span className="sh-eyebrow"><i /> انتخابی روشن، خریدی مطمئن</span><h1>چیزی که دنبالش هستی،<br /><em>از همین‌جا شروع می‌شود.</em></h1><p>محصولات و فروشگاه‌ها را یک‌جا ببین، اطلاعات ثبت‌شده را بررسی کن و با خیال روشن‌تری انتخاب کن.</p><div className="sh-hero-actions"><Link href="#sh-products" className="sh-button-primary">دیدن محصولات <span>←</span></Link><Link href="/marketplace/directory" className="sh-button-quiet">کشف فروشگاه‌ها</Link></div><div className="sh-hero-proof"><span>✓ اطلاعات شفاف کالا</span><span>✓ دسته‌بندی ساده</span><span>✓ دسترسی به فروشندگان</span></div></div>
          <div className="sh-hero-art" aria-label="معرفی بازارگاه سوکار"><div className="sh-art-orbit sh-art-orbit-one" /><div className="sh-art-orbit sh-art-orbit-two" /><div className="sh-art-core"><span>س</span><b>انتخاب بهتر</b><small>با سوکار</small></div><div className="sh-art-tile sh-art-tile-top"><span>⌕</span><b>جستجوی آسان</b></div><div className="sh-art-tile sh-art-tile-bottom"><span>▦</span><b>همه‌چیز یک‌جا</b></div><div className="sh-art-spark sh-spark-a">✳</div><div className="sh-art-spark sh-spark-b">✦</div></div>
        </section>

        <section id="sh-categories" className="sh-categories">
          <div className="sh-section-head"><div><span className="sh-eyebrow">سریع‌تر پیدا کن</span><h2>دسته‌بندی‌های پرطرفدار</h2></div><Link href="/store/shop">همهٔ کالاها <span>←</span></Link></div>
          <div className="sh-category-grid">{(categories.length ? categories : categoriesFallback).map((name, index) => <button type="button" key={name} className={category === name ? "sh-category is-active" : "sh-category"} onClick={() => { setCategory(category === name ? "" : name); setShowAll(false); document.getElementById("sh-products")?.scrollIntoView({ behavior: "smooth" }); }}><span className={"sh-category-icon sh-cat-" + (index % 4)}>{glyph(name)}</span><b>{name}</b><span className="sh-category-arrow">←</span></button>)}</div>
        </section>

        <section id="sh-products" className="sh-products">
          <div className="sh-section-head sh-product-head"><div><span className="sh-eyebrow">از کاتالوگ بازارگاه</span><h2>{category ? category : "محصولات برای انتخاب تو"}</h2><p>کارت‌ها و اطلاعات به‌صورت یکدست نمایش داده می‌شوند؛ جزئیات هر کالا در صفحهٔ خودش است.</p></div><div className="sh-product-tools"><label>مرتب‌سازی <select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">پیشنهادی</option><option value="price-asc">ارزان‌ترین</option><option value="price-desc">گران‌ترین</option><option value="name">نام کالا</option></select></label></div></div>
          {category && <button type="button" className="sh-clear-filter" onClick={() => setCategory("")}>حذف فیلتر دسته‌بندی ×</button>}
          {loading ? <div className="sh-state"><span className="sh-spinner" />در حال دریافت محصولات...</div> : error ? <div className="sh-state sh-state-error"><b>دریافت محصولات ممکن نشد</b><p>{error}</p><button onClick={() => window.location.reload()}>تلاش دوباره</button></div> : shown.length ? <div className="sh-product-grid">{shown.map(product => {
            const image = safeImage(product.image_url);
            const demo = Boolean(product.is_demo_product || product.is_reference);
            const href = "/store/product/" + encodeURIComponent(product.sku || product.id) + "?site=default";
            return <article className="sh-product-card" key={product.id}>
              <Link href={href} className="sh-product-image" aria-label={"مشاهدهٔ " + product.title}>
                <span className="sh-product-tag">{demo ? "نمونهٔ نمایشی" : (product.category || "محصول")}</span>
                {image ? <img src={image} alt={product.title} loading="lazy" decoding="async" /> : <span className="sh-product-placeholder">{glyph((product.category || "") + product.title)}<small>تصویر ثبت نشده</small></span>}
              </Link>
              <div className="sh-product-details"><span className="sh-product-brand">{product.brand || product.seller_name || "فروشندهٔ ثبت‌شده"}</span><Link href={href} className="sh-product-title">{product.title}</Link><div className="sh-product-price"><b>{money(product.price, product.currency)}</b><small>{demo ? "قیمت مرجع نمایشی" : "قیمت ثبت‌شده در کاتالوگ"}</small></div>
                <div className="sh-product-buttons"><Link href={href} className="sh-product-details-button">مشاهدهٔ کالا</Link>{!demo && <AddToCartButton compact product={{ id: product.id, sku: product.sku, title: product.title, price: product.price, currency: product.currency, seller_name: product.seller_name, store_id: product.store_id, image_url: product.image_url, is_demo_product: product.is_demo_product, source_url: product.source_url, site: "default" }} />}</div>
              </div>
            </article>;
          })}</div> : <div className="sh-state"><b>{search || category ? "محصولی با این مشخصات پیدا نشد." : "هنوز محصولی برای نمایش ثبت نشده است."}</b><p>عبارت جستجو یا دسته‌بندی را تغییر بده.</p><button onClick={() => { setSearch(""); setCategory(""); }}>نمایش همهٔ محصولات</button></div>}
          {!loading && products.length > 12 && <div className="sh-more-row"><span>{showAll ? "همهٔ نتایج دریافت‌شده نمایش داده شده‌اند" : "نمایش " + shown.length.toLocaleString("fa-IR") + " از " + products.length.toLocaleString("fa-IR") + " محصول"}</span><button type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "نمایش کمتر" : "مشاهدهٔ همهٔ محصولات"} <span>←</span></button></div>}
        </section>

        <section className="sh-service-strip"><div><span>⌕</span><b>پیدا کردن آسان</b><small>جستجو و دسته‌بندی روشن</small></div><div><span>▦</span><b>بازارگاه یکپارچه</b><small>محصولات فروشگاه‌ها در یک مسیر</small></div><div><span>◇</span><b>اطلاعات شفاف</b><small>قیمت و مشخصات ثبت‌شده</small></div><div><span>↗</span><b>مسیرهای روشن</b><small>دسترسی به سفارش و پشتیبانی</small></div></section>
        <section className="sh-seller-banner"><div><span className="sh-eyebrow">برای فروشندگان</span><h2>فروشگاهت را به بازارگاه سوکار متصل کن.</h2><p>برای آشنایی با مسیر فروشندگان و امکانات بازارگاه، از این بخش شروع کن.</p><Link href="/login?brand=naf">ورود فروشندگان <span>←</span></Link></div><div className="sh-seller-mark">س<span>+</span></div></section>
      </div>
      <footer className="sh-footer"><div className="sh-container sh-footer-main"><div className="sh-footer-brand"><Link href="/" className="sh-brand"><span className="sh-brand-mark">س</span><span><b>سوکار</b><small>بازارگاه خرید هوشمند</small></span></Link><p>یک مسیر یکپارچه برای کشف کالا، بررسی اطلاعات و ارتباط با فروشگاه‌های ثبت‌شده.</p></div><div><b>خرید و بازارگاه</b><Link href="/marketplace">بازارگاه</Link><Link href="/store/shop">همهٔ کالاها</Link><Link href="/marketplace/directory">فروشگاه‌ها</Link></div><div><b>سفارش‌ها</b><Link href="/store/cart">سبد خرید</Link><Link href="/store/orders">پیگیری سفارش</Link><Link href="/pay">خدمات اعتباری</Link></div><div><b>راهنما</b><Link href="/store/faq">پرسش‌های متداول</Link><Link href="/store/terms">قوانین و شرایط</Link><Link href="/login?brand=naf">حساب کاربری</Link></div></div><div className="sh-footer-bottom"><div className="sh-container"><span>© سوکار · بازارگاه یکپارچه خرید و فروش</span><span><Link href="https://sookar.ir">sookar.ir</Link> · اطلاعات قیمت و موجودی باید پیش از خرید بررسی شود.</span></div></div></footer>
    </main>
  );
}
