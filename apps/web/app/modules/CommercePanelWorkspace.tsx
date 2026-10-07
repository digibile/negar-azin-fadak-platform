"use client";

import {useEffect,useMemo,useState} from "react";

type Mode="commerce"|"domains"|"sellers"|"payments";\ntype CommerceTab="sellers"|"stores"|"products"|"orders";
type Row=Record<string,any>;

const api=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const url=(p:string)=>api+p;
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";

async function get(path:string){
 const r=await fetch(url(path),{credentials:"include"});
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

export default function CommercePanelWorkspace({mode}:{mode:Mode}){
 const [tab,setTab]=useState<string>(mode==="commerce"?"sellers":mode);
 const [rows,setRows]=useState<Row[]>([]);
 const [sellers,setSellers]=useState<Row[]>([]);
 const [stores,setStores]=useState<Row[]>([]);
 const [selectedSeller,setSelectedSeller]=useState("");
 const [selectedDomainSeller,setSelectedDomainSeller]=useState("");
 const [domains,setDomains]=useState<Row[]>([]);
 const [settlements,setSettlements]=useState<Row[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [form,setForm]=useState<Row>({});
 const [saving,setSaving]=useState(false);

 const title=useMemo(()=>({commerce:"تجارت و فروشگاه‌ها",domains:"مدیریت دامنه‌ها",sellers:"فروشندگان",payments:"پرداخت و تسویه"} as Record<Mode,string>)[mode],[mode]);

 const load=async()=>{
  setLoading(true);setError("");
  try{
   if(mode==="domains"){
    const s=await get("/api/marketplace/sellers"); setSellers(s.items||[]);
    const sid=selectedDomainSeller||s.items?.[0]?.id||"";
    setSelectedDomainSeller(sid);
    if(sid){const d=await get("/api/marketplace/sellers/"+encodeURIComponent(sid)+"/domains");setDomains(d.items||[]);}
   }else if(mode==="sellers"){
    const s=await get("/api/marketplace/sellers");setRows(s.items||[]);setSellers(s.items||[]);
   }else if(mode==="payments"){
    const p=await get("/api/marketplace/settlements");setSettlements(Array.isArray(p)?p:(p.items||[]));
   }else{
    const [s,st,p,o]=await Promise.all([
     get("/api/marketplace/sellers"),get("/api/marketplace/stores"),get("/api/marketplace/products"),get("/api/marketplace/orders")
    ]);
    setSellers(s.items||[]);setStores(st.items||[]);
    setRows([{kind:"products",items:p.items||[]},{kind:"orders",items:o.items||[]}]);
   }
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات")}
  finally{setLoading(false)}
 };

 useEffect(()=>{load()},[mode,selectedDomainSeller]);

 const saveSeller=async()=>{
  setSaving(true);setError("");
  try{await mutate("/api/marketplace/sellers","POST",{legalName:form.legalName,displayName:form.displayName,commissionRate:Number(form.commissionRate||0)});setForm({});await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت فروشنده انجام نشد")}finally{setSaving(false)}
 };
 const saveStore=async()=>{
  setSaving(true);setError("");
  try{await mutate("/api/marketplace/stores","POST",{sellerId:form.sellerId,code:form.code,name:form.name,slug:form.slug});setForm({});await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت فروشگاه انجام نشد")}finally{setSaving(false)}
 };
 const addDomain=async()=>{
  setSaving(true);setError("");
  try{await mutate("/api/marketplace/sellers/"+encodeURIComponent(selectedDomainSeller)+"/domains","POST",{hostname:form.hostname,storeId:form.storeId||null,isPrimary:Boolean(form.isPrimary),sslMode:form.sslMode||"managed"});setForm({});await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت دامنه انجام نشد")}finally{setSaving(false)}
 };
 const verifyDomain=async(id:string)=>{
  const token=window.prompt("کد تأیید دامنه را وارد کنید")||"";
  if(!token)return;
  setError("");
  try{await mutate("/api/marketplace/domains/"+encodeURIComponent(id)+"/verify","POST",{token});await load();}
  catch(e){setError(e instanceof Error?e.message:"تأیید دامنه انجام نشد")}
 };
 const statusSeller=async(id:string,status:string)=>{
  try{await mutate("/api/marketplace/sellers/"+encodeURIComponent(id)+"/status","PATCH",{status});await load();}
  catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت انجام نشد")}
 };

 const productItems=(rows.find(x=>x.kind==="products")?.items||[]) as Row[];
 const orderItems=(rows.find(x=>x.kind==="orders")?.items||[]) as Row[];

 return <main className="module-runtime canonical-module" dir="rtl">
  <header className="page-head">
   <div><span className="eyebrow">منوی مرکزی سازمان · عملیات واقعی</span><h1>{title}</h1><p className="muted">اتصال مستقیم به API و PostgreSQL. هیچ رکورد نمایشی یا داده ساختگی در این پنل تولید نمی‌شود.</p></div>
   <a className="back-link" href="/admin">مرکز مدیریت</a>
  </header>
  {error&&<div className="error runtime-error">{error}</div>}
  <nav className="module-subnav">
   {(mode==="commerce"?["sellers","stores","products","orders"]:mode==="domains"?["domains"]:mode==="sellers"?["sellers"]:["payments"]).map(x=><button type="button" className={tab===x?"active":""} key={x} onClick={()=>setTab(x)}>{({sellers:"فروشندگان",stores:"فروشگاه‌ها",products:"محصولات",orders:"سفارش‌ها",domains:"دامنه‌ها",payments:"تسویه‌ها"} as any)[x]}</button>)}
  </nav>

  {mode==="sellers"&&<section className="runtime-panel">
   <div className="panel-title"><div><h2>فروشندگان</h2><span>{rows.length} رکورد واقعی</span></div></div>
   <div className="control-grid"><input placeholder="نام حقوقی" value={form.legalName||""} onChange={e=>setForm({...form,legalName:e.target.value})}/><input placeholder="نام نمایشی" value={form.displayName||""} onChange={e=>setForm({...form,displayName:e.target.value})}/><input type="number" min="0" max="100" placeholder="کمیسیون %" value={form.commissionRate||""} onChange={e=>setForm({...form,commissionRate:e.target.value})}/><button disabled={saving} onClick={saveSeller}>ثبت فروشنده</button></div>
   <div className="record-list">{rows.map(r=><article className="record-row" key={r.id}><div><strong>{r.display_name}</strong><small>{r.legal_name} · کمیسیون {r.commission_rate}% · ایجاد {date(r.created_at)}</small></div><select value={r.status} onChange={e=>statusSeller(r.id,e.target.value)}><option value="pending">در انتظار</option><option value="active">فعال</option><option value="suspended">معلق</option><option value="closed">بسته</option></select></article>)}</div>
  </section>}

  {mode==="domains"&&<section className="runtime-panel">
   <div className="panel-title"><div><h2>دامنه‌های فروشندگان</h2><span>ثبت، مشاهده و تأیید واقعی دامنه</span></div></div>
   <select value={selectedDomainSeller} onChange={e=>setSelectedDomainSeller(e.target.value)}><option value="">فروشنده را انتخاب کنید</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select>
   <div className="control-grid"><input placeholder="example.ir" value={form.hostname||""} onChange={e=>setForm({...form,hostname:e.target.value})}/><input placeholder="شناسه فروشگاه، در صورت نیاز" value={form.storeId||""} onChange={e=>setForm({...form,storeId:e.target.value})}/><select value={form.sslMode||"managed"} onChange={e=>setForm({...form,sslMode:e.target.value})}><option value="managed">SSL مدیریت‌شده</option><option value="external">SSL خارجی</option></select><button disabled={!selectedDomainSeller||saving} onClick={addDomain}>ثبت دامنه</button></div>
   <div className="record-list">{domains.map(d=><article className="record-row" key={d.id}><div><strong>{d.hostname}</strong><small>{d.verification_status} · SSL: {d.ssl_mode} · {d.is_primary?"دامنه اصلی":"دامنه عادی"}</small></div>{d.verification_status!=="verified"&&<button onClick={()=>verifyDomain(d.id)}>تأیید</button>}</article>)}</div>
  </section>}

  {mode==="payments"&&<section className="runtime-panel">
   <div className="panel-title"><div><h2>تسویه فروشندگان</h2><span>{settlements.length} رکورد واقعی · چرخه تأیید و پرداخت در API موجود است</span></div></div>
   <div className="record-list">{settlements.map(r=><article className="record-row" key={r.id}><div><strong>{r.settlement_no}</strong><small>{r.seller_name||r.seller_id} · مبلغ خالص {money(r.net_amount)} · {r.period_start?date(r.period_start):"-"} تا {r.period_end?date(r.period_end):"-"}</small></div><span>{r.status}</span></article>)}</div>
  </section>}

  {mode==="commerce"&&tab==="sellers"&&<section className="runtime-panel"><div className="panel-title"><div><h2>فروشندگان</h2><span>{sellers.length} رکورد واقعی</span></div></div><div className="record-list">{sellers.map(s=><article className="record-row" key={s.id}><div><strong>{s.display_name}</strong><small>{s.legal_name} · کمیسیون {s.commission_rate}%</small></div><span>{s.status}</span></article>)}</div></section>}
  {mode==="commerce"&&tab==="stores"&&<section className="runtime-panel"><div className="panel-title"><div><h2>فروشگاه‌ها</h2><span>{stores.length} رکورد واقعی</span></div></div><div className="control-grid"><select value={form.sellerId||""} onChange={e=>setForm({...form,sellerId:e.target.value})}><option value="">فروشنده</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select><input placeholder="کد" value={form.code||""} onChange={e=>setForm({...form,code:e.target.value})}/><input placeholder="نام" value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder="slug" value={form.slug||""} onChange={e=>setForm({...form,slug:e.target.value})}/><button disabled={saving} onClick={saveStore}>ثبت فروشگاه</button></div><div className="record-list">{stores.map(s=><article className="record-row" key={s.id}><div><strong>{s.name}</strong><small>{s.code} · {s.slug} · {s.seller_name||s.seller_id}</small></div><span>{s.status}</span></article>)}</div></section>}
  {mode==="commerce"&&tab==="products"&&<section className="runtime-panel"><div className="panel-title"><div><h2>محصولات</h2><span>{productItems.length} رکورد واقعی</span></div></div><div className="record-list">{productItems.map(p=><article className="record-row" key={p.id}><div><strong>{p.title}</strong><small>{p.sku} · {money(p.price)} {p.currency} · {p.seller_name||p.seller_id}</small></div><span>{p.status}</span></article>)}</div></section>}
  {mode==="commerce"&&tab==="orders"&&<section className="runtime-panel"><div className="panel-title"><div><h2>سفارش‌ها</h2><span>{orderItems.length} رکورد واقعی</span></div></div><div className="record-list">{orderItems.map(o=><article className="record-row" key={o.id}><div><strong>{o.order_no}</strong><small>{o.customer_ref||"بدون شناسه مشتری"} · مبلغ {money(o.total_amount)} {o.currency} · سهم فروشنده {money(o.seller_payable)}</small></div><span>{o.status}</span></article>)}</div></section>}
  {loading&&<div className="runtime-panel"><p className="muted">در حال دریافت داده واقعی...</p></div>}
 </main>;
}
