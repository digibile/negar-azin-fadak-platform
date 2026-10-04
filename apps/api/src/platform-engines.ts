import {Router} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";

export const platformEnginesRouter=Router();
const s=(v:unknown,n=200)=>typeof v==="string"?v.trim().slice(0,n):"";
const obj=(v:unknown,d:any)=>v&&typeof v==="object"?v:d;
const tenant=async(req:any)=>resolveTenant(req,req.user);
export function matches(actual:any,rule:any):boolean{if(!rule||typeof rule!=="object")return true;for(const [k,v] of Object.entries(rule)){if(k==="equals"&&actual!==v)return false;if(k==="notEquals"&&actual===v)return false;if(k==="in"&&(!Array.isArray(v)||!v.includes(actual)))return false;if(k==="exists"&&Boolean(actual)!==Boolean(v))return false;if(k==="gt"&&!(Number(actual)>Number(v)))return false;if(k==="gte"&&!(Number(actual)>=Number(v)))return false;if(k==="lt"&&!(Number(actual)<Number(v)))return false;if(k==="lte"&&!(Number(actual)<=Number(v)))return false;}return true;}
async function businessDue(tenantId:string,calendarId:string|undefined,start:Date,minutes:number){if(!calendarId||minutes<=0)return new Date(start.getTime()+minutes*60000);const r=await query("select week_days from calendar_definitions where id=$1 and tenant_id=$2 and enabled=true",[calendarId,tenantId]);if(!r.rowCount)return new Date(start.getTime()+minutes*60000);const days=new Set<number>(Array.isArray(r.rows[0].week_days)?r.rows[0].week_days:[]);const h=await query("select holiday_date from calendar_holidays where calendar_id=$1 and tenant_id=$2",[calendarId,tenantId]);const holidays=new Set(h.rows.map((x:any)=>String(x.holiday_date)));let cursor=new Date(start),left=minutes;while(left>0){const day=cursor.getUTCDay(),key=cursor.toISOString().slice(0,10);if(days.has(day)&&!holidays.has(key)){const available=1440-(cursor.getUTCHours()*60+cursor.getUTCMinutes());const take=Math.min(left,available);cursor=new Date(cursor.getTime()+take*60000);left-=take;if(left<=0)break;}cursor=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),cursor.getUTCDate()+1));}return cursor;}

