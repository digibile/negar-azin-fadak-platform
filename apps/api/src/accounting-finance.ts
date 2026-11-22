import {Router,type Request,type Response} from "express";
import {query,pool} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";

const router=Router();
const tenantOf=async(req:Request)=>resolveTenant(req,(req as any).user);
const okDate=(v:unknown)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const deny=(res:Response,n:number,error:string)=>res.status(n).json({error});
const audit=async(t:string,u:string,e:string,id:string,a:string,b:any,x:any)=>query("insert into accounting_finance_audit(tenant_id,entity_type,entity_id,action,actor_user_id,before_data,after_data) values($1,$2,$3,$4,$5,$6,$7)",[t,e,id,a,u,b||null,x||null]);

router.get("/api/accounting-finance/overview",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const [books,periods,docs,centers,accounts,summary]=await Promise.all([
  query("select id,code,title,book_mode,currency,fiscal_year,is_default,status from accounting_books where tenant_id=$1 order by is_default desc,code",[t.id]),
  query("select p.id,p.code,p.title,p.starts_on,p.ends_on,p.status,p.book_id,b.title book_title from accounting_fiscal_periods p join accounting_books b on b.id=p.book_id where p.tenant_id=$1 order by p.starts_on desc",[t.id]),
  query("select d.id,d.document_no,d.document_date,d.document_type,d.description,d.status,d.book_id,d.period_id,b.title book_title,p.title period_title,coalesce(sum(l.debit),0)::numeric total_debit,coalesce(sum(l.credit),0)::numeric total_credit from accounting_documents d join accounting_books b on b.id=d.book_id left join accounting_fiscal_periods p on p.id=d.period_id left join accounting_document_lines l on l.document_id=d.id where d.tenant_id=$1 group by d.id,b.title,p.title order by d.document_date desc limit 200",[t.id]),
  query("select c.id,c.code,c.title,c.center_type,c.status,c.parent_id,u.full_name manager_name from accounting_cost_centers c left join users u on u.id=c.manager_user_id where c.tenant_id=$1 order by c.code",[t.id]),
  query("select id,code,name,account_type,account_mode,book_id,parent_id from ledger_accounts where tenant_id=$1 order by code",[t.id]),
  query("select coalesce(sum(l.debit),0)::numeric debit,coalesce(sum(l.credit),0)::numeric credit,count(distinct d.id)::int document_count from accounting_documents d join accounting_document_lines l on l.document_id=d.id where d.tenant_id=$1 and d.status='posted'",[t.id])
 ]);
 res.json({books:books.rows,periods:periods.rows,documents:docs.rows,costCenters:centers.rows,accounts:accounts.rows,summary:summary.rows[0]});
});

router.post("/api/accounting-finance/accounts",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const {code,name,accountType="general",accountMode="hybrid",bookId=null,externalCode=null,parentId=null}=req.body||{};
 if(typeof code!=="string"||typeof name!=="string"||!["official","internal","hybrid"].includes(accountMode))return deny(res,400,"اطلاعات حساب نامعتبر است");
 if(bookId){const b=await query("select id from accounting_books where id=$1 and tenant_id=$2",[bookId,t.id]);if(!b.rowCount)return deny(res,404,"دفتر حسابداری پیدا نشد")}
 if(parentId){const p=await query("select id from ledger_accounts where id=$1 and tenant_id=$2",[parentId,t.id]);if(!p.rowCount)return deny(res,404,"حساب والد پیدا نشد")}
 const r=await query("insert into ledger_accounts(tenant_id,code,name,account_type,account_mode,book_id,external_code,parent_id) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,code,name,account_type,account_mode,book_id,external_code,parent_id",[t.id,code.trim(),name.trim(),accountType,accountMode,bookId,externalCode,parentId]);
 await audit(t.id,(req as any).user.id,"ledger_account",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/accounting-finance/accounts/:id",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const old=await query("select * from ledger_accounts where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!old.rowCount)return deny(res,404,"حساب پیدا نشد");
 const {name,accountType,accountMode,externalCode}=req.body||{};if(accountMode&&!["official","internal","hybrid"].includes(accountMode))return deny(res,400,"ماهیت حساب نامعتبر است");
 const r=await query("update ledger_accounts set name=coalesce($1,name),account_type=coalesce($2,account_type),account_mode=coalesce($3,account_mode),external_code=coalesce($4,external_code) where id=$5 and tenant_id=$6 returning id,code,name,account_type,account_mode,book_id,external_code,parent_id",[typeof name==="string"?name.trim():null,accountType||null,accountMode||null,externalCode??null,String(String(req.params.id)),t.id]);
 await audit(t.id,(req as any).user.id,"ledger_account",String(String(req.params.id)),"update",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});

