"use client";
import {useEffect,useState} from "react";
import styles from "./SecurityWorkspace.module.css";
type User={id:string;email:string;full_name:string;role:string;status:string};
const base=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";
async function getData(){const r=await fetch(base+"/api/security/overview",{credentials:"include"});const b=await r.json();if(!r.ok)throw new Error(b?.error||"خطا");return b}
export default function SecurityWorkspace(){
 const [tab,setTab]=useState("users"),[data,setData]=useState<any>({users:[],roles:[],sessions:[],logins:[],policies:[]}),[error,setError]=useState("");
 const load=async()=>{try{setError("");setData(await getData())}catch(e){setError(e instanceof Error?e.message:"خطا")}};
 useEffect(()=>{load()},[]);
 const revoke=async(id:string)=>{await fetch(base+"/api/security/sessions/"+id+"/revoke",{method:"POST",credentials:"include",headers:{"X-CSRF-Token":csrf()}});await load()};
 const toggle=async(p:any)=>{await fetch(base+"/api/security/policies/"+p.policy_key,{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},body:JSON.stringify({...p,enabled:!p.enabled})});await load()};
 const names:any={users:"کاربران",roles:"نقش‌ها",permissions:"مجوزها",sessions:"نشست‌ها",login:"ورود و خروج",policies:"سیاست‌های امنیتی",audit:"حسابرسی امنیتی"};
 return <main className={styles.wrap}><header className={styles.head}><div><span className={styles.muted}>منوی مرکزی سازمان · ۰۳</span><h1>کاربران و امنیت</h1><p className={styles.muted}>مدیریت کاربران، نقش‌ها، مجوزها، نشست‌ها و کنترل‌های امنیتی</p></div><button className={styles.primary} onClick={load}>به‌روزرسانی</button></header>
 {error&&<div className={styles.error}>{error}</div>}
 <section className={styles.grid}>{[["کاربران",data.users.length],["نقش‌ها",data.roles.length],["نشست‌ها",data.sessions.filter((x:any)=>!x.revoked_at).length],["ورودها",data.logins.length]].map(x=><div className={styles.card} key={String(x[0])}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</section>
 <nav className={styles.tabs}>{Object.entries(names).map(([k,v])=><button className={tab===k?styles.active:""} onClick={()=>setTab(k)} key={k}>{v as string}</button>)}</nav>
 <div className={styles.layout}><section className={styles.panel}><h2>{names[tab]}</h2>
 {tab==="users"&&<div className={styles.rows}>{data.users.map((u:User)=><div className={styles.row} key={u.id}><div><b>{u.full_name}</b><small>{u.email} · {u.role}</small></div><span>{u.status}</span></div>)}</div>}
 {tab==="roles"&&<div className={styles.rows}>{data.roles.map((r:any)=><div className={styles.row} key={r.role}><b>{r.role}</b><span>{r.user_count} کاربر</span></div>)}</div>}
 {tab==="permissions"&&<div className={styles.rows}><div className={styles.row}><b>کاتالوگ مجوزها</b><span>نقش‌محور</span></div><div className={styles.row}><b>مجوزهای ماژول‌ها</b><span>خواندن · نوشتن · حذف</span></div></div>}
 {tab==="sessions"&&<div className={styles.rows}>{data.sessions.map((s:any)=><div className={styles.row} key={s.id}><div><b>{s.ip_address||"IP ثبت نشده"}</b><small>{s.user_agent||"مرورگر نامشخص"}</small></div>{s.revoked_at?<span>لغو شده</span>:<button onClick={()=>revoke(s.id)}>لغو نشست</button>}</div>)}</div>}
 {tab==="login"&&<div className={styles.rows}>{data.logins.map((l:any)=><div className={styles.row} key={l.id}><div><b>{l.email}</b><small>{l.ip_address||"IP نامشخص"} · {new Date(l.occurred_at).toLocaleString("fa-IR")}</small></div><span>{l.success?"موفق":"ناموفق"}</span></div>)}</div>}
 {tab==="policies"&&<div className={styles.rows}>{data.policies.map((p:any)=><div className={styles.row} key={p.id}><b>{p.title}</b><button onClick={()=>toggle(p)}>{p.enabled?"فعال":"غیرفعال"}</button></div>)}</div>}
 {tab==="audit"&&<div className={styles.rows}>{data.logins.map((l:any)=><div className={styles.row} key={l.id}><b>{l.success?"ورود موفق":"تلاش ناموفق"}</b><span>{l.email}</span></div>)}</div>}
 </section><aside className={styles.panel}><h2>زیرمنوهای امنیت</h2><div className={styles.rows}>{Object.entries(names).map(([k,v])=><div className={styles.row} key={k}><b>{v as string}</b><span>داینامیک</span></div>)}</div></aside></div></main>
}