"use client";

import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";
import {api} from "../../lib/api";
import styles from "./GlobalAIAssistant.module.css";

type Message={role:"user"|"assistant";content:string};
type ChatResult={answer:string;model:string};
export default function GlobalAIAssistant(){
 const pathname=usePathname();
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [messages,setMessages]=useState<Message[]>([]);
 const endRef=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth",block:"end"})},[messages,busy,open]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="i"){e.preventDefault();setOpen(v=>!v)}if(e.key==="Escape")setOpen(false)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[]);
 async function send(){
  const content=draft.trim();if(!content||busy)return;
  const next=[...messages,{role:"user" as const,content}];
  setMessages(next);setDraft("");setBusy(true);setError("");
  try{
   const pageTitle=typeof document!=="undefined"?document.title:"صفحه جاری";
   const result=await api<ChatResult>("/api/ai/assistant/chat",{method:"POST",body:JSON.stringify({messages:next,page:pathname,pageTitle})});
   setMessages(v=>[...v,{role:"assistant",content:result.answer}]);
  }catch(e){setError(e instanceof Error?e.message:"پاسخی از سرویس دریافت نشد.");}
  finally{setBusy(false)}
 }
 return <>
  <button type="button" className={styles.launcher} onClick={()=>setOpen(v=>!v)} aria-label={open?"بستن دستیار هوشمند":"باز کردن دستیار هوشمند"} aria-expanded={open}>
   <span className={styles.spark}>✳</span><span className={styles.launcherText}>دستیار هوشمند</span><span className={styles.status}/>
  </button>
  {open&&<section className={styles.panel} dir="rtl" aria-label="دستیار هوشمند">
   <header className={styles.header}><div className={styles.avatar}>✳</div><div className={styles.headCopy}><b>دستیار هوشمند نگار</b><small>همراه صفحه جاری · پاسخ از سرویس متصل</small></div><button type="button" className={styles.close} onClick={()=>setOpen(false)} aria-label="بستن">×</button></header>
   <div className={styles.context}><span className={styles.contextDot}/><span>صفحه فعال: <b>{pathname}</b></span></div>
   <div className={styles.messages}>
    {!messages.length&&<div className={styles.welcome}><div className={styles.welcomeIcon}>✳</div><b>در چه کاری کمکتان کنم؟</b><p>می‌توانم درباره همین بخش راهنمایی بدهم یا در تحلیل و بررسی اطلاعاتی که در اختیارم می‌گذارید کمک کنم.</p><div className={styles.suggestions}><button type="button" onClick={()=>setDraft("امکانات و گردش‌کار این صفحه را برایم توضیح بده.")}>راهنمای این صفحه</button><button type="button" onClick={()=>setDraft("برای بررسی این بخش چه اطلاعات و مدارکی لازم است؟")}>مدارک موردنیاز</button></div></div>}
    {messages.map((m,i)=><div key={i} className={m.role==="user"?styles.userMessage:styles.assistantMessage}><span>{m.role==="user"?"شما":"دستیار"}</span><p>{m.content}</p></div>)}
    {busy&&<div className={styles.typing}>در حال دریافت پاسخ از سرویس هوش مصنوعی…</div>}
    {error&&<div className={styles.error}>{error}<button type="button" onClick={()=>setError("")}>×</button></div>}
    <div ref={endRef}/>
   </div>
   <form className={styles.composer} onSubmit={e=>{e.preventDefault();void send()}}>
    <textarea value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send()}}} placeholder="پیام خود را بنویسید..." rows={2} maxLength={4000}/>
    <button type="submit" disabled={busy||!draft.trim()} aria-label="ارسال پیام">↑</button>
    <small>پاسخ‌ها ممکن است نیازمند بررسی باشند. دستیار به‌تنهایی عملیات مالی انجام نمی‌دهد.</small>
   </form>
  </section>}
 </>;
}
