import {Router} from "express";
import {createHash,randomUUID} from "node:crypto";
import {pool,query} from "./db.js";
import {requireAuth,requireCsrf,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";
import {decodeIdentityDocument,safeDocumentFileName} from "./identity-document-file.js";
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
 if(amount===null||amount<=0n||amount>1000000000000n||months===null||intervalDays===null||
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


lendtechRouter.get("/api/lendtech/inquiry-requests",requireAuth,requirePermission("verification:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=s(req.query.status,30);
 const params:any[]=[t.id];
 let where="v.tenant_id=$1 and v.provider_code='manual-review' and v.subject_type='lendtech_application'";
 if(status){params.push(status);where+=" and v.status=$2";}
 const r=await query(`select v.*,a.application_no,a.customer_ref from platform_verification_requests v
  left join lendtech_applications a on a.id::text=v.subject_id and a.tenant_ref=v.tenant_id
  where ${where} order by v.created_at desc limit 500`,params);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechRouter.post("/api/lendtech/inquiry-requests",requireAuth,requirePermission("verification:run"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const applicationId=s(req.body?.applicationId,36),type=s(req.body?.type,20),note=s(req.body?.note,300);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId)||!["Identity","Credit","Other"].includes(type))return res.status(400).json({error:"پرونده و نوع استعلام معتبر نیست"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const application=await client.query("select id,customer_ref,application_no from lendtech_applications where id=$1 and tenant_ref=$2 for share",[applicationId,t.id]);
  if(!application.rowCount){await client.query("rollback");return res.status(404).json({error:"پرونده اعتباری متعلق به این سازمان پیدا نشد"});}
  const request=await client.query("insert into platform_verification_requests(tenant_id,subject_type,subject_id,verification_type,provider_code,correlation_id,status,request_payload,requested_by) values($1,'lendtech_application',$2,$3,'manual-review',$4,'needs_review',$5,$6) returning *",[t.id,applicationId,type,randomUUID(),JSON.stringify({note,source:"vamcity-inquiry",applicationNo:application.rows[0].application_no,customerRef:application.rows[0].customer_ref}),actor(req)]);
  await event(client,t.id,applicationId,null,"manual_inquiry_queued",actor(req),{verificationRequestId:request.rows[0].id,type});
  await client.query("commit");res.status(201).json(request.rows[0]);
 }catch(error){await client.query("rollback");throw error}finally{client.release()}
}));

lendtechRouter.post("/api/lendtech/inquiry-requests/:id/result",requireAuth,requirePermission("verification:run"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=s(req.body?.status,20),result=s(req.body?.result,300);
 if(!["Done","Failed"].includes(status)||!result)return res.status(400).json({error:"وضعیت و نتیجه بررسی الزامی است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const old=await client.query("select * from platform_verification_requests where id=$1 and tenant_id=$2 and provider_code='manual-review' and subject_type='lendtech_application' for update",[req.params.id,t.id]);
  if(!old.rowCount){await client.query("rollback");return res.status(404).json({error:"درخواست استعلام پیدا نشد"});}
  if(old.rows[0].status!=="needs_review"){await client.query("rollback");return res.status(409).json({error:"نتیجه این درخواست قبلاً ثبت شده است"});}
  const responsePayload={source:"manual-review",result,reviewedBy:actor(req),reviewedAt:new Date().toISOString(),note:s(req.body?.note,300)};
  const next=await client.query("update platform_verification_requests set status=$1,response_payload=$2,decision=$3,completed_at=now(),updated_at=now() where id=$4 and tenant_id=$5 returning *",[status==="Done"?"completed":"failed",JSON.stringify(responsePayload),status==="Done"?"manual_result_recorded":"manual_result_failed",req.params.id,t.id]);
  await event(client,t.id,old.rows[0].subject_id,null,"manual_inquiry_result_recorded",actor(req),{verificationRequestId:req.params.id,status});
  await client.query("commit");res.json({request:next.rows[0],kycUpdated:false,creditDecisionUpdated:false});
 }catch(error){await client.query("rollback");throw error}finally{client.release()}
}));

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
  await event(client,t.id,a.rows[0].id,null,"facility.approved",actor(req),{facilityId:created.rows[0].id,decisionId:d.id});
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


class RepaymentFault extends Error { constructor(public status:number,message:string,public details:any={}){super(message);} }
async function applyRepayment(client:any,args:{tenantRef:string;contractId:string;amount:bigint;paymentRef:string;method:string|null;createdBy:string;paidAt?:Date}){
 const {tenantRef,contractId,amount,paymentRef,method,createdBy,paidAt}=args;
 const c=await client.query("select * from lendtech_contracts where id=$1 and tenant_ref=$2 for update",[contractId,tenantRef]);
 if(!c.rowCount)throw new RepaymentFault(404,"قرارداد پیدا نشد");
 const duplicate=await client.query("select id from lendtech_repayments where tenant_ref=$1 and payment_ref=$2",[tenantRef,paymentRef]);
 if(duplicate.rowCount)throw new RepaymentFault(409,"مرجع پرداخت تکراری است");
 if(!["active","delinquent"].includes(c.rows[0].status))throw new RepaymentFault(409,"بازپرداخت فقط برای قرارداد فعال یا دارای معوقه مجاز است");
 const outstanding=await client.query("select coalesce(sum(greatest(total_due-principal_paid-interest_paid,0)),0)::text as amount from lendtech_installments where contract_id=$1 and tenant_ref=$2 and status<>'paid'",[contractId,tenantRef]);
 const outstandingMinor=parseMoneyToMinorUnits(outstanding.rows[0].amount);
 if(outstandingMinor===null||amount>outstandingMinor)throw new RepaymentFault(409,"مبلغ پرداخت از مانده قابل پرداخت قرارداد بیشتر است؛ پرداخت مازاد باید جداگانه تطبیق و ثبت شود",{outstanding:outstanding.rows[0].amount});
 let remaining=amount;
 const installments=await client.query("select * from lendtech_installments where contract_id=$1 and tenant_ref=$2 and status<>'paid' order by due_date,installment_no for update",[contractId,tenantRef]);
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
  await client.query("update lendtech_installments set interest_paid=$1,principal_paid=$2,status=$3,paid_at=case when $3='paid' then now() else paid_at end where id=$4 and tenant_ref=$5",
   [formatMinorUnits(newInterest),formatMinorUnits(newPrincipal),paid?"paid":"partial",i.id,tenantRef]);
  allocation.push({installmentId:i.id,interestPaid:formatMinorUnits(interestPaid),principalPaid:formatMinorUnits(principalPaid)});
 }
 const applied=amount-remaining;
 if(applied<=0n)throw new RepaymentFault(409,"مانده قابل پرداختی برای این قرارداد وجود ندارد");
 const r=await client.query("insert into lendtech_repayments(tenant_ref,contract_id,payment_ref,amount,paid_at,method,allocation,created_by) values($1,$2,$3,$4,coalesce($5,now()),$6,$7,$8) returning *",
  [tenantRef,contractId,paymentRef,formatMinorUnits(applied),paidAt||null,method,JSON.stringify(allocation),createdBy]);
 const open=await client.query("select count(*)::int as count from lendtech_installments where contract_id=$1 and tenant_ref=$2 and status<>'paid'",[contractId,tenantRef]);
 if(Number(open.rows[0].count)===0)await client.query("update lendtech_contracts set status='closed',closed_at=now(),updated_at=now() where id=$1 and tenant_ref=$2",[contractId,tenantRef]);
 await event(client,tenantRef,null,contractId,"repayment.received",createdBy,{paymentRef,amount:formatMinorUnits(applied),unallocated:formatMinorUnits(remaining)});
 return {repayment:r.rows[0],unallocated:formatMinorUnits(remaining)};
}

lendtechRouter.get("/api/lendtech/my-contracts",requireAuth,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query(`select c.id,c.contract_no,c.principal,c.interest_rate,c.term_months,c.status,
  coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'installmentNo',i.installment_no,'dueDate',i.due_date,'totalDue',i.total_due,'principalPaid',i.principal_paid,'interestPaid',i.interest_paid,'status',i.status) order by i.installment_no) from lendtech_installments i where i.contract_id=c.id and i.tenant_ref=c.tenant_ref),'[]'::jsonb) as installments
  from lendtech_contracts c join lendtech_facilities f on f.id=c.facility_id and f.tenant_ref=c.tenant_ref join lendtech_applications a on a.id=f.application_id and a.tenant_ref=f.tenant_ref
  where c.tenant_ref=$1 and a.customer_ref=$2 and c.status in ('active','delinquent') order by c.created_at desc limit 100`,[t.id,actor(req)]);
 res.json({items:r.rows,total:r.rowCount});
}));
lendtechRouter.get("/api/lendtech/my-payment-declarations",requireAuth,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select d.id,d.contract_id,d.amount,d.method,d.payment_ref,d.paid_at,d.status,d.review_note,d.created_at,d.reviewed_at from lendtech_payment_declarations d where d.tenant_ref=$1 and d.user_ref=$2 order by d.created_at desc limit 100",[t.id,actor(req)]);
 res.json({items:r.rows,total:r.rowCount});
}));
lendtechRouter.post("/api/lendtech/my-payment-declarations",requireAuth,requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const amountInput=String(req.body?.amount??"").replace(/[۰-۹]/g,ch=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(ch))).replace(/[٠-٩]/g,ch=>String("٠١٢٣٤٥٦٧٨٩".indexOf(ch))).replace(/[٬,\s]/g,"").replace(/٫/g,"."),amount=parseMoneyToMinorUnits(amountInput),method=s(req.body?.method,30),paymentRef=s(req.body?.reference,60).replace(/[۰-۹]/g,ch=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(ch))).replace(/[٠-٩]/g,ch=>String("٠١٢٣٤٥٦٧٨٩".indexOf(ch))).replace(/\D/g,"");
 const paidAtValue=s(req.body?.paidAt,40),paidAt=paidAtValue?new Date(paidAtValue):new Date();
 const contractId=s(req.body?.contractId,80),note=s(req.body?.note,300);
 if(amount===null||amount<=0n||amount>100000000000000000n)return res.status(400).json({error:"مبلغ اعلام واریز معتبر نیست"});
 if(!["CardToCard","BankTransfer"].includes(method))return res.status(400).json({error:"روش پرداخت نامعتبر است"});
 if(paymentRef.length<4||paymentRef.length>30)return res.status(400).json({error:"شماره پیگیری باید بین ۴ تا ۳۰ رقم باشد"});
 if(Number.isNaN(paidAt.getTime())||paidAt.getTime()>Date.now()+86400000||paidAt.getTime()<Date.now()-366*86400000)return res.status(400).json({error:"تاریخ پرداخت نامعتبر است"});
 if(!contractId)return res.status(400).json({error:"شناسه قرارداد مرکزی الزامی است"});
 const owns=await query("select c.id from lendtech_contracts c join lendtech_facilities f on f.id=c.facility_id and f.tenant_ref=c.tenant_ref join lendtech_applications a on a.id=f.application_id and a.tenant_ref=f.tenant_ref where c.id=$1 and c.tenant_ref=$2 and c.status in ('active','delinquent') and a.customer_ref=$3",[contractId,t.id,actor(req)]);
 if(!owns.rowCount)return res.status(404).json({error:"قرارداد متعلق به حساب کاربری جاری پیدا نشد"});
 const pending=await query("select count(*)::int as count from lendtech_payment_declarations where tenant_ref=$1 and user_ref=$2 and status='pending'",[t.id,actor(req)]);
 if(Number(pending.rows[0].count)>=10)return res.status(429).json({error:"ابتدا منتظر بررسی اعلام واریزهای قبلی بمانید"});
 const r=await query("insert into lendtech_payment_declarations(tenant_ref,user_ref,contract_id,amount,method,payment_ref,paid_at,note) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing returning id,status",
  [t.id,actor(req),contractId,formatMinorUnits(amount),method,paymentRef,paidAt,note||null]);
 if(!r.rowCount)return res.status(409).json({error:"این شماره پیگیری و مبلغ قبلاً برای این سازمان ثبت شده است"});
 res.status(201).json(r.rows[0]);
}));
lendtechRouter.get("/api/lendtech/payment-declarations",requireAuth,requirePermission("modules:lendtech:repay"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=s(req.query.status,20),params:any[]=[t.id];let where="d.tenant_ref=$1";
 if(status){params.push(status);where+=" and d.status=$2";}
 const r=await query("select d.*,c.contract_no,a.customer_ref from lendtech_payment_declarations d join lendtech_contracts c on c.id=d.contract_id and c.tenant_ref=d.tenant_ref join lendtech_facilities f on f.id=c.facility_id and f.tenant_ref=c.tenant_ref join lendtech_applications a on a.id=f.application_id and a.tenant_ref=f.tenant_ref where "+where+" order by d.created_at desc limit 500",params);
 res.json({items:r.rows,total:r.rowCount});
}));
lendtechRouter.post("/api/lendtech/payment-declarations/:id/review",requireAuth,requirePermission("modules:lendtech:repay"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const decision=s(req.body?.status,20),reviewNote=s(req.body?.note,500);
 if(!["approved","rejected"].includes(decision))return res.status(400).json({error:"وضعیت بررسی نامعتبر است"});
 if(decision==="rejected"&&!reviewNote)return res.status(400).json({error:"برای رد اعلام واریز، دلیل بررسی الزامی است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const d=await client.query("select * from lendtech_payment_declarations where id=$1 and tenant_ref=$2 for update",[req.params.id,t.id]);
  if(!d.rowCount){await client.query("rollback");return res.status(404).json({error:"اعلام واریز پیدا نشد"});}
  if(d.rows[0].status!=="pending"){await client.query("rollback");return res.status(409).json({error:"این اعلام واریز قبلاً بررسی شده است"});}
  if(d.rows[0].user_ref===actor(req)){await client.query("rollback");return res.status(403).json({error:"امکان بررسی اعلام واریز خودتان وجود ندارد"});}
  if(decision==="rejected"){
   const r=await client.query("update lendtech_payment_declarations set status='rejected',review_note=$1,reviewed_by=$2,reviewed_at=now(),updated_at=now() where id=$3 and tenant_ref=$4 returning id,status,review_note",[reviewNote,actor(req),req.params.id,t.id]);
   await event(client,t.id,null,d.rows[0].contract_id,"payment_declaration.rejected",actor(req),{declarationId:req.params.id});
   await client.query("commit");return res.json(r.rows[0]);
  }
  const ownership=await client.query("select 1 from lendtech_contracts c join lendtech_facilities f on f.id=c.facility_id and f.tenant_ref=c.tenant_ref join lendtech_applications a on a.id=f.application_id and a.tenant_ref=f.tenant_ref where c.id=$1 and c.tenant_ref=$2 and a.customer_ref=$3",[d.rows[0].contract_id,t.id,d.rows[0].user_ref]);
  if(!ownership.rowCount)throw new RepaymentFault(409,"ارتباط مشتری اعلام‌کننده با قرارداد قابل تأیید نیست");
  const amount=parseMoneyToMinorUnits(d.rows[0].amount);if(amount===null||amount<=0n)throw new Error("مبلغ اعلام واریز در پایگاه داده معتبر نیست");
  const payment=await applyRepayment(client,{tenantRef:t.id,contractId:d.rows[0].contract_id,amount,paymentRef:"DECL-"+String(d.rows[0].id),method:d.rows[0].method,createdBy:actor(req),paidAt:new Date(d.rows[0].paid_at)});
  const r=await client.query("update lendtech_payment_declarations set status='approved',review_note=$1,reviewed_by=$2,reviewed_at=now(),repayment_id=$3,updated_at=now() where id=$4 and tenant_ref=$5 returning id,status,repayment_id",[reviewNote||null,actor(req),payment.repayment.id,req.params.id,t.id]);
  await event(client,t.id,null,d.rows[0].contract_id,"payment_declaration.approved",actor(req),{declarationId:req.params.id,repaymentId:payment.repayment.id});
  await client.query("commit");return res.json({declaration:r.rows[0],repayment:payment.repayment,unallocated:payment.unallocated});
 }catch(e){
  await client.query("rollback");
  if(e instanceof RepaymentFault)return res.status(e.status).json({error:e.message,...e.details});
  throw e;
 }finally{client.release();}
}));

