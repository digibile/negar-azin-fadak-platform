import type {PoolClient} from "pg";

type Line={accountCode:string;accountName:string;accountType:string;debit?:number;credit?:number;description?:string};

export async function ensureLedgerAccount(client:PoolClient,tenantId:string,line:Pick<Line,"accountCode"|"accountName"|"accountType">){
 const r=await client.query("insert into ledger_accounts(tenant_id,code,name,account_type) values($1,$2,$3,$4) on conflict(tenant_id,code) do update set name=excluded.name,account_type=excluded.account_type returning id",[tenantId,line.accountCode,line.accountName,line.accountType]);
 return r.rows[0].id as string;
}

export async function postLedgerEntry(client:PoolClient,args:{tenantId:string;entryNo:string;sourceType:string;sourceId:string;description:string;createdBy?:string|null;lines:Line[]}){
 const totalDebit=args.lines.reduce((s,x)=>s+Number(x.debit||0),0);
 const totalCredit=args.lines.reduce((s,x)=>s+Number(x.credit||0),0);
 if(totalDebit<=0||Math.abs(totalDebit-totalCredit)>0.005) throw new Error("ثبت دفترکل نامتوازن است");
 const existing=await client.query("select id from ledger_entries where tenant_id=$1 and source_type=$2 and source_id=$3",[args.tenantId,args.sourceType,args.sourceId]);
 if(existing.rowCount) return existing.rows[0].id as string;
 const entry=await client.query("insert into ledger_entries(tenant_id,entry_no,source_type,source_id,description,status,created_by) values($1,$2,$3,$4,$5,'posted',$6) returning id",[args.tenantId,args.entryNo,args.sourceType,args.sourceId,args.description,args.createdBy||null]);
 for(const line of args.lines){
  const accountId=await ensureLedgerAccount(client,args.tenantId,line);
  const debit=Number(line.debit||0),credit=Number(line.credit||0);
  if((debit>0)===(credit>0)) throw new Error("هر ردیف دفترکل باید بدهکار یا بستانکار باشد");
  await client.query("insert into ledger_lines(entry_id,account_id,debit,credit,description) values($1,$2,$3,$4,$5)",[entry.rows[0].id,accountId,debit,credit,line.description||null]);
 }
 return entry.rows[0].id as string;
}