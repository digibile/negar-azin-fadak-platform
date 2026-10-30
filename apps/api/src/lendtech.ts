import {Router} from "express";
import {randomUUID} from "node:crypto";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";
import {calculateLendtechScore} from "./lendtech-scoring.js";
import {addMonthsClamped} from "./lendtech-schedule.js";
import {buildAmortizationSchedule,calculateDtiThousandths,calculateInstallmentQuote,formatMinorUnits,formatScaledPercent,parseMoneyToMinorUnits,parsePercentToScaledInteger} from "./lendtech-money.js";

export const lendtechRouter=Router();

lendtechRouter.post("/api/lendtech/installment-quote",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);
 if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const amount=parseMoneyToMinorUnits(req.body?.amount);
 const months=n(req.body?.months);
 const intervalDays=n(req.body?.intervalDays);
 const startValue=s(req.body?.startDate,40);
 const start=startValue?new Date(startValue):new Date();
 if(amount===null||amount<=0n||amount>100000000000000000n||months===null||intervalDays===null||
    !Number.isInteger(months)||months<1||months>120||!Number.isInteger(intervalDays)||intervalDays<1||intervalDays>366||Number.isNaN(start.getTime())){
  return res.status(400).json({error:"اطلاعات محاسبه اقساط معتبر نیست"});
 }
 try{
  const quote=calculateInstallmentQuote(amount,req.body?.downPaymentPercent,req.body?.feePercent,months);
  return res.json({
   tenant:{id:t.id,code:t.code},
   currency:s(req.body?.currency,8)||"IRR",
   downPayment:formatMinorUnits(quote.downPayment),
   financedAmount:formatMinorUnits(quote.financedAmount),
   serviceFee:formatMinorUnits(quote.serviceFee),
   totalInstallments:formatMinorUnits(quote.totalInstallments),
   totalPayable:formatMinorUnits(quote.totalPayable),
   installmentCount:quote.installments.length,
   installments:quote.installments.map(row=>({number:row.number,dueDate:addDays(start,intervalDays*row.number).toISOString().slice(0,10),amount:formatMinorUnits(row.amount)}))
  });
 }catch(error){
  return res.status(400).json({error:error instanceof Error?error.message:"پارامترهای محاسبه اقساط معتبر نیستند"});
 }
}));



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

function addDays(start:Date,days:number):Date{const due=new Date(start.getTime());due.setUTCDate(due.getUTCDate()+days);return due;}

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
   (select row_to_json(x) from (select score,band,model_version,created_at from lendtech_scores where application_id=a.id and tenant_ref=a.tenant_ref order by created_at desc limit 1)x) as latest_score,
   (select row_to_json(x) from (select decision,approved_amount,approved_term_months,interest_rate,decided_at from lendtech_decisions where application_id=a.id and tenant_ref=a.tenant_ref order by decided_at desc limit 1)x) as latest_decision
   from lendtech_applications a where ${where} order by a.created_at desc`,params);
 res.json({tenant:t,items:r.rows,total:r.rowCount});
}));

lendtechRouter.post("/api/lendtech/applications",requireAuth,requirePermission("modules:lendtech:write"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const customerRef=s(req.body?.customerRef,200),productCode=s(req.body?.productCode,80),purpose=s(req.body?.purpose,500);
 const amount=parseMoneyToMinorUnits(req.body?.requestedAmount),term=n(req.body?.termMonths);
 if(!customerRef||!productCode||amount===null||amount<=0n||term===null||!Number.isInteger(term)||term<1||term>120)return res.status(400).json({error:"اطلاعات درخواست اعتبار نامعتبر است"});
 const no=applicationNo();
 const r=await query(`insert into lendtech_applications
  (tenant_ref,application_no,customer_ref,product_code,requested_amount,term_months,purpose,created_by)
  values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
  [t.id,no,customerRef,productCode,formatMinorUnits(amount),term,purpose||null,actor(req)]);
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
  query("select c.* from lendtech_contracts c join lendtech_facilities f on f.id=c.facility_id and f.tenant_ref=c.tenant_ref where f.application_id=$1 and f.tenant_ref=$2 and c.tenant_ref=$2 order by c.created_at desc",[req.params.id,t.id]),
  query("select * from lendtech_events where application_id=$1 and tenant_ref=$2 order by created_at desc",[req.params.id,t.id])
 ]);
 res.json({application:a.rows[0],scores:scores.rows,decisions:decisions.rows,facilities:facility.rows,contracts:contract.rows,events:events.rows});
}));