router.post("/api/accounting-finance/periods",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const {bookId,code,title,startsOn,endsOn}=req.body||{};
 if(typeof bookId!=="string"||typeof code!=="string"||typeof title!=="string"||!okDate(startsOn)||!okDate(endsOn)||startsOn>endsOn)return deny(res,400,"اطلاعات دوره مالی نامعتبر است");
 const b=await query("select id from accounting_books where id=$1 and tenant_id=$2",[bookId,t.id]);if(!b.rowCount)return deny(res,404,"دفتر پیدا نشد");
 const r=await query("insert into accounting_fiscal_periods(tenant_id,book_id,code,title,starts_on,ends_on) values($1,$2,$3,$4,$5,$6) returning *",[t.id,bookId,code.trim(),title.trim(),startsOn,endsOn]);
 await audit(t.id,(req as any).user.id,"fiscal_period",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});

router.patch("/api/accounting-finance/periods/:id/status",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const s=req.body?.status;if(!["open","closed","locked"].includes(s))return deny(res,400,"وضعیت دوره نامعتبر است");
 const old=await query("select * from accounting_fiscal_periods where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!old.rowCount)return deny(res,404,"دوره پیدا نشد");
 if(old.rows[0].status==="locked"&&s!=="locked")return deny(res,409,"دوره قفل‌شده قابل بازگشایی نیست");
 const r=await query("update accounting_fiscal_periods set status=$1,closed_at=case when $1 in ('closed','locked') then coalesce(closed_at,now()) else null end,closed_by=case when $1 in ('closed','locked') then $2 else null end,updated_at=now() where id=$3 and tenant_id=$4 returning *",[s,(req as any).user.id,String(String(req.params.id)),t.id]);
 await audit(t.id,(req as any).user.id,"fiscal_period",String(String(req.params.id)),"status",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});

router.post("/api/accounting-finance/cost-centers",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const {code,title,centerType="cost",parentId=null,managerUserId=null}=req.body||{};
 if(typeof code!=="string"||typeof title!=="string"||!["cost","revenue","profit"].includes(centerType))return deny(res,400,"اطلاعات مرکز نامعتبر است");
 const r=await query("insert into accounting_cost_centers(tenant_id,code,title,center_type,parent_id,manager_user_id) values($1,$2,$3,$4,$5,$6) returning *",[t.id,code.trim(),title.trim(),centerType,parentId,managerUserId||null]);
 await audit(t.id,(req as any).user.id,"cost_center",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/accounting-finance/cost-centers/:id",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const old=await query("select * from accounting_cost_centers where id=$1 and tenant_id=$2",[String(String(req.params.id)),t.id]);if(!old.rowCount)return deny(res,404,"مرکز پیدا نشد");
 const {title,status,centerType}=req.body||{};if(status&&!["active","inactive"].includes(status))return deny(res,400,"وضعیت نامعتبر است");
 const r=await query("update accounting_cost_centers set title=coalesce($1,title),status=coalesce($2,status),center_type=coalesce($3,center_type),updated_at=now() where id=$4 and tenant_id=$5 returning *",[typeof title==="string"?title.trim():null,status||null,centerType||null,String(String(req.params.id)),t.id]);
 await audit(t.id,(req as any).user.id,"cost_center",String(String(req.params.id)),"update",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});

router.post("/api/accounting-finance/documents",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const {bookId,periodId=null,documentNo,documentDate,documentType="journal",description="",lines=[]}=req.body||{};
 if(typeof bookId!=="string"||typeof documentNo!=="string"||!okDate(documentDate)||!Array.isArray(lines)||lines.length<2)return deny(res,400,"سند و حداقل دو ردیف لازم است");
 const b=await query("select id from accounting_books where id=$1 and tenant_id=$2",[bookId,t.id]);if(!b.rowCount)return deny(res,404,"دفتر پیدا نشد");
 if(periodId){const p=await query("select status from accounting_fiscal_periods where id=$1 and tenant_id=$2",[periodId,t.id]);if(!p.rowCount)return deny(res,404,"دوره پیدا نشد");if(p.rows[0].status!=="open")return deny(res,409,"دوره بسته است");}
 const ids=lines.map((x:any)=>x.accountId);const ar=await query("select id from ledger_accounts where tenant_id=$1 and id=any($2::uuid[])",[t.id,ids]);if(ar.rowCount!==new Set(ids).size)return deny(res,400,"حساب سند معتبر نیست");
 let debit=0,credit=0;for(const x of lines){const d=Number(x.debit||0),c=Number(x.credit||0);if((d>0)===(c>0)||d<0||c<0)return deny(res,400,"هر ردیف فقط بدهکار یا بستانکار باشد");debit+=d;credit+=c;}if(Math.abs(debit-credit)>0.005)return deny(res,400,"سند متوازن نیست");
 const c=await pool.connect();try{await c.query("begin");const d=await c.query("insert into accounting_documents(tenant_id,book_id,period_id,document_no,document_date,document_type,description,created_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning *",[t.id,bookId,periodId,documentNo.trim(),documentDate,documentType,String(description).trim(),(req as any).user.id]);for(let i=0;i<lines.length;i++){const x=lines[i];await c.query("insert into accounting_document_lines(document_id,line_no,account_id,cost_center_id,description,debit,credit,dimensions) values($1,$2,$3,$4,$5,$6,$7,$8)",[d.rows[0].id,i+1,x.accountId,x.costCenterId||null,String(x.description||"").trim(),Number(x.debit||0),Number(x.credit||0),x.dimensions||{}]);}await c.query("commit");await audit(t.id,(req as any).user.id,"accounting_document",d.rows[0].id,"create",null,d.rows[0]);res.status(201).json(d.rows[0]);}catch(e){await c.query("rollback");throw e}finally{c.release();}
});

router.get("/api/accounting-finance/documents/:id",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const d=await query("select d.*,b.title book_title,p.title period_title from accounting_documents d join accounting_books b on b.id=d.book_id left join accounting_fiscal_periods p on p.id=d.period_id where d.id=$1 and d.tenant_id=$2",[String(String(req.params.id)),t.id]);if(!d.rowCount)return deny(res,404,"سند پیدا نشد");
 const l=await query("select l.*,a.code account_code,a.name account_name,c.code cost_center_code,c.title cost_center_title from accounting_document_lines l join ledger_accounts a on a.id=l.account_id left join accounting_cost_centers c on c.id=l.cost_center_id where l.document_id=$1 order by l.line_no",[String(String(req.params.id))]);res.json({document:d.rows[0],lines:l.rows});
});


