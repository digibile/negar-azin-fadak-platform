"use client";

import {useEffect,useMemo,useState} from "react";

type Mode="commerce"|"domains"|"sellers"|"payments";
type PanelTab="domains"|"sellers"|"payments";

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
 const [licenses,setLicenses]=useState<Row[]>([]);
 const [sellerPermissions,setSellerPermissions]=useState<Row[]>([]);
 const [selectedSellerId,setSelectedSellerId]=useState("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [form,setForm]=useState<Row>({});
 const [saving,setSaving]=useState(false);
 const [periodStart,setPeriodStart]=useState("");
 const [periodEnd,setPeriodEnd]=useState("");

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
    const s=await get("/api/marketplace/sellers");setRows(s.items||[]);setSellers(s.items||[]);const sid=selectedSellerId||s.items?.[0]?.id||"";setSelectedSellerId(sid);if(sid){const [l,p]=await Promise.all([get("/api/marketplace/sellers/"+encodeURIComponent(sid)+"/licenses"),get("/api/marketplace/sellers/"+encodeURIComponent(sid)+"/permissions")]);setLicenses(l.items||[]);setSellerPermissions(p.items||[]);}
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
 const chooseSeller=async(id:string)=>{
  setSelectedSellerId(id);setError("");setLicenses([]);setSellerPermissions([]);
  if(!id)return;
  try{const [l,p]=await Promise.all([get("/api/marketplace/sellers/"+encodeURIComponent(id)+"/licenses"),get("/api/marketplace/sellers/"+encodeURIComponent(id)+"/permissions")]);setLicenses(l.items||[]);setSellerPermissions(p.items||[]);}
  catch(e){setError(e instanceof Error?e.message:"دریافت پرونده فروشنده انجام نشد")}
 };
 const addLicense=async()=>{
  if(!selectedSellerId||!form.licenseType||!form.licenseNo)return setError("فروشنده، نوع و شماره مجوز الزامی است.");
  setSaving(true);setError("");
  try{await mutate("/api/marketplace/sellers/"+encodeURIComponent(selectedSellerId)+"/licenses","POST",{licenseType:form.licenseType,licenseNo:form.licenseNo,issuer:form.issuer,issuedAt:form.issuedAt||null,expiresAt:form.expiresAt||null,status:form.licenseStatus||"pending",documentRef:form.documentRef});setForm({});await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت مجوز انجام نشد")}finally{setSaving(false)}
 };
 const savePermissions=async()=>{
  if(!selectedSellerId)return;
  setSaving(true);setError("");
  try{await mutate("/api/marketplace/sellers/"+encodeURIComponent(selectedSellerId)+"/permissions","PUT",{items:sellerPermissions.map(p=>({permission:p.permission,enabled:Boolean(p.enabled)}))});await load();}
  catch(e){setError(e instanceof Error?e.message:"ذخیره دسترسی‌ها انجام نشد")}finally{setSaving(false)}
 };
 const saveProduct=async()=>{
  if(!form.sellerId||!form.sku||!form.title||Number(form.price)<=0)return setError("فروشنده، شناسه کالا، عنوان و قیمت معتبر الزامی است.");
  setSaving(true);setError("");
  try{await mutate("/api/marketplace/products","POST",{sellerId:form.sellerId,storeId:form.storeId||null,sku:form.sku,title:form.title,description:form.description||"",category:form.category||"",price:Number(form.price),discountPrice:form.discountPrice===""?null:Number(form.discountPrice),currency:form.currency||"IRR"});setForm({});await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت محصول انجام نشد")}finally{setSaving(false)}
 };
 const changeStoreStatus=async(id:string,status:string)=>{
  if(!window.confirm("وضعیت فروشگاه تغییر کند؟"))return;
  try{await mutate("/api/marketplace/stores/"+encodeURIComponent(id)+"/status","PATCH",{status});await load();}
  catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت فروشگاه انجام نشد")}
 };
 const updateProductInventory=async(p:Row)=>{
  const quantity=window.prompt("تعداد موجودی واقعی را وارد کنید:",String(p.attributes?.inventoryQuantity??0));
  if(quantity===null)return;
  const source=window.prompt("منبع موجودی (فروشنده یا تأمین‌کننده):",String(p.attributes?.inventorySource??""));
  if(source===null||!source.trim())return setError("منبع موجودی الزامی است.");
  const sourceType=window.prompt("نوع منبع: seller-owned یا supplier-verified",String(p.attributes?.sourceType??"seller-owned"));
  if(sourceType===null||!["seller-owned","supplier-verified"].includes(sourceType))return setError("نوع منبع موجودی معتبر نیست.");
  const supplierReference=sourceType==="supplier-verified"?(window.prompt("شناسه یا مرجع تأمین‌کننده:")||""):"";
  if(sourceType==="supplier-verified"&&!supplierReference.trim())return setError("مرجع تأمین‌کننده الزامی است.");
  const verified=window.confirm("اطلاعات موجودی و منبع را بررسی کرده‌اید و تأیید می‌کنید؟");
  try{await mutate("/api/marketplace/products/"+encodeURIComponent(p.id)+"/inventory","PATCH",{quantity:Number(quantity),source,sourceType,supplierReference,verified});await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت موجودی انجام نشد")}
 };
 const changeProductStatus=async(id:string,status:string)=>{
  if(!window.confirm(status==="active"?"محصول پس از بررسی قیمت، فروشنده و موجودی منتشر شود؟":"وضعیت محصول تغییر کند؟"))return;
  try{await mutate("/api/marketplace/products/"+encodeURIComponent(id)+"/status","PATCH",{status});await load();}
  catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت محصول انجام نشد")}
 };
 const changeOrderStatus=async(id:string,status:string)=>{
  const reason=status==="cancelled"?(window.prompt("علت لغو سفارش را وارد کنید:")||"").trim():"";
  if(status==="cancelled"&&!reason)return setError("علت لغو سفارش الزامی است.");
  if(!window.confirm("وضعیت سفارش به‌روزرسانی شود؟"))return;
  try{await mutate("/api/marketplace/orders/"+encodeURIComponent(id)+"/status","PATCH",{status,reason});await load();}
  catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت سفارش انجام نشد")}
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
  if(!window.confirm("رکورد TXT دامنه را ثبت کرده‌اید؟ سامانه اکنون DNS را بررسی می‌کند."))return;
  setError("");
  try{await mutate("/api/marketplace/domains/"+encodeURIComponent(id)+"/verify","POST",{});await load();}
  catch(e){setError(e instanceof Error?e.message:"تأیید DNS دامنه انجام نشد")}
 };
 const generateSettlements=async()=>{
  if(!periodStart||!periodEnd)return setError("ابتدا بازه شروع و پایان را مشخص کنید.");
  if(!window.confirm("برای سفارش‌های پرداخت‌شده این بازه، تسویه‌های فروشندگان ایجاد شود؟"))return;
  setSaving(true);setError("");
  try{await mutate("/api/marketplace/settlements/generate","POST",{periodStart:periodStart+"T00:00:00.000Z",periodEnd:periodEnd+"T23:59:59.999Z"});await load();}
  catch(e){setError(e instanceof Error?e.message:"ایجاد تسویه انجام نشد")}finally{setSaving(false)}
 };
 const approveSettlement=async(id:string)=>{
  if(!window.confirm("تسویه تأیید شود؟ پس از تأیید، امکان ثبت پرداخت فراهم می‌شود."))return;
  try{await mutate("/api/marketplace/settlements/"+encodeURIComponent(id)+"/approve","PATCH",{});await load();}
  catch(e){setError(e instanceof Error?e.message:"تأیید تسویه انجام نشد")}
 };
 const paySettlement=async(id:string)=>{
  const paymentRef=window.prompt("شماره سند یا شناسه پیگیری بانکی (در صورت وجود):")||"";
  if(!window.confirm("ثبت پرداخت در دفترکل و تغییر وضعیت تسویه به پرداخت‌شده انجام شود؟ شماره پیگیری واردشده صرفاً مرجع ثبت است و انتقال بانکی انجام نمی‌دهد."))return;
  try{await mutate("/api/marketplace/settlements/"+encodeURIComponent(id)+"/pay","POST",{paymentRef});await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت پرداخت انجام نشد")}
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
   {(mode==="commerce"?["sellers","stores","products","orders"]:mode==="domains"?["domains"]:mode==="sellers"?["sellers","licenses","permissions"]:["payments"]).map(x=><button type="button" className={tab===x?"active":""} key={x} onClick={()=>setTab(x)}>{({sellers:"فروشندگان",stores:"فروشگاه‌ها",products:"محصولات",orders:"سفارش‌ها",domains:"دامنه‌ها",payments:"تسویه‌ها",licenses:"مجوزها",permissions:"دسترسی‌ها"} as any)[x]}</button>)}
  </nav>

  {mode==="sellers"&&<section className="runtime-panel">
   <div className="panel-title"><div><h2>فروشندگان</h2><span>{rows.length} رکورد واقعی</span></div></div>
   <div className="control-grid"><input placeholder="نام حقوقی" value={form.legalName||""} onChange={e=>setForm({...form,legalName:e.target.value})}/><input placeholder="نام نمایشی" value={form.displayName||""} onChange={e=>setForm({...form,displayName:e.target.value})}/><input type="number" min="0" max="100" placeholder="کمیسیون %" value={form.commissionRate||""} onChange={e=>setForm({...form,commissionRate:e.target.value})}/><button disabled={saving} onClick={saveSeller}>ثبت فروشنده</button></div>
   <div className="record-list">{rows.map(r=><article className="record-row" key={r.id}><div><strong>{r.display_name}</strong><small>{r.legal_name} · کمیسیون {r.commission_rate}% · ایجاد {date(r.created_at)}</small></div><select value={r.status} onChange={e=>statusSeller(r.id,e.target.value)}><option value="pending">در انتظار</option><option value="active">فعال</option><option value="suspended">معلق</option><option value="closed">بسته</option></select></article>)}</div>
  </section>}

  {mode==="sellers"&&(tab==="licenses"||tab==="permissions")&&<section className="runtime-panel">
   <div className="panel-title"><div><h2>{tab==="licenses"?"مجوزها و مدارک فروشنده":"دسترسی‌های فروشنده"}</h2><span>پرونده متصل به فروشنده انتخاب‌شده</span></div></div>
   <select value={selectedSellerId} onChange={e=>chooseSeller(e.target.value)}><option value="">انتخاب فروشنده</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select>
   {tab==="licenses"&&<><div className="control-grid"><input placeholder="نوع مجوز" value={form.licenseType||""} onChange={e=>setForm({...form,licenseType:e.target.value})}/><input placeholder="شماره مجوز" value={form.licenseNo||""} onChange={e=>setForm({...form,licenseNo:e.target.value})}/><input placeholder="مرجع صادرکننده" value={form.issuer||""} onChange={e=>setForm({...form,issuer:e.target.value})}/><input type="date" aria-label="تاریخ صدور" value={form.issuedAt||""} onChange={e=>setForm({...form,issuedAt:e.target.value})}/><input type="date" aria-label="تاریخ انقضا" value={form.expiresAt||""} onChange={e=>setForm({...form,expiresAt:e.target.value})}/><input placeholder="شناسه سند بایگانی" value={form.documentRef||""} onChange={e=>setForm({...form,documentRef:e.target.value})}/><select value={form.licenseStatus||"pending"} onChange={e=>setForm({...form,licenseStatus:e.target.value})}><option value="pending">در انتظار</option><option value="active">فعال</option><option value="expired">منقضی</option><option value="revoked">لغوشده</option></select><button disabled={saving||!selectedSellerId} onClick={addLicense}>ثبت مجوز</button></div><div className="record-list">{licenses.map(l=><article className="record-row" key={l.id}><div><strong>{l.license_type} · {l.license_no}</strong><small>{l.issuer||"مرجع نامشخص"} · انقضا: {l.expires_at?date(l.expires_at):"ثبت نشده"} · سند: {l.document_ref||"متصل نشده"}</small></div><span>{l.status}</span></article>)}</div></>}
   {tab==="permissions"&&<><div className="record-list">{sellerPermissions.map((p,i)=><article className="record-row" key={p.permission}><strong>{p.permission}</strong><label><input type="checkbox" checked={Boolean(p.enabled)} onChange={e=>setSellerPermissions(old=>old.map((x,j)=>j===i?{...x,enabled:e.target.checked}:x))}/> فعال</label></article>)}</div><button type="button" disabled={saving||!selectedSellerId} onClick={savePermissions}>ذخیره دسترسی‌ها</button></>}
  </section>}
  {mode==="domains"&&<section className="runtime-panel">
   <div className="panel-title"><div><h2>دامنه‌های فروشندگان</h2><span>ثبت، مشاهده و تأیید واقعی دامنه</span></div></div>
   <select value={selectedDomainSeller} onChange={e=>setSelectedDomainSeller(e.target.value)}><option value="">فروشنده را انتخاب کنید</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select>
   <div className="control-grid"><input placeholder="example.ir" value={form.hostname||""} onChange={e=>setForm({...form,hostname:e.target.value})}/><input placeholder="شناسه فروشگاه، در صورت نیاز" value={form.storeId||""} onChange={e=>setForm({...form,storeId:e.target.value})}/><select value={form.sslMode||"managed"} onChange={e=>setForm({...form,sslMode:e.target.value})}><option value="managed">SSL مدیریت‌شده</option><option value="external">SSL خارجی</option></select><button disabled={!selectedDomainSeller||saving} onClick={addDomain}>ثبت دامنه</button></div>
   <div className="record-list">{domains.map(d=><article className="record-row" key={d.id}><div><strong>{d.hostname}</strong><small>{d.verification_status} · SSL: {d.ssl_mode} · {d.is_primary?"دامنه اصلی":"دامنه عادی"}</small>{d.verification_status!=="verified"&&<small>رکورد TXT: <code>_naf-verification.{d.hostname}</code></small><small>مقدار TXT: <code>{d.verification_token}</code></small>}</div>{d.verification_status!=="verified"&&<button onClick={()=>verifyDomain(d.id)}>تأیید</button>}</article>)}</div>
  </section>}

  {mode==="payments"&&<section className="runtime-panel">
   <div className="panel-title"><div><h2>تسویه فروشندگان</h2><span>{settlements.length} رکورد واقعی · ایجاد، تأیید و ثبت پرداخت</span></div></div>
   <div className="control-grid">
    <label>شروع بازه<input type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)}/></label>
    <label>پایان بازه<input type="date" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)}/></label>
    <button type="button" disabled={saving||!periodStart||!periodEnd} onClick={generateSettlements}>{saving?"در حال انجام...":"محاسبه و ایجاد تسویه‌ها"}</button>
   </div>
   <div className="record-list">{settlements.map(r=><article className="record-row" key={r.id}><div><strong>{r.settlement_no}</strong><small>{r.seller_name||r.seller_id} · ناخالص {money(r.gross_amount)} · کارمزد {money(r.commission_amount)} · خالص {money(r.net_amount)}</small><small>{r.period_start?date(r.period_start):"-"} تا {r.period_end?date(r.period_end):"-"}</small></div><div className="command-bar"><span>{r.status}</span>{r.status==="pending"&&<button type="button" onClick={()=>approveSettlement(r.id)}>تأیید تسویه</button>}{r.status==="approved"&&<button type="button" onClick={()=>paySettlement(r.id)}>ثبت سند پرداخت</button>}</div></article>)}</div>
  </section>}

  {mode==="commerce"&&tab==="sellers"&&<section className="runtime-panel"><div className="panel-title"><div><h2>فروشندگان</h2><span>{sellers.length} رکورد واقعی</span></div></div><div className="record-list">{sellers.map(s=><article className="record-row" key={s.id}><div><strong>{s.display_name}</strong><small>{s.legal_name} · کمیسیون {s.commission_rate}%</small></div><span>{s.status}</span></article>)}</div></section>}
  {mode==="commerce"&&tab==="stores"&&<section className="runtime-panel"><div className="panel-title"><div><h2>فروشگاه‌ها</h2><span>{stores.length} رکورد واقعی</span></div></div><div className="control-grid"><select value={form.sellerId||""} onChange={e=>setForm({...form,sellerId:e.target.value})}><option value="">فروشنده</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select><input placeholder="کد" value={form.code||""} onChange={e=>setForm({...form,code:e.target.value})}/><input placeholder="نام" value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder="slug" value={form.slug||""} onChange={e=>setForm({...form,slug:e.target.value})}/><button disabled={saving} onClick={saveStore}>ثبت فروشگاه</button></div><div className="record-list">{stores.map(s=><article className="record-row" key={s.id}><div><strong>{s.name}</strong><small>{s.code} · {s.slug} · {s.seller_name||s.seller_id}</small></div><select value={s.status} onChange={e=>changeStoreStatus(s.id,e.target.value)}><option value="draft">پیش‌نویس</option><option value="active">فعال</option><option value="suspended">معلق</option><option value="closed">بسته</option></select></article>)}</div></section>}
  {mode==="commerce"&&tab==="products"&&<section className="runtime-panel"><div className="panel-title"><div><h2>محصولات</h2><span>{productItems.length} رکورد واقعی · ثبت کالا در وضعیت پیش‌نویس</span></div></div><div className="control-grid"><select value={form.sellerId||""} onChange={e=>setForm({...form,sellerId:e.target.value})}><option value="">فروشنده</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select><select value={form.storeId||""} onChange={e=>setForm({...form,storeId:e.target.value})}><option value="">بدون فروشگاه مشخص</option>{stores.filter(s=>!form.sellerId||s.seller_id===form.sellerId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><input placeholder="شناسه کالا / SKU" value={form.sku||""} onChange={e=>setForm({...form,sku:e.target.value})}/><input placeholder="عنوان محصول" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/><input placeholder="دسته‌بندی" value={form.category||""} onChange={e=>setForm({...form,category:e.target.value})}/><input type="number" min="1" placeholder="قیمت به ریال" value={form.price||""} onChange={e=>setForm({...form,price:e.target.value})}/><input type="number" min="0" placeholder="قیمت تخفیف" value={form.discountPrice||""} onChange={e=>setForm({...form,discountPrice:e.target.value})}/><input placeholder="توضیحات" value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/><button disabled={saving} onClick={saveProduct}>ثبت پیش‌نویس محصول</button></div><div className="record-list">{productItems.map(p=><article className="record-row" key={p.id}><div><strong>{p.title}</strong><small>{p.sku} · {money(p.price)} {p.currency} · {p.seller_name||p.seller_id}</small></div><span>{p.status}</span></article>)}</div></section>}
  {mode==="commerce"&&tab==="orders"&&<section className="runtime-panel"><div className="panel-title"><div><h2>سفارش‌ها</h2><span>{orderItems.length} رکورد واقعی · گردش وضعیت کنترل‌شده توسط API</span></div></div><div className="record-list">{orderItems.map(o=><article className="record-row" key={o.id}><div><strong>{o.order_no}</strong><small>{o.customer_ref||"بدون شناسه مشتری"} · مبلغ {money(o.total_amount)} {o.currency} · سهم فروشنده {money(o.seller_payable)}</small></div><select value={o.status} onChange={e=>changeOrderStatus(o.id,e.target.value)}><option value={o.status}>{o.status}</option>{({pending:["confirmed","cancelled"],confirmed:["paid","cancelled"],paid:["processing","refunded"],processing:["shipped","returned"],shipped:["delivered","returned"],delivered:["returned","refunded"],returned:["refunded"]} as Record<string,string[]>)[o.status]?.map(s=><option key={s} value={s}>{s}</option>)}</select></article>)}</div></section>}
  {loading&&<div className="runtime-panel"><p className="muted">در حال دریافت داده واقعی...</p></div>}
 </main>;
}
