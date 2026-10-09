import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requireCsrf,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";
const router=Router();
const read=requirePermission("smart-calendar.read"), write=requirePermission("smart-calendar.write");
const tenant=async(req:any)=>resolveTenant(req,req.user);
async function audit(req:any,t:any,type:string,id:any,action:string,after:any){
 await query("insert into calendar_audit(tenant_id,entity_type,entity_id,action,actor_user_id,after_data) values($1,$2,$3,$4,$5,$6)",[t.id,type,String(id),action,(req as any).user.id,JSON.stringify(after)]);
}
router.get("/api/smart-calendar/overview",requireAuth,read,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const [cal,hol,events,deadlines,plans]=await Promise.all([
  query("select * from calendar_work_calendars where tenant_id=$1 order by is_default desc,title",[t.id]),
  query("select * from calendar_holidays where tenant_id=$1 order by holiday_date desc limit 300",[t.id]),
  query("select * from calendar_events where tenant_id=$1 order by start_at desc limit 300",[t.id]),
  query("select * from calendar_deadlines where tenant_id=$1 order by due_at asc limit 300",[t.id]),
  query("select * from calendar_plans where tenant_id=$1 order by plan_date desc,start_time nulls last limit 300",[t.id])
 ]);
 res.json({calendars:cal.rows,holidays:hol.rows,events:events.rows,deadlines:deadlines.rows,plans:plans.rows});
});
router.post("/api/smart-calendar/calendars",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};
 if(!String(b.calendarKey||"").trim()||!String(b.title||"").trim())return res.status(400).json({error:"شناسه و عنوان تقویم الزامی است"});
 const r=await query("insert into calendar_work_calendars(tenant_id,calendar_key,title,timezone,week_days,day_start,day_end,is_default) values($1,$2,$3,$4,$5,$6,$7,$8) returning *",[t.id,b.calendarKey,b.title,b.timezone||"Asia/Tehran",b.weekDays||[6,0,1,2,3],b.dayStart||"08:00",b.dayEnd||"17:00",Boolean(b.isDefault)]);await audit(req,t,"calendar",r.rows[0].id,"create",r.rows[0]);res.status(201).json(r.rows[0]);
});
router.post("/api/smart-calendar/holidays",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};if(!b.date||!b.title)return res.status(400).json({error:"تاریخ و عنوان تعطیلی الزامی است"});
 const r=await query("insert into calendar_holidays(tenant_id,holiday_date,title,holiday_type,is_working_day_override,notes) values($1,$2,$3,$4,$5,$6) returning *",[t.id,b.date,b.title,b.type||"official",Boolean(b.workingOverride),b.notes||""]);await audit(req,t,"holiday",r.rows[0].id,"create",r.rows[0]);res.status(201).json(r.rows[0]);
});
router.post("/api/smart-calendar/events",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};if(!b.title||!b.startAt||!b.endAt)return res.status(400).json({error:"عنوان، شروع و پایان رویداد الزامی است"});
 const r=await query("insert into calendar_events(tenant_id,title,description,start_at,end_at,all_day,status,event_type,location,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,b.title,b.description||"",b.startAt,b.endAt,Boolean(b.allDay),b.status||"scheduled",b.eventType||"general",b.location||"",(req as any).user.id]);await audit(req,t,"event",r.rows[0].id,"create",r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/smart-calendar/events/:id/status",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const r=await query("update calendar_events set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[req.body?.status||"scheduled",String(String(req.params.id)),t.id]);if(!r.rowCount)return res.status(404).json({error:"رویداد پیدا نشد"});await audit(req,t,"event",String(String(req.params.id)),"status",r.rows[0]);res.json(r.rows[0]);
});
router.post("/api/smart-calendar/deadlines",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};if(!b.title||!b.dueAt)return res.status(400).json({error:"عنوان و سررسید الزامی است"});
 const r=await query("insert into calendar_deadlines(tenant_id,title,description,due_at,priority,status,owner_user_id,source_type,source_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",[t.id,b.title,b.description||"",b.dueAt,b.priority||"normal",b.status||"open",b.ownerUserId||(req as any).user.id,b.sourceType||"manual",b.sourceId||null]);await audit(req,t,"deadline",r.rows[0].id,"create",r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/smart-calendar/deadlines/:id/status",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const status=req.body?.status||"open";const r=await query("update calendar_deadlines set status=$1,completed_at=case when $1='completed' then now() else null end,updated_at=now() where id=$2 and tenant_id=$3 returning *",[status,String(String(req.params.id)),t.id]);if(!r.rowCount)return res.status(404).json({error:"سررسید پیدا نشد"});await audit(req,t,"deadline",String(String(req.params.id)),"status",r.rows[0]);res.json(r.rows[0]);
});
router.post("/api/smart-calendar/plans",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};if(!b.title||!b.planDate)return res.status(400).json({error:"عنوان و تاریخ برنامه الزامی است"});
 const r=await query("insert into calendar_plans(tenant_id,title,plan_date,start_time,end_time,owner_user_id,status,capacity_minutes,notes) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",[t.id,b.title,b.planDate,b.startTime||null,b.endTime||null,b.ownerUserId||(req as any).user.id,b.status||"planned",b.capacityMinutes||null,b.notes||""]);await audit(req,t,"plan",r.rows[0].id,"create",r.rows[0]);res.status(201).json(r.rows[0]);
});
export {router as smartCalendarRouter};