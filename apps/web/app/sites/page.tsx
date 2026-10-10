import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "مرکز مشاهده سایت‌ها | سوکار",
  description: "فهرست پیش‌نمایش‌های مستقل سایت‌ها و قالب‌های آماده در پروژه.",
  robots: { index: false, follow: false }
};

const sites = [
  { name: "سوکار", mark: "س", href: "/", category: "بازارگاه اصلی", color: "#f97316", description: "صفحه اصلی بازارگاه و تجربه فروشگاهی فعلی." },
  { name: "تکنولایف", mark: "ت", href: "/store/technolife", category: "فروشگاه کالای دیجیتال", color: "#f97316", description: "قالب تخصصی فناوری با ردیف‌های کالا و دسته‌بندی‌های دیجیتال." },
  { name: "دیجی‌بایل", mark: "د", href: "/store/digibile", category: "تجارت و بازارگاه", color: "#2563eb", description: "قالب مستقل بازارگاه چندفروشنده با کاتالوگ محصولات ثبت‌شده." },
  { name: "دیجی‌پی", mark: "پ", href: "/store/digipay", category: "پرداخت و خدمات مالی", color: "#155eef", description: "پیش‌نمایش خدمات پرداخت، اعتبار خرید و راهکارهای پذیرندگان؛ بدون شرایط مالی ساختگی." },
  { name: "وام‌سیتی", mark: "و", href: "/store/vamcity", category: "خدمات اعتباری", color: "#087f72", description: "پیش‌نمایش مسیر معرفی، درخواست و پیگیری خدمات اعتباری." },
  { name: "نگار آذین فدک", mark: "ن", href: "/store/naf", category: "پورتال سازمانی", color: "#2349a5", description: "قالب سازمانی برای معرفی پلتفرم‌ها، خدمات و فرایندهای سازمان." },
  { name: "کیپا", mark: "ک", href: "/store/kipa", category: "بازارگاه هوشمند", color: "#6d28d9", description: "قالب فروشگاهی مستقل با طراحی واکنش‌گرا و کاتالوگ متصل." }
];

export default function SitesDirectoryPage() {
  return (
    <main dir="rtl" className="sites-directory">
      <style>{`
        .sites-directory{min-height:100vh;background:#f5f7fb;color:#172033;font-family:Vazirmatn,IRANSansX,system-ui,sans-serif;padding:36px 0 64px}
        .sites-directory *{box-sizing:border-box}.sites-wrap{width:min(1180px,calc(100% - 32px));margin:auto}
        .sites-top{display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:28px}
        .sites-brand{display:flex;align-items:center;gap:12px}.sites-logo{display:grid;place-items:center;width:46px;height:46px;border-radius:15px;background:#172033;color:white;font-size:23px;font-weight:900}
        .sites-brand b{display:block;font-size:17px}.sites-brand small{display:block;color:#64748b;margin-top:4px;font-size:12px}
        .sites-home{display:inline-flex;align-items:center;justify-content:center;padding:11px 16px;border:1px solid #dce3ed;border-radius:12px;background:#fff;color:#172033;text-decoration:none;font-size:13px;font-weight:700}
        .sites-hero{background:linear-gradient(120deg,#172033,#253c62);color:white;border-radius:24px;padding:clamp(24px,5vw,52px);margin-bottom:24px;position:relative;overflow:hidden}
        .sites-hero:after{content:"";position:absolute;width:250px;height:250px;border-radius:50%;border:42px solid #ffffff12;left:-65px;top:-95px}
        .sites-kicker{font-size:12px;color:#c8d7f1;font-weight:800}.sites-hero h1{font-size:clamp(25px,4vw,42px);line-height:1.5;margin:12px 0 10px;max-width:760px}
        .sites-hero p{font-size:14px;line-height:2;color:#d7e1f0;max-width:760px;margin:0}
        .sites-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
        .site-card{background:white;border:1px solid #e2e8f0;border-radius:20px;padding:20px;min-height:220px;display:flex;flex-direction:column;box-shadow:0 5px 18px #17203308}
        .site-card-head{display:flex;align-items:center;gap:12px;margin-bottom:18px}.site-mark{width:48px;height:48px;display:grid;place-items:center;border-radius:16px;color:white;font-size:23px;font-weight:900;flex:none}
        .site-name{font-size:18px;font-weight:900}.site-category{font-size:11px;color:#64748b;margin-top:4px}.site-card p{font-size:13px;line-height:1.9;color:#526176;margin:0 0 20px}
        .site-open{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:10px;border-radius:12px;padding:12px 14px;background:#f5f7fb;color:#172033;text-decoration:none;font-size:13px;font-weight:800}
        .site-open span{color:#64748b}.sites-note{margin-top:22px;border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;background:#fff;color:#526176;font-size:12px;line-height:2}
        @media(max-width:900px){.sites-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:560px){.sites-directory{padding-top:20px}.sites-grid{grid-template-columns:1fr;gap:12px}.site-card{min-height:0;padding:17px}.sites-hero{border-radius:18px}.sites-top{margin-bottom:18px}}
      `}</style>
      <div className="sites-wrap">
        <header className="sites-top">
          <div className="sites-brand"><span className="sites-logo">س</span><div><b>مرکز مشاهده سایت‌ها</b><small>پیش‌نمایش‌های پروژه نگار آذین فدک</small></div></div>
          <Link className="sites-home" href="/">بازگشت به سایت اصلی ←</Link>
        </header>
        <section className="sites-hero">
          <span className="sites-kicker">SITE LAUNCHPAD · فهرست قالب‌ها</span>
          <h1>همهٔ سایت‌های آمادهٔ مشاهده، در یک صفحه</h1>
          <p>هر کارت، پیش‌نمایش مستقل همان سایت را باز می‌کند. قالب‌ها هویت بصری جداگانه دارند؛ اطلاعات پرداخت، اعتبار، سفارش و محصولات واقعی فقط در صورت اتصال به سرویس مربوط نمایش داده می‌شوند.</p>
        </section>
        <section className="sites-grid" aria-label="فهرست سایت‌ها">
          {sites.map(site => (
            <article className="site-card" key={site.href}>
              <div className="site-card-head">
                <span className="site-mark" style={{ background: site.color }}>{site.mark}</span>
                <div><div className="site-name">{site.name}</div><div className="site-category">{site.category}</div></div>
              </div>
              <p>{site.description}</p>
              <Link className="site-open" href={site.href}>باز کردن پیش‌نمایش <span>←</span></Link>
            </article>
          ))}
        </section>
        <p className="sites-note">نکتهٔ انتشار: این نشانی‌ها فعلاً پیش‌نمایش‌های مستقل داخل دامنهٔ سوکار هستند. فعال‌سازی هرکدام روی دامنهٔ اختصاصی خودش به تنظیم DNS، گواهی HTTPS و مسیر استقرار همان دامنه نیاز دارد؛ این صفحه به‌تنهایی چنین دامنه‌هایی را ایجاد نمی‌کند.</p>
      </div>
    </main>
  );
}
