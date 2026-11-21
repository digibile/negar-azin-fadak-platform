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
 const [r,banks]=await Promise.all([
  query("select ss.*,s.display_name as seller_name,r.id payable_id,r.original_amount payable_amount,r.settled_amount payable_settled_amount,r.status payable_status,(select count(*)::int from seller_settlement_items si where si.settlement_id=ss.id and si.tenant_id=ss.tenant_id) as order_count,(select coalesce(sum(si.shipping_amount),0) from seller_settlement_items si where si.settlement_id=ss.id and si.tenant_id=ss.tenant_id) as shipping_amount_total,coalesce((select json_agg(json_build_object('id',ps.id,'amount',ps.amount,'currency',ps.currency,'payment_date',ps.payment_date,'reference_no',ps.reference_no,'ledger_entry_id',ps.ledger_entry_id) order by ps.payment_date desc,ps.created_at desc) from accounting_rp_settlements ps where ps.tenant_id=ss.tenant_id and ps.receivable_payable_id=r.id),'[]'::json) payment_history from seller_settlements ss join sellers s on s.id=ss.seller_id left join accounting_receivable_payables r on r.id=ss.payable_id and r.tenant_id=ss.tenant_id where ss.tenant_id=$1 order by ss.created_at desc",[t.id]),
  query("select b.id,b.code,b.bank_name,b.currency,b.current_balance,l.code ledger_code,l.name ledger_name from accounting_bank_accounts b join ledger_accounts l on l.id=b.ledger_account_id and l.tenant_id=b.tenant_id where b.tenant_id=$1 and b.status='active' and l.status='active' order by b.bank_name,b.code",[t.id])
 ]);
 res.json({items:r.rows,bankAccounts:banks.rows});
}));

settlementRouter.get("/api/marketplace/settlements/:id",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const result=await query("select ss.*,s.display_name as seller_name,coalesce(json_agg(json_build_object('orderId',o.id,'orderNo',o.order_no,'grossAmount',si.gross_amount,'shippingAmount',si.shipping_amount,'commissionAmount',si.commission_amount,'netAmount',si.net_amount,'currency',o.currency) order by o.created_at desc) filter(where si.id is not null),'[]') as orders from seller_settlements ss join sellers s on s.id=ss.seller_id left join seller_settlement_items si on si.settlement_id=ss.id and si.tenant_id=ss.tenant_id left join marketplace_orders o on o.id=si.order_id and o.tenant_id=si.tenant_id where ss.id=$1 and ss.tenant_id=$2 group by ss.id,s.display_name",[req.params.id,t.id]);
 if(!result.rowCount)return res.status(404).json({error:"پرونده تسویه پیدا نشد"});
 res.json(result.rows[0]);
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
  const bySellerCurrency=new Map<string,{sellerId:string;currency:string;rows:any[]}>();
  for(const o of orders.rows){
   const currency=String(o.currency||"IRR").trim().toUpperCase();
   const key=o.seller_id+"::"+currency;
   const group:{sellerId:string;currency:string;rows:any[]} = bySellerCurrency.get(key)||{sellerId:o.seller_id,currency,rows:[]};
   group.rows.push(o);bySellerCurrency.set(key,group);
  }
  const created:any[]=[];
  for(const group of bySellerCurrency.values()){
   const {sellerId,currency,rows}=group;
   const gross=rows.reduce((a,o)=>a+Number(o.total_amount),0);
   const commission=rows.reduce((a,o)=>a+Number(o.commission_amount),0);
   const net=rows.reduce((a,o)=>a+Number(o.seller_payable),0);
   const settlementNo=(s(req.body?.settlementNo,80)||("SET-"+Date.now()))+"-"+sellerId.slice(0,8)+"-"+currency;
   const sr=await client.query("insert into seller_settlements(tenant_id,seller_id,settlement_no,period_start,period_end,gross_amount,commission_amount,adjustment_amount,net_amount,status,currency) values($1,$2,$3,$4,$5,$6,$7,0,$8,'pending',$9) returning *",[t.id,sellerId,settlementNo,periodStart.toISOString(),periodEnd.toISOString(),gross,commission,net,currency]);
   for(const o of rows)await client.query("insert into seller_settlement_items(tenant_id,settlement_id,order_id,gross_amount,commission_amount,net_amount,shipping_amount) values($1,$2,$3,$4,$5,$6,$7)",[t.id,sr.rows[0].id,o.id,o.total_amount,o.commission_amount,o.seller_payable,Math.max(0,Number(o.shipping_amount||0))]);
   created.push(sr.rows[0]);
  }
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,after_data) values($1,$2,'settlement.generated','seller_settlement',$3)",[t.id,(req as any).user.id,JSON.stringify({count:created.length,periodStart:periodStart.toISOString(),periodEnd:periodEnd.toISOString()})]);
  await client.query("commit");
  for(const item of created)await emitBusinessEvent({tenantId:t.id,eventKey:"settlement.generated",subjectType:"seller_settlement",subjectId:item.id,userId:(req as any).user.id,input:{settlementId:item.id,sellerId:item.seller_id,netAmount:Number(item.net_amount),currency:item.currency||"IRR"}});
  res.status(201).json({items:created,total:created.length});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

