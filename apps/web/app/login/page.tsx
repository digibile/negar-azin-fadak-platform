import type {Metadata} from "next";
import PasswordField from "./PasswordField";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"ورود | مرکز مدیریت نگار آذین فدک",robots:{index:false,follow:false}};

async function humanCheck(){
 const base=process.env.API_INTERNAL_URL||"http://api:4000";
 try{const r=await fetch(base+"/api/auth/human-check",{cache:"no-store"});if(r.ok)return await r.json() as {challenge:string;question:string};}catch{}
 return {challenge:"",question:"تأیید انسانی در دسترس نیست"};
}

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
 const [check,params]=await Promise.all([humanCheck(),searchParams]);
 return <main className="auth-shell">
  <section className="auth-card nojs-auth">
   <span className="eyebrow">پلتفرم بیزینس نگار آذین فدک ایران</span>
   <h1>ورود به مرکز مدیریت</h1>
   <p className="muted">ورود امن با فرم استاندارد HTML، بدون وابستگی به JavaScript.</p>
   {params.error&&<div className="error" role="alert">{params.error}</div>}
   <form method="post" action="/api/auth/login" className="auth-form">
    <label>ایمیل<input name="email" type="email" autoComplete="username" defaultValue="admin@localhost.test" required/></label>
    <label>رمز عبور<PasswordField/></label>
    <input type="hidden" name="humanCheck" value={check.challenge}/>
    <label>تأیید انسانی <span className="captcha-question">{check.question}</span><input name="humanAnswer" inputMode="numeric" pattern="[0-9]+" autoComplete="off" required/></label>
    <button className="primary wide" type="submit">ورود به سامانه</button>
   </form>
   <noscript><p className="muted">این صفحه بدون JavaScript نیز قابل استفاده است.</p></noscript>
  </section>
 </main>;
}
