"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import "./products-workspace.css";

type Seller = { id: string; display_name: string; status: string };
type Category = { id: string; code: string; name: string; status: string; sort_order: number };
type Product = { id: string; sku: string; title: string; price: string | number; currency: string; status: string; seller_id: string; image_url?: string | null; category?: string | null };
type SourceProduct = { id: string; sku: string; title: string; price: string; currency: string; category: string; image_url: string; brand: string | null; source_name: string };
type SourceCatalog = { products: SourceProduct[]; sourceStatus: "live" | "unavailable"; fetchedAt: string | null };
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
  const [sourceStatus, setSourceStatus] = useState<"live" | "unavailable" | "unknown">("unknown");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSource, setLoadingSource] = useState(false);
  const [importing, setImporting] = useState(false);

  async function load() {
    setError("");
    try {
      const [productResult, sellerResult, categoryResult] = await Promise.all([
        api<{items:Product[]}>("/api/marketplace/products"),
        api<{items:Seller[]}>("/api/marketplace/sellers"),
        api<{items:Category[]}>("/api/marketplace/categories")
      ]);
      setItems(productResult.items || []);
      setSellers(sellerResult.items || []);
      setCategories((categoryResult.items || []).filter(item => item.status === "active"));
      setSellerId(current => current || (sellerResult.items?.find(x => x.status === "active") || sellerResult.items?.[0])?.id || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "دریافت کاتالوگ یا فروشندگان ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function loadSourceCatalog() {
    setError("");
    setNotice("");
    setLoadingSource(true);
    try {
      const result = await api<SourceCatalog>("/api/public/digikala-catalog");
      setSourceProducts(result.products || []);
      setSourceStatus(result.sourceStatus || "unavailable");
      setSelectedIds(current => current.filter(id => (result.products || []).some(product => product.id === id)));
      if (!result.products?.length) setNotice("در حال حاضر محصول قابل ورود از منبع مرجع دریافت نشد.");
    } catch (reason) {
      setSourceStatus("unavailable");
      setError(reason instanceof Error ? reason.message : "دریافت فهرست مرجع ناموفق بود.");
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
    return sourceProducts.filter(item => !needle || [item.title, item.sku, item.category, item.brand || ""].join(" ").toLocaleLowerCase("fa").includes(needle));
  }, [sourceProducts, sourceSearch]);

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
          <button type="button" role="tab" aria-selected={tab === "import"} className={tab === "import" ? "is-active" : ""} onClick={() => { setTab("import"); if (!sourceProducts.length && !loadingSource) void loadSourceCatalog(); }}>ورود از منبع</button>
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
        <div className="mp-import-head"><div><h3>انتخاب کالا برای ورود به کاتالوگ داخلی</h3><p>محصول انتخابی در پایگاه دادهٔ خودمان ثبت می‌شود، تصویرش در رسانهٔ داخلی کپی می‌شود و برای بررسی قیمت و مشخصات در حالت پیش‌نویس می‌ماند.</p></div><button type="button" className="mp-refresh" onClick={loadSourceCatalog} disabled={loadingSource}>{loadingSource ? "در حال دریافت…" : "به‌روزرسانی فهرست"}</button></div>
        {sourceStatus === "unavailable" && <p className="mp-inline-warning">منبع مرجع فعلاً پاسخ نمی‌دهد. محصولات ثبت‌شدهٔ داخلی تغییری نمی‌کنند.</p>}
        {loadingSource ? <div className="mp-import-empty">در حال دریافت فهرست محصولات مرجع…</div>
        : filteredSourceProducts.length ? <>
          <label className="mp-source-search">جستجوی فهرست مرجع<input value={sourceSearch} onChange={event => setSourceSearch(event.target.value)} placeholder="نام کالا، برند یا دسته‌بندی…" /></label><div className="mp-selection-bar"><span>{selectedIds.length.toLocaleString("fa-IR")} محصول انتخاب شده · حداکثر ۵۰ مورد در هر نوبت</span><button type="button" onClick={() => setSelectedIds(selectedIds.length >= Math.min(50, filteredSourceProducts.length) ? [] : filteredSourceProducts.slice(0,50).map(item => item.id))}>{selectedIds.length >= Math.min(50, filteredSourceProducts.length) && selectedIds.length > 0 ? "لغو انتخاب" : "انتخاب ۵۰ مورد اول"}</button><button type="button" className="mp-import-submit" onClick={importSelected} disabled={!sellerId || !selectedIds.length || importing}>{importing ? "در حال ورود و ذخیره تصاویر…" : "ورود به کاتالوگ داخلی"}</button></div>
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
  </main>;
}
