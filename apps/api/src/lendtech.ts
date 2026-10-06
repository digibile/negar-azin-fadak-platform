import {Router} from "express";
import {randomUUID} from "node:crypto";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";

export const lendtechRouter=Router();

const s=(v:unknown,max=250)=>typeof v==="string"?v.trim().slice(0,max):"";
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null;};
const tenant=async(req:any)=>resolveTenant(req,req.user);
const actor=(req:any)=>String(req.user?.id||"system");

async function event(client:any,tenantRef:string,applicationId:string|null,contractId:string|null,eventType:string,actorRef:string,payload:any={}){
 await client.query(
  "insert into lendtech_events(tenant_ref,application_id,contract_id,event_type,actor_ref,payload) values($1,$2,$3,$4,$5,$6)",
  [tenantRef,applicationId,contractId,eventType,actorRef,JSON.stringify(payload)]
 );
}

function applicationNo(){return "CR-"+new Date().toISOString().replace(/[-:TZ.]/g,"").slice(0,14)+"-"+randomUUID().slice(0,8).toUpperCase();}
function facilityNo(){return "FAC-"+Date.now()+"-"+randomUUID().slice(0,6).toUpperCase();}
function contractNo(){return "LN-"+Date.now()+"-"+randomUUID().slice(0,6).toUpperCase();}

lendtechRouter.get("/api/lendtech/applications",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=s(req.query.status,40);
 const params:any[]=[t.id];
 let where="a.tenant_ref=$1";
 if(status){params.push(status);where+=" and a.status=$2";}
 const r=await query(`select a.*,
   (select row_to_json(x) from (select score,band,model_version,created_at from lendtech_scores where application_id=a.id order by created_at desc limit 1)x) as latest_score,
   (select row_to_json(x) from (select decision,approved_amount,approved_term_months,interest_rate,decided_at from lendtech_decisions where application_id=a.id order by decided_at desc limit 1)x) as latest_decision
   from lendtech_applications a where ${where} order by a.created_at desc`,params);
 res.json({tenant:t,items:r.rows,total:r.rowCount});
}));

