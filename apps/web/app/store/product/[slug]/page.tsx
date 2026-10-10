import type { Metadata } from "next";
import Link from "next/link";
import { AddToCartButton } from "../../cart-actions";

type Product={id:string;sku:string;title:string;description:string|null;category:string|null;price:string;currency:string;seller_name:string;store_id:string|null;image_url?:string|null;is_demo_product?:boolean;is_reference?:boolean;source_url?:string|null;attributes?:Record<string,unknown>|null};
type ProductSite="default"|"digibile"|"technolife"|"ava"|"kipa"|"digikala";
type SiteIdentity={name:string;mark:string;tagline:string;path:string;loginBrand:string;footer:string};
const productSites:Record<ProductSite,SiteIdentity>={
 default:{name:"سوکار",mark:"س",tagline:"فروشگاه و بازارگاه",path:"/store",loginBrand:"naf",footer:"کاتالوگ و قیمت‌ها از اطلاعات ثبت‌شدهٔ سامانه نمایش داده می‌شوند."},
 digibile:{name:"دیجی‌بایل",mark:"د",tagline:"بازارگاه تجارت دیجیتال",path:"/store/digibile",loginBrand:"digibile",footer:"بازارگاه چندفروشنده با کاتالوگ زنده و مسیر روشن سفارش."},
 technolife:{name:"تکنولایف",mark:"ت",tagline:"دنیای فناوری، یک‌جا",path:"/store/technolife",loginBrand:"technolife",footer:"مشخصات و قیمت فقط بر اساس اطلاعات ثبت‌شده در کاتالوگ."},
 ava:{name:"آوا",mark:"آ",tagline:"خرید آرام، انتخاب هوشمند",path:"/store/ava",loginBrand:"naf",footer:"قالب مینیمال برای مرور شفاف محصولات ثبت‌شده."},
 kipa:{name:"کیپا",mark:"ک",tagline:"انتخاب روشن، خرید مطمئن",path:"/store/kipa",loginBrand:"kipa",footer:"تجربه خرید با نمایش شفاف اطلاعات ثبت‌شده."},
 digikala:{name:"بازار قرمز",mark:"ب",tagline:"انتخاب بیشتر، خرید آسان‌تر",path:"/store/digikala",loginBrand:"digibile",footer:"پیش‌نمایش قالب فروشگاهی مستقل."}
};
const normalizeSite=(value:string|undefined):ProductSite=>value&&value in productSites?value as ProductSite:"default";
type BuyingOptions={cash:{amount:number;currency:string;source:string};financingPrograms:Array<{id:string;title:string;rate_percent:string;fixed_fee:string;approval_business_days_min:number;approval_business_days_max:number;min_term_months:number|null;max_term_months:number|null;brand_title:string|null;supplier_name:string}>;deliveryMethods:Array<{id:string;title:string;carrier_type:string;business_days_min:number;business_days_max:number;cost:number}>};

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_ORIGIN || "https://sookar.ir").replace(/\/$/, "");
const publicHost = new URL(siteUrl).host;

async function getProduct(slug:string):Promise<Product|null>{
  try{
    const r=await fetch(`${process.env.API_INTERNAL_URL||"http://api:4000"}/api/public/marketplace`,{cache:"no-store",headers:{host:publicHost,"x-forwarded-host":publicHost,"x-forwarded-proto":"https"}});
    const b=await r.json();
    if(!r.ok)return null;
    return (b.products||[]).find((p:Product)=>p.id===slug||p.sku===slug)||null;
  }catch{return null;}
}

export async function generateMetadata({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{site?:string}>}):Promise<Metadata>{
  const [{slug},query]=await Promise.all([params,searchParams]);
  const identity=productSites[normalizeSite(query.site)];
  const product=await getProduct(slug);
  if(!product)return {title:"محصول پیدا نشد",robots:{index:false,follow:false}};
  const description=product.description||`مشاهده ${product.title} در ${identity.name} و بررسی اطلاعات ثبت‌شدهٔ خرید و تحویل.`;
  return {
    title: product.title,
    description,
    alternates:{canonical:`/store/product/${encodeURIComponent(product.sku||product.id)}?site=${identity.path==="/store/digibile"?"digibile":identity.path==="/store/technolife"?"technolife":identity.path==="/store/ava"?"ava":identity.path==="/store/kipa"?"kipa":identity.path==="/store/digikala"?"digikala":"default"}`},
    openGraph:{type:"website",title:product.title,description,url:`${siteUrl}/store/product/${encodeURIComponent(product.sku||product.id)}?site=${normalizeSite(query.site)}`}
  };
}

