"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import styles from "./SiteLaunchWorkspace.module.css";

type SiteRecord = { id:number; title:string; status:string; data:Record<string,any>; updated_at?:string };
const api=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";
const templates=[
 {value:"digipay-fintech",label:"دیجی‌پی · خدمات مالی"},
 {value:"digibile-commerce",label:"دیجی‌بایل · بازارگاه"},
 {value:"vamcity-lending",label:"وام‌سیتی · تسهیلات"},
 {value:"naf-corporate",label:"نگار آذین فدک · سازمانی"},
 {value:"kipa-store",label:"کیپا · فروشگاهی"},
 {value:"technolife-store",label:"تکنولایف · فناوری"}
];
const businessTypes=[
 {value:"digital-products",label:"محصولات دیجیتال",detail:"فایل، لایسنس، اشتراک و تحویل دیجیتال"},
 {value:"home-goods",label:"لوازم خانه",detail:"کالای فیزیکی، موجودی، حمل و مرجوعی"},
 {value:"general-store",label:"فروشگاه عمومی",detail:"چند دسته محصول و ویژگی‌های متنوع"},
 {value:"marketplace",label:"بازارگاه چندفروشنده",detail:"فروشندگان مستقل، کمیسیون و تسویه"},
 {value:"services",label:"فروش خدمات",detail:"رزرو، بسته خدماتی و پیگیری سفارش"},
 {value:"fintech",label:"خدمات مالی",detail:"نیازمند مجوزها و افشاهای حقوقی اختصاصی"},
 {value:"corporate",label:"سایت سازمانی",detail:"صفحات سازمانی، فرم‌ها و درخواست‌ها"}
];
const dashboards=[
 {value:"executive",label:"مدیریتی و مدیرعامل"},
 {value:"commerce",label:"فروشگاه و تجارت"},
 {value:"products",label:"محصولات و موجودی"},
 {value:"finance",label:"مالی و تسویه"},
 {value:"content",label:"محتوا و صفحات"},
 {value:"domains",label:"دامنه و انتشار"},
 {value:"operations",label:"عملیات و پشتیبانی"}
];
const featureOptions=[
 ["catalog","کاتالوگ و دسته‌بندی محصولات"],["inventory","موجودی و انبار"],["orders","سفارش و مرجوعی"],["digital-delivery","تحویل دیجیتال"],["seller-portal","پنل فروشندگان"],["payments","پرداخت"],["settlements","کمیسیون و تسویه"],["content","مدیریت محتوا و صفحات"],["forms","فرم‌ساز"],["analytics","گزارش و تحلیل"],["support","پشتیبانی"],["seo","تنظیمات سئو"]
] as const;
const permissionOptions=[
 ["site:settings:read","مشاهده تنظیمات سایت"],["site:settings:write","ویرایش تنظیمات سایت"],["site:domain:manage","مدیریت دامنه"],["site:catalog:manage","مدیریت کاتالوگ"],["site:orders:manage","مدیریت سفارش‌ها"],["site:users:manage","مدیریت کاربران و نقش‌ها"],["site:publish","انتشار سایت"]
] as const;
const blank:any={siteName:"",siteSlug:"",template:"digibile-commerce",businessType:"general-store",logoUrl:"",faviconUrl:"",primaryColor:"#155eef",accentColor:"#14b8a6",fontFamily:"Vazirmatn",domain:"",subdomain:"",domainStatus:"not-configured",productCategories:"",currency:"IRR",deliveryMode:"shipping",features:["catalog","inventory","orders","payments","content","seo"],permissions:["site:settings:read","site:settings:write","site:catalog:manage","site:orders:manage"],dashboard:"commerce",dashboardWidgets:["sales","orders","products","inventory"],seoTitle:"",seoDescription:"",launchStatus:"draft"};
export default function SiteLaunchWorkspace(){
 const [items,setItems]=useState<SiteRecord[]>([]);
 const [form,setForm]=useState<any>({...blank});
 const [editing,setEditing]=useState<number|null>(null);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [tab,setTab]=useState("identity");
 const selectedBusiness=useMemo(()=>businessTypes.find(x=>x.value===form.businessType)||businessTypes[2],[form.businessType]);
 const set=(key:string,value:any)=>setForm((s:any)=>({...s,[key]:value}));
 const toggle=(key:"features"|"permissions"|"dashboardWidgets",value:string,checked:boolean)=>set(key,checked?[...new Set([...(form[key]||[]),value])]:form[key].filter((x:string)=>x!==value));
 const load=async()=>{
  setLoading(true);setError("");
  try{
   const r=await fetch(api+"/api/platform/modules/36-page-templates/records?page=1&pageSize=100&recordType=site-configuration&q=",{credentials:"include",cache:"no-store"});
   const b=await r.json().catch(()=>null);
   if(!r.ok)throw new Error(b?.error||"دریافت سایت‌ها ناموفق بود");
   setItems((b.items||[]).filter((x:SiteRecord)=>x.record_type==="site-configuration"));
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات")}
  finally{setLoading(false)}
 };
 useEffect(()=>{load()},[]);
 const reset=()=>{setEditing(null);setForm({...blank});setTab("identity");setNotice("");};
 const edit=(row:SiteRecord)=>{setEditing(row.id);setForm({...blank,...row.data,features:Array.isArray(row.data.features)?row.data.features:blank.features,permissions:Array.isArray(row.data.permissions)?row.data.permissions:blank.permissions,dashboardWidgets:Array.isArray(row.data.dashboardWidgets)?row.data.dashboardWidgets:blank.dashboardWidgets});setTab("identity");setNotice("");setError("");window.scrollTo({top:0,behavior:"smooth"})};
 const save=async()=>{
  setError("");setNotice("");
  if(!form.siteName.trim()||!form.siteSlug.trim())return setError("نام سایت و شناسه یکتای سایت الزامی است.");
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.siteSlug))return setError("شناسه سایت فقط حروف کوچک انگلیسی، عدد و خط تیره باشد.");
  if(form.domain&&!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(form.domain.trim()))return setError("دامنه را بدون https:// و مسیر وارد کنید؛ نمونه: shop.example.com");
  setSaving(true);
  try{
   const data={...form,domain:form.domain.trim().toLowerCase(),domainStatus:form.domain.trim()?(form.domainStatus==="verified"?"pending-verification":form.domainStatus):"not-configured",configurationVersion:1,updatedAt:new Date().toISOString()};
   const payload={recordType:"site-configuration",title:form.siteName.trim(),status:form.launchStatus==="published"?"active":"draft",data};
   const r=await fetch(api+"/api/platform/modules/36-page-templates/records"+(editing?"/"+editing:""),{method:editing?"PATCH":"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},body:JSON.stringify(payload)});
   const b=await r.json().catch(()=>null);
   if(!r.ok)throw new Error(b?.error||"ذخیره پیکربندی سایت انجام نشد");
   setNotice("تنظیمات در پایگاه داده ثبت شد. دامنه تا زمان بررسی DNS و SSL منتشرشده یا تأییدشده محسوب نمی‌شود.");
   reset();await load();
  }catch(e){setError(e instanceof Error?e.message:"خطا در ذخیره")}
  finally{setSaving(false)}
 };
 const remove=async(id:number)=>{
  if(!window.confirm("پیکربندی این سایت حذف شود؟"))return;
  setError("");
  try{const r=await fetch(api+"/api/platform/modules/36-page-templates/records/"+id,{method:"DELETE",credentials:"include",headers:{"X-CSRF-Token":csrf()}});const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||"حذف انجام نشد");await load()}
  catch(e){setError(e instanceof Error?e.message:"خطا در حذف")}
 };
 const ready=(s:SiteRecord)=>{const d=s.data||{};return Boolean(d.siteName&&d.siteSlug&&d.template&&d.businessType&&Array.isArray(d.features)&&d.features.length)};
 return <main className={styles.page} dir="rtl">
  <header className={styles.hero}><div><span className={styles.eyebrow}>مرکز مدیریت نگار آذین فدک · راه‌اندازی سایت</span><h1>راه‌اندازی و تنظیمات سایت</h1><p>قالب، هویت برند، دامنه، نوع کالا، امکانات، مجوزهای پنل و داشبورد را برای هر سایت جداگانه تنظیم کنید.</p></div><div className={styles.heroStats}><b>{items.length.toLocaleString("fa-IR")}</b><span>سایت پیکربندی‌شده</span></div></header>
  {error&&<div className={styles.error} role="alert">{error}</div>}{notice&&<div className={styles.notice} role="status">{notice}</div>}
  <nav className={styles.tabs}>{[["identity","هویت و قالب"],["domain","دامنه و انتشار"],["catalog","نوع فروش و محصولات"],["features","امکانات"],["access","مجوزها"],["dashboard","داشبورد"]].map(([key,label])=><button key={key} className={tab===key?styles.active:""} onClick={()=>setTab(key)}>{label}</button>)}</nav>
  <section className={styles.layout}>
   <form className={styles.formCard} onSubmit={e=>{e.preventDefault();save()}}>
    <header className={styles.sectionHead}><div><span>پیکربندی اختصاصی</span><h2>{editing?"ویرایش سایت":"تعریف سایت جدید"}</h2></div>{editing&&<button type="button" className={styles.secondary} onClick={reset}>سایت جدید</button>}</header>
    {tab==="identity"&&<div className={styles.fields}>
      <label>نام سایت *<input value={form.siteName} onChange={e=>set("siteName",e.target.value)} placeholder="مثلاً فروشگاه خانه من" required/></label>
      <label>شناسه یکتای سایت *<input value={form.siteSlug} onChange={e=>set("siteSlug",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))} placeholder="my-home-store" required/><small>برای شناسایی داخلی سایت؛ با دامنه یکی نیست.</small></label>
      <label className={styles.wide}>قالب پایه<select value={form.template} onChange={e=>set("template",e.target.value)}>{templates.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <label className={styles.wide}>نوع کسب‌وکار<select value={form.businessType} onChange={e=>set("businessType",e.target.value)}>{businessTypes.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select><small>{selectedBusiness.detail}</small></label>
      <label className={styles.wide}>نشانی لوگو<input type="url" value={form.logoUrl} onChange={e=>set("logoUrl",e.target.value)} placeholder="https://cdn.example.com/logo.svg"/><small>نشانی فایل لوگو؛ بارگذاری فایل در این مرحله فعال نیست.</small></label>
      <label className={styles.wide}>نشانی آیکون سایت<input type="url" value={form.faviconUrl} onChange={e=>set("faviconUrl",e.target.value)} placeholder="https://cdn.example.com/favicon.png"/></label>
      <label>رنگ اصلی<input type="color" value={form.primaryColor} onChange={e=>set("primaryColor",e.target.value)}/></label>
      <label>رنگ مکمل<input type="color" value={form.accentColor} onChange={e=>set("accentColor",e.target.value)}/></label>
      <label>فونت رابط<select value={form.fontFamily} onChange={e=>set("fontFamily",e.target.value)}>{["Vazirmatn","IRANSansX","Estedad","system-ui"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>واحد پول<select value={form.currency} onChange={e=>set("currency",e.target.value)}><option value="IRR">ریال</option><option value="IRT">تومان</option><option value="USD">دلار آمریکا</option><option value="EUR">یورو</option></select></label>
    </div>}
    {tab==="domain"&&<div className={styles.fields}>
      <label className={styles.wide}>دامنه اختصاصی<input value={form.domain} onChange={e=>set("domain",e.target.value)} placeholder="shop.example.com"/><small>فقط نام دامنه؛ تنظیم DNS، صدور SSL و بررسی مالکیت باید جداگانه انجام شود.</small></label>
      <label className={styles.wide}>زیردامنه پیشنهادی<input value={form.subdomain} onChange={e=>set("subdomain",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))} placeholder="shop"/><small>این فیلد فقط ذخیره می‌شود و به‌تنهایی DNS یا زیردامنه ایجاد نمی‌کند.</small></label>
      <label>وضعیت دامنه<select value={form.domainStatus} onChange={e=>set("domainStatus",e.target.value)}><option value="not-configured">تنظیم نشده</option><option value="pending-verification">در انتظار تأیید</option></select></label>
      <label>وضعیت انتشار<select value={form.launchStatus} onChange={e=>set("launchStatus",e.target.value)}><option value="draft">پیش‌نویس</option><option value="ready-for-review">آماده بررسی</option></select></label>
      <label className={styles.wide}>عنوان سئو<input value={form.seoTitle} onChange={e=>set("seoTitle",e.target.value)} maxLength={70}/></label>
      <label className={styles.wide}>توضیحات سئو<textarea rows={3} value={form.seoDescription} onChange={e=>set("seoDescription",e.target.value)} maxLength={180}/></label>
      <div className={styles.callout}>ذخیره این فرم به معنی ثبت DNS، تأیید مالکیت دامنه، صدور SSL یا انتشار سایت نیست. این مراحل باید پس از اتصال واقعی زیرساخت انجام شوند.</div>
    </div>}
    {tab==="catalog"&&<div className={styles.fields}>
      <label className={styles.wide}>مدل کسب‌وکار<select value={form.businessType} onChange={e=>set("businessType",e.target.value)}>{businessTypes.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <label className={styles.wide}>دسته‌بندی‌های محصول<textarea rows={3} value={form.productCategories} onChange={e=>set("productCategories",e.target.value)} placeholder="مثلاً لپ‌تاپ، موبایل، لوازم جانبی"/><small>هر دسته را با ویرگول جدا کنید. این تنظیم به‌تنهایی محصول یا دسته‌بندی کاتالوگ نمی‌سازد.</small></label>
      <label>روش تحویل<select value={form.deliveryMode} onChange={e=>set("deliveryMode",e.target.value)}><option value="shipping">ارسال فیزیکی</option><option value="digital">تحویل دیجیتال</option><option value="appointment">رزرو یا زمان‌بندی خدمت</option><option value="mixed">ترکیبی</option></select></label>
      <div className={styles.callout}>برای ثبت واقعی کالا، قیمت، موجودی و تصاویر، از کاتالوگ محصولات استفاده کنید؛ این صفحه فقط سیاست‌ها و نوع فروش سایت را ذخیره می‌کند.</div>
      <a className={styles.linkCard} href="/marketplace/products"><b>رفتن به مدیریت محصولات</b><span>محصولات، SKU، قیمت، وضعیت و کاتالوگ</span><strong>باز کردن ↗</strong></a>
      <a className={styles.linkCard} href="/marketplace/categories"><b>رفتن به دسته‌بندی‌ها</b><span>ساختار دسته‌بندی واقعی بازارگاه</span><strong>باز کردن ↗</strong></a>
    </div>}
    {tab==="features"&&<div className={styles.checkGrid}>{featureOptions.map(([key,label])=><label className={styles.checkItem} key={key}><input type="checkbox" checked={form.features.includes(key)} onChange={e=>toggle("features",key,e.target.checked)}/><span>{label}</span></label>)}<div className={styles.callout}>فعال بودن یک قابلیت در این پیکربندی به معنی فعال شدن خودکار API، درگاه پرداخت یا قرارداد سرویس‌دهنده نیست.</div></div>}
    {tab==="access"&&<div className={styles.checkGrid}>{permissionOptions.map(([key,label])=><label className={styles.checkItem} key={key}><input type="checkbox" checked={form.permissions.includes(key)} onChange={e=>toggle("permissions",key,e.target.checked)}/><span>{label}</span></label>)}<div className={styles.callout}>این فهرست، الگوی دسترسی پیشنهادی همین سایت است. اعمال مجوز واقعی بر حساب کاربران نیازمند تخصیص نقش در بخش مدیریت کاربران و دسترسی‌هاست.</div><a className={styles.linkCard} href="/modules/?code=03-users-access"><b>مدیریت کاربران و دسترسی‌ها</b><span>تخصیص نقش‌ها و دسترسی‌های واقعی حساب کاربران</span><strong>باز کردن ↗</strong></a></div>}
    {tab==="dashboard"&&<div className={styles.fields}>
      <label className={styles.wide}>نوع داشبورد اصلی<select value={form.dashboard} onChange={e=>set("dashboard",e.target.value)}>{dashboards.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <div className={styles.wide}><b>ویجت‌های داشبورد</b><div className={styles.checkGrid}>{[["sales","فروش و درآمد"],["orders","سفارش‌های اخیر"],["products","محصولات"],["inventory","موجودی"],["finance","مالی و تسویه"],["domains","دامنه و انتشار"],["activity","فعالیت کاربران"],["analytics","تحلیل عملکرد"]].map(([key,label])=><label className={styles.checkItem} key={key}><input type="checkbox" checked={form.dashboardWidgets.includes(key)} onChange={e=>toggle("dashboardWidgets",key,e.target.checked)}/><span>{label}</span></label>)}</div></div>
      <a className={styles.linkCard} href="/modules/?code=01-dashboard"><b>داشبوردهای عملیاتی</b><span>داشبوردهای موجود مدیرعامل، مالی، فروش، عملیات، شعب و KPI</span><strong>باز کردن ↗</strong></a>
    </div>}
    <footer className={styles.formFooter}><button className={styles.primary} disabled={saving}>{saving?"در حال ذخیره...":editing?"ذخیره تغییرات سایت":"ذخیره پیکربندی سایت"}</button><button type="button" className={styles.secondary} onClick={reset}>پاک‌کردن فرم</button></footer>
   </form>
   <aside className={styles.side}>
    <section className={styles.previewCard}><span className={styles.previewLabel}>پیش‌نمایش هویت</span><div className={styles.brandPreview} style={{"--brand":form.primaryColor,"--accent":form.accentColor} as CSSProperties}>{form.logoUrl?<img src={form.logoUrl} alt="پیش‌نمایش لوگو" onError={e=>{(e.currentTarget as HTMLImageElement).style.display="none"}}/>:<div className={styles.logoPlaceholder}>LOGO</div>}<div><b>{form.siteName||"نام سایت شما"}</b><small>{templates.find(x=>x.value===form.template)?.label}</small></div></div><div className={styles.swatches}><i style={{background:form.primaryColor}}/><i style={{background:form.accentColor}}/><span>{form.fontFamily}</span></div><div className={styles.previewMeta}><span>نوع کسب‌وکار</span><b>{selectedBusiness.label}</b><span>داشبورد</span><b>{dashboards.find(x=>x.value===form.dashboard)?.label}</b><span>دامنه</span><b>{form.domain||"هنوز تعیین نشده"}</b></div></section>
    <section className={styles.listCard}><header><div><span>پیکربندی‌های ذخیره‌شده</span><h2>سایت‌های شما</h2></div><button className={styles.refresh} onClick={load} disabled={loading}>↻</button></header>
     {loading?<p className={styles.empty}>در حال بارگذاری...</p>:items.length===0?<p className={styles.empty}>هنوز پیکربندی سایتی ثبت نشده است.</p>:items.map(row=><article className={styles.siteRow} key={row.id}><div className={styles.siteIdentity}><span className={styles.siteDot} style={{background:row.data.primaryColor||"#94a3b8"}}/><div><b>{row.data.siteName||row.title}</b><small>{row.data.domain||row.data.subdomain||row.data.siteSlug}</small><span className={styles.status}>{row.data.domainStatus==="verified"?"دامنه تأیید شده":row.data.domain?"در انتظار تأیید دامنه":"بدون دامنه"}</span></div></div><div className={styles.rowActions}><button onClick={()=>edit(row)}>تنظیمات</button><button className={styles.danger} onClick={()=>remove(row.id)}>حذف</button></div><small className={styles.readiness}>{ready(row)?"پیکربندی پایه ثبت شده":"اطلاعات پایه ناقص است"} · {templates.find(x=>x.value===row.data.template)?.label||row.data.template}</small></article>)}
    </section>
    <section className={styles.checklist}><h3>پیش از انتشار</h3>{["بررسی هویت و محتوای برند","اتصال و تأیید مالکیت دامنه","صدور و آزمون SSL","تکمیل کاتالوگ واقعی و قوانین قیمت‌گذاری","بازبینی مجوز کاربران و پرداخت","آزمون موبایل و سفارش آزمایشی"].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span>{x}</div>)}</section>
   </aside>
  </section>
 </main>
}
