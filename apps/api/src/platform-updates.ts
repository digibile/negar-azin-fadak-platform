import {Router} from "express";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";

export const platformUpdatesRouter=Router();

const ownerRepo=process.env.GITHUB_REPOSITORY||"digibile/negar-azin-fadak-platform";
const workflow=process.env.PLATFORM_UPDATE_WORKFLOW||"update.yml";
const token=()=>process.env.GITHUB_TOKEN||"";
const apiBase="https://api.github.com";
const headers=()=>({
  Accept:"application/vnd.github+json",
  Authorization:"Bearer "+token(),
  "X-GitHub-Api-Version":"2026-03-10",
  "Content-Type":"application/json"
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
  const configured=Boolean(token());
  if(!configured)return res.json({configured:false,repository:ownerRepo,workflow,updateAvailable:false});
  const [repo,branch,workflowInfo,runs]=await Promise.all([
    github("/repos/"+ownerRepo),
    github("/repos/"+ownerRepo+"/branches/main"),
    github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)),
    github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/runs?per_page=5")
  ]);
  res.json({
    configured:true,
    repository:ownerRepo,
    workflow,
    mainSha:repo.default_branch==="main"?branch.commit?.sha||null:null,
    workflowState:workflowInfo.state,
    runs:(runs.workflow_runs||[]).map((x:any)=>({
      id:x.id,status:x.status,conclusion:x.conclusion,sha:x.head_sha,createdAt:x.created_at,updatedAt:x.updated_at,url:x.html_url
    }))
  });
}));

platformUpdatesRouter.post("/api/platform/update",requireAuth,requirePermission("platform:update"),asyncHandler(async(_req,res)=>{
  if(!token())return res.status(503).json({error:"اتصال امن GitHub برای بروزرسانی تنظیم نشده است"});
  const result=await github("/repos/"+ownerRepo+"/actions/workflows/"+encodeURIComponent(workflow)+"/dispatches",{
    method:"POST",
    body:JSON.stringify({ref:"main",inputs:{requested_by:String((_req as any).user?.id||"admin")}})
  });
  res.status(202).json({accepted:true,repository:ownerRepo,workflow,run:result.workflow_run_id||null,url:result.html_url||null,message:"درخواست بروزرسانی ثبت شد؛ ابتدا نسخه فعلی پشتیبان‌گیری و سپس نسخه جدید نصب می‌شود."});
}));
