"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type Seller = { id: string; display_name: string; status: string };
type Category = { id: string; code: string; name: string; status: string; sort_order: number };
type Product = { id: string; sku: string; title: string; price: string | number; currency: string; status: string; seller_id: string; image_url?: string | null };
const statusLabel:Record<string,string>={draft:"پیش‌نویس",active:"فعال و قابل نمایش",archived:"بایگانی‌شده"};

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState("");

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
      if (!sellerId && sellerResult.items?.length) {
        setSellerId((sellerResult.items.find(x => x.status === "active") || sellerResult.items[0]).id);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "دریافت فهرست محصولات یا فروشندگان ناموفق بود.");
    }
  }
  useEffect(() => { void load(); }, []);

  async function create() {
    setError("");
    if (imageUrl && !/^https?:\/\//i.test(imageUrl.trim()) && !(imageUrl.trim().startsWith("/") && !imageUrl.trim().startsWith("//"))) {
      setError("نشانی تصویر باید HTTPS یا یک مسیر داخلی معتبر باشد.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/marketplace/products", {
        method: "POST",
        body: JSON.stringify({
          sellerId, sku: sku.trim(), title: title.trim(), price: Number(price),
          category: category.trim() || undefined,
          attributes: imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}
        })
      });
      setSku(""); setTitle(""); setPrice(""); setCategory(""); setImageUrl("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ثبت محصول ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item:Product,status:"active"|"draft") {
    setError("");setSavingId(item.id);
    try {
      await api("/api/marketplace/products/"+encodeURIComponent(item.id)+"/status", {
        method:"PATCH",body:JSON.stringify({status})
      });
      await load();
    } catch(reason) {
      setError(reason instanceof Error?reason.message:"تغییر وضعیت محصول ناموفق بود.");
    } finally {setSavingId("");}
  }

  const selectedSeller=sellers.find(x=>x.id===sellerId);
  const sellerFor=(id:string)=>sellers.find(x=>x.id===id);
  return <main className="enterprise-main" dir="rtl">
    <header className="platform-header"><div><span className="section-kicker">کاتالوگ واقعی</span><h1>محصولات و تصاویر کالا</h1><p>اطلاعات محصول در PostgreSQL ثبت می‌شود. دسته‌بندی از فهرست مرکزی انتخاب می‌شود؛ برای نمایش عمومی، محصول و فروشنده باید فعال باشند.</p></div><a href="/platform">مرکز عملیات</a></header>
    <section className="platform-panel">
      <div className="platform-form">
        <select value={sellerId} onChange={event=>setSellerId(event.target.value)} aria-label="فروشنده">
          <option value="">انتخاب فروشنده</option>
          {sellers.map(seller=><option key={seller.id} value={seller.id}>{seller.display_name} · {seller.status==="active"?"فعال":"غیرفعال"}</option>)}
        </select>
        <input value={sku} onChange={event => setSku(event.target.value)} placeholder="شناسه کالا (SKU)" aria-label="شناسه کالا" />
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="عنوان محصول" aria-label="عنوان محصول" />
        <select value={category} onChange={event => setCategory(event.target.value)} aria-label="دسته‌بندی کالا">
          <option value="">انتخاب دسته‌بندی</option>
          {categories.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
        <input value={price} onChange={event => setPrice(event.target.value)} type="number" min="0" placeholder="قیمت" aria-label="قیمت" />
        <input value={imageUrl} onChange={event => setImageUrl(event.target.value)} type="url" placeholder="نشانی تصویر کالا (HTTPS)" aria-label="نشانی تصویر کالا" />
        <button onClick={create} disabled={saving || !sellerId || !sku.trim() || !title.trim() || price === ""}>{saving ? "در حال ثبت…" : "ثبت پیش‌نویس محصول"}</button>
      </div>
      {selectedSeller&&selectedSeller.status!=="active"&&<p className="enterprise-loading">فروشنده فعال نیست. محصول ثبت می‌شود، اما تا فعال‌سازی فروشنده در ویترین عمومی نمایش داده نمی‌شود.</p>}
      {error && <p className="enterprise-loading error" role="alert">{error}</p>}
      {items.length ? <div className="platform-list">{items.map(item => {
        const seller=sellerFor(item.seller_id);
        const canPublish=seller?.status==="active";
        return <article className="platform-row" key={item.id}>
          {item.image_url && <img src={item.image_url} alt="" loading="lazy" width="64" height="64" style={{ objectFit: "contain", borderRadius: 10, background: "#f4f6f8" }} />}
          <div><b>{item.title}</b><small>{item.sku} · {seller?.display_name||"فروشنده"}</small></div>
          <span>{Number(item.price).toLocaleString("fa-IR")} {item.currency}</span>
          <strong>{statusLabel[item.status]||item.status}</strong>
          <div className="record-actions">
            {item.status==="active"
              ? <button onClick={()=>changeStatus(item,"draft")} disabled={savingId===item.id}>{savingId===item.id?"در حال ذخیره…":"برداشتن از ویترین"}</button>
              : <button onClick={()=>changeStatus(item,"active")} disabled={savingId===item.id||!canPublish} title={!canPublish?"ابتدا فروشنده را فعال کنید":""}>{savingId===item.id?"در حال ذخیره…":"انتشار محصول"}</button>}
            {!canPublish&&<small>فعال‌سازی فروشنده لازم است</small>}
          </div>
        </article>;
      })}</div> : <div className="enterprise-loading">هنوز محصولی برای نمایش ثبت نشده است.</div>}
    </section>
  </main>;
}
