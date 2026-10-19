"use client";

import {FormEvent,useEffect,useState} from "react";

type HumanCheck={challenge:string;question:string};
type BrandKey="naf"|"digipay"|"digibile"|"vamcity"|"kipa"|"technolife";
const brands:Record<BrandKey,{name:string;description:string}>={
 naf:{name:"نگار آذین فدک",description:"ایجاد حساب امن برای دسترسی به خدمات سامانه."},
 digipay:{name:"دیجی‌پی",description:"ساخت حساب برای دسترسی به خدمات پرداخت."},
 digibile:{name:"دیجی‌بایل",description:"ایجاد حساب خریدار برای پیگیری خریدها و سفارش‌ها."},
 vamcity:{name:"وام‌سیتی",description:"ساخت حساب برای پیگیری درخواست‌ها و خدمات."},
 kipa:{name:"کیپا",description:"ایجاد حساب برای دسترسی به خدمات خرید."},
 technolife:{name:"تکنولایف",description:"ایجاد حساب مشتری برای خرید و پیگیری سفارش‌ها."}
};

export default function RegisterPage(){
 const [brandKey,setBrandKey]=useState<BrandKey>("naf");
 const brand=brands[brandKey];
 const [check,setCheck]=useState<HumanCheck>({challenge:"",question:"در حال دریافت تأیید انسانی…"});
 const [fullName,setFullName]=useState("");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const [answer,setAnswer]=useState("");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 useEffect(()=>{
  const key=new URLSearchParams(window.location.search).get("brand") as BrandKey|null;
  if(key&&key in brands)setBrandKey(key);
  fetch("/api/auth/human-check",{cache:"no-store",credentials:"include"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"دریافت تأیید انسانی ناموفق بود");setCheck(d);}).catch(e=>setError(e instanceof Error?e.message:"خطا در دریافت تأیید انسانی"));
 },[]);
 async function refreshCheck(){
  try{const r=await fetch("/api/auth/human-check",{cache:"no-store",credentials:"include"});const d=await r.json();if(r.ok)setCheck(d);}catch{}
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  if(password.length<8){setError("رمز عبور باید حداقل ۸ نویسه باشد");return;}
  if(password!==confirmPassword){setError("تکرار رمز عبور یکسان نیست");return;}
  setLoading(true);
  try{
   const response=await fetch("/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},credentials:"include",body:JSON.stringify({fullName,email,password,humanCheck:check.challenge,humanAnswer:answer})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.error||"ثبت‌نام انجام نشد");
   window.location.assign(data?.user?.role==="admin"||data?.user?.role==="manager"?"/admin":"/customer");
  }catch(e){setError(e instanceof Error?e.message:"خطای داخلی سرویس");setAnswer("");await refreshCheck();}
  finally{setLoading(false);}
 }
 return <main dir="rtl" style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:"28px 16px",background:"linear-gradient(135deg,#f4f8fb,#e8f7f4)",fontFamily:"Vazirmatn,Tahoma,sans-serif",color:"#172b40"}}>
  <section style={{width:"min(500px,100%)",background:"#fff",border:"1px solid #e4edf0",borderRadius:24,padding:"clamp(22px,5vw,42px)",boxShadow:"0 24px 70px #16334a12"}}>
   <a href={"/login?brand="+brandKey} style={{fontSize:12,color:"#087f79",fontWeight:800,textDecoration:"none"}}>← قبلاً حساب دارید؟ ورود</a>
   <div style={{marginTop:25,display:"flex",alignItems:"center",gap:12}}><div style={{width:48,height:48,borderRadius:15,display:"grid",placeItems:"center",background:"#e5f8f4",color:"#07857e",fontSize:23,fontWeight:900}}>د</div><div><strong style={{fontSize:21}}>{brand.name}</strong><div style={{fontSize:12,color:"#7b8997",marginTop:4}}>حساب کاربری امن</div></div></div>
   <h1 style={{fontSize:25,margin:"24px 0 8px"}}>ایجاد حساب کاربری</h1><p style={{fontSize:13,lineHeight:2,color:"#6b7d8f",marginTop:0}}>{brand.description}</p>
   {error&&<div role="alert" style={{background:"#fff0f0",border:"1px solid #ffd8d8",color:"#ad3030",padding:12,borderRadius:10,fontSize:12,lineHeight:1.8,margin:"14px 0"}}>{error}</div>}
   <form onSubmit={submit} style={{display:"grid",gap:14,marginTop:22}}>
    <label style={{display:"grid",gap:7,fontSize:12,fontWeight:800}}>نام و نام خانوادگی<input autoComplete="name" required minLength={2} maxLength={200} value={fullName} onChange={e=>setFullName(e.target.value)} style={{padding:13,border:"1px solid #dbe5eb",borderRadius:11,outlineColor:"#14b8a6"}}/></label>
    <label style={{display:"grid",gap:7,fontSize:12,fontWeight:800}}>ایمیل<input type="email" autoComplete="email" required maxLength={320} dir="ltr" value={email} onChange={e=>setEmail(e.target.value)} style={{padding:13,border:"1px solid #dbe5eb",borderRadius:11,outlineColor:"#14b8a6"}}/></label>
    <label style={{display:"grid",gap:7,fontSize:12,fontWeight:800}}>رمز عبور<input type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={password} onChange={e=>setPassword(e.target.value)} style={{padding:13,border:"1px solid #dbe5eb",borderRadius:11,outlineColor:"#14b8a6"}}/></label>
    <label style={{display:"grid",gap:7,fontSize:12,fontWeight:800}}>تکرار رمز عبور<input type="password" autoComplete="new-password" required minLength={8} maxLength={200} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} style={{padding:13,border:"1px solid #dbe5eb",borderRadius:11,outlineColor:"#14b8a6"}}/></label>
    <div style={{background:"#f3f8fa",border:"1px solid #e1eaef",borderRadius:12,padding:14,display:"grid",gridTemplateColumns:"1fr 100px",gap:12,alignItems:"center"}}><div><strong style={{fontSize:12}}>تأیید انسانی</strong><div style={{fontSize:13,marginTop:7}}>{check.question}</div></div><input aria-label="پاسخ تأیید انسانی" inputMode="numeric" pattern="[0-9]+" autoComplete="off" required value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="پاسخ" style={{minWidth:0,width:"100%",padding:12,border:"1px solid #dbe5eb",borderRadius:10}}/></div>
    <button type="submit" disabled={loading||!check.challenge} style={{border:0,borderRadius:12,padding:15,background:loading?"#8ebdb8":"#07877f",color:"#fff",fontWeight:900,cursor:loading?"wait":"pointer"}}>{loading?"در حال ایجاد حساب…":"ایجاد حساب و ورود"}</button>
   </form>
   <p style={{fontSize:11,color:"#83909d",lineHeight:2,marginTop:18}}>رمز عبور به‌صورت هش‌شده ذخیره می‌شود؛ حساب تازه با سطح دسترسی مشتری ساخته خواهد شد.</p>
  </section>
 </main>;
}
