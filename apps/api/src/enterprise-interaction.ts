import {Router} from "express";
import {createHash} from "node:crypto";
import {query} from "./db.js";
import {requireAuth,requireCsrf,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";

export const enterpriseInteractionRouter=Router();

const tenantOf=async(req:any)=>resolveTenant(req,req.user);
const mustTenant=async(req:any,res:any)=>{const t=await tenantOf(req);if(!t){res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});return null}return t;};

async function workflow(tid:string,entityType:string){
 const w=await query("select id,code,title,entity_type,version from platform_workflow_definitions where entity_type=$1 and status='active' and (tenant_id=$2 or tenant_id is null) order by tenant_id nulls last,version desc limit 1",[entityType,tid]);
 if(!w.rowCount)return null;
 const [states,transitions]=await Promise.all([
  query("select id,code,title,category,is_initial,is_terminal,sort_order from platform_workflow_states where workflow_id=$1 order by sort_order",[w.rows[0].id]),
  query("select t.id,t.from_state_id,t.to_state_id,t.action_code,t.title,t.permission,t.requires_reason,t.requires_comment,fs.code from_state,ts.code to_state from platform_workflow_transitions t join platform_workflow_states fs on fs.id=t.from_state_id join platform_workflow_states ts on ts.id=t.to_state_id where t.workflow_id=$1 order by t.id",[w.rows[0].id])
 ]);
 return {...w.rows[0],states:states.rows,transitions:transitions.rows};
}

async function ensureEntityWorkflow(tid:string,entityType:string,entityId:string,actor:string){
 const w=await workflow(tid,entityType); if(!w)return null;
 const initial=w.states.find((s:any)=>s.is_initial) || w.states[0];
 const r=await query(
  "insert into platform_entity_workflow(tenant_id,workflow_id,entity_type,entity_id,state_id,updated_by) values($1,$2,$3,$4,$5,$6) on conflict(tenant_id,workflow_id,entity_type,entity_id) do update set updated_at=now() returning *",
  [tid,w.id,entityType,entityId,initial.id,actor]
 );
 return {entity:r.rows[0],workflow:w};
}

enterpriseInteractionRouter.get("/api/enterprise/workflows/:entityType",requireAuth,asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const w=await workflow(t.id,String(req.params.entityType));if(!w)return res.status(404).json({error:"چرخه کاری برای این موجودیت تعریف نشده است"});
 res.json(w);
}));

enterpriseInteractionRouter.post("/api/enterprise/verifications",requireAuth,requirePermission("verification:run"),requireCsrf,asyncHandler(async(req,res)=>{const t=await mustTenant(req,res);if(!t)return;const b=req.body||{};if(!b.subjectType||!b.subjectId||!b.verificationType||!b.providerCode)return res.status(400).json({error:"موضوع، نوع استعلام و provider الزامی است"});const correlationId=String(b.correlationId||("VER-"+Date.now().toString(36).toUpperCase()));const r=await query("insert into platform_verification_requests(tenant_id,subject_type,subject_id,verification_type,provider_code,correlation_id,request_payload,requested_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning *",[t.id,b.subjectType,String(b.subjectId),b.verificationType,b.providerCode,correlationId,b.requestPayload||{},(req as any).user.id]);res.status(202).json({request:r.rows[0],message:"استعلام در صف provider قرار گرفت و نتیجه پس از دریافت پاسخ ثبت می‌شود."});}));

