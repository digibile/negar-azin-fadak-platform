import Link from "next/link";

type Card={eyebrow:string;title:string;text:string;href?:string;label?:string};
type BusinessPageProps={kicker:string;title:string;intro:string;cards:Card[];cta:{label:string;href:string};navLabel:string};

export default function BusinessPage({kicker,title,intro,cards,cta,navLabel}:BusinessPageProps){
 return <main className="business-page" dir="rtl">
  <header className="business-nav">
   <Link href="/" className="business-brand"><span>ن</span><strong>نگار آذین فدک</strong></Link>
   <nav>
    <Link href="/marketing">بازاریابی</Link>
    <Link href="/sales">فروش</Link>
    <Link href="/company">شرکت</Link>
    <Link href="/import-trade">بازرگانی بین‌الملل</Link>
   </nav>
   <Link href={cta.href} className="business-nav-cta">{navLabel}</Link>
  </header>
  <section className="business-hero">
   <div className="business-hero-copy">
    <span className="business-kicker">{kicker}</span>
    <h1>{title}</h1>
    <p>{intro}</p>
    <div className="business-actions"><Link href={cta.href} className="business-primary">{cta.label}</Link><Link href="/company" className="business-secondary">شناخت نگار آذین فدک</Link></div>
   </div>
   <div className="business-hero-art" aria-hidden="true"><div className="business-orbit orbit-a"/><div className="business-orbit orbit-b"/><div className="business-core">NAF<span>IRAN</span></div></div>
  </section>
  <section className="business-grid">
   {cards.map((card,i)=><article className="business-card" key={card.title}><span>{String(i+1).padStart(2,"0")} · {card.eyebrow}</span><h2>{card.title}</h2><p>{card.text}</p>{card.href&&<Link href={card.href}>{card.label||"ورود به بخش"} <b>‹</b></Link>}</article>)}
  </section>
  <section className="business-bottom">
   <div><span className="business-kicker">هسته مرکزی کسب‌وکار</span><h2>یک مسیر یکپارچه از بازار تا عملیات</h2><p>ساختار این صفحات بر پایه مسیر واقعی کسب‌وکار طراحی شده است: جذب و بازاریابی، فروش و سفارش، تأمین و بازرگانی، پرداخت و تسویه، و مدیریت سازمانی.</p></div>
   <Link href={cta.href} className="business-primary">{cta.label}</Link>
  </section>
  <footer className="business-footer"><span>پلتفرم بیزینس نگار آذین فدک ایران</span><span>نگار آذین فدک · تهران · ایران</span></footer>
 </main>;
}
