"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  sku?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  price: string | number;
  currency?: string;
  seller_name?: string;
  image_url?: string | null;
  brand?: string | null;
};

const categories = [
  ["موبایل و تبلت", /موبایل|گوشی|تبلت|phone|mobile|tablet|smartphone/i],
  ["لپ‌تاپ و کامپیوتر", /لپ.?تاپ|کامپیوتر|مانیتور|قطعات کامپیوتر|computer|laptop|monitor|desktop|gpu|processor/i],
  ["تلویزیون و صوتی تصویری", /تلویزیون|هدفون|هندزفری|اسپیکر|سینمای خانگی|دوربین|صوتی|تصویری|headphone|speaker|camera|television|tv|audio|video/i],
  ["ساعت و گجت هوشمند", /ساعت هوشمند|ساعت مچی|مچ.?بند|گجت|smart.?watch|wearable|watch/i],
  ["لوازم جانبی و شبکه", /شارژر|پاوربانک|کابل|مبدل|مودم|روتر|هارد|فلش|ssd|پرینتر|charger|power.?bank|cable|adapter|router|modem|storage|printer/i],
  ["لوازم خانگی برقی", /یخچال|فریزر|ماشین لباسشویی|ظرفشویی|جاروبرقی|مایکروویو|مایکروفر|اجاق|کولر|تهویه|قهوه.?ساز|لوازم خانگی|refrigerator|freezer|washing machine|dishwasher|vacuum|microwave/i],
  ["خانه، مبلمان و دکور", /مبلمان|مبل|کاناپه|صندلی|میز|تخت.?خواب|کمد|دکوراسیون|فرش|چراغ|روشنایی|furniture|sofa|chair|table|bed|wardrobe|decor/i],
  ["مد و پوشاک", /پوشاک|لباس|کفش|کیف|کوله|پارچه|fashion|apparel|clothing|shoes|bag/i],
  ["زیبایی و سلامت", /زیبایی|آرایش|بهداشت|سلامت|عطر|مراقبت پوست|مراقبت مو|beauty|health|cosmetic|perfume/i],
  ["ورزش، سفر و ابزار", /ورزش|سفر|کمپینگ|ابزار|دریل|باغبانی|خودرو|موتورسیکلت|sport|travel|camping|tool|drill|auto/i],
  ["کتاب، کودک و سرگرمی", /کتاب|لوازم.?التحریر|کودک|نوزاد|اسباب.?بازی|بازی فکری|book|stationery|baby|toy|game/i],
  ["سوپرمارکت و روزمره", /سوپرمارکت|خوراک|مواد غذایی|نوشیدنی|شوینده|grocery|supermarket|food|beverage/i]
] as const;

function price(value: string | number, currency = "IRR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return amount.toLocaleString("fa-IR") + (currency === "IRR" ? " ریال" : " " + currency);
}

