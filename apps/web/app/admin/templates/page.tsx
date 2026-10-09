import Link from "next/link";

const storefrontTemplates = [
  { key: "ava", title: "قالب فروشگاهی آوا", version: "نسخه ۱.۰", status: "پیش‌نمایش آماده", description: "قالب مستقل و اختصاصی با هویت آرام و پریمیوم، بنفش نیلی و سبزآبی ملایم، کارت‌های مینیمال، جستجو و کاتالوگ متصل به محصولات واقعی. بدون داده ساختگی و بدون تغییر قالب اصلی.", preview: "/store/ava", tone: "ava" },
  {
    key: "classic",
    title: "قالب کلاسیک سوکار",
    version: "نسخهٔ محفوظ‌شده",
    status: "نگهداری‌شده",
    description: "طرح قبلی فروشگاه حفظ شده تا برای مقایسه یا بازگشت استفاده شود؛ به قالب جدید تبدیل یا حذف نشده است.",
    preview: "/store/classic",
    tone: "classic"
  },
  {
    key: "digikala",
    title: "قالب فروشگاهی با الگوی دیجی‌کالا",
    version: "پیش‌نمایش مستقل",
    status: "آماده بررسی",
    description: "چیدمان فروشگاهی قرمز با جستجو، دسته‌بندی، محصولات واقعی و مسیرهای خرید. قالب متعلق به سوکار است و وابستگی رسمی به برند مرجع ندارد.",
    preview: "/store/digikala",
    tone: "red"
  },
  {
    key: "technolife",
    title: "قالب فروشگاه فناوری",
    version: "پیش‌نمایش مستقل",
    status: "آماده بررسی",
    description: "ظاهر متمایز با رنگ‌بندی فناوری و تمرکز روی محصولات دیجیتال ثبت‌شده. جزئیات ظاهری نهایی را پس از دریافت لینک مرجع تکنولایف دقیق می‌کنیم.",
    preview: "/store/technolife",
    tone: "tech"
  },
  {
    key: "current",
    title: "قالب فعلی سوکار",
    version: "نسخهٔ اصلی",
    status: "مسیر اصلی",
    description: "صفحه اصلی فعلی فروشگاه، بدون تغییر مسیر اصلی و همچنان در نشانی استاندارد سایت.",
    preview: "/store",
    tone: "current"
  }
];

const pageTemplates = ["صفحه دسته‌بندی", "صفحه محصول", "صفحه فروشنده", "کمپین", "جستجو", "سبد خرید", "تسویه‌حساب", "ورود و ثبت‌نام", "حساب کاربری", "صفحات قانونی"];

export default function Templates() {
  return <main dir="rtl" className="admin-shell">
    <section className="store-section">
      <span>مرکز مدیریت نگار آذین فدک · مدیریت ظاهر</span>
      <h1>مدیریت قالب‌ها</h1>
      <p>هر قالب مستقل نگهداری می‌شود. پیش‌نمایش را بررسی کنید؛ هیچ قالبی صرفاً با ساخت قالب جدید حذف یا جایگزین نمی‌شود.</p>
      <div className="plan-grid template-preview-grid">
        {storefrontTemplates.map(template => <article key={template.key} className={"template-preview template-preview--" + template.tone}>
          <div className="template-preview-top"><span>{template.version}</span><span>{template.status}</span></div>
          <h2>{template.title}</h2>
          <p>{template.description}</p>
          <div className="template-preview-actions">
            <Link href={template.preview}>مشاهده پیش‌نمایش ←</Link>
            {template.key === "classic" && <span>نسخهٔ قبلی حفظ شده</span>}
            {template.key === "technolife" && <span>قابل تطبیق با لینک مرجع</span>}
          </div>
        </article>)}
      </div>
    </section>
    <section className="store-section template-page-types">
      <header><div><span>قالب‌های قابل مدیریت</span><h2>ابزارهای ساخت و مدیریت</h2></div><Link href="/admin/editors">ویرایشگر عمومی ←</Link></header>
      <div className="plan-grid">
        <article><h3>قالب‌های فرم</h3><p>ساخت و نسخه‌بندی فرم‌ها، تنظیم اعتبارسنجی و سطح دسترسی، انتشار و بررسی ارسال‌های ثبت‌شده.</p><Link href="/modules/?code=14-form-builder">ورود به فرم‌ساز سازمانی ←</Link></article>
        <article><h3>قالب‌های صفحه</h3><p>ساخت صفحات و مدیریت بلوک‌های محتوایی از طریق صفحه‌ساز متصل به سامانه.</p><Link href="/modules/?code=16-page-builder">ورود به صفحه‌ساز ←</Link></article>
        <article><h3>قالب‌های منو</h3><p>مدیریت ساختار منو، زیرمنوها، مسیرها، ترتیب نمایش و دسترسی‌ها.</p><Link href="/modules/?code=15-menu-builder">ورود به منوساز ←</Link></article>
        <article><h3>بخش‌های فرانت‌اند</h3><p>مدیریت بخش‌های نمایشی و محتوای فرانت‌اند از پنل مرکزی.</p><Link href="/modules/?code=17-frontend-management">مدیریت بخش‌ها ←</Link></article>
      </div>
    </section>
    <style>{`
      .template-preview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .template-preview{display:flex;flex-direction:column;min-height:250px}
      .template-preview-top{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
      .template-preview-top span{padding:6px 9px;border-radius:7px;background:#f0f2f5;color:#586474;font-size:10px}
      .template-preview h2{font-size:18px;margin:18px 0 7px}
      .template-preview p{flex:1;line-height:2}
      .template-preview-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:18px;padding-top:14px;border-top:1px solid #e8ebef}
      .template-preview-actions a{font-weight:850}
      .template-preview-actions span{font-size:10px;color:#687585}
      .template-preview--red{border-top:4px solid #e5322b}
      .template-preview--tech{border-top:4px solid #f28c00}\n      .template-preview--ava{border-top:4px solid #635bdb}
      .template-preview--classic{border-top:4px solid #176d70}
      .template-preview--current{border-top:4px solid #344256}
      .template-page-types .plan-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      @media(max-width:760px){.template-preview-grid,.template-page-types .plan-grid{grid-template-columns:1fr}}
    `}</style>
  </main>;
}
