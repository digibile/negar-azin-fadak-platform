"use client";

import Link from "next/link";
import {useEffect,useState} from "react";

type Step="request"|"eligibility"|"kyc"|"score"|"done";

export default function Apply(){
 const [step,setStep]=useState<Step>("request");
 const [auth,setAuth]=useState<boolean|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [applicationId,setApplicationId]=useState("");
 const [result,setResult]=useState<any>(null);
 const [form,setForm]=useState({
  customerRef:"",productCode:"purchase-credit",requestedAmount:"",termMonths:"12",purpose:"",
  monthlyIncome:"",monthlyObligations:"",kycProviderRef:"",
  paymentHistoryScore:"70",incomeStabilityScore:"70",identityConfidenceScore:"100"
 });
 useEffect(()=>{fetch("/api/auth/me",{credentials:"include"}).then(async r=>{setAuth(r.ok);if(r.ok){const b=await r.json();setForm(x=>({...x,customerRef:x.customerRef||b.user?.id||""}));}}).catch(()=>setAuth(false));},[]);
 const update=(key:string,value:string)=>setForm(x=>({...x,[key]:value}));
 const call=async(path:string,body:any)=>{
  const r=await fetch(path,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json","x-csrf-token":getCookie("naf_csrf")},body:JSON.stringify(body)});
  const b=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(b.error||"عملیات ناموفق بود");
  return b;
 };
 async function submitRequest(){
  setBusy(true);setMessage("");
  try{
   const b=await call("/api/lendtech/applications",{
    customerRef:form.customerRef,productCode:form.productCode,requestedAmount:Number(form.requestedAmount),
    termMonths:Number(form.termMonths),purpose:form.purpose
   });
   setApplicationId(b.id);setResult(b);setStep("eligibility");setMessage("درخواست ثبت شد. مرحله ارزیابی اولیه آماده است.");
  }catch(e){setMessage(e instanceof Error?e.message:"خطا");}finally{setBusy(false);}
 }
 async function submitEligibility(){
  setBusy(true);setMessage("");
  try{
   const b=await call("/api/lendtech/applications/"+applicationId+"/eligibility",{monthlyIncome:Number(form.monthlyIncome),monthlyObligations:Number(form.monthlyObligations||0)});
   setResult(b.application);if(!b.eligible)throw new Error(b.reason||"درخواست واجد شرایط نیست");
   setStep("kyc");setMessage("ارزیابی اولیه تأیید شد. اکنون مرجع تأیید احراز هویت خارجی را ثبت کنید.");
  }catch(e){setMessage(e instanceof Error?e.message:"خطا");}finally{setBusy(false);}
 }
 async function submitKyc(){
  setBusy(true);setMessage("");
  try{
   const b=await call("/api/lendtech/applications/"+applicationId+"/kyc",{status:"verified",providerRef:form.kycProviderRef});
   setResult(b);setStep("score");setMessage("تأیید KYC با مرجع ارائه‌شده ثبت شد.");
  }catch(e){setMessage(e instanceof Error?e.message:"خطا");}finally{setBusy(false);}
 }
 async function submitScore(){
  setBusy(true);setMessage("");
  try{
   const b=await call("/api/lendtech/applications/"+applicationId+"/score",{});
   setResult(b.score);setStep("done");setMessage("امتیازدهی انجام شد و نتیجه برای تصمیم اعتباری آماده است.");
  }catch(e){setMessage(e instanceof Error?e.message:"خطا");}finally{setBusy(false);}
 }
 if(auth===false)return <main className="sookar-pay" dir="rtl"><header className="pay-header"><Link href="/pay" className="pay-logo"><b>سوکار</b><span>ثبت درخواست</span></Link></header><section className="pay-section"><div className="pay-card"><span>ورود لازم است</span><h2>برای ثبت درخواست ابتدا وارد شوید</h2><p>درخواست مالی به حساب کاربری و محدوده سازمانی معتبر متصل است.</p><Link className="pay-primary" href="/login">ورود به حساب</Link></div></section></main>;
 if(auth===null)return <main className="sookar-pay" dir="rtl"><section className="pay-section"><div className="pay-card"><p>در حال بررسی نشست کاربر...</p></div></section></main>;
 return <main className="sookar-pay" dir="rtl">
  <header className="pay-header"><Link href="/pay" className="pay-logo"><b>سوکار</b><span>ثبت درخواست</span></Link><nav><Link href="/store">فروشگاه</Link><Link href="/pay/plans">طرح‌ها</Link></nav></header>
  <section className="pay-section">
   <header><div><span>LendTech · فرآیند واقعی</span><h2>ثبت درخواست اعتبار و تسهیلات</h2><p>اطلاعات مستقیماً در چرخه درخواست، ارزیابی، احراز هویت و امتیازدهی ثبت می‌شود.</p></div></header>
   <div className="plan-grid">
    <article className="pay-card"><span>مرحله {step==="request"?"۱":step==="eligibility"?"۲":step==="kyc"?"۳":"۴"}</span>
     {step==="request"&&<><h3>اطلاعات درخواست</h3><label>شناسه مشتری<input value={form.customerRef} onChange={e=>update("customerRef",e.target.value)} placeholder="شناسه واقعی مشتری" /></label><label>محصول مالی<select value={form.productCode} onChange={e=>update("productCode",e.target.value)}><option value="purchase-credit">اعتبار خرید</option><option value="purchase-loan">وام خرید</option><option value="revolving-credit">اعتبار گردشی</option><option value="corporate-facility">تسهیلات سازمانی</option></select></label><label>مبلغ درخواستی<input inputMode="decimal" value={form.requestedAmount} onChange={e=>update("requestedAmount",e.target.value)} placeholder="مبلغ" /></label><label>مدت، ماه<input inputMode="numeric" value={form.termMonths} onChange={e=>update("termMonths",e.target.value)} /></label><label>هدف درخواست<textarea value={form.purpose} onChange={e=>update("purpose",e.target.value)} /></label><button disabled={busy} onClick={submitRequest}>{busy?"در حال ثبت...":"ثبت درخواست"}</button></>}
     {step==="eligibility"&&<><h3>ارزیابی توان بازپرداخت</h3><p>نسبت تعهدات به درآمد به‌صورت واقعی محاسبه می‌شود. سقف مرحله اولیه ۵۰٪ است.</p><label>درآمد ماهانه<input inputMode="decimal" value={form.monthlyIncome} onChange={e=>update("monthlyIncome",e.target.value)} /></label><label>تعهدات ماهانه<input inputMode="decimal" value={form.monthlyObligations} onChange={e=>update("monthlyObligations",e.target.value)} /></label><button disabled={busy} onClick={submitEligibility}>{busy?"در حال ارزیابی...":"اجرای ارزیابی"}</button></>}
     {step==="kyc"&&<><h3>مرجع احراز هویت</h3><p>سامانه خودش هویت را جعل نمی‌کند. فقط نتیجه تأییدکننده خارجی و مرجع آن را ثبت می‌کند.</p><label>مرجع تأیید KYC<input value={form.kycProviderRef} onChange={e=>update("kycProviderRef",e.target.value)} placeholder="شناسه تراکنش/مرجع سرویس احراز هویت" /></label><button disabled={busy} onClick={submitKyc}>{busy?"در حال ثبت...":"ثبت تأیید KYC"}</button></>}
     {step==="score"&&<><h3>امتیازدهی اعتباری</h3><p>امتیاز با قواعد نسخه‌دار محاسبه می‌شود و ورودی‌ها در سابقه درخواست ذخیره می‌شوند.</p><p>امتیاز از داده‌های ثبت‌شده پرونده، نسبت تعهدات به درآمد، وضعیت KYC، سابقه بازپرداخت و معوقات محاسبه می‌شود. کاربر نمی‌تواند امتیاز را دستی وارد کند.</p><button disabled={busy} onClick={submitScore}>{busy?"در حال محاسبه...":"محاسبه امتیاز"}</button></>}
     {step==="done"&&<><h3>درخواست وارد مرحله تصمیم شد</h3><p>شناسه درخواست: <strong>{applicationId}</strong></p><p>نتیجه امتیازدهی ثبت شده است. تصمیم اعتباری و کمیته از مسیر عملیاتی سامانه انجام می‌شود.</p><Link href="/pay" className="pay-primary">بازگشت به مرکز اعتبار</Link></>}
     {message&&<div className="pay-notice">{message}</div>}
    </article>
    <article className="pay-card"><span>وضعیت</span><h3>زنجیره اعتبار</h3><ol><li className={step==="request"?"active":""}>ثبت درخواست</li><li className={step==="eligibility"?"active":""}>احراز شرایط اولیه</li><li className={step==="kyc"?"active":""}>KYC</li><li className={step==="score"?"active":""}>امتیازدهی</li><li className={step==="done"?"active":""}>تصمیم اعتباری</li></ol>{result&&<pre>{JSON.stringify(result,null,2)}</pre>}</article>
   </div>
  </section>
 </main>;
}

function getCookie(name:string){
 if(typeof document==="undefined")return "";
 return document.cookie.split("; ").find(x=>x.startsWith(name+"="))?.split("=")[1]||"";
}