settlementRouter.patch("/api/marketplace/settlements/:id/approve",requireAuth,requirePermission("settlement:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const locked=await client.query("select ss.*,s.accounting_party_id,s.display_name from seller_settlements ss join sellers s on s.id=ss.seller_id and s.tenant_id=ss.tenant_id where ss.id=$1 and ss.tenant_id=$2 for update of ss,s",[req.params.id,t.id]);
  if(!locked.rowCount){await client.query("rollback");return res.status(404).json({error:"تسویه فروشنده پیدا نشد"});}
  const current=locked.rows[0];
  if(!["pending","approved"].includes(current.status)){await client.query("rollback");return res.status(409).json({error:"تسویه در وضعیت قابل تأیید نیست"});}
  if(current.currency==="MIXED"||Number(current.net_amount)<=0){await client.query("rollback");return res.status(409).json({error:"واحد پول یا مبلغ خالص تسویه برای ایجاد بدهی معتبر نیست"});}
  const partyId=current.accounting_party_id;
  const party=partyId?(await client.query("select id from accounting_parties where id=$1 and tenant_id=$2 and party_type='supplier' and status='active' for share",[partyId,t.id])).rows[0]:null;
  if(!party){await client.query("rollback");return res.status(409).json({error:"طرف حساب مالی فعال فروشنده تعریف نشده است"});}
  let payableId=current.payable_id;
  if(!payableId){
   const payable=await client.query("insert into accounting_receivable_payables(tenant_id,party_id,direction,reference_no,issue_date,original_amount,currency,description,created_by,metadata) values($1,$2,'payable',$3,current_date,$4,$5,$6,$7,$8) returning id",[t.id,party.id,current.settlement_no,Number(current.net_amount),String(current.currency||"IRR").toUpperCase(),"تسویه فروشنده "+current.settlement_no,(req as any).user.id,JSON.stringify({sourceModule:"marketplace",sourceType:"seller_settlement",sourceId:current.id,settlementNo:current.settlement_no})]);
   payableId=payable.rows[0].id;
  }
  const r=await client.query("update seller_settlements set status='approved',payable_id=$3,updated_at=now() where id=$1 and tenant_id=$2 returning *",[req.params.id,t.id,payableId]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'settlement.approved','seller_settlement',$3,$4)",[t.id,(req as any).user.id,r.rows[0].id,JSON.stringify({...r.rows[0],payableId})]);
  await client.query("commit");
  if(current.status!=="approved")await emitBusinessEvent({tenantId:t.id,eventKey:"settlement.approved",subjectType:"seller_settlement",subjectId:r.rows[0].id,userId:(req as any).user.id,input:{settlementId:r.rows[0].id,netAmount:Number(r.rows[0].net_amount),currency:r.rows[0].currency||"IRR",payableId}});
  res.json({...r.rows[0],payable_id:payableId});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

settlementRouter.post("/api/marketplace/settlements/:id/pay",requireAuth,requirePermission("settlement:manage"),requirePermission("accounting-finance.write"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const bankAccountId=s(req.body?.bankAccountId,80),referenceNo=s(req.body?.referenceNo,120),idempotencyKey=s(req.body?.idempotencyKey,160);
 const paymentDate=s(req.body?.paymentDate,10)||new Date().toISOString().slice(0,10),amount=Number(req.body?.amount);
 if(!bankAccountId||!referenceNo||!idempotencyKey||!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)||!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:"حساب بانکی، مبلغ، تاریخ، مرجع پرداخت و کلید یکتا الزامی است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const prior=(await client.query("select *,metadata->>'sourceId' source_id from accounting_rp_settlements where tenant_id=$1 and idempotency_key=$2",[t.id,idempotencyKey])).rows[0];
  if(prior){if(prior.source_id!==req.params.id){await client.query("rollback");return res.status(409).json({error:"کلید یکتای پرداخت برای تسویه دیگری استفاده شده است"});}await client.query("commit");return res.json({settlement:prior,idempotent:true});}
  const row=(await client.query("select ss.*,r.id rp_id,r.direction,r.original_amount,r.settled_amount,r.currency rp_currency,r.status payable_status from seller_settlements ss left join accounting_receivable_payables r on r.id=ss.payable_id and r.tenant_id=ss.tenant_id where ss.id=$1 and ss.tenant_id=$2 for update of ss,r",[req.params.id,t.id])).rows[0];
  if(!row){await client.query("rollback");return res.status(404).json({error:"تسویه پیدا نشد"});}
  if(!["approved","partially_paid"].includes(row.status)||!row.rp_id||row.direction!=="payable"||row.payable_status==="cancelled"){await client.query("rollback");return res.status(409).json({error:"تسویه تأییدشده با بدهی مالی متناظر برای پرداخت آماده نیست"});}
  if(row.currency==="MIXED"){await client.query("rollback");return res.status(409).json({error:"واحد پول تسویه قدیمی ترکیبی است و قابل پرداخت نیست"});}
  const outstanding=Number(row.original_amount)-Number(row.settled_amount);
  if(amount>outstanding+0.005){await client.query("rollback");return res.status(409).json({error:"مبلغ پرداخت از مانده تسویه بیشتر است"});}
  const bank=(await client.query("select b.id,b.code,b.bank_name,b.currency,b.current_balance,l.code ledger_code,l.name ledger_name,l.account_type from accounting_bank_accounts b join ledger_accounts l on l.id=b.ledger_account_id and l.tenant_id=b.tenant_id where b.id=$1 and b.tenant_id=$2 and b.status='active' and l.status='active' for update of b,l",[bankAccountId,t.id])).rows[0];
  if(!bank){await client.query("rollback");return res.status(400).json({error:"حساب بانکی فعال با حساب دفترکل متصل انتخاب نشده است"});}
  if(String(bank.currency).toUpperCase()!==String(row.rp_currency).toUpperCase()){await client.query("rollback");return res.status(409).json({error:"ارز حساب بانکی با ارز تسویه یکسان نیست"});}
  if(Number(bank.current_balance)+0.005<amount){await client.query("rollback");return res.status(409).json({error:"موجودی ثبت‌شده حساب بانکی کافی نیست"});}
  const inserted=await client.query("insert into accounting_rp_settlements(tenant_id,receivable_payable_id,bank_account_id,amount,currency,payment_date,reference_no,idempotency_key,metadata,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict(tenant_id,idempotency_key) do nothing returning *",[t.id,row.rp_id,bank.id,amount,row.rp_currency,paymentDate,referenceNo,idempotencyKey,JSON.stringify({sourceModule:"marketplace",sourceType:"seller_settlement",sourceId:row.id,settlementNo:row.settlement_no}), (req as any).user.id]);
  if(!inserted.rowCount){const raced=(await client.query("select *,metadata->>'sourceId' source_id from accounting_rp_settlements where tenant_id=$1 and idempotency_key=$2",[t.id,idempotencyKey])).rows[0];if(!raced||raced.source_id!==row.id){await client.query("rollback");return res.status(409).json({error:"کلید یکتای پرداخت هم‌زمان برای عملیات دیگری ثبت شده است"});}await client.query("commit");return res.json({settlement:raced,idempotent:true});}
  const payment=inserted.rows[0];
  const ledgerEntryId=await postLedgerEntry(client,{tenantId:t.id,entryNo:"SELLER-PAY-"+String(payment.id).slice(0,12),sourceType:"accounting_rp_settlement",sourceId:payment.id,description:"پرداخت تسویه فروشنده "+row.settlement_no,createdBy:(req as any).user.id,currency:row.rp_currency,lines:[
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",debit:amount},
   {accountCode:bank.ledger_code,accountName:bank.ledger_name,accountType:bank.account_type,credit:amount}
  ]});
  await client.query("update accounting_rp_settlements set ledger_entry_id=$1 where id=$2 and tenant_id=$3",[ledgerEntryId,payment.id,t.id]);
  const settled=Number(row.settled_amount)+amount,fullySettled=settled>=Number(row.original_amount)-0.005;
  await client.query("update accounting_receivable_payables set settled_amount=$1,status=case when $2 then 'settled' else 'partially_settled' end,updated_at=now() where id=$3 and tenant_id=$4",[settled,fullySettled,row.rp_id,t.id]);
  const updated=(await client.query("update seller_settlements set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[fullySettled?"paid":"partially_paid",row.id,t.id])).rows[0];
  await client.query("update accounting_bank_accounts set current_balance=current_balance-$1,updated_at=now() where id=$2 and tenant_id=$3",[amount,bank.id,t.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'settlement.payment_recorded','seller_settlement',$3,$4)",[t.id,(req as any).user.id,row.id,JSON.stringify({settlementId:row.id,paymentId:payment.id,amount,currency:row.rp_currency,bankAccountId:bank.id,referenceNo,ledgerEntryId,settledAmount:settled,outstandingAmount:Math.max(0,Number(row.original_amount)-settled)})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"settlement.paid",subjectType:"seller_settlement",subjectId:row.id,userId:(req as any).user.id,input:{settlementId:row.id,amount,currency:row.rp_currency,ledgerEntryId,paymentId:payment.id,fullySettled}});
  res.status(201).json({settlement:updated,payment:{...payment,ledger_entry_id:ledgerEntryId},ledgerEntryId,settledAmount:settled,outstandingAmount:Math.max(0,Number(row.original_amount)-settled)});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

settlementRouter.get("/api/marketplace/seller-recoveries",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select c.*,s.display_name as seller_name,ss.settlement_no,o.order_no,r.refund_no from marketplace_seller_recovery_claims c join sellers s on s.id=c.seller_id join seller_settlements ss on ss.id=c.settlement_id join marketplace_orders o on o.id=c.order_id join marketplace_refunds r on r.id=c.refund_id where c.tenant_id=$1 order by c.created_at desc",[t.id]);
 res.json({items:r.rows,total:r.rowCount||0});
}));

settlementRouter.post("/api/marketplace/seller-recoveries/:id/collect",requireAuth,requirePermission("settlement:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const r=await client.query("select * from marketplace_seller_recovery_claims where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!r.rowCount){await client.query("rollback");return res.status(404).json({error:"مطالبه فروشنده پیدا نشد"});}
  const claim=r.rows[0];
  if(claim.status==="recovered"){await client.query("commit");return res.json({claim,idempotent:true});}
  if(claim.status!=="open"){await client.query("rollback");return res.status(409).json({error:"وضعیت مطالبه برای وصول مجاز نیست"});}
  const paymentRef=s(req.body?.paymentRef,160);
  if(!paymentRef){await client.query("rollback");return res.status(400).json({error:"شماره مرجع دریافت وجه الزامی است"});}
  const entryId=await postLedgerEntry(client,{tenantId:t.id,entryNo:"SRC-COLLECT-"+claim.id,sourceType:"marketplace_seller_recovery_collection",sourceId:claim.id,description:"وصول مطالبه از فروشنده",createdBy:(req as any).user.id,currency:claim.currency||"IRR",lines:[
   {accountCode:"1101",accountName:"حساب دریافت‌های پلتفرم",accountType:"asset",debit:Number(claim.amount)},
   {accountCode:"1202",accountName:"مطالبات از فروشندگان",accountType:"asset",credit:Number(claim.amount)}
  ]});
  const u=await client.query("update marketplace_seller_recovery_claims set status='recovered',payment_ref=$2,collection_ledger_entry_id=$3,recovered_at=now(),updated_at=now() where id=$1 and tenant_id=$4 and status='open' returning *",[claim.id,paymentRef,entryId,t.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'seller_recovery.claim_collected','seller_recovery_claim',$3,$4)",[t.id,(req as any).user.id,claim.id,JSON.stringify({amount:claim.amount,currency:claim.currency,paymentRef,ledgerEntryId:entryId})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"seller_recovery.collected",subjectType:"seller_recovery_claim",subjectId:claim.id,userId:(req as any).user.id,input:{claimId:claim.id,amount:Number(claim.amount),currency:claim.currency||"IRR",paymentRef,ledgerEntryId:entryId}});
  res.json({claim:u.rows[0],ledgerEntryId:entryId});
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