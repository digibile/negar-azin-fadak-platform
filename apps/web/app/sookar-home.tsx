"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CartCount } from "./store/cart-actions";
import "./sookar-home.css";

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
  is_reference?: boolean;
  is_demo_product?: boolean;
  source_url?: string | null;
};
type Catalog = { products: Product[]; categories?: string[]; total?: number; catalogMode?: string };

const CATEGORY_GUIDES = [
  { name: "موبایل و تبلت", key: /موبایل|گوشی|تبلت|تلفن/, icon: "▯", tone: "mint" },
  { name: "لپ‌تاپ و کامپیوتر", key: /لپ.?تاپ|کامپیوتر|مانیتور|قطعات|رم|پردازنده/, icon: "▰", tone: "blue" },
  { name: "صوتی و تصویری", key: /صوت|هدفون|هندزفری|اسپیکر|تلویزیون|دوربین/, icon: "♫", tone: "violet" },
  { name: "گجت و پوشیدنی", key: /ساعت هوشمند|پوشیدنی|گجت|مچ.?بند/, icon: "◷", tone: "amber" },
  { name: "لوازم جانبی", key: /لوازم جانبی|شارژر|کابل|پاوربانک|کیف و کاور/, icon: "◇", tone: "rose" },
  { name: "خانه و آشپزخانه", key: /خانه|آشپزخانه|لوازم خانگی/, icon: "⌂", tone: "sand" },
  { name: "مد و پوشاک", key: /مد|پوشاک|لباس|کفش|کیف/, icon: "✳", tone: "pink" },
  { name: "سلامت و زیبایی", key: /سلامت|زیبایی|آرایش|بهداشت|مراقبت/, icon: "✦", tone: "green" }
];
const FALLBACK_CATEGORIES = ["موبایل و تبلت", "لپ‌تاپ و کامپیوتر", "صوتی و تصویری", "گجت و پوشیدنی", "لوازم جانبی", "خانه و آشپزخانه", "مد و پوشاک", "سلامت و زیبایی"];
const safeImage = (value?: string | null) => value && (value.startsWith("https://") || value.startsWith("http://") || (value.startsWith("/") && !value.startsWith("//"))) ? value : null;
const normalize = (value: string) => value.normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\s]+/g, " ").trim().toLocaleLowerCase("fa");
const money = (value: string, currency: string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString("fa-IR") + " " + (currency === "IRR" ? "ریال" : currency) : value + " " + currency;
};
const productHref = (product: Product) => "/store/product/" + encodeURIComponent(product.sku || product.id) + "?site=default";

function Icon({ name }: { name: "search" | "user" | "cart" | "arrow" | "chevron" | "shield" | "truck" | "support" | "store" | "heart" }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<typeof name, ReactNode> = {
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.2 3.1-5 7-5s6.3 1.8 7 5" /></>,
    cart: <><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 1.9-1.4L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    arrow: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    shield: <><path d="M12 3 19 6v5c0 4.7-2.9 7.8-7 10-4.1-2.2-7-5.3-7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
    truck: <><path d="M3 6h11v11H3z" /><path d="M14 10h4l3 3v4h-7z" /><circle cx="7.5" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" /></>,
    support: <><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><path d="M4 13h3v5H6a2 2 0 0 1-2-2zM20 13h-3v5h1a2 2 0 0 0 2-2z" /><path d="M17 19c-1 1.1-2.5 1.5-4.5 1.5" /></>,
    store: <><path d="M4 10v10h16V10" /><path d="m3 9 2-5h14l2 5" /><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M9 20v-6h6v6" /></>,
    heart: <path d="M20.8 8.7c0 5.1-8.8 10-8.8 10s-8.8-4.9-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3z" />
  };
  return <svg {...common}>{paths[name]}</svg>;
}

