import type {PoolClient} from "pg";

type Line={accountCode:string;accountName:string;accountType:string;debit?:number;credit?:number;description?:string};

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

export async function postLedgerEntry(client:PoolClient,args:{tenantId:string;entryNo:string;sourceType:string;sourceId:string;description:string;createdBy?:string|null;currency?:string;lines:Line[]}){
 validateLedgerLines(args.lines);
 const existing=await client.query("select id from ledger_entries where tenant_id=$1 and source_type=$2 and source_id=$3",[args.tenantId,args.sourceType,args.sourceId]);
 if(existing.rowCount) return existing.rows[0].id as string;
 const entry=await client.query("insert into ledger_entries(tenant_id,entry_no,source_type,source_id,description,status,created_by,currency) values($1,$2,$3,$4,$5,'posted',$6,$7) returning id",[args.tenantId,args.entryNo,args.sourceType,args.sourceId,args.description,args.createdBy||null,(args.currency||"IRR").toUpperCase()]);
 for(const line of args.lines){
  const accountId=await ensureLedgerAccount(client,args.tenantId,line);
  const debit=Number(line.debit||0),credit=Number(line.credit||0);
  await client.query("insert into ledger_lines(entry_id,account_id,debit,credit,description) values($1,$2,$3,$4,$5)",[entry.rows[0].id,accountId,debit,credit,line.description||null]);
 }
 return entry.rows[0].id as string;
}
