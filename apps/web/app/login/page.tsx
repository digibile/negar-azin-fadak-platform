import type {Metadata} from "next";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"ورود | مرکز مدیریت نگار آذین فدک",
 robots:{index:false,follow:false}
};

type HumanCheck={challenge:string;question:string};

async function humanCheck():Promise<HumanCheck>{
 const base=process.env.API_INTERNAL_URL||"http://api:4000";
 try{
  const r=await fetch(base+"/api/auth/human-check",{cache:"no-store"});
  if(r.ok)return await r.json() as HumanCheck;
 }catch{}
 return {challenge:"",question:"تأیید انسانی در دسترس نیست"};
}

const modules=[
 ["◈","سازمان"],["₿","مالی"],["▣","خزانه"],["⌘","تجارت"],["◎","مشتریان"],["▦","عملیات"]
] as const;

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const [check,params]=await Promise.all([humanCheck(),searchParams]);

 return <main className="naf-login">
  <button className="naf-theme" type="button" aria-label="تغییر پوسته" title="تغییر پوسته">◐</button>

  <section className="naf-login-panel">
   <div className="naf-login-box">
    <div className="naf-brand">
     <div className="naf-brand-mark" aria-hidden="true">ن</div>
     <div>
      <div className="naf-brand-name">نگار آذین فدک</div>
      <div className="naf-brand-sub">BUSINESS PLATFORM</div>
     </div>
    </div>

    <h1>ورود به مرکز مدیریت</h1>
    <p className="naf-subtitle">به هسته مرکزی سازمان خود وارد شوید</p>

    {params.error&&<div className="naf-error" role="alert">{params.error}</div>}

    <form method="post" action="/api/auth/login" className="naf-login-form">
     <label>
      <span>نام کاربری یا ایمیل سازمانی</span>
      <input name="email" type="email" autoComplete="username" placeholder="name@company.com" defaultValue="admin@localhost.test" required/>
     </label>

     <label>
      <span>رمز عبور</span>
      <input name="password" type="password" autoComplete="current-password" placeholder="••••••••••" required/>
     </label>

     <div className="naf-form-row">
      <label className="naf-remember">
       <input type="checkbox" name="remember" value="1"/>
       <span>مرا به خاطر بسپار</span>
      </label>
      <a href="/login?error=بازیابی+رمز+عبور+در+نسخه+فعلی+فعال+نیست">فراموشی رمز عبور</a>
     </div>

     <input type="hidden" name="humanCheck" value={check.challenge}/>
     <div className="naf-captcha">
      <div className="naf-captcha-head">
       <span>تأیید انسانی</span>
       <b>CAPTCHA</b>
      </div>
      <div className="naf-captcha-body">
       <strong>{check.question}</strong>
       <input name="humanAnswer" inputMode="numeric" pattern="[0-9]+" autoComplete="off" aria-label="پاسخ تأیید انسانی" placeholder="پاسخ" required/>
      </div>
     </div>

     <button className="naf-primary" type="submit">ورود امن</button>
    </form>

    <div className="naf-divider"><span>یا</span></div>
    <form method="get" action="/login" className="naf-otp-form">
     <button className="naf-otp" type="submit" name="error" value="ورود با کد یکبار مصرف در این مرحله فعال نیست">ورود با کد یکبار مصرف (OTP) <span>⌁</span></button>
    </form>

    <p className="naf-foot">ورود شما ثبت و در Audit Log نگهداری می‌شود · نسخه ۲۰۲۶</p>
   </div>
  </section>

  <aside className="naf-visual" aria-label="نمای هسته مرکزی">
   <div className="naf-orbit">
    <div className="naf-ring"/>
    <div className="naf-ring naf-r2"/>
    <div className="naf-ring naf-r3"/>
    {modules.map(([icon,label],i)=><div className={"naf-node naf-n"+(i+1)} key={label}><span>{icon}</span><small>{label}</small></div>)}
    <div className="naf-core"><span>هسته</span><b>مرکزی</b></div>
    <p className="naf-caption">تمام ماژول‌ها از یک هسته مرکزی و یکپارچه تغذیه می‌شوند</p>
   </div>
  </aside>
 </main>;
}
