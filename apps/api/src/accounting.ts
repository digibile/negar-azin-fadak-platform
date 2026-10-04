import {Router, type Request, type Response} from "express";
import {query,pool} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";

const router=Router();
const modes=["official","internal","hybrid"] as const;
const modeLabel={official:"رسمی",internal:"غیررسمی",hybrid:"ترکیبی"};

async function tenant(req:Request){return resolveTenant(req,(req as any).user);}

router.get("/api/accounting/books",requireAuth,async(req:Request,res:Response)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"سازمان معتبر پیدا نشد"});
 const r=await query("select id,code,title,book_mode,currency,fiscal_year,is_default,status,created_at from accounting_books where tenant_id=$1 order by is_default desc,code",[t.id]);
 res.json({items:r.rows,modes:modeLabel});
});

router.post("/api/accounting/books",requireAuth,requirePermission("ledger:manage"),async(req:Request,res:Response)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"سازمان معتبر پیدا نشد"});
 const {code,title,bookMode="hybrid",currency="IRR",fiscalYear,isDefault=false}=req.body||{};
 if(typeof code!=="string"||typeof title!=="string"||!modes.includes(bookMode))return res.status(400).json({error:"اطلاعات دفتر حسابداری نامعتبر است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  if(isDefault)await client.query("update accounting_books set is_default=false,updated_at=now() where tenant_id=$1",[t.id]);
  const r=await client.query("insert into accounting_books(tenant_id,code,title,book_mode,currency,fiscal_year,is_default) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,code.trim(),title.trim(),bookMode,currency,fiscalYear??null,Boolean(isDefault)]);
  await client.query("commit");res.status(201).json(r.rows[0]);
 }catch(error){await client.query("rollback");throw error}finally{client.release();}
});

router.get("/api/accounting/accounts",requireAuth,async(req:Request,res:Response)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"سازمان معتبر پیدا نشد"});
 const params:any[]=[t.id],where=" where a.tenant_id=$1";
 if(typeof req.query.bookId==="string"){params.push(req.query.bookId);where+=" and a.book_id=$"+params.length}
 if(typeof req.query.mode==="string"&&modes.includes(req.query.mode as any)){params.push(req.query.mode);where+=" and a.account_mode=$"+params.length}
 const r=await query("select a.id,a.code,a.external_code,a.name,a.account_type,a.account_mode,a.book_id,a.parent_id,a.status,b.code as book_code,b.title as book_title from ledger_accounts a left join accounting_books b on b.id=a.book_id"+where+" order by a.code",params);
 res.json({items:r.rows,modes:modeLabel});
});

router.post("/api/accounting/accounts",requireAuth,requirePermission("ledger:manage"),async(req:Request,res:Response)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"سازمان معتبر پیدا نشد"});
 const {code,name,accountType,accountMode="hybrid",bookId=null,externalCode=null,parentId=null}=req.body||{};
 if(typeof code!=="string"||typeof name!=="string"||!modes.includes(accountMode))return res.status(400).json({error:"اطلاعات حساب نامعتبر است"});
 const r=await query("insert into ledger_accounts(tenant_id,code,name,account_type,account_mode,book_id,external_code,parent_id) values($1,$2,$3,$4,$5,$6,$7,$8) returning *",[t.id,code.trim(),name.trim(),accountType||"general",accountMode,bookId,externalCode,parentId]);
 res.status(201).json(r.rows[0]);
});

