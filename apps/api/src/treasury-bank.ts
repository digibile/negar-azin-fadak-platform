import {Router,type Request,type Response} from "express";
import {query,pool} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";
const router=Router(), tenantOf=async(req:Request)=>resolveTenant(req,(req as any).user);
const deny=(r:Response,n:number,e:string)=>r.status(n).json({error:e});
const date=(v:unknown)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const audit=(t:string,u:string,e:string,id:string,a:string,b:any,x:any)=>query("insert into treasury_audit(tenant_id,entity_type,entity_id,action,actor_user_id,before_data,after_data) values($1,$2,$3,$4,$5,$6,$7)",[t,e,id,a,u,b||null,x||null]);

router.get("/api/treasury-bank/overview",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const [banks,receipts,payments,transactions,cashboxes,movements]=await Promise.all([
  query("select * from treasury_bank_accounts where tenant_id=$1 order by bank_name,account_title",[t.id]),
  query("select r.*,b.bank_name,b.account_title from treasury_receipts r join treasury_bank_accounts b on b.id=r.bank_account_id where r.tenant_id=$1 order by r.receipt_date desc limit 200",[t.id]),
  query("select p.*,b.bank_name,b.account_title from treasury_payments p join treasury_bank_accounts b on b.id=p.bank_account_id where p.tenant_id=$1 order by p.payment_date desc limit 200",[t.id]),
  query("select x.*,b.bank_name,b.account_title from treasury_bank_transactions x join treasury_bank_accounts b on b.id=x.bank_account_id where x.tenant_id=$1 order by x.transaction_date desc limit 300",[t.id]),
  query("select c.*,u.full_name custodian_name from treasury_cashboxes c left join users u on u.id=c.custodian_user_id where c.tenant_id=$1 order by c.code",[t.id]),
  query("select m.*,c.title cashbox_title from treasury_cash_movements m join treasury_cashboxes c on c.id=m.cashbox_id where m.tenant_id=$1 order by m.movement_date desc limit 200",[t.id])
 ]);
 res.json({banks:banks.rows,receipts:receipts.rows,payments:payments.rows,transactions:transactions.rows,cashboxes:cashboxes.rows,movements:movements.rows});
});

router.post("/api/treasury-bank/accounts",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(typeof b.bankName!=="string"||typeof b.accountTitle!=="string"||typeof b.accountNumber!=="string")return deny(res,400,"اطلاعات حساب بانکی ناقص است");
 const r=await query("insert into treasury_bank_accounts(tenant_id,bank_name,account_title,account_number,iban,currency,account_type,branch_name,opening_balance,current_balance) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) returning *",[t.id,b.bankName.trim(),b.accountTitle.trim(),b.accountNumber.trim(),b.iban||null,b.currency||"IRR",b.accountType||"current",b.branchName||null,Number(b.openingBalance||0)]);
 await audit(t.id,(req as any).user.id,"bank_account",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/treasury-bank/accounts/:id",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const old=await query("select * from treasury_bank_accounts where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!old.rowCount)return deny(res,404,"حساب بانکی پیدا نشد");
 const {accountTitle,iban,branchName,status}=req.body||{};if(status&&!["active","blocked","closed"].includes(status))return deny(res,400,"وضعیت حساب نامعتبر است");
 const r=await query("update treasury_bank_accounts set account_title=coalesce($1,account_title),iban=coalesce($2,iban),branch_name=coalesce($3,branch_name),status=coalesce($4,status),updated_at=now() where id=$5 and tenant_id=$6 returning *",[accountTitle||null,iban??null,branchName??null,status||null,String(String(req.params.id)),t.id]);
 await audit(t.id,(req as any).user.id,"bank_account",String(String(req.params.id)),"update",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});

