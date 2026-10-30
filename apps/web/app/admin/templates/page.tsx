import Link from "next/link";
import type { CSSProperties } from "react";

type TemplateEntry = {
  name: string;
  kind: string;
  description: string;
  route: string;
  status: "آماده پیش‌نمایش" | "قالب پایه";
  accent: string;
};

const templates: TemplateEntry[] = [
  {
    name: "دیجی‌بایل | بازارگاه حرفه‌ای",
    kind: "بازارگاه اختصاصی",
    description: "پیش‌نمایش مستقل قالب فروشگاهی دیجی‌بایل؛ راست‌چین و واکنش‌گرا. قیمت و موجودی این نسخه نمایشی نیستند و تا اتصال کاتالوگ زنده، به‌عنوان اطلاعات واقعی نمایش داده نمی‌شوند.",
    route: "/templates/digibile-marketplace/index.html",
    status: "آماده پیش‌نمایش",
    accent: "#2563eb"
  },
  {
    name: "دیجی‌بایل | بازارگاه حرفه‌ای",
    kind: "قالب اختصاصی دامنه",
    description: "قالب فروشگاهی دیجی‌بایل با رابط راست‌چین و واکنش‌گرا، جست‌وجو، دسته‌بندی، ویترین محصولات و اسلایدر. این ورودی برای پیش‌نمایش قالب است؛ فعال‌سازی روی دامنه فقط پس از انتشار مستقل digibile.ir انجام می‌شود.",
    route: "/store/digibile-marketplace-preview",
    status: "آماده پیش‌نمایش",
    accent: "#0f9f9a"
  },
  {
    name: "قالب پایه کلاسیک",
    kind: "قالب اولیه",
    description: "نسخه اولیه فروشگاه برای حفظ مرجع، مقایسه و بازگشت امن؛ حذف یا جایگزین نشده است.",
    route: "/store/classic",
    status: "قالب پایه",
    accent: "#475569"
  },
  {
    name: "فروشگاه KIPA",
    kind: "فروشگاهی",
    description: "قالب اختصاصی KIPA با چیدمان راست‌چین و اتصال به کاتالوگ واقعی بازارگاه.",
    route: "/store/kipa",
    status: "آماده پیش‌نمایش",
    accent: "#0f766e"
  },
  {
    name: "بازارگاه حرفه‌ای نگار آذین فدک",
    kind: "بازارگاه یکپارچه",
    description: "پیش‌نمایش مستقل بازارگاه با رابط واکنش‌گرا، کاتالوگ زنده، جست‌وجو، دسته‌بندی، سبد خرید و اطلاعات واقعی محصولات پروژه.",
    route: "/store/marketplace-preview",
    status: "آماده پیش‌نمایش",
    accent: "#0f766e"
  },
  {
    name: "فروشگاه اصلی",
    kind: "فروشگاهی",
    description: "قالب عمومی فروشگاه با جست‌وجو، دسته‌بندی و نمایش محصولات ثبت‌شده.",
    route: "/store",
    status: "آماده پیش‌نمایش",
    accent: "#2563eb"
  },
  {
    name: "فروشگاه آوا",
    kind: "فروشگاهی",
    description: "چیدمان مینیمال فروشگاهی برای برند آوا، متصل به همان کاتالوگ محصول.",
    route: "/store/ava",
    status: "آماده پیش‌نمایش",
    accent: "#7c3aed"
  },
  {
    name: "فروشگاه فناوری",
    kind: "فروشگاهی تخصصی",
    description: "نمای فروشگاهی کالای دیجیتال و فناوری با داده‌های کاتالوگ مشترک.",
    route: "/store/technolife",
    status: "آماده پیش‌نمایش",
    accent: "#0369a1"
  },
  {
    name: "قالب فروشگاهی قرمز",
    kind: "فروشگاهی",
    description: "طرح جایگزین فروشگاهی برای مقایسه تجربه خرید؛ بدون وابستگی رسمی به برند ثالث.",
    route: "/store/digikala",
    status: "آماده پیش‌نمایش",
    accent: "#dc2626"
  },
  {
    name: "بازار خودرو | خرید و فروش",
    kind: "بازارگاه خودرو",
    description: "قالب راست‌چین و واکنش‌گرا برای جست‌وجوی خودرو و مسیرهای خرید نقدی، اقساطی و خدمات.",
    route: "/store/auto",
    status: "آماده پیش‌نمایش",
    accent: "#e6a64b"
  },
  {
    name: "خرید اقساطی خودرو",
    kind: "تأمین مالی خودرو",
    description: "صفحه مستقل مراحل، مدارک و شرایط خرید اقساطی با تأکید بر دریافت ارقام از سرویس مالی تأییدشده.",
    route: "/store/auto/installments",
    status: "آماده پیش‌نمایش",
    accent: "#14a38b"
  },
  {
    name: "تعویض و معاوضه خودرو",
    kind: "تعویض خودرو",
    description: "مسیر ثبت مشخصات، کارشناسی و درخواست معاوضه؛ ارزش نهایی به تأیید کارشناسی وابسته است.",
    route: "/store/auto/trade-in",
    status: "آماده پیش‌نمایش",
    accent: "#d5a34b"
  },
  {
    name: "مرکز خدمات EFI",
    kind: "خدمات فنی خودرو",
    description: "صفحه خدمات عیب‌یابی EFI، معرفی مراحل بررسی و درخواست نوبت مرکز خدمات.",
    route: "/store/auto/efi",
    status: "آماده پیش‌نمایش",
    accent: "#36a3a1"
  }
];

