"use client";

import {useEffect,useMemo,useState} from "react";

type Store={id:string;name:string;slug:string;seller_name:string};
type Product={id:string;sku:string;title:string;description:string|null;category:string|null;price:string;currency:string;seller_name:string;store_id:string|null};
type Catalog={tenant:{id:string;code:string;name:string};stores:Store[];products:Product[]};

export default function MarketplacePage(){
  const [catalog,setCatalog]=useState<Catalog|null>(null);
  const [q,setQ]=useState("");
  const [store,setStore]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch("/api/public/marketplace")
      .then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||"دریافت بازارگاه ناموفق بود");return b})
      .then(setCatalog)
      .catch(e=>setError(e instanceof Error?e.message:"خطا در دریافت بازارگاه"))
      .finally(()=>setLoading(false));
  },[]);

  const products=useMemo(()=>{
    if(!catalog)return [];
    const needle=q.trim().toLowerCase();
    return catalog.products.filter(p=>{
      const matchesStore=!store||p.store_id===store;
      const matchesQuery=!needle||(p.title+" "+p.sku+" "+(p.category||"")+" "+p.seller_name).toLowerCase().includes(needle);
      return matchesStore&&matchesQuery;
    });
  },[catalog,q,store]);

  if(loading)return <main className="marketplace-shell"><div className="marketplace-state">در حال دریافت کاتالوگ واقعی...</div></main>;
  if(error)return <main className="marketplace-shell"><div className="marketplace-state error">{error}</div></main>;
  if(!catalog)return null;

  return <main className="marketplace-shell" dir="rtl">
    <header className="marketplace-header"><nav className="marketplace-nav"><a href="/store">فروشگاه</a><a href="/marketplace">مارکت‌پلیس</a><a href="/marketplace/stores">فروشگاه‌ها</a><a href="/marketplace/sellers">فروشندگان</a><a href="/marketplace/products">محصولات</a><a href="/marketplace/orders">سفارش‌ها</a><a href="/marketplace/settlements">تسویه</a><a href="/pay">اعتبار و پرداخت</a><a href="/login">ورود</a></nav>
      <div><span className="section-kicker">پلتفرم بیزینس نگار آذین فدک ایران</span><h1>بازارگاه</h1><p>{catalog.tenant.name}</p></div>
      <a className="back-link" href="/store">بازگشت به فروشگاه</a>
    </header>
    <section className="marketplace-toolbar">
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجو در محصولات، فروشندگان و دسته‌بندی..." />
      <select value={store} onChange={e=>setStore(e.target.value)}>
        <option value="">همه فروشگاه‌ها</option>
        {catalog.stores.map(s=><option key={s.id} value={s.id}>{s.name} · {s.seller_name}</option>)}
      </select>
    </section>
    <section className="marketplace-stores">
      {catalog.stores.map(s=><a href={"/marketplace?store="+encodeURIComponent(s.id)} key={s.id}><b>{s.name}</b><span>{s.seller_name}</span></a>)}
    </section>
    <section className="marketplace-grid">
      {products.map(p=><a className="marketplace-product" key={p.id} href={"/store/product/"+encodeURIComponent(p.id)}>
        <div className="marketplace-product-meta"><span>{p.category||"محصول"}</span><small>{p.seller_name}</small></div>
        <h2>{p.title}</h2>
        <p>{p.description||"اطلاعات تکمیلی این محصول در کاتالوگ فروشنده ثبت نشده است."}</p>
        <footer><strong>{Number(p.price).toLocaleString("fa-IR")} {p.currency}</strong><span>{p.sku}</span></footer>
      </article>)}
      {!products.length&&<div className="marketplace-state">محصول فعالی مطابق فیلتر پیدا نشد.</div>}
    </section>
  </main>;
}
