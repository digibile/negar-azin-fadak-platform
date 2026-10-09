"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import "./products-workspace.css";

type Seller = { id: string; display_name: string; status: string };
type Category = { id: string; code: string; name: string; status: string; sort_order: number };
type Product = { id: string; sku: string; title: string; price: string | number; currency: string; status: string; seller_id: string; image_url?: string | null; category?: string | null };
type SourceProduct = { id: string; sku: string; title: string; price: string; currency: string; category: string; image_url: string; brand: string | null; source_name: string };
type SourceCatalog = { products: SourceProduct[]; categories: string[]; sourceStatus: "live" | "unavailable"; fetchedAt: string | null };
type SourceLink = { id:string; product_id:string; source_name:string; source_product_id:string; source_sku:string|null; source_url:string|null; source_currency:string; source_price:string|number|null; source_available:boolean|null; price_policy:"manual"|"mirror"|"markup"; markup_percent:string|number; last_checked_at:string|null; last_success_at:string|null; last_error:string|null; sku:string; title:string; sale_price:string|number; product_status:string };
type SourceSyncResult = { items:SourceLink[]; runs:Array<{id:string;status:string;updated_count:number;started_at:string}>; total:number };
type ImportResult = { totalImported: number; totalSkipped: number; imported: string[]; skipped: string[]; message: string };
const statusLabel: Record<string,string> = { draft:"پیش‌نویس", active:"منتشرشده", archived:"بایگانی‌شده" };
const money = (value: string | number, currency = "IRR") => `${Number(value).toLocaleString("fa-IR")} ${currency === "IRR" ? "ریال" : currency}`;

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tab, setTab] = useState<"manual" | "import">("manual");
  const [sourceProducts, setSourceProducts] = useState<SourceProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourceCategory, setSourceCategory] = useState("");
  const [sourceFetchedAt, setSourceFetchedAt] = useState<string | null>(null);
  const [sourceProductId, setSourceProductId] = useState("");
  const [sourceStatus, setSourceStatus] = useState<"live" | "unavailable" | "unknown">("unknown");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSource, setLoadingSource] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sourceLinks, setSourceLinks] = useState<SourceLink[]>([]);
  const [syncingSources, setSyncingSources] = useState(false);
  const [policySavingId, setPolicySavingId] = useState("");

  async function load() {
    setError("");
    try {
      const [productResult, sellerResult, categoryResult, sourceResult] = await Promise.all([
        api<{items:Product[]}>("/api/marketplace/products"),
        api<{items:Seller[]}>("/api/marketplace/sellers"),
        api<{items:Category[]}>("/api/marketplace/categories"),
        api<SourceSyncResult>("/api/marketplace/products/source-sync")
      ]);
      setItems(productResult.items || []);
      setSellers(sellerResult.items || []);
      setCategories((categoryResult.items || []).filter(item => item.status === "active"));
      setSourceLinks(sourceResult.items || []);
      setSellerId(current => current || (sellerResult.items?.find(x => x.status === "active") || sellerResult.items?.[0])?.id || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "دریافت کاتالوگ یا فروشندگان ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }
  async function loadSourceCatalog() {
    setError("");
    setLoadingSource(true);
    try {
      const result = await api<SourceCatalog>("/api/marketplace/digikala-catalog");
      setSourceProducts(current => {
        const byId = new Map(current.map(item => [item.id, item]));
        for (const item of result.products || []) if (!byId.has(item.id)) byId.set(item.id, item);
        return [...byId.values()];
      });
      setSourceStatus(result.sourceStatus);
      setSourceFetchedAt(result.fetchedAt);
      if (result.sourceStatus !== "live") setError("منبع مرجع پاسخ کامل نداد؛ فهرست دریافت‌شده ممکن است ناقص باشد.");
    } catch (reason) {
      setSourceStatus("unavailable");
      setError(reason instanceof Error ? reason.message : "دریافت فهرست مرجع ناموفق بود.");
    } finally {
      setLoadingSource(false);
    }
  }

  useEffect(() => {
    const wantsImport = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "import";
    if (wantsImport) setTab("import");
    void load();
    if (wantsImport) void loadSourceCatalog();
  }, []);

  async function lookupDigikalaProduct() {
    const raw = sourceProductId.trim();
    let id = raw.replace(/^dkp-/i, "");
    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        const match = url.hostname.toLowerCase().endsWith("digikala.com") ? url.pathname.match(/\/product\/(?:dkp-)?(\d{1,16})/i) : null;
        id = match?.[1] || "";
      } catch {
        id = "";
      }
    }
    if (!/^\d{1,16}$/.test(id)) {
      setError("شناسه یا لینک معتبر صفحه محصول دیجی‌کالا را وارد کنید.");
      return;
    }
    setError(""); setNotice(""); setLoadingSource(true);
    try {
      const result = await api<{product:SourceProduct}>("/api/marketplace/digikala-product/" + encodeURIComponent(id));
      const product = result.product;
      setSourceProducts(current => [product, ...current.filter(item => item.id !== product.id)]);
      setSelectedIds(current => current.includes(product.id) ? current : [...current, product.id].slice(0, 50));
      setSourceStatus("live");
      setNotice("محصول دریافت شد. پس از ورود به کاتالوگ داخلی، قیمت و اطلاعات را بررسی کنید و در صورت تأیید منتشر کنید.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "دریافت محصول از منبع ناموفق بود.");
    } finally {
      setLoadingSource(false);
    }
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    setError(""); setNotice("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("فقط تصویر JPG، PNG یا WebP پذیرفته می‌شود.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم تصویر باید حداکثر ۵ مگابایت باشد.");
      return;
    }
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("خواندن تصویر ناموفق بود."));
        reader.onerror = () => reject(new Error("خواندن تصویر ناموفق بود."));
        reader.readAsDataURL(file);
      });
      const result = await api<{imageUrl:string}>("/api/marketplace/media", {
        method: "POST",
        body: JSON.stringify({ dataUrl })
      });
      setImageUrl(result.imageUrl);
      setNotice("تصویر با موفقیت در رسانهٔ داخلی سوکار ذخیره شد.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ذخیره تصویر ناموفق بود.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function create() {
    setError("");
    setNotice("");
    if (imageUrl && !imageUrl.startsWith("/api/public/media/")) {
      setError("برای جلوگیری از لینک تصویر خارجی، فقط مسیر رسانهٔ ذخیره‌شده در سوکار پذیرفته می‌شود. برای ورود گروهی از بخش «ورود از منبع» استفاده کنید.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/marketplace/products", {
        method: "POST",
        body: JSON.stringify({
          sellerId, sku: sku.trim(), title: title.trim(), description: description.trim(),
          price: Number(price), category: category.trim() || undefined,
          attributes: imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}
        })
      });
      setSku(""); setTitle(""); setDescription(""); setPrice(""); setCategory(""); setImageUrl("");
      setNotice("محصول در کاتالوگ داخلی به‌صورت پیش‌نویس ثبت شد.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ثبت محصول ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  async function importSelected() {
    if (!sellerId || !selectedIds.length) return;
    setError("");
    setNotice("");
    setImporting(true);
    try {
      const result = await api<ImportResult>("/api/marketplace/products/import-reference", {
        method: "POST",
        body: JSON.stringify({ sellerId, productIds: selectedIds })
      });
      setNotice(`ورود تمام شد: ${result.totalImported.toLocaleString("fa-IR")} محصول در کاتالوگ داخلی ثبت شد؛ ${result.totalSkipped.toLocaleString("fa-IR")} مورد رد شد. همهٔ محصولات واردشده پیش‌نویس هستند و خودکار منتشر نمی‌شوند.`);
      setSelectedIds([]);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ورود محصولات به کاتالوگ داخلی ناموفق بود.");
    } finally {
      setImporting(false);
    }
  }

  async function syncReferenceProducts() {
    if (!sourceLinks.length) return;
    setError(""); setNotice(""); setSyncingSources(true);
    try {
      const batch = sourceLinks.slice(0, 50);
      const result = await api<{updatedCount:number;skippedCount:number;failedCount:number;status:string;message:string}>("/api/marketplace/products/sync-reference", {
        method: "POST",
        body: JSON.stringify({ sourceProductIds: batch.map(item => item.source_product_id) })
      });
      setNotice(`همگام‌سازی منبع تمام شد: ${result.updatedCount} رکورد به‌روز شد، ${result.skippedCount} مورد رد شد و ${result.failedCount} خطا داشت. قیمت فروش فقط طبق سیاست انتخابی تغییر می‌کند؛ موجودی داخلی مستقل می‌ماند.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "همگام‌سازی مرجع ناموفق بود.");
    } finally { setSyncingSources(false); }
  }

  async function saveSourcePolicy(link: SourceLink, policy: "manual" | "mirror" | "markup", markupPercent = Number(link.markup_percent || 0)) {
    setError(""); setNotice(""); setPolicySavingId(link.product_id);
    try {
      await api("/api/marketplace/products/" + encodeURIComponent(link.product_id) + "/source-policy", {
        method: "POST",
        body: JSON.stringify({ pricePolicy: policy, markupPercent })
      });
      setNotice(policy === "manual" ? "قیمت فروش مستقل تنظیم شد." : policy === "mirror" ? "قیمت فروش در همگام‌سازی بعدی با قیمت منبع برابر می‌شود." : `قیمت فروش در همگام‌سازی بعدی با تعدیل ${markupPercent}٪ محاسبه می‌شود.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ذخیره سیاست قیمت ناموفق بود.");
    } finally { setPolicySavingId(""); }
  }

  async function changeStatus(item: Product, status: "active" | "draft") {
    setError(""); setNotice(""); setSavingId(item.id);
    try {
      await api("/api/marketplace/products/" + encodeURIComponent(item.id) + "/status", {
        method: "PATCH", body: JSON.stringify({ status })
      });
      setNotice(status === "active" ? "محصول در ویترین داخلی منتشر شد." : "محصول از ویترین برداشته شد.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تغییر وضعیت محصول ناموفق بود.");
    } finally { setSavingId(""); }
  }

  const selectedSeller = sellers.find(x => x.id === sellerId);
  const sellerFor = (id: string) => sellers.find(x => x.id === id);
  const visibleItems = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("fa");
    return items.filter(item => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesSearch = !needle || [item.title, item.sku, item.category || "", sellerFor(item.seller_id)?.display_name || ""].join(" ").toLocaleLowerCase("fa").includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter, sellers]);

  const filteredSourceProducts = useMemo(() => {
    const needle = sourceSearch.trim().toLocaleLowerCase("fa");
    return sourceProducts.filter(item => (!sourceCategory || item.category === sourceCategory) && (!needle || [item.title, item.sku, item.category, item.brand || ""].join(" ").toLocaleLowerCase("fa").includes(needle)));
  }, [sourceProducts, sourceSearch, sourceCategory]);

  return <main className="enterprise-main mp-products" dir="rtl">
    <header className="mp-page-head">
      <div><span className="mp-kicker">مدیریت کاتالوگ و ویترین</span><h1>محصولات بازارگاه</h1><p>محصولات در پایگاه دادهٔ سازمان ثبت می‌شوند. ورود گروهی، تصویر را در رسانهٔ داخلی ذخیره می‌کند و محصول را فقط به‌صورت پیش‌نویس می‌سازد.</p></div>
      <a className="mp-back-link" href="/platform">بازگشت به مرکز عملیات <span>←</span></a>
    </header>

    <section className="mp-metrics" aria-label="خلاصه کاتالوگ">
      <article><span>کل محصولات</span><strong>{items.length.toLocaleString("fa-IR")}</strong><small>رکوردهای کاتالوگ داخلی</small></article>
      <article><span>منتشرشده</span><strong>{items.filter(item => item.status === "active").length.toLocaleString("fa-IR")}</strong><small>قابل نمایش در ویترین</small></article>
      <article><span>پیش‌نویس</span><strong>{items.filter(item => item.status === "draft").length.toLocaleString("fa-IR")}</strong><small>نیازمند بررسی و تأیید</small></article>
      <article><span>فروشندگان فعال</span><strong>{sellers.filter(item => item.status === "active").length.toLocaleString("fa-IR")}</strong><small>مجاز به انتشار محصول</small></article>
    </section>

    <section className="mp-workspace">
      <div className="mp-workspace-head"><div><h2>افزودن به کاتالوگ</h2><p>محصول را ثبت کنید یا دادهٔ مرجع را به رکورد داخلی قابل بررسی تبدیل کنید.</p></div>
        <div className="mp-tabs" role="tablist" aria-label="روش افزودن محصول">
          <button type="button" role="tab" aria-selected={tab === "manual"} className={tab === "manual" ? "is-active" : ""} onClick={() => setTab("manual")}>ثبت محصول</button>
          <button type="button" role="tab" aria-selected={tab === "import"} className={tab === "import" ? "is-active" : ""} onClick={() => { setTab("import"); if (!sourceProducts.length) void loadSourceCatalog(); }}>ورود از منبع</button>
        </div>
      </div>

      <div className="mp-seller-row"><label htmlFor="mp-seller">مالک محصول / فروشنده</label><select id="mp-seller" value={sellerId} onChange={event => setSellerId(event.target.value)}><option value="">انتخاب فروشنده</option>{sellers.map(seller => <option key={seller.id} value={seller.id}>{seller.display_name} · {seller.status === "active" ? "فعال" : "غیرفعال"}</option>)}</select>{selectedSeller && selectedSeller.status !== "active" && <small>فروشنده غیرفعال است؛ محصول تا فعال‌سازی او منتشر نمی‌شود.</small>}</div>

      {tab === "manual" ? <div className="mp-form-grid">
        <label>شناسه کالا (SKU)<input value={sku} onChange={event => setSku(event.target.value)} placeholder="مثلاً SKU-10025" /></label>
        <label>عنوان محصول<input value={title} onChange={event => setTitle(event.target.value)} placeholder="نام دقیق و قابل جستجوی محصول" /></label>
        <label>دسته‌بندی<select value={category} onChange={event => setCategory(event.target.value)}><option value="">انتخاب دسته‌بندی</option>{categories.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
        <label>قیمت به ریال<input value={price} onChange={event => setPrice(event.target.value)} type="number" min="0" inputMode="numeric" placeholder="قیمت تأییدشده" /></label>
        <label className="mp-field-wide">توضیحات محصول<textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} placeholder="ویژگی‌ها، مشخصات و نکات مهم کالا" /></label>
        <label className="mp-field-wide">تصویر محصول (اختیاری، حداکثر ۵ مگابایت)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadImage(event.target.files?.[0])} disabled={uploadingImage} /><small>{uploadingImage ? "در حال بررسی و ذخیره تصویر در رسانهٔ داخلی…" : "تصویر در رسانهٔ داخلی سوکار ذخیره می‌شود؛ لینک خارجی تصویر پذیرفته نمی‌شود."}</small>{imageUrl && <span className="mp-uploaded-image"><img src={imageUrl} alt="پیش‌نمایش تصویر ثبت‌شده" /><code dir="ltr">{imageUrl}</code><button type="button" onClick={() => setImageUrl("")}>حذف تصویر از پیش‌نویس</button></span>}</label>
        <div className="mp-form-actions"><button type="button" onClick={create} disabled={saving || uploadingImage || !sellerId || !sku.trim() || !title.trim() || price === ""}>{saving ? "در حال ثبت…" : "ثبت پیش‌نویس محصول"} <span>←</span></button><small>انتشار عمومی مرحله‌ای جداگانه است.</small></div>
      </div> : <div className="mp-import-panel">
        <div className="mp-import-head"><div><h3>ورود مرجع به کاتالوگ داخلی</h3><p>فهرست مرجع فقط در مدیریت دیده می‌شود. هر محصول پس از ورود، شناسه و صفحه داخلی می‌گیرد و با قیمت‌گذاری و انتشار مستقل شما اداره می‌شود.</p>{sourceFetchedAt && <small>آخرین دریافت موفق فهرست: {new Date(sourceFetchedAt).toLocaleString("fa-IR")}</small>}</div></div>
        <div className="mp-source-id-row">
          <label htmlFor="mp-source-product-id">شناسه یا لینک محصول دیجی‌کالا<input id="mp-source-product-id" value={sourceProductId} onChange={event => setSourceProductId(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void lookupDigikalaProduct(); } }} placeholder="شناسه یا لینک محصول؛ مثال dkp-12345678" /></label>
          <button type="button" className="mp-refresh" onClick={lookupDigikalaProduct} disabled={loadingSource || !sourceProductId.trim()}>{loadingSource ? "در حال دریافت…" : "دریافت محصول"}</button><button type="button" className="mp-refresh" onClick={() => void loadSourceCatalog()} disabled={loadingSource}>{loadingSource ? "در حال دریافت فهرست…" : "تازه‌سازی فهرست"}</button>
        </div>
        {sourceStatus === "unavailable" && <p className="mp-inline-warning">منبع مرجع فعلاً پاسخ نمی‌دهد. محصولات ثبت‌شدهٔ داخلی تغییری نمی‌کنند.</p>}
        {loadingSource ? <div className="mp-import-empty">در حال دریافت فهرست محصولات مرجع…</div>
        : filteredSourceProducts.length ? <>
          <div className="mp-source-filters"><label className="mp-source-search">جستجوی فهرست مرجع<input value={sourceSearch} onChange={event => setSourceSearch(event.target.value)} placeholder="نام کالا، برند یا دسته‌بندی…" /></label><label className="mp-source-search">دسته‌بندی مرجع<select value={sourceCategory} onChange={event => setSourceCategory(event.target.value)}><option value="">همه دسته‌بندی‌ها</option>{[...new Set(sourceProducts.map(item => item.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fa")).map(item=><option key={item} value={item}>{item}</option>)}</select></label></div><div className="mp-selection-bar"><span>{selectedIds.length.toLocaleString("fa-IR")} محصول انتخاب شده · حداکثر ۵۰ مورد در هر نوبت</span><button type="button" onClick={() => setSelectedIds(selectedIds.length >= Math.min(50, filteredSourceProducts.length) ? [] : filteredSourceProducts.slice(0,50).map(item => item.id))}>{selectedIds.length >= Math.min(50, filteredSourceProducts.length) && selectedIds.length > 0 ? "لغو انتخاب" : "انتخاب ۵۰ مورد اول"}</button><button type="button" className="mp-import-submit" onClick={importSelected} disabled={!sellerId || !selectedIds.length || importing}>{importing ? "در حال ورود و ذخیره تصاویر…" : "ورود به کاتالوگ داخلی"}</button></div>
          <div className="mp-source-grid">{filteredSourceProducts.map(item => <label key={item.id} className={selectedIds.includes(item.id) ? "mp-source-card is-selected" : "mp-source-card"}>
            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={event => { if (event.target.checked) { if (selectedIds.length >= 50) { setError("در هر نوبت حداکثر ۵۰ محصول وارد می‌شود."); return; } setSelectedIds(current => current.includes(item.id) ? current : [...current, item.id]); } else setSelectedIds(current => current.filter(id => id !== item.id)); }} />
            <img src={item.image_url} alt="" loading="lazy" />
            <span className="mp-source-card-copy"><b>{item.title}</b><small>{item.category}{item.brand ? " · " + item.brand : ""}</small><strong>{money(item.price, item.currency)}</strong><em>پس از ورود: پیش‌نویس</em></span>
          </label>)}</div>
        </> : <div className="mp-import-empty">{sourceProducts.length ? "با این جستجو محصولی پیدا نشد." : "فهرست مرجع خالی است. از ثبت دستی محصول استفاده کنید یا بعداً فهرست را تازه‌سازی کنید."}</div>}
      </div>}

      {error && <div className="mp-feedback is-error" role="alert">{error}</div>}
      {notice && <div className="mp-feedback is-success" role="status">{notice}</div>}
    </section>

    <section className="mp-inventory">
      <div className="mp-inventory-head"><div><h2>محصولات ثبت‌شده</h2><p>هر کالا صفحهٔ داخلی دارد؛ انتشار فقط پس از بررسی اطلاعات و فعال بودن فروشنده انجام می‌شود.</p></div><div className="mp-filters">
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="جستجوی نام، شناسه یا فروشنده…" aria-label="جستجوی محصولات" />
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="فیلتر وضعیت"><option value="all">همه وضعیت‌ها</option><option value="draft">پیش‌نویس</option><option value="active">منتشرشده</option><option value="archived">بایگانی‌شده</option></select>
      </div></div>
      {loading ? <div className="mp-inventory-empty">در حال دریافت اطلاعات کاتالوگ…</div>
      : visibleItems.length ? <div className="mp-product-list">{visibleItems.map(item => {
        const seller = sellerFor(item.seller_id);
        const canPublish = seller?.status === "active";
        return <article className="mp-product-row" key={item.id}>
          <div className="mp-product-thumb">{item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <span>◇</span>}</div>
          <div className="mp-product-name"><b>{item.title}</b><small>{item.sku} · {seller?.display_name || "فروشنده"}{item.category ? " · " + item.category : ""}</small></div>
          <strong className="mp-product-price">{money(item.price, item.currency)}</strong>
          <span className={"mp-status status-" + item.status}><i />{statusLabel[item.status] || item.status}</span>
          <div className="mp-row-actions">{item.status === "active"
            ? <button type="button" onClick={() => changeStatus(item, "draft")} disabled={savingId === item.id}>{savingId === item.id ? "در حال ذخیره…" : "برداشتن از ویترین"}</button>
            : <button type="button" onClick={() => changeStatus(item, "active")} disabled={savingId === item.id || !canPublish} title={!canPublish ? "ابتدا فروشنده را فعال کنید" : ""}>{savingId === item.id ? "در حال ذخیره…" : "انتشار محصول"}</button>}
            {!canPublish && <small>فعال‌سازی فروشنده لازم است</small>}
          </div>
        </article>;
      })}</div> : <div className="mp-inventory-empty">{items.length ? "محصولی با این فیلتر پیدا نشد." : "هنوز محصولی در کاتالوگ داخلی ثبت نشده است."}</div>}
    </section>

    <section className="mp-inventory mp-source-sync">
      <div className="mp-inventory-head">
        <div><h2>تأمین و همگام‌سازی مرجع</h2><p>قیمت مرجع و وضعیت اعلام‌شدهٔ تأمین‌کننده جدا از قیمت فروش و موجودی انبار خودت ذخیره می‌شود.</p></div>
        <button type="button" className="mp-refresh" onClick={syncReferenceProducts} disabled={syncingSources || !sourceLinks.length}>{syncingSources ? "در حال همگام‌سازی…" : `به‌روزرسانی ${Math.min(50,sourceLinks.length).toLocaleString("fa-IR")} مورد اول`}</button>
      </div>
      {!sourceLinks.length ? <div className="mp-inventory-empty">هنوز محصولی به منبع مرجع متصل نیست. ابتدا از بخش «ورود از منبع» محصول وارد کن.</div>
      : <div className="mp-source-sync-list">{sourceLinks.map(link => <article className="mp-source-sync-row" key={link.id}>
        <div className="mp-product-name"><b>{link.title}</b><small>{link.sku} · {link.source_name} · {link.source_sku || link.source_product_id}</small></div>
        <div><small>قیمت منبع</small><strong>{link.source_price == null ? "ثبت نشده" : money(link.source_price,link.source_currency)}</strong></div>
        <div><small>قیمت فروش خودت</small><strong>{money(link.sale_price,link.source_currency)}</strong></div>
        <div><small>وضعیت منبع</small><strong>{link.source_available === true ? "موجود اعلام شده" : link.source_available === false ? "ناموجود اعلام شده" : "نامشخص"}</strong></div>
        <label className="mp-source-policy">سیاست قیمت
          <select value={link.price_policy} disabled={policySavingId===link.product_id} onChange={event => void saveSourcePolicy(link,event.target.value as "manual"|"mirror"|"markup")}>
            <option value="manual">مستقل، بدون تغییر خودکار</option><option value="mirror">برابر با قیمت منبع</option><option value="markup">قیمت منبع + درصد تعدیل</option>
          </select>
        </label>
        {link.price_policy === "markup" && <label className="mp-source-policy">درصد تعدیل
          <input type="number" min="-100" max="10000" step="0.1" defaultValue={Number(link.markup_percent||0)} onBlur={event => {const value=Number(event.target.value);if(Number.isFinite(value)&&value!==Number(link.markup_percent||0))void saveSourcePolicy(link,"markup",value);}} />
        </label>}
        <small className="mp-source-sync-meta">{link.last_success_at ? "آخرین همگام‌سازی: "+new Date(link.last_success_at).toLocaleString("fa-IR") : "هنوز همگام‌سازی موفقی ثبت نشده"}{link.last_error ? " · خطا: "+link.last_error : ""}</small>
      </article>)}</div>}
    </section>
  </main>;
}
