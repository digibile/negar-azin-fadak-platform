import express from "express";
import {query,pool} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";

export const walletLedgerRouter=express.Router();
const tenantOf=async(req:any)=>resolveTenant(req,(req as any).user);
const deny=(res:any,status:number,error:string)=>res.status(status).json({error});
const audit=async(tenantId:string,userId:string,type:string,id:string,action:string,before:any,after:any)=>{
 await query("insert into wallet_audit(tenant_id,entity_type,entity_id,action,actor_user_id,before_data,after_data) values($1,$2,$3,$4,$5,$6,$7)",[tenantId,type,id,action,userId,before??null,after??null]);
};
const num=(v:any)=>Number(v);
const validAmount=(v:any)=>Number.isFinite(num(v))&&num(v)>0;

walletLedgerRouter.get("/api/wallet-ledger/overview",requireAuth,requirePermission("wallet-ledger.read"),async(req,res)=>{
 const t=await tenantOf(req); if(!t)return deny(res,403,"محدوده سازمانی معتبر پیدا نشد");
 const [w,l,c,d]=await Promise.all([
  query("select count(*)::int total,coalesce(sum(current_balance),0)::numeric total_balance from wallet_accounts where tenant_id=$1",[t.id]),
  query("select count(*)::int total from wallet_ledger_entries where tenant_id=$1",[t.id]),
  query("select coalesce(sum(amount),0)::numeric total from wallet_ledger_entries where tenant_id=$1 and direction='credit'",[t.id]),
  query("select coalesce(sum(amount),0)::numeric total from wallet_ledger_entries where tenant_id=$1 and direction='debit'",[t.id])
 ]);
 res.json({wallets:w.rows[0],ledger:l.rows[0],credits:c.rows[0].total,debits:d.rows[0].total});
});

walletLedgerRouter.get("/api/wallet-ledger/wallets",requireAuth,requirePermission("wallet-ledger.read"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"محدوده سازمانی معتبر پیدا نشد");
 const r=await query("select id,code,title,currency,opening_balance,current_balance,status,owner_user_id,created_at,updated_at from wallet_accounts where tenant_id=$1 order by created_at desc",[t.id]);res.json(r.rows);
});