enterpriseInteractionRouter.get("/api/enterprise/verifications/:id",requireAuth,asyncHandler(async(req,res)=>{const t=await mustTenant(req,res);if(!t)return;const r=await query("select * from platform_verification_requests where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!r.rowCount)return res.status(404).json({error:"استعلام پیدا نشد"});res.json(r.rows[0]);}));

enterpriseInteractionRouter.post("/api/enterprise/insurance/policies",requireAuth,requirePermission("insurance:manage"),requireCsrf,asyncHandler(async(req,res)=>{const t=await mustTenant(req,res);if(!t)return;const b=req.body||{};if(!b.subjectType||!b.subjectId)return res.status(400).json({error:"موضوع بیمه الزامی است"});const r=await query("insert into platform_insurance_policies(tenant_id,subject_type,subject_id,provider_code,policy_no,coverage_code,status,insured_amount,premium_amount,currency,starts_at,ends_at,policy_payload,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *",[t.id,b.subjectType,String(b.subjectId),b.providerCode||null,b.policyNo||null,b.coverageCode||null,b.status||"quote",b.insuredAmount||null,b.premiumAmount||null,b.currency||"IRR",b.startsAt||null,b.endsAt||null,b.policyPayload||{},(req as any).user.id]);res.status(201).json(r.rows[0]);}));

enterpriseInteractionRouter.get("/api/enterprise/binders",requireAuth,requirePermission("documents:read"),asyncHandler(async(req,res)=>{const t=await mustTenant(req,res);if(!t)return;const r=await query("select id,binder_no,title,owner_ref,created_at,updated_at from digital_binders where tenant_id=$1 order by updated_at desc",[t.id]);res.json({items:r.rows,total:r.rowCount});}));

enterpriseInteractionRouter.post("/api/enterprise/binders",requireAuth,requirePermission("documents:manage"),requireCsrf,asyncHandler(async(req,res)=>{const t=await mustTenant(req,res);if(!t)return;const b=req.body||{};if(!b.binderNo||!b.title)return res.status(400).json({error:"شماره و عنوان زونکن الزامی است"});const r=await query("insert into digital_binders(binder_no,title,owner_ref,tenant_id) values($1,$2,$3,$4) returning *",[String(b.binderNo),String(b.title),b.ownerRef||null,t.id]);res.status(201).json(r.rows[0]);}));

enterpriseInteractionRouter.get("/api/enterprise/tickets",requireAuth,requirePermission("support:read"),asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const page=Math.max(1,Number(req.query.page)||1),pageSize=Math.min(100,Math.max(10,Number(req.query.pageSize)||25));
 const q=typeof req.query.q==="string"?req.query.q.trim():"",status=typeof req.query.status==="string"?req.query.status.trim():"";
 const where=["tenant_id=$1"],params:any[]=[t.id];
 if(q){params.push("%"+q+"%");where.push("(ticket_no ilike $"+params.length+" or subject ilike $"+params.length+" or coalesce(requester_ref,'') ilike $"+params.length+")")}
 if(status){params.push(status);where.push("status=$"+params.length)}
 const total=await query("select count(*)::int total from support_tickets where "+where.join(" and "),params);
 params.push(pageSize,(page-1)*pageSize);
 const rows=await query("select id,ticket_no,subject,priority,status,category,channel,requester_ref,assignee_user_id,impact,urgency,major_incident,sla_response_due_at,sla_resolution_due_at,first_response_at,resolved_at,closed_at,updated_at from support_tickets where "+where.join(" and ")+" order by updated_at desc limit $"+(params.length-1)+" offset $"+params.length,params);
 res.json({items:rows.rows,page,pageSize,total:total.rows[0].total,totalPages:Math.ceil(total.rows[0].total/pageSize)});
}));

enterpriseInteractionRouter.post("/api/enterprise/tickets",requireAuth,requirePermission("support:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const b=req.body||{};if(!b.subject||!b.priority)return res.status(400).json({error:"عنوان و اولویت تیکت الزامی است"});
 const ticketNo=String(b.ticketNo||("TCK-"+Date.now().toString(36).toUpperCase()));
 const r=await query(
  "insert into support_tickets(ticket_no,subject,priority,status,tenant_id,category,channel,requester_ref,assignee_user_id,impact,urgency,major_incident) values($1,$2,$3,'new',$4,$5,$6,$7,$8,$9,$10,$11) returning *",
  [ticketNo,String(b.subject).slice(0,500),String(b.priority).slice(0,30),t.id,b.category||null,b.channel||"portal",b.requesterRef||null,b.assigneeUserId||null,b.impact||null,b.urgency||null,b.majorIncident===true]
 );
 const e=await ensureEntityWorkflow(t.id,"support_ticket",String(r.rows[0].id),(req as any).user.id);
 res.status(201).json({...r.rows[0],workflow:e?.workflow||null});
}));

enterpriseInteractionRouter.get("/api/enterprise/tickets/:id",requireAuth,requirePermission("support:read"),asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const r=await query("select * from support_tickets where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!r.rowCount)return res.status(404).json({error:"تیکت پیدا نشد"});
 const ticket=r.rows[0];
 const ew=await query("select ew.*,s.code state_code,s.title state_title from platform_entity_workflow ew join platform_workflow_states s on s.id=ew.state_id where ew.tenant_id=$1 and ew.entity_type='support_ticket' and ew.entity_id=$2 order by ew.updated_at desc limit 1",[t.id,String(ticket.id)]);
 const history=ew.rowCount?await query("select h.*,fs.code from_state,ts.code to_state,u.full_name actor_name from platform_workflow_history h left join platform_workflow_states fs on fs.id=h.from_state_id join platform_workflow_states ts on ts.id=h.to_state_id left join users u on u.id=h.actor_user_id where h.entity_workflow_id=$1 order by h.created_at",[ew.rows[0].id]):{rows:[]};
 const comments=await query("select c.*,u.full_name author_name from platform_entity_comments c left join users u on u.id=c.author_user_id where c.tenant_id=$1 and c.entity_type='support_ticket' and c.entity_id=$2 order by c.created_at",[t.id,String(ticket.id)]);
 const attachments=await query("select a.id,a.original_name,a.mime_type,a.stored_mime_type,a.size_bytes,a.original_size_bytes,a.ocr_status,a.extracted_text,a.created_at,l.relation_type,l.title from platform_attachment_links l join platform_attachments a on a.id=l.attachment_id where l.tenant_id=$1 and l.entity_type='support_ticket' and l.entity_id=$2 order by a.created_at desc",[t.id,String(ticket.id)]);
 res.json({ticket,workflow:ew.rows[0]||null,history:history.rows,comments:comments.rows,attachments:attachments.rows});
}));

