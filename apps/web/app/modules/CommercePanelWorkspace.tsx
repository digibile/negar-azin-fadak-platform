"use client";

import {useEffect,useMemo,useState} from "react";
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
async function mutate(path:string,method:string,data:Row){
 const r=await fetch(url(path),{method,credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},body:JSON.stringify(data)});
 const body=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(body?.error||"عملیات انجام نشد");
 return body;
}
const money=(v:any)=>v==null?"-":Number(v).toLocaleString("fa-IR");
const date=(v:any)=>v?new Date(v).toLocaleDateString("fa-IR"):"-";
const orderLabels:Record<string,string>={pending:"در انتظار تأیید",confirmed:"تأییدشده",paid:"پرداخت‌شده",processing:"در حال آماده‌سازی",shipped:"ارسال‌شده",delivered:"تحویل‌شده",returned:"مرجوع‌شده",cancelled:"لغوشده",refunded:"بازپرداخت‌شده"};
const orderNext:Record<string,string[]>={pending:["confirmed","cancelled"],confirmed:["cancelled"],paid:["processing"],processing:["shipped","returned"],shipped:["delivered","returned"],delivered:["returned"]};
const orderActions:Record<string,string>={confirmed:"تأیید سفارش",cancelled:"لغو سفارش",processing:"شروع آماده‌سازی",shipped:"ثبت ارسال",delivered:"ثبت تحویل",returned:"ثبت مرجوعی"};