lendtechRouter.post("/api/lendtech/applications",requireAuth,requirePermission("modules:lendtech:write"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const customerRef=s(req.body?.customerRef,200),productCode=s(req.body?.productCode,80),purpose=s(req.body?.purpose,500);
 const amount=n(req.body?.requestedAmount),term=n(req.body?.termMonths);
 if(!customerRef||!productCode||amount===null||amount<=0||term===null||term<1||term>120)return res.status(400).json({error:"اطلاعات درخواست اعتبار نامعتبر است"});
 const no=applicationNo();
 const r=await query(`insert into lendtech_applications
  (tenant_ref,application_no,customer_ref,product_code,requested_amount,term_months,purpose,created_by)
  values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
  [t.id,no,customerRef,productCode,amount,term,purpose||null,actor(req)]);
 res.status(201).json(r.rows[0]);
}));

lendtechRouter.get("/api/lendtech/applications/:id",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const a=await query("select * from lendtech_applications where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
 if(!a.rowCount)return res.status(404).json({error:"درخواست اعتبار پیدا نشد"});
 const [scores,decisions,facility,contract,events]=await Promise.all([
  query("select * from lendtech_scores where application_id=$1 and tenant_ref=$2 order by created_at desc",[req.params.id,t.id]),
  query("select * from lendtech_decisions where application_id=$1 and tenant_ref=$2 order by decided_at desc",[req.params.id,t.id]),
  query("select * from lendtech_facilities where application_id=$1 and tenant_ref=$2 order by created_at desc",[req.params.id,t.id]),
  query("select c.* from lendtech_contracts c join lendtech_facilities f on f.id=c.facility_id where f.application_id=$1 and c.tenant_ref=$2 order by c.created_at desc",[req.params.id,t.id]),
  query("select * from lendtech_events where application_id=$1 and tenant_ref=$2 order by created_at desc",[req.params.id,t.id])
 ]);
 res.json({application:a.rows[0],scores:scores.rows,decisions:decisions.rows,facilities:facility.rows,contracts:contract.rows,events:events.rows});
}));

lendtechRouter.post("/api/lendtech/applications/:id/kyc",requireAuth,requirePermission("modules:lendtech:write"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=s(req.body?.status,30),providerRef=s(req.body?.providerRef,200);
 if(!["pending","verified","rejected"].includes(status))return res.status(400).json({error:"وضعیت احراز هویت نامعتبر است"});
 if(status==="verified"&&!providerRef)return res.status(400).json({error:"مرجع تأییدکننده احراز هویت الزامی است"});
 const r=await query(`update lendtech_applications set kyc_status=$1,kyc_provider_ref=$2,status=case when $1='verified' and status='submitted' then 'kyc_pending' else status end,updated_at=now()
   where id=$3 and tenant_ref=$4 returning *`,[status,providerRef||null,req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"درخواست اعتبار پیدا نشد"});
 res.json(r.rows[0]);
}));

lendtechRouter.post("/api/lendtech/applications/:id/eligibility",requireAuth,requirePermission("modules:lendtech:score"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const income=n(req.body?.monthlyIncome),obligations=n(req.body?.monthlyObligations??0);
 if(income===null||income<=0||obligations===null||obligations<0)return res.status(400).json({error:"درآمد و تعهدات ماهانه معتبر نیست"});
 const app=await query("select * from lendtech_applications where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
 if(!app.rowCount)return res.status(404).json({error:"درخواست اعتبار پیدا نشد"});
 const dti=Number(((obligations/income)*100).toFixed(3));
 const eligible=dti<=50;
 const reason=eligible?"نسبت تعهدات به درآمد در محدوده مجاز است":"نسبت تعهدات به درآمد از سقف ۵۰ درصد بیشتر است";
 const r=await query(`update lendtech_applications set monthly_income=$1,monthly_obligations=$2,dti_percent=$3,eligibility_status=$4,eligibility_reason=$5,status=case when $4='eligible' then 'submitted' else 'rejected' end,updated_at=now()
   where id=$6 and tenant_ref=$7 returning *`,[income,obligations,dti,eligible?"eligible":"ineligible",reason,req.params.id,t.id]);
 res.json({application:r.rows[0],eligible,dtiPercent:dti,reason});
}));

lendtechRouter.post("/api/lendtech/applications/:id/score",requireAuth,requirePermission("modules:lendtech:score"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const app=await query("select * from lendtech_applications where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
 if(!app.rowCount)return res.status(404).json({error:"درخواست اعتبار پیدا نشد"});
 const a=app.rows[0];
 if(a.kyc_status!=="verified")return res.status(409).json({error:"پیش از امتیازدهی، احراز هویت باید تأیید شود"});
 if(a.eligibility_status!=="eligible")return res.status(409).json({error:"درخواست از نظر شرایط اولیه واجد صلاحیت نیست"});
 const [repayments,delinquencies]=await Promise.all([
  query(`select count(*)::int as count,coalesce(sum(amount),0) as amount
    from lendtech_repayments r join lendtech_contracts c on c.id=r.contract_id
    join lendtech_facilities f on f.id=c.facility_id
    join lendtech_applications a2 on a2.id=f.application_id
    where r.tenant_ref=$1 and a2.customer_ref=$2`,[t.id,a.customer_ref]),
  query(`select count(*)::int as count,coalesce(sum(amount_due),0) as amount
    from lendtech_delinquencies d join lendtech_contracts c on c.id=d.contract_id
    join lendtech_facilities f on f.id=c.facility_id
    join lendtech_applications a2 on a2.id=f.application_id
    where d.tenant_ref=$1 and a2.customer_ref=$2 and d.status='open'`,[t.id,a.customer_ref])
 ]);
 const dti=Number(a.dti_percent),historyCount=Number(repayments.rows[0].count),lateCount=Number(delinquencies.rows[0].count);
 const paymentHistoryScore=lateCount>0?Math.max(20,70-Math.min(50,lateCount*10)):Math.min(100,70+Math.min(30,historyCount*5));
 const dtiScore=Math.max(0,100-dti*1.5);
 const identityConfidenceScore=100;
 const incomeStabilityScore=Math.max(0,Math.min(100,100-dti));
 const score=Number((identityConfidenceScore*0.20+paymentHistoryScore*0.35+incomeStabilityScore*0.20+dtiScore*0.25).toFixed(2))*10;
 const band=score>=800?"A":score>=700?"B":score>=600?"C":"D";
 const r=await query(`insert into lendtech_scores(tenant_ref,application_id,score,band,inputs,created_by) values($1,$2,$3,$4,$5,$6) returning *`,
  [t.id,a.id,score,band,JSON.stringify({monthlyIncome:Number(a.monthly_income),dtiPercent:dti,paymentHistoryScore,incomeStabilityScore,identityConfidenceScore,repaymentCount:historyCount,openDelinquencyCount:lateCount}),actor(req)]);
 await query("update lendtech_applications set status='scoring',updated_at=now() where id=$1 and tenant_ref=$2",[a.id,t.id]);
 res.status(201).json({applicationId:a.id,score:r.rows[0]});
}));

lendtechRouter.post("/api/lendtech/applications/:id/decision",requireAuth,requirePermission("modules:lendtech:decide"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const app=await query("select * from lendtech_applications where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
 if(!app.rowCount)return res.status(404).json({error:"درخواست اعتبار پیدا نشد"});
 const a=app.rows[0];
 const score=await query("select * from lendtech_scores where application_id=$1 and tenant_ref=$2 order by created_at desc limit 1",[a.id,t.id]);
 if(!score.rowCount)return res.status(409).json({error:"امتیاز اعتباری هنوز ثبت نشده است"});
 const forced=s(req.body?.decision,20);
 const decision=forced|| (Number(score.rows[0].score)>=650?"approve":"reject");
 if(!["approve","reject"].includes(decision))return res.status(400).json({error:"تصمیم اعتباری نامعتبر است"});
 const approvedAmount=decision==="approve"?Math.min(Number(a.requested_amount),Number(req.body?.approvedAmount??a.requested_amount)):null;
 const approvedTerm=decision==="approve"?Math.min(Number(a.term_months),Number(req.body?.approvedTermMonths??a.term_months)):null;
 const rate=decision==="approve"?Math.max(0,Number(req.body?.interestRate??18)):null;
 if(decision==="approve"&&(!approvedAmount||approvedAmount<=0||!approvedTerm||approvedTerm<1||rate===null||rate<0))return res.status(400).json({error:"پارامترهای مصوبه اعتباری نامعتبر است"});
 const r=await query(`insert into lendtech_decisions(tenant_ref,application_id,decision,approved_amount,approved_term_months,interest_rate,reason,decided_by)
   values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
  [t.id,a.id,decision,approvedAmount,approvedTerm,rate,s(req.body?.reason,500)||null,actor(req)]);
 await query("update lendtech_applications set status=$1,updated_at=now() where id=$2 and tenant_ref=$3",[decision==="approve"?"committee":"rejected",a.id,t.id]);
 res.status(201).json(r.rows[0]);
}));