async function getBuyingOptions(id:string):Promise<BuyingOptions|null>{
 try{
  const r=await fetch(`${process.env.API_INTERNAL_URL||"http://api:4000"}/api/public/products/${encodeURIComponent(id)}/buying-options`,{cache:"no-store"});
  if(!r.ok)return null;return await r.json();
 }catch{return null}
}
export default async function Product({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{site?:string}>}){
 const [{slug},query]=await Promise.all([params,searchParams]);
 const site=normalizeSite(query.site);
 const identity=productSites[site];
 const product=await getProduct(slug);
 if(!product)return <main className={"sookar-store sk-product-site--"+site} dir="rtl"><section className="store-section"><div className="product-card"><h2>محصول پیدا نشد</h2><p>این محصول در کاتالوگ عمومی سامانه فعال نیست.</p><Link href={identity.path}>بازگشت به {identity.name}</Link></div></section></main>;
 const options=await getBuyingOptions(product.id);
 const cashPrice=Number(product.price);
 const attributes=product.attributes||{};
 const gallery=Array.isArray(attributes.galleryImages)?attributes.galleryImages.filter((url):url is string=>typeof url==="string"&&(url.startsWith("https://")||(url.startsWith("/")&&!url.startsWith("//")))).slice(0,8):[];
 const images=[...new Set([product.image_url,...gallery].filter((url):url is string=>typeof url==="string"&&(url.startsWith("https://")||(url.startsWith("/")&&!url.startsWith("//")))) )].slice(0,9);
 const specifications=Array.isArray(attributes.specifications)?attributes.specifications as Array<{group?:string;items?:Array<{name?:string;values?:string[]}>}>:[];
 const jsonLd={
   "@context":"https://schema.org",
   "@type":"Product",
   name:product.title,
   description:product.description||undefined,
   sku:product.sku,
   category:product.category||undefined,
   brand:{ "@type":"Brand", name:identity.name },
   offers:{
     "@type":"Offer",
     url:`${siteUrl}/store/product/${encodeURIComponent(product.sku||product.id)}`,
     priceCurrency:product.currency,
     price:String(cashPrice)
   }
 };
 return <main className={"sookar-store sk-product-site--"+site} dir="rtl">
   <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}} />
   <header className="store-header"><Link href={identity.path} className="store-logo"><b>{identity.mark} {identity.name}</b><span>{identity.tagline}</span></Link><Link href={identity.path} className="store-search">بازگشت به {identity.name}</Link><nav><Link href="/store/cart">سبد خرید</Link><Link href={"/login?brand="+identity.loginBrand}>ورود به حساب</Link><Link href="/pay">خرید اعتباری</Link></nav></header>
   <section className="sk-product-detail">
     <div className="sk-product-detail-media">{images.length ? <><img className="sk-product-main-image" src={images[0]} alt={product.title} />{images.length>1&&<div className="sk-product-gallery-thumbs">{images.slice(1).map((image,index)=><a href={image} target="_blank" rel="noreferrer" key={image} aria-label={"نمایش تصویر "+(index+2)}><img src={image} alt={product.title+" - تصویر "+(index+2)} loading="lazy" /></a>)}</div>}</> : <div className="sk-product-detail-no-image">تصویر محصول ثبت نشده</div>}</div>
     <div className="sk-product-detail-copy"><span className="sk-product-breadcrumb"><Link href={identity.path}>خانه</Link> / <Link href={identity.path}>فروشگاه</Link> / {product.category||"محصول"}</span><h1>{product.title}</h1><p>{product.description||"توضیحات تکمیلی این محصول هنوز توسط فروشنده ثبت نشده است."}</p><div className="sk-product-seller-line"><span>فروشنده</span><strong>{product.seller_name||"فروشنده ثبت‌شده"}</strong></div><div className="sk-product-detail-price"><small>{product.is_demo_product ? "قیمت مرجع آزمایشی" : "قیمت ثبت‌شده"}</small><strong>{cashPrice.toLocaleString("fa-IR")} {product.currency}</strong></div>{product.is_demo_product && <div className="sk-product-demo-notice">این کالا در پایگاه دادهٔ سوکار ذخیره شده و برای آزمایش صفحه محصول و سبد خرید است. قیمت و موجودی از منبع مرجع گرفته شده‌اند و فروش/پرداخت واقعی فعال نیست. <a href={product.source_url||"https://www.digikala.com/"} target="_blank" rel="noreferrer">مشاهده منبع اطلاعات</a></div>}<div className="sk-product-detail-actions">{!product.is_reference && <AddToCartButton product={{id:product.id,sku:product.sku,title:product.title,price:String(cashPrice),currency:product.currency,seller_name:product.seller_name,store_id:product.store_id,image_url:product.image_url,is_demo_product:product.is_demo_product,source_url:product.source_url}}/>}{!product.is_demo_product && !product.is_reference && <Link href="/pay" className="sk-product-credit-link">بررسی خرید اعتباری</Link>}</div><small className="sk-product-truth-note">{product.is_demo_product ? "این مسیر برای تست داخلی است؛ سفارش نهایی و پرداخت واقعی غیرفعال‌اند." : product.is_reference ? "این فقط پیش‌نمایش مرجع است. برای استفاده در سبد خرید، ابتدا محصول را از مدیریت وارد پایگاه داده سوکار کنید." : "ثبت در سبد خرید، سفارش یا پرداخت را ایجاد نمی‌کند. موجودی و امکان سفارش در مرحله نهایی بررسی می‌شود."}</small></div>
   </section>
   {!product.is_demo_product&&options&&(options.financingPrograms.length>0||options.deliveryMethods.length>0)&&<section className="store-section sk-product-buying-options">
     <div className="sk-product-specs-head"><span>گزینه‌های واقعی سامانه</span><h2>روش‌های خرید و تحویل</h2><p>قیمت پایه از کاتالوگ داخلی شما می‌آید؛ گزینه‌های زیر فقط در صورت ثبت و فعال بودن در سامانه نمایش داده می‌شوند.</p></div>
     {options.financingPrograms.length>0&&<div className="sk-product-option-group"><h3>خرید اعتباری</h3><div className="sk-product-option-grid">{options.financingPrograms.map(program=><article key={program.id}><b>{program.title}</b><span>{program.min_term_months&&program.max_term_months?program.min_term_months+" تا "+program.max_term_months+" ماه":program.max_term_months?"تا "+program.max_term_months+" ماه":"مدت طبق طرح"}</span><small>کارمزد/نرخ ثبت‌شده: {program.rate_percent}%</small><small>بررسی درخواست: {program.approval_business_days_min} تا {program.approval_business_days_max} روز کاری</small></article>)}</div></div>}
     {options.deliveryMethods.length>0&&<div className="sk-product-option-group"><h3>روش‌های تحویل</h3><div className="sk-product-option-grid">{options.deliveryMethods.map(method=><article key={method.id}><b>{method.title}</b><span>{method.business_days_min} تا {method.business_days_max} روز کاری</span><small>هزینه ثبت‌شده: {method.cost.toLocaleString("fa-IR")} {product.currency}</small></article>)}</div></div>}
   </section>}
   <section className="store-section sk-product-specs"><div className="sk-product-specs-head"><span>اطلاعات ثبت‌شده</span><h2>مشخصات محصول</h2><p>مشخصات از اطلاعات موجود در کاتالوگ داخلی نمایش داده می‌شود؛ مورد ثبت‌نشده به‌صورت ساختگی تکمیل نمی‌شود.</p></div>{specifications.length ? specifications.map((group,index)=><article className="sk-product-spec-group" key={(group.group||"مشخصات")+"-"+index}><h3>{group.group||"مشخصات"}</h3><dl>{(group.items||[]).map((item,itemIndex)=><div key={(item.name||"ویژگی")+"-"+itemIndex}><dt>{item.name||"ویژگی"}</dt><dd>{Array.isArray(item.values)?item.values.join("، "):"ثبت نشده"}</dd></div>)}</dl></article>) : <div className="sk-product-spec-empty">مشخصات فنی تفصیلی برای این محصول هنوز در کاتالوگ ثبت نشده است.</div>}</section>
   <section className="store-section feature-row"><article><b>کد کالا</b><span>{product.sku}</span></article><article><b>دسته‌بندی</b><span>{product.category||"ثبت نشده"}</span></article><article><b>فروشنده</b><span>{product.seller_name||"ثبت نشده"}</span></article><article><b>اعتبار خرید</b><span>از مسیر خدمات اعتباری سامانه</span></article></section>
   <footer className="sk-product-footer"><div><Link href={identity.path} className="sk-product-footer-brand"><b>{identity.mark}</b><span><strong>{identity.name}</strong><small>{identity.tagline}</small></span></Link><p>{identity.footer}</p></div><nav><Link href={identity.path}>صفحه اصلی</Link><Link href="/store/cart">سبد خرید</Link><Link href={"/login?brand="+identity.loginBrand}>ورود و حساب کاربری</Link><Link href="/store/returns">مرجوعی و پشتیبانی</Link></nav><small>قیمت، موجودی و امکان سفارش باید در مرحله نهایی بررسی شوند.</small></footer>
 </main>;
}