export default function SookarHome() {
  const [catalog, setCatalog] = useState<Catalog>({ products: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("featured");
  const [showAll, setShowAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/marketplace", { headers: { accept: "application/json" }, cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "دریافت کاتالوگ ناموفق بود.");
        if (!Array.isArray(body.products)) throw new Error("ساختار کاتالوگ معتبر نیست.");
        if (!controller.signal.aborted) setCatalog({ products: body.products, categories: Array.isArray(body.categories) ? body.categories : [], total: Number(body.total || body.products.length), catalogMode: typeof body.catalogMode === "string" ? body.catalogMode : "owned" });
      })
      .catch(reason => {
        if (controller.signal.aborted || (reason instanceof Error && reason.name === "AbortError")) return;
        setError(reason instanceof Error ? reason.message : "اتصال به کاتالوگ برقرار نشد.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  // Show catalog records and source imagery, but never imply demo/reference records are live stock.
  const catalogProducts = useMemo(() => catalog.products, [catalog]);
  const isReferenceCatalog = catalog.catalogMode === "demo" || (catalogProducts.length > 0 && catalogProducts.every(product => product.is_demo_product || product.is_reference));
  const categories = useMemo(() => {
    const fromProducts = catalogProducts.map(product => (product.category || "").trim()).filter(Boolean);
    const names = Array.from(new Set([...(catalog.categories || []), ...fromProducts])).filter(Boolean);
    return (names.length ? names : FALLBACK_CATEGORIES).slice(0, 12);
  }, [catalog, catalogProducts]);
  const products = useMemo(() => {
    let list = catalogProducts.filter(product => {
      const term = normalize(search);
      const matchesSearch = !term || normalize([product.title, product.brand || "", product.category || "", product.seller_name || ""].join(" ")).includes(term);
      const itemCategory = normalize(product.category || "");
      const selected = normalize(category);
      const matchesCategory = !selected || (!!itemCategory && (itemCategory.includes(selected) || selected.includes(itemCategory) || CATEGORY_GUIDES.some(guide => normalize(guide.name) === selected && guide.key.test(product.category || ""))));
      return matchesSearch && matchesCategory;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-desc") list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "name") list = [...list].sort((a, b) => a.title.localeCompare(b.title, "fa"));
    return list;
  }, [catalogProducts, search, category, sort]);
  const heroProducts = catalogProducts.filter(product => safeImage(product.image_url)).slice(0, 3);
  const featured = products.slice(0, showAll ? products.length : 15);
  const catalogCount = catalogProducts.length;
  const totalStores = new Set(catalogProducts.map(product => product.store_id).filter(Boolean)).size;

  const chooseCategory = (name: string) => {
    setMenuOpen(false);
    setCategory(current => current === name ? "" : name);
    setShowAll(false);
    document.getElementById("sh-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="sookar-home" dir="rtl">
      <div className="sh-topline">
        <div className="sh-container sh-topline-inner">
          <span><i /> بازارگاه سوکار، کالاها و فروشگاه‌ها در یک مسیر</span>
          <div><Link href="/store/faq">راهنمای خرید</Link><Link href="/marketplace/directory">فروشندگان بازارگاه</Link><Link href="/store/terms">قوانین و شرایط</Link></div>
        </div>
      </div>

      <header className="sh-header">
        <div className="sh-container sh-header-main">
          <Link href="/" className="sh-brand" aria-label="صفحه اصلی سوکار">
            <span className="sh-brand-mark">س</span><span className="sh-brand-copy"><b>سوکار</b><small>بازارگاه هوشمند خرید</small></span>
          </Link>
          <form className="sh-search" onSubmit={event => { event.preventDefault(); document.getElementById("sh-products")?.scrollIntoView({ behavior: "smooth" }); }}>
            <Icon name="search" /><input value={search} onChange={event => { setSearch(event.target.value); setShowAll(false); }} placeholder="جستجوی نام کالا، برند یا دسته‌بندی..." aria-label="جستجوی محصولات بازارگاه" /><button type="submit">جستجو</button>
          </form>
          <div className="sh-header-actions">
            <Link href="/login?brand=naf" className="sh-account"><Icon name="user" /><span>ورود یا عضویت</span></Link>
            <Link href="/store/cart" className="sh-cart"><span className="sh-cart-icon"><Icon name="cart" /><CartCount /></span><span>سبد خرید</span></Link>
          </div>
        </div>
        <nav className="sh-nav sh-container" aria-label="ناوبری اصلی">
          <div className="sh-nav-menu-wrap">
            <button type="button" className={"sh-nav-all" + (menuOpen ? " is-open" : "")} aria-expanded={menuOpen} aria-controls="sh-mega-menu" onClick={() => setMenuOpen(open => !open)}><span className="sh-menu-glyph">{menuOpen ? "×" : "☰"}</span> دسته‌بندی کالاها <span className="sh-menu-chevron">⌄</span></button>
            {menuOpen && <div id="sh-mega-menu" className="sh-mega-menu">
              <div className="sh-mega-intro"><span className="sh-mega-eyebrow">کشف سریع بازارگاه</span><b>دستهٔ موردنظرت را انتخاب کن</b><small>دسته‌بندی‌ها از روی محصولات کاتالوگ سوکار فیلتر می‌شوند.</small><Link href="/marketplace" onClick={() => setMenuOpen(false)}>مشاهده همه دسته‌ها <Icon name="arrow" /></Link></div>
              <div className="sh-mega-categories">{CATEGORY_GUIDES.map(guide => {
                const actual = categories.find(name => guide.key.test(name)) || guide.name;
                const count = catalogProducts.filter(product => guide.key.test(product.category || "")).length;
                return <button type="button" key={guide.name} onClick={() => chooseCategory(actual)}><span className={"sh-mega-icon sh-tone-" + guide.tone}>{guide.icon}</span><span><b>{guide.name}</b><small>{count.toLocaleString("fa-IR")} کالا</small></span><Icon name="chevron" /></button>;
              })}</div>
              <div className="sh-mega-shortcuts"><span>دسترسی سریع</span><Link href="/marketplace/directory" onClick={() => setMenuOpen(false)}><Icon name="store" /> فروشگاه‌ها</Link><Link href="/pay" onClick={() => setMenuOpen(false)}>خرید اعتباری <Icon name="arrow" /></Link><Link href="/store/faq" onClick={() => setMenuOpen(false)}>راهنمای خرید <Icon name="arrow" /></Link></div>
            </div>}
          </div>
          <Link href="#sh-categories" onClick={() => setMenuOpen(false)}>دسته‌بندی‌ها</Link><Link href="#sh-products" onClick={() => setMenuOpen(false)}>محصولات بازارگاه</Link><Link href="/marketplace/directory" onClick={() => setMenuOpen(false)}>فروشگاه‌ها</Link><Link href="/pay" onClick={() => setMenuOpen(false)}>خرید اعتباری</Link><Link href="/store/faq" onClick={() => setMenuOpen(false)}>راهنمای خرید</Link>
          <span className="sh-nav-spacer" /><span className="sh-nav-note">انتخاب آگاهانه، خرید مطمئن‌تر</span>
        </nav>
      </header>

      <div className="sh-container sh-page">
        <section className="sh-hero">
          <div className="sh-hero-copy">
            <span className="sh-kicker"><i /> بازارگاه یکپارچه سوکار</span>
            <h1>برای انتخاب بهتر،<br /><em>از اینجا شروع کن.</em></h1>
            <p>کالاها را مقایسه کن، اطلاعات ثبت‌شده را ببین و به فروشگاه‌های بازارگاه دسترسی داشته باش؛ همه در یک تجربهٔ منظم و ساده.</p>
            <div className="sh-hero-actions"><Link href="#sh-products" className="sh-primary-btn">مشاهده محصولات <Icon name="arrow" /></Link><Link href="/marketplace/directory" className="sh-text-btn">کشف فروشگاه‌ها <Icon name="chevron" /></Link></div>
            <div className="sh-hero-metrics">
              <div><b>{catalogCount ? catalogCount.toLocaleString("fa-IR") : "—"}</b><span>{isReferenceCatalog ? "کالای مرجع در کاتالوگ" : "کالای منتشرشده"}</span></div>
              <i />
              <div><b>{totalStores ? totalStores.toLocaleString("fa-IR") : "—"}</b><span>{isReferenceCatalog ? "منبع / فروشگاه مرجع" : "فروشگاه دارای کالا"}</span></div>
              <i />
              <div><b>۲۴/۷</b><span>دسترسی آنلاین</span></div>
            </div>
          </div>
          <div className="sh-hero-showcase">
            <div className="sh-showcase-orbit sh-showcase-orbit-a" /><div className="sh-showcase-orbit sh-showcase-orbit-b" />
            {heroProducts.length ? <div className="sh-showcase-products">
              {heroProducts.map((product, index) => <Link href={productHref(product)} className={"sh-showcase-product sh-showcase-product-" + index} key={product.id}>
                <span className="sh-showcase-product-img"><img src={safeImage(product.image_url) || ""} alt={product.title} /></span>
                <span className="sh-showcase-product-copy"><small>{product.brand || product.category || "محصول بازارگاه"}</small><b>{product.title}</b><strong>{money(product.price, product.currency)}</strong></span>
              </Link>)}
            </div> : <div className="sh-showcase-empty"><span className="sh-showcase-emblem">س</span><b>کالای موردنظرت را پیدا کن</b><small>محصولات منتشرشدهٔ فروشندگان در همین صفحه نمایش داده می‌شوند.</small><Link href="/marketplace/directory">مشاهده فروشگاه‌ها <Icon name="arrow" /></Link></div>}
            <div className="sh-showcase-stamp"><span>SOOKAR</span><b>کشف کن. مقایسه کن.</b><small>انتخاب، با اطلاعات روشن</small></div>
          </div>
        </section>

        <section className="sh-benefits" aria-label="مزایای بازارگاه">
          <div><span className="sh-benefit-icon"><Icon name="shield" /></span><span><b>اطلاعات شفاف</b><small>مشخصات و قیمت ثبت‌شده</small></span></div>
          <div><span className="sh-benefit-icon"><Icon name="truck" /></span><span><b>دسترسی به فروشندگان</b><small>فروشگاه‌ها در یک بازارگاه</small></span></div>
          <div><span className="sh-benefit-icon"><Icon name="support" /></span><span><b>راهنمای خرید</b><small>مسیرهای پشتیبانی و قوانین</small></span></div>
          <div><span className="sh-benefit-icon"><Icon name="store" /></span><span><b>بازارگاه مستقل</b><small>تجربه اختصاصی سوکار</small></span></div>
        </section>

        <section id="sh-categories" className="sh-section sh-categories">
          <div className="sh-section-heading"><div><span className="sh-overline">دسته‌بندی‌ها</span><h2>از کجا شروع کنیم؟</h2><p>مستقیم به گروه کالایی موردنظرت برو.</p></div><Link href="/marketplace" className="sh-section-link">همه دسته‌بندی‌ها <Icon name="arrow" /></Link></div>
          <div className="sh-category-grid">
            {CATEGORY_GUIDES.map(guide => {
              const actual = categories.find(name => guide.key.test(name)) || guide.name;
              const count = catalogProducts.filter(product => guide.key.test(product.category || "")).length;
              const active = category === actual || category === guide.name;
              return <button type="button" key={guide.name} className={"sh-category sh-tone-" + guide.tone + (active ? " is-active" : "")} aria-pressed={active} onClick={() => chooseCategory(active ? "" : actual)}>
                <span className="sh-category-icon">{guide.icon}</span><span className="sh-category-copy"><b>{guide.name}</b><small>{count.toLocaleString("fa-IR")} کالای ثبت‌شده</small></span><span className="sh-category-arrow"><Icon name="chevron" /></span>
              </button>;
            })}
          </div>
        </section>

        <section id="sh-products" className="sh-section sh-products">
          <div className="sh-section-heading sh-product-heading"><div><span className="sh-overline">کاتالوگ زندهٔ بازارگاه</span><h2>{category || "محصولات بازارگاه"}</h2><p>{isReferenceCatalog ? "محصولات مرجع با نام و تصویر منبع اصلی نمایش داده می‌شوند؛ تا انتشار موجودی واقعی فروشنده، این موارد برای خرید مستقیم فعال نیستند." : "محصولات منتشرشده در کاتالوگ سوکار با اطلاعات و قیمت ثبت‌شدهٔ فروشندگان."}</p></div><div className="sh-product-controls"><span className="sh-result-count">{products.length.toLocaleString("fa-IR")} کالا</span><label>مرتب‌سازی<select value={sort} onChange={event => setSort(event.target.value)}><option value="featured">پیشنهادی</option><option value="price-asc">قیمت: کم به زیاد</option><option value="price-desc">قیمت: زیاد به کم</option><option value="name">نام کالا</option></select></label></div></div>
          <div className="sh-filter-row"><button type="button" className={!category ? "sh-filter-chip is-active" : "sh-filter-chip"} onClick={() => setCategory("")}>همه کالاها</button>{categories.slice(0, 7).map(name => <button type="button" key={name} className={category === name ? "sh-filter-chip is-active" : "sh-filter-chip"} onClick={() => chooseCategory(name)}>{name}</button>)}{(search || category) && <button type="button" className="sh-reset-filter" onClick={() => { setSearch(""); setCategory(""); setShowAll(false); }}>پاک‌کردن فیلترها ×</button>}</div>
          {loading ? <div className="sh-state"><span className="sh-spinner" /><b>در حال دریافت محصولات بازارگاه</b><small>در حال همگام‌سازی کاتالوگ منتشرشده...</small></div>
          : error ? <div className="sh-state sh-state-error"><b>دریافت کاتالوگ ممکن نشد</b><p>{error}</p><button type="button" onClick={() => window.location.reload()}>تلاش دوباره</button></div>
          : featured.length ? <div className="sh-product-grid">{featured.map(product => {
            const image = safeImage(product.image_url);
            const href = productHref(product);
            return <article className="sh-product-card" key={product.id}>
              <Link href={href} className="sh-product-visual" aria-label={"مشاهده " + product.title}>
                <span className={"sh-product-label" + ((product.is_demo_product || product.is_reference) ? " sh-product-label-reference" : "")}>{product.is_demo_product ? "محصول مرجع" : product.is_reference ? "کالای مرجع" : (product.category || "بازارگاه سوکار")}</span>
                {image ? <img src={image} alt={product.title} loading="lazy" decoding="async" /> : <span className="sh-product-no-image">س<small>تصویر کالا ثبت نشده</small></span>}
              </Link>
              <div className="sh-product-info"><span className="sh-product-seller">{product.brand || product.seller_name || "فروشنده بازارگاه"}</span><Link href={href} className="sh-product-title">{product.title}</Link>
                <div className="sh-product-price"><b>{money(product.price, product.currency)}</b><small>{product.is_demo_product ? "قیمت مرجع؛ خرید واقعی فعال نیست" : product.is_reference ? "قیمت مرجع از منبع اصلی" : "قیمت ثبت‌شده در بازارگاه"}</small></div>
                <div className="sh-product-actions"><Link href={href} className="sh-product-view sh-product-view-primary">مشاهده جزئیات <Icon name="arrow" /></Link></div>
              </div>
            </article>;
          })}</div>
          : <div className="sh-state sh-state-empty"><span className="sh-empty-icon"><Icon name="store" /></span><b>{search || category ? "کالایی با این مشخصات پیدا نشد." : "هنوز کالایی در کاتالوگ بازارگاه ثبت نشده است."}</b><p>{search || category ? "عبارت جستجو یا دسته‌بندی را تغییر بده." : "به‌محض ثبت کالا، اطلاعات و تصویر آن در این بخش نمایش داده می‌شود. سوکار بین کالای مرجع و موجودی قابل خرید فروشنده تفاوت روشن می‌گذارد."}</p>{(search || category) && <button type="button" onClick={() => { setSearch(""); setCategory(""); }}>نمایش همه کالاها</button>}<Link href="/marketplace/directory">مشاهده فروشگاه‌ها <Icon name="arrow" /></Link></div>}
          {!loading && products.length > 15 && <div className="sh-more-row"><span>نمایش {featured.length.toLocaleString("fa-IR")} از {products.length.toLocaleString("fa-IR")} کالا</span><button type="button" onClick={() => setShowAll(value => !value)}>{showAll ? "نمایش کمتر" : "مشاهده همه کالاها"} <Icon name="arrow" /></button></div>}
        </section>

        <section className="sh-seller-banner"><div className="sh-seller-symbol">س<span>+</span></div><div className="sh-seller-copy"><span className="sh-overline">ویژهٔ فروشندگان</span><h2>فروشگاهت را به بازارگاه سوکار وصل کن.</h2><p>محصولاتت را منتشر کن و در یک مسیر یکپارچه در دسترس خریداران قرار بده.</p><Link href="/login?brand=naf" className="sh-seller-button">ورود فروشندگان <Icon name="arrow" /></Link></div><div className="sh-seller-pattern" /></section>
      </div>

      <footer className="sh-footer"><div className="sh-container sh-footer-main">
        <div className="sh-footer-about"><Link href="/" className="sh-brand"><span className="sh-brand-mark">س</span><span className="sh-brand-copy"><b>سوکار</b><small>بازارگاه هوشمند خرید</small></span></Link><p>بازارگاهی مستقل برای کشف کالا، مرور اطلاعات ثبت‌شده و ارتباط با فروشگاه‌های بازارگاه.</p><span className="sh-footer-domain">sookar.ir</span></div>
        <div><b>بازارگاه</b><Link href="/marketplace">همه کالاها</Link><Link href="#sh-categories">دسته‌بندی‌ها</Link><Link href="/marketplace/directory">فروشگاه‌ها</Link></div>
        <div><b>خرید و سفارش</b><Link href="/store/cart">سبد خرید</Link><Link href="/store/orders">پیگیری سفارش</Link><Link href="/pay">خدمات اعتباری</Link></div>
        <div><b>پشتیبانی</b><Link href="/store/faq">راهنمای خرید</Link><Link href="/store/terms">قوانین و شرایط</Link><Link href="/login?brand=naf">حساب کاربری</Link></div>
      </div><div className="sh-footer-bottom"><div className="sh-container"><span>© سوکار · بازارگاه مستقل خرید و فروش</span><span>اطلاعات کالا و قیمت از کاتالوگ منتشرشدهٔ بازارگاه دریافت می‌شود.</span></div></div></footer>
    </main>
  );
}
