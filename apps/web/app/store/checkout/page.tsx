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
 const [method,setMethod]=useState<"manual"|"credit">("manual");
 const [facilityId,setFacilityId]=useState(""),[paymentRef,setPaymentRef]=useState("");
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
   const cr=await fetch("/api/checkout/carts/"+encodeURIComponent(cartId)+"/checkout",{method:"POST",credentials:"include",headers:headers(),body:JSON.stringify({paymentMethod:method})});
   const cb=await cr.json();if(!cr.ok)throw new Error(cb.error||"ثبت سفارش ناموفق بود");
   const oid=cb.order.id;setOrderId(oid);
   const pr=await fetch("/api/marketplace/orders/"+encodeURIComponent(oid)+"/payment",{method:"POST",credentials:"include",headers:headers(),body:JSON.stringify({
    method,providerCode:method==="manual"?"manual":undefined,providerRef:method==="manual"?paymentRef.trim():undefined,creditFacilityId:method==="credit"?facilityId:undefined,idempotencyKey:"WEB-"+oid
   })});
   const pb=await pr.json();if(!pr.ok)throw new Error(pb.error||"پرداخت ناموفق بود");
   setOrder(pb.order||{id:oid,status:pb.status||"paid"});
   setMessage(pb.status&&pb.status!=="paid"?"پرداخت در انتظار تأیید درگاه است.":"سفارش با موفقیت ثبت و پرداخت شد.");
  }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت سفارش");}
  finally{setBusy(false);}
 }
 useEffect(()=>{load();},[cartId,orderId]);
 if(!cartId)return <main className="sookar-store" dir="rtl"><section className="store-section"><div className="product-card"><h2>Checkout</h2><p>برای ادامه، یک سبد واقعی انتخاب کنید.</p><Link href="/store">بازگشت به فروشگاه ←</Link></div></section></main>;
 return <main className="sookar-store" dir="rtl">
  <header className="store-header"><Link href="/store" className="store-logo"><b>سوکار</b><span>Checkout</span></Link><nav><Link href="/store">فروشگاه</Link><Link href="/marketplace">بازارگاه</Link><Link href="/pay">مرکز اعتبار</Link></nav></header>
  <section className="store-section">
   <header><div><span>Checkout · سفارش واقعی</span><h2>تکمیل خرید</h2><p>سبد، موجودی، سفارش، پرداخت، دفترکل و رویدادهای عملیاتی در یک تراکنش واقعی ثبت می‌شوند.</p></div><Link href="/store/cart">سبد</Link></header>
   {error&&<div className="pay-notice">{error}</div>}{message&&<div className="pay-notice">{message}</div>}
   {loading?<div className="product-card">در حال دریافت سبد...</div>:<div className="plan-grid">
    <article className="product-card"><span>اقلام سفارش</span><h3>{items.length.toLocaleString("fa-IR")} قلم</h3>{items.map(i=><div key={i.id} className="module-row"><div><strong>{i.title}</strong><small>{i.sku} · تعداد {Number(i.quantity).toLocaleString("fa-IR")}</small></div><span>{(Number(i.unit_price)*Number(i.quantity)).toLocaleString("fa-IR")} {cart?.currency||"IRR"}</span></div>)}<hr/><strong>جمع کل: {total.toLocaleString("fa-IR")} {cart?.currency||"IRR"}</strong></article>
    <article className="product-card"><span>روش پرداخت</span><h3>انتخاب منبع پرداخت</h3>
     <label><input type="radio" checked={method==="manual"} onChange={()=>setMethod("manual")}/> ثبت پرداخت با مرجع بانکی</label>
     <label><input type="radio" checked={method==="credit"} onChange={()=>setMethod("credit")}/> اعتبار خرید</label>
     {method==="manual"&&<label>شناسه مرجع پرداخت<input value={paymentRef} onChange={e=>setPaymentRef(e.target.value)} placeholder="مرجع واقعی پرداخت"/></label>}{method==="credit"&&<div><label>تسهیلات اعتباری فعال<select value={facilityId} onChange={e=>setFacilityId(e.target.value)}><option value="">انتخاب کنید</option>{facilities.map(f=><option key={f.id} value={f.id}>{f.facility_no} · مانده {Number(f.available_amount).toLocaleString("fa-IR")} {f.currency}</option>)}</select></label>{facilities.length===0&&<p>تسهیلات فعال قابل مصرف برای این حساب پیدا نشد.</p>}</div>}
     <button disabled={busy||!items.length||(method==="credit"&&!facilityId)||(method==="manual"&&!paymentRef.trim())} onClick={checkoutAndPay}>{busy?"در حال ثبت و پرداخت...":method==="credit"?"پرداخت با اعتبار":"ثبت مرجع پرداخت"}</button>
     {orderId&&<div><p>شماره سفارش داخلی: {orderId}</p><Link href={"/store/checkout?cart="+encodeURIComponent(cartId)+"&order="+encodeURIComponent(orderId)}>مشاهده وضعیت ←</Link></div>}
    </article>
   </div>}
   {order&&<article className="product-card"><span>وضعیت سفارش</span><h3>{order.status==="paid"?"پرداخت موفق":"در حال پردازش"}</h3><p>شناسه سفارش: {order.id}</p><Link href="/store">بازگشت به فروشگاه</Link></article>}
  </section>
 </main>;
}


export default function CheckoutPage(){
 return <Suspense fallback={<main className="sookar-store" dir="rtl"><section className="store-section"><div className="product-card">در حال آماده‌سازی پرداخت...</div></section></main>}><CheckoutContent /></Suspense>;
}
