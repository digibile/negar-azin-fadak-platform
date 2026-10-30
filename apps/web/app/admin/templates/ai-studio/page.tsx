"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {api} from "../../../../lib/api";
import "./ai-template-studio.css";

type DesignSection={type:string;title:string;description:string};
type DesignSpec={
  title:string;subtitle:string;description:string;primaryColor:string;accentColor:string;backgroundColor:string;
  layout:"catalog"|"editorial"|"minimal"|"bold";sections:DesignSection[];components:string[];
  aiCapabilities:string[];responsiveNotes:string[];acceptanceCriteria:string[];
};
type SavedItem={id:string;title:string;status:string;data:{framework?:string;pageType?:string;design?:DesignSpec};created_at:string};
const frameworks=["Next.js + TypeScript","React + TypeScript","Python + FastAPI","Next.js + Python FastAPI"];
const pageTypes=["فروشگاه اینترنتی","بازارگاه چندفروشندگی","صفحه اصلی سازمانی","داشبورد مدیریتی","صفحه معرفی محصول","سایر"];

export default function AiTemplateStudio(){
 const [name,setName]=useState("مارکت‌پلیس هوشمند سوکار");
 const [framework,setFramework]=useState(frameworks[0]);
 const [pageType,setPageType]=useState(pageTypes[1]);
 const [language,setLanguage]=useState("فارسی");
 const [prompt,setPrompt]=useState("یک بازارگاه چندفروشندگی حرفه‌ای با تجربه خرید کامل طراحی کن. هدر چندسطحی، مگامنو، جست‌وجوی هوشمند، دسته‌بندی‌های تصویری، صفحه محصول با چند فروشنده، مقایسه قیمت، سبد خرید تفکیک‌شده، تسویه‌حساب، فاکتور، پنل فروشنده و طراحی واکنش‌گرا داشته باشد. هوش مصنوعی در جست‌وجو، پیشنهاد کالا، تولید محتوای محصول و راهنمای خرید حضور واقعی داشته باشد. ظاهر فروشگاهی باشد و بخش اعتبار خرید فقط یک روش پرداخت اختیاری بماند.");
 const [design,setDesign]=useState<DesignSpec|null>(null);
 const [items,setItems]=useState<SavedItem[]>([]);
 const [busy,setBusy]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [provider,setProvider]=useState("");

 const loadSaved=useCallback(async()=>{
  try{const result=await api<{items:SavedItem[]}>("/api/ai/template-design");setItems(result.items||[]);}
  catch(e){setError(e instanceof Error?e.message:"دریافت طرح‌های ذخیره‌شده ناموفق بود.");}
 },[]);
 useEffect(()=>{void loadSaved();},[loadSaved]);

 async function generate(){
  setBusy(true);setError("");setNotice("");setDesign(null);
  try{
   const result=await api<{design:DesignSpec;provider:string}>("/api/ai/template-design/generate",{method:"POST",body:JSON.stringify({name,framework,pageType,language,prompt})});
   setDesign(result.design);setProvider(result.provider||"AI");
   setNotice("پیش‌نمایش طراحی آماده شد. هنوز چیزی روی قالب فعال اعمال نشده است.");
  }catch(e){setError(e instanceof Error?e.message:"تولید طراحی ناموفق بود.");}
  finally{setBusy(false);}
 }

 async function save(){
  if(!design)return;
  setSaving(true);setError("");setNotice("");
  try{
   const result=await api<{item:SavedItem;message:string}>("/api/ai/template-design/save",{method:"POST",body:JSON.stringify({name,framework,pageType,design})});
   setItems(current=>[result.item,...current.filter(item=>item.id!==result.item.id)]);
   setNotice(result.message);
  }catch(e){setError(e instanceof Error?e.message:"ذخیره قالب ناموفق بود.");}
  finally{setSaving(false);}
 }

 return <main className="ai-studio" dir="rtl">
  <header className="ai-studio-head">
   <div>
    <div className="ai-studio-eyebrow">Sookar AI · Template Studio</div>
    <h1>طراح هوشمند قالب‌ها</h1>
    <p>نیازت را توضیح بده، فناوری را انتخاب کن، طرح را با هوش مصنوعی بساز و پس از بررسی در کتابخانه مرکزی قالب‌ها ذخیره کن.</p>
   </div>
   <Link className="ai-studio-back" href="/admin/templates">بازگشت به مدیریت قالب‌ها</Link>
  </header>

  <section className="ai-studio-grid">
   <div className="ai-studio-panel ai-studio-form">
    <div className="ai-panel-title"><span className="ai-spark">✳</span><div><h2>مشخصات طراحی</h2><p>هرچه شرح دقیق‌تر باشد، خروجی کمتر شبیه قالب‌های تکراری اینترنت می‌شود.</p></div></div>
    <label>نام قالب<input value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label>
    <div className="ai-form-row">
     <label>نوع خروجی<select value={pageType} onChange={e=>setPageType(e.target.value)}>{pageTypes.map(x=><option key={x}>{x}</option>)}</select></label>
     <label>زبان رابط<select value={language} onChange={e=>setLanguage(e.target.value)}><option>فارسی</option><option>فارسی و انگلیسی</option><option>انگلیسی</option><option>عربی</option></select></label>
    </div>
    <label>زبان و فناوری برنامه‌نویسی<select value={framework} onChange={e=>setFramework(e.target.value)}>{frameworks.map(x=><option key={x}>{x}</option>)}</select><small>انتخاب Python برای سرویس سمت سرور است؛ رابط وب همچنان به لایه نمایشی مناسب نیاز دارد.</small></label>
    <label>دقیقاً چه چیزی می‌خواهی ساخته شود؟<textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={9} maxLength={4000}/><small>{prompt.length.toLocaleString("fa-IR")} از ۴۰۰۰ نویسه</small></label>
    <button className="ai-generate-button" type="button" onClick={generate} disabled={busy||prompt.trim().length<12}>{busy?<><span className="ai-spinner"/>در حال تحلیل نیاز و طراحی...</>:<>✳ طراحی با هوش مصنوعی</>}</button>
    <p className="ai-privacy-note">کلید سرویس هوش مصنوعی فقط روی سرور نگهداری می‌شود. خروجی ابتدا پیش‌نویس است و بدون اقدام مدیر منتشر نمی‌شود.</p>
   </div>

   <div className="ai-studio-preview-wrap">
    <div className="ai-preview-top"><div><span>LIVE DESIGN PREVIEW</span><h2>پیش‌نمایش طرح</h2></div><span className="ai-preview-device">دسکتاپ · موبایل</span></div>
    {error&&<div className="ai-alert ai-alert-error" role="alert">{error}</div>}
    {notice&&<div className="ai-alert ai-alert-success" role="status">{notice}</div>}
    {design?<>
     <div className="ai-design-preview" style={{"--ai-primary":design.primaryColor,"--ai-accent":design.accentColor,"--ai-canvas":design.backgroundColor} as React.CSSProperties}>
      <div className="ai-preview-nav"><b>سوکار</b><span>دسته‌بندی‌ها</span><span>پیشنهادها</span><span>فروشندگان</span><button type="button">ورود / ثبت‌نام</button></div>
      <div className="ai-preview-hero"><div><small>{pageType} · طراحی هوشمند</small><h3>{design.title}</h3><p>{design.subtitle}</p><span>{design.description}</span><button type="button">مشاهده طرح</button></div><div className="ai-preview-art"><i/><i/><i/><b>AI</b></div></div>
      <div className="ai-preview-section-head"><b>ساختار پیشنهادی صفحه</b><small>{design.layout}</small></div>
      <div className="ai-preview-sections">{design.sections.map((section,index)=><article key={index}><span>{String(index+1).padStart(2,"0")}</span><b>{section.title}</b><p>{section.description}</p></article>)}</div>
      <div className="ai-preview-footer">پیش‌نمایش ساختاری · اطلاعات واقعی و پرداخت هنوز متصل نشده‌اند</div>
     </div>
     <div className="ai-spec-columns">
      <div><h3>اجزای رابط</h3><ul>{design.components.map((x,i)=><li key={i}>{x}</li>)}</ul></div>
      <div><h3>قابلیت‌های هوش مصنوعی</h3><ul>{design.aiCapabilities.map((x,i)=><li key={i}>{x}</li>)}</ul></div>
     </div>
     <div className="ai-save-row"><span>مدل طراحی: {provider} · {framework}</span><button type="button" onClick={save} disabled={saving}>{saving?"در حال ذخیره...":"ذخیره در کتابخانه قالب‌ها"}</button></div>
    </>:<div className="ai-empty-preview"><div className="ai-empty-orbit">✳</div><h3>ایده‌ات را به طراحی تبدیل کن</h3><p>بعد از انتخاب فناوری و توضیح نیاز، هوش مصنوعی ساختار صفحه، اجزا، رنگ‌ها و قابلیت‌های پیشنهادی را می‌سازد.</p><div><span>۱ · تحلیل درخواست</span><span>۲ · تولید ساختار</span><span>۳ · پیش‌نمایش</span><span>۴ · ذخیره پیش‌نویس</span></div></div>}
   </div>
  </section>

  <section className="ai-saved-section">
   <div className="ai-saved-heading"><div><span>LIBRARY</span><h2>طرح‌های تولیدشده</h2><p>پیش‌نویس‌های ذخیره‌شده در ماژول مرکزی مدیریت قالب‌ها</p></div><button type="button" onClick={()=>void loadSaved()}>بروزرسانی فهرست</button></div>
   {items.length?<div className="ai-saved-grid">{items.map(item=><article key={item.id}><div className="ai-saved-icon">✳</div><div><b>{item.title}</b><p>{item.data?.framework||"فناوری ثبت نشده"} · {item.data?.pageType||"نوع نامشخص"}</p><small>{item.status} · {new Date(item.created_at).toLocaleDateString("fa-IR")}</small></div><span>پیش‌نویس</span></article>)}</div>:<div className="ai-no-saved">هنوز طرحی ذخیره نشده است. اولین طراحی را بساز و به کتابخانه اضافه کن.</div>}
  </section>
 </main>;
}
