import {Router} from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";

export const platformUpdatesRouter=Router();

const ownerRepo=process.env.GITHUB_REPOSITORY||"digibile/negar-azin-fadak-platform";
const workflow=process.env.PLATFORM_UPDATE_WORKFLOW||"deploy-sookar-main.yml";
const TOKEN_SETTING_KEY="github_token";
const encryptionKey=()=>process.env.PLATFORM_SECRET_KEY||process.env.JWT_SECRET||"";
const envToken=()=>process.env.GITHUB_TOKEN||"";
let cachedDbToken:string|null|undefined;
function cryptoKey(){const source=encryptionKey();if(!source)throw Object.assign(new Error("کلید رمزنگاری تنظیمات امن سامانه تنظیم نشده است"),{status:503});return crypto.createHash("sha256").update(source).digest();}
function encryptSecret(value:string){const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv("aes-256-gcm",cryptoKey(),iv);const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),encrypted.toString("base64url")].join(".");}
function decryptSecret(value:string){const [ivText,tagText,dataText]=value.split(".");if(!ivText||!tagText||!dataText)throw new Error("تنظیم امن GitHub نامعتبر است");const decipher=crypto.createDecipheriv("aes-256-gcm",cryptoKey(),Buffer.from(ivText,"base64url"));decipher.setAuthTag(Buffer.from(tagText,"base64url"));return Buffer.concat([decipher.update(Buffer.from(dataText,"base64url")),decipher.final()]).toString("utf8");}
async function dbToken(){if(cachedDbToken!==undefined)return cachedDbToken;try{const r=await query("select encrypted_value from platform_secure_settings where setting_key=$1",[TOKEN_SETTING_KEY]);cachedDbToken=r.rowCount?decryptSecret(r.rows[0].encrypted_value):null;}catch{cachedDbToken=null;}return cachedDbToken;}
async function token(){return (await dbToken())||envToken();}
const deployedSha=()=>process.env.DEPLOYED_SHA||"";
const apiBase="https://api.github.com";

function runTargetSha(run:any):string|null{
  const label=String(run?.display_title||run?.name||"");
  const match=label.match(/(?:Release\s+)?([0-9a-f]{40})/i);
  return match?.[1]|| (typeof run?.head_sha==="string"?run.head_sha:null);
}

async function resolveDeployedSha(githubToken:string){
  const configured=deployedSha().trim();
  if(configured)return configured;
  try{
    const data=await github(
      "/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/runs?branch=main&status=success&per_page=20",
      {},
      githubToken
    );
    const successful=(data.workflow_runs||[])
      .filter((run:any)=>run?.conclusion==="success"&&runTargetSha(run))
      .sort((a:any,b:any)=>Date.parse(String(b.updated_at||b.created_at||0))-Date.parse(String(a.updated_at||a.created_at||0)));
    for(const run of successful){
      const jobData=await github("/repos/"+ownerRepo+"/actions/runs/"+run.id+"/jobs?per_page=100",{},githubToken);
      const steps=(jobData.jobs||[]).flatMap((job:any)=>job.steps||[]);
      const required=["Deploy with rollback","Production health and release check","Verify public HTTPS endpoint"];
      if(required.every(name=>steps.some((step:any)=>step.name===name&&step.conclusion==="success")))return runTargetSha(run);
    }
    return null;
  }catch{
    return null;
  }
}
const activeStatuses=["queued","in_progress","waiting","requested","pending"];

const headers=(githubToken:string)=>({
  Accept:"application/vnd.github+json",
  ...(githubToken?{Authorization:"Bearer "+githubToken}:{}),
  "X-GitHub-Api-Version":"2026-03-10"
});

async function github(path:string,init:RequestInit={},githubToken:string=""){
  const r=await fetch(apiBase+path,{...init,headers:{...headers(githubToken),...(init.headers||{})}});
  const body=await r.text();
  let data:any={};try{data=body?JSON.parse(body):{};}catch{data={raw:body};}
  if(!r.ok){
    const message=typeof data?.message==="string"?data.message:"خطا در ارتباط با GitHub";
    throw Object.assign(new Error(message),{status:r.status});
  }
  return data;
}

function stageStatus(status:string|null|undefined,conclusion:string|null|undefined){
  if(conclusion==="success")return "success";
  if(conclusion==="failure"||conclusion==="cancelled"||conclusion==="timed_out")return "failed";
  if(activeStatuses.includes(status||""))return status==="in_progress"?"running":"pending";
  return "pending";
}

