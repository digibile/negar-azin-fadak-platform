import {Router,type Request,type Response} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission,requireCsrf} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";

const router=Router();
const tenantOf=async(req:Request)=>resolveTenant(req,(req as any).user);
const deny=(res:Response,status:number,error:string)=>res.status(status).json({error});
const validDate=(v:unknown)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const allowedStatuses=[
 "registered","awaiting_collection","deposited","assigned","issued","in_transit",
 "collected","returned","protested","refunded","cancelled","settled"
] as const;

const audit=async(tenantId:string,userId:string,checkId:string,fromStatus:string|null,toStatus:string,eventType:string,reason:string|null)=>{
 await query(
  "insert into treasury_check_events(tenant_id,check_id,from_status,to_status,event_type,reason,actor_user_id) values($1,$2,$3,$4,$5,$6,$7)",
  [tenantId,checkId,fromStatus,toStatus,eventType,reason,userId]
 );
};

router.get("/api/treasury-checks/overview",requireAuth,async(req,res)=>{
 const t=await tenantOf(req); if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const [checks,events,parties,partyBankAccounts]=await Promise.all([
  query("select c.*,b.bank_name as linked_bank_name,p.title as canonical_counterparty_title,p.party_code as canonical_counterparty_code,pba.bank_name as counterparty_bank_name,pba.iban as counterparty_iban from treasury_checks c left join treasury_bank_accounts b on b.id=c.bank_account_id left join accounting_parties p on p.id=c.counterparty_party_id and p.tenant_id=c.tenant_id left join accounting_party_bank_accounts pba on pba.id=c.counterparty_bank_account_id and pba.tenant_id=c.tenant_id and pba.party_id=c.counterparty_party_id where c.tenant_id=$1 order by c.due_date asc,c.created_at desc limit 500",[t.id]),
  query("select e.*,c.check_no,c.check_type from treasury_check_events e join treasury_checks c on c.id=e.check_id where e.tenant_id=$1 order by e.created_at desc limit 300",[t.id]),
  query("select id,party_code,title,party_type,national_id from accounting_parties where tenant_id=$1 and status='active' order by title",[t.id]),
  query("select id,party_id,account_title,bank_name,iban from accounting_party_bank_accounts where tenant_id=$1 and status='active' and verification_status='verified' order by bank_name,iban",[t.id])
 ]);
 res.json({checks:checks.rows,events:events.rows,parties:parties.rows,partyBankAccounts:partyBankAccounts.rows});
});

