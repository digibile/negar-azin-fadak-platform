import type { Metadata } from "next";
import Link from "next/link";
import { AddToCartButton, CartCount } from "../../cart-actions";
import ProductGallery from "./ProductGallery";
import "./digikala-product.css";

type Product={id:string;sku:string;title:string;description:string|null;category:string|null;price:string;currency:string;seller_name:string;store_id:string|null;image_url?:string|null;is_demo_product?:boolean;is_reference?:boolean;source_url?:string|null;attributes?:Record<string,unknown>|null};
type ProductSite="default"|"digibile"|"technolife"|"ava"|"kipa"|"digikala";
type SiteIdentity={name:string;mark:string;tagline:string;path:string;loginBrand:string;footer:string};
const productSites:Record<ProductSite,SiteIdentity>={
 default:{name:"سوکار",mark:"س",tagline:"فروشگاه و بازارگاه",path:"/store",loginBrand:"naf",footer:"اطلاعات محصول از کاتالوگ داخلی سوکار نمایش داده می‌شود."},
 digibile:{name:"دیجی‌بایل",mark:"د",tagline:"بازارگاه تجارت دیجیتال",path:"/store/digibile",loginBrand:"digibile",footer:"بازارگاه چندفروشنده با کاتالوگ زنده و مسیر روشن سفارش."},
 technolife:{name:"تکنولایف",mark:"ت",tagline:"دنیای فناوری، یک‌جا",path:"/store/technolife",loginBrand:"technolife",footer:"مشخصات و قیمت بر اساس اطلاعات ذخیره‌شده در کاتالوگ داخلی."},
 ava:{name:"آوا",mark:"آ",tagline:"خرید آرام، انتخاب هوشمند",path:"/store/ava",loginBrand:"naf",footer:"قالب مینیمال برای مرور شفاف محصولات ثبت‌شده."},
 kipa:{name:"کیپا",mark:"ک",tagline:"انتخاب روشن، خرید مطمئن",path:"/store/kipa",loginBrand:"kipa",footer:"تجربه خرید با نمایش شفاف اطلاعات ثبت‌شده."},
 digikala:{name:"دیجی‌کالا",mark:"دی",tagline:"قالب فروشگاهی با تجربه خرید آشنا",path:"/store/digikala",loginBrand:"digibile",footer:"قالب مستقل فروشگاهی با چیدمان الهام‌گرفته از الگوهای رایج بازارگاه‌های بزرگ؛ این قالب وابستگی رسمی به برند دیگری ندارد."}
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
  if(product.is_demo_product)return {title:product.title,description,robots:{index:false,follow:true}};
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
 if(!product)return <main className={"sk-store sookar-store sk-product-site--"+site} dir="rtl"><section className="store-section"><div className="product-card"><h2>محصول پیدا نشد</h2><p>این محصول در کاتالوگ عمومی سامانه فعال نیست.</p><Link href={identity.path}>بازگشت به {identity.name}</Link></div></section></main>;
 const options=await getBuyingOptions(product.id);
 const cashPrice=Number(product.price);
 const attributes=product.attributes||{};
 const gallery=Array.isArray(attributes.galleryImages)?attributes.galleryImages.filter((url):url is string=>typeof url==="string"&&(url.startsWith("https://")||(url.startsWith("/")&&!url.startsWith("//")))).slice(0,8):[];
 const images=[...new Set([product.image_url,...gallery].filter((url):url is string=>typeof url==="string"&&(url.startsWith("https://")||(url.startsWith("/")&&!url.startsWith("//")))))].slice(0,9);
 const specifications=Array.isArray(attributes.specifications)?attributes.specifications as Array<{group?:string;items?:Array<{name?:string;values?:string[]}>}>:[];
 const variants=Array.isArray(attributes.variants)?attributes.variants as Array<{id?:string|null;sku?:string|null;title?:string|null;price?:number|null;currency?:string;available?:boolean|null;color?:string|null;size?:string|null;attributes?:Record<string,string>}>:[];
 const jsonLd={
   "@context":"https://schema.org",
   "@type":"Product",
   name:product.title,
   description:product.description||undefined,
   sku:product.sku,
   category:product.category||undefined,
   brand:{ "@type":"Brand", name:typeof attributes.brand==="string"&&attributes.brand?attributes.brand:identity.name },
   offers:product.is_demo_product?undefined:{
     "@type":"Offer",
     url:`${siteUrl}/store/product/${encodeURIComponent(product.sku||product.id)}`,
     priceCurrency:product.currency,
     price:String(cashPrice)
   }
 };
 return <main className={"sk-store sookar-store sk-product-site--"+site} dir="rtl">
   <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}} />
   <header className="sk-product-header sk-dk-header">
     <div className="sk-dk-header-main"><Link href={identity.path} className="sk-dk-logo" aria-label={identity.name}><strong>{identity.name}</strong><span className="sk-dk-logo-mark">⌣</span></Link><form className="sk-dk-search" action={identity.path} method="get"><input name="q" placeholder="جستجو در محصولات" aria-label="جستجو در محصولات" /><button type="submit" aria-label="جستجو">⌕</button></form><div className="sk-dk-header-account"><Link href={"/login?brand="+identity.loginBrand}>ورود | ثبت‌نام</Link><Link href="/store/cart" aria-label="سبد خرید">🛒 <CartCount /></Link></div></div>
     <nav className="sk-dk-header-nav"><Link href={identity.path}>دسته‌بندی کالاها</Link><Link href={identity.path}>شگفت‌انگیزها</Link><Link href={identity.path}>سوپرمارکت</Link><Link href={identity.path}>طلای دیجیتال</Link><Link href={identity.path}>پرفروش‌ترین‌ها</Link><Link href={identity.path}>سوالی دارید؟</Link><span className="sk-dk-address">انتخاب آدرس</span></nav>
   </header>
   <section className="sk-product-detail sk-dk-product-layout">
     <div className="sk-dk-product-breadcrumb"><Link href={identity.path}>دیجی‌کالا</Link><span>/</span><Link href={identity.path}>{product.category||"موبایل"}</Link><span>/</span><span>{product.title}</span></div>
     <ProductGallery images={images} title={product.title} />
     <div className="sk-product-detail-copy sk-dk-product-copy">
       <div className="sk-dk-category-line"><Link href={identity.path}>{product.category||"دسته‌بندی کالا"}</Link><span>›</span><Link href={identity.path}>محصولات منتخب</Link></div>
       <h1>{product.title}</h1>
       {typeof attributes.englishTitle==="string"&&<p className="sk-dk-english-title">{attributes.englishTitle}</p>}
       <div className="sk-dk-product-meta">
         {typeof attributes.rating==="number"&&<span>★ {attributes.rating.toLocaleString("fa-IR")}</span>}
         {typeof attributes.reviewCount==="number"&&<Link href="#reviews">{attributes.reviewCount.toLocaleString("fa-IR")} دیدگاه</Link>}
         {typeof attributes.questionCount==="number"&&<Link href="#questions">{attributes.questionCount.toLocaleString("fa-IR")} پرسش</Link>}
         {typeof attributes.rating!=="number"&&typeof attributes.reviewCount!=="number"&&<span>اطلاعات محصول از کاتالوگ فروشگاه</span>}
       </div>
       <p className="sk-dk-description">{product.description||"توضیحات تکمیلی این محصول هنوز توسط فروشنده ثبت نشده است."}</p>
       {variants.length>0&&<div className="sk-dk-variants"><b>انتخاب مدل</b><div>{variants.slice(0,6).map((variant,index)=><span key={(variant.id||variant.sku||"variant")+index} title={variant.title||variant.color||variant.size||"تنوع محصول"}>{variant.color||variant.title||variant.size||"مدل "+(index+1)}</span>)}</div></div>}
       {specifications.length>0&&<div className="sk-dk-key-specs"><b>ویژگی‌های اصلی</b><div>{specifications.flatMap(group=>group.items||[]).slice(0,4).map((item,index)=><div key={(item.name||"ویژگی")+index}><span>{item.name||"ویژگی"}</span><strong>{Array.isArray(item.values)?item.values.join("، "):"ثبت نشده"}</strong></div>)}</div></div>}
       {attributes.preorderEnabled===true&&<div className="sk-product-demo-notice"><strong>پیش‌فروش</strong><span>سقف ثبت‌شده: {Math.max(1,Number(attributes.preorderLimit)||10).toLocaleString("fa-IR")} سفارش. این مقدار به‌معنای تأیید موجودی فیزیکی نیست.</span></div>}
       {product.is_demo_product&&<div className="sk-product-demo-notice">این کالا در کاتالوگ داخلی ثبت شده است؛ سفارش نهایی و پرداخت واقعی تا تأیید فروشنده فعال نیست.</div>}
     </div>
     <aside className="sk-dk-buybox">
       <div className="sk-dk-seller-title"><strong>فروشنده</strong><Link href={identity.path}>فروشندگان دیگر ←</Link></div>
       <div className="sk-dk-seller-name"><span className="sk-dk-seller-logo">⌣</span><div><b>{product.seller_name||"فروشنده ثبت‌شده"}</b><small>فروشنده ثبت‌شده در سامانه</small></div></div>
       <div className="sk-dk-seller-benefit"><span>♧</span><span>اطلاعات فروشنده از کاتالوگ سامانه</span></div>
       <div className="sk-dk-seller-benefit"><span>✓</span><span>وضعیت نهایی سفارش هنگام ثبت بررسی می‌شود</span></div>
       <div className="sk-dk-price"><small>{product.is_demo_product?"قیمت آزمایشی":"قیمت ثبت‌شده"}</small><strong>{cashPrice.toLocaleString("fa-IR")} <small>{product.currency}</small></strong></div>
       <div className="sk-product-detail-actions">{!product.is_reference&&<AddToCartButton product={{id:product.id,sku:product.sku,title:product.title,price:String(cashPrice),currency:product.currency,seller_name:product.seller_name,store_id:product.store_id,image_url:product.image_url,is_demo_product:product.is_demo_product,is_preorder:attributes.preorderEnabled===true,preorder_limit:Number(attributes.preorderLimit||0),source_url:product.source_url,site}}/>}{!product.is_reference&&<Link href="/store/cart" className="sk-product-view-cart">مشاهده سبد خرید</Link>}</div>
       {!product.is_demo_product&&!product.is_reference&&<aside className="sk-product-credit-panel"><div className="sk-product-credit-panel-head"><span>▦</span><div><b>خرید اعتباری</b><small>طرح‌های ثبت‌شده برای این کالا</small></div></div>{options?.financingPrograms?.length?<div className="sk-product-credit-plans">{options.financingPrograms.slice(0,2).map(program=><div className="sk-product-credit-plan" key={program.id}><b>{program.title}</b><span>{program.max_term_months? "تا "+program.max_term_months+" ماه":"مدت طبق طرح"}</span><small>نرخ/کارمزد ثبت‌شده: {program.rate_percent}%</small></div>)}</div>:<p className="sk-product-credit-empty">طرح اعتباری فعالی برای این کالا دریافت نشد.</p>}<Link href="/pay" className="sk-product-credit-panel-link">جزئیات خرید اعتباری ←</Link></aside>}
       {options?.deliveryMethods?.length>0&&<div className="sk-dk-delivery"><b>ارسال و تحویل</b>{options.deliveryMethods.slice(0,2).map(method=><div key={method.id}><span>{method.title}</span><small>{method.business_days_min} تا {method.business_days_max} روز کاری</small></div>)}</div>}
       <small className="sk-product-truth-note">{product.is_demo_product?"کالای آزمایشی؛ خرید نهایی فعال نیست.":product.is_reference?"این کالا هنوز برای سفارش واقعی تأیید نشده است.":"ثبت در سبد خرید به‌تنهایی سفارش یا پرداخت را نهایی نمی‌کند."}</small>
     </aside>
   </section>
   {!product.is_demo_product&&options&&(options.financingPrograms.length>0||options.deliveryMethods.length>0)&&<section className="store-section sk-product-buying-options">
     <div className="sk-product-specs-head"><span>گزینه‌های واقعی سامانه</span><h2>روش‌های خرید و تحویل</h2><p>قیمت پایه از کاتالوگ داخلی شما می‌آید؛ گزینه‌های زیر فقط در صورت ثبت و فعال بودن در سامانه نمایش داده می‌شوند.</p></div>
     {options.financingPrograms.length>0&&<div className="sk-product-option-group"><h3>خرید اعتباری</h3><div className="sk-product-option-grid">{options.financingPrograms.map(program=><article key={program.id}><b>{program.title}</b><span>{program.min_term_months&&program.max_term_months?program.min_term_months+" تا "+program.max_term_months+" ماه":program.max_term_months?"تا "+program.max_term_months+" ماه":"مدت طبق طرح"}</span><small>کارمزد/نرخ ثبت‌شده: {program.rate_percent}%</small><small>بررسی درخواست: {program.approval_business_days_min} تا {program.approval_business_days_max} روز کاری</small></article>)}</div></div>}
     {options.deliveryMethods.length>0&&<div className="sk-product-option-group"><h3>روش‌های تحویل</h3><div className="sk-product-option-grid">{options.deliveryMethods.map(method=><article key={method.id}><b>{method.title}</b><span>{method.business_days_min} تا {method.business_days_max} روز کاری</span><small>هزینه ثبت‌شده: {method.cost.toLocaleString("fa-IR")} {product.currency}</small></article>)}</div></div>}
   </section>}
   {variants.length>0&&<section className="store-section sk-product-buying-options"><div className="sk-product-specs-head"><span>انتخاب مدل و مشخصات</span><h2>تنوع‌های محصول</h2><p>تنوع‌ها از کاتالوگ داخلی سوکار خوانده می‌شوند. قیمت و وضعیت هر گزینه تا تأیید فروشنده نهایی نیست.</p></div><div className="sk-product-option-grid">{variants.map((variant,index)=><article key={(variant.id||variant.sku||"variant")+"-"+index}><b>{variant.title||[variant.color,variant.size].filter(Boolean).join(" · ")||"تنوع "+(index+1).toLocaleString("fa-IR")}</b>{variant.sku&&<span>شناسه گزینه: {variant.sku}</span>}{(variant.color||variant.size)&&<span>{[variant.color,variant.size].filter(Boolean).join(" · ")}</span>}{variant.price&&variant.price>0?<strong>{Number(variant.price).toLocaleString("fa-IR")} ریال</strong>:<small>قیمت مستقل این گزینه در مرجع ثبت نشده</small>}<small>{variant.available===true?"وضعیت ثبت‌شده: قابل بررسی":variant.available===false?"وضعیت ثبت‌شده: ناموجود":"وضعیت موجودی تأیید نشده"}</small>{variant.attributes&&Object.entries(variant.attributes).map(([name,value])=><small key={name}>{name}: {value}</small>)}</article>)}</div></section>}<section className="store-section sk-product-specs"><div className="sk-product-specs-head"><span>اطلاعات ثبت‌شده</span><h2>مشخصات محصول</h2><p>مشخصات از اطلاعات موجود در کاتالوگ داخلی نمایش داده می‌شود؛ مورد ثبت‌نشده به‌صورت ساختگی تکمیل نمی‌شود.</p></div>{specifications.length ? specifications.map((group,index)=><article className="sk-product-spec-group" key={(group.group||"مشخصات")+"-"+index}><h3>{group.group||"مشخصات"}</h3><dl>{(group.items||[]).map((item,itemIndex)=><div key={(item.name||"ویژگی")+"-"+itemIndex}><dt>{item.name||"ویژگی"}</dt><dd>{Array.isArray(item.values)?item.values.join("، "):"ثبت نشده"}</dd></div>)}</dl></article>) : <div className="sk-product-spec-empty">مشخصات فنی تفصیلی برای این محصول هنوز در کاتالوگ ثبت نشده است.</div>}</section>
   <section className="store-section feature-row"><article><b>کد کالا</b><span>{product.sku}</span></article><article><b>دسته‌بندی</b><span>{product.category||"ثبت نشده"}</span></article><article><b>فروشنده</b><span>{product.seller_name||"ثبت نشده"}</span></article><article><b>اعتبار خرید</b><span>از مسیر خدمات اعتباری سامانه</span></article></section>
   <footer className="sk-product-footer"><div><Link href={identity.path} className="sk-product-footer-brand"><b>{identity.mark}</b><span><strong>{identity.name}</strong><small>{identity.tagline}</small></span></Link><p>{identity.footer}</p></div><nav><Link href={identity.path}>صفحه اصلی</Link><Link href="/store/cart">سبد خرید</Link><Link href={"/login?brand="+identity.loginBrand}>ورود و حساب کاربری</Link><Link href="/store/returns">مرجوعی و پشتیبانی</Link></nav><small>قیمت، موجودی و امکان سفارش باید در مرحله نهایی بررسی شوند.</small></footer>
 </main>;
}