walletLedgerRouter.post("/api/wallet-ledger/wallets",requireAuth,requirePermission("wallet-ledger.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"محدوده سازمانی معتبر پیدا نشد");
 const {code,title,currency="IRR",openingBalance=0,ownerUserId=null}=req.body||{};
 if(typeof code!=="string"||!code.trim()||typeof title!=="string"||!title.trim()||!validAmount(openingBalance)&&num(openingBalance)!==0)return deny(res,400,"اطلاعات کیف پول نامعتبر است");
 try{
  const r=await query("insert into wallet_accounts(tenant_id,owner_user_id,code,title,currency,opening_balance,current_balance) values($1,$2,$3,$4,$5,$6,$6) returning *",[t.id,ownerUserId||null,code.trim(),title.trim(),String(currency).trim()||"IRR",num(openingBalance)]);
  await audit(t.id,(req as any).user.id,"wallet",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
 }catch(e:any){if(e?.code==="23505")return deny(res,409,"کد کیف پول تکراری است");throw e;}
});

walletLedgerRouter.patch("/api/wallet-ledger/wallets/:id",requireAuth,requirePermission("wallet-ledger.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"محدوده سازمانی معتبر پیدا نشد");
 const old=await query("select * from wallet_accounts where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!old.rowCount)return deny(res,404,"کیف پول پیدا نشد");
 const {title,status,ownerUserId}=req.body||{};
 if(status!==undefined&&!["active","blocked","closed"].includes(status))return deny(res,400,"وضعیت کیف پول نامعتبر است");
 const r=await query("update wallet_accounts set title=coalesce($1,title),status=coalesce($2,status),owner_user_id=coalesce($3,owner_user_id),updated_at=now() where id=$4 and tenant_id=$5 returning *",[title??null,status??null,ownerUserId??null,String(String(req.params.id)),t.id]);
 await audit(t.id,(req as any).user.id,"wallet",String(String(req.params.id)),"update",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});

walletLedgerRouter.get("/api/wallet-ledger/entries",requireAuth,requirePermission("wallet-ledger.read"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"محدوده سازمانی معتبر پیدا نشد");
 const params:any[]=[t.id];const where=["e.tenant_id=$1"];
 if(typeof req.query.walletId==="string"){params.push(req.query.walletId);where.push("e.wallet_id=$"+params.length)}
 if(req.query.direction==="credit"||req.query.direction==="debit"){params.push(req.query.direction);where.push("e.direction=$"+params.length)}
 const limit=Math.min(100,Math.max(1,Number(req.query.limit)||50));params.push(limit);
 const r=await query("select e.*,w.code wallet_code,w.title wallet_title from wallet_ledger_entries e join wallet_accounts w on w.id=e.wallet_id and w.tenant_id=e.tenant_id where "+where.join(" and ")+" order by e.entry_date desc,e.created_at desc limit $"+params.length,params);res.json(r.rows);
});

walletLedgerRouter.post("/api/wallet-ledger/entries",requireAuth,requirePermission("wallet-ledger.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"محدوده سازمانی معتبر پیدا نشد");
 const {walletId,entryNo,direction,amount,referenceType=null,referenceId=null,externalReference=null,description="",idempotencyKey}=req.body||{};
 if(!walletId||typeof entryNo!=="string"||!entryNo.trim()||!["credit","debit"].includes(direction)||!validAmount(amount)||typeof idempotencyKey!=="string"||!idempotencyKey.trim())return deny(res,400,"اطلاعات گردش کیف پول ناقص یا نامعتبر است");
 const client=await pool.connect();
 try{
  await client.query("begin");
  const existing=await client.query("select * from wallet_ledger_entries where tenant_id=$1 and idempotency_key=$2",[t.id,idempotencyKey.trim()]);
  if(existing.rowCount){await client.query("rollback");return res.status(200).json(existing.rows[0]);}
  const w=await client.query("select * from wallet_accounts where id=$1 and tenant_id=$2 for update",[walletId,t.id]);
  if(!w.rowCount){await client.query("rollback");return deny(res,404,"کیف پول پیدا نشد");}
  if(w.rows[0].status!=="active"){await client.query("rollback");return deny(res,409,"کیف پول فعال نیست");}
  const before=num(w.rows[0].current_balance),delta=direction==="credit"?num(amount):-num(amount),after=before+delta;
  if(after<0){await client.query("rollback");return deny(res,409,"موجودی کیف پول برای این بدهکاری کافی نیست");}
  const e=await client.query("insert into wallet_ledger_entries(tenant_id,wallet_id,entry_no,direction,amount,balance_after,reference_type,reference_id,external_reference,description,idempotency_key,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *",[t.id,walletId,entryNo.trim(),direction,num(amount),after,referenceType,referenceId,externalReference,description||"",idempotencyKey.trim(),(req as any).user.id]);
  await client.query("update wallet_accounts set current_balance=$1,updated_at=now() where id=$2 and tenant_id=$3",[after,walletId,t.id]);
  await client.query("insert into wallet_audit(tenant_id,entity_type,entity_id,action,actor_user_id,before_data,after_data) values($1,'wallet',$2,'ledger-post',$3,$4,$5)",[t.id,walletId,(req as any).user.id,w.rows[0],e.rows[0]]);
  await client.query("commit");res.status(201).json(e.rows[0]);
 }catch(e:any){await client.query("rollback").catch(()=>{});if(e?.code==="23505")return deny(res,409,"شماره ثبت یا کلید idempotency تکراری است");throw e}finally{client.release()}
});

walletLedgerRouter.get("/api/wallet-ledger/credits",requireAuth,requirePermission("wallet-ledger.read"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"محدوده سازمانی معتبر پیدا نشد");
 const r=await query("select e.*,w.code wallet_code,w.title wallet_title from wallet_ledger_entries e join wallet_accounts w on w.id=e.wallet_id and w.tenant_id=e.tenant_id where e.tenant_id=$1 and e.direction='credit' order by e.entry_date desc",[t.id]);res.json(r.rows);
});
walletLedgerRouter.get("/api/wallet-ledger/debits",requireAuth,requirePermission("wallet-ledger.read"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"محدوده سازمانی معتبر پیدا نشد");
 const r=await query("select e.*,w.code wallet_code,w.title wallet_title from wallet_ledger_entries e join wallet_accounts w on w.id=e.wallet_id and w.tenant_id=e.tenant_id where e.tenant_id=$1 and e.direction='debit' order by e.entry_date desc",[t.id]);res.json(r.rows);
});
