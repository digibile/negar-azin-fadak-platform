"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type Product = { id: string; sku: string; title: string; price: string | number; currency: string; status: string; image_url?: string | null };
export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [sku, setSku] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const result: any = await api("/api/marketplace/products");
      setItems(result.items || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "دریافت فهرست محصولات ناموفق بود.");
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

  return <main className="enterprise-main" dir="rtl">
    <header className="platform-header"><div><span className="section-kicker">کاتالوگ واقعی</span><h1>محصولات و تصاویر کالا</h1><p>اطلاعات محصول در PostgreSQL ثبت می‌شود؛ تصویر از نشانی واقعی ثبت‌شده دریافت می‌شود.</p></div><a href="/platform">مرکز عملیات</a></header>
    <section className="platform-panel">
      <div className="platform-form">
        <input value={sellerId} onChange={event => setSellerId(event.target.value)} placeholder="شناسه فروشنده" aria-label="شناسه فروشنده" />
        <input value={sku} onChange={event => setSku(event.target.value)} placeholder="شناسه کالا (SKU)" aria-label="شناسه کالا" />
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="عنوان محصول" aria-label="عنوان محصول" />
        <input value={category} onChange={event => setCategory(event.target.value)} placeholder="دسته‌بندی کالا" aria-label="دسته‌بندی کالا" />
        <input value={price} onChange={event => setPrice(event.target.value)} type="number" min="0" placeholder="قیمت" aria-label="قیمت" />
        <input value={imageUrl} onChange={event => setImageUrl(event.target.value)} type="url" placeholder="نشانی تصویر کالا (HTTPS)" aria-label="نشانی تصویر کالا" />
        <button onClick={create} disabled={saving || !sellerId.trim() || !sku.trim() || !title.trim() || price === ""}>{saving ? "در حال ثبت…" : "ثبت محصول"}</button>
      </div>
      {error && <p className="enterprise-loading error" role="alert">{error}</p>}
      {items.length ? <div className="platform-list">{items.map(item => <article className="platform-row" key={item.id}>
        {item.image_url && <img src={item.image_url} alt="" loading="lazy" width="64" height="64" style={{ objectFit: "contain", borderRadius: 10, background: "#f4f6f8" }} />}
        <div><b>{item.title}</b><small>{item.sku}</small></div><span>{Number(item.price).toLocaleString("fa-IR")} {item.currency}</span><small>{item.status}</small>
      </article>)}</div> : <div className="enterprise-loading">هنوز محصولی برای نمایش ثبت نشده است.</div>}
    </section>
  </main>;
}
