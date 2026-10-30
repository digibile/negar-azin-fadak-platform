import {Router} from "express";
import {query,pool} from "./db.js";
import {requireAuth,requirePermission,requireCsrf} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";
import {normalizeAndValidateIranianIban} from "./iranian-iban.js";
import {ensureCanonicalParty,findCanonicalParty,normalizeNationalId} from "./canonical-party.js";

const router=Router();
const tenantOf=async(req:any)=>resolveTenant(req,req.user);
const idOf=(req:any,k:string)=>Array.isArray(req.params?.[k])?req.params[k][0]:req.params?.[k];
const deny=(res:any,n:number,error:string)=>res.status(n).json({error});
const actor=(req:any)=>req.user.id;
const date=(v:any)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const audit=async(t:string,u:string,type:string,id:string,action:string,b:any,a:any,db:any=pool)=>
 db.query("insert into audit_events(event_type,actor_ref,entity_type,entity_id,payload) values($1,$2,$3,null,$4)",["accounting."+type+"."+action,u,"accounting_"+type,{tenant_id:t,entity_id:id,before:b||null,after:a||null}]);

router.get("/api/accounting-finance/operations-overview",requireAuth,requirePermission("accounting-finance.read"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const [parties,banks,partyBankAccounts,cash,checks,rp,assets,budgets,commitments,recs]=await Promise.all([
  query("select * from accounting_parties where tenant_id=$1 order by party_code",[t.id]),
  query("select * from accounting_bank_accounts where tenant_id=$1 order by code",[t.id]),
  query("select b.*,p.party_code,p.title party_title from accounting_party_bank_accounts b join accounting_parties p on p.id=b.party_id and p.tenant_id=b.tenant_id where b.tenant_id=$1 order by b.created_at desc limit 500",[t.id]),
  query("select * from accounting_cashboxes where tenant_id=$1 order by code",[t.id]),
  query("select * from accounting_checks where tenant_id=$1 order by due_date nulls last,created_at desc limit 200",[t.id]),
  query("select r.*,p.party_code,p.title party_title from accounting_receivable_payables r join accounting_parties p on p.id=r.party_id where r.tenant_id=$1 order by r.due_date nulls last limit 200",[t.id]),
  query("select * from accounting_assets where tenant_id=$1 order by asset_code",[t.id]),
  query("select * from accounting_budgets where tenant_id=$1 order by code",[t.id]),
  query("select * from accounting_commitments where tenant_id=$1 order by due_date nulls last limit 200",[t.id]),
  query("select r.*,b.code bank_code,b.bank_name from accounting_bank_reconciliations r join accounting_bank_accounts b on b.id=r.bank_account_id where r.tenant_id=$1 order by statement_date desc limit 100",[t.id])
 ]);
 res.json({parties:parties.rows,banks:banks.rows,partyBankAccounts:partyBankAccounts.rows,cashboxes:cash.rows,checks:checks.rows,receivablesPayables:rp.rows,assets:assets.rows,budgets:budgets.rows,commitments:commitments.rows,reconciliations:recs.rows});
});

router.post("/api/accounting-finance/parties",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const b=req.body||{};
 if(typeof b.partyCode!=="string"||!b.partyCode.trim()||typeof b.title!=="string"||!b.title.trim())return deny(res,400,"کد و عنوان طرف حساب الزامی است");
 const partyType=["customer","supplier","employee","agent","bank","other"].includes(b.partyType)?b.partyType:"customer";
 const c=await pool.connect();
 try{
  await c.query("begin");
  const existingId=await findCanonicalParty(c,t.id,b.nationalId);
  if(existingId){
   const existing=await c.query("select id,party_code,title from accounting_parties where id=$1 and tenant_id=$2",[existingId,t.id]);
   await c.query("rollback");
   return res.status(409).json({error:"این شناسه ملی قبلاً در مرجع طرف‌حساب ثبت شده است؛ رکورد موجود را انتخاب کنید",existingParty:existing.rows[0]||{id:existingId}});
  }
  const kind=partyType==="customer"?"customer":partyType==="supplier"?"supplier":"other";
  const partyId=await ensureCanonicalParty(c,{
   tenantId:t.id,kind,title:b.title.trim(),nationalId:b.nationalId||null,
   taxId:b.taxId||null,phone:b.phone||null,email:b.email||null,sourceSystem:"accounting_parties"
  });
  const r=await c.query(
   "update accounting_parties set party_code=$1,party_type=$2,title=$3,economic_code=$4,address=$5,default_account_id=$6,credit_limit=$7,payment_term_days=$8,metadata=$9 where id=$10 and tenant_id=$11 returning *",
   [b.partyCode.trim(),partyType,b.title.trim(),b.economicCode||null,b.address||null,b.defaultAccountId||null,Number(b.creditLimit)||0,Math.max(0,Number(b.paymentTermDays)||0),b.metadata||{},partyId,t.id]
  );
  await audit(t.id,actor(req),"party",r.rows[0].id,"create",null,r.rows[0],c);
  await c.query("commit");
  res.status(201).json(r.rows[0]);
 }catch(error:any){
  await c.query("rollback");
  if(error?.statusCode)return deny(res,error.statusCode,error.message);
  throw error;
 }finally{c.release()}
});



