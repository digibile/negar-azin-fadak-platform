import {Router} from "express";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";

export const platformUpdatesRouter=Router();

const ownerRepo=process.env.GITHUB_REPOSITORY||"digibile/negar-azin-fadak-platform";
const workflow=process.env.PLATFORM_UPDATE_WORKFLOW||"deploy-sookar-main.yml";
const token=()=>process.env.GITHUB_TOKEN||"";
const deployedSha=()=>process.env.DEPLOYED_SHA||"";
const apiBase="https://api.github.com";
const activeStatuses=["queued","in_progress","waiting","requested","pending"];

const headers=()=>({
  Accept:"application/vnd.github+json",
  ...(token()?{Authorization:"Bearer "+token()}:{}),
  "X-GitHub-Api-Version":"2026-03-10"
});

async function github(path:string,init:RequestInit={}){
  const r=await fetch(apiBase+path,{...init,headers:{...headers(),...(init.headers||{})}});
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

platformUpdatesRouter.get("/api/platform/update-status",requireAuth,requirePermission("platform:update"),asyncHandler(async(_req,res)=>{
  const [repo,branch,workflowInfo,runs]=await Promise.all([
    github("/repos/"+ownerRepo),
    github("/repos/"+ownerRepo+"/branches/main"),
    github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)),
    github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/runs?branch=main&per_page=10")
  ]);
  const mainSha=repo.default_branch==="main"?branch.commit?.sha||null:null;
  const deployed=deployedSha()||null;
  const list=(runs.workflow_runs||[]);
  const active=list.find((x:any)=>activeStatuses.includes(x.status))||null;
  const latest=active||list[0]||null;
  let jobs:any[]=[];
  if(latest?.id){
    const jobData=await github("/repos/"+ownerRepo+"/actions/runs/"+latest.id+"/jobs?per_page=100");
    jobs=await Promise.all((jobData.jobs||[]).map(async(job:any)=>{
      let steps=job.steps||[];
      try{steps=(await github("/repos/"+ownerRepo+"/actions/jobs/"+job.id+"/steps")).steps||steps;}catch{}
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
    configured:Boolean(token()),
    repository:ownerRepo,workflow,workflowState:workflowInfo.state,
    deployedSha:deployed,mainSha,
    updateAvailable:Boolean(mainSha&&deployed&&mainSha!==deployed),
    targetSha:latest?.head_sha||mainSha||null,
    run:latest?{id:latest.id,status:latest.status,conclusion:latest.conclusion,sha:latest.head_sha,createdAt:latest.created_at,updatedAt:latest.updated_at,url:latest.html_url}:null,
    progress,failed,running,
    stages:jobs.map((j:any)=>({...j,status:stageStatus(j.status,j.conclusion),steps:j.steps.map((s:any)=>({...s,status:stageStatus(s.status,s.conclusion)}))})),
    runs:list.map((x:any)=>({id:x.id,status:x.status,conclusion:x.conclusion,sha:x.head_sha,createdAt:x.created_at,updatedAt:x.updated_at,url:x.html_url}))
  });
}));

platformUpdatesRouter.get("/api/platform/update-log/:jobId",requireAuth,requirePermission("platform:update"),asyncHandler(async(req,res)=>{
  const jobId=String(req.params.jobId||"").replace(/[^0-9]/g,"");
  if(!jobId)return res.status(400).json({error:"شناسه مرحله نامعتبر است"});
  const data=await github("/repos/"+ownerRepo+"/actions/jobs/"+jobId+"/logs");
  res.type("text/plain; charset=utf-8").send(typeof data?.raw==="string"?data.raw:JSON.stringify(data,null,2));
}));

platformUpdatesRouter.post("/api/platform/update",requireAuth,requirePermission("platform:update"),asyncHandler(async(req,res)=>{
  if(!token())return res.status(503).json({error:"اتصال امن GitHub برای اجرای بروزرسانی مدیریتی تنظیم نشده است"});
  const main=await github("/repos/"+ownerRepo+"/branches/main");
  const sha=main.commit?.sha||null;
  if(!sha)return res.status(503).json({error:"نسخه اصلی GitHub قابل شناسایی نیست"});
  const runs=await github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/runs?branch=main&head_sha="+encodeURIComponent(sha)+"&per_page=10");
  const existing=(runs.workflow_runs||[]).find((x:any)=>activeStatuses.includes(x.status));
  if(existing)return res.status(202).json({accepted:true,targetSha:sha,runId:existing.id,message:"انتشار خودکار همین نسخه در حال اجراست."});
  await github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/dispatches",{
    method:"POST",
    body:JSON.stringify({ref:"main",inputs:{requested_by:String((req as any).user?.id||"management-panel")}})
  });
  res.status(202).json({accepted:true,targetSha:sha,message:"اجرای دستی انتشار فقط برای همین نسخه درخواست شد؛ انتشارهای معمولی خودکار هستند."});
}));
