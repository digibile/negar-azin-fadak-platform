"use client";

import Link from "next/link";
import {useParams,useSearchParams} from "next/navigation";
import {useEffect,useMemo,useState} from "react";
import {AddToCartButton,CartCount} from "../../cart-actions";
import "../../product-detail.css";

type Product={
 id:string;sku:string;title:string;description:string|null;category:string|null;
 price:string|number;currency:string;seller_name:string;store_id:string|null;
 image_url:string|null;attributes?:Record<string,unknown>;
};
type Catalog={products:Product[];tenant?:{name?:string};notice?:string};
const money=(value:number|string,currency:string)=>Number(value).toLocaleString("fa-IR")+" "+(currency==="IRR"?"ریال":currency);
const image=(value:unknown)=>typeof value==="string"&&(value.startsWith("https://")||value.startsWith("http://")||(value.startsWith("/")&&!value.startsWith("//")))?value:"";

export default function StoreProductDetailPage(){
 const params=useParams<{sku:string}>();
 const search=useSearchParams();
 const sku=decodeURIComponent(String(params?.sku||""));
 const site=search.get("site")||"default";
 const [product,setProduct]=useState<Product|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [activeImage,setActiveImage]=useState("");
 const [quantity,setQuantity]=useState(1);

 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/public/marketplace",{headers:{accept:"application/json"},cache:"no-store",signal:controller.signal})
   .then(async response=>{const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body?.error||"دریافت اطلاعات محصول ناموفق بود");return body as Catalog;})
   .then(body=>{
    const found=(body.products||[]).find(item=>item.sku===sku||item.id===sku);
    if(!found){setProduct(null);setError("این کالا در حال حاضر در فروشگاه منتشر نشده یا دیگر در دسترس نیست.");return;}
    setProduct(found);
    const attrs=found.attributes||{};
    const gallery=Array.isArray(attrs.galleryImages)?attrs.galleryImages.filter((x):x is string=>typeof x==="string"):[];
    setActiveImage(image(gallery[0])||image(found.image_url));
   })
   .catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"ارتباط با فروشگاه برقرار نشد.");})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[sku]);

 const attrs=product?.attributes||{};
 const gallery=useMemo(()=>product?[...new Set([image(product.image_url),...(Array.isArray(product.attributes?.galleryImages)?product.attributes.galleryImages.map(image):[])].filter(Boolean))]:[],[product]);
 const specs=Array.isArray(attrs.specifications)?attrs.specifications as Array<{group?:string;items?:Array<{name?:string;values?:string[]}>}>:[];
 const preorder=attrs.preorderEnabled===true&&attrs.inventoryMode==="preorder";
 const preorderLimit=Number(attrs.preorderLimit)||10;

 if(loading)return <main className="sk-product-detail" dir="rtl"><div className="sk-product-detail-state"><span className="sk-product-detail-spinner"/><b>در حال دریافت اطلاعات کالا…</b></div></main>;
 if(!product)return <main className="sk-product-detail" dir="rtl"><div className="sk-product-detail-state is-error"><b>محصول پیدا نشد</b><p>{error||"این کالا در دسترس نیست."}</p><Link href="/store/shop">بازگشت به فروشگاه</Link></div></main>;

 return <main className="sk-product-detail" dir="rtl">
  <div className="sk-product-topbar"><div className="sk-product-container"><Link href="/">سوکار</Link><span>/</span><Link href="/store/shop">فروشگاه</Link><span>/</span><span>{product.category||"محصولات"}</span><Link className="sk-product-cart-link" href="/store/cart">سبد خرید <CartCount/></Link></div></div>
  <div className="sk-product-container">
   <nav className="sk-product-breadcrumb" aria-label="مسیر صفحه"><Link href="/">صفحه اصلی</Link><span>›</span><Link href="/store/shop">همه کالاها</Link><span>›</span><span>{product.title}</span></nav>
   {error&&<div className="sk-product-alert" role="alert">{error}</div>}
   <section className="sk-product-main">
    <div className="sk-product-gallery">
     <div className="sk-product-main-image">{activeImage?<img src={activeImage} alt={product.title}/>:<span>▧</span>}</div>
     {gallery.length>1&&<div className="sk-product-thumbnails">{gallery.map((src,index)=><button type="button" key={src} className={activeImage===src?"is-active":""} onClick={()=>setActiveImage(src)} aria-label={"نمایش تصویر "+(index+1)}><img src={src} alt=""/></button>)}</div>}
    </div>
    <div className="sk-product-summary">
     <div className="sk-product-meta"><span>{product.category||"کالای ثبت‌شده"}</span><span>کد کالا: {product.sku}</span></div>
     <h1>{product.title}</h1>
     <p className="sk-product-seller">فروشنده: <strong>{product.seller_name||"فروشنده تأییدشده بازارگاه"}</strong></p>
     {product.description&&<p className="sk-product-description">{product.description}</p>}
     <div className="sk-product-price-box"><span>قیمت ثبت‌شده</span><strong>{money(product.price,product.currency)}</strong><small>قیمت و موجودی هنگام ثبت سفارش دوباره از سامانه بررسی می‌شود.</small></div>
     <div className="sk-product-quantity"><span>تعداد</span><div><button type="button" onClick={()=>setQuantity(v=>Math.max(1,v-1))} aria-label="کاهش تعداد">−</button><b>{quantity.toLocaleString("fa-IR")}</b><button type="button" onClick={()=>setQuantity(v=>Math.min(preorder?preorderLimit:20,v+1))} aria-label="افزایش تعداد">＋</button></div></div>
     <div className="sk-product-actions"><AddToCartButton quantity={quantity} product={{id:product.id,sku:product.sku,title:product.title,price:product.price,currency:product.currency,seller_name:product.seller_name,store_id:product.store_id,image_url:product.image_url,is_preorder:preorder,preorder_limit:preorderLimit,site}}/><Link href="/store/cart" className="sk-product-secondary-action">مشاهده سبد خرید</Link></div>
     {preorder&&<p className="sk-product-preorder">این کالا با ظرفیت پیش‌فروش حداکثر {preorderLimit.toLocaleString("fa-IR")} عدد عرضه شده است.</p>}
     <div className="sk-product-trust"><div><b>اطلاعات شفاف</b><small>مشخصات از کاتالوگ فروشگاه</small></div><div><b>فروشنده مشخص</b><small>نام فروشنده در سفارش ثبت می‌شود</small></div><div><b>بررسی مجدد</b><small>قیمت و موجودی در زمان سفارش</small></div></div>
    </div>
   </section>
   <section className="sk-product-information">
    <header><span>جزئیات محصول</span><h2>مشخصات و توضیحات</h2></header>
    {specs.length?specs.map((group,index)=><div className="sk-product-spec-group" key={group.group||index}><h3>{group.group||"مشخصات"}</h3><dl>{(group.items||[]).map((item,i)=><div key={item.name||i}><dt>{item.name||"ویژگی"}</dt><dd>{(item.values||[]).join("، ")||"—"}</dd></div>)}</dl></div>):<p className="sk-product-no-specs">برای این محصول هنوز مشخصات فنی تفصیلی ثبت نشده است.</p>}
   </section>
   <div className="sk-product-bottom-links"><Link href="/store/shop">ادامه خرید از فروشگاه ←</Link><Link href="/store/orders">پیگیری سفارش‌ها</Link><Link href="/store/faq">راهنمای خرید</Link></div>
  </div>
 </main>;
}
