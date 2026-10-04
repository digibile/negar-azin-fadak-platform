import {Router} from "express";
import {query} from "./db.js";
import {requireAuth} from "./auth.js";

const modules={
  "command-center":["command_actions",["command_no","action_type","payload"],["command_no","action_type"]],
  "monitoring-events":["monitoring_events",["event_type","severity","message","occurred_at"],["event_type","severity","message"]],
  "audit-control":["audit_events",["event_type","actor_ref","entity_type","entity_id","payload"],["event_type","actor_ref","entity_type"]],
  "documentation":["documents",["document_no","title","content"],["document_no","title"]],
  "api-integration":["api_clients",["client_id","name","scopes"],["client_id","name"]],
  "infrastructure-data":["data_sources",["code","name","source_type","config"],["code","name","source_type"]],
  "mobile-app":["mobile_devices",["device_id","owner_ref","platform"],["device_id","platform"]],
  "quality-lifecycle":["quality_checks",["check_no","title","score"],["check_no","title"]]
} as const;

const router=Router();

async function moduleFor(code:string){
  const r=await query("select id,title from platform_modules where code=$1 and is_active=true",[code]);
  return r.rowCount?r.rows[0]:null;
}

async function allowed(user:any,id:number,action:string){
  if(user.role==="admin")return true;
  const r=await query(
    "select 1 from role_permissions rp join module_permissions mp on mp.permission=rp.permission join platform_modules m on m.id=mp.module_id where rp.role=$1 and m.id=$2 and mp.permission='modules:'||m.code||':'||$3",
    [user.role,id,action]
  );
  return Boolean(r.rowCount);
}

router.get("/:code",requireAuth,async(req:any,res:any)=>{
  const def=modules[req.params.code as keyof typeof modules];
  if(!def)return res.status(404).json({error:"ماژول فرماندهی و کنترل پیدا نشد"});
  const m=await moduleFor(req.params.code);
  if(!m)return res.status(404).json({error:"ماژول فعال نیست"});
  if(!(await allowed(req.user,m.id,"read")))return res.status(403).json({error:"دسترسی مشاهده مجاز نیست"});
  const r=await query("select * from "+def[0]+" order by updated_at desc");
  res.json({module:m,items:r.rows});
});

router.post("/:code",requireAuth,async(req:any,res:any)=>{
  const def=modules[req.params.code as keyof typeof modules];
  if(!def)return res.status(404).json({error:"ماژول فرماندهی و کنترل پیدا نشد"});
  const m=await moduleFor(req.params.code);
  if(!m)return res.status(404).json({error:"ماژول فعال نیست"});
  if(!(await allowed(req.user,m.id,"write")))return res.status(403).json({error:"دسترسی ثبت مجاز نیست"});
  const body=req.body||{};
  for(const k of def[2])if(body[k]===undefined||body[k]===null||body[k]==="")return res.status(400).json({error:"فیلد الزامی: "+k});
  const cols=def[1].filter(k=>body[k]!==undefined),vals=cols.map(k=>body[k]),p=vals.map((_,i)=>"$"+(i+1)).join(",");
  const r=await query("insert into "+def[0]+" ("+cols.join(",")+") values ("+p+") returning *",vals);
  res.status(201).json(r.rows[0]);
});

router.patch("/:code/:id",requireAuth,async(req:any,res:any)=>{
  const def=modules[req.params.code as keyof typeof modules];
  if(!def)return res.status(404).json({error:"ماژول فرماندهی و کنترل پیدا نشد"});
  const m=await moduleFor(req.params.code);
  if(!m)return res.status(404).json({error:"ماژول فعال نیست"});
  if(!(await allowed(req.user,m.id,"write")))return res.status(403).json({error:"دسترسی ویرایش مجاز نیست"});
  if(req.params.code==="audit-control")return res.status(405).json({error:"ثبت تاریخچه حسابرسی فقط از مسیرهای ثبت‌شده سیستم انجام می‌شود"});
  const body=req.body||{},cols=def[1].filter(k=>body[k]!==undefined);
  if(!cols.length)return res.status(400).json({error:"فیلدی برای ویرایش ارسال نشده است"});
  const vals=cols.map(k=>body[k]); vals.push(req.params.id);
  const sets=cols.map((k,i)=>k+"=$"+(i+1)).join(",");
  const r=await query("update "+def[0]+" set "+sets+",updated_at=now() where id=$"+vals.length+" returning *",vals);
  if(!r.rowCount)return res.status(404).json({error:"رکورد پیدا نشد"});
  res.json(r.rows[0]);
});

router.delete("/:code/:id",requireAuth,async(req:any,res:any)=>{
  const def=modules[req.params.code as keyof typeof modules];
  if(!def)return res.status(404).json({error:"ماژول فرماندهی و کنترل پیدا نشد"});
  const m=await moduleFor(req.params.code);
  if(!m)return res.status(404).json({error:"ماژول فعال نیست"});
  if(!(await allowed(req.user,m.id,"delete")))return res.status(403).json({error:"دسترسی حذف مجاز نیست"});
  if(req.params.code==="audit-control")return res.status(405).json({error:"حذف تاریخچه حسابرسی مجاز نیست"});
  const r=await query("delete from "+def[0]+" where id=$1 returning id",[req.params.id]);
  if(!r.rowCount)return res.status(404).json({error:"رکورد پیدا نشد"});
  res.status(204).end();
});

export {router as domainCommandPlatformRouter};
