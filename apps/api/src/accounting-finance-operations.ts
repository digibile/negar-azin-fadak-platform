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

router.post("/api/accounting-finance/bank-reconciliations/from-treasury",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const b=req.body||{};if(!b.treasuryBankAccountId||!date(b.statementDate)||!Number.isFinite(Number(b.statementBalance)))return deny(res,400,"حساب خزانه، تاریخ و مانده صورت‌حساب الزامی است");
 const account=await query("select tb.id treasury_id,tb.bank_name treasury_bank_name,tb.account_title,tb.currency treasury_currency,ab.id accounting_id,ab.code bank_code,ab.ledger_account_id,ab.opening_balance,ab.currency from treasury_bank_accounts tb join accounting_bank_accounts ab on ab.id=tb.accounting_bank_account_id and ab.tenant_id=tb.tenant_id join ledger_accounts la on la.id=ab.ledger_account_id and la.tenant_id=ab.tenant_id where tb.id=$1 and tb.tenant_id=$2 and tb.status='active' and ab.status='active' and la.status='active' for share of tb,ab",[b.treasuryBankAccountId,t.id]);
 if(!account.rowCount)return deny(res,409,"حساب خزانه به حساب بانکی فعال و دارای حساب دفترکل متصل نیست");
 const bank=account.rows[0];if(String(bank.currency).toUpperCase()!==String(bank.treasury_currency).toUpperCase())return deny(res,409,"واحد پول حساب‌های متصل یکسان نیست");
 const book=await query("select (coalesce($3::numeric,0)+coalesce(sum(l.debit-l.credit),0))::numeric book_balance from accounting_document_lines l join accounting_documents d on d.id=l.document_id and d.tenant_id=$1 where l.account_id=$2 and d.status='posted' and d.document_date<=$4",[t.id,bank.ledger_account_id,bank.opening_balance,b.statementDate]);
 const created=await query("insert into accounting_bank_reconciliations(tenant_id,bank_account_id,treasury_bank_account_id,statement_date,statement_balance,book_balance,status,notes) values($1,$2,$3,$4,$5,$6,'draft',$7) returning *",[t.id,bank.accounting_id,bank.treasury_id, b.statementDate,Number(b.statementBalance),Number(book.rows[0].book_balance),String(b.notes||"").slice(0,2000)]);
 await audit(t.id,actor(req),"bank_reconciliation",created.rows[0].id,"create_from_treasury",null,{...created.rows[0],treasury_bank_name:bank.treasury_bank_name,account_title:bank.account_title});
 res.status(201).json({...created.rows[0],bank_code:bank.bank_code,treasury_bank_name:bank.treasury_bank_name,account_title:bank.account_title});
});