router.post("/api/treasury-bank/receipts",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(!b.bankAccountId||typeof b.receiptNo!=="string"||!date(b.receiptDate)||!(Number(b.amount)>0))return deny(res,400,"اطلاعات دریافت نامعتبر است");
 const r=await query("insert into treasury_receipts(tenant_id,bank_account_id,receipt_no,receipt_date,amount,payer_name,reference_no,method,description,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,b.bankAccountId,b.receiptNo.trim(),b.receiptDate,Number(b.amount),b.payerName||"",b.referenceNo||null,b.method||"bank_transfer",b.description||"",(req as any).user.id]);
 await audit(t.id,(req as any).user.id,"receipt",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/treasury-bank/receipts/:id/status",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const s=req.body?.status;if(!["confirmed","cancelled"].includes(s))return deny(res,400,"وضعیت دریافت نامعتبر است");
 const old=await query("select * from treasury_receipts where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!old.rowCount)return deny(res,404,"دریافت پیدا نشد");if(old.rows[0].status!=="pending")return deny(res,409,"دریافت قبلاً تعیین تکلیف شده است");
 const c=await pool.connect();try{await c.query("begin");const r=await c.query("update treasury_receipts set status=$1,confirmed_by=$2,confirmed_at=case when $1='confirmed' then now() else null end,updated_at=now() where id=$3 and tenant_id=$4 returning *",[s,(req as any).user.id,String(String(req.params.id)),t.id]);if(s==="confirmed")await c.query("update treasury_bank_accounts set current_balance=current_balance+$1,updated_at=now() where id=$2 and tenant_id=$3",[old.rows[0].amount,old.rows[0].bank_account_id,t.id]);await c.query("commit");await audit(t.id,(req as any).user.id,"receipt",String(String(req.params.id)),"status",old.rows[0],r.rows[0]);res.json(r.rows[0]);}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
router.post("/api/treasury-bank/payments",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(!b.bankAccountId||typeof b.paymentNo!=="string"||!date(b.paymentDate)||!(Number(b.amount)>0))return deny(res,400,"اطلاعات پرداخت نامعتبر است");
 const r=await query("insert into treasury_payments(tenant_id,bank_account_id,payment_no,payment_date,amount,payee_name,reference_no,method,description,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,b.bankAccountId,b.paymentNo.trim(),b.paymentDate,Number(b.amount),b.payeeName||"",b.referenceNo||null,b.method||"bank_transfer",b.description||"",(req as any).user.id]);
 await audit(t.id,(req as any).user.id,"payment",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/treasury-bank/payments/:id/status",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const s=req.body?.status;if(!["approved","paid","cancelled"].includes(s))return deny(res,400,"وضعیت پرداخت نامعتبر است");
 const old=await query("select * from treasury_payments where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!old.rowCount)return deny(res,404,"پرداخت پیدا نشد");const cur=old.rows[0].status;
 const flow:any={pending:["approved","cancelled"],approved:["paid","cancelled"],paid:[],cancelled:[]};if(!flow[cur]?.includes(s))return deny(res,409,"تغییر وضعیت پرداخت مجاز نیست");
 const c=await pool.connect();try{await c.query("begin");const r=await c.query("update treasury_payments set status=$1,approved_by=case when $1='approved' then $2 else approved_by end,paid_at=case when $1='paid' then now() else paid_at end,updated_at=now() where id=$3 and tenant_id=$4 returning *",[s,(req as any).user.id,String(String(req.params.id)),t.id]);if(s==="paid")await c.query("update treasury_bank_accounts set current_balance=current_balance-$1,updated_at=now() where id=$2 and tenant_id=$3",[old.rows[0].amount,old.rows[0].bank_account_id,t.id]);await c.query("commit");await audit(t.id,(req as any).user.id,"payment",String(String(req.params.id)),"status",old.rows[0],r.rows[0]);res.json(r.rows[0]);}catch(e){await c.query("rollback");throw e}finally{c.release()}
});

router.post("/api/treasury-bank/transactions",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(!b.bankAccountId||!date(b.transactionDate)||!["credit","debit"].includes(b.direction)||!Number(b.amount))return deny(res,400,"تراکنش بانکی نامعتبر است");
 const r=await query("insert into treasury_bank_transactions(tenant_id,bank_account_id,transaction_date,value_date,reference_no,description,amount,direction,statement_balance) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",[t.id,b.bankAccountId,b.transactionDate,b.valueDate||null,b.referenceNo||null,b.description||"",Math.abs(Number(b.amount)),b.direction,b.statementBalance??null]);
 await audit(t.id,(req as any).user.id,"bank_transaction",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/treasury-bank/transactions/:id/reconcile",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const s=req.body?.status;if(!["matched","ignored","unmatched"].includes(s))return deny(res,400,"وضعیت مغایرت نامعتبر است");
 const old=await query("select * from treasury_bank_transactions where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!old.rowCount)return deny(res,404,"تراکنش پیدا نشد");
 const r=await query("update treasury_bank_transactions set reconciliation_status=$1 where id=$2 and tenant_id=$3 returning *",[s,String(String(req.params.id)),t.id]);await query("update treasury_bank_accounts set last_reconciled_at=case when $1='matched' then now() else last_reconciled_at end where id=$2 and tenant_id=$3",[s,old.rows[0].bank_account_id,t.id]);await audit(t.id,(req as any).user.id,"bank_transaction",String(String(req.params.id)),"reconcile",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});

router.post("/api/treasury-bank/cashboxes",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};if(typeof b.code!=="string"||typeof b.title!=="string")return deny(res,400,"اطلاعات تنخواه ناقص است");
 const r=await query("insert into treasury_cashboxes(tenant_id,code,title,custodian_user_id,opening_balance,current_balance,max_balance) values($1,$2,$3,$4,$5,$5,$6) returning *",[t.id,b.code.trim(),b.title.trim(),b.custodianUserId||null,Number(b.openingBalance||0),b.maxBalance?Number(b.maxBalance):null]);await audit(t.id,(req as any).user.id,"cashbox",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.post("/api/treasury-bank/cashboxes/:id/movements",requireAuth,requirePermission("treasury-bank.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};if(!date(b.movementDate)||!(Number(b.amount)>0)||!["in","out"].includes(b.direction))return deny(res,400,"گردش تنخواه نامعتبر است");
 const c=await pool.connect();try{await c.query("begin");const cb=await c.query("select * from treasury_cashboxes where id=$1 and tenant_id=$2 for update",[String(String(req.params.id)),t.id]);if(!cb.rowCount)return deny(res,404,"تنخواه پیدا نشد");const next=Number(cb.rows[0].current_balance)+(b.direction==="in"?Number(b.amount):-Number(b.amount));if(next<0)return deny(res,409,"موجودی تنخواه کافی نیست");if(cb.rows[0].max_balance!=null&&next>Number(cb.rows[0].max_balance))return deny(res,409,"سقف تنخواه رعایت نمی‌شود");const m=await c.query("insert into treasury_cash_movements(tenant_id,cashbox_id,movement_no,movement_date,amount,direction,description,reference_no,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",[t.id,String(String(req.params.id)),b.movementNo||String(Date.now()),b.movementDate,Number(b.amount),b.direction,b.description||"",b.referenceNo||null,(req as any).user.id]);await c.query("update treasury_cashboxes set current_balance=$1,updated_at=now() where id=$2",[next,String(String(req.params.id))]);await c.query("commit");await audit(t.id,(req as any).user.id,"cash_movement",m.rows[0].id,"create",null,m.rows[0]);res.status(201).json(m.rows[0]);}catch(e){await c.query("rollback");throw e}finally{c.release()}
});
export {router as treasuryBankRouter};
