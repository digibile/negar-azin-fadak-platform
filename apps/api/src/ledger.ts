import type {PoolClient} from "pg";

type Line={accountCode:string;accountName:string;accountType:string;debit?:number;credit?:number;description?:string};
type EntryArgs={tenantId:string;entryNo:string;sourceType:string;sourceId:string;description:string;createdBy?:string|null;currency?:string;lines:Line[]};

export function validateLedgerLines(lines:Line[]){
 if(!Array.isArray(lines)||lines.length<2)throw new Error("سند دفترکل باید حداقل دو ردیف داشته باشد");
 let totalDebit=0,totalCredit=0;
 for(const line of lines){
  const debit=Number(line.debit??0),credit=Number(line.credit??0);
  if(!Number.isFinite(debit)||!Number.isFinite(credit)||debit<0||credit<0)throw new Error("مبلغ ردیف دفترکل باید عددی معتبر و غیرمنفی باشد");
  if((debit>0)===(credit>0))throw new Error("هر ردیف دفترکل باید دقیقاً بدهکار یا بستانکار باشد");
  totalDebit+=debit;totalCredit+=credit;
 }
 if(!Number.isFinite(totalDebit)||!Number.isFinite(totalCredit)||totalDebit<=0||Math.abs(totalDebit-totalCredit)>0.005)throw new Error("ثبت دفترکل نامتوازن است");
 return {totalDebit,totalCredit};
}

export async function ensureLedgerAccount(client:PoolClient,tenantId:string,line:Pick<Line,"accountCode"|"accountName"|"accountType">){
 const r=await client.query("insert into ledger_accounts(tenant_id,code,name,account_type) values($1,$2,$3,$4) on conflict(tenant_id,code) do update set name=excluded.name,account_type=excluded.account_type returning id",[tenantId,line.accountCode,line.accountName,line.accountType]);
 return r.rows[0].id as string;
}

function sameAmount(a:unknown,b:unknown){
 return Math.abs(Number(a)-Number(b))<=0.005;
}

function normalizeLine(line:{accountCode:string;debit:unknown;credit:unknown;description:string|null}){
 return {accountCode:line.accountCode,debit:Number(line.debit),credit:Number(line.credit),description:line.description??null};
}

export async function postLedgerEntry(client:PoolClient,args:EntryArgs){
 validateLedgerLines(args.lines);
 const currency=(args.currency||"IRR").toUpperCase();
 const createdBy=args.createdBy||null;
 const inserted=await client.query(
  "insert into ledger_entries(tenant_id,entry_no,source_type,source_id,description,status,created_by,currency) values($1,$2,$3,$4,$5,'posted',$6,$7) on conflict(tenant_id,source_type,source_id) where source_id is not null do nothing returning id",
  [args.tenantId,args.entryNo,args.sourceType,args.sourceId,args.description,createdBy,currency]
 );
 if(inserted.rowCount){
  const entryId=inserted.rows[0].id as string;
  for(const line of args.lines){
   const accountId=await ensureLedgerAccount(client,args.tenantId,line);
   const debit=Number(line.debit||0),credit=Number(line.credit||0);
   await client.query("insert into ledger_lines(entry_id,account_id,debit,credit,description) values($1,$2,$3,$4,$5)",[entryId,accountId,debit,credit,line.description||null]);
  }
  return entryId;
 }

 const existing=await client.query(
  "select id,entry_no,description,created_by,currency from ledger_entries where tenant_id=$1 and source_type=$2 and source_id=$3 for update",
  [args.tenantId,args.sourceType,args.sourceId]
 );
 if(!existing.rowCount)throw new Error("سند دفترکل تکراری پیدا نشد؛ تراکنش باید دوباره اجرا شود");
 const header=existing.rows[0];
 const existingLines=await client.query(
  "select a.code as account_code,l.debit,l.credit,l.description from ledger_lines l join ledger_accounts a on a.id=l.account_id where l.entry_id=$1",
  [header.id]
 );
 const expected=args.lines.map(line=>normalizeLine({accountCode:line.accountCode,debit:line.debit??0,credit:line.credit??0,description:line.description||null}));
 const actual=existingLines.rows.map((line:any)=>normalizeLine({accountCode:line.account_code,debit:line.debit,credit:line.credit,description:line.description}));
 const sortKey=(line:ReturnType<typeof normalizeLine>)=>[line.accountCode,line.debit,line.credit,line.description||""].join("|");
 expected.sort((a,b)=>sortKey(a).localeCompare(sortKey(b)));
 actual.sort((a,b)=>sortKey(a).localeCompare(sortKey(b)));
 const sameLines=expected.length===actual.length&&expected.every((line,index)=>{
  const other=actual[index];
  return line.accountCode===other.accountCode&&sameAmount(line.debit,other.debit)&&sameAmount(line.credit,other.credit)&&line.description===other.description;
 });
 const sameHeader=header.entry_no===args.entryNo&&header.description===args.description&&(header.created_by??null)===createdBy&&(header.currency||"IRR").toUpperCase()===currency;
 if(!sameHeader||!sameLines)throw new Error("منبع دفترکل قبلاً با محتوای متفاوت ثبت شده است");
 return header.id as string;
}
