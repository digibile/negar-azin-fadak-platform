import "./styles.css";
import Link from "next/link";

const categories=["کالای دیجیتال","خانه و آشپزخانه","مد و پوشاک","زیبایی و سلامت","ابزار و تجهیزات","سوپرمارکت"];
const products=[
 {title:"محصول منتخب فروشگاه",price:"۱۲٬۴۹۰٬۰۰۰",tag:"پیشنهاد ویژه"},
 {title:"محصول پرفروش",price:"۸٬۹۹۰٬۰۰۰",tag:"پرفروش"},
 {title:"محصول جدید",price:"۵٬۷۵۰٬۰۰۰",tag:"جدید"},
 {title:"خرید اعتباری",price:"از ۱٬۲۰۰٬۰۰۰",tag:"اعتباری"}
];

export default function StorePage(){
 return <main className="sookar-store" dir="rtl">
  <header className="store-header">
   <Link href="/store" className="store-logo"><b>سوکار</b><span>فروشگاه هوشمند</span></Link>
   <div className="store-search">جستجو در محصولات، برندها و فروشندگان...</div>
   <nav><Link href="/store">فروشگاه</Link><Link href="/marketplace">مارکت‌پلیس</Link><Link href="/pay">Sookar Pay</Link><Link href="/login">ورود</Link><Link href="/store/cart">سبد خرید</Link></nav>
  </header>
  <div className="store-category-bar">{categories.map(c=><span key={c}>{c}</span>)}</div>
  <section className="store-hero">
   <div><span>خرید هوشمند، پرداخت هوشمند</span><h1>فروشگاه اینترنتی سوکار</h1><p>کالا، فروشنده، اعتبار و پرداخت در یک تجربه یکپارچه.</p><div className="store-actions"><Link href="/store/shop">مشاهده فروشگاه</Link><Link href="/pay" className="secondary">خرید با اعتبار</Link></div></div>
   <div className="hero-card"><b>اعتبار خرید</b><strong>تا سقف اعتبار اختصاصی</strong><small>شرایط طرح‌های مالی را ببینید</small><Link href="/pay/plans">مشاهده طرح‌ها ←</Link></div>
  </section>
  <section className="store-section"><header><div><span>منتخب سوکار</span><h2>پیشنهادهای ویژه</h2></div><Link href="/store/offers">همه پیشنهادها</Link></header><div className="product-grid">{products.map(p=><article className="product-card" key={p.title}><div className="product-image"><span>{p.tag}</span><b>سوکار</b></div><h3>{p.title}</h3><p>اطلاعات محصول، فروشنده و شرایط خرید در صفحه محصول نمایش داده می‌شود.</p><strong>{p.price} تومان</strong><Link href="/store/product/selected">مشاهده محصول</Link></article>)}</div></section>
  <section className="store-section feature-row">{["فروشندگان تأییدشده","ارسال و پیگیری سفارش","خرید اعتباری","پشتیبانی و ارتباطات"].map(x=><article key={x}><b>{x}</b><span>سرویس یکپارچه سوکار</span></article>)}</section>
  <footer className="store-footer"><div><b>سوکار</b><p>فروشگاه، مارکت‌پلیس و خدمات مالی در یک اکوسیستم.</p></div><div><Link href="/store">فروشگاه</Link><Link href="/marketplace">مارکت‌پلیس</Link><Link href="/pay">Sookar Pay</Link><Link href="/pay/plans">طرح‌های اعتباری</Link></div><div><Link href="/store/orders">پیگیری سفارش</Link><Link href="/store/returns">مرجوعی</Link><Link href="/store/faq">پرسش‌های متداول</Link><Link href="/store/terms">قوانین</Link></div></footer>
 </main>
}