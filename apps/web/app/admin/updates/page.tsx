"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {api} from "../../../lib/api";

type Step={name:string;status:string;conclusion:string|null;number:number;startedAt:string|null;completedAt:string|null};
type Stage={id:number;name:string;status:string;conclusion:string|null;startedAt:string|null;completedAt:string|null;url:string;steps:Step[]};
type Status={configured:boolean;repository:string;workflow:string;workflowState?:string;mainSha?:string|null;deployedSha?:string|null;updateAvailable?:boolean;targetSha?:string|null;pendingUpdates?:{order:number;sha:string;message:string;author:string;date:string|null;ready:boolean}[];nextUpdate?:{sha:string;message:string;author:string;date:string|null}|null;progress:number;failed:boolean;running:boolean;run?:{id:number;status:string;conclusion:string|null;sha:string;createdAt:string;updatedAt:string;url:string}|null;stages:Stage[]};

const active=["queued","in_progress","waiting","requested","pending"];
function label(s:string){if(s==="success")return "موفق";if(s==="failed")return "ناموفق";if(s==="running")return "در حال اجرا";return "در انتظار";}

export default function UpdatesPage(){
 const [status,setStatus]=useState<Status|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [openJob,setOpenJob]=useState<number|null>(null);
 const [log,setLog]=useState("");
 const [logLoading,setLogLoading]=useState(false);
 const [triggering,setTriggering]=useState(false);
 const [triggerMessage,setTriggerMessage]=useState("");
 const [githubToken,setGithubToken]=useState("");
 const [githubConnection,setGithubConnection]=useState<{configured:boolean;source:string|null;masked:string|null;repository:string;workflow:string;workflowState?:string}|null>(null);
 const [savingGithub,setSavingGithub]=useState(false);
 const [githubMessage,setGithubMessage]=useState("");
 const load=useCallback(async()=>{try{setError("");setStatus(await api<Status>("/api/platform/update-status"))}catch(e){setError(e instanceof Error?e.message:"خطا در دریافت وضعیت انتشار")}finally{setLoading(false)}},[]);
 useEffect(()=>{load(); loadGithubConnection()},[load]);
 async function loadGithubConnection(){try{setGithubConnection(await api("/api/platform/github-connection"))}catch(e){setGithubMessage(e instanceof Error?e.message:"وضعیت اتصال GitHub دریافت نشد")}}
 useEffect(()=>{const id=window.setInterval(()=>{if(status?.running||status?.updateAvailable)load()},4000);return()=>window.clearInterval(id)},[status,load]);
 const success=status?.run?.conclusion==="success";
 const failed=status?.failed||status?.run?.conclusion==="failure";
 const current=useMemo(()=>status?.stages.find(x=>x.status==="running")||status?.stages.find(x=>x.status==="pending"),[status]);
 async function saveGithubToken(){\n  if(!githubToken.trim())return; setSavingGithub(true);setGithubMessage("");\n  try{const result=await api<{masked?:string;message?:string}>("/api/platform/github-connection",{method:"POST",body:JSON.stringify({token:githubToken.trim()})});setGithubToken("");setGithubMessage(result.message||"توکن ذخیره شد.");await loadGithubConnection();await load();}\n  catch(e){setGithubMessage(e instanceof Error?e.message:"توکن GitHub معتبر نیست")}finally{setSavingGithub(false)}\n }\n async function removeGithubToken(){\n  setSavingGithub(true);setGithubMessage("");\n  try{const result=await api<{message?:string}>("/api/platform/github-connection",{method:"DELETE"});setGithubMessage(result.message||"توکن حذف شد.");await loadGithubConnection();await load();}\n  catch(e){setGithubMessage(e instanceof Error?e.message:"حذف توکن انجام نشد")}finally{setSavingGithub(false)}\n }\n async function triggerUpdate(){
  if(triggering)return;
  setTriggering(true);setTriggerMessage("");setError("");
  try{
   const result=await api<{message?:string}>("/api/platform/update",{method:"POST",body:JSON.stringify({})});
   setTriggerMessage(result.message||"اجرای بروزرسانی آغاز شد.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"اجرای بروزرسانی انجام نشد")}finally{setTriggering(false)}
 }
 async function showLog(jobId:number){
  if(openJob===jobId){setOpenJob(null);return}
  setOpenJob(jobId);setLog("");setLogLoading(true);
  try{setLog(await api<string>("/api/platform/update-log/"+jobId))}catch(e){setLog(e instanceof Error?e.message:"لاگ مرحله دریافت نشد")}finally{setLogLoading(false)}
 }
 return <main className="platform-update-page">
  <div className="platform-update-head"><div><span className="section-kicker">PLATFORM RELEASE LIFECYCLE · 2026</span><h2>مرکز انتشار و بروزرسانی سامانه</h2><p>منبع حقیقت این صفحه GitHub Actions است. Build می‌تواند نسخه‌های جدید را آماده کند، اما هیچ نسخه‌ای روی Production خودکار منتشر نمی‌شود. انتخاب و اجرای بروزرسانی فقط با مدیر انجام می‌شود.</p></div><div className="platform-update-actions"><button className="admin-link release-trigger-button" onClick={triggerUpdate} disabled={triggering||status?.running}>{triggering||status?.running?"انتشار در حال اجرا...":"بروزرسانی دستی نسخه جدید"}</button><Link className="admin-link" href="/admin">بازگشت به مرکز مدیریت</Link></div></div>
  {error&&<div className="error">{error}</div>}
  {triggerMessage&&<div className="update-success">{triggerMessage}</div>}
  <section className="update-card github-connection-card">
   <div className="release-lifecycle-head"><div><h3>اتصال GitHub</h3><p>توکن در PostgreSQL به‌صورت رمزنگاری‌شده نگهداری می‌شود و مقدار کامل آن هرگز در پنل نمایش داده نمی‌شود.</p></div><strong>{githubConnection?.configured?"متصل":"تنظیم نشده"}</strong></div>
   <div className="github-connection-row"><input type="password" autoComplete="new-password" value={githubToken} onChange={e=>setGithubToken(e.target.value)} placeholder="github_pat_..." /><button className="admin-link release-trigger-button" onClick={saveGithubToken} disabled={savingGithub||!githubToken.trim()}>{savingGithub?"در حال بررسی...":"ذخیره و بررسی اتصال"}</button>{githubConnection?.source==="panel"&&<button className="admin-link" onClick={removeGithubToken} disabled={savingGithub}>حذف توکن پنل</button>}</div>
   <div className="github-connection-meta"><span>مخزن: <code>{githubConnection?.repository||"digibile/negar-azin-fadak-platform"}</code></span><span>Workflow: <code>{githubConnection?.workflow||"deploy-sookar-main.yml"}</code></span><span>توکن: <code>{githubConnection?.masked||"تنظیم نشده"}</code></span><span>منبع: {githubConnection?.source==="panel"?"پنل":githubConnection?.source==="environment"?"Environment":"-"}</span></div>
   {githubMessage&&<div className="update-success">{githubMessage}</div>}
   <small>خود GitHub PAT فقط توسط GitHub صادر می‌شود. اینجا محل ثبت، اعتبارسنجی، تعویض و حذف امن آن است.</small>
  </section>
  <section className="release-summary">
   <div><span>نسخه نصب‌شده</span><code>{status?.deployedSha?.slice(0,12)||"در حال شناسایی"}</code></div>
   <div><span>نسخه هدف</span><code>{status?.targetSha?.slice(0,12)||status?.mainSha?.slice(0,12)||"در حال بررسی"}</code></div>
   <div><span>وضعیت</span><strong>{loading?"در حال دریافت":success?"با موفقیت انجام شد":failed?"انتشار ناموفق":status?.running?"در حال انتشار":status?.updateAvailable?"نسخه جدید در صف انتشار":"سامانه به‌روز است"}</strong></div>
   <div><span>پیشرفت</span><strong>{status?.progress??0}%</strong></div>
  </section>
  <section className="pending-releases"><div className="release-lifecycle-head"><h3>نسخه‌های منتشرنشده</h3><span>{status?.pendingUpdates?.length||0} نسخه در انتظار تصمیم مدیر</span></div>{(status?.pendingUpdates||[]).length===0?<p>نسخه عقب‌مانده‌ای وجود ندارد.</p>:<div className="pending-release-list">{status?.pendingUpdates?.map((item)=><div className={"pending-release "+(item.ready?"ready":"locked")} key={item.sha}><b>#{item.order}</b><code>{item.sha.slice(0,12)}</code><strong>{item.message}</strong><span>{item.ready?"آماده انتخاب":"منتظر انتشار نسخه قبلی"}</span></div>)}</div>}</section>
  <section className="release-progress-card">
   <div className="release-progress-top"><strong>{current?"مرحله جاری: "+current.name:success?"انتشار کامل شد":"زنجیره انتشار"}</strong><b>{status?.progress??0}%</b></div>
   <div className="release-progress-track"><div style={{width:(status?.progress??0)+"%"}}/></div>
   <small>{status?.run?"Run #"+status.run.id+" · SHA "+status.run.sha.slice(0,12):"هنوز اجرای جدیدی برای main ثبت نشده است"}</small>
  </section>
  {success&&<div className="update-success"><strong>با موفقیت انجام شد</strong> · نسخه <code>{status?.run?.sha.slice(0,12)}</code> Build، Migration، Test، Deploy و Health Check را با موفقیت پشت سر گذاشت و اکنون نسخه فعال سامانه است.</div>}
  {failed&&<div className="release-failure"><strong>انتشار متوقف شد.</strong> مرحله خطادار در جدول زیر مشخص است. نسخه قبلی سالم حفظ می‌شود و لاگ واقعی همان مرحله قابل مشاهده است.</div>}
  <section className="release-lifecycle">
   <div className="release-lifecycle-head"><h3>مراحل واقعی انتشار</h3><a href={status?.run?.url||"#"} target="_blank" rel="noreferrer">مشاهده Run در GitHub ↗</a></div>
   <div className="release-timeline">
    {(status?.stages||[]).map((stage,index)=><article className={"release-stage "+stage.status} key={stage.id}>
      <div className="release-stage-marker">{stage.status==="success"?"✓":stage.status==="failed"?"!":stage.status==="running"?"•":index+1}</div>
      <div className="release-stage-body">
       <div className="release-stage-top"><div><strong>{stage.name}</strong><span>{label(stage.status)}</span></div><button onClick={()=>showLog(stage.id)}>{openJob===stage.id?"بستن لاگ":"نمایش لاگ"}</button></div>
       <div className="release-steps">{stage.steps.map(step=><div className={"release-step "+step.status} key={step.number}><i>{step.status==="success"?"✓":step.status==="failed"?"!":step.status==="running"?"•":"○"}</i><span>{step.name}</span><small>{label(step.status)}</small></div>)}</div>
       {openJob===stage.id&&<pre className="release-log">{logLoading?"در حال دریافت لاگ واقعی GitHub...":log||"لاگی برای این مرحله موجود نیست."}</pre>}
      </div>
    </article>)}
   </div>
  </section>
  <section className="update-grid">
   <article className="update-card"><span className="update-label">مخزن</span><strong>{status?.repository||"digibile/negar-azin-fadak-platform"}</strong><span className="update-label">Workflow</span><strong>{status?.workflow||"deploy-sookar-main.yml"}</strong><span className="update-label">اتصال</span><strong>{status?.configured?"GitHub متصل است":"اتصال GitHub تنظیم نشده"}</strong></article>
   <article className="update-card"><span className="update-label">Rollback</span><strong>فعال و ایمن</strong><p>اگر Deploy یا Health Check شکست بخورد، workflow نسخه قبلی سالم را دوباره فعال می‌کند.</p></article>
   <article className="update-card"><span className="update-label">رفتار بروزرسانی</span><strong>فقط دستی</strong><p>هیچ بروزرسانی Production خودکار نیست. نسخه‌های منتشرنشده به‌ترتیب نمایش داده می‌شوند و فقط با انتخاب مدیر منتشر می‌شوند.</p></article>
  </section>
 </main>;
}
