import {Router} from "express";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";

export const platformUpdatesRouter=Router();

const ownerRepo=process.env.GITHUB_REPOSITORY||"digibile/negar-azin-fadak-platform";
const workflow=process.env.PLATFORM_UPDATE_WORKFLOW||"deploy-sookar.yml";
const token=()=>process.env.GITHUB_TOKEN||"";
const deployedSha=()=>process.env.DEPLOYED_SHA||"";
const apiBase="https://api.github.com";

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

platformUpdatesRouter.get("/api/platform/update-status",requireAuth,requirePermission("platform:update"),asyncHandler(async(_req,res)=>{
  const [repo,branch,workflowInfo,runs]=await Promise.all([
    github("/repos/"+ownerRepo),
    github("/repos/"+ownerRepo+"/branches/main"),
    github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)),
    github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/runs?branch=main&per_page=10")
  ]);
  const mainSha=repo.default_branch==="main"?branch.commit?.sha||null:null;
  const deployed=deployedSha()||null;
  res.json({
    configured:true,
    repository:ownerRepo,
    workflow,
    deployedSha:deployed,
    mainSha,
    updateAvailable:Boolean(mainSha&&deployed&&mainSha!==deployed),
    workflowState:workflowInfo.state,
    runs:(runs.workflow_runs||[]).map((x:any)=>({
      id:x.id,status:x.status,conclusion:x.conclusion,sha:x.head_sha,createdAt:x.created_at,updatedAt:x.updated_at,url:x.html_url
    }))
  });
}));

platformUpdatesRouter.post("/api/platform/update",requireAuth,requirePermission("platform:update"),asyncHandler(async(req,res)=>{
  if(!token())return res.status(503).json({error:"اتصال امن GitHub برای اجرای بروزرسانی مدیریتی تنظیم نشده است"});
  const main=await github("/repos/"+ownerRepo+"/branches/main");
  const sha=main.commit?.sha||null;
  if(!sha)return res.status(503).json({error:"نسخه اصلی GitHub قابل شناسایی نیست"});
  const runs=await github("/repos/"+ownerRepo+"/actions/workflows/web-build.yml/runs?branch=main&head_sha="+encodeURIComponent(sha)+"&per_page=10");
  const build=runs.workflow_runs?.find((x:any)=>x.head_sha===sha&&x.status==="completed"&&x.conclusion==="success");
  if(!build){
    return res.status(409).json({error:"نسخه جدید هنوز Build موفق GitHub ندارد؛ نصب نسخه ناسالم متوقف شد."});
  }
  await github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/dispatches",{
    method:"POST",
    body:JSON.stringify({ref:"main",inputs:{requested_by:String((req as any).user?.id||"management-panel")}})
  });
  res.status(202).json({
    accepted:true,
    repository:ownerRepo,
    workflow,
    targetSha:sha,
    message:"نسخه سالم تأیید شد؛ اجرای Deploy در GitHub آغاز شد. در صورت خطا، نسخه قبلی به‌صورت خودکار برمی‌گردد."
  });
}));