router.post("/api/accounting/accounts/transfer",requireAuth,requirePermission("ledger:manage"),async(req:Request,res:Response)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"سازمان معتبر پیدا نشد"});
 const {sourceAccountId,targetAccountId,transferType="reclassify",amount,reason,lines=[]}=req.body||{};
 if(sourceAccountId===targetAccountId)return res.status(400).json({error:"حساب مبدأ و مقصد نمی‌توانند یکسان باشند"});
 if(!["move","copy","map","reclassify"].includes(transferType))return res.status(400).json({error:"نوع جابجایی نامعتبر است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const a=await client.query("select id,code,name,book_id,account_mode from ledger_accounts where tenant_id=$1 and id=any($2::uuid[]) for update",[t.id,[sourceAccountId,targetAccountId]]);
  if(a.rowCount!==2)throw Object.assign(new Error("حساب مبدأ یا مقصد پیدا نشد"),{status:404});
  let entryId=null;
  if(transferType!=="copy"&&transferType!=="map"){
   const numeric=Number(amount);
   if(!Number.isFinite(numeric)||numeric<=0)throw Object.assign(new Error("برای جابجایی مانده، مبلغ معتبر لازم است"),{status:400});
   const entry=await client.query("insert into ledger_entries(tenant_id,entry_no,source_type,source_id,description,status,created_by) values($1,$2,$3,$4,$5,'posted',$6) returning id",[
    t.id,"TR-"+Date.now(),"account_transfer",sourceAccountId,reason||"جابجایی بین حساب‌های حسابداری",(req as any).user.id
   ]);
   entryId=entry.rows[0].id;
   await client.query("insert into ledger_lines(entry_id,account_id,debit,credit,description) values($1,$2,$3,0,$4),($1,$5,0,$3,$4)",[entryId,targetAccountId,numeric,reason||"جابجایی حساب",sourceAccountId]);
  }
  const transfer=await client.query("insert into accounting_account_transfers(tenant_id,source_account_id,target_account_id,source_book_id,target_book_id,transfer_type,amount,payload,reason,created_by,status,posted_at) select $1,$2,$3,s.book_id,t.book_id,$4,$5,$6,$7,$8,'posted',now() from ledger_accounts s,ledger_accounts t where s.id=$2 and t.id=$3 returning *",[t.id,sourceAccountId,targetAccountId,transferType,amount??null,{lines,entryId},reason??null,(req as any).user.id]);
  for(const line of Array.isArray(lines)?lines:[])await client.query("insert into accounting_account_transfer_lines(transfer_id,entity_type,entity_id,source_data,target_data) values($1,$2,$3,$4,$5)",[transfer.rows[0].id,String(line.entityType||"record"),line.entityId||null,line.sourceData||{},line.targetData||{}]);
  await client.query("commit");res.status(201).json({transfer:transfer.rows[0],entryId});
 }catch(error){await client.query("rollback");throw error}finally{client.release();}
});

router.get("/api/accounting/account-mappings",requireAuth,async(req:Request,res:Response)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"سازمان معتبر پیدا نشد"});
 const r=await query("select m.*,s.code source_code,s.name source_name,t.code target_code,t.name target_name from accounting_account_mappings m join ledger_accounts s on s.id=m.source_account_id join ledger_accounts t on t.id=m.target_account_id where m.tenant_id=$1 and m.is_active=true order by m.created_at desc",[t.id]);
 res.json({items:r.rows});
});

router.post("/api/accounting/account-mappings",requireAuth,requirePermission("ledger:manage"),async(req:Request,res:Response)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"سازمان معتبر پیدا نشد"});
 const {sourceAccountId,targetAccountId,mappingType}=req.body||{};
 if(!["official_to_internal","internal_to_official","official_to_hybrid","hybrid_to_official","internal_to_hybrid","hybrid_to_internal"].includes(mappingType))return res.status(400).json({error:"نوع نگاشت نامعتبر است"});
 const r=await query("insert into accounting_account_mappings(tenant_id,source_account_id,target_account_id,mapping_type,created_by) values($1,$2,$3,$4,$5) on conflict(tenant_id,source_account_id,target_account_id) do update set mapping_type=excluded.mapping_type,is_active=true returning *",[t.id,sourceAccountId,targetAccountId,mappingType,(req as any).user.id]);
 res.status(201).json(r.rows[0]);
});

export {router as accountingRouter};