router.post("/api/accounting-finance/counterparties",requireAuth,requirePermission("accounting-finance.write"),requireCsrf,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const b=req.body||{},name=String(b.name||"").trim(),iban=normalizeAndValidateIranianIban(b.iban);
 if(!name||name.length>120)return deny(res,400,"نام طرف تسویه الزامی است و حداکثر ۱۲۰ نویسه دارد");
 if(!iban)return deny(res,400,"شماره شبای ایران معتبر نیست");
 const partyType=["customer","supplier","employee","agent","bank","other"].includes(b.partyType)?b.partyType:"other";
 const c=await pool.connect();
 try{
  await c.query("begin");
  const p=await c.query("insert into accounting_parties(tenant_id,party_code,party_type,title,status,metadata) values($1,'CP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),$2,$3,$4,$5) returning *",[t.id,partyType,name,b.isActive===false?"inactive":"active",{sourceSystem:"vamcity",sourceEntity:"CounterParty"}]);
  const a=await c.query("insert into accounting_party_bank_accounts(tenant_id,party_id,account_title,iban,status,verification_status) values($1,$2,$3,$4,$5,'pending') on conflict(tenant_id,iban) do nothing returning *",[t.id,p.rows[0].id,name,iban,b.isActive===false?"inactive":"active"]);
  if(!a.rowCount)throw Object.assign(new Error("این شماره شبا قبلاً در همین سازمان ثبت شده است"),{statusCode:409});
  await audit(t.id,actor(req),"party",p.rows[0].id,"create",null,p.rows[0],c);await audit(t.id,actor(req),"party_bank_account",a.rows[0].id,"create",null,a.rows[0],c);
  await c.query("commit");res.status(201).json({party:p.rows[0],bankAccount:a.rows[0]});
 }catch(e:any){await c.query("rollback");if(e?.statusCode)return deny(res,e.statusCode,e.message);throw e}finally{c.release()}
});

router.patch("/api/accounting-finance/counterparties/:id",requireAuth,requirePermission("accounting-finance.write"),requireCsrf,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const b=req.body||{},id=idOf(req,"id"),name=String(b.name||"").trim();
 if(!name||name.length>120)return deny(res,400,"نام طرف تسویه الزامی است و حداکثر ۱۲۰ نویسه دارد");
 const iban=b.iban===undefined?null:normalizeAndValidateIranianIban(b.iban);
 if(b.iban!==undefined&&!iban)return deny(res,400,"شماره شبای ایران معتبر نیست");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const old=await c.query("select * from accounting_parties where id=$1 and tenant_id=$2 for update",[id,t.id]);
  if(!old.rowCount){await c.query("rollback");return deny(res,404,"طرف حساب پیدا نشد")}
  const status=b.isActive===undefined?old.rows[0].status:(b.isActive===false?"inactive":"active");
  const partyType=["customer","supplier","employee","agent","bank","other"].includes(b.partyType)?b.partyType:old.rows[0].party_type;
  const p=await c.query("update accounting_parties set title=$1,party_type=$2,status=$3,updated_at=now() where id=$4 and tenant_id=$5 returning *",[name,partyType,status,id,t.id]);
  let bankAccount=null;
  if(iban){
   const current=await c.query("select id,iban,status from accounting_party_bank_accounts where tenant_id=$1 and party_id=$2 order by (iban=$3) desc,created_at desc limit 1",[t.id,id,iban]);
   if(!current.rowCount||current.rows[0].iban!==iban){
    const deactivated=await c.query("update accounting_party_bank_accounts set status='inactive',updated_at=now() where tenant_id=$1 and party_id=$2 and status='active' returning *",[t.id,id]);
    for(const account of deactivated.rows)await audit(t.id,actor(req),"party_bank_account",account.id,"deactivate",{...account,status:"active"},account,c);
    const inserted=await c.query("insert into accounting_party_bank_accounts(tenant_id,party_id,account_title,iban,status,verification_status) values($1,$2,$3,$4,$5,'pending') on conflict(tenant_id,iban) do nothing returning *",[t.id,id,name,iban,status]);
    if(!inserted.rowCount)throw Object.assign(new Error("این شماره شبا قبلاً برای طرف دیگری در همین سازمان ثبت شده است"),{statusCode:409});
    bankAccount=inserted.rows[0];
   }else if(status==="active"&&current.rowCount){
    const activated=await c.query("update accounting_party_bank_accounts set status='active',account_title=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[name,current.rows[0].id,t.id]);
    bankAccount=activated.rows[0];
   }
  }
  if(status==="inactive"){const deactivated=await c.query("update accounting_party_bank_accounts set status='inactive',updated_at=now() where tenant_id=$1 and party_id=$2 and status='active' returning *",[t.id,id]);for(const account of deactivated.rows)await audit(t.id,actor(req),"party_bank_account",account.id,"deactivate",{...account,status:"active"},account,c);}
  await audit(t.id,actor(req),"party",id,"update",old.rows[0],p.rows[0],c);
  if(bankAccount)await audit(t.id,actor(req),"party_bank_account",bankAccount.id,"create",null,bankAccount,c);
  await c.query("commit");res.json({party:p.rows[0],bankAccount});
 }catch(e:any){await c.query("rollback");if(e?.statusCode)return deny(res,e.statusCode,e.message);throw e}finally{c.release()}
});

