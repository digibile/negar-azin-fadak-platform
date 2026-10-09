"use client";

import {FormEvent, useEffect, useState, type CSSProperties} from "react";

type HumanCheck={challenge:string;question:string};
type BrandKey="naf"|"digipay"|"digibile"|"vamcity"|"kipa"|"technolife";
const brands:Record<BrandKey,{name:string;subtitle:string;title:string;description:string;mark:string;accent:string;dark:string}>={
 naf:{name:"نگار آذین فدک",subtitle:"BUSINESS PLATFORM",title:"ورود به سامانه",description:"ورود امن به پروفایل و داشبورد اختصاصی شما",mark:"ن",accent:"#c9a227",dark:"#8a6c17"},
 digipay:{name:"دیجی‌پی",subtitle:"PAYMENTS & FINANCIAL SERVICES",title:"ورود به دیجی‌پی",description:"ورود امن به خدمات پرداخت و حساب کاربری دیجی‌پی",mark:"پ",accent:"#00a9c7",dark:"#075b91"},
 digibile:{name:"دیجی‌بایل",subtitle:"COMMERCE PLATFORM",title:"ورود به دیجی‌بایل",description:"مدیریت خریدها، سفارش‌ها و حساب بازارگاه شما",mark:"د",accent:"#14b8a6",dark:"#146b68"},
 vamcity:{name:"وام‌سیتی",subtitle:"CREDIT & LENDING",title:"ورود به وام‌سیتی",description:"پیگیری درخواست‌ها و حساب تسهیلات شما",mark:"و",accent:"#8b7cf6",dark:"#4338ca"},
 kipa:{name:"کیپا",subtitle:"SMART SHOPPING",title:"ورود به کیپا",description:"ورود به حساب کاربری و خدمات خرید شما",mark:"ک",accent:"#0f766e",dark:"#115e59"},
 technolife:{name:"تکنولایف",subtitle:"TECHNOLOGY STORE",title:"ورود به تکنولایف",description:"مدیریت سفارش‌ها و حساب فروشگاه فناوری",mark:"ت",accent:"#f43f5e",dark:"#be123c"}
};

async function getHumanCheck():Promise<HumanCheck>{
 const r=await fetch("/api/auth/human-check",{cache:"no-store",credentials:"include"});
 if(!r.ok)throw new Error("تأیید انسانی در دسترس نیست");
 return await r.json() as HumanCheck;
}

export default function Login(){
 const [brandKey,setBrandKey]=useState<BrandKey>("naf");
 const brand=brands[brandKey];
 const [check,setCheck]=useState<HumanCheck>({challenge:"",question:"در حال دریافت تأیید انسانی..."});
 const [email,setEmail]=useState("admin@localhost");
 const [password,setPassword]=useState("");
 const [answer,setAnswer]=useState("");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);

 useEffect(()=>{const requested=new URLSearchParams(window.location.search).get("brand") as BrandKey|null;if(requested&&requested in brands)setBrandKey(requested);getHumanCheck().then(setCheck).catch(e=>setError(e instanceof Error?e.message:"خطا در دریافت تأیید انسانی"));},[]);

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  setError("");
  setLoading(true);
  try{
   const res=await fetch("/api/auth/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    credentials:"include",
    body:JSON.stringify({email,password,humanCheck:check.challenge,humanAnswer:answer})
   });
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(data.error||"ورود انجام نشد");
   const role=data?.user?.role;
   window.location.assign(role==="admin"||role==="manager"?"/admin":"/customer");
  }catch(e){
   setError(e instanceof Error?e.message:"خطای داخلی سرویس");
   try{setCheck(await getHumanCheck());setAnswer("");}catch{}
  }finally{setLoading(false);}
 }

 return <main className="naf-login" style={{"--naf-accent":brand.accent,"--naf-accent-dark":brand.dark} as CSSProperties}>
  <button className="naf-theme" type="button" aria-label="تغییر پوسته" title="تغییر پوسته">◐</button>
  <section className="naf-login-panel">
   <div className="naf-login-box">
    <div className="naf-brand"><div className="naf-brand-mark" aria-hidden="true">{brand.mark}</div><div><div className="naf-brand-name">{brand.name}</div><div className="naf-brand-sub">{brand.subtitle}</div></div></div>
    <h1>{brand.title}</h1>
    <p className="naf-subtitle">{brand.description}</p>
    {error&&<div className="naf-error" role="alert">{error}</div>}
    <form onSubmit={submit} className="naf-login-form">
     <label><span>نام کاربری یا ایمیل سازمانی</span><input name="email" type="email" autoComplete="username" placeholder="name@company.com" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
     <label><span>رمز عبور</span><input name="password" type="password" autoComplete="current-password" placeholder="••••••••••" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
     <div className="naf-form-row"><label className="naf-remember"><input type="checkbox" name="remember" value="1"/><span>مرا به خاطر بسپار</span></label><a href={"/forgot-password?brand="+brandKey}>بازیابی دسترسی</a></div>
     <input type="hidden" name="humanCheck" value={check.challenge}/>
     <div className="naf-captcha"><div className="naf-captcha-head"><span>تأیید انسانی</span><b>CAPTCHA</b></div><div className="naf-captcha-body"><strong>{check.question}</strong><input name="humanAnswer" inputMode="numeric" pattern="[0-9]+" autoComplete="off" aria-label="پاسخ تأیید انسانی" placeholder="پاسخ" value={answer} onChange={e=>setAnswer(e.target.value)} required/></div></div>
     <button className="naf-primary" type="submit" disabled={loading}>{loading?"در حال ورود...":"ورود امن"}</button>
    </form>
    <p className="naf-foot">پس از ورود، بر اساس نقش کاربری به داشبورد اختصاصی هدایت می‌شوید · نسخه ۲۰۲۶</p>
    <p className="naf-foot">حساب کاربری ندارید؟ <a href={"/register?brand="+brandKey}>ایجاد حساب یا ثبت درخواست</a></p>
   </div>
  </section>
  <aside className="naf-visual" aria-label="نمای هسته مرکزی"><div className="naf-orbit"><div className="naf-ring"/><div className="naf-ring naf-r2"/><div className="naf-ring naf-r3"/><div className="naf-core"><span>پروفایل</span><b>کاربر</b></div><p className="naf-caption">ورود امن به فضای اختصاصی {brand.name}</p></div></aside>
 </main>;
}