export default function CommercePanelWorkspace({mode}:{mode:Mode}){
 const [tab,setTab]=useState(mode==="commerce"?"products":mode);
 const [sellers,setSellers]=useState<Row[]>([]);
 const [stores,setStores]=useState<Row[]>([]);
 const [products,setProducts]=useState<Row[]>([]);
 const [categories,setCategories]=useState<Row[]>([]);
 const [orders,setOrders]=useState<Row[]>([]);
 const [domains,setDomains]=useState<Row[]>([]);
 const [settlements,setSettlements]=useState<Row[]>([]);
 const [selectedDomainSeller,setSelectedDomainSeller]=useState("");
 const [form,setForm]=useState<Row>({});
 const [query,setQuery]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");

 const title=useMemo(()=>({commerce:"تجارت و فروشگاه‌ها",domains:"مدیریت دامنه‌ها",sellers:"فروشندگان",payments:"پرداخت و تسویه"} as Record<Mode,string>)[mode],[mode]);
 const load=async()=>{
  setLoading(true);setError("");setNotice("");
  try{
   if(mode==="domains"){
    const s=await get("/api/marketplace/sellers");setSellers(s.items||[]);
    const sid=selectedDomainSeller||s.items?.[0]?.id||"";setSelectedDomainSeller(sid);
    if(sid){const d=await get("/api/marketplace/sellers/"+encodeURIComponent(sid)+"/domains");setDomains(d.items||[]);}else setDomains([]);
   }else if(mode==="sellers"){
    const s=await get("/api/marketplace/sellers");setSellers(s.items||[]);
   }else if(mode==="payments"){
    const p=await get("/api/marketplace/settlements");setSettlements(p.items||[]);
   }else{
    const [s,st,p,c,o]=await Promise.all([
     get("/api/marketplace/sellers"),get("/api/marketplace/stores"),
     get("/api/marketplace/products"),get("/api/marketplace/categories"),
     get("/api/marketplace/orders")
    ]);
    setSellers(s.items||[]);setStores(st.items||[]);setProducts(p.items||[]);
    setCategories(c.items||[]);setOrders(o.items||[]);
   }
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات");}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load();},[mode,selectedDomainSeller]);

 const save=async(path:string,body:Row,success:string)=>{
  setSaving(true);setError("");setNotice("");
  try{await mutate(path,"POST",body);setForm({});setNotice(success);await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت اطلاعات انجام نشد");}
  finally{setSaving(false);}
 };
 const saveSeller=()=>save("/api/marketplace/sellers",{legalName:form.legalName,displayName:form.displayName,commissionRate:Number(form.commissionRate||0)},"فروشنده ثبت شد.");
 const saveStore=()=>save("/api/marketplace/stores",{sellerId:form.sellerId,code:form.code,name:form.name,slug:form.slug},"فروشگاه ثبت شد.");
 const saveCategory=()=>save("/api/marketplace/categories",{code:form.code,name:form.name,slug:form.slug||form.code,status:"active",sortOrder:Number(form.sortOrder||0)},"دسته‌بندی ثبت شد.");
 const saveProduct=()=>save("/api/marketplace/products",{sellerId:form.sellerId,storeId:form.storeId||null,sku:form.sku,title:form.title,description:form.description||"",category:form.categoryName||"",categoryId:form.categoryId||null,price:Number(form.price),discountPrice:form.discountPrice===""||form.discountPrice==null?null:Number(form.discountPrice),currency:form.currency||"IRR"},"کالا به‌صورت پیش‌نویس ثبت شد؛ انتشار آن به بررسی قیمت، تصویر و موجودی نیاز دارد.");

 const addDomain=async()=>{
  setSaving(true);setError("");setNotice("");
  try{await mutate("/api/marketplace/sellers/"+encodeURIComponent(selectedDomainSeller)+"/domains","POST",{hostname:form.hostname,storeId:form.storeId||null,isPrimary:Boolean(form.isPrimary),sslMode:form.sslMode||"managed"});setForm({});setNotice("دامنه ثبت شد.");await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت دامنه انجام نشد");}finally{setSaving(false);}
 };
 const verifyDomain=async(id:string)=>{
  const token=window.prompt("کد تأیید دامنه را وارد کنید")||"";if(!token)return;
  try{await mutate("/api/marketplace/domains/"+encodeURIComponent(id)+"/verify","POST",{token});setNotice("درخواست تأیید دامنه ثبت شد.");await load();}
  catch(e){setError(e instanceof Error?e.message:"تأیید دامنه انجام نشد");}
 };
 const statusSeller=async(id:string,status:string)=>{
  try{await mutate("/api/marketplace/sellers/"+encodeURIComponent(id)+"/status","PATCH",{status});setNotice("وضعیت فروشنده تغییر کرد.");await load();}
  catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت انجام نشد");}
 };
 const changeOrder=async(order:Row,next:string)=>{
  const reason=next==="cancelled"?(window.prompt("علت لغو سفارش را وارد کنید")||""):"";
  if(next==="cancelled"&&!reason.trim())return;
  try{await mutate("/api/marketplace/orders/"+encodeURIComponent(order.id)+"/status","PATCH",{status:next,reason});setNotice("وضعیت سفارش به‌روزرسانی شد.");await load();}
  catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت سفارش انجام نشد");}
 };

 const visibleProducts=products.filter(p=>!query||[p.sku,p.title,p.category,p.seller_name].some(v=>String(v||"").toLocaleLowerCase("fa").includes(query.toLocaleLowerCase("fa"))));
 const visibleOrders=orders.filter(o=>!query||[o.order_no,o.customer_ref,o.status,o.seller_name].some(v=>String(v||"").toLocaleLowerCase("fa").includes(query.toLocaleLowerCase("fa"))));
 const input=(key:string,placeholder:string,type="text")=><input type={type} placeholder={placeholder} value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})}/>;
 const sellerSelect=(key="sellerId")=><select value={form[key]||""} onChange={e=>setForm({...form,[key]:e.target.value})}><option value="">انتخاب فروشنده</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select>;

 return <main className="commerce-workspace" dir="rtl">
  <header className="commerce-head"><div><span className="commerce-eyebrow">منوی مرکزی سازمان · پنل ۰۹</span><h1>{title}</h1><p>مدیریت کاتالوگ، فروشگاه‌ها، فروشندگان، سفارش‌ها و ارتباط آن‌ها با چرخه مالی</p></div><div className="commerce-head-actions"><a href="/admin">مرکز مدیریت</a><button type="button" onClick={()=>void load()} disabled={loading}>بازخوانی اطلاعات</button></div></header>
  {error&&<div className="commerce-alert commerce-error" role="alert">{error}</div>}
  {notice&&<div className="commerce-alert commerce-success" role="status">{notice}</div>}
  {mode==="commerce"&&<nav className="commerce-tabs" aria-label="بخش‌های تجارت">{[["products","کالاها"],["categories","دسته‌بندی‌ها"],["stores","فروشگاه‌ها"],["sellers","فروشندگان"],["orders","سفارش‌ها"]].map(([k,v])=><button type="button" key={k} className={tab===k?"active":""} onClick={()=>{setTab(k);setQuery("");setError("");setNotice("");}}>{v}</button>)}</nav>}
  {mode==="sellers"&&<section className="commerce-panel"><div className="commerce-panel-title"><div><h2>ثبت فروشنده</h2><p>اطلاعات حقوقی و نرخ کارمزد فروشنده</p></div></div><div className="commerce-form">{input("legalName","نام حقوقی")}{input("displayName","نام نمایشی")}{input("commissionRate","نرخ کارمزد درصدی","number")}<button disabled={saving} onClick={saveSeller}>ثبت فروشنده</button></div><SellerList rows={sellers} onStatus={statusSeller}/></section>}
  {mode==="domains"&&<section className="commerce-panel"><div className="commerce-panel-title"><div><h2>دامنه‌های فروشندگان</h2><p>ثبت دامنه و پیگیری وضعیت تأیید و SSL</p></div></div><select value={selectedDomainSeller} onChange={e=>setSelectedDomainSeller(e.target.value)}><option value="">انتخاب فروشنده</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select><div className="commerce-form">{input("hostname","shop.example.ir")}<select value={form.sslMode||"managed"} onChange={e=>setForm({...form,sslMode:e.target.value})}><option value="managed">SSL مدیریت‌شده</option><option value="external">SSL خارجی</option></select><label className="commerce-check"><input type="checkbox" checked={Boolean(form.isPrimary)} onChange={e=>setForm({...form,isPrimary:e.target.checked})}/> دامنه اصلی</label><button disabled={!selectedDomainSeller||saving} onClick={addDomain}>ثبت دامنه</button></div><div className="commerce-records">{domains.map(d=><article key={d.id} className="commerce-record"><div><b>{d.hostname}</b><small>{d.verification_status} · SSL: {d.ssl_mode} · {d.is_primary?"دامنه اصلی":"دامنه عادی"}</small></div>{d.verification_status!=="verified"&&<button onClick={()=>verifyDomain(d.id)}>تأیید دامنه</button>}</article>)}{!domains.length&&!loading&&<Empty text="برای این فروشنده دامنه‌ای ثبت نشده است."/>}</div></section>}
  {mode==="payments"&&<section className="commerce-panel"><div className="commerce-panel-title"><div><h2>تسویه فروشندگان</h2><p>اطلاعات ثبت‌شده در چرخه تسویه</p></div></div><div className="commerce-records">{settlements.map(r=><article className="commerce-record" key={r.id}><div><b>{r.settlement_no}</b><small>{r.seller_name||r.seller_id} · {date(r.period_start)} تا {date(r.period_end)}</small></div><strong>{money(r.net_amount)} ریال · {r.status}</strong></article>)}{!settlements.length&&!loading&&<Empty text="رکورد تسویه‌ای برای نمایش وجود ندارد."/>}</div></section>}

  {mode==="commerce"&&tab==="sellers"&&<section className="commerce-panel"><div className="commerce-panel-title"><div><h2>فروشندگان</h2><p>{sellers.length.toLocaleString("fa-IR")} فروشنده در محدوده سازمانی</p></div></div><div className="commerce-form">{input("legalName","نام حقوقی")}{input("displayName","نام نمایشی")}{input("commissionRate","کارمزد درصدی","number")}<button disabled={saving} onClick={saveSeller}>ثبت فروشنده</button></div><SellerList rows={sellers} onStatus={statusSeller}/></section>}
  {mode==="commerce"&&tab==="stores"&&<section className="commerce-panel"><div className="commerce-panel-title"><div><h2>فروشگاه‌ها</h2><p>ایجاد فروشگاه متصل به فروشنده</p></div></div><div className="commerce-form">{sellerSelect()}{input("code","کد فروشگاه")}{input("name","نام فروشگاه")}{input("slug","نشانی کوتاه فروشگاه")}<button disabled={saving} onClick={saveStore}>ثبت فروشگاه</button></div><div className="commerce-records">{stores.map(s=><article className="commerce-record" key={s.id}><div><b>{s.name}</b><small>{s.code} · /store/{s.slug} · {s.seller_name||s.seller_id}</small></div><span>{s.status}</span></article>)}{!stores.length&&!loading&&<Empty text="فروشگاهی ثبت نشده است."/>}</div></section>}
  {mode==="commerce"&&tab==="categories"&&<section className="commerce-panel"><div className="commerce-panel-title"><div><h2>دسته‌بندی کالاها</h2><p>مدیریت دسته‌بندی‌های متصل به کاتالوگ بازارگاه</p></div></div><div className="commerce-form">{input("code","کد انگلیسی مانند mobile")}{input("name","نام دسته‌بندی")}{input("slug","نشانی کوتاه")}{input("sortOrder","ترتیب نمایش","number")}<button disabled={saving} onClick={saveCategory}>ثبت دسته‌بندی</button></div><div className="commerce-records">{categories.map(c=><article className="commerce-record" key={c.id}><div><b>{c.name}</b><small>{c.code} · /category/{c.slug}</small></div><span>{c.status}</span></article>)}{!categories.length&&!loading&&<Empty text="دسته‌بندی‌ای ثبت نشده است."/>}</div></section>}
  {mode==="commerce"&&tab==="products"&&<section className="commerce-panel"><div className="commerce-panel-title"><div><h2>کاتالوگ کالاها</h2><p>ثبت کالا در وضعیت پیش‌نویس تا زمان بررسی و تأیید اطلاعات</p></div><input className="commerce-search" placeholder="جست‌وجوی کالا، SKU یا فروشنده" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="commerce-form commerce-product-form">{sellerSelect()}{<select value={form.storeId||""} onChange={e=>setForm({...form,storeId:e.target.value})}><option value="">بدون فروشگاه مشخص</option>{stores.filter(s=>!form.sellerId||s.seller_id===form.sellerId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}{input("sku","شناسه کالا / SKU")}{input("title","عنوان کالا")}{input("price","قیمت به ریال","number")}<select value={form.categoryId||""} onChange={e=>{const c=categories.find(x=>x.id===e.target.value);setForm({...form,categoryId:e.target.value,categoryName:c?.name||""})}}><option value="">دسته‌بندی</option>{categories.filter(c=>c.status==="active").map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>{input("discountPrice","قیمت تخفیف","number")}<textarea placeholder="توضیحات کالا" value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/><button disabled={saving} onClick={saveProduct}>ثبت پیش‌نویس کالا</button></div><div className="commerce-records">{visibleProducts.map(p=><article className="commerce-record" key={p.id}><div><b>{p.title}</b><small>{p.sku} · {p.category_name||p.category||"بدون دسته"} · {p.seller_name||p.seller_id}</small></div><div className="commerce-record-meta"><strong>{money(p.price)} {p.currency==="IRR"?"ریال":p.currency}</strong><span className={"commerce-status status-"+p.status}>{p.status==="draft"?"پیش‌نویس":p.status}</span></div></article>)}{!visibleProducts.length&&!loading&&<Empty text="کالایی با این مشخصات پیدا نشد."/>}</div><p className="commerce-note">ثبت کالا به‌تنهایی آن را در فروشگاه عمومی منتشر نمی‌کند. بررسی تصویر داخلی، قیمت و موجودی و تأیید انتشار باید طبق چرخه عملیاتی انجام شود.</p></section>}
  {mode==="commerce"&&tab==="orders"&&<section className="commerce-panel"><div className="commerce-panel-title"><div><h2>مدیریت سفارش‌ها</h2><p>پیگیری سفارش و تغییر وضعیت فقط در انتقال‌های مجاز</p></div><input className="commerce-search" placeholder="جست‌وجوی شماره سفارش یا مشتری" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="commerce-records">{visibleOrders.map(o=><article className="commerce-record commerce-order" key={o.id}><div><b>{o.order_no}</b><small>{o.customer_ref||"بدون شناسه مشتری"} · {date(o.created_at)} · سهم فروشنده {money(o.seller_payable)} ریال</small><small>مبلغ کل {money(o.total_amount)} ریال · کارمزد {money(o.commission_amount)} ریال</small></div><div className="commerce-order-actions"><span className="commerce-status">{orderLabels[o.status]||o.status}</span>{(orderNext[o.status]||[]).map(next=><button key={next} className={next==="cancelled"?"commerce-danger":""} onClick={()=>changeOrder(o,next)}>{orderActions[next]}</button>)}</div></article>)}{!visibleOrders.length&&!loading&&<Empty text="سفارشی با این مشخصات پیدا نشد."/>}</div><p className="commerce-note">وضعیت پرداخت‌شده و بازپرداخت‌شده از این صفحه به‌صورت دستی ثبت نمی‌شود؛ این وضعیت‌ها باید از رویداد معتبر درگاه و چرخه بازپرداخت تأیید شوند.</p></section>}
  {loading&&<div className="commerce-loading">در حال دریافت اطلاعات از سرویس عملیاتی…</div>}
 </main>;
}

function SellerList({rows,onStatus}:{rows:Row[];onStatus:(id:string,status:string)=>void}){
 return <div className="commerce-records">{rows.map(s=><article className="commerce-record" key={s.id}><div><b>{s.display_name}</b><small>{s.legal_name} · کارمزد {s.commission_rate}% · {date(s.created_at)}</small></div><select value={s.status} onChange={e=>onStatus(s.id,e.target.value)}><option value="pending">در انتظار</option><option value="active">فعال</option><option value="suspended">معلق</option><option value="closed">بسته</option></select></article>)}{!rows.length&&<Empty text="فروشنده‌ای ثبت نشده است."/>}</div>;
}
function Empty({text}:{text:string}){return <div className="commerce-empty">{text}</div>;}