router.post("/api/accounting-finance/bank-fees/draft-document",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const b=req.body||{},ids=Array.isArray(b.transactionIds)?[...new Set(b.transactionIds.map(String))]:[];
 if(ids.length<1||ids.length>500||typeof b.expenseAccountId!=="string"||typeof b.bookId!=="string"||typeof b.documentNo!=="string"||!date(b.documentDate))return deny(res,400,"گردش‌های کارمزد، حساب هزینه، دفتر، شماره و تاریخ سند الزامی است");
 const client=await pool.connect();
 try{
  await client.query("begin");
  const rows=await client.query("select tx.*,tb.currency,ab.ledger_account_id bank_ledger_account_id,ab.id accounting_bank_account_id from treasury_bank_transactions tx join treasury_bank_accounts tb on tb.id=tx.bank_account_id and tb.tenant_id=tx.tenant_id join accounting_bank_accounts ab on ab.id=tb.accounting_bank_account_id and ab.tenant_id=tb.tenant_id where tx.tenant_id=$1 and tx.id=any($2::uuid[]) and tx.fee_candidate=true and tx.fee_journal_document_id is null and tx.direction='debit' and ab.status='active' for update of tx",[t.id,ids]);
  if(rows.rowCount!==ids.length){await client.query("rollback");return deny(res,409,"برخی گردش‌ها دیگر نامزد کارمزد نیستند یا قبلاً برایشان سند ساخته شده است");}
  const bank=rows.rows[0];if(rows.rows.some((x:any)=>x.bank_account_id!==bank.bank_account_id||x.bank_ledger_account_id!==bank.bank_ledger_account_id||x.currency!==bank.currency)){await client.query("rollback");return deny(res,409,"گردش‌های انتخابی باید متعلق به یک حساب بانکی و یک ارز باشند");}
  if(!bank.bank_ledger_account_id){await client.query("rollback");return deny(res,409,"حساب بانکی به حساب دفترکل متصل نیست");}
  const expense=await client.query("select id,account_type,status from ledger_accounts where id=$1 and tenant_id=$2",[b.expenseAccountId,t.id]);
  if(!expense.rowCount||!["expense","cost"].includes(expense.rows[0].account_type)||expense.rows[0].status!=="active"){await client.query("rollback");return deny(res,400,"حساب انتخابی باید حساب هزینه فعال باشد");}
  const book=await client.query("select id from accounting_books where id=$1 and tenant_id=$2",[b.bookId,t.id]);if(!book.rowCount){await client.query("rollback");return deny(res,404,"دفتر حسابداری پیدا نشد");}
  let periodId=b.periodId||null;
  if(periodId){const period=await client.query("select id,status,book_id,starts_on,ends_on from accounting_fiscal_periods where id=$1 and tenant_id=$2",[periodId,t.id]);if(!period.rowCount||period.rows[0].status!=="open"||period.rows[0].book_id!==b.bookId||b.documentDate<period.rows[0].starts_on||b.documentDate>period.rows[0].ends_on){await client.query("rollback");return deny(res,409,"دوره مالی انتخابی باز نیست یا تاریخ سند در محدوده آن قرار ندارد");}}
  const total=rows.rows.reduce((n:number,x:any)=>n+Number(x.amount),0);
  const document=(await client.query("insert into accounting_documents(tenant_id,book_id,period_id,document_no,document_date,document_type,description,source_type,source_id,created_by) values($1,$2,$3,$4,$5,'journal',$6,'bank_fee_import',$7,$8) returning *",[t.id,b.bookId,periodId,b.documentNo.trim(),b.documentDate,"پیش‌نویس ثبت کارمزدهای بانکی از صورت‌حساب واردشده",bank.import_batch_id,(req as any).user.id])).rows[0];
  await client.query("insert into accounting_document_lines(document_id,line_no,account_id,description,debit,credit,dimensions) values($1,1,$2,$3,$4,0,$5),($1,2,$6,$7,0,$4,$8)",[document.id,b.expenseAccountId,"هزینه کارمزد بانکی",total,JSON.stringify({source:"bank_statement_fee_candidates",transactionIds:ids}),bank.bank_ledger_account_id,"کسر کارمزد از حساب بانکی",JSON.stringify({source:"bank_statement_fee_candidates",transactionIds:ids})]);
  await client.query("update treasury_bank_transactions set fee_journal_document_id=$1 where tenant_id=$2 and id=any($3::uuid[]) and fee_journal_document_id is null",[document.id,t.id,ids]);
  await client.query("insert into accounting_finance_audit(tenant_id,entity_type,entity_id,action,actor_user_id,after_data) values($1,'accounting_document',$2,'create_bank_fee_draft',$3,$4)",[t.id,document.id,(req as any).user.id,JSON.stringify({transactionIds:ids,total,currency:bank.currency,status:"draft"})]);
  await client.query("commit");res.status(201).json({document,total,currency:bank.currency,transactionCount:ids.length,status:"draft"});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
});