lendtechRouter.post("/api/lendtech/applications/:id/committee",requireAuth,requirePermission("modules:lendtech:committee"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const decision=await query("select * from lendtech_decisions where application_id=$1 and tenant_ref=$2 and decision='approve' order by decided_at desc limit 1",[req.params.id,t.id]);
 if(!decision.rowCount)return res.status(409).json({error:"مصوبه قابل تأیید کمیته پیدا نشد"});
 const a=await query("select * from lendtech_applications where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
 if(!a.rowCount)return res.status(404).json({error:"درخواست اعتبار پیدا نشد"});
 const d=decision.rows[0];
 const r=await query(`insert into lendtech_facilities(tenant_ref,application_id,facility_no,approved_amount,available_amount)
   values($1,$2,$3,$4,$4) returning *`,[t.id,a.rows[0].id,facilityNo(),d.approved_amount]);
 await query("update lendtech_applications set status='approved',updated_at=now() where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
 res.status(201).json(r.rows[0]);
}));

lendtechRouter.post("/api/lendtech/facilities/:id/contract",requireAuth,requirePermission("modules:lendtech:write"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const facility=await query("select f.*,d.interest_rate,d.approved_term_months from lendtech_facilities f join lendtech_decisions d on d.application_id=f.application_id and d.decision='approve' where f.id=$1 and f.tenant_ref=$2 order by d.decided_at desc limit 1",[req.params.id,t.id]);
 if(!facility.rowCount)return res.status(404).json({error:"تسهیلات پیدا نشد"});
 const f=facility.rows[0];
 const r=await query(`insert into lendtech_contracts(tenant_ref,facility_id,contract_no,principal,interest_rate,term_months,signed_at)
   values($1,$2,$3,$4,$5,$6,now()) returning *`,
  [t.id,f.id,contractNo(),f.approved_amount,f.interest_rate,f.approved_term_months]);
 await query("update lendtech_applications set status='contracted',updated_at=now() where id=(select application_id from lendtech_facilities where id=$1) and tenant_ref=$2",[f.id,t.id]);
 res.status(201).json(r.rows[0]);
}));

