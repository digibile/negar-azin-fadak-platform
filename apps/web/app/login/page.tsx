"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {api} from "../../lib/api";
export default function Login(){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState("");
 const router=useRouter();
 async function submit(e:React.FormEvent){e.preventDefault();setError("");try{const r=await api<any>("/api/auth/login",{method:"POST",body:JSON.stringify({email,password})});localStorage.setItem("naf_token",r.token);router.push("/admin")}catch(e){setError(e instanceof Error?e.message:"خطا")}}
 return <main className="auth-shell"><form className="auth-card" onSubmit={submit}><span className="eyebrow">پلتفرم بیزینس نگار آذین فدک ایران</span><h1>ورود به مرکز مدیریت</h1>{error&&<div className="error">{error}</div>}<label>ایمیل<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>رمز عبور<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary wide">ورود</button></form></main>;
}