router.get("/api/accounting-finance/bank-reconciliations/:id/workspace",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const rec=await query("select r.*,ab.code bank_code,ab.bank_name,ab.currency,ab.ledger_account_id,tb.bank_name treasury_bank_name,tb.account_title from accounting_bank_reconciliations r join accounting_bank_accounts ab on ab.id=r.bank_account_id and ab.tenant_id=r.tenant_id join treasury_bank_accounts tb on tb.id=r.treasury_bank_account_id and tb.tenant_id=r.tenant_id where r.id=$1 and r.tenant_id=$2",[idOf(req,"id"),t.id]);
 if(!rec.rowCount)return deny(res,404,"صورت‌مغایرت پیدا نشد");
 const x=rec.rows[0];
 const [transactions,matches]=await Promise.all([
  query("select tx.*,m.id reconciliation_match_id,exists(select 1 from accounting_bank_reconciliation_matches used_tx where used_tx.tenant_id=tx.tenant_id and used_tx.treasury_transaction_id=tx.id) already_reconciled,coalesce(candidates.items,'[]'::json) candidate_lines from treasury_bank_transactions tx left join accounting_bank_reconciliation_matches m on m.tenant_id=tx.tenant_id and m.treasury_transaction_id=tx.id and m.reconciliation_id=$5 left join lateral (select json_agg(json_build_object('id',dl.id,'document_no',d.document_no,'document_date',d.document_date,'description',coalesce(dl.description,d.description),'debit',dl.debit,'credit',dl.credit) order by d.document_date desc) items from accounting_document_lines dl join accounting_documents d on d.id=dl.document_id and d.tenant_id=$1 where dl.account_id=$2 and d.status='posted' and d.document_date<=$3 and abs(case when tx.direction='credit' then dl.debit else dl.credit end-tx.amount)<0.005 and case when tx.direction='credit' then dl.credit=0 and dl.debit>0 else dl.debit=0 and dl.credit>0 end and not exists(select 1 from accounting_bank_reconciliation_matches used where used.tenant_id=$1 and used.accounting_document_line_id=dl.id)) candidates on true where tx.tenant_id=$1 and tx.bank_account_id=$4 and tx.transaction_date<=$3 order by tx.transaction_date,tx.created_at",[t.id,x.ledger_account_id,x.statement_date,x.treasury_bank_account_id,x.id]),
  query("select m.*,tx.transaction_date,tx.reference_no,tx.description transaction_description,tx.direction,tx.amount transaction_amount,d.document_no,d.document_date,dl.description line_description,dl.debit,dl.credit from accounting_bank_reconciliation_matches m join treasury_bank_transactions tx on tx.id=m.treasury_transaction_id and tx.tenant_id=m.tenant_id join accounting_document_lines dl on dl.id=m.accounting_document_line_id join accounting_documents d on d.id=dl.document_id where m.tenant_id=$1 and m.reconciliation_id=$2 order by tx.transaction_date",[t.id,x.id])
 ]);
 res.json({reconciliation:x,transactions:transactions.rows,matches:matches.rows,summary:{transactionCount:transactions.rowCount,matchedCount:matches.rowCount,unmatchedCount:transactions.rows.filter((v:any)=>!matches.rows.some((m:any)=>m.treasury_transaction_id===v.id)).length}});
});

