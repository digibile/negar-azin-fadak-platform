import Link from "next/link";
import StoreInfoPage from "../StoreInfoPage";

export default function Returns() {
  return <StoreInfoPage eyebrow="خدمات پس از خرید" title="بازگشت کالا و پیگیری درخواست" description="راهنمای آماده‌سازی درخواست مرجوعی و پیگیری آن، با تفکیک سفارش واقعی از نمونه‌های آزمایشی.">
    <div className="plan-grid">
      <article><span className="sk-info-eyebrow">مرحله ۰۱</span><h2>سفارش را شناسایی کنید</h2><p>برای درخواست مرتبط با خرید واقعی، ابتدا وارد حساب کاربری شوید و شماره سفارش، نام کالا و وضعیت تحویل را بررسی کنید. سفارش آزمایشی ذخیره‌شده در مرورگر، شناسه سفارش عملیاتی ندارد.</p></article>
      <article><span className="sk-info-eyebrow">مرحله ۰۲</span><h2>شرایط کالا را بررسی کنید</h2><p>شرایط قابل اعمال ممکن است به دسته کالا، سلامت بسته‌بندی، زمان تحویل و سیاست فروشنده وابسته باشد. پیش از ارسال کالا، دستورالعمل معتبر همان سفارش را دریافت کنید.</p></article>
      <article><span className="sk-info-eyebrow">مرحله ۰۳</span><h2>مدارک لازم را آماده کنید</h2><p>شماره سفارش، شرح کوتاه مسئله و در صورت نیاز تصاویر مرتبط را آماده کنید. اطلاعات کارت بانکی، رمز پویا یا رمز عبور را ارسال نکنید.</p></article>
      <article><span className="sk-info-eyebrow">مرحله ۰۴</span><h2>وضعیت را پیگیری کنید</h2><p>درخواست معتبر باید به سفارش ثبت‌شده متصل باشد. اگر سفارش در حساب شما نمایش داده نمی‌شود، ابتدا از ورود با حساب درست مطمئن شوید.</p></article>
    </div>
    <article><h2>نکته مهم</h2><p>ثبت درخواست آنلاین برای اقلام سفارش تحویل‌شده از حساب مشتری انجام می‌شود. درخواست پس از ثبت در صف بررسی فروشگاه قرار می‌گیرد؛ تأیید مرجوعی به‌تنهایی به معنی انجام بازپرداخت وجه نیست.</p><div className="store-actions"><Link href="/account/returns">ثبت و پیگیری آنلاین مرجوعی</Link><Link href="/account/orders" className="secondary">سفارش‌های حساب</Link><Link href="/store/faq" className="secondary">راهنمای خرید</Link><Link href="/login" className="secondary">ورود به حساب</Link></div></article>
  </StoreInfoPage>;
}