enterpriseInteractionRouter.post("/api/enterprise/tickets/:id/transition",requireAuth,requirePermission("support:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const ticket=await query("select * from support_tickets where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!ticket.rowCount)return res.status(404).json({error:"تیکت پیدا نشد"});
 const action=String(req.body?.action||"");
 const ew=await query("select ew.*,s.code state_code from platform_entity_workflow ew join platform_workflow_states s on s.id=ew.state_id where ew.tenant_id=$1 and ew.entity_type='support_ticket' and ew.entity_id=$2 order by ew.updated_at desc limit 1",[t.id,String(req.params.id)]);
 if(!ew.rowCount){await ensureEntityWorkflow(t.id,"support_ticket",String(req.params.id),(req as any).user.id);return res.status(409).json({error:"چرخه تیکت ایجاد شد؛ عملیات را دوباره اجرا کنید"})}
 const tr=await query("select t.*,ts.code to_state,ts.title to_title from platform_workflow_transitions t join platform_workflow_states ts on ts.id=t.to_state_id where t.workflow_id=$1 and t.from_state_id=$2 and t.action_code=$3",[ew.rows[0].workflow_id,ew.rows[0].state_id,action]);
 if(!tr.rowCount)return res.status(409).json({error:"این انتقال برای وضعیت فعلی مجاز نیست"});
 const transition=tr.rows[0],reason=req.body?.reason?String(req.body.reason).slice(0,1000):null,comment=req.body?.comment?String(req.body.comment).slice(0,4000):null;
 const def=await workflow(t.id,"support_ticket");const rule=def?.transitions.find((x:any)=>x.id===transition.id);
 if(rule?.requires_reason&&!reason)return res.status(400).json({error:"برای این تغییر وضعیت، علت الزامی است"});
 if(rule?.requires_comment&&!comment)return res.status(400).json({error:"برای این تغییر وضعیت، توضیح الزامی است"});
 const client=await (await import("./db.js")).pool.connect();
 try{
  await client.query("begin");
  await client.query("update platform_entity_workflow set state_id=$1,version=version+1,reason=$2,updated_by=$3,updated_at=now() where id=$4",[transition.to_state_id,reason,(req as any).user.id,ew.rows[0].id]);
  await client.query("insert into platform_workflow_history(tenant_id,entity_workflow_id,from_state_id,to_state_id,action_code,reason,comment,actor_user_id) values($1,$2,$3,$4,$5,$6,$7,$8)",[t.id,ew.rows[0].id,ew.rows[0].state_id,transition.to_state_id,action,reason,comment,(req as any).user.id]);
  await client.query("update support_tickets set status=$1,resolved_at=case when $1='resolved' then coalesce(resolved_at,now()) else resolved_at end,closed_at=case when $1='closed' then coalesce(closed_at,now()) else closed_at end,updated_at=now() where id=$2 and tenant_id=$3",[transition.to_state,req.params.id,t.id]);
  if(comment)await client.query("insert into platform_entity_comments(tenant_id,entity_type,entity_id,author_user_id,body,comment_type) values($1,'support_ticket',$2,$3,$4,$5)",[t.id,String(req.params.id),(req as any).user.id,comment,transition.to_state==="resolved"?"resolution":"system"]);
  await client.query("commit");
 }catch(e){await client.query("rollback");throw e}finally{client.release()}
 res.json({status:transition.to_state,title:transition.to_title});
}));

