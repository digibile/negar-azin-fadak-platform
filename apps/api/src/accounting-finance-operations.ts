import {Router} from "express";
import {query,pool} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";

const router=Router();
const tenantOf=async(req:any)=>resolveTenant(req,req.user);
const idOf=(req:any,k:string)=>Array.isArray(req.params?.[k])?req.params[k][0]:req.params?.[k];
const deny=(res:any,n:number,error:string)=>res.status(n).json({error});
const actor=(req:any)=>req.user.id;
const date=(v:any)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const audit=async(t:string,u:string,type:string,id:string,action:string,b:any,a:any)=>
 query("insert into accounting_finance_audit(tenant_id,entity_type,entity_id,action,actor_user_id,before_data,after_data) values($1,$2,$3,$4,$5,$6,$7)",[t,type,id,action,u,b||null,a||null]);

router.get("/api/accounting-finance/operations-overview",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const [parties,banks,cash,checks,rp,assets,budgets,commitments,recs]=await Promise.all([
  query("select * from accounting_parties where tenant_id=$1 order by party_code",[t.id]),
  query("select * from accounting_bank_accounts where tenant_id=$1 order by code",[t.id]),
  query("select * from accounting_cashboxes where tenant_id=$1 order by code",[t.id]),
  query("select * from accounting_checks where tenant_id=$1 order by due_date nulls last,created_at desc limit 200",[t.id]),
  query("select r.*,p.party_code,p.title party_title from accounting_receivable_payables r join accounting_parties p on p.id=r.party_id where r.tenant_id=$1 order by r.due_date nulls last limit 200",[t.id]),
  query("select * from accounting_assets where tenant_id=$1 order by asset_code",[t.id]),
  query("select * from accounting_budgets where tenant_id=$1 order by code",[t.id]),
  query("select * from accounting_commitments where tenant_id=$1 order by due_date nulls last limit 200",[t.id]),
  query("select r.*,b.code bank_code,b.bank_name from accounting_bank_reconciliations r join accounting_bank_accounts b on b.id=r.bank_account_id where r.tenant_id=$1 order by statement_date desc limit 100",[t.id])
 ]);
 res.json({parties:parties.rows,banks:banks.rows,cashboxes:cash.rows,checks:checks.rows,receivablesPayables:rp.rows,assets:assets.rows,budgets:budgets.rows,commitments:commitments.rows,reconciliations:recs.rows});
});

router.post("/api/accounting-finance/parties",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const b=req.body||{};if(typeof b.partyCode!=="string"||typeof b.title!=="string")return deny(res,400,"کد و عنوان طرف حساب الزامی است");
 const r=await query("insert into accounting_parties(tenant_id,party_code,party_type,title,national_id,economic_code,tax_id,phone,email,address,default_account_id,credit_limit,payment_term_days,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *",[t.id,b.partyCode.trim(),b.partyType||"customer",b.title.trim(),b.nationalId||null,b.economicCode||null,b.taxId||null,b.phone||null,b.email||null,b.address||null,b.defaultAccountId||null,Number(b.creditLimit)||0,Math.max(0,Number(b.paymentTermDays)||0),b.metadata||{}]);
 await audit(t.id,actor(req),"party",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});

router.post("/api/accounting-finance/banks",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(typeof b.code!=="string"||typeof b.bankName!=="string")return deny(res,400,"کد و نام بانک الزامی است");
 const r=await query("insert into accounting_bank_accounts(tenant_id,code,bank_name,branch_name,account_no,iban,card_no,currency,ledger_account_id,opening_balance,current_balance) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning *",[t.id,b.code.trim(),b.bankName.trim(),b.branchName||null,b.accountNo||null,b.iban||null,b.cardNo||null,b.currency||"IRR",b.ledgerAccountId||null,Number(b.openingBalance)||0]);
 await audit(t.id,actor(req),"bank_account",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});

router.post("/api/accounting-finance/cashboxes",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(typeof b.code!=="string"||typeof b.title!=="string")return deny(res,400,"کد و عنوان صندوق الزامی است");
 const opening=Number(b.openingBalance)||0;
 const r=await query("insert into accounting_cashboxes(tenant_id,code,title,cashier_user_id,ledger_account_id,opening_balance,current_balance,max_balance) values($1,$2,$3,$4,$5,$6,$6,$7) returning *",[t.id,b.code.trim(),b.title.trim(),b.cashierUserId||null,b.ledgerAccountId||null,opening,b.maxBalance==null?null:Number(b.maxBalance)]);
 await audit(t.id,actor(req),"cashbox",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});

router.post("/api/accounting-finance/receivables-payables",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(!b.partyId||!["receivable","payable"].includes(b.direction)||!date(b.issueDate)||!(Number(b.originalAmount)>0))return deny(res,400,"اطلاعات دریافتنی/پرداختنی نامعتبر است");
 const party=await query("select id from accounting_parties where id=$1 and tenant_id=$2",[b.partyId,t.id]);if(!party.rowCount)return deny(res,404,"طرف حساب پیدا نشد");
 const r=await query("insert into accounting_receivable_payables(tenant_id,party_id,document_id,direction,reference_no,issue_date,due_date,original_amount,currency,description,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",[t.id,b.partyId,b.documentId||null,b.direction,b.referenceNo||null,b.issueDate,b.dueDate||null,Number(b.originalAmount),b.currency||"IRR",b.description||"",actor(req)]);
 await audit(t.id,actor(req),"receivable_payable",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});

