"use client";

import type {Metadata} from "next";
import {FormEvent, useEffect, useState} from "react";

type HumanCheck={challenge:string;question:string};

async function getHumanCheck():Promise<HumanCheck>{
 const r=await fetch("/api/auth/human-check",{cache:"no-store",credentials:"include"});
 if(!r.ok)throw new Error("تأیید انسانی در دسترس نیست");
 return await r.json() as HumanCheck;
}

export default function Login(){
 const [check,setCheck]=useState<HumanCheck>({challenge:"",question:"در حال دریافت تأیید انسانی..."});
 const [email,setEmail]=useState("admin@localhost");
 const [password,setPassword]=useState("");
 const [answer,setAnswer]=useState("");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);

 useEffect(()=>{getHumanCheck().then(setCheck).catch(e=>setError(e instanceof Error?e.message:"خطا در دریافت تأیید انسانی"));},[]);

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

 return <main className="naf-login">
  <button className="naf-theme" type="button" aria-label="تغییر پوسته" title="تغییر پوسته">◐</button>
  <section className="naf-login-panel">
   <div className="naf-login-box">
    <div className="naf-brand"><div className="naf-brand-mark" aria-hidden="true">ن</div><div><div className="naf-brand-name">نگار آذین فدک</div><div className="naf-brand-sub">BUSINESS PLATFORM</div></div></div>
    <h1>ورود به سامانه</h1>
    <p className="naf-subtitle">ورود امن به پروفایل و داشبورد اختصاصی شما</p>
    {error&&<div className="naf-error" role="alert">{error}</div>}
    <form onSubmit={submit} className="naf-login-form">
     <label><span>نام کاربری یا ایمیل سازمانی</span><input name="email" type="email" autoComplete="username" placeholder="name@company.com" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
     <label><span>رمز عبور</span><input name="password" type="password" autoComplete="current-password" placeholder="••••••••••" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
     <div className="naf-form-row"><label className="naf-remember"><input type="checkbox" name="remember" value="1"/><span>مرا به خاطر بسپار</span></label><a href="/forgot-password">بازیابی دسترسی</a></div>
     <input type="hidden" name="humanCheck" value={check.challenge}/>
     <div className="naf-captcha"><div className="naf-captcha-head"><span>تأیید انسانی</span><b>CAPTCHA</b></div><div className="naf-captcha-body"><strong>{check.question}</strong><input name="humanAnswer" inputMode="numeric" pattern="[0-9]+" autoComplete="off" aria-label="پاسخ تأیید انسانی" placeholder="پاسخ" value={answer} onChange={e=>setAnswer(e.target.value)} required/></div></div>
     <button className="naf-primary" type="submit" disabled={loading}>{loading?"در حال ورود...":"ورود امن"}</button>
    </form>
    <p className="naf-foot">پس از ورود، بر اساس نقش کاربری به داشبورد اختصاصی هدایت می‌شوید · نسخه ۲۰۲۶</p>
   </div>
  </section>
  <aside className="naf-visual" aria-label="نمای هسته مرکزی"><div className="naf-orbit"><div className="naf-ring"/><div className="naf-ring naf-r2"/><div className="naf-ring naf-r3"/><div className="naf-core"><span>پروفایل</span><b>کاربر</b></div><p className="naf-caption">هر کاربر پس از احراز هویت وارد فضای اختصاصی خود می‌شود</p></div></aside>
 </main>;
}
