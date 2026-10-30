"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {api} from "../../../lib/api";
import "./ai-workshop.css";

const tools=[
 {id:"page",name:"صفحه‌ساز",icon:"▤",desc:"صفحه کامل، بلوک‌ها، سئو و CTA"},
 {id:"menu",name:"منوساز",icon:"☷",desc:"درخت منو، زیرمنو، مسیر و دسترسی"},
 {id:"layout",name:"چیدمان‌ساز",icon:"▦",desc:"هدر، فوتر، گرید و ساختار واکنش‌گرا"},
 {id:"size",name:"سایزبندی و ابعادساز",icon:"↔",desc:"عرض، فاصله، فونت و نقاط شکست"},
 {id:"form",name:"فرم‌ساز",icon:"☑",desc:"فیلد، اعتبارسنجی و شرط نمایش"},
 {id:"section",name:"بخش‌ساز",icon:"▣",desc:"بخش‌های قابل استفاده مجدد"},
 {id:"advertorial",name:"رپورتاژ و محتوای تبلیغاتی",icon:"✎",desc:"مقاله، ساختار تحریریه و سئو"},
 {id:"report",name:"گزارش‌ساز",icon:"▥",desc:"شاخص، فیلتر، جدول و نمودار"},
 {id:"template",name:"قالب‌ساز",icon:"✳",desc:"سیستم طراحی و قالب کامل"}
] as const;
type ToolId=typeof tools[number]["id"];
type Artifact={title:string;summary:string;slug:string;sections:any[];components:any[];fields:any[];menuItems:any[];layout:any;breakpoints:any[];tokens:any;seo:any;content:any;filters:any[];metrics:any[];charts:any[];acceptanceCriteria:any[];sourceFiles?:{path:string;language:string;content:string}[]};
const defaults:Record<ToolId,string>={
 page:"برای یک صفحه حرفه‌ای سوکار ساختار کامل و قابل ویرایش بساز. هدر، معرفی، بخش‌های محتوایی، کارت‌ها، فراخوان اقدام، سؤالات متداول، فوتر، نسخه موبایل و تنظیمات سئو را در نظر بگیر.",
 menu:"برای بخش موردنظر یک درخت منوی واضح و چندسطحی بساز. گروه‌ها و زیرمنوها عنوان فارسی، مسیر داخلی معتبر، آیکون و مجوز پیشنهادی داشته باشند. منوی موجود را حذف یا بازنویسی نکن.",
 layout:"یک سیستم چیدمان حرفه‌ای RTL با هدر، فوتر، ناحیه محتوا، ستون‌ها، شبکه کارت‌ها و رفتار مستقل در دسکتاپ، تبلت و موبایل طراحی کن.",
 size:"یک سیستم اندازه‌گذاری منسجم برای دسکتاپ، تبلت و موبایل طراحی کن. عرض کانتینر، فاصله‌ها، اندازه فونت، ارتفاع کنترل‌ها، شعاع گوشه‌ها و breakpointها را مشخص کن.",
 form:"یک فرم کامل با فیلدهای لازم، نوع داده، اجباری بودن، اعتبارسنجی، پیام خطا، شرط نمایش و وضعیت ارسال طراحی کن.",
 section:"یک بخش مستقل و قابل استفاده مجدد طراحی کن که عنوان، متن، تصویر، کارت‌ها، دکمه‌ها، تنظیمات و حالت موبایل داشته باشد.",
 advertorial:"یک بسته رپورتاژ حرفه‌ای فارسی بساز: چند تیتر، خلاصه، ساختار مقاله، متن پیشنهادی، توضیح شفاف تبلیغاتی، CTA، کلیدواژه و جایگاه لینک‌ها. ادعای تأییدنشده نساز.",
 report:"تعریف گزارش مدیریتی بساز: هدف گزارش، فیلترها، ستون‌ها، شاخص‌ها، روش تجمیع، نمودارهای مناسب و حالت بدون داده. هیچ عدد یا نتیجه ساختگی تولید نکن.",
 template:"یک قالب کامل و حرفه‌ای برای سوکار طراحی کن که صفحات اصلی، سیستم طراحی، اجزا، چیدمان و نسخه واکنش‌گرا را پوشش دهد."
};
export default function AiWorkshop(){
 const [tool,setTool]=useState<ToolId>("page"),[name,setName]=useState("طراحی جدید سوکار"),[framework,setFramework]=useState("Next.js + TypeScript"),[language,setLanguage]=useState("فارسی"),[prompt,setPrompt]=useState(defaults.page);
 const [artifact,setArtifact]=useState<Artifact|null>(null),[busy,setBusy]=useState(false),[codeBusy,setCodeBusy]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const current=useMemo(()=>tools.find(x=>x.id===tool)!,[tool]);
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get("tool") as ToolId|null;if(value&&tools.some(x=>x.id===value)){setTool(value);setPrompt(defaults[value]);setName("طراحی "+tools.find(x=>x.id===value)!.name+" سوکار");}},[]);
 function choose(id:ToolId){setTool(id);setPrompt(defaults[id]);setName("طراحی "+tools.find(x=>x.id===id)!.name+" سوکار");setArtifact(null);setError("");setNotice("");}
 async function generate(){setBusy(true);setError("");setNotice("");setArtifact(null);try{const r=await api<{artifact:Artifact}>("/api/ai/workshop/generate",{method:"POST",body:JSON.stringify({tool,name,framework,language,prompt})});setArtifact(r.artifact);setNotice("خروجی آماده بررسی است. هنوز در سایت منتشر نشده است.");}catch(e){setError(e instanceof Error?e.message:"تولید خروجی ناموفق بود.");}finally{setBusy(false);}}
 async function generateCode(){if(!artifact)return;setCodeBusy(true);setError("");setNotice("");try{const r=await api<{files:{path:string;language:string;content:string}[];notes:string[]}>("/api/ai/workshop/code",{method:"POST",body:JSON.stringify({tool,framework,artifact})});setArtifact(current=>current?{...current,sourceFiles:r.files}:current);setNotice("فایل‌های منبع تولید شدند و به پیش‌نویس اضافه شدند؛ هنوز اجرا یا منتشر نشده‌اند.");}catch(e){setError(e instanceof Error?e.message:"تولید فایل‌های منبع ناموفق بود.");}finally{setCodeBusy(false);}}
 async function save(){if(!artifact)return;setSaving(true);setError("");setNotice("");try{const r=await api<{message:string}>("/api/ai/workshop/save",{method:"POST",body:JSON.stringify({tool,name,framework,artifact})});setNotice(r.message);}catch(e){setError(e instanceof Error?e.message:"ذخیره خروجی ناموفق بود.");}finally{setSaving(false);}}
 return <main className="ai-workshop" dir="rtl">
  <header className="ai-workshop-hero"><div><span>SOOKAR · AI WORKSHOP</span><h1>کارگاه هوشمند ساخت سامانه</h1><p>برای هر بخش ابزار تخصصی خودش را انتخاب کن. نیاز را بنویس، خروجی ساختاریافته بگیر، بررسی کن و در ماژول مرکزی ذخیره کن.</p></div><Link href="/admin/templates">مدیریت قالب‌ها ↗</Link></header>
  <div className="ai-workshop-layout">
   <aside className="ai-tools-panel"><div className="ai-tools-heading"><b>ابزارهای هوشمند</b><small>۹ ابزار تخصصی</small></div>{tools.map(item=><button type="button" key={item.id} className={tool===item.id?"selected":""} onClick={()=>choose(item.id)}><span className="ai-tool-icon">{item.icon}</span><span><b>{item.name}</b><small>{item.desc}</small></span><i>‹</i></button>)}</aside>
   <section className="ai-workshop-main">
    <div className="ai-workshop-form"><div className="ai-current-tool"><span>{current.icon}</span><div><h2>{current.name}</h2><p>{current.desc}</p></div></div>
     <label>نام خروجی<input value={name} onChange={e=>setName(e.target.value)} maxLength={180}/></label>
     <div className="ai-workshop-fields"><label>فناوری<select value={framework} onChange={e=>setFramework(e.target.value)}><option>Next.js + TypeScript</option><option>React + TypeScript</option><option>Python + FastAPI</option><option>Next.js + Python FastAPI</option></select></label><label>زبان خروجی<select value={language} onChange={e=>setLanguage(e.target.value)}><option>فارسی</option><option>فارسی و انگلیسی</option><option>انگلیسی</option><option>عربی</option></select></label></div>
     <label>شرح دقیق درخواست<textarea rows={8} maxLength={5000} value={prompt} onChange={e=>setPrompt(e.target.value)}/><small>{prompt.length.toLocaleString("fa-IR")} از ۵۰۰۰ نویسه</small></label>
     <button className="ai-workshop-generate" onClick={generate} disabled={busy||prompt.trim().length<12}>{busy?"در حال طراحی و تحلیل...":"✳ تولید با هوش مصنوعی"}</button>
     <p className="ai-workshop-safe">خروجی‌ها پیش‌نویس هستند. منوها غیرفعال ذخیره می‌شوند و صفحات و فرم‌ها تا تأیید مدیر منتشر نخواهند شد.</p>
    </div>
    <div className="ai-workshop-output"><div className="ai-output-head"><div><span>GENERATED ARTIFACT</span><h2>خروجی و پیش‌نمایش</h2></div><span>{current.name}</span></div>
     {error&&<div className="ai-workshop-alert error">{error}</div>}{notice&&<div className="ai-workshop-alert success">{notice}</div>}
     {artifact?<><div className="ai-artifact-card"><div className="ai-artifact-title"><span>✳</span><div><h3>{artifact.title}</h3><p>{artifact.summary}</p></div></div>
       {tool==="menu"&&<div className="ai-menu-tree">{artifact.menuItems.map((item:any,i:number)=><div className="ai-menu-group" key={i}><b>▸ {item.title}</b>{(item.children||[]).map((child:any,j:number)=><div key={j}>↳ {child.title}<small>{child.path}</small></div>)}</div>)}</div>}
       {tool==="form"&&<div className="ai-field-list">{artifact.fields.map((f:any,i:number)=><div key={i}><b>{f.label}</b><small>{f.key} · {f.type} · {f.required?"الزامی":"اختیاری"}</small><p>{f.validation||"بدون قاعده اضافه"}</p></div>)}</div>}
       {(tool==="page"||tool==="section"||tool==="template"||tool==="advertorial")&&<div className="ai-sections-list">{artifact.sections.map((s:any,i:number)=><article key={i}><span>{String(i+1).padStart(2,"0")}</span><div><b>{s.title||s.type}</b><p>{s.description||s.content||""}</p></div></article>)}</div>}
       {(tool==="layout"||tool==="size")&&<div className="ai-json-preview"><pre>{JSON.stringify({layout:artifact.layout,tokens:artifact.tokens,breakpoints:artifact.breakpoints},null,2)}</pre></div>}
       {tool==="advertorial"&&<div className="ai-advertorial"><b>{artifact.content?.headline||artifact.title}</b><p>{artifact.content?.body||artifact.summary}</p><small>{artifact.content?.disclosure||"محتوای تبلیغاتی باید با برچسب رپورتاژ یا محتوای حمایت‌شده منتشر شود."}</small></div>}
       {tool==="report"&&<div className="ai-report-grid">{[...artifact.metrics,...artifact.filters,...artifact.charts].map((x:any,i:number)=><article key={i}><b>{x.label||x.name||x.title||"عنصر گزارش"}</b><small>{x.description||x.type||x.aggregation||""}</small></article>)}</div>}
       {artifact.seo&&Object.keys(artifact.seo).length>0&&<div className="ai-seo-box"><b>تنظیمات سئو</b><p>{artifact.seo.title||""}</p><small>{artifact.seo.description||""}</small></div>}
       {artifact.sourceFiles?.length?<div className="ai-source-files"><b>فایل‌های منبع تولیدشده</b>{artifact.sourceFiles.map((file,i)=><details key={i}><summary>{file.path}</summary><pre>{file.content}</pre></details>)}</div>:null}
       <div className="ai-acceptance"><b>معیارهای پذیرش</b><ul>{artifact.acceptanceCriteria.map((x:any,i:number)=><li key={i}>{typeof x==="string"?x:JSON.stringify(x)}</li>)}</ul></div>
      </div><div className="ai-artifact-actions"><span>خروجی هنوز پیش‌نویس است</span><div><button type="button" className="ai-code-button" onClick={generateCode} disabled={codeBusy}>{codeBusy?"در حال تولید کد...":"تولید فایل‌های کد"}</button><button onClick={save} disabled={saving}>{saving?"در حال ذخیره...":"ذخیره در ماژول مرکزی"}</button></div></div></>:<div className="ai-workshop-empty"><span>✳</span><h3>هنوز خروجی ساخته نشده</h3><p>ابزار را انتخاب کن و درخواستت را بنویس. هر ابزار خروجی مخصوص همان بخش را تولید می‌کند.</p></div>}
    </div>
   </section>
  </div>
 </main>;
}