router.post("/api/accounting-finance/bank-reconciliations/:id/matches",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const transactionId=String(req.body?.treasuryTransactionId||""),lineId=String(req.body?.accountingDocumentLineId||"");
 if(!transactionId||!lineId)return deny(res,400,"گردش بانکی و ردیف سند حسابداری الزامی است");
 const client=await pool.connect();
 try{
  await client.query("begin");
  const rec=(await client.query("select r.*,ab.ledger_account_id from accounting_bank_reconciliations r join accounting_bank_accounts ab on ab.id=r.bank_account_id and ab.tenant_id=r.tenant_id where r.id=$1 and r.tenant_id=$2 for update",[idOf(req,"id"),t.id])).rows[0];
  if(!rec){await client.query("rollback");return deny(res,404,"صورت‌مغایرت پیدا نشد");}
  if(!["draft","in_review"].includes(rec.status)){await client.query("rollback");return deny(res,409,"صورت‌مغایرت قفل شده و قابل تغییر نیست");}
  const tx=(await client.query("select * from treasury_bank_transactions where id=$1 and tenant_id=$2 and bank_account_id=$3 and transaction_date<=$4 for update",[transactionId,t.id,rec.treasury_bank_account_id,rec.statement_date])).rows[0];
  if(!tx){await client.query("rollback");return deny(res,404,"گردش بانکی در این صورت‌مغایرت وجود ندارد");}
  const line=(await client.query("select dl.*,d.document_date,d.status document_status from accounting_document_lines dl join accounting_documents d on d.id=dl.document_id and d.tenant_id=$1 where dl.id=$2 and dl.account_id=$3 and d.status='posted' and d.document_date<=$4 for update of dl,d",[t.id,lineId,rec.ledger_account_id,rec.statement_date])).rows[0];
  if(!line){await client.query("rollback");return deny(res,409,"ردیف سند قطعی به حساب بانکی متصل تعلق ندارد");}
  const expected=tx.direction==="credit"?Number(line.debit):Number(line.credit);
  const opposite=tx.direction==="credit"?Number(line.credit):Number(line.debit);
  if(opposite!==0||expected<=0||Math.abs(expected-Number(tx.amount))>0.005){await client.query("rollback");return deny(res,409,"مبلغ یا جهت گردش بانکی با ردیف سند یکسان نیست");}
  const inserted=await client.query("insert into accounting_bank_reconciliation_matches(tenant_id,reconciliation_id,treasury_transaction_id,accounting_document_line_id,matched_amount,created_by) values($1,$2,$3,$4,$5,$6) on conflict do nothing returning *",[t.id,rec.id,tx.id,line.id,Number(tx.amount),actor(req)]);
  if(!inserted.rowCount){await client.query("rollback");return deny(res,409,"این گردش بانکی یا ردیف سند قبلاً در صورت‌مغایرت دیگری تطبیق داده شده است");}
  await client.query("update accounting_bank_reconciliations set status='in_review',updated_at=now() where id=$1 and tenant_id=$2",[rec.id,t.id]);
  await client.query("insert into accounting_finance_audit(tenant_id,entity_type,entity_id,action,actor_user_id,after_data) values($1,'bank_reconciliation_match',$2,'match',$3,$4)",[t.id,inserted.rows[0].id,actor(req),JSON.stringify({reconciliationId:rec.id,treasuryTransactionId:tx.id,accountingDocumentLineId:line.id,amount:tx.amount})]);
  await client.query("commit");res.status(201).json(inserted.rows[0]);
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
});

router.patch("/api/accounting-finance/bank-reconciliations/:id/status",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const s=req.body?.status;
 if(!["draft","in_review","reconciled","approved"].includes(s))return deny(res,400,"وضعیت مغایرت نامعتبر است");
 const old=await query("select * from accounting_bank_reconciliations where id=$1 and tenant_id=$2",[idOf(req,"id"),t.id]);if(!old.rowCount)return deny(res,404,"مغایرت پیدا نشد");
 if(old.rows[0].status==="approved"&&s!=="approved")return deny(res,409,"صورت‌مغایرت تأییدشده قابل بازگشت یا ویرایش مستقیم نیست");
 if(s==="approved"&&old.rows[0].status!=="reconciled")return deny(res,409,"تأیید نهایی فقط پس از تطبیق کامل مجاز است");
 if(s==="reconciled"&&Math.abs(Number(old.rows[0].difference))>0.005)return deny(res,409,"تا رفع اختلاف مانده بانک و دفترکل، وضعیت تطبیق‌شده مجاز نیست");
 if(s==="reconciled"&&old.rows[0].treasury_bank_account_id){const pending=await query("select count(*)::int count from treasury_bank_transactions tx where tx.tenant_id=$1 and tx.bank_account_id=$2 and tx.transaction_date<=$3 and not exists(select 1 from accounting_bank_reconciliation_matches m where m.tenant_id=tx.tenant_id and m.treasury_transaction_id=tx.id)",[t.id,old.rows[0].treasury_bank_account_id,old.rows[0].statement_date]);if(Number(pending.rows[0].count)>0)return deny(res,409,"تا تعیین تکلیف تمام گردش‌های صورت‌حساب، امکان نهایی‌سازی وجود ندارد");}
 const r=await query("update accounting_bank_reconciliations set status=$1,reconciled_by=case when $1 in ('reconciled','approved') then $2 else reconciled_by end,reconciled_at=case when $1 in ('reconciled','approved') then now() else reconciled_at end,updated_at=now() where id=$3 and tenant_id=$4 returning *",[s,actor(req),idOf(req,"id"),t.id]);
 await audit(t.id,actor(req),"bank_reconciliation",idOf(req,"id"),"status",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});

export {router as accountingFinanceOperationsRouter};
