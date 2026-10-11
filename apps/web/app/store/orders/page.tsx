import Link from "next/link";
import StoreInfoPage from "../StoreInfoPage";

export default function StoreOrders() {
  return <StoreInfoPage eyebrow="حساب مشتری" title="پیگیری سفارش‌ها" description="سفارش‌های واقعی باید از حساب کاربری شما پیگیری شوند. این صفحه شما را به مسیر سفارش‌های حساب هدایت می‌کند و وضعیت ساختگی نمایش نمی‌دهد.">
    <div className="plan-grid">
      <article><span className="sk-info-eyebrow">برای مشتریان</span><h2>سفارش‌های حساب کاربری</h2><p>پس از ورود، سفارش‌های متصل به حساب را از بخش اختصاصی سفارش‌ها مشاهده کنید. اگر هنوز وارد نشده‌اید، ابتدا احراز هویت کنید.</p><div className="store-actions"><Link href="/account/orders">مشاهده سفارش‌های من</Link><Link href="/login" className="secondary">ورود به حساب</Link></div></article>
      <article><span className="sk-info-eyebrow">توجه</span><h2>سبد آزمایشی با سفارش واقعی فرق دارد</h2><p>سفارش آزمایشی فقط در حافظه مرورگر ثبت می‌شود و به پایگاه داده سفارش‌های عملیاتی منتقل نمی‌شود. محصولات نمونه نیز قیمت و موجودی قطعی فروش ندارند.</p><Link className="sk-info-inline-link" href="/store/faq">مطالعه پرسش‌های متداول ←</Link></article>
    </div>
    <article><h2>قبل از تماس با پشتیبانی</h2><p>اگر سفارش واقعی دارید، شماره سفارش و حسابی را که با آن خرید کرده‌اید بررسی کنید. اطلاعات پرداخت حساس یا رمزهای بانکی را در پیام‌ها قرار ندهید.</p></article>
  </StoreInfoPage>;
}