platformUpdatesRouter.get("/api/platform/database-status",requireAuth,requirePermission("platform:update"),asyncHandler(async(_req,res)=>{
  const applied=await query("select version,applied_at from schema_migrations order by applied_at desc");
  const here=path.dirname(fileURLToPath(import.meta.url));
  const dir=path.resolve(here,"../../../database/migrations");
  const files=(await fs.readdir(dir)).filter(file=>file.endsWith(".sql")).sort();
  const appliedSet=new Set(applied.rows.map((row:any)=>row.version));
  const pending=files.filter(file=>!appliedSet.has(file));
  res.json({
    engine:"PostgreSQL",
    totalMigrations:files.length,
    appliedCount:appliedSet.size,
    pendingCount:pending.length,
    latestApplied:applied.rows[0]||null,
    recentApplied:applied.rows.slice(0,8),
    pendingMigrations:pending.slice(0,12)
  });
}));

platformUpdatesRouter.get("/api/platform/github-connection",requireAuth,requirePermission("platform:update"),asyncHandler(async(_req,res)=>{
  const db=await dbToken(); const current=db||envToken();
  if(!current)return res.json({configured:false,source:null,masked:null,repository:ownerRepo,workflow});
  try{const repo=await github("/repos/"+ownerRepo,{},current);const workflowInfo=await github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow),{},current);res.json({configured:true,source:db?"panel":"environment",masked:current.slice(0,7)+"…"+current.slice(-4),repository:repo.full_name,workflow,workflowState:workflowInfo.state});}
  catch(error:any){res.status(error?.status===401||error?.status===403?502:500).json({configured:false,source:db?"panel":"environment",masked:current.slice(0,7)+"…"+current.slice(-4),error:error?.message||"اتصال GitHub نامعتبر است"});}
}));

platformUpdatesRouter.post("/api/platform/github-connection",requireAuth,requirePermission("platform:update"),asyncHandler(async(req,res)=>{
  const supplied=typeof req.body?.token==="string"?req.body.token.trim():"";
  if(!supplied)return res.status(400).json({error:"توکن GitHub وارد نشده است"});
  if(!/^(github_pat_[A-Za-z0-9_]+|ghp_[A-Za-z0-9]+)$/.test(supplied))return res.status(400).json({error:"فرمت توکن GitHub معتبر نیست"});
  await github("/repos/"+ownerRepo,{},supplied); await github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow),{},supplied);
  await query("insert into platform_secure_settings(setting_key,encrypted_value,updated_by,updated_at) values($1,$2,$3,now()) on conflict(setting_key) do update set encrypted_value=excluded.encrypted_value,updated_by=excluded.updated_by,updated_at=now()",[TOKEN_SETTING_KEY,encryptSecret(supplied),(req as any).user?.id||null]);
  cachedDbToken=supplied; res.json({configured:true,source:"panel",masked:supplied.slice(0,7)+"…"+supplied.slice(-4),message:"اتصال GitHub با موفقیت ذخیره و بررسی شد."});
}));

platformUpdatesRouter.delete("/api/platform/github-connection",requireAuth,requirePermission("platform:update"),asyncHandler(async(_req,res)=>{await query("delete from platform_secure_settings where setting_key=$1",[TOKEN_SETTING_KEY]);cachedDbToken=null;res.json({configured:Boolean(envToken()),source:envToken()?"environment":null,message:envToken()?"توکن پنل حذف شد و اتصال به مقدار محیطی برگشت.":"توکن GitHub حذف شد."});}));

