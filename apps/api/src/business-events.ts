import {query} from "./db.js";

const s=(v:unknown,n=300)=>typeof v==="string"?v.trim().slice(0,n):"";
const matches=(input:any,conditions:any):boolean=>{
 if(!conditions||typeof conditions!=="object")return true;
 for(const [key,expected] of Object.entries(conditions)){
  const actual=input?.[key];
  if(expected&&typeof expected==="object"&&!Array.isArray(expected)){
   const op:any=expected;
   if("equals" in op&&actual!==op.equals)return false;
   if("notEquals" in op&&actual===op.notEquals)return false;
   if("in" in op&&(!Array.isArray(op.in)||!op.in.includes(actual)))return false;
   if("exists" in op&&Boolean(actual)!==Boolean(op.exists))return false;
   if("gt" in op&&!(Number(actual)>Number(op.gt)))return false;
   if("gte" in op&&!(Number(actual)>=Number(op.gte)))return false;
   if("lt" in op&&!(Number(actual)<Number(op.lt)))return false;
   if("lte" in op&&!(Number(actual)<=Number(op.lte)))return false;
  }else if(actual!==expected)return false;
 }
 return true;
};

export async function emitBusinessEvent(args:{
 tenantId:string,eventKey:string,subjectType:string,subjectId?:string,userId?:string,input?:Record<string,unknown>
}){
 const rules=await query("select * from rule_definitions where tenant_id=$1 and event_key=$2 and enabled=true order by priority,code",[args.tenantId,args.eventKey]);
 for(const rule of rules.rows){
  const input=args.input||{},matched=matches(input,rule.conditions||{});
  const execution=await query("insert into rule_executions(tenant_id,rule_id,event_key,subject_type,subject_id,status,input_data,result_data) values($1,$2,$3,$4,$5,$6,$7,$8) returning id",[args.tenantId,rule.id,args.eventKey,args.subjectType,args.subjectId||null,matched?"executed":"skipped",JSON.stringify(input),JSON.stringify({matched,actions:rule.actions})]);
  if(!matched)continue;
  for(const action of Array.isArray(rule.actions)?rule.actions:[]){
   if(action?.type==="notify"){
    const n=await query("insert into platform_notifications(tenant_id,user_id,channel,title,body) values($1,$2,$3,$4,$5) returning id",[args.tenantId,s(action.userId,80)||args.userId||null,s(action.channel,30)||"in_app",s(action.title,200)||rule.name,s(action.body,4000)||("رویداد "+args.eventKey+" اجرا شد")]);
    await query("insert into notification_outbox(tenant_id,notification_id,channel,destination,payload) values($1,$2,$3,$4,$5)",[args.tenantId,n.rows[0].id,s(action.channel,30)||"in_app",s(action.destination,300)||null,JSON.stringify(action)]);
   }
  }
  await query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'rule.event.executed','rule_execution',$3,$4)",[args.tenantId,args.userId||null,execution.rows[0].id,JSON.stringify({eventKey:args.eventKey,ruleId:rule.id})]);
 }
}