const products = [
  {
    name: "لندتک و اعتبارات",
    description: "درخواست اعتبار، ارزیابی، تصمیم اعتباری، قرارداد، پرداخت تسهیلات و پیگیری پرونده‌ها.",
    route: "/admin/lendtech",
    label: "مرکز عملیات",
    accent: "#0f766e"
  },
  {
    name: "درگاه پرداخت و اقساط",
    description: "صفحات درخواست، اعتبار، اقساط و بازپرداخت در مسیر محصول پرداخت.",
    route: "/pay",
    label: "محیط محصول",
    accent: "#7c3aed"
  },
  {
    name: "صفحه‌ساز و مدیریت رابط",
    description: "مسیر مرکزی ساخت صفحات و مدیریت رابط کاربری؛ محل توسعه و اتصال قالب‌های بعدی.",
    route: "/modules/?code=16-page-builder&panel=frontend",
    label: "مدیریت رابط",
    accent: "#2563eb"
  }
];

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 20,
  border: "1px solid var(--border, #e2e8f0)",
  borderRadius: 18,
  background: "var(--surface, #fff)",
  minWidth: 0
};

const actionStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "9px 14px",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 700,
  border: "1px solid var(--border, #cbd5e1)",
  color: "var(--foreground, #0f172a)",
  width: "fit-content"
};