platformUpdatesRouter.get("/api/platform/update-status",requireAuth,requirePermission("platform:update"),asyncHandler(async(_req,res)=>{
  const githubToken=await token();
  const [repo,branch,workflowInfo,runs]=await Promise.all([
    github("/repos/"+ownerRepo,{},githubToken),
    github("/repos/"+ownerRepo+"/branches/main",{},githubToken),
    github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow),{},githubToken),
    github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/runs?branch=main&per_page=10",{},githubToken)
  ]);
  const mainSha=repo.default_branch==="main"?branch.commit?.sha||null:null;
  const deployed=await resolveDeployedSha(githubToken);
  let pendingUpdates:any[]=[];
  if(deployed&&mainSha&&deployed!==mainSha){
    try{
      const compare=await github("/repos/"+ownerRepo+"/compare/"+encodeURIComponent(deployed)+"..."+encodeURIComponent(mainSha),{},githubToken);
      pendingUpdates=(compare.commits||[]).map((x:any,index:number)=>({
        order:index+1,
        sha:x.sha,
        message:String(x.commit?.message||"").split("\n")[0],
        author:x.author?.login||x.commit?.author?.name||"نامشخص",
        date:x.commit?.author?.date||null,
        ready:index===0
      }));
    }catch{}
  }
  const list=(runs.workflow_runs||[]);
  const active=list.find((x:any)=>activeStatuses.includes(x.status))||null;
  const latest=active||list[0]||null;
  let jobs:any[]=[];
  if(latest?.id){
    const jobData=await github("/repos/"+ownerRepo+"/actions/runs/"+latest.id+"/jobs?per_page=100",{},githubToken);
    jobs=await Promise.all((jobData.jobs||[]).map(async(job:any)=>{
      let steps=job.steps||[];
      try{steps=(await github("/repos/"+ownerRepo+"/actions/jobs/"+job.id+"/steps",{},githubToken)).steps||steps;}catch{}
      return {
        id:job.id,name:job.name,status:job.status,conclusion:job.conclusion,
        startedAt:job.started_at,completedAt:job.completed_at,url:job.html_url,
        steps:steps.map((s:any)=>({name:s.name,status:s.status,conclusion:s.conclusion,number:s.number,startedAt:s.started_at,completedAt:s.completed_at}))
      };
    }));
  }
  const flatSteps=jobs.flatMap(j=>j.steps);
  const total=flatSteps.length||jobs.length||1;
  const completed=flatSteps.filter((s:any)=>s.conclusion==="success").length+
    (flatSteps.length?0:jobs.filter((j:any)=>j.conclusion==="success").length);
  const failed=jobs.some(j=>stageStatus(j.status,j.conclusion)==="failed")||flatSteps.some((s:any)=>stageStatus(s.status,s.conclusion)==="failed");
  const running=jobs.some(j=>stageStatus(j.status,j.conclusion)==="running")||flatSteps.some((s:any)=>stageStatus(s.status,s.conclusion)==="running");
  let progress=Math.round(completed/total*100);
  if(running&&progress>=100)progress=99;
  if(latest?.conclusion==="success")progress=100;
  res.json({
    configured:Boolean(githubToken),
    repository:ownerRepo,workflow,workflowState:workflowInfo.state,
    deployedSha:deployed,mainSha,
    updateAvailable:Boolean(mainSha&&deployed&&mainSha!==deployed),
    targetSha:latest?runTargetSha(latest):pendingUpdates[0]?.sha||mainSha||null,
    pendingUpdates,
    nextUpdate:pendingUpdates[0]||null,
    run:latest?{id:latest.id,status:latest.status,conclusion:latest.conclusion,sha:runTargetSha(latest)||latest.head_sha,createdAt:latest.created_at,updatedAt:latest.updated_at,url:latest.html_url}:null,
    progress,failed,running,
    stages:jobs.map((j:any)=>({...j,status:stageStatus(j.status,j.conclusion),steps:j.steps.map((s:any)=>({...s,status:stageStatus(s.status,s.conclusion)}))})),
    runs:list.map((x:any)=>({id:x.id,status:x.status,conclusion:x.conclusion,sha:runTargetSha(x)||x.head_sha,createdAt:x.created_at,updatedAt:x.updated_at,url:x.html_url}))
  });
}));

platformUpdatesRouter.get("/api/platform/update-log/:jobId",requireAuth,requirePermission("platform:update"),asyncHandler(async(req,res)=>{
  const githubToken=await token();
  if(!githubToken)return res.status(503).json({error:"اتصال امن GitHub تنظیم نشده است"});
  const jobId=String(req.params.jobId||"").replace(/[^0-9]/g,"");
  if(!jobId)return res.status(400).json({error:"شناسه مرحله نامعتبر است"});
  const data=await github("/repos/"+ownerRepo+"/actions/jobs/"+jobId+"/logs",{},githubToken);
  res.type("text/plain; charset=utf-8").send(typeof data?.raw==="string"?data.raw:JSON.stringify(data,null,2));
}));