lendtechRouter.post("/api/lendtech/applications/:id/kyc",requireAuth,requirePermission("modules:lendtech:write"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=s(req.body?.status,30),providerRef=s(req.body?.providerRef,200);
 if(!["pending","verified","rejected"].includes(status))return res.status(400).json({error:"وضعیت احراز هویت نامعتبر است"});
 if(status==="verified")return res.status(503).json({error:"تأیید احراز هویت فقط پس از دریافت پاسخ امضاشده از ارائه‌دهنده معتبر مجاز است؛ اتصال ارائه‌دهنده هنوز پیکربندی نشده و وضعیت پرونده تغییر نکرد."});
 const r=await query(`update lendtech_applications set kyc_status=$1,kyc_provider_ref=$2,updated_at=now()
   where id=$3 and tenant_ref=$4 returning *`,[status,providerRef||null,req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"درخواست اعتبار پیدا نشد"});
 res.json(r.rows[0]);
}));

lendtechRouter.post("/api/lendtech/applications/:id/eligibility",requireAuth,requirePermission("modules:lendtech:score"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const income=parseMoneyToMinorUnits(req.body?.monthlyIncome),obligations=parseMoneyToMinorUnits(req.body?.monthlyObligations??"0");
 if(income===null||income<=0n||obligations===null||obligations<0n)return res.status(400).json({error:"درآمد و تعهدات ماهانه معتبر نیست؛ حداکثر دو رقم اعشار مجاز است"});
 const dtiScaled=calculateDtiThousandths(income,obligations);
 if(dtiScaled===null)return res.status(400).json({error:"نسبت تعهدات به درآمد خارج از دامنه قابل ثبت است"});
 const app=await query("select * from lendtech_applications where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
 if(!app.rowCount)return res.status(404).json({error:"درخواست اعتبار پیدا نشد"});
 const dtiText=formatScaledPercent(dtiScaled,1000n),dti=Number(dtiText);
 const eligible=dtiScaled<=50000n;
 const reason=eligible?"نسبت تعهدات به درآمد در محدوده مجاز است":"نسبت تعهدات به درآمد از سقف ۵۰ درصد بیشتر است";
 const r=await query(`update lendtech_applications set monthly_income=$1,monthly_obligations=$2,dti_percent=$3,eligibility_status=$4,eligibility_reason=$5,status=case when $4='eligible' then 'submitted' else 'rejected' end,updated_at=now()
   where id=$6 and tenant_ref=$7 returning *`,[formatMinorUnits(income),formatMinorUnits(obligations),dtiText,eligible?"eligible":"ineligible",reason,req.params.id,t.id]);
 res.json({application:r.rows[0],eligible,dtiPercent:dtiText,reason});
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
    from lendtech_repayments r join lendtech_contracts c on c.id=r.contract_id and c.tenant_ref=r.tenant_ref
    join lendtech_facilities f on f.id=c.facility_id and f.tenant_ref=c.tenant_ref
    join lendtech_applications a2 on a2.id=f.application_id and a2.tenant_ref=f.tenant_ref
    where r.tenant_ref=$1 and a2.customer_ref=$2`,[t.id,a.customer_ref]),
  query(`select count(*)::int as count,coalesce(sum(amount_due),0) as amount
    from lendtech_delinquencies d join lendtech_contracts c on c.id=d.contract_id and c.tenant_ref=d.tenant_ref
    join lendtech_facilities f on f.id=c.facility_id and f.tenant_ref=c.tenant_ref
    join lendtech_applications a2 on a2.id=f.application_id and a2.tenant_ref=f.tenant_ref
    where d.tenant_ref=$1 and a2.customer_ref=$2 and d.status='open'`,[t.id,a.customer_ref])
 ]);
 const dti=Number(a.dti_percent),historyCount=Number(repayments.rows[0].count),lateCount=Number(delinquencies.rows[0].count);
 const scoring=calculateLendtechScore({dtiPercent:dti,repaymentCount:historyCount,openDelinquencyCount:lateCount,monthlyIncome:String(a.monthly_income),kycStatus:a.kyc_status});
 const {score,band}=scoring;
 const r=await query(`insert into lendtech_scores(tenant_ref,application_id,score,band,inputs,model_version,created_by) values($1,$2,$3,$4,$5,$6,$7) returning *`,
  [t.id,a.id,score,band,JSON.stringify(scoring.inputs),"rules-v2",actor(req)]);
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
 const requestedAmount=parseMoneyToMinorUnits(a.requested_amount);
 const submittedAmount=parseMoneyToMinorUnits(req.body?.approvedAmount??a.requested_amount);
 const approvedAmount=decision==="approve"&&requestedAmount!==null&&submittedAmount!==null
   ?formatMinorUnits(submittedAmount<requestedAmount?submittedAmount:requestedAmount):null;
 const requestedApprovedTerm=decision==="approve"?Number(req.body?.approvedTermMonths??a.term_months):null;
 const approvedTermCandidate=requestedApprovedTerm??0;
 const approvedTerm=decision==="approve"&&Number.isInteger(approvedTermCandidate)&&approvedTermCandidate>0?Math.min(Number(a.term_months),approvedTermCandidate):null;
 const rateScaled=decision==="approve"?parsePercentToScaledInteger(req.body?.interestRate??"18"):null;
 const rate=rateScaled===null?null:formatScaledPercent(rateScaled,10000n);
 const approvedMinor=approvedAmount===null?null:parseMoneyToMinorUnits(approvedAmount);
 if(decision==="approve"&&(approvedMinor===null||approvedMinor<=0n||!approvedTerm||approvedTerm<1||rate===null))return res.status(400).json({error:"پارامترهای مصوبه اعتباری نامعتبر است"});
 const r=await query(`insert into lendtech_decisions(tenant_ref,application_id,decision,approved_amount,approved_term_months,interest_rate,reason,decided_by)
   values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
  [t.id,a.id,decision,approvedAmount,approvedTerm,rate,s(req.body?.reason,500)||null,actor(req)]);
 await query("update lendtech_applications set status=$1,updated_at=now() where id=$2 and tenant_ref=$3",[decision==="approve"?"committee":"rejected",a.id,t.id]);
 res.status(201).json(r.rows[0]);
}));

