import {Router} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";
import {postLedgerEntry} from "./ledger.js";
import {emitBusinessEvent} from "./business-events.js";

export const settlementRouter=Router();
const s=(v:unknown,n=120)=>typeof v==="string"?v.trim().slice(0,n):"";
const tenant=async(req:any)=>resolveTenant(req,req.user);

settlementRouter.get("/api/marketplace/settlements",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select ss.*,s.display_name as seller_name,(select count(*)::int from seller_settlement_items si where si.settlement_id=ss.id) as order_count from seller_settlements ss join sellers s on s.id=ss.seller_id where ss.tenant_id=$1 order by ss.created_at desc",[t.id]);
 res.json(r.rows);
}));

settlementRouter.post("/api/marketplace/settlements/generate",requireAuth,requirePermission("settlement:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const start=s(req.body?.periodStart,40),end=s(req.body?.periodEnd,40);
 if(!start||!end)return res.status(400).json({error:"بازه تسویه الزامی است"});
 const periodStart=new Date(start),periodEnd=new Date(end);
 if(Number.isNaN(periodStart.getTime())||Number.isNaN(periodEnd.getTime())||periodEnd<=periodStart)return res.status(400).json({error:"بازه زمانی نامعتبر است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const orders=await client.query("select o.* from marketplace_orders o where o.tenant_id=$1 and o.status='paid' and o.created_at>=$2 and o.created_at<$3 and not exists(select 1 from seller_settlement_items si where si.tenant_id=o.tenant_id and si.order_id=o.id) order by o.created_at for update",[t.id,periodStart.toISOString(),periodEnd.toISOString()]);
  if(!orders.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش تسویه‌نشده‌ای در این بازه پیدا نشد"});}
  const bySeller=new Map<string,any[]>();
  for(const o of orders.rows){const list=bySeller.get(o.seller_id)||[];list.push(o);bySeller.set(o.seller_id,list);}
  const created=[];
  for(const [sellerId,rows] of bySeller){
   const gross=rows.reduce((a,o)=>a+Number(o.total_amount),0);
   const commission=rows.reduce((a,o)=>a+Number(o.commission_amount),0);
   const net=rows.reduce((a,o)=>a+Number(o.seller_payable),0);
   const settlementNo=s(req.body?.settlementNo,100)||("SET-"+Date.now()+"-"+sellerId.slice(0,8));
   const sr=await client.query("insert into seller_settlements(tenant_id,seller_id,settlement_no,period_start,period_end,gross_amount,commission_amount,adjustment_amount,net_amount,status) values($1,$2,$3,$4,$5,$6,$7,0,$8,'pending') returning *",[t.id,sellerId,settlementNo,periodStart.toISOString(),periodEnd.toISOString(),gross,commission,net]);
   for(const o of rows)await client.query("insert into seller_settlement_items(tenant_id,settlement_id,order_id,gross_amount,commission_amount,net_amount) values($1,$2,$3,$4,$5,$6)",[t.id,sr.rows[0].id,o.id,o.total_amount,o.commission_amount,o.seller_payable]);
   created.push(sr.rows[0]);
  }
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,after_data) values($1,$2,'settlement.generated','seller_settlement',$3)",[t.id,(req as any).user.id,JSON.stringify({count:created.length,periodStart:periodStart.toISOString(),periodEnd:periodEnd.toISOString()})]);
  await client.query("commit");
  for(const item of created)await emitBusinessEvent({tenantId:t.id,eventKey:"settlement.generated",subjectType:"seller_settlement",subjectId:item.id,userId:(req as any).user.id,input:{settlementId:item.id,sellerId:item.seller_id,netAmount:Number(item.net_amount)}});
  res.status(201).json({items:created,total:created.length});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

settlementRouter.patch("/api/marketplace/settlements/:id/approve",requireAuth,requirePermission("settlement:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const r=await client.query("update seller_settlements set status='approved',updated_at=now() where id=$1 and tenant_id=$2 and status='pending' returning *",[req.params.id,t.id]);
  if(!r.rowCount){await client.query("rollback");return res.status(409).json({error:"تسویه در وضعیت قابل تأیید نیست"});}
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'settlement.approved','seller_settlement',$3,$4)",[t.id,(req as any).user.id,r.rows[0].id,JSON.stringify(r.rows[0])]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"settlement.approved",subjectType:"seller_settlement",subjectId:r.rows[0].id,userId:(req as any).user.id,input:{settlementId:r.rows[0].id,netAmount:Number(r.rows[0].net_amount)}});
  res.json(r.rows[0]);
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

settlementRouter.post("/api/marketplace/settlements/:id/pay",requireAuth,requirePermission("settlement:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const r=await client.query("select * from seller_settlements where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!r.rowCount)return res.status(404).json({error:"تسویه پیدا نشد"});
  const settlement=r.rows[0];
  if(settlement.status!=="approved")return res.status(409).json({error:"فقط تسویه تأییدشده قابل پرداخت است"});
  const entryId=await postLedgerEntry(client,{tenantId:t.id,entryNo:"SET-"+settlement.settlement_no,sourceType:"seller_settlement",sourceId:settlement.id,description:"پرداخت تسویه فروشنده "+settlement.settlement_no,createdBy:(req as any).user.id,lines:[
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",debit:Number(settlement.net_amount)},
   {accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",credit:Number(settlement.net_amount)}
  ]});
  const paidRef=s(req.body?.paymentRef,160)||null;
  const u=await client.query("update seller_settlements set status='paid',updated_at=now() where id=$1 and tenant_id=$2 and status='approved' returning *",[settlement.id,t.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'settlement.paid','seller_settlement',$3,$4)",[t.id,(req as any).user.id,settlement.id,JSON.stringify({settlement:u.rows[0],ledgerEntryId:entryId,paymentRef:paidRef})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"settlement.paid",subjectType:"seller_settlement",subjectId:u.rows[0].id,userId:(req as any).user.id,input:{settlementId:u.rows[0].id,netAmount:Number(u.rows[0].net_amount),ledgerEntryId:entryId}});
  res.json({settlement:u.rows[0],ledgerEntryId:entryId,paymentRef:paidRef});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

settlementRouter.get("/api/ledger/accounts",requireAuth,requirePermission("ledger:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select * from ledger_accounts where tenant_id=$1 order by code",[t.id]);res.json(r.rows);
}));

settlementRouter.get("/api/ledger/entries",requireAuth,requirePermission("ledger:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select e.*,coalesce(json_agg(json_build_object('account_id',l.account_id,'account_code',a.code,'account_name',a.name,'debit',l.debit,'credit',l.credit,'description',l.description) order by a.code) filter(where l.id is not null),'[]') as lines from ledger_entries e left join ledger_lines l on l.entry_id=e.id left join ledger_accounts a on a.id=l.account_id where e.tenant_id=$1 group by e.id order by e.posted_at desc",[t.id]);
 res.json(r.rows);
}));