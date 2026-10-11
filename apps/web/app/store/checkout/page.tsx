"use client";

import Link from "next/link";
import {Suspense,useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";

type Cart={id:string;customer_ref:string;store_id:string;currency:string;status:string};
type Item={id:string;product_id:string;quantity:number;unit_price:string;sku:string;title:string};
type Facility={id:string;facility_no:string;approved_amount:string;available_amount:string;currency:string;status:string;product_code:string;interest_rate?:string|null;approved_term_months?:number|null};

function CheckoutContent(){
 const search=useSearchParams();
 const cartId=search.get("cart")||"";
 const [cart,setCart]=useState<Cart|null>(null),[items,setItems]=useState<Item[]>([]);
 const [facilities,setFacilities]=useState<Facility[]>([]);
 const [method,setMethod]=useState<"online"|"credit">("online");
 const [facilityId,setFacilityId]=useState("");
 const [orderId,setOrderId]=useState(search.get("order")||"");
 const [order,setOrder]=useState<any>(null);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[error,setError]=useState("");
 const csrf=()=>typeof document==="undefined"?"":document.cookie.split("; ").find(x=>x.startsWith("naf_csrf="))?.split("=")[1]||"";
 const headers=()=>({"content-type":"application/json","x-csrf-token":csrf()});
 const total=useMemo(()=>items.reduce((s,i)=>s+Number(i.unit_price)*Number(i.quantity),0),[items]);

 async function load(){
  if(!cartId){setLoading(false);return;}
  setLoading(true);setError("");
  try{
   const r=await fetch("/api/checkout/carts/"+encodeURIComponent(cartId),{credentials:"include"});
   const b=await r.json();if(!r.ok)throw new Error(b.error||"دریافت سبد ناموفق بود");
   setCart(b.cart);setItems(b.items||[]);
   const f=await fetch("/api/lendtech/my-facilities",{credentials:"include"});
   const fb=await f.json();if(f.ok){setFacilities(fb.items||[]);if((fb.items||[]).length)setFacilityId(fb.items[0].id);}
   if(orderId){const or=await fetch("/api/marketplace/orders/"+encodeURIComponent(orderId),{credentials:"include"});const ob=await or.json();if(or.ok)setOrder(ob.order);}
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت سبد");}
  finally{setLoading(false);}
 }
 async function checkoutAndPay(){
  if(!cartId||!items.length)return;
  setBusy(true);setError("");setMessage("");
  try{
   let oid=orderId;
   if(!oid){
    const cr=await fetch("/api/checkout/carts/"+encodeURIComponent(cartId)+"/checkout",{method:"POST",credentials:"include",headers:headers(),body:JSON.stringify({paymentMethod:method})});
    const cb=await cr.json();if(!cr.ok)throw new Error(cb.error||"ثبت سفارش ناموفق بود");
    oid=cb.order.id;setOrderId(oid);
   }
   const pr=await fetch("/api/marketplace/orders/"+encodeURIComponent(oid)+"/payment",{method:"POST",credentials:"include",headers:headers(),body:JSON.stringify({
    method,creditFacilityId:method==="credit"?facilityId:undefined,idempotencyKey:"WEB-"+oid
   })});
   const pb=await pr.json();if(!pr.ok)throw new Error(pb.error||"پرداخت ناموفق بود");
   const resolvedOrder=pb.order||{id:oid,status:pb.status||"pending"};
   setOrder(resolvedOrder);
   setMessage(resolvedOrder.status==="paid"||pb.status==="paid"?"پرداخت توسط سرویس پرداخت تأیید شد.":"سفارش ثبت شد؛ وضعیت پرداخت هنوز نهایی نیست و باید از سرویس پرداخت پیگیری شود.");
  }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت سفارش");}
  finally{setBusy(false);}
 }
 useEffect(()=>{load();},[cartId,orderId]);
 if(!cartId)return <main className="sookar-store" dir="rtl"><section className="store-section"><div className="product-card sk-checkout-empty"><span>تکمیل خرید</span><h1>سبد سفارش مشخص نیست</h1><p>برای ادامه خرید واقعی باید پس از ورود، سبد معتبر سامانه را انتخاب کنید. سبد آزمایشی مرورگر در این مسیر پذیرفته نمی‌شود.</p><Link className="sk-checkout-primary" href="/store/cart">بازگشت به سبد خرید</Link></div></section></main>;
 return <main className="sookar-store" dir="rtl">
  <header className="store-header"><Link href="/store" className="store-logo"><b>سوکار</b><span>تکمیل خرید</span></Link><nav><Link href="/store">فروشگاه</Link><Link href="/marketplace">بازارگاه</Link><Link href="/pay">مرکز اعتبار</Link></nav></header>
  <section className="store-section sk-checkout-workspace">
   <div className="sk-checkout-progress" aria-label="مراحل خرید"><span className="is-current"><b>۱</b><small>بررسی سفارش</small></span><i /><span className="is-current"><b>۲</b><small>پرداخت</small></span><i /><span className={order?.status==="paid"?"is-complete":""}><b>۳</b><small>تأیید نهایی</small></span></div>
   <header className="sk-checkout-heading"><div><span>تسویه سفارش</span><h1>تکمیل خرید</h1><p>مبلغ و اقلام سفارش را بررسی کنید و سپس روش پرداخت را انتخاب کنید. وضعیت نهایی فقط بر اساس پاسخ سرویس پرداخت نمایش داده می‌شود.</p></div><Link href="/store/cart">بازگشت به سبد</Link></header>
   {error&&<div className="pay-notice" role="alert">{error}</div>}{message&&<div className="sk-checkout-message" role="status">{message}</div>}
   {loading?<div className="product-card sk-checkout-loading" role="status"><span className="sk-checkout-spinner" aria-hidden="true" />در حال دریافت سبد و بررسی وضعیت سفارش…</div>:items.length===0?<div className="product-card sk-checkout-empty"><h2>سبد قابل تسویه نیست</h2><p>این سبد خالی است یا قبلاً تسویه شده. برای ثبت سفارش جدید، به فروشگاه برگردید.</p><Link className="sk-checkout-primary" href="/store/shop">مرور کالاها</Link></div>:<div className="plan-grid sk-checkout-grid">
    <article className="product-card sk-checkout-card"><span>خلاصه سفارش</span><h3>{items.length.toLocaleString("fa-IR")} قلم</h3>{items.map(i=><div key={i.id} className="module-row"><div><strong>{i.title}</strong><small>{i.sku} · تعداد {Number(i.quantity).toLocaleString("fa-IR")}</small></div><span>{(Number(i.unit_price)*Number(i.quantity)).toLocaleString("fa-IR")} {cart?.currency||"IRR"}</span></div>)}<hr/><strong>جمع کل: {total.toLocaleString("fa-IR")} {cart?.currency||"IRR"}</strong></article>
    <article className="product-card sk-checkout-card"><span>مرحله پرداخت</span><h3>انتخاب روش پرداخت</h3>
     <label className="sk-checkout-choice"><input type="radio" checked={method==="online"} onChange={()=>setMethod("online")}/> پرداخت آنلاین از درگاه متصل</label>
     <label className="sk-checkout-choice"><input type="radio" checked={method==="credit"} onChange={()=>setMethod("credit")}/> استفاده از اعتبار خرید فعال</label>
     {method==="online"&&<p className="sk-checkout-disclaimer">پرداخت فقط پس از تأیید درگاه واقعی نهایی می‌شود. واردکردن شماره مرجع به‌تنهایی پرداخت محسوب نمی‌شود.</p>}{method==="credit"&&<div><label>تسهیلات اعتباری فعال<select value={facilityId} onChange={e=>setFacilityId(e.target.value)}><option value="">انتخاب کنید</option>{facilities.map(f=><option key={f.id} value={f.id}>{f.facility_no} · مانده {Number(f.available_amount).toLocaleString("fa-IR")} {f.currency}</option>)}</select></label>{facilities.length===0&&<p>تسهیلات فعال قابل مصرف برای این حساب پیدا نشد.</p>}</div>}
     <button className="sk-checkout-primary" disabled={busy||!items.length||(method==="credit"&&!facilityId)} onClick={checkoutAndPay}>{busy?"در حال ثبت درخواست…":method==="credit"?"ادامه با اعتبار خرید":"ثبت درخواست پرداخت"}</button>
     {orderId&&<div><p>شماره سفارش داخلی: {orderId}</p><Link href={"/store/checkout?cart="+encodeURIComponent(cartId)+"&order="+encodeURIComponent(orderId)}>مشاهده وضعیت ←</Link></div>}
    </article>
   </div>}
   {order&&<article className="product-card sk-checkout-order-status"><span>وضعیت سفارش</span><h2>{order.status==="paid"?"پرداخت تأیید شد":order.status==="cancelled"?"سفارش لغو شده":"در انتظار تأیید نهایی"}</h2><p>شناسه سفارش: <b>{order.id}</b></p><p>{order.status==="paid"?"سرویس پرداخت وضعیت موفق را اعلام کرده است.":"سفارش ایجاد شده، اما تا تأیید سرویس پرداخت نباید آن را پرداخت‌شده در نظر گرفت."}</p><Link href="/account/orders">رفتن به سفارش‌های حساب ←</Link></article>}
  </section>
 </main>;
}


export default function CheckoutPage(){
 return <Suspense fallback={<main className="sookar-store" dir="rtl"><section className="store-section"><div className="product-card">در حال آماده‌سازی پرداخت...</div></section></main>}><CheckoutContent /></Suspense>;
}