platformEnginesRouter.get("/api/platform/rules",requireAuth,requirePermission("rule:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 res.json((await query("select * from rule_definitions where tenant_id=$1 order by priority,code",[t.id])).rows);
}));
platformEnginesRouter.post("/api/platform/rules",requireAuth,requirePermission("rule:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const code=s(req.body?.code,80),name=s(req.body?.name,160),eventKey=s(req.body?.eventKey,120);
 if(!code||!name||!eventKey)return res.status(400).json({error:"code، name و eventKey الزامی هستند"});
 const r=await query("insert into rule_definitions(tenant_id,code,name,event_key,priority,enabled,conditions,actions,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",[t.id,code,name,eventKey,Number(req.body?.priority)||100,req.body?.enabled!==false,obj(req.body?.conditions,{}),Array.isArray(req.body?.actions)?req.body.actions:[],(req as any).user.id]);
 res.status(201).json(r.rows[0]);
}));
platformEnginesRouter.patch("/api/platform/rules/:id",requireAuth,requirePermission("rule:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update rule_definitions set name=coalesce($1,name),priority=coalesce($2,priority),enabled=coalesce($3,enabled),conditions=coalesce($4,conditions),actions=coalesce($5,actions),version=version+1,updated_at=now() where id=$6 and tenant_id=$7 returning *",[s(req.body?.name,160)||null,req.body?.priority==null?null:Number(req.body.priority),req.body?.enabled==null?null:Boolean(req.body.enabled),req.body?.conditions?obj(req.body.conditions,{}):null,Array.isArray(req.body?.actions)?req.body.actions:null,req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"قاعده پیدا نشد"});res.json(r.rows[0]);
}));
platformEnginesRouter.post("/api/platform/rules/:id/execute",requireAuth,requirePermission("rule:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const rr=await query("select * from rule_definitions where id=$1 and tenant_id=$2 and enabled=true",[req.params.id,t.id]);
 if(!rr.rowCount)return res.status(404).json({error:"قاعده فعال پیدا نشد"});
 const rule=rr.rows[0],input=obj(req.body?.input,{}),matched=matches(input,rule.conditions||{});
 if(!matched){const skipped=await query("insert into rule_executions(tenant_id,rule_id,event_key,subject_type,subject_id,status,input_data,result_data) values($1,$2,$3,$4,$5,'skipped',$6,$7) returning *",[t.id,rule.id,rule.event_key,s(req.body?.subjectType,80)||null,s(req.body?.subjectId,80)||null,input,{matched:false}]);return res.status(201).json(skipped.rows[0]);}
 for(const action of (Array.isArray(rule.actions)?rule.actions:[])){if(action?.type==="notify"){const n=await query("insert into platform_notifications(tenant_id,user_id,channel,title,body) values($1,$2,$3,$4,$5) returning id",[t.id,s(action.userId,80)||null,s(action.channel,30)||"in_app",s(action.title,200)||rule.name,s(action.body,4000)||("اجرای قاعده "+rule.code)]);await query("insert into notification_outbox(tenant_id,notification_id,channel,destination,payload) values($1,$2,$3,$4,$5)",[t.id,n.rows[0].id,s(action.channel,30)||"in_app",s(action.destination,300)||null,JSON.stringify(action)]);}}
 const r=await query("insert into rule_executions(tenant_id,rule_id,event_key,subject_type,subject_id,status,input_data,result_data) values($1,$2,$3,$4,$5,'executed',$6,$7) returning *",[t.id,rule.id,rule.event_key,s(req.body?.subjectType,80)||null,s(req.body?.subjectId,80)||null,input,{actions:rule.actions,matched:true}]);
 await query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'rule.executed','rule_execution',$3,$4)",[t.id,(req as any).user.id,r.rows[0].id,JSON.stringify(r.rows[0])]);
 res.status(201).json(r.rows[0]);
}));

platformEnginesRouter.get("/api/platform/calendars",requireAuth,requirePermission("calendar:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select c.*,coalesce(json_agg(json_build_object('id',h.id,'date',h.holiday_date,'title',h.title,'recurring',h.recurring) order by h.holiday_date) filter(where h.id is not null),'[]') holidays from calendar_definitions c left join calendar_holidays h on h.calendar_id=c.id where c.tenant_id=$1 group by c.id order by c.code",[t.id]);res.json(r.rows);
}));
platformEnginesRouter.post("/api/platform/calendars",requireAuth,requirePermission("calendar:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const code=s(req.body?.code,80),name=s(req.body?.name,160);if(!code||!name)return res.status(400).json({error:"code و name الزامی هستند"});
 const r=await query("insert into calendar_definitions(tenant_id,code,name,timezone,week_days,holidays,enabled) values($1,$2,$3,$4,$5,'[]'::jsonb,$6) returning *",[t.id,code,name,s(req.body?.timezone,80)||"Asia/Tehran",Array.isArray(req.body?.weekDays)?req.body.weekDays:[6,0,1,2,3,4],req.body?.enabled!==false]);res.status(201).json(r.rows[0]);
}));
platformEnginesRouter.post("/api/platform/calendars/:id/holidays",requireAuth,requirePermission("calendar:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const date=s(req.body?.date,10),title=s(req.body?.title,160);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!title)return res.status(400).json({error:"تاریخ ISO و عنوان الزامی است"});
 const r=await query("insert into calendar_holidays(tenant_id,calendar_id,holiday_date,title,recurring) select $1,id,$2,$3,$4 from calendar_definitions where id=$5 and tenant_id=$1 returning *",[t.id,date,title,Boolean(req.body?.recurring),req.params.id]);if(!r.rowCount)return res.status(404).json({error:"تقویم پیدا نشد"});res.status(201).json(r.rows[0]);
}));