function validImage(value?: string | null) {
  return value && (/^https?:\/\//i.test(value) || (value.startsWith("/") && !value.startsWith("//"))) ? value : "";
}

export default function TechnolifeTemplatePreview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/marketplace", { headers: { accept: "application/json" }, cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || "کاتالوگ محصولات در دسترس نیست.");
        if (!Array.isArray(body?.products)) throw new Error("پاسخ کاتالوگ معتبر نیست.");
        if (!controller.signal.aborted) setProducts(body.products);
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "اتصال به کاتالوگ ناموفق بود.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fa");
    return products.filter(p => {
      const matchesQuery = !q || [p.title, p.category || "", p.brand || "", p.seller_name || ""].join(" ").toLocaleLowerCase("fa").includes(q);
      const pattern = categories.find(([name]) => name === activeCategory)?.[1];
      return matchesQuery && (!pattern || pattern.test([p.title, p.category || "", p.description || "", p.brand || ""].join(" ")));
    });
  }, [products, query, activeCategory]);

  return (
    <main dir="rtl" className="tl-page">
      <style>{`
        .tl-page{--tl-red:#059669;--tl-ink:#232933;--tl-muted:#818894;--tl-line:#e7e9ed;background:#f5f6f8;color:var(--tl-ink);min-height:100vh;font-family:Vazirmatn,IRANSansX,Tahoma,sans-serif}
        .tl-page *{box-sizing:border-box}.tl-page a{text-decoration:none;color:inherit}.tl-wrap{width:min(1380px,calc(100% - 44px));margin-inline:auto}
        .tl-topline{background:#242a34;color:#f5f6f8;font-size:11px}.tl-topline .tl-wrap{display:flex;justify-content:space-between;align-items:center;gap:14px;min-height:34px}.tl-topline a{color:#e3e6ea}
        .tl-head{background:#fff;position:sticky;top:0;z-index:20;box-shadow:0 3px 12px #17202a0a}.tl-head-main{display:flex;align-items:center;gap:28px;min-height:82px}
        .tl-brand{display:flex;align-items:center;gap:10px;min-width:180px}.tl-mark{display:grid;place-items:center;width:43px;height:43px;border-radius:12px;background:var(--tl-red);color:white;font-size:24px;font-weight:950}.tl-brand strong{font-size:24px;letter-spacing:-1px}.tl-brand small{display:block;color:#8b929c;font-size:10px;margin-top:1px}
        .tl-search{display:flex;align-items:center;gap:12px;flex:1;max-width:720px;height:47px;border-radius:10px;background:#f1f2f4;padding:0 15px;color:#8c929b}.tl-search span{font-size:24px}.tl-search input{width:100%;border:0;outline:0;background:transparent;font:inherit;font-size:12px;color:#242a34}.tl-search button{border:0;background:none;font-size:21px;color:#777}
        .tl-head-actions{display:flex;align-items:center;gap:8px;margin-right:auto}.tl-head-actions a{border:1px solid #e2e4e8;border-radius:9px;padding:11px 13px;font-size:11px;font-weight:800;white-space:nowrap}.tl-head-actions .tl-signup{background:var(--tl-red);border-color:var(--tl-red);color:white}
        .tl-nav{border-top:1px solid #f0f1f3}.tl-nav .tl-wrap{display:flex;align-items:center;gap:25px;min-height:46px;overflow:auto;white-space:nowrap;scrollbar-width:none}.tl-nav a{font-size:11px;color:#555e69}.tl-nav a:first-child{font-weight:900;color:#282f39}.tl-nav a:hover{color:var(--tl-red)}
        .tl-breadcrumb{padding:18px 0 0;color:#8a919b;font-size:11px}
        .tl-hero{margin-top:15px;display:grid;grid-template-columns:1fr .9fr;min-height:330px;border-radius:20px;overflow:hidden;background:linear-gradient(110deg,#272c35,#3a404b);color:#fff}
        .tl-hero-copy{padding:clamp(28px,5vw,62px);display:flex;flex-direction:column;align-items:flex-start;justify-content:center}.tl-kicker{display:inline-flex;align-items:center;gap:8px;color:#a7f3d0;font-size:12px;font-weight:800}.tl-kicker:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--tl-red)}
        .tl-hero h1{font-size:clamp(29px,4vw,48px);line-height:1.55;margin:15px 0 10px;letter-spacing:-1.2px;font-weight:950}.tl-hero h1 span{color:#34d399}.tl-hero p{max-width:550px;color:#d0d4db;font-size:13px;line-height:2.1;margin:0}
        .tl-hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}.tl-cta{display:inline-flex;align-items:center;justify-content:center;min-height:43px;padding:0 17px;border-radius:9px;background:var(--tl-red);color:white!important;font-size:11px;font-weight:900}.tl-cta.secondary{border:1px solid #ffffff45;background:transparent}
        .tl-hero-art{display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:radial-gradient(ellipse at 50% 50%,#ffffff17,transparent 60%)}.tl-ring{position:absolute;border:1px solid #ffffff22;border-radius:50%;width:330px;aspect-ratio:1}.tl-ring.r2{width:245px}.tl-device{position:relative;width:145px;height:220px;border:5px solid #c9ced6;border-radius:24px;background:linear-gradient(145deg,#fafafa,#d9dde3);box-shadow:0 28px 50px #080b1290;transform:rotate(-9deg);padding:12px 9px}.tl-device:before{content:"";display:block;width:45px;height:5px;border-radius:9px;background:#7d838d;margin:0 auto 14px}.tl-device-screen{height:165px;border-radius:12px;background:linear-gradient(150deg,#34d399,#047857 55%,#064e3b);display:flex;align-items:center;justify-content:center;color:white;font-size:38px;font-weight:950}
        .tl-quick{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin:18px 0 28px}.tl-quick button{border:1px solid var(--tl-line);border-radius:13px;background:#fff;padding:17px 10px;display:flex;align-items:center;gap:10px;text-align:right;cursor:pointer;min-width:0}.tl-quick button:hover,.tl-quick button.active{border-color:#6ee7b7;box-shadow:0 5px 20px #0596690c}.tl-quick i{font-style:normal;display:grid;place-items:center;flex:0 0 37px;width:37px;height:37px;border-radius:11px;background:#ecfdf5;color:var(--tl-red);font-size:19px}.tl-quick b{display:block;font-size:11px}.tl-quick small{display:block;color:#9aa0a8;font-size:9px;margin-top:5px}
        .tl-shelf{background:#fff;border:1px solid #eceef1;border-radius:17px;padding:20px;margin:0 0 22px}.tl-shelf-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:17px}.tl-shelf-head small{color:var(--tl-red);font-size:10px;font-weight:900}.tl-shelf-head h2{font-size:19px;margin:5px 0 0;font-weight:950}.tl-shelf-head button{border:0;background:transparent;color:var(--tl-red);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}
        .tl-products{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.tl-product{min-width:0;border:1px solid #edf0f2;border-radius:12px;padding:12px;display:flex;flex-direction:column;transition:box-shadow .18s,border-color .18s;background:#fff}.tl-product:hover{border-color:#6ee7b7;box-shadow:0 10px 28px #252c360d}.tl-product-img{height:165px;display:grid;place-items:center;position:relative;background:#fff;border-radius:9px;overflow:hidden}.tl-product-img img{width:100%;height:100%;object-fit:contain}.tl-product-placeholder{display:grid;place-items:center;width:82px;height:82px;border-radius:24px;background:#ecfdf5;color:var(--tl-red);font-size:33px}.tl-product-tag{position:absolute;right:0;top:0;background:#ecfdf5;color:var(--tl-red);border-radius:6px;padding:5px 7px;font-size:9px}.tl-product h3{font-size:12px;line-height:1.9;min-height:46px;margin:12px 0 6px;font-weight:750}.tl-product-brand{color:#8b929c;font-size:10px;min-height:20px}.tl-product-price{margin-top:auto;padding-top:15px;font-size:12px;font-weight:950;text-align:left;direction:rtl}.tl-product-price small{display:block;color:#9aa0a8;font-size:9px;font-weight:400;margin-top:5px}.tl-empty{padding:40px 18px;text-align:center;color:#707987;line-height:2}.tl-empty b{display:block;color:#303844;margin-bottom:7px}.tl-error{color:#b42335}
        .tl-bottom{padding:28px 0 36px;color:#737b86;font-size:10px;text-align:center}.tl-bottom strong{color:#3a424e}
        @media(max-width:1050px){.tl-head-main{gap:14px}.tl-brand{min-width:150px}.tl-brand strong{font-size:20px}.tl-head-actions a{padding:10px}.tl-quick{grid-template-columns:repeat(3,minmax(0,1fr))}.tl-products{grid-template-columns:repeat(4,minmax(0,1fr))}.tl-product-img{height:145px}}
        @media(max-width:700px){.tl-wrap{width:calc(100% - 24px)}.tl-topline .tl-wrap{min-height:30px;font-size:9px}.tl-topline .tl-wrap span:last-child{display:none}.tl-head{position:relative}.tl-head-main{min-height:0;padding:12px 0;display:grid;grid-template-columns:1fr auto;gap:12px}.tl-brand{min-width:0}.tl-mark{width:36px;height:36px;font-size:20px}.tl-brand strong{font-size:19px}.tl-brand small{font-size:8px}.tl-search{grid-column:1/-1;grid-row:2;height:42px}.tl-head-actions{grid-column:2;grid-row:1}.tl-head-actions a{font-size:10px;padding:9px}.tl-head-actions a:first-child{display:none}.tl-nav .tl-wrap{gap:19px;min-height:41px}.tl-nav a{font-size:10px}.tl-breadcrumb{font-size:10px;padding-top:13px}.tl-hero{grid-template-columns:1fr;margin-top:10px;min-height:0}.tl-hero-copy{padding:27px 22px}.tl-hero h1{font-size:31px;margin:11px 0 7px}.tl-hero p{font-size:11px}.tl-hero-art{min-height:165px}.tl-ring{width:190px}.tl-ring.r2{width:135px}.tl-device{width:84px;height:126px;border-width:4px;border-radius:16px;padding:7px 5px;transform:rotate(-7deg)}.tl-device:before{height:3px;width:25px;margin-bottom:7px}.tl-device-screen{height:92px;border-radius:8px;font-size:25px}.tl-quick{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 18px}.tl-quick button{padding:10px 8px;gap:8px}.tl-quick i{width:32px;height:32px;flex-basis:32px;font-size:16px}.tl-quick b{font-size:10px}.tl-quick small{font-size:8px}.tl-shelf{padding:12px;border-radius:13px;margin-bottom:13px}.tl-shelf-head h2{font-size:16px}.tl-products{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.tl-product{padding:8px;border-radius:10px}.tl-product-img{height:130px}.tl-product h3{font-size:11px;min-height:43px}.tl-product-price{font-size:11px}.tl-bottom{padding:20px 0}.tl-bottom span{display:block;margin-top:5px}}
      `}</style>

      <div className="tl-topline"><div className="tl-wrap"><span>تکنولایف | مرجع تخصصی همه کالاها</span><span>انتخاب آگاهانه با اطلاعات ثبت‌شده محصول</span></div></div>
      <header className="tl-head">
        <div className="tl-wrap tl-head-main">
          <Link href="/store/technolife" className="tl-brand" aria-label="صفحه اصلی تکنولایف"><span className="tl-mark">ت</span><span><strong>تکنولایف</strong><small>دنیای فناوری، یک‌جا</small></span></Link>
          <form className="tl-search" role="search" onSubmit={e => { e.preventDefault(); document.getElementById("tl-catalog")?.scrollIntoView({ behavior: "smooth" }); }}><span>⌕</span><input aria-label="جستجوی کالای دیجیتال" placeholder="جستجو در موبایل، لپ‌تاپ، یخچال، مبلمان و ..." value={query} onChange={e => setQuery(e.target.value)} />{query && <button type="button" onClick={() => setQuery("")} aria-label="پاک کردن جستجو">×</button>}</form>
          <div className="tl-head-actions"><Link href="/login?brand=technolife">ورود</Link><Link className="tl-signup" href="/register?brand=technolife">ثبت‌نام</Link></div>
        </div>
        <nav className="tl-nav" aria-label="دسته‌بندی اصلی"><div className="tl-wrap"><a href="#tl-categories">☰ دسته‌بندی کالاها</a><a href="#tl-mobile">موبایل و تبلت</a><a href="#tl-laptop">لپ‌تاپ و کامپیوتر</a><a href="#tl-audio">صوتی و تصویری</a><a href="#tl-gaming">گیمینگ</a><a href="#tl-network">شبکه و ذخیره‌سازی</a><a href="#tl-accessories">لوازم جانبی</a></div></nav>
      </header>

      <div className="tl-wrap">
        <div className="tl-breadcrumb">خانه / فروشگاه کالای دیجیتال / تکنولایف</div>
        <section className="tl-hero">
          <div className="tl-hero-copy"><span className="tl-kicker">خرید هوشمندانه برای همه</span><h1>همه نیازها،<br/><span>یک مقصد خرید.</span></h1><p>از موبایل و کامپیوتر تا تلویزیون، یخچال، ساعت، لوازم جانبی و مبلمان؛ محصولات واقعی ثبت‌شده در کاتالوگ فروشگاه را یک‌جا ببین. قیمت و موجودی تنها وقتی نمایش داده می‌شود که در فروشگاه خودمان ثبت و تأیید شده باشد.</p><div className="tl-hero-actions"><a className="tl-cta" href="#tl-catalog">مشاهده محصولات ←</a><a className="tl-cta secondary" href="#tl-categories">دسته‌بندی‌ها</a></div></div>
          <div className="tl-hero-art" aria-hidden="true"><span className="tl-ring"/><span className="tl-ring r2"/><div className="tl-device"><div className="tl-device-screen">ت</div></div></div>
        </section>

        <section id="tl-categories" className="tl-quick" aria-label="دسته‌بندی همه کالاها">{categories.map(([name], i) => <button key={name} className={activeCategory === name ? "active" : ""} onClick={() => { setActiveCategory(activeCategory === name ? "" : name); document.getElementById("tl-catalog")?.scrollIntoView({ behavior: "smooth" }); }}><i>{["▯","▰","♫","◉","⌘","▣","⌂","◇","✳","⚒","▤","◈"][i]}</i><span><b>{name}</b><small>مشاهده کالاهای ثبت‌شده</small></span></button>)}</section>

        {categories.map(([name, pattern], index) => {
          const shelf = products.filter(p => pattern.test([p.title, p.category || "", p.description || "", p.brand || ""].join(" "))).slice(0, 5);
          if (!shelf.length || query || activeCategory) return null;
          return <section className="tl-shelf" id={["tl-mobile","tl-laptop","tl-audio","tl-watches","tl-accessories","tl-appliances","tl-home","tl-fashion","tl-health","tl-sports","tl-family","tl-daily"][index]} key={name}><div className="tl-shelf-head"><div><small>منتخب کاتالوگ تکنولایف</small><h2>{name}</h2></div><button onClick={() => { setActiveCategory(name); document.getElementById("tl-catalog")?.scrollIntoView({ behavior: "smooth" }); }}>مشاهده همه ←</button></div><div className="tl-products">{shelf.map(p => <ProductCard key={p.id} product={p}/>)}</div></section>;
        })}

        <section id="tl-catalog" className="tl-shelf"><div className="tl-shelf-head"><div><small>کاتالوگ زنده</small><h2>{query ? "نتایج جستجو" : activeCategory || "همه محصولات فروشگاه"}</h2></div><span style={{fontSize:11,color:"#858c96"}}>{loading ? "در حال دریافت…" : filtered.length.toLocaleString("fa-IR") + " کالا"}</span></div>
          {loading ? <div className="tl-empty">در حال دریافت اطلاعات محصولات از کاتالوگ واقعی…</div> : error ? <div className="tl-empty tl-error"><b>کاتالوگ در دسترس نیست</b>{error}</div> : filtered.length ? <div className="tl-products">{filtered.slice(0, showAll ? filtered.length : 20).map(p => <ProductCard key={p.id} product={p}/>)}</div> : <div className="tl-empty"><b>{products.length ? "محصولی با این جستجو یا دسته‌بندی پیدا نشد." : "هنوز محصول فعالی در کاتالوگ داخلی فروشگاه ثبت نشده است."}</b><span>هیچ محصول یا قیمتی به‌صورت ساختگی نمایش داده نمی‌شود.</span></div>}
          {filtered.length > 20 && <div style={{textAlign:"center",paddingTop:22}}><button className="tl-cta" onClick={() => setShowAll(!showAll)}>{showAll ? "نمایش کمتر" : "نمایش همه محصولات"}</button></div>}
        </section>
        <footer className="tl-bottom"><strong>تکنولایف</strong><span>محصولات، تصاویر میزبانی‌شده و قیمت‌های منتشرشده از کاتالوگ داخلی همین فروشگاه ارائه می‌شوند؛ اطلاعات مرجع به‌تنهایی قابل خرید نیست.</span></footer>
      </div>
    </main>
  );
}

function ProductCard({ product }: { product: Product }) {
  const image = validImage(product.image_url);
  return <Link className="tl-product" href={"/store/product/" + encodeURIComponent(product.sku || product.id) + "?site=technolife"}><div className="tl-product-img">{image ? <img src={image} alt={product.title} loading="lazy" /> : <span className="tl-product-placeholder">▯</span>}<span className="tl-product-tag">{product.category || "کالای دیجیتال"}</span></div><h3>{product.title}</h3><span className="tl-product-brand">{product.brand || product.seller_name || "اطلاعات برند ثبت نشده"}</span><div className="tl-product-price">{price(product.price, product.currency)}<small>قیمت ثبت‌شده</small></div></Link>;
}
