import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requireCsrf,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";

const router=Router();
const read=requirePermission("business-rules.read"),write=requirePermission("business-rules.write");
const tenant=async(req:any)=>resolveTenant(req,req.user);
const audit=async(req:any,t:any,ruleId:any,action:string,before:any,after:any)=>query(
 "insert into business_rule_audit(tenant_id,rule_id,action,actor_user_id,before_data,after_data) values($1,$2,$3,$4,$5,$6)",
 [t.id,ruleId,action,(req as any).user.id,before?JSON.stringify(before):null,after?JSON.stringify(after):null]
);
const validStatus=(s:any)=>["draft","active","paused","archived"].includes(s)?s:"draft";
const getRule=async(t:any,id:string)=>{
 const r=await query("select * from business_rules where id=$1 and tenant_id=$2",[id,t.id]);
 if(!r.rowCount)return null;
 const [c,a,v]=await Promise.all([
  query("select * from business_rule_conditions where rule_id=$1 order by group_no,sort_order",[id]),
  query("select * from business_rule_actions where rule_id=$1 order by sort_order",[id]),
  query("select * from business_rule_versions where rule_id=$1 order by version_no desc",[id])
 ]);
 return {...r.rows[0],conditions:c.rows,actions:a.rows,versions:v.rows};
};

router.get("/api/business-rules/overview",requireAuth,read,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const [rules,conditions,actions,versions,priorities]=await Promise.all([
  query("select * from business_rules where tenant_id=$1 order by priority,updated_at desc",[t.id]),
  query("select c.*,r.title rule_title from business_rule_conditions c join business_rules r on r.id=c.rule_id where r.tenant_id=$1 order by r.priority,c.group_no,c.sort_order",[t.id]),
  query("select a.*,r.title rule_title from business_rule_actions a join business_rules r on r.id=a.rule_id where r.tenant_id=$1 order by r.priority,a.sort_order",[t.id]),
  query("select v.*,r.title rule_title from business_rule_versions v join business_rules r on r.id=v.rule_id where r.tenant_id=$1 order by v.created_at desc",[t.id]),
  query("select p.*,r.title rule_title from business_rule_priorities p join business_rules r on r.id=p.rule_id where p.tenant_id=$1 order by p.priority,r.title",[t.id])
 ]);
 res.json({rules:rules.rows,conditions:conditions.rows,actions:actions.rows,versions:versions.rows,priorities:priorities.rows});
});

router.post("/api/business-rules/rules",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const b=req.body||{};if(!String(b.ruleKey||"").trim()||!String(b.title||"").trim()||!String(b.eventKey||"").trim())return res.status(400).json({error:"شناسه، عنوان و رویداد قاعده الزامی است"});
 try{
  const r=await query("insert into business_rules(tenant_id,rule_key,title,description,event_key,status,priority,stop_on_match,effective_from,effective_to,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) returning *",[t.id,b.ruleKey,b.title,b.description||"",b.eventKey,validStatus(b.status),Number(b.priority)||100,Boolean(b.stopOnMatch),b.effectiveFrom||null,b.effectiveTo||null,(req as any).user.id]);
  await audit(req,t,r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(await getRule(t,r.rows[0].id));
 }catch(e:any){if(e.code==="23505")return res.status(409).json({error:"شناسه قاعده در این سازمان تکراری است"});throw e}
});
router.patch("/api/business-rules/rules/:id",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const before=await getRule(t,String(req.params.id));if(!before)return res.status(404).json({error:"قاعده پیدا نشد"});
 const b=req.body||{};const r=await query("update business_rules set title=coalesce($1,title),description=coalesce($2,description),event_key=coalesce($3,event_key),status=coalesce($4,status),priority=coalesce($5,priority),stop_on_match=coalesce($6,stop_on_match),effective_from=$7,effective_to=$8,updated_by=$9,updated_at=now() where id=$10 and tenant_id=$11 returning *",[b.title,b.description,b.eventKey, b.status?validStatus(b.status):null,b.priority===undefined?null:Number(b.priority),b.stopOnMatch===undefined?null:Boolean(b.stopOnMatch),b.effectiveFrom===undefined?before.effective_from:b.effectiveFrom||null,b.effectiveTo===undefined?before.effective_to:b.effectiveTo||null,(req as any).user.id,String(req.params.id),t.id]);
 await audit(req,t,String(req.params.id),"update",before,r.rows[0]);res.json(await getRule(t,String(req.params.id)));
});
router.delete("/api/business-rules/rules/:id",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const before=await getRule(t,String(req.params.id));if(!before)return res.status(404).json({error:"قاعده پیدا نشد"});
 if(before.status==="active")return res.status(409).json({error:"قاعده فعال را ابتدا متوقف یا بایگانی کنید"});
 await query("delete from business_rules where id=$1 and tenant_id=$2",[String(req.params.id),t.id]);await audit(req,t,String(req.params.id),"delete",before,null);res.status(204).end();
});

