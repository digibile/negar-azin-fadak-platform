"use client";

import Link from "next/link";
import {Suspense,useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";
import "./checkout-address.css";

type Cart={id:string;customer_ref:string;store_id:string;currency:string;status:string};
type Item={id:string;product_id:string;quantity:number;unit_price:string;sku:string;title:string};
type Facility={id:string;facility_no:string;approved_amount:string;available_amount:string;currency:string;status:string;product_code:string;interest_rate?:string|null;approved_term_months?:number|null};
type DeliveryMethod={id:string;code:string;title:string;carrier_type:string;business_days_min:number;business_days_max:number;base_cost:string;currency:string};

function CheckoutContent(){
 const search=useSearchParams();
 const cartId=search.get("cart")||"";
 const paymentNo=search.get("paymentNo")||"";
 const [cart,setCart]=useState<Cart|null>(null),[items,setItems]=useState<Item[]>([]);
 const [facilities,setFacilities]=useState<Facility[]>([]);
  const [deliveryMethods,setDeliveryMethods]=useState<DeliveryMethod[]>([]),[deliveryMethodId,setDeliveryMethodId]=useState("");
  const [deliveryPricingNote,setDeliveryPricingNote]=useState("");
 const [method,setMethod]=useState<"online"|"credit">("online");
 const [shippingAddress,setShippingAddress]=useState({recipientName:"",recipientPhone:"",province:"",city:"",addressLine:"",postalCode:"",unit:""});
 const [facilityId,setFacilityId]=useState("");
 const [orderId,setOrderId]=useState(search.get("order")||"");
 const [order,setOrder]=useState<any>(null),[pendingPaymentId,setPendingPaymentId]=useState("");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[error,setError]=useState("");
 const [paymentAttemptKey,setPaymentAttemptKey]=useState("");
 const csrf=()=>typeof document==="undefined"?"":document.cookie.split("; ").find(x=>x.startsWith("naf_csrf="))?.split("=")[1]||"";
 const headers=()=>({"content-type":"application/json","x-csrf-token":csrf()});
 const total=useMemo(()=>items.reduce((s,i)=>s+Number(i.unit_price)*Number(i.quantity),0),[items]);

 async function load(){
  if(!cartId&&!orderId){setLoading(false);return;}
  setLoading(true);setError("");
  try{
   if(cartId!=="history"&&!orderId){
    const r=await fetch("/api/checkout/carts/"+encodeURIComponent(cartId),{credentials:"include"});
    const b=await r.json();if(!r.ok)throw new Error(b.error||"دریافت سبد ناموفق بود");
    setCart(b.cart);setItems(b.items||[]);
     const dr=await fetch("/api/checkout/carts/"+encodeURIComponent(cartId)+"/delivery-methods",{credentials:"include"});const db=await dr.json();if(!dr.ok)throw new Error(db.error||"دریافت روش‌های ارسال ناموفق بود");setDeliveryMethods(db.items||[]);setDeliveryPricingNote(db.pricingNote||"");setDeliveryMethodId((current:string)=>(db.items||[]).some((x:DeliveryMethod)=>x.id===current)?current:(db.items||[])[0]?.id||"");
    const f=await fetch("/api/lendtech/my-facilities",{credentials:"include"});
    const fb=await f.json();if(f.ok){setFacilities(fb.items||[]);if((fb.items||[]).length)setFacilityId(fb.items[0].id);}
   }
   if(orderId){
    const or=await fetch("/api/marketplace/orders/"+encodeURIComponent(orderId),{credentials:"include"});
    const ob=await or.json();
    if(or.ok){
     setOrder({...ob.order,deliveryQuote:ob.deliveryQuote||null,items:ob.items||[],payments:ob.payments||[],refunds:ob.refunds||[]});setItems(ob.items||[]);
     if(ob.order.shipping_address)setShippingAddress(current=>({...current,...ob.order.shipping_address}));
     const latestPending=(ob.payments||[]).find((p:any)=>["pending","authorized"].includes(p.status));
     if(latestPending)setPendingPaymentId(latestPending.id);
     if(paymentNo){
      const pending=(ob.payments||[]).find((p:any)=>p.payment_no===paymentNo);
      if(pending&&["pending","authorized"].includes(pending.status)){
       setPendingPaymentId(pending.id);
       const vr=await fetch("/api/marketplace/payments/"+encodeURIComponent(pending.id)+"/verify",{method:"POST",credentials:"include",headers:headers(),body:JSON.stringify({})});
       const vb=await vr.json();
       if(!vr.ok)throw new Error(vb.error||"تأیید پرداخت از درگاه انجام نشد");
       if(["paid","failed"].includes(vb.status)){setPendingPaymentId("");setPaymentAttemptKey("");}
       setMessage(vb.status==="paid"?"پرداخت با تأیید مستقیم درگاه نهایی شد.":vb.status==="failed"?"درگاه این تلاش را ناموفق اعلام کرد؛ می‌توانید پرداخت را دوباره آغاز کنید.":"درگاه هنوز پرداخت را نهایی نکرده است؛ وضعیت سفارش در انتظار تأیید باقی می‌ماند.");
       const refreshed=await fetch("/api/marketplace/orders/"+encodeURIComponent(orderId),{credentials:"include"});
       const rb=await refreshed.json();if(refreshed.ok)setOrder({...rb.order,deliveryQuote:rb.deliveryQuote||null,items:rb.items||[],payments:rb.payments||[],refunds:rb.refunds||[]});
      }else if(pending?.status==="paid")setMessage("پرداخت این سفارش قبلاً تأیید شده است.");
     }
    }
   }
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت سبد");}
  finally{setLoading(false);}
 }
 async function verifyPendingPayment(){
  if(!pendingPaymentId||busy)return;
  setBusy(true);setError("");
  try{
   const r=await fetch("/api/marketplace/payments/"+encodeURIComponent(pendingPaymentId)+"/verify",{method:"POST",credentials:"include",headers:headers(),body:JSON.stringify({})});
   const b=await r.json();if(!r.ok)throw new Error(b.error||"بررسی وضعیت پرداخت ناموفق بود");
   if(["paid","failed"].includes(b.status)){setPendingPaymentId("");setPaymentAttemptKey("");}
   setMessage(b.status==="paid"?"پرداخت با تأیید درگاه نهایی شد.":b.status==="failed"?"درگاه پرداخت را ناموفق اعلام کرد؛ برای تلاش تازه دوباره پرداخت را آغاز کنید.":"درگاه هنوز پرداخت را تأیید نکرده است.");
   if(orderId){const or=await fetch("/api/marketplace/orders/"+encodeURIComponent(orderId),{credentials:"include"});const ob=await or.json();if(or.ok)setOrder({...ob.order,deliveryQuote:ob.deliveryQuote||null,items:ob.items||[],payments:ob.payments||[],refunds:ob.refunds||[]});}
  }catch(e){setError(e instanceof Error?e.message:"خطا در بررسی پرداخت");}
  finally{setBusy(false);}
 }
 async function acceptDeliveryQuote(){
  if(!orderId||busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/marketplace/orders/"+encodeURIComponent(orderId)+"/delivery-quote/accept",{method:"POST",credentials:"include",headers:headers(),body:JSON.stringify({})});
   const b=await r.json();if(!r.ok)throw new Error(b.error||"تأیید پیش‌فاکتور حمل ناموفق بود");
   const refreshed=await fetch("/api/marketplace/orders/"+encodeURIComponent(orderId),{credentials:"include"});
   const ob=await refreshed.json();if(!refreshed.ok)throw new Error(ob.error||"بازخوانی سفارش ناموفق بود");
   setOrder({...ob.order,deliveryQuote:ob.deliveryQuote||null,items:ob.items||[],payments:ob.payments||[],refunds:ob.refunds||[]});
   setMessage("هزینه ارسال تأیید شد. اکنون می‌توانید پرداخت مبلغ نهایی را انجام دهید.");
  }catch(e){setError(e instanceof Error?e.message:"تأیید هزینه ارسال ناموفق بود.");}
  finally{setBusy(false);}
 }
 async function checkoutAndPay(){
  if(!cartId||!items.length)return;
  if(orderId&&!order){setError("اطلاعات سفارش در حال دریافت است؛ کمی بعد دوباره تلاش کنید.");return;}
  if(!orderId&&!deliveryMethodId){setError("برای ادامه خرید، یک روش ارسال مجاز انتخاب کنید.");return;}
   if(!shippingAddress.recipientName.trim()||!shippingAddress.recipientPhone.trim()||!shippingAddress.province.trim()||!shippingAddress.city.trim()||!shippingAddress.addressLine.trim()||!shippingAddress.postalCode.trim()){setError("برای ادامه خرید، اطلاعات کامل نشانی تحویل را وارد کنید.");return;}
  setBusy(true);setError("");setMessage("");
  try{
   let oid=orderId;
   if(!oid){
    const cr=await fetch("/api/checkout/carts/"+encodeURIComponent(cartId)+"/checkout",{method:"POST",credentials:"include",headers:headers(),body:JSON.stringify({paymentMethod:method,shippingAddress,deliveryMethodId})});
    const cb=await cr.json();if(!cr.ok)throw new Error(cb.error||"ثبت سفارش ناموفق بود");
    oid=cb.order.id;setOrderId(oid);
    setMessage("سفارش ثبت شد. تا زمان صدور و تأیید پیش‌فاکتور حمل، امکان پرداخت وجود ندارد.");
    return;
   }else{
    const addressChanged=Object.keys(shippingAddress).some((key:string)=>String((shippingAddress as any)[key]||"")!==String((order.shipping_address||{})[key]||""));
    if(addressChanged){
     const ar=await fetch("/api/marketplace/orders/"+encodeURIComponent(oid)+"/shipping-address",{method:"PATCH",credentials:"include",headers:headers(),body:JSON.stringify({shippingAddress})});
     const ab=await ar.json();if(!ar.ok)throw new Error(ab.error||"ثبت نشانی تحویل ناموفق بود");
     const refreshed=await fetch("/api/marketplace/orders/"+encodeURIComponent(oid),{credentials:"include"});const rb=await refreshed.json();
     if(refreshed.ok)setOrder({...rb.order,deliveryQuote:rb.deliveryQuote||null,items:rb.items||[],payments:rb.payments||[],refunds:rb.refunds||[]});
     setMessage("نشانی تحویل تغییر کرد. پیش‌فاکتور قبلی باطل شد و باید هزینه ارسال برای نشانی جدید دوباره استعلام شود.");
     return;
    }
    if(order?.delivery_quote_required&&order?.delivery_quote_snapshot?.status!=="accepted"){setError("ابتدا پیش‌فاکتور هزینه ارسال را بررسی و تأیید کنید.");return;}
   }
   const attemptKey=paymentAttemptKey||("WEB-"+oid+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,10));
   if(!paymentAttemptKey)setPaymentAttemptKey(attemptKey);
   const pr=await fetch("/api/marketplace/orders/"+encodeURIComponent(oid)+"/payment",{method:"POST",credentials:"include",headers:headers(),body:JSON.stringify({
    method,creditFacilityId:method==="credit"?facilityId:undefined,idempotencyKey:attemptKey,cartId
   })});
   const pb=await pr.json();if(!pr.ok)throw new Error(pb.error||"پرداخت ناموفق بود");
   const paymentStatus=pb.status||pb.payment?.status||"pending";
   const resolvedOrder=pb.order||{id:oid,status:paymentStatus==="paid"?"paid":"pending"};
   setOrder(resolvedOrder);
   if(pb.payment?.id&&["pending","authorized"].includes(pb.payment.status))setPendingPaymentId(pb.payment.id);
   if(["paid","failed"].includes(paymentStatus)){setPendingPaymentId("");setPaymentAttemptKey("");}
   if(pb.redirectUrl){window.location.assign(pb.redirectUrl);return;}
   setMessage(resolvedOrder.status==="paid"||paymentStatus==="paid"?"پرداخت توسط سرویس پرداخت تأیید شد.":paymentStatus==="failed"?"درگاه این تلاش پرداخت را ناموفق اعلام کرد؛ با ثبت درخواست تازه می‌توانید دوباره پرداخت کنید.":"سفارش ثبت شد؛ وضعیت پرداخت هنوز نهایی نیست و باید از سرویس پرداخت پیگیری شود.");
  }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت سفارش");}
  finally{setBusy(false);}
 }
 useEffect(()=>{load();},[cartId,orderId]);
 if(!cartId&&!orderId)return <main className="sookar-store" dir="rtl"><section className="store-section"><div className="product-card sk-checkout-empty"><span>تکمیل خرید</span><h1>سبد یا سفارش مشخص نیست</h1><p>برای مشاهده سفارش، از بخش سفارش‌های حساب کاربری وارد شوید.</p><Link className="sk-checkout-primary" href="/account/orders">سفارش‌های من</Link></div></section></main>;
 return <main className="sookar-store" dir="rtl">
  <header className="store-header"><Link href="/store" className="store-logo"><b>سوکار</b><span>تکمیل خرید</span></Link><nav><Link href="/store">فروشگاه</Link><Link href="/marketplace">بازارگاه</Link><Link href="/pay">مرکز اعتبار</Link></nav></header>
  <section className="store-section sk-checkout-workspace">
   <div className="sk-checkout-progress" aria-label="مراحل خرید"><span className="is-current"><b>۱</b><small>بررسی سفارش</small></span><i /><span className="is-current"><b>۲</b><small>پرداخت</small></span><i /><span className={order?.status==="paid"?"is-complete":""}><b>۳</b><small>تأیید نهایی</small></span></div>
   <header className="sk-checkout-heading"><div><span>تسویه سفارش</span><h1>تکمیل خرید</h1><p>مبلغ و اقلام سفارش را بررسی کنید و سپس روش پرداخت را انتخاب کنید. وضعیت نهایی فقط بر اساس پاسخ سرویس پرداخت نمایش داده می‌شود.</p></div><Link href="/store/cart">بازگشت به سبد</Link></header>
   {error&&<div className="pay-notice" role="alert">{error}</div>}{message&&<div className="sk-checkout-message" role="status">{message}</div>}
   {order?.delivery_quote_required&&<article className="product-card sk-checkout-order-status">
    <span>پیش‌فاکتور حمل</span>
    {order.delivery_quote_snapshot?.status==="accepted"?<>
     <h3>هزینه ارسال تأیید شده است</h3>
     <p>شرکت حمل: {order.delivery_quote_snapshot.carrierName||"ثبت‌شده"}</p>
     <p>هزینه ارسال: {Number(order.shipping_amount||0).toLocaleString("fa-IR")} {order.currency||"IRR"}</p>
     <p>مبلغ نهایی سفارش: {Number(order.total_amount||0).toLocaleString("fa-IR")} {order.currency||"IRR"}</p>
    </>:<>
     <h3>در انتظار استعلام هزینه ارسال</h3>
     <p>پس از ثبت پیش‌فاکتور توسط واحد لجستیک، جزئیات هزینه در همین بخش نمایش داده می‌شود. پرداخت تا آن زمان غیرفعال است.</p>
     {order.deliveryQuote&&<div className="module-row"><strong>{order.deliveryQuote.carrier_name||"شرکت حمل"} · {order.deliveryQuote.service_name||"سرویس حمل"}</strong><span>{Number(order.deliveryQuote.customer_charge||0).toLocaleString("fa-IR")} {order.deliveryQuote.currency}</span></div>}
     {order.deliveryQuote&&<p>هزینه اعلامی شرکت حمل: {Number(order.deliveryQuote.carrier_cost||0).toLocaleString("fa-IR")} {order.deliveryQuote.currency}</p>}
     {order.deliveryQuote?.expires_at&&<p>اعتبار پیش‌فاکتور تا: {new Date(order.deliveryQuote.expires_at).toLocaleString("fa-IR")}</p>}
    </>}
    {order.deliveryQuote?.status==="offered"&&<button type="button" className="sk-checkout-secondary" disabled={busy} onClick={()=>void acceptDeliveryQuote()}>تأیید هزینه ارسال</button>}
   </article>}
   {loading?<div className="product-card sk-checkout-loading" role="status"><span className="sk-checkout-spinner" aria-hidden="true" />در حال دریافت سبد و بررسی وضعیت سفارش…</div>:cartId==="history"&&order?<article className="product-card sk-checkout-order-status"><span>پیگیری سفارش</span><h2>{order.order_no||order.id}</h2><p>وضعیت سفارش: {order.status}</p><p>وضعیت پرداخت: {order.payments?.[0]?.status||"ثبت نشده"}</p><p>مبلغ: {Number(order.total_amount||0).toLocaleString("fa-IR")} {order.currency||"IRR"}</p>{(order.items||[]).map((item:any)=><div className="module-row" key={item.id}><strong>{item.title}</strong><span>{Number(item.quantity).toLocaleString("fa-IR")} عدد</span></div>)}{pendingPaymentId&&<button type="button" className="sk-checkout-secondary" disabled={busy} onClick={verifyPendingPayment}>بررسی مجدد وضعیت پرداخت</button>}<Link href="/account/orders">بازگشت به سفارش‌های من</Link></article>:items.length===0?<div className="product-card sk-checkout-empty"><h2>سبد قابل تسویه نیست</h2><p>این سبد خالی است یا قبلاً تسویه شده. برای ثبت سفارش جدید، به فروشگاه برگردید.</p><Link className="sk-checkout-primary" href="/store/shop">مرور کالاها</Link></div>:<div className="plan-grid sk-checkout-grid">
    <article className="product-card sk-checkout-card sk-delivery-address"><span>اطلاعات تحویل</span><h3>نشانی دریافت سفارش</h3><p>این نشانی همراه سفارش ذخیره می‌شود و مبنای تحویل مرسوله خواهد بود.</p><div className="sk-delivery-address-grid"><label>نام گیرنده<input required value={shippingAddress.recipientName} onChange={e=>setShippingAddress(p=>({...p,recipientName:e.target.value}))} placeholder="نام و نام خانوادگی"/></label><label>شماره همراه گیرنده<input required inputMode="tel" value={shippingAddress.recipientPhone} onChange={e=>setShippingAddress(p=>({...p,recipientPhone:e.target.value}))} placeholder="09…"/></label><label>استان<input required value={shippingAddress.province} onChange={e=>setShippingAddress(p=>({...p,province:e.target.value}))} placeholder="استان"/></label><label>شهر<input required value={shippingAddress.city} onChange={e=>setShippingAddress(p=>({...p,city:e.target.value}))} placeholder="شهر"/></label><label className="wide">نشانی دقیق<input required value={shippingAddress.addressLine} onChange={e=>setShippingAddress(p=>({...p,addressLine:e.target.value}))} placeholder="خیابان، کوچه، پلاک، طبقه"/></label><label>کدپستی<input required inputMode="numeric" value={shippingAddress.postalCode} onChange={e=>setShippingAddress(p=>({...p,postalCode:e.target.value}))} placeholder="۱۰ رقم"/></label><label>واحد / پلاک تکمیلی<input value={shippingAddress.unit} onChange={e=>setShippingAddress(p=>({...p,unit:e.target.value}))} placeholder="اختیاری"/></label></div></article>
 {!orderId?<article className="product-card sk-checkout-card sk-delivery-method"><span>روش ارسال</span><h3>انتخاب روش تحویل</h3>{deliveryMethods.length===0?<p>برای همه کالاهای این سبد روش ارسال مشترک و فعالی تعریف نشده است. از مدیریت روش‌های ارسال، کالاها را به روش مناسب تخصیص دهید.</p>:deliveryMethods.map(d=><label className="sk-checkout-choice" key={d.id}><input type="radio" name="deliveryMethod" checked={deliveryMethodId===d.id} onChange={()=>setDeliveryMethodId(d.id)}/><span><strong>{d.title}</strong><small>{d.carrier_type} · {d.business_days_min} تا {d.business_days_max} روز کاری</small><small>تعرفه پایه: {Number(d.base_cost).toLocaleString("fa-IR")} {d.currency}</small></span></label>)}{deliveryPricingNote&&<p className="sk-checkout-disclaimer">{deliveryPricingNote}</p>}</article>:<article className="product-card sk-checkout-card sk-delivery-method"><span>روش ارسال ثبت‌شده</span><h3>{order?.delivery_method_snapshot?.title||"روش ارسال سفارش"}</h3><p>روش ارسال این سفارش پس از ثبت، قابل تغییر نیست.</p></article>}
     <article className="product-card sk-checkout-card"><span>خلاصه سفارش</span><h3>{items.length.toLocaleString("fa-IR")} قلم</h3>{items.map(i=><div key={i.id} className="module-row"><div><strong>{i.title}</strong><small>{i.sku} · تعداد {Number(i.quantity).toLocaleString("fa-IR")}</small></div><span>{(Number(i.unit_price)*Number(i.quantity)).toLocaleString("fa-IR")} {cart?.currency||"IRR"}</span></div>)}<hr/><strong>جمع کل: {total.toLocaleString("fa-IR")} {cart?.currency||"IRR"}</strong></article>
    <article className="product-card sk-checkout-card"><span>مرحله پرداخت</span><h3>انتخاب روش پرداخت</h3>
     <label className="sk-checkout-choice"><input type="radio" checked={method==="online"} onChange={()=>setMethod("online")}/> پرداخت آنلاین از درگاه متصل</label>
     <label className="sk-checkout-choice"><input type="radio" checked={method==="credit"} onChange={()=>setMethod("credit")}/> استفاده از اعتبار خرید فعال</label>
     {method==="online"&&<p className="sk-checkout-disclaimer">پرداخت فقط پس از تأیید درگاه واقعی نهایی می‌شود. واردکردن شماره مرجع به‌تنهایی پرداخت محسوب نمی‌شود.</p>}{method==="credit"&&<div><label>تسهیلات اعتباری فعال<select value={facilityId} onChange={e=>setFacilityId(e.target.value)}><option value="">انتخاب کنید</option>{facilities.map(f=><option key={f.id} value={f.id}>{f.facility_no} · مانده {Number(f.available_amount).toLocaleString("fa-IR")} {f.currency}</option>)}</select></label>{facilities.length===0&&<p>تسهیلات فعال قابل مصرف برای این حساب پیدا نشد.</p>}</div>}
     <button className="sk-checkout-primary" disabled={busy||!!pendingPaymentId||!items.length||(!orderId&&!deliveryMethodId)||(orderId&&(!order||(order.delivery_quote_required&&order?.delivery_quote_snapshot?.status!=="accepted")))||(method==="credit"&&!facilityId)} onClick={checkoutAndPay}>{busy?"در حال ثبت درخواست…":!orderId?"ثبت سفارش و درخواست استعلام ارسال":method==="credit"?"پرداخت مبلغ نهایی با اعتبار خرید":"پرداخت مبلغ نهایی"}</button>
     {pendingPaymentId&&<button type="button" className="sk-checkout-secondary" disabled={busy} onClick={verifyPendingPayment}>{busy?"در حال بررسی…":"بررسی مجدد وضعیت پرداخت"}</button>}
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