router.post("/api/accounting-finance/checks",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(typeof b.checkNo!=="string"||!["received","issued"].includes(b.direction)||!(Number(b.amount)>0))return deny(res,400,"اطلاعات چک نامعتبر است");
 const r=await query("insert into accounting_checks(tenant_id,party_id,rp_id,check_no,direction,bank_name,branch_name,issue_date,due_date,amount,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *",[t.id,b.partyId||null,b.rpId||null,b.checkNo.trim(),b.direction,b.bankName||null,b.branchName||null,b.issueDate||null,b.dueDate||null,Number(b.amount),b.direction==="received"?"in_hand":"issued",b.notes||"",actor(req)]);
 await audit(t.id,actor(req),"check",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});

router.patch("/api/accounting-finance/checks/:id/status",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const s=req.body?.status;
 if(!["in_hand","deposited","cleared","returned","endorsed","cancelled","issued","paid"].includes(s))return deny(res,400,"وضعیت چک نامعتبر است");
 const old=await query("select * from accounting_checks where id=$1 and tenant_id=$2",[idOf(req,"id"),t.id]);if(!old.rowCount)return deny(res,404,"چک پیدا نشد");
 const r=await query("update accounting_checks set status=$1,clearance_date=case when $1 in ('cleared','paid') then current_date else clearance_date end,updated_at=now() where id=$2 and tenant_id=$3 returning *",[s,idOf(req,"id"),t.id]);
 await audit(t.id,actor(req),"check",idOf(req,"id"),"status",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});

router.post("/api/accounting-finance/assets",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(typeof b.assetCode!=="string"||typeof b.title!=="string"||!date(b.acquisitionDate)||!(Number(b.acquisitionCost)>=0)||!(Number(b.usefulLifeMonths)>0))return deny(res,400,"اطلاعات دارایی ثابت نامعتبر است");
 const cost=Number(b.acquisitionCost),residual=Number(b.residualValue)||0;
 if(residual>cost)return deny(res,400,"ارزش اسقاط نمی‌تواند بیشتر از بهای دارایی باشد");
 const r=await query("insert into accounting_assets(tenant_id,asset_code,title,asset_group,acquisition_date,acquisition_cost,residual_value,useful_life_months,depreciation_method,book_value,location,custodian_user_id,ledger_account_id,accumulated_depreciation_account_id,expense_account_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$6-$7,$10,$11,$12,$13,$14,$15) returning *",[t.id,b.assetCode.trim(),b.title.trim(),b.assetGroup||null,b.acquisitionDate,cost,residual,Number(b.usefulLifeMonths),b.depreciationMethod||"straight_line",b.location||null,b.custodianUserId||null,b.ledgerAccountId||null,b.accumulatedDepreciationAccountId||null,b.expenseAccountId||null]);
 await audit(t.id,actor(req),"asset",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});

router.post("/api/accounting-finance/budgets",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(typeof b.code!=="string"||typeof b.title!=="string")return deny(res,400,"کد و عنوان بودجه الزامی است");
 const r=await query("insert into accounting_budgets(tenant_id,fiscal_period_id,code,title,dimension_type,dimension_id,planned_amount,created_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning *",[t.id,b.fiscalPeriodId||null,b.code.trim(),b.title.trim(),b.dimensionType||"cost_center",b.dimensionId||null,Number(b.plannedAmount)||0,actor(req)]);
 await audit(t.id,actor(req),"budget",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});

router.post("/api/accounting-finance/commitments",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(!["purchase","sale","payment","receipt","contract","loan"].includes(b.commitmentType)||!(Number(b.amount)>=0))return deny(res,400,"تعهد مالی نامعتبر است");
 const r=await query("insert into accounting_commitments(tenant_id,party_id,commitment_type,reference_no,due_date,amount,source_module,source_id,description,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,b.partyId||null,b.commitmentType,b.referenceNo||null,b.dueDate||null,Number(b.amount),b.sourceModule||"manual",b.sourceId||null,b.description||"",actor(req)]);
 await audit(t.id,actor(req),"commitment",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});

router.post("/api/accounting-finance/bank-reconciliations",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const b=req.body||{};
 if(!b.bankAccountId||!date(b.statementDate))return deny(res,400,"اطلاعات مغایرت بانکی نامعتبر است");
 const r=await query("insert into accounting_bank_reconciliations(tenant_id,bank_account_id,statement_date,statement_balance,book_balance,status) values($1,$2,$3,$4,$5,'draft') returning *",[t.id,b.bankAccountId,b.statementDate,Number(b.statementBalance)||0,Number(b.bookBalance)||0]);
 await audit(t.id,actor(req),"bank_reconciliation",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});

router.patch("/api/accounting-finance/bank-reconciliations/:id/status",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const s=req.body?.status;
 if(!["draft","in_review","reconciled","approved"].includes(s))return deny(res,400,"وضعیت مغایرت نامعتبر است");
 const old=await query("select * from accounting_bank_reconciliations where id=$1 and tenant_id=$2",[idOf(req,"id"),t.id]);if(!old.rowCount)return deny(res,404,"مغایرت پیدا نشد");
 if(s==="reconciled"&&Math.abs(Number(old.rows[0].difference))>0.005)return deny(res,409,"تا رفع مغایرت، وضعیت تطبیق‌شده مجاز نیست");
 const r=await query("update accounting_bank_reconciliations set status=$1,reconciled_by=case when $1 in ('reconciled','approved') then $2 else reconciled_by end,reconciled_at=case when $1 in ('reconciled','approved') then now() else reconciled_at end,updated_at=now() where id=$3 and tenant_id=$4 returning *",[s,actor(req),idOf(req,"id"),t.id]);
 await audit(t.id,actor(req),"bank_reconciliation",idOf(req,"id"),"status",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});

export {router as accountingFinanceOperationsRouter};