platformUpdatesRouter.post("/api/platform/update",requireAuth,requirePermission("platform:update"),asyncHandler(async(req,res)=>{
  const githubToken=await token();
  if(!githubToken)return res.status(503).json({error:"اتصال امن GitHub برای اجرای بروزرسانی مدیریتی تنظیم نشده است"});
  const main=await github("/repos/"+ownerRepo+"/branches/main",{},githubToken);
  const mainSha=main.commit?.sha||null;
  if(!mainSha)return res.status(503).json({error:"نسخه اصلی GitHub قابل شناسایی نیست"});
  const deployed=await resolveDeployedSha(githubToken);
  if(!deployed)return res.status(503).json({error:"نسخه نصب‌شده Production قابل شناسایی نیست"});
  const compare=await github("/repos/"+ownerRepo+"/compare/"+encodeURIComponent(deployed)+"..."+encodeURIComponent(mainSha),{},githubToken);
  const pending=(compare.commits||[]).map((x:any,index:number)=>({order:index+1,sha:x.sha,message:String(x.commit?.message||"").split("\n")[0],ready:index===0}));
  const next=pending[0];
  if(!next)return res.status(409).json({error:"نسخه منتشرنشده‌ای برای انتشار وجود ندارد"});
  const runs=await github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/runs?branch=main&per_page=20",{},githubToken);
  const existing=(runs.workflow_runs||[]).find((x:any)=>runTargetSha(x)===next.sha&&activeStatuses.includes(x.status));
  if(existing)return res.status(202).json({accepted:true,targetSha:next.sha,runId:existing.id,message:"یک انتشار دیگر در حال اجراست؛ تا پایان آن نسخه بعدی قابل انتشار نیست."});
  await github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/dispatches",{
    method:"POST",
    body:JSON.stringify({ref:"main",inputs:{target_sha:next.sha,requested_by:String((req as any).user?.id||"management-panel")}})
  },githubToken);
  res.status(202).json({accepted:true,targetSha:next.sha,message:"نسخه بعدی با انتخاب مدیر برای انتشار ارسال شد."});
}));

platformUpdatesRouter.post("/api/platform/deploy-reviewed",requireAuth,requirePermission("platform:update"),asyncHandler(async(req,res)=>{
  const githubToken=await token();
  if(!githubToken)return res.status(503).json({error:"اتصال امن GitHub برای استقرار تأییدشده تنظیم نشده است"});
  const targetSha=typeof req.body?.targetSha==="string"?req.body.targetSha.trim():"";
  if(!/^[0-9a-f]{40}$/i.test(targetSha))return res.status(400).json({error:"شناسه نسخه بررسی‌شده معتبر نیست"});
  const deployed=await resolveDeployedSha(githubToken);
  if(!deployed)return res.status(503).json({error:"نسخه واقعاً نصب‌شده و تأییدشده قابل شناسایی نیست"});
  if(deployed===targetSha)return res.status(409).json({error:"این نسخه قبلاً روی سرور تأیید شده است"});
  const comparison=await github("/repos/"+ownerRepo+"/compare/"+encodeURIComponent(deployed)+"..."+encodeURIComponent(targetSha),{},githubToken);
  if(Number(comparison.ahead_by||0)<1||Number(comparison.behind_by||0)>0)return res.status(409).json({error:"نسخه انتخابی جلوتر از نسخه نصب‌شده نیست یا تاریخچه آن معتبر نیست"});
  const runs=await github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/runs?branch=main&per_page=50",{},githubToken);
  const candidates=(runs.workflow_runs||[]).filter((run:any)=>runTargetSha(run)===targetSha&&run?.conclusion==="success");
  let reviewedRun:any=null;
  for(const run of candidates){
    const jobData=await github("/repos/"+ownerRepo+"/actions/runs/"+run.id+"/jobs?per_page=100",{},githubToken);
    const steps=(jobData.jobs||[]).flatMap((job:any)=>job.steps||[]);
    const required=["Verify platform integrity","API build","Database migrations","API tests","Web build","Package exact SHA","Upload reviewable build artifact"];
    if(required.every(name=>steps.some((step:any)=>step.name===name&&step.conclusion==="success"))){
      const deploymentSteps=["Deploy with rollback","Production health and release check","Verify public HTTPS endpoint"];
      if(deploymentSteps.some(name=>steps.some((step:any)=>step.name===name&&step.conclusion==="success")))return res.status(409).json({error:"این نسخه قبلاً استقرار یافته است"});
      reviewedRun=run;break;
    }
  }
  if(!reviewedRun)return res.status(409).json({error:"برای همین SHA، Build، Migration، تست API و Build وب موفق و قابل بررسی پیدا نشد"});
  const activeRuns=await github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/runs?branch=main&per_page=20",{},githubToken);
  const activeRun=(activeRuns.workflow_runs||[]).find((run:any)=>activeStatuses.includes(run.status));
  if(activeRun)return res.status(409).json({error:"یک اجرای دیگر در حال انجام است؛ پس از پایان آن دوباره اقدام کنید"});
  await github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/dispatches",{
    method:"POST",
    body:JSON.stringify({ref:"main",inputs:{target_sha:targetSha,deploy_to_server:true,requested_by:String((req as any).user?.id||"management-panel")}})
  },githubToken);
  res.status(202).json({accepted:true,targetSha,message:"نسخه تأییدشده برای استقرار کنترل‌شده و بررسی HTTPS ارسال شد."});
}));
