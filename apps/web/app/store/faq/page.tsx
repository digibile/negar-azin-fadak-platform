import Link from "next/link";
import StoreInfoPage from "../StoreInfoPage";

const questions = [
  { title: "چطور سفارش را پیگیری کنم؟", body: "سفارش‌های ثبت‌شده پس از ورود به حساب، در بخش سفارش‌های من نمایش داده می‌شوند. سفارش آزمایشی مرورگر، سفارش واقعی محسوب نمی‌شود و در حساب کاربری ثبت نخواهد شد.", href: "/account/orders", action: "مشاهده سفارش‌های حساب" },
  { title: "آیا همه کالاها آماده خرید واقعی هستند؟", body: "وضعیت هر کالا در صفحه محصول مشخص می‌شود. کالاهای نمونه یا مرجع صرفاً برای بررسی رابط کاربری هستند و قیمت مرجع آن‌ها قیمت فروش قطعی سوکار نیست.", href: "/store/shop", action: "مرور کاتالوگ" },
  { title: "خرید اعتباری چگونه انجام می‌شود؟", body: "شرایط اعتبار به طرح فعال، احراز شرایط و نتیجه بررسی درخواست بستگی دارد. نمایش یک طرح به معنی تأیید خودکار اعتبار نیست.", href: "/pay", action: "مشاهده خدمات اعتباری" },
  { title: "چطور درخواست مرجوعی ثبت کنم؟", body: "شرایط بازگشت به نوع کالا، فروشنده، وضعیت سفارش و سیاست معتبر خرید بستگی دارد. اطلاعات ثبت‌شده سفارش را پیش از ارسال درخواست آماده کنید.", href: "/store/returns", action: "شرایط بازگشت کالا" }
];

export default function StoreFaq() {
  return <StoreInfoPage eyebrow="راهنمای مشتریان" title="پرسش‌های متداول" description="پاسخ روشن درباره سفارش، کاتالوگ، خرید اعتباری و بازگشت کالا. وضعیت نمونه‌های آزمایشی هم شفاف اعلام شده تا با سفارش واقعی اشتباه نشوند.">
    <div className="plan-grid">{questions.map((question, index) => <article key={question.title}><span className="sk-info-eyebrow">پرسش {String(index + 1).padStart(2, "0")}</span><h2>{question.title}</h2><p>{question.body}</p><Link className="sk-info-inline-link" href={question.href}>{question.action} ←</Link></article>)}</div>
    <article><h2>هنوز پاسخ موردنظرتان را پیدا نکرده‌اید؟</h2><p>از مسیر حساب کاربری وارد سامانه شوید تا فقط کانال‌های پشتیبانی فعال و متصل به حساب در دسترس باشند.</p><div className="store-actions"><Link href="/login">ورود به حساب</Link><Link href="/store/terms" className="secondary">مطالعه قوانین</Link></div></article>
  </StoreInfoPage>;
}
