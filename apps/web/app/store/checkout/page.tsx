"use client";
import Link from "next/link";
import {useState} from "react";

export default function CheckoutPage(){
 const [cartId,setCartId]=useState(""); const [customerRef,setCustomerRef]=useState(""); const [storeId,setStoreId]=useState(""); const [status,setStatus]=useState("");
 async function createCart(){
  setStatus("در حال ایجاد سبد واقعی...");
  const r=await fetch("/api/checkout/carts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({customerRef,storeId})});
  const b=await r.json(); if(!r.ok){setStatus(b.error||"ایجاد سبد ناموفق بود");return;} setCartId(b.id);setStatus("سبد ایجاد شد: "+b.id);
 }
 return <main className="sookar-store" dir="rtl"><header className="store-header"><Link href="/store" className="store-logo"><b>سوکار</b><span>پرداخت و ثبت سفارش</span></Link><nav><Link href="/store">فروشگاه</Link><Link href="/marketplace">بازارگاه</Link><Link href="/pay">Sookar Pay</Link></nav></header><section className="store-section"><header><div><span>Checkout</span><h2>ثبت سفارش</h2></div><Link href="/store/cart">بازگشت به سبد</Link></header><div className="plan-grid"><article><h3>شروع Checkout واقعی</h3><p>این مرحله به سرویس Checkout متصل است و اطلاعات ساختگی سفارش تولید نمی‌کند.</p><input value={customerRef} onChange={e=>setCustomerRef(e.target.value)} placeholder="شناسه مشتری"/><input value={storeId} onChange={e=>setStoreId(e.target.value)} placeholder="شناسه فروشگاه"/><button onClick={createCart}>ایجاد سبد</button>{status&&<p>{status}</p>}</article><article><h3>مراحل</h3><p>سبد ← اقلام ← کنترل موجودی ← سفارش ← پرداخت ← ثبت حسابداری و رویداد.</p>{cartId&&<Link href={"/store/checkout?cart="+encodeURIComponent(cartId)}>ادامه سبد {cartId.slice(0,8)} ←</Link>}</article></div></section></main>
}