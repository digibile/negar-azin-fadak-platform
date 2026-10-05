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
 const old=await query("select * from ledger_accounts where id=$1 and tenant_id=$2",[String(req.params.id),t.id]);if(!old.rowCount)return deny(res,404,"حساب پیدا نشد");
 const {name,accountType,accountMode,externalCode}=req.body||{};if(accountMode&&!["official","internal","hybrid"].includes(accountMode))return deny(res,400,"ماهیت حساب نامعتبر است");
 const r=await query("update ledger_accounts set name=coalesce($1,name),account_type=coalesce($2,account_type),account_mode=coalesce($3,account_mode),external_code=coalesce($4,external_code) where id=$5 and tenant_id=$6 returning id,code,name,account_type,account_mode,book_id,external_code,parent_id",[typeof name==="string"?name.trim():null,accountType||null,accountMode||null,externalCode??null,String(req.params.id),t.id]);
 await audit(t.id,(req as any).user.id,"ledger_account",String(req.params.id),"update",old.rows[0],r.rows[0]);res.json(r.rows[0]);
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
 const old=await query("select * from accounting_fiscal_periods where id=$1 and tenant_id=$2",[String(req.params.id),t.id]);if(!old.rowCount)return deny(res,404,"دوره پیدا نشد");
 if(old.rows[0].status==="locked"&&s!=="locked")return deny(res,409,"دوره قفل‌شده قابل بازگشایی نیست");
 const r=await query("update accounting_fiscal_periods set status=$1,closed_at=case when $1 in ('closed','locked') then coalesce(closed_at,now()) else null end,closed_by=case when $1 in ('closed','locked') then $2 else null end,updated_at=now() where id=$3 and tenant_id=$4 returning *",[s,(req as any).user.id,String(req.params.id),t.id]);
 await audit(t.id,(req as any).user.id,"fiscal_period",String(req.params.id),"status",old.rows[0],r.rows[0]);res.json(r.rows[0]);
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
 const old=await query("select * from accounting_cost_centers where id=$1 and tenant_id=$2",[String(req.params.id),t.id]);if(!old.rowCount)return deny(res,404,"مرکز پیدا نشد");
 const {title,status,centerType}=req.body||{};if(status&&!["active","inactive"].includes(status))return deny(res,400,"وضعیت نامعتبر است");
 const r=await query("update accounting_cost_centers set title=coalesce($1,title),status=coalesce($2,status),center_type=coalesce($3,center_type),updated_at=now() where id=$4 and tenant_id=$5 returning *",[typeof title==="string"?title.trim():null,status||null,centerType||null,String(req.params.id),t.id]);
 await audit(t.id,(req as any).user.id,"cost_center",String(req.params.id),"update",old.rows[0],r.rows[0]);res.json(r.rows[0]);
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
 const d=await query("select d.*,b.title book_title,p.title period_title from accounting_documents d join accounting_books b on b.id=d.book_id left join accounting_fiscal_periods p on p.id=d.period_id where d.id=$1 and d.tenant_id=$2",[String(req.params.id),t.id]);if(!d.rowCount)return deny(res,404,"سند پیدا نشد");
 const l=await query("select l.*,a.code account_code,a.name account_name,c.code cost_center_code,c.title cost_center_title from accounting_document_lines l join ledger_accounts a on a.id=l.account_id left join accounting_cost_centers c on c.id=l.cost_center_id where l.document_id=$1 order by l.line_no",[String(req.params.id)]);res.json({document:d.rows[0],lines:l.rows});
});
router.patch("/api/accounting-finance/documents/:id/status",requireAuth,requirePermission("accounting-finance.write"),async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const s=req.body?.status;if(!["submitted","approved","posted","void"].includes(s))return deny(res,400,"وضعیت سند نامعتبر است");
 const old=await query("select * from accounting_documents where id=$1 and tenant_id=$2",[String(req.params.id),t.id]);if(!old.rowCount)return deny(res,404,"سند پیدا نشد");
 const flow:any={draft:["submitted","void"],submitted:["approved","void"],approved:["posted","void"],posted:["void"],void:[]};if(!flow[old.rows[0].status]?.includes(s))return deny(res,409,"تغییر وضعیت مجاز نیست");
 const r=await query("update accounting_documents set status=$1,approved_by=case when $1='approved' then $2 else approved_by end,posted_at=case when $1='posted' then now() else posted_at end,updated_at=now() where id=$3 and tenant_id=$4 returning *",[s,(req as any).user.id,String(req.params.id),t.id]);await audit(t.id,(req as any).user.id,"accounting_document",String(req.params.id),"status",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});

router.get("/api/accounting-finance/reports",requireAuth,async(req,res)=>{
 const t=await tenantOf(req);if(!t)return deny(res,403,"سازمان معتبر پیدا نشد");const from=okDate(req.query.from)?String(req.query.from):"1900-01-01",to=okDate(req.query.to)?String(req.query.to):"2999-12-31";
 const rows=await query("select a.id,a.code,a.name,coalesce(sum(l.debit),0)::numeric debit,coalesce(sum(l.credit),0)::numeric credit,coalesce(sum(l.debit-l.credit),0)::numeric balance from ledger_accounts a join accounting_document_lines l on l.account_id=a.id join accounting_documents d on d.id=l.document_id and d.tenant_id=$1 and d.status='posted' and d.document_date between $2 and $3 where a.tenant_id=$1 group by a.id,a.code,a.name order by a.code",[t.id,from,to]);
 const s=await query("select coalesce(sum(case when a.account_type in ('revenue','income') then l.credit-l.debit else 0 end),0)::numeric revenue,coalesce(sum(case when a.account_type in ('expense','cost') then l.debit-l.credit else 0 end),0)::numeric expense from accounting_document_lines l join accounting_documents d on d.id=l.document_id and d.tenant_id=$1 and d.status='posted' and d.document_date between $2 and $3 join ledger_accounts a on a.id=l.account_id",[t.id,from,to]);res.json({from,to,trialBalance:rows.rows,statements:s.rows[0]});
});
export {router as accountingFinanceRouter};
