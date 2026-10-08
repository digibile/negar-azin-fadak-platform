"use client";

import {useMemo} from "react";

type Section={title:string;description:string;code:string;kind:string};

const sections:Section[]=[
  {title:"زونکن دیجیتال",description:"پرونده و نگهداری ساختاریافته اسناد سازمانی.",code:"17-digital-binder",kind:"زونکن"},
  {title:"مدیریت اسناد",description:"ثبت، نسخه‌بندی، چرخه عمر و وضعیت مستندات.",code:"41-documentation",kind:"اسناد"},
  {title:"اتوماسیون اداری",description:"کارتابل و گردش مستندات اداری ثبت‌شده در سامانه.",code:"42-document-approvals",kind:"گردش"},
  {title:"قراردادها و امور حقوقی",description:"مدیریت قراردادها و پرونده‌های حقوقی سازمان.",code:"47-contracts-legal",kind:"حقوقی"},
  {title:"احراز هویت و مدارک",description:"پرونده احراز هویت و مدارک مرتبط.",code:"02-identity",kind:"هویت"},
  {title:"OCR و اسناد هوشمند",description:"پردازش و کنترل اسناد با قابلیت‌های OCR ثبت‌شده.",code:"41-ai-documents-ocr",kind:"OCR"},
  {title:"حسابرسی و کنترل داخلی",description:"کنترل‌های حسابرسی و شواهد داخلی مرتبط با اسناد.",code:"42-audit-internal-control",kind:"کنترل"}
];

export default function DocumentGovernancePanelWorkspace(){
 const active=useMemo(()=>sections,[sections]);
 return <main className="module-runtime canonical-module" dir="rtl">
  <header className="page-head">
   <div>
    <span className="eyebrow">منوی مرکزی سازمان · پنل ۱۹</span>
    <h1>پنل مستندات و حاکمیت اسناد</h1>
    <p className="muted">مرکز یکپارچه دسترسی به زونکن، مستندات، گردش اداری، قراردادها، احراز هویت، OCR و کنترل داخلی. همه مسیرها به فضای عملیاتی واقعی خودشان متصل‌اند.</p>
   </div>
   <a className="back-link" href="/admin">مرکز مدیریت</a>
  </header>
  <section className="runtime-panel">
   <div className="panel-title"><div><h2>فضاهای عملیاتی پنل ۱۹</h2><span>{active.length} حوزه متصل به رجیستری سامانه</span></div></div>
   <div className="control-grid">
    {active.map(item=><a className="control-card" href={"/modules/?code="+encodeURIComponent(item.code)} key={item.code}>
      <div><span>{item.kind}</span><h2>{item.title}</h2><small>{item.description}</small><small>کد عملیاتی: {item.code}</small></div><strong>›</strong>
    </a>)}
   </div>
  </section>
  <section className="runtime-panel">
   <div className="panel-title"><div><h2>اصل اتصال</h2><span>بدون داده ساختگی</span></div></div>
   <p className="muted">این پنل نقش لایه سازمان‌دهی را دارد؛ داده و عملیات در ماژول تخصصی متناظر ثبت می‌شود و پنل ۱۹ رکورد موازی و تکراری ایجاد نمی‌کند.</p>
  </section>
 </main>;
}
