"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DemoCartItem = {
  id: string;
  sku: string;
  title: string;
  price: string | number;
  currency: string;
  seller_name?: string | null;
  image_url?: string | null;
  is_demo_product?: boolean;
  source_url?: string | null;
  quantity: number;
};
type DemoOrder = {
  orderNo: string;
  createdAt: string;
  status: "simulated";
  customerName: string;
  deliveryNote: string;
  total: number;
  currency: string;
  items: DemoCartItem[];
};

const CART_KEY = "sookar.store.cart.v1";
const ORDERS_KEY = "sookar.store.demo-orders.v1";
const money = (value: number, currency: string) =>
  value.toLocaleString("fa-IR") + " " + (currency === "IRR" ? "ریال" : currency);

export default function DemoCheckoutPage() {
  const [items, setItems] = useState<DemoCartItem[]>([]);
  const [customerName, setCustomerName] = useState("مشتری آزمایشی");
  const [deliveryNote, setDeliveryNote] = useState("نشانی آزمایشی، برای بررسی مسیر خرید");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<DemoOrder | null>(null);

  useEffect(() => {
    try {
      const value: unknown = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
      if (Array.isArray(value)) setItems(value.filter((item): item is DemoCartItem =>
        Boolean(item && typeof item.id === "string" && item.is_demo_product === true &&
          Number.isFinite(Number(item.price)) && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0)
      ));
    } catch {
      setItems([]);
    }
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items]
  );
  const currency = items[0]?.currency || "IRR";

  function completeDemo() {
    setError("");
    if (!items.length) {
      setError("سبد آزمایشی خالی است. به فروشگاه برگردید و یک کالای نمونه اضافه کنید.");
      return;
    }
    if (items.length !== readAllCart().length) {
      setError("سبد شامل کالاهای واقعی و آزمایشی است. برای ادامه، آن‌ها را جدا کنید.");
      return;
    }
    if (!accepted) {
      setError("تأیید کنید که این فقط شبیه‌سازی است و پرداخت واقعی انجام نمی‌شود.");
      return;
    }
    const record: DemoOrder = {
      orderNo: "DEMO-" + Date.now().toString().slice(-8),
      createdAt: new Date().toISOString(),
      status: "simulated",
      customerName: customerName.trim() || "مشتری آزمایشی",
      deliveryNote: deliveryNote.trim() || "نشانی آزمایشی",
      total,
      currency,
      items
    };
    try {
      const previous: unknown = JSON.parse(window.localStorage.getItem(ORDERS_KEY) || "[]");
      const orders = Array.isArray(previous) ? previous : [];
      window.localStorage.setItem(ORDERS_KEY, JSON.stringify([record, ...orders].slice(0, 50)));
      window.localStorage.setItem(CART_KEY, "[]");
      window.dispatchEvent(new CustomEvent("sookar-cart-updated"));
      setOrder(record);
      setItems([]);
    } catch {
      setError("ذخیره نتیجه آزمایشی در این مرورگر ممکن نشد. فضای ذخیره‌سازی مرورگر را بررسی کنید.");
    }
  }

  function readAllCart(): DemoCartItem[] {
    try {
      const value: unknown = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(value) ? value as DemoCartItem[] : [];
    } catch {
      return [];
    }
  }

  return (
    <main className="sookar-store" dir="rtl">
      <header className="store-header">
        <Link href="/" className="store-logo"><b>سوکار</b><span>تکمیل خرید آزمایشی</span></Link>
        <nav><Link href="/store">فروشگاه</Link><Link href="/store/cart">سبد خرید</Link></nav>
      </header>
      <section className="store-section">
        {order ? (
          <article className="product-card">
            <span>شبیه‌سازی کامل شد</span>
            <h1>مسیر خرید سوکار کار کرد</h1>
            <p>شماره پیگیری آزمایشی: <strong>{order.orderNo}</strong></p>
            <p>تعداد اقلام: {order.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString("fa-IR")}</p>
            <p>جمع آزمایشی: <strong>{money(order.total, order.currency)}</strong></p>
            <p>این نتیجه فقط در حافظه همین مرورگر ذخیره شده است؛ سفارش عملیاتی در دیتابیس سفارش‌ها و پرداخت بانکی ایجاد نشده است.</p>
            <div className="store-actions"><Link href="/store">بازگشت به سوکار</Link><Link href="/store/shop" className="secondary">ادامه مرور کالاها</Link></div>
          </article>
        ) : (
          <>
            <header>
              <span>مرحله ۲ از خرید · آزمایشی</span>
              <h1>بررسی و تکمیل خرید آزمایشی</h1>
              <p>محصولات این صفحه از کاتالوگ داخلی سوکار خوانده شده‌اند. این مرحله فقط برای آزمون مسیر محصول، سبد و تأیید است؛ درگاه پرداخت یا سفارش واقعی اجرا نمی‌شود.</p>
            </header>
            {error && <div className="pay-notice" role="alert">{error}</div>}
            <div className="plan-grid">
              <article className="product-card">
                <h2>خلاصه سبد</h2>
                {items.length ? items.map(item => (
                  <div className="module-row" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.sku} · تعداد {item.quantity.toLocaleString("fa-IR")}</small>
                    </div>
                    <span>{money(Number(item.price) * item.quantity, item.currency)}</span>
                  </div>
                )) : <p>کالای آزمایشی در سبد نیست.</p>}
                <hr />
                <strong>جمع آزمایشی: {money(total, currency)}</strong>
              </article>
              <article className="product-card">
                <h2>اطلاعات نمایشی</h2>
                <label>نام آزمایشی
                  <input value={customerName} onChange={event => setCustomerName(event.target.value)} maxLength={100} />
                </label>
                <label>یادداشت تحویل آزمایشی
                  <textarea value={deliveryNote} onChange={event => setDeliveryNote(event.target.value)} maxLength={300} rows={3} />
                </label>
                <label>
                  <input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />
                  می‌دانم این فقط تست رابط کاربری است و پرداخت یا سفارش واقعی ایجاد نمی‌کند.
                </label>
                <button type="button" onClick={completeDemo} disabled={!items.length || !accepted}>
                  تأیید و پایان شبیه‌سازی
                </button>
                <p>برای خرید واقعی، محصولات باید توسط فروشنده تأیید شوند و قیمت، موجودی، ارسال، حساب کاربری و درگاه پرداخت واقعی به مسیر سفارش متصل شوند.</p>
              </article>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