router.post("/api/accounting-finance/carrier-invoices/:invoiceId/payments",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const {payableId,amount,paymentDate,bookId,periodId,documentNo,paymentNo,bankAccountId=null,cashboxId=null,referenceNo=null}=req.body||{};
 const value=Number(amount);
 if(typeof payableId!=="string"||!Number.isFinite(value)||value<=0||Math.abs(value*100-Math.round(value*100))>0.000001||!okDate(paymentDate)||typeof bookId!=="string"||typeof periodId!=="string"||typeof documentNo!=="string"||!documentNo.trim()||documentNo.length>120||typeof paymentNo!=="string"||!paymentNo.trim()||paymentNo.length>120||Boolean(bankAccountId)===Boolean(cashboxId))return deny(res,400,"مبلغ، تاریخ، دفتر، دوره، شماره سند و پرداخت و دقیقاً یک حساب بانک یا صندوق الزامی است");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const invoice=(await c.query("select * from logistics_carrier_invoices where id=$1 and tenant_id=$2 for update",[String(req.params.invoiceId),t.id])).rows[0];
  if(!invoice||invoice.status!=="posted"){await c.query("rollback");return deny(res,409,"صورتحساب حمل باید قطعی شده باشد");}
  const payable=(await c.query("select * from accounting_receivable_payables where id=$1 and tenant_id=$2 and direction='payable' for update",[payableId,t.id])).rows[0];
  if(!payable||payable.status==="cancelled"||payable.metadata?.carrierInvoiceId!==invoice.id||payable.party_id!==invoice.carrier_party_id||payable.document_id!==invoice.accounting_document_id||Math.abs(Number(payable.original_amount)-Number(invoice.total_amount))>0.005){await c.query("rollback");return deny(res,404,"بدهی پرداختنی متناظر با این صورتحساب پیدا نشد");}
  const remaining=Number(payable.original_amount)-Number(payable.settled_amount);
  if(remaining<=0.005||value>remaining+0.005){await c.query("rollback");return deny(res,409,"مبلغ پرداخت از مانده بدهی بیشتر است یا بدهی تسویه شده است");}
  const book=(await c.query("select id,currency,status from accounting_books where id=$1 and tenant_id=$2 for share",[bookId,t.id])).rows[0];
  if(!book||book.status!=="active"||String(book.currency||"").toUpperCase()!==String(payable.currency).toUpperCase()){await c.query("rollback");return deny(res,409,"دفتر فعال با ارز بدهی انتخاب کنید");}
  const period=(await c.query("select id,book_id,starts_on,ends_on,status from accounting_fiscal_periods where id=$1 and tenant_id=$2 for share",[periodId,t.id])).rows[0];
  if(!period||period.book_id!==bookId||period.status!=="open"||paymentDate<String(period.starts_on).slice(0,10)||paymentDate>String(period.ends_on).slice(0,10)){await c.query("rollback");return deny(res,409,"دوره مالی باید باز و شامل تاریخ پرداخت باشد");}
  const originalLine=(await c.query("select l.account_id,a.account_type,a.account_nature from accounting_document_lines l join ledger_accounts a on a.id=l.account_id where l.document_id=$1 and l.credit>0 order by l.line_no desc limit 1",[payable.document_id])).rows[0];
  if(!originalLine||!(originalLine.account_nature==="liability"||["liability","payable","debt"].includes(originalLine.account_type))){await c.query("rollback");return deny(res,409,"حساب کنترل بدهی در سند اصلی پیدا نشد یا ماهیت آن معتبر نیست");}
  let treasury:any=null,treasuryAccountId:string;
  if(bankAccountId){
   treasury=(await c.query("select id,ledger_account_id,currency,current_balance,status from treasury_bank_accounts where id=$1 and tenant_id=$2 for update",[bankAccountId,t.id])).rows[0];
   if(!treasury||treasury.status!=="active"||String(treasury.currency).toUpperCase()!==String(payable.currency).toUpperCase()||!treasury.ledger_account_id){await c.query("rollback");return deny(res,409,"حساب بانکی فعال با ارز و حساب معین معتبر انتخاب کنید");}
   treasuryAccountId=treasury.ledger_account_id;
  }else{
   treasury=(await c.query("select id,ledger_account_id,current_balance,status from treasury_cashboxes where id=$1 and tenant_id=$2 for update",[cashboxId,t.id])).rows[0];
   if(!treasury||treasury.status!=="active"||!treasury.ledger_account_id||String(payable.currency).toUpperCase()!=="IRR"){await c.query("rollback");return deny(res,409,"صندوق فعال با حساب معین معتبر فقط برای پرداخت ریالی قابل استفاده است");}
   treasuryAccountId=treasury.ledger_account_id;
  }
  if(Number(treasury.current_balance)+0.005<value){await c.query("rollback");return deny(res,409,"موجودی بانک یا صندوق برای این پرداخت کافی نیست");}
  const accounts=(await c.query("select id,account_type,account_nature,book_id,is_active,is_postable,status from ledger_accounts where tenant_id=$1 and id=any($2::uuid[]) for share",[t.id,[originalLine.account_id,treasuryAccountId]])).rows;
  if(accounts.length!==2||accounts.some((a:any)=>a.status!=="active"||a.is_active===false||a.is_postable===false||(a.book_id&&a.book_id!==bookId))){await c.query("rollback");return deny(res,409,"حساب بدهی یا خزانه غیرفعال، غیرقابل ثبت یا متعلق به دفتر دیگری است");}
  const treasuryAccount=accounts.find((a:any)=>a.id===treasuryAccountId);
  if(!(treasuryAccount.account_nature==="asset"||["asset","cash","bank"].includes(treasuryAccount.account_type))){await c.query("rollback");return deny(res,409,"حساب بانک یا صندوق باید ماهیت دارایی داشته باشد");}
  const payment=(await c.query("insert into treasury_payments(tenant_id,bank_account_id,cashbox_id,payment_no,payment_date,amount,payee_name,reference_no,method,description,status,created_by,carrier_invoice_id,payable_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12,$13) returning *",[t.id,bankAccountId,cashboxId,paymentNo.trim(),paymentDate,value,"شرکت حمل صورتحساب "+invoice.invoice_no,referenceNo,bankAccountId?"bank_transfer":"cash","پرداخت صورتحساب حمل "+invoice.invoice_no,(req as any).user.id,invoice.id,payable.id])).rows[0];
  const doc=(await c.query("insert into accounting_documents(tenant_id,book_id,period_id,document_no,document_date,document_type,description,created_by,source_module,source_document_id,is_automatic) values($1,$2,$3,$4,$5,'payment',$6,$7,'logistics-carrier-payment',$8,true) returning *",[t.id,bookId,periodId,documentNo.trim(),paymentDate,"پیش‌نویس پرداخت صورتحساب حمل "+invoice.invoice_no,(req as any).user.id,payment.id])).rows[0];
  await c.query("insert into accounting_document_lines(document_id,line_no,account_id,description,debit,credit,dimensions) values($1,1,$2,$3,$4,0,$5)",[doc.id,originalLine.account_id,"کاهش بدهی شرکت حمل بابت صورتحساب "+invoice.invoice_no,value,JSON.stringify({sourceModule:"logistics-carrier-payment",carrierPaymentId:payment.id,carrierInvoiceId:invoice.id,payableId:payable.id})]);
  await c.query("insert into accounting_document_lines(document_id,line_no,account_id,description,debit,credit,dimensions) values($1,2,$2,$3,0,$4,$5)",[doc.id,treasuryAccountId,bankAccountId?"پرداخت از حساب بانکی":"پرداخت از صندوق",value,JSON.stringify({sourceModule:"logistics-carrier-payment",carrierPaymentId:payment.id,bankAccountId:bankAccountId||null,cashboxId:cashboxId||null})]);
  const linked=(await c.query("update treasury_payments set accounting_document_id=$1,updated_at=now() where id=$2 and tenant_id=$3 and accounting_document_id is null returning *",[doc.id,payment.id,t.id])).rows[0];
  if(!linked){await c.query("rollback");return deny(res,409,"اتصال سند پرداخت به درخواست پرداخت انجام نشد");}
  await c.query("insert into accounting_finance_audit(tenant_id,entity_type,entity_id,action,actor_user_id,after_data) values($1,'treasury_payment',$2,'create_carrier_payment_draft',$3,$4)",[t.id,payment.id,(req as any).user.id,JSON.stringify({invoiceId:invoice.id,payableId:payable.id,documentId:doc.id,amount:value})]);
  await c.query("commit");
  res.status(201).json({payment:linked,accountingDocument:doc,payableStatus:payable.status,settlementStatus:"not_updated_until_document_posting"});
 }catch(e:any){await c.query("rollback");if(e?.code==="23505")return deny(res,409,"شماره پرداخت یا سند تکراری است");throw e;}finally{c.release();}
});