router.post("/api/business-rules/rules/:id/conditions",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const rule=await getRule(t,String(req.params.id));if(!rule)return res.status(404).json({error:"قاعده پیدا نشد"});
 const b=req.body||{};if(!b.fieldKey||!b.operator)return res.status(400).json({error:"فیلد و عملگر شرط الزامی است"});
 const r=await query("insert into business_rule_conditions(rule_id,group_no,field_key,operator,comparison_value,join_operator,sort_order) values($1,$2,$3,$4,$5,$6,$7) returning *",[String(req.params.id),Number(b.groupNo)||1,b.fieldKey,b.operator,b.comparisonValue??null,b.joinOperator==="OR"?"OR":"AND",Number(b.sortOrder)||0]);await audit(req,t,String(req.params.id),"condition.create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/business-rules/conditions/:id",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const r=await query("update business_rule_conditions c set field_key=coalesce($1,field_key),operator=coalesce($2,operator),comparison_value=coalesce($3,comparison_value),group_no=coalesce($4,group_no),join_operator=coalesce($5,join_operator),sort_order=coalesce($6,sort_order) from business_rules br where c.id=$7 and c.rule_id=br.id and br.tenant_id=$8 returning c.*",[req.body?.fieldKey,req.body?.operator,req.body?.comparisonValue,req.body?.groupNo,req.body?.joinOperator==="OR"?"OR":req.body?.joinOperator==="AND"?"AND":null,req.body?.sortOrder,String(req.params.id),t.id]);if(!r.rowCount)return res.status(404).json({error:"شرط پیدا نشد"});res.json(r.rows[0]);
});
router.delete("/api/business-rules/conditions/:id",requireAuth,write,requireCsrf,async(req,res)=>{const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const r=await query("delete from business_rule_conditions c using business_rules br where c.id=$1 and c.rule_id=br.id and br.tenant_id=$2 returning c.id",[String(req.params.id),t.id]);if(!r.rowCount)return res.status(404).json({error:"شرط پیدا نشد"});res.status(204).end()});
router.post("/api/business-rules/rules/:id/actions",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const rule=await getRule(t,String(req.params.id));if(!rule)return res.status(404).json({error:"قاعده پیدا نشد"});const b=req.body||{};if(!b.actionKey||!b.actionType)return res.status(400).json({error:"شناسه و نوع اقدام الزامی است"});const r=await query("insert into business_rule_actions(rule_id,action_key,action_type,parameters,sort_order,is_enabled) values($1,$2,$3,$4,$5,$6) returning *",[String(req.params.id),b.actionKey,b.actionType,b.parameters||{},Number(b.sortOrder)||0,b.isEnabled!==false]);await audit(req,t,String(req.params.id),"action.create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/business-rules/actions/:id",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const r=await query("update business_rule_actions a set action_key=coalesce($1,action_key),action_type=coalesce($2,action_type),parameters=coalesce($3,parameters),sort_order=coalesce($4,sort_order),is_enabled=coalesce($5,is_enabled) from business_rules br where a.id=$6 and a.rule_id=br.id and br.tenant_id=$7 returning a.*",[req.body?.actionKey,req.body?.actionType,req.body?.parameters,req.body?.sortOrder,req.body?.isEnabled,String(req.params.id),t.id]);if(!r.rowCount)return res.status(404).json({error:"اقدام پیدا نشد"});res.json(r.rows[0]);
});
router.delete("/api/business-rules/actions/:id",requireAuth,write,requireCsrf,async(req,res)=>{const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const r=await query("delete from business_rule_actions a using business_rules br where a.id=$1 and a.rule_id=br.id and br.tenant_id=$2 returning a.id",[String(req.params.id),t.id]);if(!r.rowCount)return res.status(404).json({error:"اقدام پیدا نشد"});res.status(204).end()});

router.post("/api/business-rules/rules/:id/priority",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const rule=await getRule(t,String(req.params.id));if(!rule)return res.status(404).json({error:"قاعده پیدا نشد"});const n=Number(req.body?.priority);if(!Number.isInteger(n)||n<1)return res.status(400).json({error:"اولویت باید عدد صحیح مثبت باشد"});await query("update business_rules set priority=$1,updated_by=$2,updated_at=now() where id=$3 and tenant_id=$4",[n,(req as any).user.id,String(req.params.id),t.id]);const p=await query("insert into business_rule_priorities(tenant_id,rule_id,priority,valid_from,valid_to,reason,changed_by) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,String(req.params.id),n,req.body?.validFrom||null,req.body?.validTo||null,req.body?.reason||"",(req as any).user.id]);await audit(req,t,String(req.params.id),"priority.change",null,p.rows[0]);res.status(201).json(p.rows[0]);
});

router.post("/api/business-rules/rules/:id/versions",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const rule=await getRule(t,String(req.params.id));if(!rule)return res.status(404).json({error:"قاعده پیدا نشد"});const next=(await query("select coalesce(max(version_no),0)+1 n from business_rule_versions where rule_id=$1",[String(req.params.id)])).rows[0].n;const snapshot={rule:{id:rule.id,rule_key:rule.rule_key,title:rule.title,event_key:rule.event_key,status:rule.status,priority:rule.priority,stop_on_match:rule.stop_on_match},conditions:rule.conditions,actions:rule.actions};const r=await query("insert into business_rule_versions(rule_id,version_no,snapshot,status,change_note,created_by) values($1,$2,$3,'draft',$4,$5) returning *",[String(req.params.id),next,JSON.stringify(snapshot),req.body?.changeNote||"",(req as any).user.id]);await audit(req,t,String(req.params.id),"version.create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.post("/api/business-rules/versions/:id/publish",requireAuth,write,requireCsrf,async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select v.*,br.title rule_title,br.tenant_id from business_rule_versions v join business_rules br on br.id=v.rule_id where v.id=$1 and br.tenant_id=$2",[String(req.params.id),t.id]);if(!r.rowCount)return res.status(404).json({error:"نسخه پیدا نشد"});
 await query("update business_rule_versions set status='superseded' where rule_id=$1 and status='published'",[r.rows[0].rule_id]);
 const p=await query("update business_rule_versions set status='published',published_at=now() where id=$1 returning *",[String(req.params.id)]);await query("update business_rules set status='active',updated_by=$1,updated_at=now() where id=$2 and tenant_id=$3",[(req as any).user.id,r.rows[0].rule_id,t.id]);await audit(req,t,r.rows[0].rule_id,"version.publish",r.rows[0],p.rows[0]);res.json(p.rows[0]);
});
export {router as businessRulesRouter};