lendtechRouter.post("/api/lendtech/applications/:id/committee",requireAuth,requirePermission("modules:lendtech:committee"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const decision=await client.query("select * from lendtech_decisions where application_id=$1 and tenant_ref=$2 and decision='approve' order by decided_at desc limit 1 for update",[req.params.id,t.id]);
  if(!decision.rowCount){await client.query("rollback");return res.status(409).json({error:"مصوبه قابل تأیید کمیته پیدا نشد"});}
  const d=decision.rows[0];
  const existing=await client.query("select * from lendtech_facilities where decision_id=$1 and tenant_ref=$2 limit 1",[d.id,t.id]);
  if(existing.rowCount){
   await client.query("rollback");
   return res.status(200).json({facility:existing.rows[0],alreadyCreated:true});
  }
  const a=await client.query("select * from lendtech_applications where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
  if(!a.rowCount){await client.query("rollback");return res.status(404).json({error:"درخواست اعتبار پیدا نشد"});}
  const created=await client.query(`insert into lendtech_facilities(tenant_ref,application_id,decision_id,facility_no,approved_amount,available_amount)
   values($1,$2,$3,$4,$5,$5) returning *`,[t.id,a.rows[0].id,d.id,facilityNo(),d.approved_amount]);
  await client.query("update lendtech_applications set status='approved',updated_at=now() where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
  await event(client,t.id,req.params.id,null,"facility.approved",actor(req),{facilityId:created.rows[0].id,decisionId:d.id});
  await client.query("commit");
  res.status(201).json(created.rows[0]);
 }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}));