router.get("/api/accounting-finance/carrier-invoices/:invoiceId/payments",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const r=await query("select p.*,d.document_no,d.status document_status,b.bank_name,b.account_title,c.title cashbox_title from treasury_payments p left join accounting_documents d on d.id=p.accounting_document_id and d.tenant_id=p.tenant_id left join treasury_bank_accounts b on b.id=p.bank_account_id and b.tenant_id=p.tenant_id left join treasury_cashboxes c on c.id=p.cashbox_id and c.tenant_id=p.tenant_id where p.tenant_id=$1 and p.carrier_invoice_id=$2 order by p.payment_date desc,p.created_at desc",[t.id,String(req.params.invoiceId)]);
 res.json({items:r.rows});
});

router.patch("/api/accounting-finance/documents/:id/status",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");
 const nextStatus=req.body?.status;
 if(!["submitted","approved","posted","void"].includes(nextStatus))return deny(res,400,"وضعیت سند نامعتبر است");
 const c=await pool.connect();
 try{
  await c.query("begin");
  const old=(await c.query("select * from accounting_documents where id=$1 and tenant_id=$2 for update",[String(req.params.id),t.id])).rows[0];
  if(!old){await c.query("rollback");return deny(res,404,"سند پیدا نشد");}
  const flow:any={draft:["submitted","void"],submitted:["approved","void"],approved:["posted","void"],posted:["void"],void:[]};
  if(!flow[old.status]?.includes(nextStatus)){await c.query("rollback");return deny(res,409,"تغییر وضعیت مجاز نیست");}
  let carrierInvoice:any=null;
  let carrierPayment:any=null;
  if(nextStatus==="void"&&old.source_module==="logistics-carrier-payment"){
   carrierPayment=(await c.query("select * from treasury_payments where id=$1 and tenant_id=$2 for update",[old.source_document_id,t.id])).rows[0];
   if(!carrierPayment||carrierPayment.document_id!==old.id||carrierPayment.status==="paid"){
    await c.query("rollback");return deny(res,409,"پرداخت قطعی‌شده قابل ابطال مستقیم نیست؛ ابتدا باید سند برگشت ثبت شود");
   }
   if(!["pending","approved"].includes(carrierPayment.status)){await c.query("rollback");return deny(res,409,"وضعیت پرداخت برای ابطال معتبر نیست");}
  }
  if(nextStatus==="void"&&old.source_module==="logistics-carrier-invoice"){
   carrierInvoice=(await c.query("select * from logistics_carrier_invoices where id=$1 and tenant_id=$2 for update",[old.source_document_id,t.id])).rows[0];
   if(!carrierInvoice||carrierInvoice.accounting_document_id!==old.id||carrierInvoice.status==="posted"){
    await c.query("rollback");return deny(res,409,"صورتحساب قطعی‌شده قابل ابطال مستقیم نیست؛ ابتدا باید سند برگشت ثبت شود");
   }
   if(carrierInvoice.status!=="verified"){
    await c.query("rollback");return deny(res,409,"وضعیت صورتحساب حمل برای ابطال سند معتبر نیست");
   }
  }
  if(nextStatus==="posted"&&old.source_module==="logistics-carrier-payment"){
   carrierPayment=(await c.query("select * from treasury_payments where id=$1 and tenant_id=$2 for update",[old.source_document_id,t.id])).rows[0];
   if(!carrierPayment||carrierPayment.document_id!==old.id||carrierPayment.status!=="approved"){
    await c.query("rollback");return deny(res,409,"درخواست پرداخت با این سند تطبیق ندارد یا قبلاً قطعی شده است");
   }
   const invoice=(await c.query("select * from logistics_carrier_invoices where id=$1 and tenant_id=$2 for share",[carrierPayment.carrier_invoice_id,t.id])).rows[0];
   const payable=(await c.query("select * from accounting_receivable_payables where id=$1 and tenant_id=$2 and direction='payable' for update",[carrierPayment.payable_id,t.id])).rows[0];
   if(!invoice||invoice.status!=="posted"||!payable||payable.metadata?.carrierInvoiceId!==invoice.id||payable.party_id!==invoice.carrier_party_id||payable.document_id!==invoice.accounting_document_id||Math.abs(Number(payable.original_amount)-Number(invoice.total_amount))>0.005||payable.status==="cancelled"){
    await c.query("rollback");return deny(res,409,"صورتحساب یا بدهی متناظر با پرداخت معتبر نیست");
   }
   carrierPayment.currency=invoice.currency;
   const remaining=Number(payable.original_amount)-Number(payable.settled_amount);
   if(Number(carrierPayment.amount)>remaining+0.005){await c.query("rollback");return deny(res,409,"مبلغ پرداخت از مانده بدهی بیشتر شده است");}
   const lines=(await c.query("select account_id,debit,credit from accounting_document_lines where document_id=$1 order by line_no",[old.id])).rows;
   if(lines.length!==2||Math.abs(Number(lines[0].debit)-Number(carrierPayment.amount))>0.005||Number(lines[0].credit)!==0||Number(lines[1].debit)!==0||Math.abs(Number(lines[1].credit)-Number(carrierPayment.amount))>0.005){
    await c.query("rollback");return deny(res,409,"ردیف‌های سند پرداخت با مبلغ درخواست پرداخت برابر نیست");
   }
   if(carrierPayment.bank_account_id){
    const bank=(await c.query("select id,ledger_account_id,current_balance,status,currency from treasury_bank_accounts where id=$1 and tenant_id=$2 for update",[carrierPayment.bank_account_id,t.id])).rows[0];
    if(!bank||bank.status!=="active"||bank.ledger_account_id!==lines[1].account_id||String(bank.currency).toUpperCase()!==String(carrierPayment.currency).toUpperCase()||Number(bank.current_balance)+0.005<Number(carrierPayment.amount)){
     await c.query("rollback");return deny(res,409,"موجودی یا وضعیت حساب بانکی برای قطعی‌سازی پرداخت معتبر نیست");
    }
    carrierPayment.treasuryBalance=Number(bank.current_balance);
   }else{
    const cash=(await c.query("select id,ledger_account_id,current_balance,status from treasury_cashboxes where id=$1 and tenant_id=$2 for update",[carrierPayment.cashbox_id,t.id])).rows[0];
    if(!cash||cash.status!=="active"||cash.ledger_account_id!==lines[1].account_id||String(carrierPayment.currency).toUpperCase()!=="IRR"||Number(cash.current_balance)+0.005<Number(carrierPayment.amount)){
     await c.query("rollback");return deny(res,409,"موجودی یا وضعیت صندوق برای قطعی‌سازی پرداخت معتبر نیست");
    }
    carrierPayment.treasuryBalance=Number(cash.current_balance);
   }
   carrierPayment.payable=payable;
  }
  if(nextStatus==="posted"&&old.source_module==="logistics-carrier-invoice"){
   carrierInvoice=(await c.query("select * from logistics_carrier_invoices where id=$1 and tenant_id=$2 for update",[old.source_document_id,t.id])).rows[0];
   if(!carrierInvoice||carrierInvoice.accounting_document_id!==old.id||carrierInvoice.status!=="verified"){
    await c.query("rollback");return deny(res,409,"صورتحساب حمل با این سند تطبیق ندارد یا قبلاً قطعی شده است");
   }
   const sums=(await c.query("select coalesce(sum(debit),0)::numeric debit,coalesce(sum(credit),0)::numeric credit from accounting_document_lines where document_id=$1",[old.id])).rows[0];
   if(Math.abs(Number(sums.debit)-Number(carrierInvoice.total_amount))>0.005||Math.abs(Number(sums.credit)-Number(carrierInvoice.total_amount))>0.005){
    await c.query("rollback");return deny(res,409,"جمع بدهکار و بستانکار سند با مبلغ صورتحساب حمل برابر نیست");
   }
  }
  if(nextStatus==="posted"){
   if(old.period_id){
    const period=(await c.query("select status from accounting_fiscal_periods where id=$1 and tenant_id=$2 for update",[old.period_id,t.id])).rows[0];
    if(!period||period.status!=="open"){await c.query("rollback");return deny(res,409,"دوره مالی سند باز نیست");}
   }
   const sums=(await c.query("select coalesce(sum(debit),0)::numeric debit,coalesce(sum(credit),0)::numeric credit from accounting_document_lines where document_id=$1",[old.id])).rows[0];
   if(Number(sums.debit)<=0||Number(sums.credit)<=0||Math.abs(Number(sums.debit)-Number(sums.credit))>0.005){
    await c.query("rollback");return deny(res,409,"سند برای قطعی‌سازی متوازن نیست");
   }
  }
  const updated=(await c.query("update accounting_documents set status=$1,approved_by=case when $1='approved' then $2 else approved_by end,posted_at=case when $1='posted' then now() else posted_at end,posted_by=case when $1='posted' then $2 else posted_by end,updated_at=now() where id=$3 and tenant_id=$4 returning *",[nextStatus,(req as any).user.id,old.id,t.id])).rows[0];
  if(nextStatus==="approved"&&old.source_module==="logistics-carrier-payment"){
   carrierPayment=(await c.query("select * from treasury_payments where id=$1 and tenant_id=$2 for update",[old.source_document_id,t.id])).rows[0];
   if(!carrierPayment||carrierPayment.accounting_document_id!==old.id||carrierPayment.status!=="pending"){
    await c.query("rollback");return deny(res,409,"درخواست پرداخت با سند تأییدشده تطبیق ندارد");
   }
   const approvedPayment=await c.query("update treasury_payments set status='approved',approved_by=$1,updated_at=now() where id=$2 and tenant_id=$3 and status='pending' returning id",[(req as any).user.id,carrierPayment.id,t.id]);
   if(!approvedPayment.rowCount){await c.query("rollback");return deny(res,409,"تأیید درخواست پرداخت انجام نشد");}
  }
  if(nextStatus==="void"&&carrierPayment){
   await c.query("update treasury_payments set status='cancelled',updated_at=now() where id=$1 and tenant_id=$2 and status in ('pending','approved')",[carrierPayment.id,t.id]);
   await c.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,'logistics.carrier_payment_voided','logistics_carrier_payment',$3,$4,$5)",[t.id,(req as any).user.id,carrierPayment.id,JSON.stringify({status:carrierPayment.status}),JSON.stringify({status:"cancelled",documentId:old.id})]);
  }
  if(nextStatus==="void"&&carrierInvoice){
   const invoiceVoid=await c.query("update logistics_carrier_invoices set status='void',updated_at=now() where id=$1 and tenant_id=$2 and status='verified' and accounting_document_id=$3",[carrierInvoice.id,t.id,old.id]);
   if(!invoiceVoid.rowCount){await c.query("rollback");return deny(res,409,"ابطال صورتحساب حمل انجام نشد");}
   await c.query("insert into logistics_events(tenant_id,entity_type,entity_id,event_type,from_status,to_status,actor_user_id,reason) values($1,'carrier_invoice',$2,'carrier_invoice_voided','verified','void',$3,$4)",[t.id,carrierInvoice.id,(req as any).user.id,"سند حسابداری "+old.document_no+" ابطال شد"]);
   await c.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,'logistics.carrier_invoice_voided','logistics_carrier_invoice',$3,$4,$5)",[t.id,(req as any).user.id,carrierInvoice.id,JSON.stringify({status:"verified",accountingDocumentId:old.id}),JSON.stringify({status:"void",accountingDocumentId:old.id})]);
  }
  if(nextStatus==="posted"&&carrierPayment){
   const amount=Number(carrierPayment.amount);
   const updatedPayable=(await c.query("update accounting_receivable_payables set settled_amount=settled_amount+$1,status=case when settled_amount+$1>=original_amount-0.005 then 'settled' else 'partially_settled' end,updated_at=now() where id=$2 and tenant_id=$3 and direction='payable' and settled_amount+$1<=original_amount+0.005 returning *",[amount,carrierPayment.payable_id,t.id])).rows[0];
   if(!updatedPayable){await c.query("rollback");return deny(res,409,"به‌روزرسانی مانده بدهی انجام نشد؛ احتمالاً پرداخت هم‌زمان دیگری ثبت شده است");}
   if(carrierPayment.bank_account_id){
    const balance=await c.query("update treasury_bank_accounts set current_balance=current_balance-$1,updated_at=now() where id=$2 and tenant_id=$3 and status='active' and current_balance >= $1 returning current_balance",[amount,carrierPayment.bank_account_id,t.id]);
    if(!balance.rowCount){await c.query("rollback");return deny(res,409,"کاهش موجودی بانک انجام نشد");}
    await c.query("insert into treasury_bank_transactions(tenant_id,bank_account_id,transaction_date,value_date,reference_no,description,amount,direction,reconciliation_status) values($1,$2,$3,$3,$4,$5,$6,'debit','unmatched')",[t.id,carrierPayment.bank_account_id,carrierPayment.payment_date,carrierPayment.reference_no,"پرداخت صورتحساب حمل "+carrierPayment.payment_no,amount]);
   }else{
    const balance=await c.query("update treasury_cashboxes set current_balance=current_balance-$1,updated_at=now() where id=$2 and tenant_id=$3 and status='active' and current_balance >= $1 returning current_balance",[amount,carrierPayment.cashbox_id,t.id]);
    if(!balance.rowCount){await c.query("rollback");return deny(res,409,"کاهش موجودی صندوق انجام نشد");}
    await c.query("insert into treasury_cash_movements(tenant_id,cashbox_id,movement_no,movement_date,amount,direction,description,reference_no,status,created_by) values($1,$2,$3,$4,$5,'out',$6,$7,'posted',$8)",[t.id,carrierPayment.cashbox_id,carrierPayment.payment_no,carrierPayment.payment_date,amount,"پرداخت صورتحساب حمل "+carrierPayment.payment_no,carrierPayment.reference_no,(req as any).user.id]);
   }
   const postedPayment=(await c.query("update treasury_payments set status='paid',paid_at=now(),updated_at=now() where id=$2 and tenant_id=$3 and status='approved' returning *",[null,carrierPayment.id,t.id])).rows[0];
   if(!postedPayment){await c.query("rollback");return deny(res,409,"تغییر وضعیت پرداخت انجام نشد");}
   await c.query("insert into logistics_events(tenant_id,entity_type,entity_id,event_type,from_status,to_status,actor_user_id,reason) values($1,'carrier_payment',$2,'carrier_payment_paid','approved','paid',$3,$4)",[t.id,carrierPayment.id,(req as any).user.id,"پرداخت صورتحساب حمل به مبلغ "+amount+" انجام شد"]);
   await c.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,'logistics.carrier_payment_posted','logistics_carrier_payment',$3,$4,$5)",[t.id,(req as any).user.id,carrierPayment.id,JSON.stringify({status:"approved",payableSettledAmount:carrierPayment.payable.settled_amount}),JSON.stringify({status:"paid",payableSettledAmount:updatedPayable.settled_amount,payableStatus:updatedPayable.status,amount,treasuryBalance:carrierPayment.treasuryBalance-amount})]);
  }
  let payable:any=null;
  if(nextStatus==="posted"&&carrierInvoice){
   payable=(await c.query(
    "insert into accounting_receivable_payables(tenant_id,party_id,document_id,direction,reference_no,issue_date,original_amount,currency,status,description,metadata,created_by) values($1,$2,$3,'payable',$4,$5,$6,$7,'open',$8,$9,$10) returning *",
    [t.id,carrierInvoice.carrier_party_id,old.id,carrierInvoice.invoice_no,carrierInvoice.invoice_date,carrierInvoice.total_amount,carrierInvoice.currency,"بدهی شرکت حمل بابت صورتحساب "+carrierInvoice.invoice_no,JSON.stringify({sourceModule:"logistics-carrier-invoice",carrierInvoiceId:carrierInvoice.id,shipmentAllocations:true}), (req as any).user.id]
   )).rows[0];
   const invoiceUpdate=await c.query("update logistics_carrier_invoices set status='posted',updated_at=now() where id=$1 and tenant_id=$2 and status='verified' and accounting_document_id=$3",[carrierInvoice.id,t.id,old.id]);
   if(!invoiceUpdate.rowCount){await c.query("rollback");return deny(res,409,"تغییر وضعیت صورتحساب حمل انجام نشد");}
   await c.query("insert into logistics_events(tenant_id,entity_type,entity_id,event_type,from_status,to_status,actor_user_id,reason) values($1,'carrier_invoice',$2,'carrier_invoice_posted','verified','posted',$3,$4)",[t.id,carrierInvoice.id,(req as any).user.id,"سند حسابداری "+old.document_no+" قطعی شد و بدهی ایجاد شد"]);
   await c.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,'logistics.carrier_invoice_posted','logistics_carrier_invoice',$3,$4,$5)",[t.id,(req as any).user.id,carrierInvoice.id,JSON.stringify({status:"verified",accountingDocumentId:old.id}),JSON.stringify({status:"posted",accountingDocumentId:old.id,payableId:payable.id,payableAmount:payable.original_amount})]);
  }
  await c.query("insert into accounting_finance_audit(tenant_id,entity_type,entity_id,action,actor_user_id,before_data,after_data) values($1,'accounting_document',$2,$3,$4,$5,$6)",[t.id,old.id,"status", (req as any).user.id,JSON.stringify(old),JSON.stringify(updated)]);
  await c.query("commit");
  res.json({document:updated,payable,carrierInvoiceStatus:carrierInvoice&&nextStatus==="posted"?"posted":undefined,carrierPaymentStatus:carrierPayment&&nextStatus==="posted"?"paid":undefined});
 }catch(e:any){
  await c.query("rollback");
  if(e?.code==="23505")return deny(res,409,"برای این صورتحساب بدهی قبلاً ثبت شده است");
  throw e;
 }finally{c.release();}
});