router.patch("/api/accounting-finance/parties/:id",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const b=req.body||{},id=idOf(req,"id");
 if(typeof b.title!=="string"||!b.title.trim())return deny(res,400,"عنوان طرف حساب الزامی است");
 const old=await query("select * from accounting_parties where id=$1 and tenant_id=$2",[id,t.id]);
 if(!old.rowCount)return deny(res,404,"طرف حساب پیدا نشد");
 const r=await query("update accounting_parties set title=$1,national_id=$2,economic_code=$3,tax_id=$4,phone=$5,email=$6,address=$7,status=$8,updated_at=now() where id=$9 and tenant_id=$10 returning *",[b.title.trim(),b.nationalId??old.rows[0].national_id,b.economicCode??old.rows[0].economic_code,b.taxId??old.rows[0].tax_id,b.phone??old.rows[0].phone,b.email??old.rows[0].email,b.address??old.rows[0].address,b.status??old.rows[0].status,id,t.id]);
 await audit(t.id,actor(req),"party",id,"update",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});

router.get("/api/accounting-finance/parties/:partyId/bank-accounts",requireAuth,requirePermission("accounting-finance.read"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const party=await query("select id from accounting_parties where id=$1 and tenant_id=$2",[idOf(req,"partyId"),t.id]);
 if(!party.rowCount)return deny(res,404,"طرف حساب پیدا نشد");
 const r=await query("select * from accounting_party_bank_accounts where tenant_id=$1 and party_id=$2 order by created_at desc",[t.id,party.rows[0].id]);
 res.json({items:r.rows});
});

router.post("/api/accounting-finance/parties/:partyId/bank-accounts",requireAuth,requirePermission("accounting-finance.write"),requireCsrf,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const b=req.body||{},partyId=idOf(req,"partyId"),iban=normalizeAndValidateIranianIban(b.iban);
 if(!iban)return deny(res,400,"شماره شبای ایران معتبر نیست");
 const party=await query("select id from accounting_parties where id=$1 and tenant_id=$2",[partyId,t.id]);
 if(!party.rowCount)return deny(res,404,"طرف حساب پیدا نشد");
 const r=await query("insert into accounting_party_bank_accounts(tenant_id,party_id,account_title,bank_name,branch_name,account_no,iban,card_no) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(tenant_id,iban) do nothing returning *",[t.id,partyId,b.accountTitle||null,b.bankName||null,b.branchName||null,b.accountNo||null,iban,b.cardNo||null]);
 if(!r.rowCount)return deny(res,409,"این شماره شبا قبلاً برای طرف دیگری در همین سازمان ثبت شده است");
 await audit(t.id,actor(req),"party_bank_account",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});


