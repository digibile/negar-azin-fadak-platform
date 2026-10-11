import Link from "next/link";
import type { ReactNode } from "react";

type StoreInfoPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export default function StoreInfoPage({ eyebrow, title, description, children }: StoreInfoPageProps) {
  return (
    <main className="sookar-store sk-info-page" dir="rtl">
      <header className="sk-info-header">
        <div className="sk-info-header-inner">
          <Link href="/" className="sk-info-brand" aria-label="سوکار، صفحه اصلی">
            <span className="sk-info-brand-mark">س</span>
            <span><strong>سوکار</strong><small>بازارگاه و فروشگاه اینترنتی</small></span>
          </Link>
          <nav aria-label="ناوبری اصلی">
            <Link href="/store/shop">همه کالاها</Link>
            <Link href="/marketplace/directory">فروشگاه‌ها</Link>
            <Link href="/pay">خدمات اعتباری</Link>
          </nav>
          <div className="sk-info-actions">
            <Link href="/store/cart">سبد خرید</Link>
            <Link href="/login" className="sk-info-login">ورود به حساب</Link>
          </div>
        </div>
      </header>
      <div className="sk-info-breadcrumb"><Link href="/">خانه</Link><span aria-hidden="true">/</span><span>{title}</span></div>
      <section className="sk-info-hero">
        <span className="sk-info-eyebrow"><i aria-hidden="true" />{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="sk-info-hero-links">
          <Link href="/store/shop" className="sk-info-primary">رفتن به فروشگاه <span aria-hidden="true">←</span></Link>
          <Link href="/store/cart" className="sk-info-secondary">مشاهده سبد خرید</Link>
        </div>
      </section>
      <section className="sk-info-content">{children}</section>
      <footer className="sk-info-footer">
        <div><Link href="/" className="sk-info-footer-brand"><span className="sk-info-brand-mark">س</span><strong>سوکار</strong></Link><p>تجربه‌ای یکپارچه برای کشف کالا، مقایسه و پیگیری مسیر خرید.</p></div>
        <nav aria-label="پیوندهای راهنما">
          <Link href="/store/faq">راهنمای خرید</Link>
          <Link href="/store/terms">قوانین و شرایط</Link>
          <Link href="/store/returns">بازگشت کالا</Link>
          <Link href="/store/orders">پیگیری سفارش</Link>
        </nav>
        <small>اطلاعات قیمت، موجودی و امکان خرید باید پیش از ثبت سفارش تأیید شوند.</small>
      </footer>
    </main>
  );
}