lendtechRouter.post("/api/lendtech/contracts/:id/repay",requireAuth,requirePermission("modules:lendtech:repay"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const amount=parseMoneyToMinorUnits(req.body?.amount),paymentRef=s(req.body?.paymentRef,160)||("PAY-"+Date.now());
 if(amount===null||amount<=0n)return res.status(400).json({error:"مبلغ بازپرداخت نامعتبر است؛ حداکثر دو رقم اعشار مجاز است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const result=await applyRepayment(client,{tenantRef:t.id,contractId:String(req.params.id),amount,paymentRef,method:s(req.body?.method,50)||null,createdBy:actor(req)});
  await client.query("commit");res.status(201).json(result);
 }catch(e){
  await client.query("rollback");
  if(e instanceof RepaymentFault)return res.status(e.status).json({error:e.message,...e.details});
  throw e;
 }finally{client.release();}
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
  if(remainingInterest===null||remainingInterest>0n||Number(openDelinquencies.rows[0].count)>0||openDelinquencyAmount===null||openDelinquencyAmount>0n){
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


// Customer-owned identity documents reuse the canonical platform attachment store.
lendtechRouter.get("/api/lendtech/my-applications",requireAuth,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select id,application_no,product_code,status,created_at from lendtech_applications where tenant_ref=$1 and customer_ref=$2 order by created_at desc limit 100",[t.id,actor(req)]);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechRouter.get("/api/lendtech/my-documents",requireAuth,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const applicationId=s(req.query.applicationId,36);
 const params:any[]=[t.id,actor(req)];
 let filter="";
 if(applicationId){params.push(applicationId);filter=" and a.id=$3";}
 const r=await query("select f.id,f.original_name,f.mime_type,f.size_bytes,f.ocr_status,f.created_at,l.title document_type,a.application_no,a.id application_id from platform_attachment_links l join platform_attachments f on f.id=l.attachment_id and f.tenant_id=l.tenant_id join lendtech_applications a on a.id::text=l.entity_id and a.tenant_ref=l.tenant_id where l.tenant_id=$1 and a.customer_ref=$2 and l.entity_type='lendtech_application' and l.relation_type='identity-document'"+filter+" order by f.created_at desc limit 200",params);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechRouter.post("/api/lendtech/my-documents",requireAuth,requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const b=req.body||{},applicationId=s(b.applicationId,36),documentType=s(b.documentType,40),documentNumber=s(b.documentNumber,60);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId))return res.status(400).json({error:"پرونده اعتباری معتبر نیست"});
 if(!["national-id-front","national-id-back","birth-certificate","passport","address-proof","other"].includes(documentType))return res.status(400).json({error:"نوع مدرک معتبر نیست"});
 const decoded=decodeIdentityDocument(b.data);
 if(!decoded)return res.status(415).json({error:"فقط PDF، JPEG، PNG یا WebP معتبر تا سقف ۸ مگابایت پذیرفته می‌شود"});
 const fileName=safeDocumentFileName(b.fileName),sha=createHash("sha256").update(decoded.bytes).digest("hex");
 const originalSize=Number(b.originalSizeBytes);
 const originalSizeBytes=Number.isSafeInteger(originalSize)&&originalSize>=decoded.bytes.length&&originalSize<=100*1024*1024?originalSize:decoded.bytes.length;
 const client=await pool.connect();
 try{
  await client.query("begin");
  const application=await client.query("select id,application_no from lendtech_applications where id=$1 and tenant_ref=$2 and customer_ref=$3 for share",[applicationId,t.id,actor(req)]);
  if(!application.rowCount){await client.query("rollback");return res.status(404).json({error:"پرونده اعتباری متعلق به حساب شما پیدا نشد"});}
  const attachment=await client.query("insert into platform_attachments(tenant_id,original_name,storage_name,mime_type,stored_mime_type,size_bytes,original_size_bytes,sha256,storage_kind,binary_data,metadata,uploaded_by) values($1,$2,$3,$4,$4,$5,$6,$7,'database',$8,$9,$10) returning id,original_name,mime_type,size_bytes,ocr_status,created_at",[t.id,fileName,randomUUID(),decoded.mimeType,decoded.bytes.length,originalSizeBytes,sha,decoded.bytes,{source:"customer-self-service",document_type:documentType,document_number:documentNumber||null},actor(req)]);
  const saved=attachment.rows[0];
  await client.query("insert into platform_attachment_links(tenant_id,attachment_id,entity_type,entity_id,relation_type,title,created_by) values($1,$2,'lendtech_application',$3,'identity-document',$4,$5)",[t.id,saved.id,applicationId,documentType,actor(req)]);
  await event(client,t.id,applicationId,null,"identity_document_uploaded",actor(req),{attachmentId:saved.id,documentType,mimeType:decoded.mimeType,sizeBytes:decoded.bytes.length});
  await client.query("commit");
  res.status(201).json({item:{...saved,document_type:documentType,application_no:application.rows[0].application_no}});
 }catch(error){await client.query("rollback");throw error}finally{client.release()}
}));

lendtechRouter.get("/api/lendtech/my-documents/:id/file",requireAuth,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select f.id,f.original_name,f.stored_mime_type,f.binary_data from platform_attachments f join platform_attachment_links l on l.attachment_id=f.id and l.tenant_id=f.tenant_id join lendtech_applications a on a.id::text=l.entity_id and a.tenant_ref=l.tenant_id where f.id=$1 and f.tenant_id=$2 and a.customer_ref=$3 and l.entity_type='lendtech_application' and l.relation_type='identity-document'",[req.params.id,t.id,actor(req)]);
 if(!r.rowCount)return res.status(404).json({error:"فایل متعلق به حساب شما پیدا نشد"});
 const f=r.rows[0];res.setHeader("Content-Type",f.stored_mime_type);res.setHeader("Content-Disposition","attachment; filename*=UTF-8''"+encodeURIComponent(f.original_name));res.send(f.binary_data);
}));

