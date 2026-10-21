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
   {site==="digikala" ? <header className="sk-dk-site-header">
     <div className="sk-dk-header-main">
       <div className="sk-dk-header-actions">
         <Link href="/store/cart" className="sk-dk-header-icon" aria-label="سبد خرید"><span aria-hidden="true">🛒</span><CartCount /></Link>
         <Link href="/login?brand=digibile" className="sk-dk-header-login">ورود | ثبت‌نام <span aria-hidden="true">↪</span></Link>
         <Link href="/login?brand=digibile" className="sk-dk-header-icon" aria-label="اعلان‌ها">♧</Link>
         <Link href={identity.path} className="sk-dk-address-pill"><span aria-hidden="true">⌖</span> انتخاب آدرس</Link>
       </div>
       <form className="sk-dk-header-search" action="/store/shop" method="get" role="search">
         <input type="search" name="q" placeholder="جستجو در محصولات" aria-label="جستجو در محصولات" />
         <button type="submit" aria-label="جستجو">⌕</button>
       </form>
       <Link href={identity.path} className="sk-dk-logo" aria-label="صفحه اصلی قالب فروشگاهی">
         <strong>دیجی‌کالا</strong><span className="sk-dk-logo-mark" aria-hidden="true">◒</span>
       </Link>
     </div>
     <nav className="sk-dk-header-nav" aria-label="منوی فروشگاه">
       <Link href={identity.path} className="sk-dk-nav-category"><span aria-hidden="true">☰</span> دسته‌بندی کالاها</Link>
       <Link href={identity.path}>شگفت‌انگیزها</Link><Link href={identity.path}>سوپرمارکت</Link><Link href={identity.path}>طلا و نقره دیجیتال</Link><Link href={identity.path}>پرفروش‌ترین‌ها</Link><Link href={identity.path}>دیجی‌پی</Link><Link href={identity.path}>در دیجی‌کالا بفروشید</Link>
     </nav>
   </header> : <header className="sk-product-header"><div className="sk-wrap"><Link href={identity.path} className="sk-product-header-brand"><span className="sk-product-header-mark">{identity.mark}</span><span><strong>{identity.name}</strong><small>{identity.tagline}</small></span></Link><div className="sk-product-header-label"><span>کاتالوگ داخلی سوکار</span><b>جزئیات محصول</b></div><div className="sk-product-header-actions"><Link href="/store/cart" className="sk-product-header-cart" aria-label="مشاهده سبد خرید"><span aria-hidden="true">🛒</span><span>سبد خرید</span><CartCount /></Link><Link href={identity.path} className="sk-product-header-back">ادامه خرید <span aria-hidden="true">←</span></Link></div></div></header>}
   {site==="digikala"&&<div className="sk-dk-product-breadcrumb"><span>⌂</span><Link href={identity.path}>دیجی‌کالا</Link><span>/</span><Link href={identity.path}>{product.category||"کالای دیجیتال"}</Link><span>/</span><span>{product.category||"محصول"}</span><small>فروش در دیجی‌کالا</small></div>}
   <section className="sk-product-detail" aria-label="جزئیات محصول">
     <ProductGallery images={images} title={product.title} />
     <div className="sk-product-detail-copy">
       <span className="sk-product-breadcrumb"><Link href={identity.path}>خانه</Link> / <Link href={identity.path}>فروشگاه</Link> / {product.category||"محصول"}</span>
       <h1>{product.title}</h1>
       <div className="sk-product-meta-line">
         {typeof attributes.brand==="string"&&attributes.brand.trim()&&<span>برند: <strong>{attributes.brand}</strong></span>}
         {product.sku&&<span>شناسه کالا: <strong>{product.sku}</strong></span>}
         {typeof attributes.model==="string"&&attributes.model.trim()&&<span>مدل: <strong>{attributes.model}</strong></span>}
       </div>
       {(typeof attributes.rating==="number"||typeof attributes.reviewCount==="number")&&<div className="sk-dk-rating-row">{typeof attributes.rating==="number"&&<strong><span aria-hidden="true">★</span> {attributes.rating.toLocaleString("fa-IR")}</strong>}{typeof attributes.reviewCount==="number"&&<span>{attributes.reviewCount.toLocaleString("fa-IR")} دیدگاه ثبت‌شده</span>}</div>}
       <p className="sk-product-description">{product.description||"توضیحات تکمیلی این محصول هنوز توسط فروشنده ثبت نشده است."}</p>
       {variants.some(variant=>variant.color)&&<div className="sk-dk-color-picker"><b>رنگ: {variants.find(variant=>variant.color)?.color}</b><div>{variants.filter(variant=>variant.color).map((variant,index)=>{const raw=(variant.color||"").trim();const palette:Record<string,string>={"نارنجی":"#f28c28","آبی":"#17266e","سرمه‌ای":"#17266e","مشکی":"#222222","سفید":"#f5f5f5","خاکستری":"#d5d5d5","نقره‌ای":"#d6d6d6","سبز":"#2b8b57","طلایی":"#d6a31d","صورتی":"#e7a2b2"};const swatch=raw.startsWith("#")?raw:(palette[raw]||"#d5d5d5");return variant.sku?<Link key={variant.id||variant.sku||index} href={"/store/product/"+encodeURIComponent(variant.sku)+"?site=digikala"} className="sk-dk-color-swatch" title={raw} aria-label={"انتخاب رنگ "+raw} style={{backgroundColor:swatch}} />:<span key={variant.id||index} className="sk-dk-color-swatch" title={raw} style={{backgroundColor:swatch}} />;})}</div></div>}
       {specifications.length>0&&<div className="sk-product-quick-specs"><h2>نگاه سریع به مشخصات</h2>{specifications.slice(0,2).flatMap((group,groupIndex)=>(group.items||[]).slice(0,3).map((item,itemIndex)=><div key={(group.group||"spec")+groupIndex+"-"+(item.name||"item")+itemIndex}><span>{item.name||"ویژگی"}</span><strong>{Array.isArray(item.values)&&item.values.length?item.values.join("، "):"ثبت نشده"}</strong></div>))}</div>}
       <nav className="sk-product-section-links" aria-label="بخش‌های صفحه"><a href="#product-specifications">مشخصات فنی</a>{!product.is_demo_product&&options&&(options.financingPrograms.length>0||options.deliveryMethods.length>0)&&<a href="#product-buying-options">روش‌های خرید و تحویل</a>}</nav>
     </div>
     <aside className="sk-product-buy-box" aria-label="اطلاعات خرید">
       <div className="sk-product-buy-box-heading"><span aria-hidden="true">✓</span><strong>اطلاعات خرید</strong></div>
       <div className="sk-product-seller-line"><span>فروشنده</span><strong className="sk-dk-seller-brand"><i aria-hidden="true">◒</i>{product.seller_name||"فروشنده ثبت‌شده"}</strong></div>{typeof attributes.sellerRating==="number"&&<div className="sk-dk-seller-rating"><span>امتیاز فروشنده</span><b>★ {attributes.sellerRating.toLocaleString("fa-IR")}</b></div>}{typeof attributes.stockQuantity==="number"&&<div className="sk-dk-stock-status"><span aria-hidden="true">●</span>{attributes.stockQuantity>0?("تنها "+attributes.stockQuantity.toLocaleString("fa-IR")+" عدد در انبار باقی مانده"):"در حال حاضر ناموجود"}</div>}
       <div className="sk-product-detail-price"><small>{product.is_demo_product ? "قیمت آزمایشی" : "قیمت ثبت‌شده در کاتالوگ"}</small><strong>{cashPrice.toLocaleString("fa-IR")} {product.currency}</strong></div>
       {options?.deliveryMethods?.[0]&&!product.is_demo_product&&<div className="sk-product-delivery-summary"><span aria-hidden="true">🚚</span><div><b>{options.deliveryMethods[0].title}</b><small>{options.deliveryMethods[0].business_days_min} تا {options.deliveryMethods[0].business_days_max} روز کاری · هزینه ثبت‌شده {options.deliveryMethods[0].cost.toLocaleString("fa-IR")} {product.currency}</small></div></div>}
       {!product.is_demo_product&&!product.is_reference&&<aside className="sk-product-credit-panel"><div className="sk-product-credit-panel-head"><span aria-hidden="true">▦</span><div><b>خرید اعتباری</b><small>طرح‌های ثبت‌شده سامانه برای این کالا</small></div></div>{options?.financingPrograms?.length ? <div className="sk-product-credit-plans">{options.financingPrograms.slice(0,2).map(program=><div className="sk-product-credit-plan" key={program.id}><b>{program.title}</b><span>{program.min_term_months&&program.max_term_months?(`${program.min_term_months} تا ${program.max_term_months} ماه`):program.max_term_months?(`تا ${program.max_term_months} ماه`):"مدت طبق طرح"}</span><small>نرخ/کارمزد ثبت‌شده: {program.rate_percent}%</small></div>)}</div> : <p className="sk-product-credit-empty">طرح اعتباری فعالی برای این کالا از API دریافت نشد؛ مبلغ قسط ساختگی نمایش داده نمی‌شود.</p>}<Link href="/pay" className="sk-product-credit-panel-link">بررسی شرایط اعتبار <span aria-hidden="true">←</span></Link></aside>}
       {attributes.preorderEnabled===true&&<div className="sk-product-demo-notice"><strong>پیش‌فروش با سقف {Math.max(1,Number(attributes.preorderLimit)||10).toLocaleString("fa-IR")} سفارش</strong><span>این ظرفیت به‌معنای موجودی فیزیکی تأییدشده نیست؛ قیمت نهایی پیش از تأیید سفارش باید بررسی شود.</span></div>}
       {product.is_demo_product&&<div className="sk-product-demo-notice">این کالا در کاتالوگ ثبت شده است. سفارش و پرداخت واقعی فقط پس از تأیید فروشنده و فعال بودن مسیر پرداخت امکان‌پذیر است.</div>}
       <div className="sk-product-detail-actions">{!product.is_reference&&<AddToCartButton product={{id:product.id,sku:product.sku,title:product.title,price:String(cashPrice),currency:product.currency,seller_name:product.seller_name,store_id:product.store_id,image_url:product.image_url,is_demo_product:product.is_demo_product,is_preorder:attributes.preorderEnabled===true,preorder_limit:Number(attributes.preorderLimit||0),source_url:product.source_url,site}}/>}{!product.is_reference&&<Link href="/store/cart" className="sk-product-view-cart"><span aria-hidden="true">🛒</span> مشاهده سبد خرید</Link>}{!product.is_demo_product&&!product.is_reference&&<Link href="/pay" className="sk-product-credit-link">بررسی خرید اعتباری</Link>}</div>
       <small className="sk-product-truth-note">{product.is_demo_product ? "این مسیر برای تست داخلی است؛ سفارش نهایی و پرداخت واقعی غیرفعال‌اند." : product.is_reference ? "این کالا هنوز برای سفارش واقعی تأیید نشده است." : "ثبت در سبد خرید به‌تنهایی سفارش یا پرداخت ایجاد نمی‌کند؛ امکان سفارش در مرحله نهایی بررسی می‌شود."}</small>
     </aside>
   </section>
   {!product.is_demo_product&&options&&(options.financingPrograms.length>0||options.deliveryMethods.length>0)&&<section id="product-buying-options" className="store-section sk-product-buying-options">
     <div className="sk-product-specs-head"><span>گزینه‌های واقعی سامانه</span><h2>روش‌های خرید و تحویل</h2><p>قیمت پایه از کاتالوگ داخلی شما می‌آید؛ گزینه‌های زیر فقط در صورت ثبت و فعال بودن در سامانه نمایش داده می‌شوند.</p></div>
     {options.financingPrograms.length>0&&<div className="sk-product-option-group"><h3>خرید اعتباری</h3><div className="sk-product-option-grid">{options.financingPrograms.map(program=><article key={program.id}><b>{program.title}</b><span>{program.min_term_months&&program.max_term_months?program.min_term_months+" تا "+program.max_term_months+" ماه":program.max_term_months?"تا "+program.max_term_months+" ماه":"مدت طبق طرح"}</span><small>کارمزد/نرخ ثبت‌شده: {program.rate_percent}%</small><small>بررسی درخواست: {program.approval_business_days_min} تا {program.approval_business_days_max} روز کاری</small></article>)}</div></div>}
     {options.deliveryMethods.length>0&&<div className="sk-product-option-group"><h3>روش‌های تحویل</h3><div className="sk-product-option-grid">{options.deliveryMethods.map(method=><article key={method.id}><b>{method.title}</b><span>{method.business_days_min} تا {method.business_days_max} روز کاری</span><small>هزینه ثبت‌شده: {method.cost.toLocaleString("fa-IR")} {product.currency}</small></article>)}</div></div>}
   </section>}
   {variants.length>0&&<section className="store-section sk-product-buying-options"><div className="sk-product-specs-head"><span>انتخاب مدل و مشخصات</span><h2>تنوع‌های محصول</h2><p>تنوع‌ها از کاتالوگ داخلی سوکار خوانده می‌شوند. قیمت و وضعیت هر گزینه تا تأیید فروشنده نهایی نیست.</p></div><div className="sk-product-option-grid">{variants.map((variant,index)=><article key={(variant.id||variant.sku||"variant")+"-"+index}><b>{variant.title||[variant.color,variant.size].filter(Boolean).join(" · ")||"تنوع "+(index+1).toLocaleString("fa-IR")}</b>{variant.sku&&<span>شناسه گزینه: {variant.sku}</span>}{(variant.color||variant.size)&&<span>{[variant.color,variant.size].filter(Boolean).join(" · ")}</span>}{variant.price&&variant.price>0?<strong>{Number(variant.price).toLocaleString("fa-IR")} ریال</strong>:<small>قیمت مستقل این گزینه در مرجع ثبت نشده</small>}<small>{variant.available===true?"وضعیت ثبت‌شده: قابل بررسی":variant.available===false?"وضعیت ثبت‌شده: ناموجود":"وضعیت موجودی تأیید نشده"}</small>{variant.attributes&&Object.entries(variant.attributes).map(([name,value])=><small key={name}>{name}: {value}</small>)}</article>)}</div></section>}<section id="product-specifications" className="store-section sk-product-specs"><div className="sk-product-specs-head"><span>اطلاعات ثبت‌شده</span><h2>مشخصات محصول</h2><p>مشخصات از اطلاعات موجود در کاتالوگ داخلی نمایش داده می‌شود؛ مورد ثبت‌نشده به‌صورت ساختگی تکمیل نمی‌شود.</p></div>{specifications.length ? specifications.map((group,index)=><article className="sk-product-spec-group" key={(group.group||"مشخصات")+"-"+index}><h3>{group.group||"مشخصات"}</h3><dl>{(group.items||[]).map((item,itemIndex)=><div key={(item.name||"ویژگی")+"-"+itemIndex}><dt>{item.name||"ویژگی"}</dt><dd>{Array.isArray(item.values)?item.values.join("، "):"ثبت نشده"}</dd></div>)}</dl></article>) : <div className="sk-product-spec-empty">مشخصات فنی تفصیلی برای این محصول هنوز در کاتالوگ ثبت نشده است.</div>}</section>
   <section className="store-section feature-row"><article><b>کد کالا</b><span>{product.sku}</span></article><article><b>دسته‌بندی</b><span>{product.category||"ثبت نشده"}</span></article><article><b>فروشنده</b><span>{product.seller_name||"ثبت نشده"}</span></article><article><b>اعتبار خرید</b><span>از مسیر خدمات اعتباری سامانه</span></article></section>
   <footer className="sk-product-footer"><div><Link href={identity.path} className="sk-product-footer-brand"><b>{identity.mark}</b><span><strong>{identity.name}</strong><small>{identity.tagline}</small></span></Link><p>{identity.footer}</p></div><nav><Link href={identity.path}>صفحه اصلی</Link><Link href="/store/cart">سبد خرید</Link><Link href={"/login?brand="+identity.loginBrand}>ورود و حساب کاربری</Link><Link href="/store/returns">مرجوعی و پشتیبانی</Link></nav><small>قیمت، موجودی و امکان سفارش باید در مرحله نهایی بررسی شوند.</small></footer>
 </main>;
}
