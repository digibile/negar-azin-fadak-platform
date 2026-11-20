"use client";

import {useEffect,useState} from "react";
import "./commerce-panel.css";

type Mode="commerce"|"domains"|"sellers"|"payments";
type Row=Record<string,any>;
const api=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const url=(p:string)=>api+p;
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";
async function get(path:string){
 const r=await fetch(url(path),{credentials:"include",cache:"no-store"});
 const body=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(body?.error||"دریافت اطلاعات انجام نشد");
 return body;
}
async function mutate(path:string,data:Row){
 const r=await fetch(url(path),{method:"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},body:JSON.stringify(data)});
 const body=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(body?.error||"عملیات انجام نشد");
 return body;
}
const date=(v:any)=>v?new Date(v).toLocaleDateString("fa-IR"):"-";
const links=[
 {title:"فروشگاه اینترنتی",description:"ویترین اصلی فروشگاه و تجربه خرید مشتری",href:"/store",kind:"public"},
 {title:"بازارگاه عمومی",description:"کشف کالاها و فروشگاه‌های فعال",href:"/marketplace",kind:"public"},
 {title:"مدیریت محصولات",description:"کاتالوگ، قیمت، تصویر، منبع کالا و وضعیت انتشار",href:"/marketplace/products"},
 {title:"دسته‌بندی کالاها",description:"ساختار دسته‌بندی و ترتیب نمایش در ویترین",href:"/marketplace/categories"},
 {title:"مدیریت فروشگاه‌ها",description:"فروشگاه‌های متصل به فروشندگان و وضعیت فعالیت",href:"/marketplace/stores"},
 {title:"مدیریت فروشندگان",description:"پروفایل، وضعیت و نرخ کارمزد فروشنده",href:"/marketplace/sellers"},
 {title:"مدیریت سفارش‌ها",description:"چرخه سفارش، آماده‌سازی، ارسال و تحویل",href:"/marketplace/orders"},
 {title:"تسویه فروشندگان",description:"مانده، کارمزد و وضعیت تسویه",href:"/marketplace/settlements"}
];
export default function CommercePanelWorkspace({mode}:{mode:Mode}){
 const [sellers,setSellers]=useState<Row[]>([]);
 const [stores,setStores]=useState<Row[]>([]);
 const [products,setProducts]=useState<Row[]>([]);
 const [categories,setCategories]=useState<Row[]>([]);
 const [orders,setOrders]=useState<Row[]>([]);
 const [domains,setDomains]=useState<Row[]>([]);
 const [settlements,setSettlements]=useState<Row[]>([]);
 const [selectedSeller,setSelectedSeller]=useState("");
 const [hostname,setHostname]=useState("");
 const [sslMode,setSslMode]=useState("managed");
 const [isPrimary,setIsPrimary]=useState(false);
 const [saving,setSaving]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const title=mode==="commerce"?"مرکز فرماندهی تجارت":mode==="domains"?"مدیریت دامنه‌های فروشگاه":mode==="sellers"?"مرکز فروشندگان": "مرکز پرداخت و تسویه";

 const load=async()=>{
  setLoading(true);setError("");
  try{
   if(mode==="domains"){
    const s=await get("/api/marketplace/sellers");setSellers(s.items||[]);
    const sid=selectedSeller||s.items?.[0]?.id||"";setSelectedSeller(sid);
    if(sid){const d=await get("/api/marketplace/sellers/"+encodeURIComponent(sid)+"/domains");setDomains(d.items||[]);}else setDomains([]);
   }else if(mode==="sellers"){
    const s=await get("/api/marketplace/sellers");setSellers(s.items||[]);
   }else if(mode==="payments"){
    const [p,s]=await Promise.all([get("/api/marketplace/settlements"),get("/api/marketplace/sellers")]);
    setSettlements(p.items||[]);setSellers(s.items||[]);
   }else{
    const [s,st,p,c,o,settle]=await Promise.all([
     get("/api/marketplace/sellers"),get("/api/marketplace/stores"),get("/api/marketplace/products"),
     get("/api/marketplace/categories"),get("/api/marketplace/orders"),get("/api/marketplace/settlements")
    ]);
    setSellers(s.items||[]);setStores(st.items||[]);setProducts(p.items||[]);
    setCategories(c.items||[]);setOrders(o.items||[]);setSettlements(settle.items||[]);
   }
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات");}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load();},[mode,selectedSeller]);

 const addDomain=async()=>{
  if(!selectedSeller||!hostname.trim())return setError("فروشنده و نام دامنه الزامی است.");
  setSaving(true);setError("");setNotice("");
  try{
   await mutate("/api/marketplace/sellers/"+encodeURIComponent(selectedSeller)+"/domains",{hostname:hostname.trim(),isPrimary,sslMode});
   setHostname("");setIsPrimary(false);setNotice("دامنه ثبت شد.");await load();
  }catch(e){setError(e instanceof Error?e.message:"ثبت دامنه انجام نشد");}
  finally{setSaving(false);}
 };
 const verifyDomain=async(id:string)=>{
  const token=window.prompt("کد تأیید دامنه را وارد کنید")||"";if(!token)return;
  setError("");setNotice("");
  try{await mutate("/api/marketplace/domains/"+encodeURIComponent(id)+"/verify",{token});setNotice("درخواست تأیید دامنه ثبت شد.");await load();}
  catch(e){setError(e instanceof Error?e.message:"تأیید دامنه انجام نشد");}
 };
 const metrics=[["فروشندگان",sellers.length],["فروشگاه‌ها",stores.length],["کالاها",products.length],["دسته‌بندی‌ها",categories.length],["سفارش‌ها",orders.length],["تسویه‌ها",settlements.length]];
 const recentOrders=[...orders].sort((a,b)=>new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime()).slice(0,6);
 return <main className="commerce-workspace" dir="rtl">
  <header className="commerce-head"><div><span className="commerce-eyebrow">منوی مرکزی سازمان · پنل ۰۹</span><h1>{title}</h1><p>یک نقطه ورود برای مدیریت فروشگاه، بازارگاه، کاتالوگ و چرخه سفارش؛ هر عملیات در صفحه اصلی خودش اجرا می‌شود.</p></div><div className="commerce-head-actions"><a href="/admin">مرکز مدیریت</a><button type="button" onClick={()=>void load()} disabled={loading}>بازخوانی اطلاعات</button></div></header>
  {error&&<div className="commerce-alert commerce-error" role="alert">{error}</div>}
  {notice&&<div className="commerce-alert commerce-success" role="status">{notice}</div>}
  {mode==="commerce"&&<>
   <section className="commerce-metrics">{metrics.map(([label,value])=><article key={String(label)}><small>{label}</small><strong>{loading?"…":Number(value).toLocaleString("fa-IR")}</strong></article>)}</section>
   <section className="commerce-panel"><div className="commerce-panel-title"><div><h2>دسترسی سریع به عملیات تجارت</h2><p>این پیوندها به صفحات canonical متصل‌اند و رابط موازی ایجاد نمی‌کنند.</p></div></div><div className="commerce-link-grid">{links.map((item,i)=><a className="commerce-link-card" href={item.href} key={item.href}><span>{String(i+1).padStart(2,"0")}</span><div><b>{item.title}</b><small>{item.description}</small></div><strong>←</strong></a>)}</div></section>
   <section className="commerce-panel"><div className="commerce-panel-title"><div><h2>آخرین سفارش‌ها</h2><p>آخرین سفارش‌های ثبت‌شده در محدوده سازمانی فعلی</p></div><a className="commerce-inline-link" href="/marketplace/orders">مشاهده همه سفارش‌ها</a></div><div className="commerce-records">{recentOrders.map(o=><article className="commerce-record" key={o.id}><div><b>{o.order_no}</b><small>{o.customer_ref||"بدون شناسه مشتری"} · {date(o.created_at)}</small></div><div className="commerce-record-meta"><strong>{Number(o.total_amount||0).toLocaleString("fa-IR")} ریال</strong><span className="commerce-status">{o.status}</span></div></article>)}{!recentOrders.length&&!loading&&<div className="commerce-empty">هنوز سفارشی ثبت نشده است.</div>}</div></section>
  </>}
  {mode==="domains"&&<section className="commerce-panel"><div className="commerce-panel-title"><div><h2>دامنه‌های اختصاصی فروشندگان</h2><p>ثبت دامنه، اتصال به فروشنده و پیگیری تأیید دامنه</p></div></div><select value={selectedSeller} onChange={e=>setSelectedSeller(e.target.value)}><option value="">انتخاب فروشنده</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select><div className="commerce-form"><input placeholder="shop.example.ir" value={hostname} onChange={e=>setHostname(e.target.value)}/><select value={sslMode} onChange={e=>setSslMode(e.target.value)}><option value="managed">SSL مدیریت‌شده</option><option value="external">SSL خارجی</option></select><label className="commerce-check"><input type="checkbox" checked={isPrimary} onChange={e=>setIsPrimary(e.target.checked)}/> دامنه اصلی</label><button disabled={saving||!selectedSeller||!hostname.trim()} onClick={addDomain}>ثبت دامنه</button></div><div className="commerce-records">{domains.map(d=><article className="commerce-record" key={d.id}><div><b>{d.hostname}</b><small>{d.verification_status} · SSL: {d.ssl_mode} · {d.is_primary?"دامنه اصلی":"دامنه عادی"}</small></div>{d.verification_status!=="verified"&&<button onClick={()=>verifyDomain(d.id)}>تأیید دامنه</button>}</article>)}{!domains.length&&!loading&&<div className="commerce-empty">برای این فروشنده دامنه‌ای ثبت نشده است.</div>}</div></section>}
  {mode==="sellers"&&<section className="commerce-panel"><div className="commerce-panel-title"><div><h2>مرکز فروشندگان</h2><p>{sellers.length.toLocaleString("fa-IR")} فروشنده در محدوده سازمانی فعلی</p></div></div><p className="commerce-note">ثبت، ویرایش، احراز و تغییر وضعیت فروشندگان در صفحه canonical مدیریت فروشندگان انجام می‌شود.</p><a className="commerce-primary-link" href="/marketplace/sellers">ورود به مدیریت فروشندگان ←</a></section>}
  {mode==="payments"&&<section className="commerce-panel"><div className="commerce-panel-title"><div><h2>مرکز پرداخت و تسویه</h2><p>نمای کلی وضعیت تسویه و دسترسی به مسیرهای پرداخت</p></div></div><div className="commerce-metrics commerce-metrics-compact"><article><small>تسویه‌ها</small><strong>{settlements.length.toLocaleString("fa-IR")}</strong></article><article><small>فروشندگان</small><strong>{sellers.length.toLocaleString("fa-IR")}</strong></article></div><div className="commerce-link-grid"><a className="commerce-link-card" href="/pay/payments"><span>۰۱</span><div><b>پرداخت‌ها</b><small>تاریخچه پرداخت‌های ثبت‌شده</small></div><strong>←</strong></a><a className="commerce-link-card" href="/marketplace/settlements"><span>۰۲</span><div><b>تسویه فروشندگان</b><small>مبالغ ناخالص، کارمزد و خالص تسویه</small></div><strong>←</strong></a></div></section>}
  {loading&&<div className="commerce-loading">در حال دریافت اطلاعات از سرویس عملیاتی…</div>}
 </main>;
}