router.post("/api/treasury-checks",requireAuth,requirePermission("treasury-bank.write"),requireCsrf,async(req,res)=>{
 const t=await tenantOf(req); if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const b=req.body||{};
 const counterpartyPartyId=typeof b.counterpartyPartyId==="string"?b.counterpartyPartyId.trim():"";
 const counterpartyBankAccountId=typeof b.counterpartyBankAccountId==="string"?b.counterpartyBankAccountId.trim():"";
 const bankAccountId=typeof b.bankAccountId==="string"?b.bankAccountId.trim():"";
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(!["received","payable"].includes(b.checkType)||typeof b.checkNo!=="string"||!b.checkNo.trim()||typeof b.issuerName!=="string"||(b.checkType==="payable"&&!b.issuerName.trim())||!validDate(b.dueDate)||(b.issueDate&&!validDate(b.issueDate))||!Number.isFinite(Number(b.amount))||!(Number(b.amount)>0))
  return deny(res,400,"اطلاعات چک ناقص یا نامعتبر است");
 if(!counterpartyPartyId)return deny(res,400,"انتخاب طرف‌حساب مرکزی برای ثبت چک الزامی است");
 if(!uuid.test(counterpartyPartyId)||(counterpartyBankAccountId&&!uuid.test(counterpartyBankAccountId))||(bankAccountId&&!uuid.test(bankAccountId)))
  return deny(res,400,"شناسه مرجع انتخاب‌شده معتبر نیست");
 const initial=b.checkType==="payable"?"issued":"registered";
 const c=await pool.connect();
 try{
  await c.query("begin");
  const party=await c.query("select id,title from accounting_parties where id=$1 and tenant_id=$2 and status='active' for update",[counterpartyPartyId,t.id]);
  if(!party.rowCount){await c.query("rollback");return deny(res,404,"طرف‌حساب مرکزی پیدا نشد یا غیرفعال است")}
  if(bankAccountId){
   const ownBank=await c.query("select id from treasury_bank_accounts where id=$1 and tenant_id=$2 and status='active' for update",[bankAccountId,t.id]);
   if(!ownBank.rowCount){await c.query("rollback");return deny(res,409,"حساب بانکی سازمان پیدا نشد یا فعال نیست")}
  }
  if(counterpartyBankAccountId){
   const bank=await c.query("select id from accounting_party_bank_accounts where id=$1 and tenant_id=$2 and party_id=$3 and status='active' and verification_status='verified' for update",[counterpartyBankAccountId,t.id,counterpartyPartyId]);
   if(!bank.rowCount){await c.query("rollback");return deny(res,409,"حساب بانکی انتخاب‌شده متعلق به این طرف‌حساب نیست یا تأیید نشده است")}
  }
  const issuerName=b.checkType==="received"?party.rows[0].title:b.issuerName.trim();
  const beneficiaryName=b.checkType==="payable"?party.rows[0].title:(b.beneficiaryName||null);
  const r=await c.query(
   "insert into treasury_checks(tenant_id,check_type,check_no,series_no,bank_name,branch_name,account_no,issuer_name,beneficiary_name,issue_date,due_date,amount,currency,description,bank_account_id,counterparty_reference,created_by,status,counterparty_party_id,counterparty_bank_account_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) returning *",
   [t.id,b.checkType,b.checkNo.trim(),b.seriesNo||null,b.bankName||null,b.branchName||null,b.accountNo||null,issuerName,beneficiaryName,b.issueDate||null,b.dueDate,Number(b.amount),b.currency||"IRR",b.description||"",bankAccountId||null,b.counterpartyReference||null,(req as any).user.id,initial,counterpartyPartyId,counterpartyBankAccountId||null]
  );
  await c.query("insert into treasury_check_events(tenant_id,check_id,from_status,to_status,event_type,actor_user_id) values($1,$2,$3,$4,$5,$6)",[t.id,r.rows[0].id,null,initial,"create",(req as any).user.id]);
  await c.query("commit");
  res.status(201).json(r.rows[0]);
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
});

router.patch("/api/treasury-checks/:id/status",requireAuth,requirePermission("treasury-bank.write"),requireCsrf,async(req,res)=>{
 const t=await tenantOf(req); if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const next=req.body?.status as string, reason=typeof req.body?.reason==="string"?req.body.reason:null;
 if(!allowedStatuses.includes(next as any))return deny(res,400,"وضعیت چک نامعتبر است");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const locked=await c.query("select * from treasury_checks where id=$1 and tenant_id=$2 for update",[String(req.params.id),t.id]);
  if(!locked.rowCount){await c.query("rollback");return deny(res,404,"چک پیدا نشد");}
  const old=locked.rows[0];
  const current=old.status as string;
  const flow:Record<string,string[]>={
   registered:["awaiting_collection","deposited","assigned","returned","cancelled"],
   awaiting_collection:["deposited","assigned","collected","returned","cancelled"],
   deposited:["collected","returned","awaiting_collection"],
   assigned:["collected","returned","awaiting_collection"],
   issued:["in_transit","collected","returned","cancelled"],
   in_transit:["collected","returned","cancelled"],
   returned:["protested","refunded","settled"],
   protested:["settled","refunded"],
   collected:["settled"],
   refunded:[],cancelled:[],settled:[]
  };
  if(!flow[current]?.includes(next)){await c.query("rollback");return deny(res,409,"تغییر وضعیت از مرحله فعلی مجاز نیست");}
  const r=await c.query("update treasury_checks set status=$1,updated_at=now(),settled_at=case when $1='settled' then now() else settled_at end where id=$2 and tenant_id=$3 returning *",[next,String(req.params.id),t.id]);
  await c.query("insert into treasury_check_events(tenant_id,check_id,from_status,to_status,event_type,reason,actor_user_id) values($1,$2,$3,$4,$5,$6,$7)",[t.id,String(req.params.id),current,next,"status_change",reason,(req as any).user.id]);
  await c.query("commit");
  res.json(r.rows[0]);
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
});

export {router as treasuryChecksRouter};