platformEnginesRouter.get("/api/platform/sla/cases",requireAuth,requirePermission("sla:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 res.json((await query("select sc.*,sp.name policy_name from sla_cases sc left join sla_policies sp on sp.id=sc.policy_id where sc.tenant_id=$1 order by sc.created_at desc",[t.id])).rows);
}));
platformEnginesRouter.post("/api/platform/sla/cases",requireAuth,requirePermission("sla:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const policyId=req.body?.policyId==null?null:Number(req.body.policyId);
 const p=policyId?await query("select * from sla_policies where id=$1 and tenant_id=$2 and enabled=true",[policyId,t.id]):{rowCount:0,rows:[]};
 if(policyId&&!p.rowCount)return res.status(404).json({error:"سیاست SLA پیدا نشد"});
 const target=Number(p.rowCount?p.rows[0].target_minutes:p.rows[0]?.response_minutes||0),due=target?await businessDue(t.id,s(req.body?.calendarId,80)||undefined,new Date(),target):null;
 const r=await query("insert into sla_cases(tenant_id,policy_id,subject_type,subject_id,due_at,metadata) values($1,$2,$3,$4,$5,$6) returning *",[t.id,policyId,s(req.body?.subjectType,80)||"case",s(req.body?.subjectId,80)||null,due,obj(req.body?.metadata,{})]);res.status(201).json(r.rows[0]);
}));
platformEnginesRouter.patch("/api/platform/sla/cases/:id",requireAuth,requirePermission("sla:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=s(req.body?.status,20);if(!["open","paused","resolved","breached","cancelled"].includes(status))return res.status(400).json({error:"وضعیت SLA نامعتبر است"});
 const r=await query("update sla_cases set status=$1,resolved_at=case when $1='resolved' then now() else resolved_at end,breached_at=case when $1='breached' then now() else breached_at end,updated_at=now() where id=$2 and tenant_id=$3 returning *",[status,req.params.id,t.id]);if(!r.rowCount)return res.status(404).json({error:"پرونده SLA پیدا نشد"});res.json(r.rows[0]);
}));

platformEnginesRouter.get("/api/platform/notifications",requireAuth,requirePermission("notification:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 res.json((await query("select * from platform_notifications where tenant_id=$1 and (user_id=$2 or user_id is null) order by created_at desc limit 100",[t.id,(req as any).user.id])).rows);
}));
platformEnginesRouter.post("/api/platform/notifications",requireAuth,requirePermission("notification:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const title=s(req.body?.title,200),body=s(req.body?.body,4000),channel=s(req.body?.channel,30)||"in_app";if(!title||!body)return res.status(400).json({error:"عنوان و متن اعلان الزامی است"});
 const r=await pool.query("insert into platform_notifications(tenant_id,user_id,channel,title,body) values($1,$2,$3,$4,$5) returning *",[t.id,s(req.body?.userId,80)||null,channel,title,body]);res.status(201).json(r.rows[0]);
}));
platformEnginesRouter.post("/api/platform/notifications/:id/read",requireAuth,requirePermission("notification:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update platform_notifications set read_at=now(),status='read' where id=$1 and tenant_id=$2 and (user_id=$3 or user_id is null) returning *",[req.params.id,t.id,(req as any).user.id]);if(!r.rowCount)return res.status(404).json({error:"اعلان پیدا نشد"});res.json(r.rows[0]);
}));

platformEnginesRouter.get("/api/platform/audit",requireAuth,requirePermission("audit:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const limit=Math.min(200,Math.max(1,Number(req.query.limit)||50)),q=s(req.query.q,120),params:any[]=[t.id],where=["tenant_id=$1"];
 if(q){params.push("%"+q+"%");where.push("(action ilike $"+params.length+" or entity_type ilike $"+params.length+" or request_id ilike $"+params.length+")")}
 params.push(limit);res.json((await query("select * from platform_audit_events where "+where.join(" and ")+" order by created_at desc limit $"+params.length,params)).rows);
}));
export async function sweepSlaCases(){await query("update sla_cases set status='breached',breached_at=coalesce(breached_at,now()),updated_at=now() where status='open' and due_at is not null and due_at<now()");}
