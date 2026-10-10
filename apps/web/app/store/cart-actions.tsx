"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type StoreCartProduct = {
  id: string;
  sku: string;
  title: string;
  price: string | number;
  currency: string;
  seller_name?: string | null;
  store_id?: string | null;
  image_url?: string | null;
  is_demo_product?: boolean;
  source_url?: string | null;
  site?: string;
};

export type StoreCartItem = StoreCartProduct & { quantity: number };

const CART_KEY = "sookar.store.cart.v1";

function readCart(): StoreCartItem[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is StoreCartItem =>
      Boolean(item && typeof item.id === "string" && typeof item.title === "string" &&
      Number.isFinite(Number(item.price)) && Number(item.price) >= 0 &&
      Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0
    ));
  } catch {
    return [];
  }
}

function writeCart(items: StoreCartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("sookar-cart-updated"));
}

function money(value: number, currency: string) {
  return value.toLocaleString("fa-IR") + " " + (currency === "IRR" ? "ریال" : currency);
}

export function CartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () => setCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
    refresh();
    window.addEventListener("sookar-cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sookar-cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return <span className="sk-cart-count" aria-label={count.toLocaleString("fa-IR") + " قلم در سبد"}>{count > 99 ? "۹۹+" : count.toLocaleString("fa-IR")}</span>;
}

export function AddToCartButton({ product, compact = false }: { product: StoreCartProduct; compact?: boolean }) {
  const [added, setAdded] = useState(false);
  function add() {
    const cart = readCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    writeCart(cart);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }
  return <button type="button" className={compact ? "sk-add-cart sk-add-cart-compact" : "sk-add-cart"} onClick={add}>
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>{added ? "به سبد اضافه شد" : compact ? "افزودن" : "افزودن به سبد خرید"}
  </button>;
}

export function CartView() {
  const [items, setItems] = useState<StoreCartItem[]>([]);
  useEffect(() => {
    const refresh = () => setItems(readCart());
    refresh();
    window.addEventListener("sookar-cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sookar-cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  function update(id: string, delta: number) {
    const next = readCart().map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter(item => item.quantity > 0);
    writeCart(next);
    setItems(next);
  }
  function remove(id: string) {
    const next = readCart().filter(item => item.id !== id);
    writeCart(next);
    setItems(next);
  }
  function clear() {
    writeCart([]);
    setItems([]);
  }

  return <main className="sk-store" dir="rtl">
    <div className="sk-service-strip"><div className="sk-wrap sk-service-inner"><span>سبد خرید سوکار</span><div><Link href="/store">ادامه خرید</Link><Link href="/store/faq">راهنمای خرید</Link></div></div></div>
    <header className="sk-header"><div className="sk-wrap sk-header-main">
      <Link href="/" className="sk-logo"><span className="sk-logo-mark">س</span><span><b>سوکار</b><small>سبد خرید شما</small></span></Link>
      <div className="sk-cart-page-title"><span>مرحله ۱ از خرید</span><h1>سبد خرید</h1></div>
      <Link className="sk-primary-btn" href="/store/shop">ادامه خرید ←</Link>
    </div></header>
    <div className="sk-wrap sk-cart-layout">
      <section className="sk-cart-items">
        <div className="sk-cart-heading"><div><h2>محصولات انتخاب‌شده</h2><p>{count.toLocaleString("fa-IR")} قلم در سبد</p></div>{items.length > 0 && <button type="button" onClick={clear} className="sk-cart-clear">خالی کردن سبد</button>}</div>
        {items.length === 0 ? <div className="sk-cart-empty"><span>🛒</span><h2>سبد خریدت هنوز خالی است</h2><p>محصولات موردنظرت را از کاتالوگ انتخاب کن و به اینجا برگرد.</p><Link href="/store/shop" className="sk-primary-btn">مشاهده کالاها ←</Link></div> :
          <div className="sk-cart-list">{items.map(item => <article className="sk-cart-item" key={item.id}>
            <div className="sk-cart-thumb">{item.image_url ? <img src={item.image_url} alt={item.title} /> : <span>▧</span>}</div>
            <div className="sk-cart-item-main"><Link href={"/store/product/" + encodeURIComponent(item.sku || item.id) + "?site=" + encodeURIComponent(item.site || "default")} className="sk-cart-item-title">{item.title}</Link><small>فروشنده: {item.seller_name || "فروشنده ثبت‌شده"}</small>{item.is_demo_product && <small className="sk-demo-cart-note">نمونهٔ آزمایشی سوکار · قیمت مرجع، نه قیمت فروش</small>}<strong>{money(Number(item.price), item.currency)}</strong>
              <div className="sk-cart-controls"><div className="sk-quantity"><button type="button" onClick={() => update(item.id, -1)} aria-label="کاهش تعداد">−</button><span>{item.quantity.toLocaleString("fa-IR")}</span><button type="button" onClick={() => update(item.id, 1)} aria-label="افزایش تعداد">＋</button></div><button type="button" onClick={() => remove(item.id)} className="sk-cart-remove">حذف</button></div>
            </div>
            <strong className="sk-cart-line-total">{money(Number(item.price) * item.quantity, item.currency)}</strong>
          </article>)}</div>}
      </section>
      <aside className="sk-cart-summary"><h2>خلاصه سفارش</h2><div><span>تعداد کالا</span><b>{count.toLocaleString("fa-IR")} قلم</b></div><div><span>جمع کالاها</span><b>{money(total, items[0]?.currency || "IRR")}</b></div><div><span>هزینه ارسال</span><small>پس از تعیین فروشگاه و نشانی مشخص می‌شود</small></div><hr/><div className="sk-cart-total"><span>جمع فعلی</span><strong>{money(total, items[0]?.currency || "IRR")}</strong></div>
        <p className="sk-cart-notice">{items.some(item => item.is_demo_product) ? "سبد شامل کالای آزمایشی سوکار است. قیمت‌ها snapshot مرجع‌اند؛ این مرحله فقط شبیه‌سازی داخلی است و سفارش یا پرداخت واقعی ایجاد نمی‌کند." : "این سبد در همین مرورگر ذخیره شده است. برای سفارش واقعی باید به حساب کاربری وارد شوید و موجودی و فروشنده بررسی شود."}</p>
        {items.length > 0 && items.every(item => item.is_demo_product)
          ? <Link href="/store/demo-checkout" className="sk-cart-checkout">ادامه مراحل آزمایشی خرید</Link>
          : <Link href="/login" className={items.length ? "sk-cart-checkout" : "sk-cart-checkout is-disabled"} aria-disabled={!items.length}>ورود به حساب کاربری</Link>}
        {items.some(item => item.is_demo_product) && items.some(item => !item.is_demo_product) && <p className="sk-cart-notice">سبد ترکیبی است. برای جلوگیری از اشتباه، کالاهای آزمایشی را از کالاهای واقعی جدا کنید؛ سفارش آزمایشی فقط برای سبدی شامل کالاهای آزمایشی فعال است.</p>}
        <Link href="/store/shop" className="sk-cart-continue">بازگشت به فروشگاه</Link>
      </aside>
    </div>
    <footer className="sk-footer"><div className="sk-wrap sk-footer-bottom"><div><span>سوکار · فروشگاه اینترنتی و بازارگاه</span><Link href="/store/terms">قوانین و شرایط</Link><Link href="/store/faq">راهنمای خرید</Link></div></div></footer>
  </main>;
}
