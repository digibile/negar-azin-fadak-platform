"use client";

import Link from "next/link";
import {useEffect,useState} from "react";

type Product={id:string;sku:string;title:string;description:string|null;category:string|null;price:string;currency:string;seller_name:string;store_id:string|null};

export default function ProductPage({params}:{params:Promise<{id:string}>}){
 const [product,setProduct]=useState<Product|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [customerRef,setCustomerRef]=useState(""),[quantity,setQuantity]=useState("1"),[busy,setBusy]=useState(false),[cartId,setCartId]=useState("");
 useEffect(()=>{params.then(({id})=>fetch("/api/public/marketplace").then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||"دریافت محصول ناموفق بود");const p=(b.products||[]).find((x:Product)=>x.id===decodeURIComponent(id));if(!p)throw new Error("محصول فعال پیدا نشد");setProduct(p)}).catch(e=>setError(e instanceof Error?e.message:"خطا")).finally(()=>setLoading(false)));},[params]);
 async function add(){
  if(!product)return;
  if(!product.store_id){setError("این محصول هنوز به فروشگاه فعال متصل نشده است");return;}
  if(!customerRef.trim()){setError("شناسه مشتری الزامی است");return;}
  setBusy(true);setError("");
  try{
   const headers={"content-type":"application/json","x-csrf-token":getCookie("naf_csrf")};
   const c=await fetch("/api/checkout/carts",{method:"POST",credentials:"include",headers,body:JSON.stringify({customerRef,storeId:product.store_id,currency:product.currency})});
   const cb=await c.json();if(!c.ok)throw new Error(cb.error||"ایجاد سبد ناموفق بود");
   const i=await fetch("/api/checkout/carts/"+cb.id+"/items",{method:"POST",credentials:"include",headers,body:JSON.stringify({productId:product.id,quantity:Number(quantity)})});
   const ib=await i.json();if(!i.ok)throw new Error(ib.error||"افزودن محصول ناموفق بود");
   setCartId(cb.id);
  }catch(e){setError(e instanceof Error?e.message:"خطا در افزودن به سبد");}finally{setBusy(false);}
 }
 if(loading)return <main className="sookar-store" dir="rtl"><section className="store-section"><div className="product-card">در حال دریافت محصول...</div></section></main>;
 if(error&&!product)return <main className="sookar-store" dir="rtl"><section className="store-section"><div className="product-card">{error}<br/><Link href="/store">بازگشت به فروشگاه</Link></div></section></main>;
 if(!product)return null;
 return <main className="sookar-store" dir="rtl">
  <header className="store-header"><Link href="/store" className="store-logo"><b>سوکار</b><span>محصول</span></Link><nav><Link href="/marketplace">بازارگاه</Link><Link href="/pay">اعتبار</Link><Link href="/store/cart">سبد خرید</Link></nav></header>
  <section className="store-section">
   <header><div><span>{product.category||"محصول"} · {product.seller_name}</span><h2>{product.title}</h2></div><Link href="/store">بازگشت</Link></header>
   <div className="plan-grid">
    <article className="product-card"><div className="product-image"><span>{product.category||"محصول"}</span><b>سوکار</b></div><h3>{product.title}</h3><p>{product.description||"توضیحات محصول در کاتالوگ ثبت نشده است."}</p><small>SKU: {product.sku}</small><strong>{Number(product.price).toLocaleString("fa-IR")} {product.currency}</strong></article>
    <article className="product-card"><h3>افزودن به سبد واقعی</h3><label>شناسه مشتری<input value={customerRef} onChange={e=>setCustomerRef(e.target.value)} placeholder="شناسه مشتری" /></label><label>تعداد<input inputMode="numeric" value={quantity} onChange={e=>setQuantity(e.target.value)} /></label><button disabled={busy} onClick={add}>{busy?"در حال ثبت...":"افزودن به سبد"}</button>{error&&<p>{error}</p>}{cartId&&<><p>محصول به سبد واقعی اضافه شد.</p><Link href={"/store/checkout?cart="+encodeURIComponent(cartId)}>ادامه Checkout ←</Link></>}</article>
   </div>
  </section>
 </main>;
}
function getCookie(name:string){if(typeof document==="undefined")return "";return document.cookie.split("; ").find(x=>x.startsWith(name+"="))?.split("=")[1]||"";}