lendtechRouter.post("/api/lendtech/contracts/:id/disburse",requireAuth,requirePermission("modules:lendtech:disburse"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const c=await client.query("select c.*,f.application_id,f.id as facility_id from lendtech_contracts c join lendtech_facilities f on f.id=c.facility_id where c.id=$1 and c.tenant_ref=$2 for update",[req.params.id,t.id]);
  if(!c.rowCount){await client.query("rollback");return res.status(404).json({error:"قرارداد پیدا نشد"});}
  const contract=c.rows[0];
  if(contract.status!=="signed"){await client.query("rollback");return res.status(409).json({error:"فقط قرارداد امضاشده قابل پرداخت است"});}
  const months=Number(contract.term_months),principal=Number(contract.principal),rate=Number(contract.interest_rate)/100/12;
  const payment=rate===0?principal/months:(principal*rate*Math.pow(1+rate,months))/(Math.pow(1+rate,months)-1);
  let remainingPrincipal=principal;
  const start=new Date();
  for(let i=1;i<=months;i++){
   const due=new Date(start);due.setMonth(due.getMonth()+i);
   const interestDue=rate===0?0:Number((remainingPrincipal*rate).toFixed(2));
   const principalDue=i===months?remainingPrincipal:Number(Math.max(0,payment-interestDue).toFixed(2));
   remainingPrincipal=Math.max(0,Number((remainingPrincipal-principalDue).toFixed(2)));
   await client.query(\`insert into lendtech_installments(tenant_ref,contract_id,installment_no,due_date,principal_due,interest_due,total_due)
     values($1,$2,$3,$4,$5,$6,$7)\`,
    [t.id,contract.id,i,due.toISOString().slice(0,10),principalDue,interestDue,Number((principalDue+interestDue).toFixed(2))]);
  }
  await client.query("update lendtech_contracts set status='active',disbursed_at=now(),updated_at=now() where id=$1 returning *",[contract.id]);
  await client.query("update lendtech_facilities set status='active',available_amount=0,updated_at=now() where id=$1",[contract.facility_id]);
  await client.query("update lendtech_applications set status='disbursed',updated_at=now() where id=$1 and tenant_ref=$2",[contract.application_id,t.id]);
  await event(client,t.id,contract.application_id,contract.id,"contract.disbursed",actor(req),{principal,termMonths:months});
  await client.query("commit");
  res.json({contractId:contract.id,status:"active",principal,termMonths:months});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

lendtechRouter.get("/api/lendtech/contracts/:id/installments",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select * from lendtech_installments where contract_id=$1 and tenant_ref=$2 order by installment_no",[req.params.id,t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechRouter.post("/api/lendtech/contracts/:id/repay",requireAuth,requirePermission("modules:lendtech:repay"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const amount=n(req.body?.amount),paymentRef=s(req.body?.paymentRef,160)||("PAY-"+Date.now());
 if(amount===null||amount<=0)return res.status(400).json({error:"مبلغ بازپرداخت نامعتبر است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const c=await client.query("select * from lendtech_contracts where id=$1 and tenant_ref=$2 for update",[req.params.id,t.id]);
  if(!c.rowCount){await client.query("rollback");return res.status(404).json({error:"قرارداد پیدا نشد"});}
  const duplicate=await client.query("select id from lendtech_repayments where tenant_ref=$1 and payment_ref=$2",[t.id,paymentRef]);
  if(duplicate.rowCount){await client.query("rollback");return res.status(409).json({error:"مرجع پرداخت تکراری است"});}
  let remaining=amount;
  const installments=await client.query("select * from lendtech_installments where contract_id=$1 and tenant_ref=$2 and status<>'paid' order by due_date,installment_no for update",[req.params.id,t.id]);
  const allocation:any[]=[];
  for(const i of installments.rows){
   if(remaining<=0)break;
   const interestOutstanding=Math.max(0,Number(i.interest_due)-Number(i.interest_paid));
   const principalOutstanding=Math.max(0,Number(i.principal_due)-Number(i.principal_paid));
   const interestPaid=Math.min(remaining,interestOutstanding);remaining-=interestPaid;
   const principalPaid=Math.min(remaining,principalOutstanding);remaining-=principalPaid;
   const newInterest=Number(i.interest_paid)+interestPaid,newPrincipal=Number(i.principal_paid)+principalPaid;
   const paid=newInterest>=Number(i.interest_due)-0.005&&newPrincipal>=Number(i.principal_due)-0.005;
   await client.query(`update lendtech_installments set interest_paid=$1,principal_paid=$2,status=$3,paid_at=case when $3='paid' then now() else paid_at end where id=$4`,
    [newInterest,newPrincipal,paid?"paid":"partial",i.id]);
   allocation.push({installmentId:i.id,interestPaid,principalPaid});
  }
  const applied=Number((amount-remaining).toFixed(2));
  if(applied<=0){await client.query("rollback");return res.status(409).json({error:"مانده قابل پرداختی برای این قرارداد وجود ندارد"});}
  const r=await client.query("insert into lendtech_repayments(tenant_ref,contract_id,payment_ref,amount,method,allocation,created_by) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,req.params.id,paymentRef,applied,s(req.body?.method,50)||null,JSON.stringify(allocation),actor(req)]);
  const open=await client.query("select count(*)::int as count from lendtech_installments where contract_id=$1 and status<>'paid'",[req.params.id]);
  if(Number(open.rows[0].count)===0)await client.query("update lendtech_contracts set status='closed',closed_at=now(),updated_at=now() where id=$1",[req.params.id]);
  await event(client,t.id,null,req.params.id,"repayment.received",actor(req),{paymentRef,amount:applied,unallocated:remaining});
  await client.query("commit");
  res.status(201).json({repayment:r.rows[0],unallocated:remaining});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

lendtechRouter.post("/api/lendtech/contracts/:id/delinquency/refresh",requireAuth,requirePermission("modules:lendtech:collect"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const overdue=await query(`select * from lendtech_installments where contract_id=$1 and tenant_ref=$2 and due_date<current_date and status<>'paid' order by due_date`,[req.params.id,t.id]);
 const items=[];
 for(const i of overdue.rows){
  const days=Math.max(1,Math.floor((Date.now()-new Date(i.due_date).getTime())/86400000));
  const amount=Math.max(0,Number(i.total_due)-Number(i.principal_paid)-Number(i.interest_paid));
  const r=await query(`insert into lendtech_delinquencies(tenant_ref,contract_id,installment_id,days_overdue,amount_due)
    values($1,$2,$3,$4,$5)
    on conflict do nothing returning *`,[t.id,req.params.id,i.id,days,amount]);
  if(r.rowCount)items.push(r.rows[0]);
 }
 await query("update lendtech_contracts set status='delinquent',updated_at=now() where id=$1 and tenant_ref=$2 and status='active' and exists(select 1 from lendtech_delinquencies d where d.contract_id=$1 and d.status='open')",[req.params.id,t.id]);
 res.json({items,total:items.length});
}));

lendtechRouter.post("/api/lendtech/contracts/:id/restructure",requireAuth,requirePermission("modules:lendtech:collect"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const term=n(req.body?.newTermMonths),reason=s(req.body?.reason,500);
 if(term===null||term<1||term>120||!reason)return res.status(400).json({error:"مدت جدید و علت بازسازی الزامی است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const c=await client.query("select * from lendtech_contracts where id=$1 and tenant_ref=$2 for update",[req.params.id,t.id]);
  if(!c.rowCount){await client.query("rollback");return res.status(404).json({error:"قرارداد پیدا نشد"});}
  const contract=c.rows[0];
  if(["closed"].includes(contract.status)){await client.query("rollback");return res.status(409).json({error:"قرارداد مختومه قابل بازسازی نیست"});}
  const outstanding=await client.query(`select
    coalesce(sum(principal_due-principal_paid),0) as principal,
    coalesce(sum(interest_due-interest_paid),0) as interest
    from lendtech_installments where contract_id=$1 and status<>'paid'`,[contract.id]);
  const remainingPrincipal=Number(outstanding.rows[0].principal);
  if(remainingPrincipal<=0){await client.query("rollback");return res.status(409).json({error:"مانده اصلی قرارداد برای بازسازی وجود ندارد"});}
  await client.query("delete from lendtech_installments where contract_id=$1 and status<>'paid'",[contract.id]);
  const months=Number(term),rate=Number(contract.interest_rate)/100/12;
  const payment=rate===0?remainingPrincipal/months:(remainingPrincipal*rate*Math.pow(1+rate,months))/(Math.pow(1+rate,months)-1);
  let balance=remainingPrincipal;
  const startDate=new Date();
  for(let i=1;i<=months;i++){
   const due=new Date(startDate);due.setMonth(due.getMonth()+i);
   const interestDue=rate===0?0:Number((balance*rate).toFixed(2));
   const principalDue=i===months?balance:Number(Math.max(0,payment-interestDue).toFixed(2));
   balance=Math.max(0,Number((balance-principalDue).toFixed(2)));
   await client.query(`insert into lendtech_installments(tenant_ref,contract_id,installment_no,due_date,principal_due,interest_due,total_due)
     values($1,$2,$3,$4,$5,$6,$7)`,
    [t.id,contract.id,i,due.toISOString().slice(0,10),principalDue,interestDue,Number((principalDue+interestDue).toFixed(2))]);
  }
  const r=await client.query("insert into lendtech_restructures(tenant_ref,contract_id,old_term_months,new_term_months,reason,created_by) values($1,$2,$3,$4,$5,$6) returning *",[t.id,contract.id,contract.term_months,term,reason,actor(req)]);
  await client.query("update lendtech_contracts set term_months=$1,status='active',updated_at=now() where id=$2",[term,contract.id]);
  await client.query("update lendtech_delinquencies set status='resolved',resolved_at=now() where contract_id=$1 and status='open'",[contract.id]);
  await event(client,t.id,null,contract.id,"contract.restructured",actor(req),{oldTermMonths:contract.term_months,newTermMonths:term,remainingPrincipal});
  await client.query("commit");
  res.status(201).json({restructure:r.rows[0],remainingPrincipal,newTermMonths:term});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

lendtechRouter.get("/api/lendtech/my-facilities",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);
 if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query(`select f.id,f.facility_no,f.approved_amount,f.available_amount,f.status,f.currency,f.created_at,
   a.customer_ref,a.product_code,
   d.approved_term_months,d.interest_rate
   from lendtech_facilities f
   join lendtech_applications a on a.id=f.application_id
   left join lateral (select approved_term_months,interest_rate from lendtech_decisions where application_id=a.id and decision='approve' order by decided_at desc limit 1)d on true
   where f.tenant_ref=$1 and f.status='active' and f.available_amount>0
   order by f.created_at desc`,[t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechRouter.get("/api/lendtech/facilities/:id/collaterals",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select * from lendtech_collaterals where facility_id=$1 and tenant_ref=$2 order by created_at desc",[req.params.id,t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));
lendtechRouter.post("/api/lendtech/facilities/:id/collaterals",requireAuth,requirePermission("modules:lendtech:write"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const type=s(req.body?.collateralType,80),owner=s(req.body?.ownerRef,160),description=s(req.body?.description,500);
 const value=n(req.body?.declaredValue);
 if(!type||value===null||value<0)return res.status(400).json({error:"نوع و ارزش وثیقه معتبر نیست"});
 const exists=await query("select id from lendtech_facilities where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
 if(!exists.rowCount)return res.status(404).json({error:"تسهیلات پیدا نشد"});
 const no="COL-"+Date.now()+"-"+randomUUID().slice(0,6).toUpperCase();
 const r=await query("insert into lendtech_collaterals(tenant_ref,facility_id,collateral_no,collateral_type,owner_ref,description,declared_value,verified_value,status,reference_data,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,'proposed',$9,$10) returning *",[t.id,req.params.id,no,type,owner||null,description||null,value,n(req.body?.verifiedValue),JSON.stringify(req.body?.referenceData||{}),actor(req)]);
 res.status(201).json(r.rows[0]);
}));
lendtechRouter.post("/api/lendtech/collaterals/:id/verify",requireAuth,requirePermission("modules:lendtech:committee"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const value=n(req.body?.verifiedValue);
 const r=await query("update lendtech_collaterals set status='verified',verified_value=coalesce($1,verified_value),updated_at=now() where id=$2 and tenant_ref=$3 returning *",[value,req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"وثیقه پیدا نشد"});
 res.json(r.rows[0]);
}));
lendtechRouter.post("/api/lendtech/contracts/:id/collection-case",requireAuth,requirePermission("modules:lendtech:collect"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const d=await query("select id,amount_due,days_overdue from lendtech_delinquencies where contract_id=$1 and tenant_ref=$2 and status='open' order by days_overdue desc limit 1",[req.params.id,t.id]);
 if(!d.rowCount)return res.status(409).json({error:"برای این قرارداد پرونده معوق باز وجود ندارد"});
 const no="COLL-"+Date.now()+"-"+randomUUID().slice(0,6).toUpperCase();
 const r=await query("insert into lendtech_collection_cases(tenant_ref,contract_id,delinquency_id,case_no,stage,status,assigned_to,next_action_at,notes,created_by) values($1,$2,$3,$4,$5,'open',$6,$7,$8,$9) returning *",[t.id,req.params.id,d.rows[0].id,no,Number(d.rows[0].days_overdue)>90?"legal":Number(d.rows[0].days_overdue)>30?"intensive":"early",s(req.body?.assignedTo,160)||null,req.body?.nextActionAt||null,s(req.body?.notes,1000)||null,actor(req)]);
 res.status(201).json(r.rows[0]);
}));
lendtechRouter.get("/api/lendtech/contracts/:id/collection-cases",requireAuth,requirePermission("modules:lendtech:collect"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select * from lendtech_collection_cases where contract_id=$1 and tenant_ref=$2 order by created_at desc",[req.params.id,t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));
lendtechRouter.post("/api/lendtech/collection-cases/:id/promise",requireAuth,requirePermission("modules:lendtech:collect"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const amount=n(req.body?.promiseAmount),due=s(req.body?.promiseDueDate,20),notes=s(req.body?.notes,1000);
 if(amount===null||amount<=0||!due)return res.status(400).json({error:"مبلغ و تاریخ وعده پرداخت الزامی است"});
 const r=await query("update lendtech_collection_cases set promise_amount=$1,promise_due_date=$2,notes=coalesce($3,notes),status='promise',updated_at=now() where id=$4 and tenant_ref=$5 returning *",[amount,due,notes||null,req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"پرونده وصول پیدا نشد"});
 res.json(r.rows[0]);
}));
lendtechRouter.post("/api/lendtech/collection-cases/:id/resolve",requireAuth,requirePermission("modules:lendtech:collect"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);
 if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update lendtech_collection_cases set status='resolved',updated_at=now(),notes=coalesce($1,notes) where id=$2 and tenant_ref=$3 returning *",[s(req.body?.notes,1000)||null,req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"پرونده وصول پیدا نشد"});
 res.json(r.rows[0]);
}));

lendtechRouter.get("/api/lendtech/portfolio",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);
 if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const [applications,facilities,contracts,overdue]=await Promise.all([
  query("select count(*)::int as count,coalesce(sum(requested_amount),0) as amount from lendtech_applications where tenant_ref=$1",[t.id]),
  query("select count(*)::int as count,coalesce(sum(approved_amount),0) as amount from lendtech_facilities where tenant_ref=$1 and status in ('approved','active')",[t.id]),
  query("select count(*)::int as count,coalesce(sum(principal),0) as amount from lendtech_contracts where tenant_ref=$1 and status in ('active','delinquent')",[t.id]),
  query("select count(distinct contract_id)::int as contracts,coalesce(sum(amount_due),0) as amount from lendtech_delinquencies where tenant_ref=$1 and status='open'",[t.id])
 ]);
 res.json({tenant:t,applications:applications.rows[0],facilities:facilities.rows[0],contracts:contracts.rows[0],overdue:overdue.rows[0]});
}));
