"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "./digibile-storefront.css";

const categories = [
  { name: "موبایل و دیجیتال", icon: "▣", tone: "blue", hint: "گوشی، تبلت و لوازم جانبی" },
  { name: "لپ‌تاپ و کامپیوتر", icon: "▤", tone: "violet", hint: "برای کار و سرگرمی" },
  { name: "خانه و آشپزخانه", icon: "⌂", tone: "orange", hint: "خانه‌ای راحت‌تر" },
  { name: "مد و پوشاک", icon: "◇", tone: "pink", hint: "استایل هر روز" },
  { name: "زیبایی و سلامت", icon: "✳", tone: "green", hint: "مراقبت روزانه" },
  { name: "ساعت و اکسسوری", icon: "◷", tone: "gold", hint: "جزئیات مهم‌اند" },
  { name: "ورزش و سفر", icon: "↗", tone: "cyan", hint: "آماده حرکت" },
  { name: "خودرو و ابزار", icon: "⚙", tone: "slate", hint: "تجهیزات کاربردی" }
];

const products = [
  { id: 1, name: "گوشی هوشمند؛ انتخابی برای هر روز", category: "موبایل و دیجیتال", label: "پیشنهاد روز", price: "مشاهده قیمت", photo: "https://images.unsplash.com/photo-1511704095947-9e7b8f6f4a2b?auto=format&fit=crop&w=700&q=85", tone: "phone", badge: "محبوب" },
  { id: 2, name: "هدفون بی‌سیم با طراحی مینیمال", category: "موبایل و دیجیتال", label: "صدای بهتر", price: "مشاهده قیمت", oldPrice: "", photo: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85", tone: "audio", badge: "پرطرفدار" },
  { id: 3, name: "ساعت هوشمند برای سبک زندگی فعال", category: "ساعت و اکسسوری", label: "انتخاب هوشمند", price: "مشاهده قیمت", oldPrice: "", photo: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=85", tone: "watch", badge: "جدید" },
  { id: 4, name: "کفش روزمره با طراحی ساده", category: "مد و پوشاک", label: "استایل روزانه", price: "مشاهده قیمت", oldPrice: "", photo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85", tone: "shoe", badge: "منتخب" },
  { id: 5, name: "دوربین مناسب ثبت لحظه‌ها", category: "موبایل و دیجیتال", label: "خلاقیت بی‌مرز", price: "مشاهده قیمت", oldPrice: "", photo: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=700&q=85", tone: "camera", badge: "ویژه" },
  { id: 6, name: "اسپیکر جمع‌وجور برای موسیقی", category: "موبایل و دیجیتال", label: "موسیقی همه‌جا", price: "مشاهده قیمت", oldPrice: "", photo: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=85", tone: "speaker", badge: "محبوب" },
  { id: 7, name: "چراغ رومیزی برای فضای کار", category: "خانه و آشپزخانه", label: "خانه دلنشین", price: "مشاهده قیمت", oldPrice: "", photo: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=85", tone: "home", badge: "منتخب" },
  { id: 8, name: "کوله‌پشتی برای مسیرهای روزانه", category: "ورزش و سفر", label: "همراه هر مسیر", price: "مشاهده قیمت", oldPrice: "", photo: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85", tone: "bag", badge: "جدید" }
];

const formatCount = (count: number) => new Intl.NumberFormat("fa-IR").format(count);
const normalizeText = (value: string) => value
  .replace(/[ي]/g, "ی")
  .replace(/[ك]/g, "ک")
  .replace(/\u200c/g, " ")
  .trim()
  .toLocaleLowerCase("fa-IR");

export default function DigibileHome() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("همه");
  const [slide, setSlide] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [favorites, setFavorites] = useState<number[]>([]);
  const filtered = useMemo(() => products.filter((product) => {
    const matchesQuery = (product.name + " " + product.category + " " + product.label).includes(query.trim());
    const matchesCategory = activeCategory === "همه" || product.category === activeCategory;
    return matchesQuery && matchesCategory;
  }), [query, activeCategory]);
  const heroSlides = [
    { eyebrow: "خریدی که به سلیقه تو نزدیکه", title: "انتخاب‌های خوب،\nهمین‌جا شروع می‌شن", body: "دنیایی از دسته‌بندی‌ها را بگرد، گزینه‌ها را کنار هم ببین و خریدت را با خیال راحت‌تر انتخاب کن.", button: "گشت‌وگذار در فروشگاه", className: "hero-cyan" },
    { eyebrow: "تکنولوژی برای هر روز", title: "چیزهای تازه\nبرای زندگی هوشمندتر", body: "از لوازم دیجیتال تا جزئیات کوچک روزمره، انتخاب‌های بعدی‌ات را کشف کن.", button: "دیدن کالاهای دیجیتال", className: "hero-violet" },
    { eyebrow: "خانه، استایل، زندگی", title: "برای هر سلیقه\nیک انتخاب تازه", body: "بین دسته‌بندی‌های محبوب بگرد و چیزی را پیدا کن که واقعاً به کارت می‌آید.", button: "دیدن دسته‌بندی‌ها", className: "hero-coral" }
  ];
  const currentSlide = heroSlides[slide];

  function scrollToProducts() {
    document.getElementById("featured-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="dg-store" dir="rtl">
      <div className="dg-promo-strip">
        <span>تجربه‌ای تازه برای خرید آنلاین</span><span className="dg-promo-dot">●</span><span>کشف کن، مقایسه کن، انتخاب کن</span>
        <a href="#categories">دسته‌بندی‌های فروشگاه <b>←</b></a>
      </div>

      <header className="dg-header">
        <div className="dg-header-main">
          <Link className="dg-brand" href="/" aria-label="صفحه اصلی دیجی‌بایل">
            <span className="dg-brand-mark">d<span>+</span></span>
            <span className="dg-brand-copy"><strong>دیجی‌بایل</strong><small>بازار انتخاب‌های هوشمند</small></span>
          </Link>
          <form className="dg-search" onSubmit={(event) => { event.preventDefault(); scrollToProducts(); }}>
            <span className="dg-search-icon" aria-hidden="true">⌕</span>
            <input aria-label="جست‌وجوی کالا" placeholder="جست‌وجو در میان کالاها، برندها و دسته‌ها..." value={query} onChange={(event) => { setQuery(event.target.value); setActiveCategory("همه"); }} />
            {query && <button type="button" className="dg-clear-search" onClick={() => setQuery("")} aria-label="پاک کردن جست‌وجو">×</button>}
            <button className="dg-search-submit" type="submit">جست‌وجو</button>
          </form>
          <div className="dg-header-actions">
            <Link href="/login" className="dg-login"><span>♙</span> ورود | ثبت‌نام</Link>
            <button className="dg-cart" type="button" onClick={() => alert(cartCount ? `تعداد ${formatCount(cartCount)} کالا در سبد نمایشی شماست. برای تکمیل خرید، اتصال سبد خرید عملیاتی لازم است.` : "سبد خرید شما فعلاً خالی است.")} aria-label="سبد خرید">
              <span className="dg-cart-icon">🛒</span><span className="dg-cart-label">سبد خرید</span>{cartCount > 0 && <b>{formatCount(cartCount)}</b>}
            </button>
          </div>
        </div>
        <nav className="dg-nav" aria-label="دسته‌بندی اصلی">
          <a href="#categories" className="dg-nav-categories"><span>☷</span> دسته‌بندی کالاها</a>
          <a href="#featured-products">پیشنهادهای منتخب</a><a href="#digital">کالای دیجیتال</a><a href="#home-lifestyle">خانه و سبک زندگی</a><a href="#why-us">چرا دیجی‌بایل؟</a>
          <span className="dg-nav-spacer" /><span className="dg-nav-note"><i /> تجربه خرید ساده‌تر، انتخاب آگاهانه‌تر</span>
        </nav>
      </header>

      <div className="dg-content">
        <section className={`dg-hero ${currentSlide.className}`} aria-label="پیشنهادهای فروشگاه">
          <div className="dg-hero-copy">
            <span className="dg-eyebrow"><i /> {currentSlide.eyebrow}</span>
            <h1>{currentSlide.title.split("\n").map((line, index) => <span key={index}>{line}</span>)}</h1>
            <p>{currentSlide.body}</p>
            <button className="dg-hero-cta" onClick={handleHeroAction}>{currentSlide.button}<span>←</span></button>
            <div className="dg-hero-pagination">
              {heroSlides.map((item, index) => <button key={item.className} onClick={() => setSlide(index)} className={index === slide ? "active" : ""} aria-label={`نمایش اسلاید ${index + 1}`} />)}
              <small>{formatCount(slide + 1)} / {formatCount(heroSlides.length)}</small>
            </div>
          </div>
          <div className="dg-hero-art" aria-hidden="true">
            <div className="dg-art-orbit orbit-one" /><div className="dg-art-orbit orbit-two" />
            <div className="dg-art-card art-back"><span>انتخاب هوشمند</span><b>01</b><i>✦</i></div>
            <div className="dg-art-product"><img src="https://images.unsplash.com/photo-1511704095947-9e7b8f6f4a2b?auto=format&fit=crop&w=900&q=90" alt="" /><span className="dg-art-tag">انتخاب امروز</span></div>
            <div className="dg-art-floating float-top"><span>✦</span><b>تازه ببین</b><small>انتخاب‌های بیشتر</small></div>
            <div className="dg-art-floating float-bottom"><span>✓</span><b>خرید آگاهانه</b><small>جزئیات را مقایسه کن</small></div>
          </div>
          <button className="dg-hero-arrow prev" onClick={() => setSlide((slide + heroSlides.length - 1) % heroSlides.length)} aria-label="اسلاید قبلی">‹</button>
          <button className="dg-hero-arrow next" onClick={() => setSlide((slide + 1) % heroSlides.length)} aria-label="اسلاید بعدی">›</button>
        </section>

        <div className="dg-benefits" id="why-us">
          <div><span className="benefit-icon">⌕</span><span><b>جست‌وجوی ساده</b><small>پیدا کردن راحت‌تر انتخاب‌ها</small></span></div>
          <div><span className="benefit-icon">▤</span><span><b>دسته‌بندی روشن</b><small>مرتب و قابل کشف</small></span></div>
          <div><span className="benefit-icon">♡</span><span><b>انتخاب با آگاهی</b><small>قبل از تصمیم، بررسی کن</small></span></div>
          <div><span className="benefit-icon">↗</span><span><b>تجربه یکپارچه</b><small>از کشف تا انتخاب</small></span></div>
        </div>

        <section className="dg-section dg-category-section" id="categories">
          <div className="dg-section-head"><div><span className="dg-section-kicker">از کجا شروع کنیم؟</span><h2>دسته‌بندی‌های محبوب</h2><p>مستقیم برو سراغ چیزی که دنبالش هستی.</p></div><a href="#featured-products">مشاهده محصولات <b>←</b></a></div>
          <div className="dg-categories">
            {categories.map((category) => <button key={category.name} onClick={() => { setActiveCategory(category.name); setQuery(""); scrollToProducts(); }} className={`dg-category dg-tone-${category.tone}`}><span className="dg-category-icon">{category.icon}</span><b>{category.name}</b><small>{category.hint}</small><i>←</i></button>)}
          </div>
        </section>

        <section className="dg-promo-band">
          <div><span>راهنمای انتخاب</span><h2>خرید بهتر، با مقایسه و انتخاب آگاهانه</h2><p>قبل از تصمیم نهایی، جزئیات کالا را بررسی کن و انتخابی متناسب با نیازت داشته باش.</p><button onClick={scrollToProducts}>شروع گشت‌وگذار <b>←</b></button></div>
          <div className="dg-promo-visual" aria-hidden="true"><span className="promo-circle circle-a" /><span className="promo-circle circle-b" /><img src="https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=700&q=85" alt="" /></div>
        </section>

        <section className="dg-section dg-products-section" id="featured-products">
          <div className="dg-section-head"><div><span className="dg-section-kicker">برای شروع ایده بگیر</span><h2>{activeCategory === "همه" ? "ویترین انتخاب‌های روز" : activeCategory}</h2><p>{query ? `نتایج جست‌وجو برای «${query}»` : "نمونه‌ای از چیدمان محصولات فروشگاه دیجی‌بایل"}</p></div><div className="dg-section-actions"><span className="dg-demo-note">نمایش طراحی، نه موجودی قطعی</span><Link href="/store/shop">رفتن به فهرست کالاها <b>←</b></Link></div></div>
          <div className="dg-filter-row"><button className={activeCategory === "همه" ? "active" : ""} onClick={() => setActiveCategory("همه")}>همه کالاها</button>{categories.slice(0, 5).map((category) => <button key={category.name} className={activeCategory === category.name ? "active" : ""} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}</div>
          {filtered.length ? <div className="dg-product-grid">{filtered.map((product) => <article className="dg-product-card" key={product.id}>
            <div className="dg-product-image"><span className="dg-product-badge">{product.badge}</span><button className={favorites.includes(product.id) ? "dg-favorite active" : "dg-favorite"} aria-label={favorites.includes(product.id) ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"} aria-pressed={favorites.includes(product.id)} onClick={() => setFavorites((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])}>{favorites.includes(product.id) ? "♥" : "♡"}</button><img src={product.photo} alt={product.name} loading="lazy" /><span className="dg-image-caption">{product.label}</span></div>
            <div className="dg-product-info"><small>{product.category}</small><h3>{product.name}</h3><div className="dg-product-rating"><span className="dg-product-spec-label">ویترین پیشنهادی</span><small>اطلاعات نمونه</small></div><div className="dg-product-price"><span>{product.price}</span><small>قیمت از سرویس کالا دریافت می‌شود</small></div><button className="dg-add-cart" onClick={() => setCartCount((count) => count + 1)}>افزودن به سبد نمایشی <span>＋</span></button></div>
          </article>)}</div> : <div className="dg-empty"><span>⌕</span><b>چیزی پیدا نشد</b><p>عبارت جست‌وجو یا دسته‌بندی را تغییر بده.</p><button onClick={() => { setQuery(""); setActiveCategory("همه"); }}>نمایش همه کالاها</button></div>}
        </section>

        <section className="dg-split-sections" id="digital">
          <article className="dg-split-card digital-card"><div><span>01 / DIGITAL</span><h2>دنیای دیجیتال،<br />یک قدم نزدیک‌تر</h2><p>از لوازم جانبی تا ابزارهای هوشمند.</p><button onClick={() => { setActiveCategory("موبایل و دیجیتال"); scrollToProducts(); }}>کشف کالای دیجیتال ←</button></div><img src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85" alt="لپ‌تاپ" loading="lazy" /></article>
          <article className="dg-split-card home-card" id="home-lifestyle"><div><span>02 / LIFESTYLE</span><h2>جزئیات کوچک،<br />تفاوت‌های بزرگ</h2><p>انتخاب‌هایی برای خانه و زندگی روزمره.</p><button onClick={() => { setActiveCategory("خانه و آشپزخانه"); scrollToProducts(); }}>کشف خانه و زندگی ←</button></div><img src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=700&q=85" alt="فضای خانه" loading="lazy" /></article>
        </section>

        <section className="dg-newsletter"><div><span className="dg-newsletter-icon">✦</span><div><h2>انتخاب‌های تازه را از دست نده</h2><p>این بخش برای خبرنامه و پیشنهادهای فروشگاه آماده است.</p></div></div><form onSubmit={(event) => { event.preventDefault(); alert("ثبت خبرنامه پس از اتصال سرویس اطلاع‌رسانی فعال می‌شود."); }}><input type="email" placeholder="ایمیل شما (در نسخه نمایشی)" aria-label="ایمیل برای خبرنامه" required /><button type="submit">به‌زودی <span>←</span></button></form></section>
      </div>

      <footer className="dg-footer"><div className="dg-footer-main"><Link className="dg-brand footer-brand" href="/"><span className="dg-brand-mark">d<span>+</span></span><span className="dg-brand-copy"><strong>دیجی‌بایل</strong><small>بازار انتخاب‌های هوشمند</small></span></Link><p>تجربه‌ای تازه برای کشف و انتخاب کالاها. اطلاعات خرید، قیمت و موجودی پس از اتصال به سرویس‌های عملیاتی نمایش داده خواهد شد.</p><div className="dg-footer-links"><a href="#categories">دسته‌بندی‌ها</a><a href="#featured-products">ویترین محصولات</a><Link href="/store/shop">فهرست کالاها</Link><Link href="/login">ورود کاربران</Link></div></div><div className="dg-footer-bottom"><span>© دیجی‌بایل</span><span>طراحی راست‌چین · سازگار با موبایل و دسکتاپ</span><a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>بازگشت به بالا ↑</a></div></footer>
    </main>
  );
}