export default function Templates() {
  return (
    <main dir="rtl" style={{ maxWidth: 1440, margin: "0 auto", padding: "clamp(16px, 3vw, 32px)", color: "var(--foreground, #0f172a)" }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 18, marginBottom: 28 }}>
        <div style={{ maxWidth: 820 }}>
          <p style={{ margin: "0 0 8px", color: "var(--muted-foreground, #64748b)", fontWeight: 700, letterSpacing: ".02em" }}>مرکز مدیریت نگار آذین فدک</p>
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(25px, 3vw, 36px)", lineHeight: 1.4 }}>کتابخانه مرکزی قالب‌ها</h1>
          <p style={{ margin: 0, lineHeight: 1.9, color: "var(--muted-foreground, #64748b)" }}>
            قالب‌های فروشگاه در یک فهرست واحد جمع شده‌اند. قالب پایه حفظ شده و هر مورد از مسیر مشخص خودش پیش‌نمایش می‌شود؛ کپی‌های موازی و مسیرهای مبهم لازم نیستند.
          </p>
        </div>
        <Link href="/admin" style={actionStyle}>بازگشت به مرکز مدیریت</Link>
      </header>

      <section aria-labelledby="lending-templates-title" style={{ marginBottom: 34 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div><h2 id="lending-templates-title" style={{ margin: "0 0 6px", fontSize: 22 }}>قالب‌های لندتک و اعتباردهی</h2><p style={{ margin: 0, color: "var(--muted-foreground, #64748b)", lineHeight: 1.8 }}>قالب مستقل صفحه اصلی خدمات وام، اعتبار و خرید اقساطی سوکار؛ بدون تغییر قالب فروشگاه و کاتالوگ محصولات.</p></div>
          <span style={{ fontSize: 13, color: "#087cf0", fontWeight: 800 }}>۱ قالب آماده پیش‌نمایش</span>
        </div>
        <article style={{ ...cardStyle, borderColor: "#bfdbfe", background: "linear-gradient(135deg, #ffffff, #f1f7ff)", padding: 14 }}>
          <div style={{ overflow: "hidden", border: "1px solid #d8e8fb", borderRadius: 14, background: "#071f43" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "#fff", color: "#17365e", fontSize: 11, fontWeight: 800 }}>
              <span>سوکار <span style={{ color: "#1769e8" }}>●</span></span>
              <span style={{ color: "#71839d" }}>طرح‌های اعتباری　 محاسبه‌گر　 راهنما</span>
              <span style={{ padding: "5px 9px", borderRadius: 8, background: "#1769e8", color: "#fff" }}>ورود</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 12, padding: "18px 16px", background: "radial-gradient(circle at 10% 20%,#1769e855,transparent 35%),linear-gradient(120deg,#061b39,#0b3568)", color: "#fff", minHeight: 155 }}>
              <div>
                <div style={{ color: "#a9eaff", fontSize: 9, marginBottom: 8 }}>راهکار هوشمند خرید اعتباری</div>
                <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.7 }}>امروز انتخاب کن،<br/><span style={{ color: "#54d8f2" }}>آسان و اقساطی</span> پرداخت کن.</div>
                <div style={{ marginTop: 9, fontSize: 9, color: "#c8d9ef" }}>طرح‌های متنوع اعتبار و خرید اقساطی</div>
              </div>
              <div style={{ alignSelf: "center", padding: 12, borderRadius: 12, background: "#fff", color: "#17365e", boxShadow: "0 8px 25px #00132c55" }}>
                <div style={{ fontSize: 10, fontWeight: 900 }}>برآورد درخواست اعتبار</div>
                <div style={{ marginTop: 10, padding: 8, border: "1px solid #e5edf7", borderRadius: 7, fontSize: 9, color: "#71839d" }}>مبلغ موردنیاز　　۳۰,۰۰۰,۰۰۰ تومان</div>
                <div style={{ marginTop: 8, padding: 8, borderRadius: 7, background: "#edf5ff", color: "#1769e8", fontSize: 9 }}>شرایط نهایی پس از انتخاب طرح</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, padding: 9, background: "#fff" }}>
              {["لوازم خانگی","موبایل و تبلت","تجهیزات هوشمند","خودرو"].map((label) => <div key={label} style={{ textAlign: "center", padding: "8px 3px", borderRadius: 7, background: "#f1f6fc", color: "#345477", fontSize: 9, fontWeight: 800 }}>{label}</div>)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span aria-hidden="true" style={{ width: 12, height: 48, borderRadius: 8, background: "linear-gradient(180deg,#16a5ff,#0756c9)", flexShrink: 0 }} />
            <div><p style={{ margin: "0 0 3px", fontSize: 12, color: "#087cf0" }}>لندتک · وام · خرید اعتباری و اقساطی</p><h3 style={{ margin: 0, fontSize: 19 }}>سوکار | خرید آسان، اقساطی مطمئن</h3></div>
          </div>
          <p style={{ margin: 0, lineHeight: 1.9, color: "var(--muted-foreground, #64748b)" }}>صفحه اصلی مستقل با هدر، بنر خدمات اعتباری، پنل درخواست و محاسبه اقساط، کارت طرح‌های وام، مزایا، مراحل دریافت اعتبار و فوتر. ارقام بازپرداخت تا اتصال به شرایط رسمی هر طرح محاسبه یا اعلام نمی‌شوند.</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#087cf0" }}>آماده پیش‌نمایش · نسخه مستقل</span>
            <Link href="/templates/sookar-lendtech/index.html" target="_blank" rel="noreferrer" style={{ ...actionStyle, borderColor: "#087cf0", color: "#0756c9" }}>مشاهده قالب لندتک ↗</Link>
          </div>
          <code dir="ltr" style={{ display: "block", overflowWrap: "anywhere", fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>/templates/sookar-lendtech/index.html</code>
        </article>
      </section>

      <section aria-labelledby="store-templates-title" style={{ marginBottom: 34 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <h2 id="store-templates-title" style={{ margin: 0, fontSize: 22 }}>قالب‌های فروشگاهی</h2>
          <span style={{ fontSize: 13, color: "var(--muted-foreground, #64748b)" }}>{templates.length} قالب ثبت‌شده</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 1fr))", gap: 16 }}>
          {templates.map((item) => (
            <article key={item.route} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span aria-hidden="true" style={{ width: 12, height: 42, borderRadius: 8, background: item.accent, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: "0 0 3px", fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>{item.kind}</p>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{item.name}</h3>
                </div>
              </div>
              <p style={{ margin: 0, lineHeight: 1.9, color: "var(--muted-foreground, #64748b)", flex: 1 }}>{item.description}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: item.accent }}>{item.status}</span>
                <Link href={item.route} target="_blank" rel="noreferrer" style={{ ...actionStyle, borderColor: item.accent }}>مشاهده پیش‌نمایش ↗</Link>
              </div>
              <code dir="ltr" style={{ display: "block", overflowWrap: "anywhere", fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>{item.route}</code>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="product-workspaces-title">
        <div style={{ marginBottom: 16 }}>
          <h2 id="product-workspaces-title" style={{ margin: "0 0 6px", fontSize: 22 }}>محیط‌های متصل به همین سامانه</h2>
          <p style={{ margin: 0, lineHeight: 1.8, color: "var(--muted-foreground, #64748b)" }}>
            لندتک و پرداخت به‌عنوان محیط‌های محصول در همین فهرست مرکزی در دسترس‌اند؛ آن‌ها به‌اشتباه به‌عنوان قالب فروشگاه معرفی نمی‌شوند.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 1fr))", gap: 16 }}>
          {products.map((item) => (
            <article key={item.route} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span aria-hidden="true" style={{ width: 12, height: 42, borderRadius: 8, background: item.accent, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: "0 0 3px", fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>{item.label}</p>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{item.name}</h3>
                </div>
              </div>
              <p style={{ margin: 0, lineHeight: 1.9, color: "var(--muted-foreground, #64748b)", flex: 1 }}>{item.description}</p>
              <Link href={item.route} style={{ ...actionStyle, borderColor: item.accent }}>ورود به محیط ↗</Link>
              <code dir="ltr" style={{ display: "block", overflowWrap: "anywhere", fontSize: 12, color: "var(--muted-foreground, #64748b)" }}>{item.route}</code>
            </article>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: 28, padding: 16, borderRadius: 14, background: "var(--muted, #f8fafc)", lineHeight: 1.9, fontSize: 13, color: "var(--muted-foreground, #64748b)" }}>
        قالب دیجی‌بایل در این کتابخانه برای پیش‌نمایش ثبت شده است. ثبت در کتابخانه به معنی انتشار روی دامنه یا فعال‌سازی قالب اصلی نیست؛ انتشار دامنه‌ای باید مستقل روی digibile.ir انجام شود و نباید تنظیمات سوکار را تغییر دهد.
      </footer>
    </main>
  );
}
