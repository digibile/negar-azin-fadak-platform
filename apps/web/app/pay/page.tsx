import Link from "next/link";

const plans=[
 {name:"اعتبار خرید",desc:"برای خرید از فروشگاه و پذیرندگان منتخب",cta:"بررسی شرایط"},
 {name:"وام خرید",desc:"تسهیلات خرید با برنامه بازپرداخت",cta:"درخواست تسهیلات"},
 {name:"KalaPack",desc:"اعتبار خرید بدون اجبار به ایجاد وام در همه طرح‌ها",cta:"مشاهده طرح"},
 {name:"کارت و اعتبار گردشی",desc:"سقف اعتبار قابل مصرف برای خریدهای متعدد",cta:"جزئیات اعتبار"}
];

export default function PayPage(){
 return <main className="sookar-pay" dir="rtl">
  <header className="pay-header"><Link href="/store" className="pay-logo"><b>سوکار</b><span>Sookar Pay</span></Link><nav><Link href="/store">فروشگاه</Link><Link href="/marketplace">مارکت‌پلیس</Link><Link href="/pay">اعتبار و تسهیلات</Link><Link href="/login">ورود</Link></nav></header>
  <section className="pay-hero"><div><span>پرداخت و اعتبار هوشمند</span><h1>خرید امروز، مدیریت مالی شفاف‌تر</h1><p>طرح مالی متناسب با نیازت را انتخاب کن، شرایط را ببین و درخواست را از داخل سوکار ثبت کن.</p><div className="pay-actions"><Link href="/pay/apply">ثبت درخواست</Link><Link href="/pay/plans" className="secondary">مشاهده طرح‌ها</Link></div></div><div className="pay-orbit"><b>اعتبار</b><span>سقف اعتبار</span><strong>قابل استفاده در خرید</strong><small>تمام رویدادها در دفتر اعتبار ثبت می‌شوند.</small></div></section>
  <section className="pay-section"><header><span>محصولات مالی</span><h2>طرح مناسب خودت را پیدا کن</h2></header><div className="plan-grid">{plans.map(p=><article key={p.name}><span>محصول مالی</span><h3>{p.name}</h3><p>{p.desc}</p><Link href="/pay/plans">{p.cta} ←</Link></article>)}</div></section>
  <section className="pay-flow"><span>فرآیند شفاف</span><h2>از درخواست تا خرید</h2><div>{["ثبت درخواست","احراز هویت و بررسی","تصمیم اعتباری","قرارداد","ایجاد اعتبار یا پرداخت","خرید و بازپرداخت"].map((x,i)=><article key={x}><b>{String(i+1).padStart(2,"0")}</b><strong>{x}</strong></article>)}</div></section>
  <footer className="pay-footer"><Link href="/store">بازگشت به فروشگاه</Link><Link href="/pay/faq">پرسش‌های متداول</Link><Link href="/pay/terms">شرایط و قوانین</Link><Link href="/pay/support">پشتیبانی</Link></footer>
 </main>
}