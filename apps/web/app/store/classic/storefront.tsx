"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "../styles.css";
import { AddToCartButton, CartCount } from "../cart-actions";

type Product = {
  id: string; sku: string; title: string; description: string | null;
  category: string | null; price: string; currency: string; seller_name: string;
  store_id: string | null; image_url?: string | null; brand?: string | null;
};
type Catalog = { products: Product[]; categories?: string[] };
const safeImage = (value?: string | null) => value && (/^https?:\/\//.test(value) || (value.startsWith("/") && !value.startsWith("//"))) ? value : null;
const money = (value: string, currency: string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString("fa-IR") + " " + (currency === "IRR" ? "ریال" : currency) : value + " " + currency;
};

export default function ClassicStorefront() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/marketplace", { cache: "no-store", headers: { accept: "application/json" }, signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok || !Array.isArray(body.products)) throw new Error(body.error || "دریافت کاتالوگ ناموفق بود.");
        if (!controller.signal.aborted) setCatalog({ products: body.products, categories: Array.isArray(body.categories) ? body.categories : [] });
      })
      .catch(reason => { if (!controller.signal.aborted && reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "خطا در دریافت کاتالوگ"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const products = (catalog?.products || []).filter(p => !query || [p.title, p.sku, p.category || "", p.brand || "", p.seller_name].join(" ").toLocaleLowerCase("fa").includes(query.toLocaleLowerCase("fa")));
  return <main className="sookar-store" dir="rtl">
    <header className="store-header">
      <Link href="/" className="store-logo"><b>سوکار</b><span>قالب کلاسیک فروشگاه</span></Link>
      <form className="store-search" onSubmit={e => { e.preventDefault(); document.getElementById("classic-products")?.scrollIntoView({ behavior: "smooth" }); }}>
        <input aria-label="جستجوی محصولات" value={query} onChange={e => setQuery(e.target.value)} placeholder="جستجوی کالا در کاتالوگ..." />
      </form>
      <nav><Link href="/store">قالب جدید</Link><Link href="/store/cart">سبد خرید <CartCount /></Link><Link href="/login">ورود</Link></nav>
    </header>
    <nav className="store-category-bar" aria-label="دسته‌بندی‌ها">{(catalog?.categories || []).slice(0, 12).map(category => <button key={category} type="button" onClick={() => setQuery(category)}>{category}</button>)}</nav>
    <section className="store-hero">
      <div><span>قالب محفوظ‌شده · نسخه کلاسیک</span><h1>خرید ساده، انتخاب روشن</h1><p>این نسخه برای مقایسه و بازگشت احتمالی حفظ شده است. محصولات و قیمت‌ها فقط از کاتالوگ واقعی سوکار دریافت می‌شوند.</p><div className="store-actions"><a href="#classic-products">مشاهده کالاها</a><Link className="secondary" href="/store">مشاهده قالب جدید</Link></div></div>
      <aside className="hero-card"><small>کاتالوگ واقعی</small><strong>{loading ? "در حال دریافت…" : products.length.toLocaleString("fa-IR") + " کالا"}</strong><span>بدون محصولات نمونه یا قیمت ساختگی</span><Link href="/marketplace/directory">فروشگاه‌های ثبت‌شده ←</Link></aside>
    </section>
    <section className="store-section" id="classic-products">
      <header><div><span>قالب کلاسیک</span><h2>محصولات ثبت‌شده</h2></div><Link href="/store">بازگشت به قالب اصلی ←</Link></header>
      {loading ? <p role="status">در حال دریافت اطلاعات کاتالوگ…</p> : error ? <p role="alert">{error}</p> : products.length ? <div className="product-grid">{products.map(product => {
        const href = "/store/product/" + encodeURIComponent(product.sku || product.id);
        const image = safeImage(product.image_url);
        return <article className="product-card" key={product.id}>
          <Link href={href} className="product-image">{image ? <img src={image} alt={product.title} loading="lazy" /> : <span>تصویر ثبت نشده</span>}<small>{product.category || "سایر کالاها"}</small></Link>
          <h3><Link href={href}>{product.title}</Link></h3><p>{product.description || "توضیحات تکمیلی توسط فروشنده ثبت نشده است."}</p>
          <small>{product.seller_name}</small><strong>{money(product.price, product.currency)}</strong>
          <Link href={href}>مشاهده جزئیات ←</Link>
          <AddToCartButton compact product={{ id: product.id, sku: product.sku, title: product.title, price: product.price, currency: product.currency, seller_name: product.seller_name, store_id: product.store_id, image_url: product.image_url }} />
        </article>;
      })}</div> : <p>{query ? "محصولی با این جستجو پیدا نشد." : "هنوز محصول فعالی در کاتالوگ ثبت نشده است."}</p>}
    </section>
    <footer className="store-footer"><div><b>سوکار · قالب کلاسیک</b><p>این قالب حفظ شده و حذف یا جایگزین نشده است.</p></div><div><Link href="/store">قالب جدید</Link><Link href="/store/digikala">پیش‌نمایش قالب قرمز</Link><Link href="/store/technolife">پیش‌نمایش فروشگاه فناوری</Link></div></footer>
  </main>;
}
