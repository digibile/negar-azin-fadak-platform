"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {api} from "../../../lib/api";

type Step={name:string;status:string;conclusion:string|null;number:number;startedAt:string|null;completedAt:string|null};
type Stage={id:number;name:string;status:string;conclusion:string|null;startedAt:string|null;completedAt:string|null;url:string;steps:Step[]};
type Status={configured:boolean;repository:string;workflow:string;workflowState?:string;mainSha?:string|null;deployedSha?:string|null;updateAvailable?:boolean;targetSha?:string|null;pendingUpdates?:{order:number;sha:string;message:string;author:string;date:string|null;ready:boolean}[];nextUpdate?:{sha:string;message:string;author:string;date:string|null}|null;progress:number;failed:boolean;running:boolean;run?:{id:number;status:string;conclusion:string|null;sha:string;createdAt:string;updatedAt:string;url:string}|null;stages:Stage[]};
type DatabaseStatus={engine:string;totalMigrations:number;appliedCount:number;pendingCount:number;latestApplied:{version:string;applied_at:string}|null;recentApplied:{version:string;applied_at:string}[];pendingMigrations:string[]};

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
 const [submittedRelease,setSubmittedRelease]=useState<{sha:string;message:string}|null>(null);
 const [deploying,setDeploying]=useState(false);
 const [databaseStatus,setDatabaseStatus]=useState<DatabaseStatus|null>(null);
 const [databaseError,setDatabaseError]=useState("");
 const [githubToken,setGithubToken]=useState("");
 const [githubConnection,setGithubConnection]=useState<{configured:boolean;source:string|null;masked:string|null;repository:string;workflow:string;workflowState?:string}|null>(null);
 const [savingGithub,setSavingGithub]=useState(false);
 const [githubMessage,setGithubMessage]=useState("");
 const load=useCallback(async()=>{try{setError("");setStatus(await api<Status>("/api/platform/update-status"))}catch(e){setError(e instanceof Error?e.message:"خطا در دریافت وضعیت انتشار")}finally{setLoading(false)}},[]);
 async function loadDatabase(){try{setDatabaseError("");setDatabaseStatus(await api<DatabaseStatus>("/api/platform/database-status"))}catch(e){setDatabaseError(e instanceof Error?e.message:"وضعیت پایگاه داده دریافت نشد")}}
 useEffect(()=>{load(); loadGithubConnection(); loadDatabase()},[load]);
 async function loadGithubConnection(){try{setGithubConnection(await api("/api/platform/github-connection"))}catch(e){setGithubMessage(e instanceof Error?e.message:"وضعیت اتصال GitHub دریافت نشد")}}
 useEffect(()=>{const id=window.setInterval(()=>{if(status?.running||status?.updateAvailable){load();loadDatabase()}},4000);return()=>window.clearInterval(id)},[status,load]);
 const buildSuccess=status?.run?.conclusion==="success";
 const deployedHttpsSuccess=Boolean(status?.stages.some(stage=>stage.steps.some(step=>step.name==="Verify public HTTPS endpoint"&&step.conclusion==="success")));
 const success=Boolean(buildSuccess&&deployedHttpsSuccess&&status?.deployedSha&&status.deployedSha===status.run?.sha);
 const reviewReady=Boolean(buildSuccess&&!success&&status?.nextUpdate?.sha===status?.run?.sha);
 const failed=status?.failed||status?.run?.conclusion==="failure";
 const current=useMemo(()=>status?.stages.find(x=>x.status==="running")||status?.stages.find(x=>x.status==="pending"),[status]);
 async function saveGithubToken(){
  if(!githubToken.trim())return; setSavingGithub(true);setGithubMessage("");
  try{const result=await api<{masked?:string;message?:string}>("/api/platform/github-connection",{method:"POST",body:JSON.stringify({token:githubToken.trim()})});setGithubToken("");setGithubMessage(result.message||"توکن ذخیره شد.");await loadGithubConnection();await load();}
  catch(e){setGithubMessage(e instanceof Error?e.message:"توکن GitHub معتبر نیست")}finally{setSavingGithub(false)}
 }
 async function removeGithubToken(){
  setSavingGithub(true);setGithubMessage("");
  try{const result=await api<{message?:string}>("/api/platform/github-connection",{method:"DELETE"});setGithubMessage(result.message||"توکن حذف شد.");await loadGithubConnection();await load();}
  catch(e){setGithubMessage(e instanceof Error?e.message:"حذف توکن انجام نشد")}finally{setSavingGithub(false)}
 }
 async function triggerUpdate(){
  if(triggering)return;
  setTriggering(true);setTriggerMessage("");setError("");
  try{
   const result=await api<{message?:string;targetSha?:string}>("/api/platform/update",{method:"POST",body:JSON.stringify({})});
   setTriggerMessage(result.message||"نسخه برای بررسی ارسال شد.");
   if(result.targetSha){
    setSubmittedRelease({sha:result.targetSha,message:"در حال دریافت عنوان نسخه..."});
    try{
     const fresh=await api<Status>("/api/platform/update-status");
     setStatus(fresh);
     const match=(fresh.pendingUpdates||[]).find(item=>item.sha===result.targetSha);
     setSubmittedRelease({sha:result.targetSha,message:match?.message||"عنوان نسخه در فهرست تغییرات قابل دریافت نیست."});
    }catch{}
   }else{
    await load();
   }
  }catch(e){setError(e instanceof Error?e.message:"اجرای بروزرسانی انجام نشد")}finally{setTriggering(false)}
 }

 async function deployReviewed(){
  if(deploying||!reviewReady||!status?.run?.sha)return;
  if(!window.confirm("نسخه "+status.run.sha.slice(0,12)+" Build، Migration، تست API و Build وب را با موفقیت گذرانده است. استقرار همین نسخه روی سرور و بررسی HTTPS تأیید می‌شود؟"))return;
  setDeploying(true);setTriggerMessage("");setError("");
  try{
   const result=await api<{message?:string}>("/api/platform/deploy-reviewed",{method:"POST",body:JSON.stringify({targetSha:status.run.sha})});
   setTriggerMessage(result.message||"استقرار نسخه تأییدشده ارسال شد.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"تأیید استقرار انجام نشد")}finally{setDeploying(false)}
 }
 async function showLog(jobId:number){
  if(openJob===jobId){setOpenJob(null);return}
  setOpenJob(jobId);setLog("");setLogLoading(true);
  try{setLog(await api<string>("/api/platform/update-log/"+jobId))}catch(e){setLog(e instanceof Error?e.message:"لاگ مرحله دریافت نشد")}finally{setLogLoading(false)}
 }
 return <main className="platform-update-page">
  <div className="platform-update-head"><div><span className="section-kicker">PLATFORM RELEASE LIFECYCLE · 2026</span><h2>مرکز انتشار و بروزرسانی سامانه</h2><p>منبع حقیقت این صفحه GitHub Actions است. Build می‌تواند نسخه‌های جدید را آماده کند، اما هیچ نسخه‌ای روی Production خودکار منتشر نمی‌شود. انتخاب و اجرای بروزرسانی فقط با مدیر انجام می‌شود.</p></div><div className="platform-update-actions"><button className="admin-link release-trigger-button" onClick={triggerUpdate} disabled={triggering||status?.running}>{triggering||status?.running?"ساخت نسخه در حال اجرا...":"ساخت نسخه برای بررسی"}</button>{reviewReady&&<button className="admin-link release-trigger-button" onClick={deployReviewed} disabled={deploying||status?.running}>{deploying?"در حال ارسال استقرار...":"تأیید و استقرار نسخه بررسی‌شده"}</button>}<Link className="admin-link" href="/admin">بازگشت به مرکز مدیریت</Link></div></div>
  {error&&<div className="error">{error}</div>}
  {triggerMessage&&<div className="update-success">{triggerMessage}</div>}
  {submittedRelease&&<section className="update-card submitted-release-card">
   <div className="release-lifecycle-head"><div><h3>نسخه ارسال‌شده برای بررسی مدیر</h3><p>این شناسه نسخه دقیقاً از پاسخ سرویس انتشار دریافت شده است.</p></div><strong>در انتظار بررسی</strong></div>
   <div className="release-summary">
    <div><span>شناسه کامل نسخه (SHA)</span><code>{submittedRelease.sha}</code></div>
    <div><span>عنوان تغییر</span><strong>{submittedRelease.message}</strong></div>
   </div>
   <button className="admin-link" onClick={()=>{void navigator.clipboard?.writeText(submittedRelease.sha)}}>کپی شناسه نسخه</button>
  </section>}
  <section className="update-card github-connection-card">
   <div className="release-lifecycle-head"><div><h3>اتصال GitHub</h3><p>توکن در PostgreSQL به‌صورت رمزنگاری‌شده نگهداری می‌شود و مقدار کامل آن هرگز در پنل نمایش داده نمی‌شود.</p></div><strong>{githubConnection?.configured?"متصل":"تنظیم نشده"}</strong></div>
   <div className="github-connection-row"><input type="password" autoComplete="new-password" value={githubToken} onChange={e=>setGithubToken(e.target.value)} placeholder="github_pat_..." /><button className="admin-link release-trigger-button" onClick={saveGithubToken} disabled={savingGithub||!githubToken.trim()}>{savingGithub?"در حال بررسی...":"ذخیره و بررسی اتصال"}</button>{githubConnection?.source==="panel"&&<button className="admin-link" onClick={removeGithubToken} disabled={savingGithub}>حذف توکن پنل</button>}</div>
   <div className="github-connection-meta"><span>مخزن: <code>{githubConnection?.repository||"digibile/negar-azin-fadak-platform"}</code></span><span>Workflow: <code>{githubConnection?.workflow||"deploy-sookar-main.yml"}</code></span><span>توکن: <code>{githubConnection?.masked||"تنظیم نشده"}</code></span><span>منبع: {githubConnection?.source==="panel"?"پنل":githubConnection?.source==="environment"?"Environment":"-"}</span></div>
   {githubMessage&&<div className="update-success">{githubMessage}</div>}
   <small>خود GitHub PAT فقط توسط GitHub صادر می‌شود. اینجا محل ثبت، اعتبارسنجی، تعویض و حذف امن آن است.</small>
  </section>
  <section className="update-card database-status-card">
   <div className="release-lifecycle-head"><div><h3>وضعیت پایگاه داده PostgreSQL</h3><p>وضعیت واقعی ثبت Migrationها در پایگاه داده متصل به سامانه؛ بدون داده نمایشی.</p></div><strong>{databaseStatus?databaseStatus.pendingCount===0?"ساختار به‌روز":"نیازمند بررسی":"در حال بررسی"}</strong></div>
   {databaseError&&<div className="error">{databaseError}</div>}
   {databaseStatus&&<><div className="release-summary"><div><span>موتور پایگاه داده</span><strong>{databaseStatus.engine}</strong></div><div><span>Migrationهای پروژه</span><strong>{databaseStatus.totalMigrations}</strong></div><div><span>ثبت‌شده در دیتابیس</span><strong>{databaseStatus.appliedCount}</strong></div><div><span>باقی‌مانده</span><strong>{databaseStatus.pendingCount}</strong></div></div>
   {databaseStatus.latestApplied&&<p>آخرین Migration ثبت‌شده: <code>{databaseStatus.latestApplied.version}</code> · {new Date(databaseStatus.latestApplied.applied_at).toLocaleString("fa-IR")}</p>}
   {databaseStatus.pendingCount>0&&<div><strong>Migrationهای ثبت‌نشده (نمایش حداکثر ۱۲ مورد)</strong><ul>{databaseStatus.pendingMigrations.map(name=><li key={name}><code>{name}</code></li>)}</ul></div>}
   <div><strong>آخرین Migrationهای اعمال‌شده</strong><ul>{databaseStatus.recentApplied.slice(0,5).map(item=><li key={item.version}><code>{item.version}</code> · {new Date(item.applied_at).toLocaleString("fa-IR")}</li>)}</ul></div></>}
  </section>
  <section className="release-summary">
   <div><span>نسخه نصب‌شده</span><code>{status?.deployedSha?.slice(0,12)||"در حال شناسایی"}</code></div>
   <div><span>نسخه هدف</span><code>{status?.targetSha?.slice(0,12)||status?.mainSha?.slice(0,12)||"در حال بررسی"}</code></div>
   <div><span>وضعیت</span><strong>{loading?"در حال دریافت":success?"استقرار و HTTPS تأیید شد":failed?"ساخت یا استقرار ناموفق":status?.running?"در حال اجرا":reviewReady?"Build موفق؛ منتظر تأیید مدیر":buildSuccess?"Build موفق؛ استقرار تأیید نشده":status?.updateAvailable?"نسخه جدید آماده بررسی":"سامانه به‌روز است"}</strong></div>
   <div><span>پیشرفت</span><strong>{status?.progress??0}%</strong></div>
  </section>
  <section className="pending-releases"><div className="release-lifecycle-head"><h3>نسخه‌های منتشرنشده</h3><span>{status?.pendingUpdates?.length||0} نسخه در انتظار تصمیم مدیر</span></div>{(status?.pendingUpdates||[]).length===0?<p>نسخه عقب‌مانده‌ای وجود ندارد.</p>:<div className="pending-release-list">{status?.pendingUpdates?.map((item)=><div className={"pending-release "+(item.ready?"ready":"locked")} key={item.sha}><b>#{item.order}</b><code>{item.sha.slice(0,12)}</code><strong>{item.message}</strong><span>{item.ready?"آماده انتخاب":"منتظر انتشار نسخه قبلی"}</span></div>)}</div>}</section>
  <section className="release-progress-card">
   <div className="release-progress-top"><strong>{current?"مرحله جاری: "+current.name:success?"انتشار کامل شد":"زنجیره انتشار"}</strong><b>{status?.progress??0}%</b></div>
   <div className="release-progress-track"><div style={{width:(status?.progress??0)+"%"}}/></div>
   <small>{status?.run?"Run #"+status.run.id+" · SHA "+status.run.sha.slice(0,12):"هنوز اجرای جدیدی برای main ثبت نشده است"}</small>
  </section>
  {reviewReady&&<div className="update-success"><strong>Build آماده بررسی است.</strong> · نسخه <code>{status?.run?.sha.slice(0,12)}</code> تست یکپارچگی، Migration، تست API و Build وب را گذرانده است. هنوز روی سرور منتشر نشده؛ پس از بررسی، دکمه «تأیید و استقرار نسخه بررسی‌شده» را بزنید.</div>}
  {success&&<div className="update-success"><strong>استقرار با موفقیت تأیید شد</strong> · نسخه <code>{status?.run?.sha.slice(0,12)}</code> در سرور فعال است و مرحله بررسی HTTPS عمومی هم موفق شده است.</div>}
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