router.patch("/api/accounting-finance/parties/:partyId/bank-accounts/:id/status",requireAuth,requirePermission("accounting-finance.write"),requireCsrf,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const status=req.body?.status;
 if(!["active","inactive","blocked"].includes(status))return deny(res,400,"وضعیت حساب بانکی نامعتبر است");
 const id=idOf(req,"id"),partyId=idOf(req,"partyId"),client=await pool.connect();
 try{
  await client.query("begin");
  const old=await client.query("select * from accounting_party_bank_accounts where id=$1 and party_id=$2 and tenant_id=$3 for update",[id,partyId,t.id]);
  if(!old.rowCount){await client.query("rollback");return deny(res,404,"حساب بانکی طرف حساب پیدا نشد");}
  const updated=await client.query("update accounting_party_bank_accounts set status=$1,updated_at=now() where id=$2 and party_id=$3 and tenant_id=$4 returning *",[status,id,partyId,t.id]);
  await audit(t.id,actor(req),"party_bank_account",id,"status_change",old.rows[0],updated.rows[0],client);
  await client.query("commit");res.json(updated.rows[0]);
 }catch(error){await client.query("rollback");throw error}finally{client.release()}
});

router.patch("/api/accounting-finance/parties/:partyId/bank-accounts/:id/verification",requireAuth,requirePermission("accounting-finance.write"),requireCsrf,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const status=req.body?.verificationStatus,note=String(req.body?.verificationNote||"").trim();
 if(!["pending","verified","rejected"].includes(status))return deny(res,400,"وضعیت احراز شبا نامعتبر است");
 if(status==="rejected"&&!note)return deny(res,400,"برای رد شبا، دلیل بررسی الزامی است");
 const id=idOf(req,"id"),partyId=idOf(req,"partyId");
 const old=await query("select * from accounting_party_bank_accounts where id=$1 and party_id=$2 and tenant_id=$3",[id,partyId,t.id]);
 if(!old.rowCount)return deny(res,404,"حساب بانکی طرف حساب پیدا نشد");
 const r=await query("update accounting_party_bank_accounts set verification_status=$1,verification_note=$2,verification_method=case when $1='verified' then 'manual' else null end,verified_by=case when $1='verified' then $3 else null end,verified_at=case when $1='verified' then now() else null end,updated_at=now() where id=$4 and party_id=$5 and tenant_id=$6 returning *",[status,note||null,actor(req),id,partyId,t.id]);
 await audit(t.id,actor(req),"party_bank_account",id,"verification",old.rows[0],r.rows[0]);res.json(r.rows[0]);
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


const canonicalPartyRegistries:Record<string,{table:string;hasNationalId:boolean;label:string;projection:string;partyColumn?:string;allowMultipleLinks?:boolean}>={
 purchase_suppliers:{table:"purchase_suppliers",hasNationalId:true,label:"تأمین‌کنندگان",projection:"id,code,name as display_name,national_id,phone,party_id"},
 sales_partners:{table:"sales_partners",hasNationalId:true,label:"مشتریان فروش",projection:"id,code,name as display_name,national_id,phone,party_id"},
 payment_merchants:{table:"payment_merchants",hasNationalId:true,label:"پذیرندگان",projection:"id,code,legal_name as display_name,national_id,null::text as phone,party_id"},
 crm_customers:{table:"crm_customers",hasNationalId:true,label:"مشتریان CRM",projection:"id,customer_no as code,full_name as display_name,national_id,mobile as phone,party_id"},
 sellers:{table:"sellers",hasNationalId:false,label:"فروشندگان بازارگاه",projection:"id,null::text as code,legal_name as display_name,null::text as national_id,null::text as phone,party_id"},
 treasury_receipts:{table:"treasury_receipts",hasNationalId:false,label:"دریافت‌های خزانه",projection:"id,receipt_no as code,payer_name as display_name,null::text as national_id,null::text as phone,party_id",allowMultipleLinks:true},
 treasury_checks:{table:"treasury_checks",hasNationalId:false,label:"چک‌ها و اسناد خزانه",projection:"id,check_no as code,case when check_type='received' then issuer_name else coalesce(beneficiary_name,issuer_name) end as display_name,null::text as national_id,null::text as phone,counterparty_party_id as party_id",partyColumn:"counterparty_party_id",allowMultipleLinks:true}
};

router.get("/api/accounting-finance/party-links",requireAuth,requirePermission("accounting-finance.read"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const selected=String(req.query.registry||"");
 if(selected&&!canonicalPartyRegistries[selected])return deny(res,400,"نوع دفتر عملیاتی نامعتبر است");
 const entries=Object.entries(canonicalPartyRegistries).filter(([key])=>!selected||key===selected);
 const results=await Promise.all(entries.map(async([key,item])=>{
  const partyColumn=item.partyColumn||"party_id";
  const r=await query(`select '${key}'::text as registry,'${item.label}'::text as registry_label,${item.projection} from public.${item.table} where tenant_id=$1 and ${partyColumn} is null order by created_at desc limit 250`,[t.id]);
  return r.rows;
 }));
 const items=results.flat();
 res.json({items,total:items.length});
});

router.post("/api/accounting-finance/party-links/:registry/:id",requireAuth,requirePermission("accounting-finance.write"),requireCsrf,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const registry=canonicalPartyRegistries[String(req.params.registry||"")];
 const registryId=idOf(req,"id"),b=req.body||{},partyId=String(b.partyId||"");
 if(!registry)return deny(res,400,"نوع دفتر عملیاتی برای اتصال معتبر نیست");
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(!uuid.test(String(registryId||""))||!uuid.test(partyId))return deny(res,400,"شناسه رکورد یا طرف‌حساب معتبر نیست");
 const method=b.matchMethod;
 if(!["national_id","manual_review"].includes(method)||typeof b.matchEvidence!=="string"||!b.matchEvidence.trim()||b.matchEvidence.trim().length>500||b.confirmMatch!==true)
  return deny(res,400,"روش تطبیق، مستند بررسی و تأیید صریح تطبیق الزامی است");
 if(method==="national_id"&&!registry.hasNationalId)return deny(res,400,"این دفتر شناسه ملی قابل تطبیق خودکار ندارد؛ بررسی دستی لازم است");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const source=await c.query(
   `select id,${registry.partyColumn||"party_id"} as party_id,${registry.hasNationalId?"national_id": "null::text as national_id"} from ${registry.table} where id=$1 and tenant_id=$2 for update`,
   [registryId,t.id]
  );
  if(!source.rowCount){await c.query("rollback");return deny(res,404,"رکورد دفتر عملیاتی پیدا نشد")}
  const party=await c.query("select id,title,national_id,status from accounting_parties where id=$1 and tenant_id=$2 and status='active' for update",[partyId,t.id]);
  if(!party.rowCount){await c.query("rollback");return deny(res,404,"طرف‌حساب مرکزی فعال در همین سازمان پیدا نشد")}
  if(source.rows[0].party_id&&source.rows[0].party_id!==partyId){await c.query("rollback");return deny(res,409,"این رکورد قبلاً به طرف‌حساب دیگری متصل شده است")}
  if(method==="national_id"){
   const sourceCode=normalizeNationalId(source.rows[0].national_id);
   const partyCode=normalizeNationalId(party.rows[0].national_id);
   if(!sourceCode||!partyCode||sourceCode!==partyCode){await c.query("rollback");return deny(res,409,"شناسه ملی دو رکورد یکسان نیست؛ تطبیق دستی و مستند لازم است")}
  }
  const partyColumn=registry.partyColumn||"party_id";
  if(!registry.allowMultipleLinks){
   const duplicate=await c.query(`select id from ${registry.table} where tenant_id=$1 and ${partyColumn}=$2 and id<>$3 limit 1`,[t.id,partyId,registryId]);
   if(duplicate.rowCount){await c.query("rollback");return deny(res,409,"این طرف‌حساب قبلاً به رکورد دیگری از همین دفتر متصل شده است")}
  }
  const linked=await c.query(`update ${registry.table} set ${partyColumn}=$1,updated_at=now() where id=$2 and tenant_id=$3 returning id,${partyColumn} as party_id`,[partyId,registryId,t.id]);
  await audit(t.id,actor(req),"registry_party_link",registryId,"link",source.rows[0],{...linked.rows[0],registry:req.params.registry,partyTitle:party.rows[0].title,matchMethod:method,matchEvidence:b.matchEvidence.trim()},c);
  await c.query("commit");
  res.json({registry:req.params.registry,registryId,partyId,partyTitle:party.rows[0].title,matchMethod:method,linked:true});
 }catch(error:any){await c.query("rollback");if(error?.code==="23505")return deny(res,409,"این طرف‌حساب قبلاً به رکورد دیگری از همین دفتر متصل شده است");throw error}finally{c.release()}
});

export {router as accountingFinanceOperationsRouter};
