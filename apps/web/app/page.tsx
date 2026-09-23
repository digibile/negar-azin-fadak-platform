const sections = [
  "سازمان و ساختار",
  "مالی و حسابداری",
  "اعتبار",
  "تجارت",
  "مدیریت کاربران و دسترسی",
  "مدیریت قالب",
  "مدیریت منو",
  "مدیریت Frontend"
];

export default function HomePage() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">ن</span>
          <div><strong>نگار آذین فدک</strong><small>مرکز مدیریت</small></div>
        </div>
        <nav aria-label="منوی مرکزی سازمان">
          {sections.map((section, index) => (
            <div className={index === 0 ? "nav-item active" : "nav-item"} key={section}>
              <span className="nav-icon">{index + 1}</span><span>{section}</span>
            </div>
          ))}
        </nav>
      </aside>
      <section className="content">
        <header className="topbar">
          <div><span className="eyebrow">منوی مرکزی سازمان</span><h1>مرکز مدیریت نگار آذین فدک</h1></div>
          <div className="status">نسخه پایه رابط کاربری</div>
        </header>
        <section className="hero">
          <span className="eyebrow">پلتفرم بیزینس نگار آذین فدک ایران</span>
          <h2>مدیریت یکپارچه کسب‌وکار</h2>
          <p>این محیط، پایه رابط کاربری سامانه است و در مراحل بعد به سرویس‌های واقعی سازمان، دسترسی‌ها و داده‌های عملیاتی متصل خواهد شد.</p>
        </section>
        <section className="cards">
          {sections.slice(0, 4).map((section) => (
            <article className="card" key={section}>
              <span className="card-number">01</span><h3>{section}</h3>
              <p>ساختار این بخش برای اتصال به قابلیت‌های واقعی سامانه آماده می‌شود.</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
