import {Router,type Request,type Response} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
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
 const [checks,events]=await Promise.all([
  query("select c.*,b.bank_name as linked_bank_name from treasury_checks c left join treasury_bank_accounts b on b.id=c.bank_account_id where c.tenant_id=$1 order by c.due_date asc,c.created_at desc limit 500",[t.id]),
  query("select e.*,c.check_no,c.check_type from treasury_check_events e join treasury_checks c on c.id=e.check_id where e.tenant_id=$1 order by e.created_at desc limit 300",[t.id])
 ]);
 res.json({checks:checks.rows,events:events.rows});
});

router.post("/api/treasury-checks",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req); if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const b=req.body||{};
 if(!["received","payable"].includes(b.checkType)||typeof b.checkNo!=="string"||typeof b.issuerName!=="string"||!validDate(b.dueDate)||!(Number(b.amount)>0))
  return deny(res,400,"اطلاعات چک ناقص یا نامعتبر است");
 const initial=b.checkType==="payable"?"issued":"registered";
 const c=await pool.connect();
 try{
  await c.query("begin");
  const r=await c.query(
   "insert into treasury_checks(tenant_id,check_type,check_no,series_no,bank_name,branch_name,account_no,issuer_name,beneficiary_name,issue_date,due_date,amount,currency,description,bank_account_id,counterparty_reference,created_by,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) returning *",
   [t.id,b.checkType,b.checkNo.trim(),b.seriesNo||null,b.bankName||null,b.branchName||null,b.accountNo||null,b.issuerName.trim(),b.beneficiaryName||null,b.issueDate||null,b.dueDate,Number(b.amount),b.currency||"IRR",b.description||"",b.bankAccountId||null,b.counterpartyReference||null,(req as any).user.id,initial]
  );
  await c.query("insert into treasury_check_events(tenant_id,check_id,from_status,to_status,event_type,actor_user_id) values($1,$2,$3,$4,$5,$6)",[t.id,r.rows[0].id,null,initial,"create",(req as any).user.id]);
  await c.query("commit");
  res.status(201).json(r.rows[0]);
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
});

router.patch("/api/treasury-checks/:id/status",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req); if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const next=req.body?.status as string, reason=typeof req.body?.reason==="string"?req.body.reason:null;
 if(!allowedStatuses.includes(next as any))return deny(res,400,"وضعیت چک نامعتبر است");
 const old=await query("select * from treasury_checks where id=$1 and tenant_id=$2",[String(req.params.id),t.id]);
 if(!old.rowCount)return deny(res,404,"چک پیدا نشد");
 const current=old.rows[0].status as string;
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
 if(!flow[current]?.includes(next))return deny(res,409,"تغییر وضعیت از مرحله فعلی مجاز نیست");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const r=await c.query("update treasury_checks set status=$1,updated_at=now(),settled_at=case when $1='settled' then now() else settled_at end where id=$2 and tenant_id=$3 returning *",[next,String(req.params.id),t.id]);
  await c.query("insert into treasury_check_events(tenant_id,check_id,from_status,to_status,event_type,reason,actor_user_id) values($1,$2,$3,$4,$5,$6,$7)",[t.id,String(req.params.id),current,next,"status_change",reason,(req as any).user.id]);
  await c.query("commit");
  res.json(r.rows[0]);
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
});

export {router as treasuryChecksRouter};