lendtechRouter.post("/api/lendtech/facilities/:id/contract",requireAuth,requirePermission("modules:lendtech:write"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const facility=await client.query("select f.*,d.interest_rate,d.approved_term_months from lendtech_facilities f join lendtech_decisions d on d.id=f.decision_id and d.application_id=f.application_id and d.tenant_ref=f.tenant_ref and d.decision='approve' where f.id=$1 and f.tenant_ref=$2 order by d.decided_at desc limit 1 for update of f",[req.params.id,t.id]);
  if(!facility.rowCount){await client.query("rollback");return res.status(404).json({error:"تسهیلات یا مصوبه معتبر پیدا نشد"});}
  const f=facility.rows[0];
  if(f.status!=="approved"){await client.query("rollback");return res.status(409).json({error:"فقط تسهیلات مصوب و پرداخت‌نشده قابل ایجاد قرارداد است"});}
  const existing=await client.query("select id,status from lendtech_contracts where facility_id=$1 and tenant_ref=$2 order by created_at desc limit 1",[f.id,t.id]);
  if(existing.rowCount){await client.query("rollback");return res.status(409).json({error:"برای این تسهیلات قبلاً قرارداد ایجاد شده است",contractId:existing.rows[0].id,status:existing.rows[0].status});}
  const created=await client.query(`insert into lendtech_contracts(tenant_ref,facility_id,contract_no,principal,interest_rate,term_months,status,signed_at)
   values($1,$2,$3,$4,$5,$6,'draft',null) returning *`,
   [t.id,f.id,contractNo(),f.approved_amount,f.interest_rate,f.approved_term_months]);
  await client.query("update lendtech_applications set status='contract_pending_signature',updated_at=now() where id=$1 and tenant_ref=$2",[f.application_id,t.id]);
  await event(client,t.id,f.application_id,created.rows[0].id,"contract.draft_created",actor(req),{facilityId:f.id});
  await client.query("commit");
  res.status(201).json(created.rows[0]);
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

lendtechRouter.post("/api/lendtech/contracts/:id/disburse",requireAuth,requirePermission("modules:lendtech:disburse"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const contract=await query("select c.id,c.status,c.principal from lendtech_contracts c where c.id=$1 and c.tenant_ref=$2",[req.params.id,t.id]);
 if(!contract.rowCount)return res.status(404).json({error:"قرارداد پیدا نشد"});
 if(contract.rows[0].status!=="signed")return res.status(409).json({error:"قرارداد تا زمان ثبت و تأیید امضای معتبر قابل پرداخت نیست"});
 return res.status(503).json({error:"اتصال تأییدشده به سرویس انتقال وجه تسهیلات هنوز پیکربندی نشده است؛ هیچ وجهی منتقل و هیچ قسط یا وضعیت پرداختی ثبت نشد."});
}));

lendtechRouter.get("/api/lendtech/contracts/:id/installments",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select i.* from lendtech_installments i join lendtech_contracts c on c.id=i.contract_id and c.tenant_ref=i.tenant_ref where i.contract_id=$1 and i.tenant_ref=$2 and c.tenant_ref=$2 order by i.installment_no",[req.params.id,t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechRouter.post("/api/lendtech/contracts/:id/repay",requireAuth,requirePermission("modules:lendtech:repay"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const amount=parseMoneyToMinorUnits(req.body?.amount),paymentRef=s(req.body?.paymentRef,160)||("PAY-"+Date.now());
 if(amount===null||amount<=0n)return res.status(400).json({error:"مبلغ بازپرداخت نامعتبر است؛ حداکثر دو رقم اعشار مجاز است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const c=await client.query("select * from lendtech_contracts where id=$1 and tenant_ref=$2 for update",[req.params.id,t.id]);
  if(!c.rowCount){await client.query("rollback");return res.status(404).json({error:"قرارداد پیدا نشد"});}
  const duplicate=await client.query("select id from lendtech_repayments where tenant_ref=$1 and payment_ref=$2",[t.id,paymentRef]);
  if(duplicate.rowCount){await client.query("rollback");return res.status(409).json({error:"مرجع پرداخت تکراری است"});}
  let remaining=amount;
  if(!["active","delinquent"].includes(c.rows[0].status)){
   await client.query("rollback");
   return res.status(409).json({error:"بازپرداخت فقط برای قرارداد فعال یا دارای معوقه مجاز است"});
  }
  const outstanding=await client.query(`select coalesce(sum(greatest(total_due-principal_paid-interest_paid,0)),0)::text as amount
   from lendtech_installments where contract_id=$1 and tenant_ref=$2 and status<>'paid'`,[req.params.id,t.id]);
  const outstandingMinor=parseMoneyToMinorUnits(outstanding.rows[0].amount);
  if(outstandingMinor===null||amount>outstandingMinor){
   await client.query("rollback");
   return res.status(409).json({error:"مبلغ پرداخت از مانده قابل پرداخت قرارداد بیشتر است؛ پرداخت مازاد باید جداگانه تطبیق و ثبت شود",outstanding:outstanding.rows[0].amount});
  }
  const installments=await client.query("select * from lendtech_installments where contract_id=$1 and tenant_ref=$2 and status<>'paid' order by due_date,installment_no for update",[req.params.id,t.id]);
  const allocation:any[]=[];
  for(const i of installments.rows){
   if(remaining<=0n)break;
   const interestDue=parseMoneyToMinorUnits(i.interest_due),interestAlreadyPaid=parseMoneyToMinorUnits(i.interest_paid);
   const principalDue=parseMoneyToMinorUnits(i.principal_due),principalAlreadyPaid=parseMoneyToMinorUnits(i.principal_paid);
   if(interestDue===null||interestAlreadyPaid===null||principalDue===null||principalAlreadyPaid===null)throw new Error("مقادیر مالی قسط با قالب ذخیره‌شده سازگار نیست");
   const interestOutstanding=interestDue>interestAlreadyPaid?interestDue-interestAlreadyPaid:0n;
   const principalOutstanding=principalDue>principalAlreadyPaid?principalDue-principalAlreadyPaid:0n;
   const interestPaid=remaining<interestOutstanding?remaining:interestOutstanding;remaining-=interestPaid;
   const principalPaid=remaining<principalOutstanding?remaining:principalOutstanding;remaining-=principalPaid;
   const newInterest=interestAlreadyPaid+interestPaid,newPrincipal=principalAlreadyPaid+principalPaid;
   const paid=newInterest>=interestDue&&newPrincipal>=principalDue;
   await client.query(`update lendtech_installments set interest_paid=$1,principal_paid=$2,status=$3,paid_at=case when $3='paid' then now() else paid_at end where id=$4 and tenant_ref=$5`,
    [formatMinorUnits(newInterest),formatMinorUnits(newPrincipal),paid?"paid":"partial",i.id,t.id]);
   allocation.push({installmentId:i.id,interestPaid:formatMinorUnits(interestPaid),principalPaid:formatMinorUnits(principalPaid)});
  }
  const applied=amount-remaining;
  if(applied<=0n){await client.query("rollback");return res.status(409).json({error:"مانده قابل پرداختی برای این قرارداد وجود ندارد"});}
  const r=await client.query("insert into lendtech_repayments(tenant_ref,contract_id,payment_ref,amount,method,allocation,created_by) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,req.params.id,paymentRef,formatMinorUnits(applied),s(req.body?.method,50)||null,JSON.stringify(allocation),actor(req)]);
  const open=await client.query("select count(*)::int as count from lendtech_installments where contract_id=$1 and tenant_ref=$2 and status<>'paid'",[req.params.id,t.id]);
  if(Number(open.rows[0].count)===0)await client.query("update lendtech_contracts set status='closed',closed_at=now(),updated_at=now() where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
  await event(client,t.id,null,String(req.params.id),"repayment.received",actor(req),{paymentRef,amount:formatMinorUnits(applied),unallocated:formatMinorUnits(remaining)});
  await client.query("commit");
  res.status(201).json({repayment:r.rows[0],unallocated:formatMinorUnits(remaining)});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

lendtechRouter.post("/api/lendtech/contracts/:id/delinquency/refresh",requireAuth,requirePermission("modules:lendtech:collect"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const overdue=await query(`select i.* from lendtech_installments i join lendtech_contracts c on c.id=i.contract_id and c.tenant_ref=i.tenant_ref where i.contract_id=$1 and i.tenant_ref=$2 and c.tenant_ref=$2 and i.due_date<current_date and i.status<>'paid' order by i.due_date`,[req.params.id,t.id]);
 const items=[];
 for(const i of overdue.rows){
  const days=Math.max(1,Math.floor((Date.now()-new Date(i.due_date).getTime())/86400000));
  const totalDue=parseMoneyToMinorUnits(i.total_due),principalPaid=parseMoneyToMinorUnits(i.principal_paid),interestPaid=parseMoneyToMinorUnits(i.interest_paid);
  if(totalDue===null||principalPaid===null||interestPaid===null)throw new Error("مقادیر مالی قسط با قالب ذخیره‌شده سازگار نیست");
  const rawAmount=totalDue-principalPaid-interestPaid,amount=rawAmount>0n?rawAmount:0n;
  const r=await query(`insert into lendtech_delinquencies(tenant_ref,contract_id,installment_id,days_overdue,amount_due)
    values($1,$2,$3,$4,$5)
    on conflict do nothing returning *`,[t.id,req.params.id,i.id,days,formatMinorUnits(amount)]);
  if(r.rowCount)items.push(r.rows[0]);
 }
 await query("update lendtech_contracts set status='delinquent',updated_at=now() where id=$1 and tenant_ref=$2 and status='active' and exists(select 1 from lendtech_delinquencies d where d.contract_id=$1 and d.tenant_ref=$2 and d.status='open')",[req.params.id,t.id]);
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
    coalesce(sum(greatest(principal_due-principal_paid,0)),0)::text as principal,
    coalesce(sum(greatest(interest_due-interest_paid,0)),0)::text as interest
    from lendtech_installments where contract_id=$1 and tenant_ref=$2 and status<>'paid'`,[contract.id,t.id]);
  const remainingPrincipal=parseMoneyToMinorUnits(outstanding.rows[0].principal);
  const remainingInterest=parseMoneyToMinorUnits(outstanding.rows[0].interest);
  const openDelinquencies=await client.query("select count(*)::int as count,coalesce(sum(amount_due),0)::text as amount from lendtech_delinquencies where contract_id=$1 and tenant_ref=$2 and status='open'",[contract.id,t.id]);
  const openDelinquencyAmount=parseMoneyToMinorUnits(openDelinquencies.rows[0].amount);
  if(remainingPrincipal===null||remainingPrincipal<=0n){await client.query("rollback");return res.status(409).json({error:"مانده اصلی قرارداد برای بازسازی وجود ندارد"});}
  if(remainingInterest===null||remainingInterest>0n||openDelinquencyAmount===null||openDelinquencyAmount>0n){
   await client.query("rollback");
   return res.status(409).json({error:"بازسازی تا تعیین تکلیف سود پرداخت‌نشده و معوقات باز مجاز نیست؛ هیچ مبلغی بخشوده یا از دفتر حساب حذف نشد.",unpaidInterest:outstanding.rows[0].interest,openDelinquencyAmount:openDelinquencies.rows[0].amount});
  }
  const lastPaid=await client.query("select coalesce(max(installment_no),0)::int as value from lendtech_installments where contract_id=$1 and tenant_ref=$2 and status='paid'",[contract.id,t.id]);
  const installmentOffset=Number(lastPaid.rows[0].value);
  const months=Number(term);
  const schedule=buildAmortizationSchedule(remainingPrincipal,contract.interest_rate,months);
  await client.query("delete from lendtech_installments where contract_id=$1 and tenant_ref=$2 and status<>'paid'",[contract.id,t.id]);
  const startDate=new Date();
  for(let i=1;i<=schedule.rows.length;i++){
   const due=addMonthsClamped(startDate,i);
   const row=schedule.rows[i-1];
   await client.query(`insert into lendtech_installments(tenant_ref,contract_id,installment_no,due_date,principal_due,interest_due,total_due)
     values($1,$2,$3,$4,$5,$6,$7)`,
    [t.id,contract.id,installmentOffset+i,due.toISOString().slice(0,10),formatMinorUnits(row.principalDue),formatMinorUnits(row.interestDue),formatMinorUnits(row.totalDue)]);
  }
  const totalTerm=installmentOffset+months;
  const r=await client.query("insert into lendtech_restructures(tenant_ref,contract_id,old_term_months,new_term_months,reason,created_by) values($1,$2,$3,$4,$5,$6) returning *",[t.id,contract.id,contract.term_months,totalTerm,reason,actor(req)]);
  await client.query("update lendtech_contracts set term_months=$1,status='active',updated_at=now() where id=$2 and tenant_ref=$3",[totalTerm,contract.id,t.id]);
  await event(client,t.id,null,contract.id,"contract.restructured",actor(req),{oldTermMonths:contract.term_months,newTermMonths:term,remainingPrincipal:formatMinorUnits(remainingPrincipal)});
  await client.query("commit");
  res.status(201).json({restructure:r.rows[0],remainingPrincipal:formatMinorUnits(remainingPrincipal),newTermMonths:term});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

lendtechRouter.get("/api/lendtech/my-facilities",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);
 if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query(`select f.id,f.facility_no,f.approved_amount,f.available_amount,f.status,f.currency,f.created_at,
   a.customer_ref,a.product_code,
   d.approved_term_months,d.interest_rate
   from lendtech_facilities f
   join lendtech_applications a on a.id=f.application_id and a.tenant_ref=f.tenant_ref
   left join lateral (select approved_term_months,interest_rate from lendtech_decisions where application_id=a.id and tenant_ref=f.tenant_ref and decision='approve' order by decided_at desc limit 1)d on true
   where f.tenant_ref=$1 and f.status='active' and f.available_amount>0
   order by f.created_at desc`,[t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechRouter.get("/api/lendtech/facilities/:id/collaterals",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select c.* from lendtech_collaterals c join lendtech_facilities f on f.id=c.facility_id and f.tenant_ref=c.tenant_ref where c.facility_id=$1 and c.tenant_ref=$2 and f.tenant_ref=$2 order by c.created_at desc",[req.params.id,t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));
lendtechRouter.post("/api/lendtech/facilities/:id/collaterals",requireAuth,requirePermission("modules:lendtech:write"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const type=s(req.body?.collateralType,80),owner=s(req.body?.ownerRef,160),description=s(req.body?.description,500);
 const value=parseMoneyToMinorUnits(req.body?.declaredValue);
 const verifiedRaw=req.body?.verifiedValue;
 const verifiedValue=verifiedRaw===undefined||verifiedRaw===null||verifiedRaw===""?null:parseMoneyToMinorUnits(verifiedRaw);
 if(!type||value===null||value<0n||(verifiedRaw!==undefined&&verifiedRaw!==null&&verifiedRaw!==""&&(verifiedValue===null||verifiedValue<0n)))return res.status(400).json({error:"نوع و ارزش وثیقه معتبر نیست؛ حداکثر دو رقم اعشار مجاز است"});
 const exists=await query("select id from lendtech_facilities where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
 if(!exists.rowCount)return res.status(404).json({error:"تسهیلات پیدا نشد"});
 const no="COL-"+Date.now()+"-"+randomUUID().slice(0,6).toUpperCase();
 const r=await query("insert into lendtech_collaterals(tenant_ref,facility_id,collateral_no,collateral_type,owner_ref,description,declared_value,verified_value,status,reference_data,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,'proposed',$9,$10) returning *",[t.id,req.params.id,no,type,owner||null,description||null,formatMinorUnits(value),verifiedValue===null?null:formatMinorUnits(verifiedValue),JSON.stringify(req.body?.referenceData||{}),actor(req)]);
 res.status(201).json(r.rows[0]);
}));
lendtechRouter.post("/api/lendtech/collaterals/:id/verify",requireAuth,requirePermission("modules:lendtech:committee"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const raw=req.body?.verifiedValue;
 const value=raw===undefined||raw===null||raw===""?null:parseMoneyToMinorUnits(raw);
 if(raw!==undefined&&raw!==null&&raw!==""&&(value===null||value<0n))return res.status(400).json({error:"ارزش تأییدشده وثیقه معتبر نیست؛ حداکثر دو رقم اعشار مجاز است"});
 const r=await query("update lendtech_collaterals set status='verified',verified_value=coalesce($1,verified_value),updated_at=now() where id=$2 and tenant_ref=$3 and exists(select 1 from lendtech_facilities f where f.id=lendtech_collaterals.facility_id and f.tenant_ref=lendtech_collaterals.tenant_ref) returning *",[value===null?null:formatMinorUnits(value),req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"وثیقه پیدا نشد"});
 res.json(r.rows[0]);
}));
lendtechRouter.post("/api/lendtech/contracts/:id/collection-case",requireAuth,requirePermission("modules:lendtech:collect"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const d=await query("select d.id,d.amount_due,d.days_overdue from lendtech_delinquencies d join lendtech_contracts c on c.id=d.contract_id and c.tenant_ref=d.tenant_ref where d.contract_id=$1 and d.tenant_ref=$2 and c.tenant_ref=$2 and d.status='open' order by d.days_overdue desc limit 1",[req.params.id,t.id]);
 if(!d.rowCount)return res.status(409).json({error:"برای این قرارداد پرونده معوق باز وجود ندارد"});
 const no="COLL-"+Date.now()+"-"+randomUUID().slice(0,6).toUpperCase();
 const r=await query("insert into lendtech_collection_cases(tenant_ref,contract_id,delinquency_id,case_no,stage,status,assigned_to,next_action_at,notes,created_by) values($1,$2,$3,$4,$5,'open',$6,$7,$8,$9) returning *",[t.id,req.params.id,d.rows[0].id,no,Number(d.rows[0].days_overdue)>90?"legal":Number(d.rows[0].days_overdue)>30?"intensive":"early",s(req.body?.assignedTo,160)||null,req.body?.nextActionAt||null,s(req.body?.notes,1000)||null,actor(req)]);
 res.status(201).json(r.rows[0]);
}));
lendtechRouter.get("/api/lendtech/contracts/:id/collection-cases",requireAuth,requirePermission("modules:lendtech:collect"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select cc.* from lendtech_collection_cases cc join lendtech_contracts c on c.id=cc.contract_id and c.tenant_ref=cc.tenant_ref where cc.contract_id=$1 and cc.tenant_ref=$2 and c.tenant_ref=$2 order by cc.created_at desc",[req.params.id,t.id]);
 res.json({items:r.rows,total:r.rowCount});
}));
lendtechRouter.post("/api/lendtech/collection-cases/:id/promise",requireAuth,requirePermission("modules:lendtech:collect"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const amount=parseMoneyToMinorUnits(req.body?.promiseAmount),due=s(req.body?.promiseDueDate,20),notes=s(req.body?.notes,1000);
 if(amount===null||amount<=0n||!due)return res.status(400).json({error:"مبلغ و تاریخ وعده پرداخت الزامی است؛ حداکثر دو رقم اعشار مجاز است"});
 const r=await query("update lendtech_collection_cases set promise_amount=$1,promise_due_date=$2,notes=coalesce($3,notes),status='promise',updated_at=now() where id=$4 and tenant_ref=$5 and exists(select 1 from lendtech_contracts c where c.id=lendtech_collection_cases.contract_id and c.tenant_ref=lendtech_collection_cases.tenant_ref) returning *",[formatMinorUnits(amount),due,notes||null,req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"پرونده وصول پیدا نشد"});
 res.json(r.rows[0]);
}));
lendtechRouter.post("/api/lendtech/collection-cases/:id/resolve",requireAuth,requirePermission("modules:lendtech:collect"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);
 if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("update lendtech_collection_cases set status='resolved',updated_at=now(),notes=coalesce($1,notes) where id=$2 and tenant_ref=$3 and exists(select 1 from lendtech_contracts c where c.id=lendtech_collection_cases.contract_id and c.tenant_ref=lendtech_collection_cases.tenant_ref) returning *",[s(req.body?.notes,1000)||null,req.params.id,t.id]);
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
