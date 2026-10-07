import type { Metadata } from "next";
import Link from "next/link";

type Product={id:string;sku:string;title:string;description:string|null;category:string|null;price:string;currency:string;seller_name:string;store_id:string|null};
type BuyingOptions={cash:{amount:number;currency:string;source:string;marketLowest:number|null};financingPrograms:Array<{id:string;title:string;rate_percent:string;fixed_fee:string;approval_business_days_min:number;approval_business_days_max:number;min_term_months:number|null;max_term_months:number|null;brand_title:string|null;supplier_name:string}>;deliveryMethods:Array<{id:string;title:string;carrier_type:string;business_days_min:number;business_days_max:number;cost:number}>};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://negarzinfadak.ir";

async function getProduct(slug:string):Promise<Product|null>{
  try{
    const r=await fetch(`${process.env.API_INTERNAL_URL||"http://api:4000"}/api/public/marketplace`,{cache:"no-store"});
    const b=await r.json();
    if(!r.ok)return null;
    return (b.products||[]).find((p:Product)=>p.id===slug||p.sku===slug)||null;
  }catch{return null;}
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const product=await getProduct(slug);
  if(!product)return {title:"محصول پیدا نشد",robots:{index:false,follow:false}};
  const description=product.description||`مشاهده ${product.title} در فروشگاه اینترنتی سوکار و بررسی گزینه‌های خرید و اعتبار.`;
  return {
    title: product.title,
    description,
    alternates:{canonical:`/store/product/${encodeURIComponent(product.sku||product.id)}`},
    openGraph:{type:"website",title:product.title,description,url:`${siteUrl}/store/product/${encodeURIComponent(product.sku||product.id)}`}
  };
}

async function getBuyingOptions(id:string):Promise<BuyingOptions|null>{
 try{
  const r=await fetch(`${process.env.API_INTERNAL_URL||"http://api:4000"}/api/public/products/${encodeURIComponent(id)}/buying-options`,{cache:"no-store"});
  if(!r.ok)return null;return await r.json();
 }catch{return null}
}
export default async function Product({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const product=await getProduct(slug);
 if(!product)return <main className="sookar-store" dir="rtl"><section className="store-section"><div className="product-card"><h2>محصول پیدا نشد</h2><p>این محصول در کاتالوگ عمومی سامانه فعال نیست.</p><Link href="/store/shop">بازگشت به کاتالوگ</Link></div></section></main>;
 const options=await getBuyingOptions(product.id);
 const cashPrice=options?.cash.amount??Number(product.price);
 const jsonLd={
   "@context":"https://schema.org",
   "@type":"Product",
   name:product.title,
   description:product.description||undefined,
   sku:product.sku,
   category:product.category||undefined,
   brand:{ "@type":"Brand", name:"سوکار" },
   offers:{
     "@type":"Offer",
     url:`${siteUrl}/store/product/${encodeURIComponent(product.sku||product.id)}`,
     priceCurrency:product.currency,
     price:String(cashPrice),
     availability:"https://schema.org/InStock"
   }
 };
 return <main className="sookar-store" dir="rtl">
   <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}} />
   <header className="store-header"><Link href="/store" className="store-logo"><b>سوکار</b><span>محصول</span></Link><Link href="/store/shop" className="store-search">بازگشت به فروشگاه</Link><nav><Link href="/store/cart">سبد خرید</Link><Link href="/pay">خرید اعتباری</Link></nav></header>
   <section className="store-hero"><div><span>{product.category||"محصول"} / {product.sku}</span><h1>{product.title}</h1><p>{product.description||"توضیحات محصول توسط فروشنده ثبت نشده است."}</p><div className="store-actions"><Link href={"/store/product/"+encodeURIComponent(product.id)}>افزودن به سبد</Link><Link href="/pay" className="secondary">خرید اعتباری</Link></div></div><div className="hero-card"><b>قیمت نقدی</b><strong>{cashPrice.toLocaleString("fa-IR")} {product.currency}</strong>{options&&options.cash.marketLowest!==null&&<small>کمترین قیمت تأییدشده بازار: {Number(options.cash.marketLowest).toLocaleString("fa-IR")} {product.currency}</small>}<small>فروشنده: {product.seller_name||"ثبت‌شده در کاتالوگ"}</small></div></section>
   <section className="store-section feature-row"><article><b>کد کالا</b><span>{product.sku}</span></article><article><b>دسته‌بندی</b><span>{product.category||"ثبت نشده"}</span></article><article><b>فروشنده</b><span>{product.seller_name||"ثبت نشده"}</span></article><article><b>اعتبار خرید</b><span>از مسیر Sookar Pay</span></article></section>
 </main>;
}