enterpriseInteractionRouter.post("/api/enterprise/entities/:entityType/:entityId/comments",requireAuth,requireCsrf,asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const body=String(req.body?.body||"").trim();if(!body)return res.status(400).json({error:"متن توضیح الزامی است"});
 const type=["comment","internal_note","resolution","system"].includes(req.body?.commentType)?req.body.commentType:"comment";
 const r=await query("insert into platform_entity_comments(tenant_id,entity_type,entity_id,author_user_id,body,comment_type,voice_attachment_id) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,String(req.params.entityType),String(req.params.entityId),(req as any).user.id,body,type,req.body?.voiceAttachmentId||null]);
 res.status(201).json(r.rows[0]);
}));

enterpriseInteractionRouter.post("/api/enterprise/attachments",requireAuth,requirePermission("documents:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const b=req.body||{},raw=String(b.data||"").replace(/^data:[^;]+;base64,/,"");if(!raw)return res.status(400).json({error:"فایل ارسال نشده است"});
 const originalName=String(b.fileName||"document").slice(0,255),mime=String(b.mimeType||"application/octet-stream").toLowerCase();
 const bytes=Buffer.from(raw,"base64");if(!bytes.length)return res.status(400).json({error:"فایل خالی است"});
 if(bytes.length>10*1024*1024)return res.status(413).json({error:"حجم فایل پس از فشرده‌سازی باید کمتر از ۱۰ مگابایت باشد"});
 const sha=createHash("sha256").update(bytes).digest("hex");
 const normalizedMime=String(b.normalizedMime||mime).toLowerCase();
 const storedMime=normalizedMime==="image/webp"&&mime.startsWith("image/")?"image/webp":mime;
 const meta={source_mime:mime,normalization:storedMime==="image/webp"&&mime!=="image/webp"?"client-side-webp":"preserved",voice_note:mime.startsWith("audio/"),original_name:originalName};
 const r=await query("insert into platform_attachments(tenant_id,original_name,storage_name,mime_type,stored_mime_type,size_bytes,original_size_bytes,sha256,storage_kind,binary_data,metadata,uploaded_by) values($1,$2,$3,$4,$5,$6,$7,$8,'database',$9,$10,$11) returning id,original_name,mime_type,stored_mime_type,size_bytes,ocr_status,created_at",[t.id,originalName,cryptoName(originalName),mime,storedMime,bytes.length,Number(b.originalSizeBytes)||bytes.length,sha,bytes,JSON.stringify(meta),(req as any).user.id]);
 const a=r.rows[0];
 if(b.entityType&&b.entityId){
  await query("insert into platform_attachment_links(tenant_id,attachment_id,entity_type,entity_id,relation_type,title,created_by) values($1,$2,$3,$4,$5,$6,$7) on conflict do nothing",[t.id,a.id,String(b.entityType),String(b.entityId),String(b.relationType||"supporting"),b.title||null,(req as any).user.id]);
 }
 if(b.requestOcr===true && mime.startsWith("image/")){
  await query("update platform_attachments set ocr_status='queued',updated_at=now() where id=$1",[a.id]);
  await query("insert into platform_ocr_jobs(tenant_id,attachment_id,language_hint,requested_by) values($1,$2,$3,$4)",[t.id,a.id,b.languageHint||"fa",(req as any).user.id]);
 }
 res.status(201).json({...a,downloadUrl:"/api/enterprise/attachments/"+a.id});
}));