lendtechRouter.get("/api/lendtech/applications/:id/documents",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const app=await query("select id from lendtech_applications where id=$1 and tenant_ref=$2",[req.params.id,t.id]);
 if(!app.rowCount)return res.status(404).json({error:"پرونده پیدا نشد"});
 const r=await query("select f.id,f.original_name,f.mime_type,f.size_bytes,f.ocr_status,f.created_at,l.title document_type from platform_attachment_links l join platform_attachments f on f.id=l.attachment_id and f.tenant_id=l.tenant_id where l.tenant_id=$1 and l.entity_type='lendtech_application' and l.entity_id=$2 and l.relation_type='identity-document' order by f.created_at desc",[t.id,String(req.params.id)]);
 res.json({items:r.rows,total:r.rowCount});
}));

lendtechRouter.get("/api/lendtech/application-documents/:id/file",requireAuth,requirePermission("modules:lendtech:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select f.original_name,f.stored_mime_type,f.binary_data from platform_attachments f join platform_attachment_links l on l.attachment_id=f.id and l.tenant_id=f.tenant_id join lendtech_applications a on a.id::text=l.entity_id and a.tenant_ref=l.tenant_id where f.id=$1 and f.tenant_id=$2 and l.entity_type='lendtech_application' and l.relation_type='identity-document'",[req.params.id,t.id]);
 if(!r.rowCount)return res.status(404).json({error:"فایل پرونده پیدا نشد"});
 const f=r.rows[0];res.setHeader("Content-Type",f.stored_mime_type);res.setHeader("Content-Disposition","attachment; filename*=UTF-8''"+encodeURIComponent(f.original_name));res.send(f.binary_data);
}));