router.get("/api/accounting-finance/reports",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const from=okDate(req.query.from)?String(req.query.from):"1900-01-01",to=okDate(req.query.to)?String(req.query.to):"2999-12-31";
 const rows=await query("select a.id,a.code,a.name,coalesce(sum(l.debit),0)::numeric debit,coalesce(sum(l.credit),0)::numeric credit,coalesce(sum(l.debit-l.credit),0)::numeric balance from ledger_accounts a join accounting_document_lines l on l.account_id=a.id join accounting_documents d on d.id=l.document_id and d.tenant_id=$1 and d.status='posted' and d.document_date between $2 and $3 where a.tenant_id=$1 group by a.id,a.code,a.name order by a.code",[t.id,from,to]);
 const s=await query("select coalesce(sum(case when a.account_type in ('revenue','income') then l.credit-l.debit else 0 end),0)::numeric revenue,coalesce(sum(case when a.account_type in ('expense','cost') then l.debit-l.credit else 0 end),0)::numeric expense from accounting_document_lines l join accounting_documents d on d.id=l.document_id and d.tenant_id=$1 and d.status='posted' and d.document_date between $2 and $3 join ledger_accounts a on a.id=l.account_id",[t.id,from,to]);res.json({from,to,trialBalance:rows.rows,statements:s.rows[0]});
});
export {router as accountingFinanceRouter};