function cryptoName(name:string){return createHash("sha256").update(name+Date.now().toString()+Math.random()).digest("hex")}

enterpriseInteractionRouter.get("/api/enterprise/attachments/:id",requireAuth,requirePermission("documents:read"),asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const r=await query("select * from platform_attachments where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!r.rowCount)return res.status(404).end();
 const a=r.rows[0];res.setHeader("Content-Type",a.stored_mime_type||a.mime_type);res.setHeader("Content-Disposition",`inline; filename*=UTF-8''${encodeURIComponent(a.original_name)}`);res.send(a.binary_data);
}));

enterpriseInteractionRouter.post("/api/enterprise/attachments/:id/ocr",requireAuth,requirePermission("documents:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const a=await query("select id,ocr_status from platform_attachments where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!a.rowCount)return res.status(404).json({error:"سند پیدا نشد"});
 await query("update platform_attachments set ocr_status='queued',updated_at=now() where id=$1",[req.params.id]);
 const job=await query("insert into platform_ocr_jobs(tenant_id,attachment_id,language_hint,requested_by) values($1,$2,$3,$4) returning *",[t.id,req.params.id,req.body?.languageHint||"fa",(req as any).user.id]);
 res.status(202).json({job:job.rows[0],status:"queued"});
}));

enterpriseInteractionRouter.get("/api/enterprise/attachments/:id/ocr",requireAuth,requirePermission("documents:read"),asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const r=await query("select a.id,a.original_name,a.ocr_status,a.extracted_text,j.id job_id,j.status job_status,j.confidence,j.extracted_json,j.error_message from platform_attachments a left join lateral(select * from platform_ocr_jobs where attachment_id=a.id order by created_at desc limit 1) j on true where a.id=$1 and a.tenant_id=$2",[req.params.id,t.id]);if(!r.rowCount)return res.status(404).json({error:"سند پیدا نشد"});
 res.json(r.rows[0]);
}));

enterpriseInteractionRouter.post("/api/enterprise/exports",requireAuth,requirePermission("exports:run"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const entityType=String(req.body?.entityType||"");const format=String(req.body?.format||"xlsx");if(!entityType||!["xlsx","csv","pdf"].includes(format))return res.status(400).json({error:"نوع خروجی نامعتبر است"});
 const r=await query("insert into platform_export_jobs(tenant_id,requested_by,entity_type,format,filters) values($1,$2,$3,$4,$5) returning id,status,created_at",[t.id,(req as any).user.id,entityType,format,req.body?.filters||{}]);
 res.status(202).json({job:r.rows[0],message:"درخواست خروجی ثبت شد و پس از آماده‌سازی قابل دریافت است"});
}));

enterpriseInteractionRouter.post("/api/enterprise/messages",requireAuth,requirePermission("communications:send"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await mustTenant(req,res);if(!t)return;
 const b=req.body||{},channel=String(b.channel||"email");if(!["email","sms","push","whatsapp","telegram","in_app"].includes(channel)||!b.body)return res.status(400).json({error:"کانال یا متن پیام نامعتبر است"});
 const r=await query("insert into platform_message_outbox(tenant_id,channel,destination,subject,body,template_code,payload,created_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,status,created_at",[t.id,channel,b.destination||null,b.subject||null,String(b.body),b.templateCode||null,b.payload||{},(req as any).user.id]);
 res.status(202).json({message:r.rows[0],messageInfo:"پیام وارد صف ارسال شد؛ provider فعال‌شده در تنظیمات مرکزی آن را تحویل می‌دهد."});
}));

