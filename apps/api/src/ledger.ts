import type {PoolClient} from "pg";

type MoneyInput=string|number;
type Line={accountCode:string;accountName:string;accountType:string;debit?:MoneyInput;credit?:MoneyInput;description?:string};

/** Convert a monetary value to exact minor units for the platform's numeric(20,2) ledger columns. */
export function moneyToMinorUnits(value:MoneyInput):bigint{
 const raw=typeof value==="number"?(Number.isFinite(value)?value.toFixed(2):""):String(value).trim();
 const match=/^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
 if(!match)throw new Error("مبلغ باید عدد معتبر با حداکثر دو رقم اعشار باشد");
 const fraction=(match[3]||"").padEnd(2,"0");
 const units=BigInt(match[2])*100n+BigInt(fraction||"0");
 return match[1]==="-"?-units:units;
}

export function minorUnitsToMoney(value:bigint):string{
 const sign=value<0n?"-":"";
 const absolute=value<0n?-value:value;
 return sign+(absolute/100n).toString()+"."+(absolute%100n).toString().padStart(2,"0");
}

export async function ensureLedgerAccount(client:PoolClient,tenantId:string,line:Pick<Line,"accountCode"|"accountName"|"accountType">){
 const existing=await client.query("select id,status,is_active,is_postable from ledger_accounts where tenant_id=$1 and code=$2 for update",[tenantId,line.accountCode]);
 if(existing.rowCount){
  const account=existing.rows[0];
  if(account.status!=="active"||account.is_active===false)throw new Error("حساب دفترکل غیرفعال است: "+line.accountCode);
  if(account.is_postable===false)throw new Error("ثبت مستقیم در حساب غیرقابل ثبت مجاز نیست: "+line.accountCode);
  return account.id as string;
 }
 const inserted=await client.query("insert into ledger_accounts(tenant_id,code,name,account_type) values($1,$2,$3,$4) on conflict(tenant_id,code) do nothing returning id",[tenantId,line.accountCode,line.accountName,line.accountType]);
 if(inserted.rowCount)return inserted.rows[0].id as string;
 const raced=await client.query("select id,status,is_active,is_postable from ledger_accounts where tenant_id=$1 and code=$2 for update",[tenantId,line.accountCode]);
 if(!raced.rowCount)throw new Error("حساب دفترکل پس از درج همزمان پیدا نشد: "+line.accountCode);
 if(raced.rows[0].status!=="active"||raced.rows[0].is_active===false)throw new Error("حساب دفترکل غیرفعال است: "+line.accountCode);
 if(raced.rows[0].is_postable===false)throw new Error("ثبت مستقیم در حساب غیرقابل ثبت مجاز نیست: "+line.accountCode);
 return raced.rows[0].id as string;
}
export async function postLedgerEntry(client:PoolClient,args:{tenantId:string;entryNo:string;sourceType:string;sourceId:string;description:string;createdBy?:string|null;lines:Line[]}){
 const totalDebit=args.lines.reduce((sum,line)=>sum+moneyToMinorUnits(line.debit??"0"),0n);
 const totalCredit=args.lines.reduce((sum,line)=>sum+moneyToMinorUnits(line.credit??"0"),0n);
 if(totalDebit<=0n||totalDebit!==totalCredit) throw new Error("ثبت دفترکل نامتوازن است");
 const existing=await client.query(
  "select e.id,e.status,l.account_id,l.debit::text as debit,l.credit::text as credit from ledger_entries e left join ledger_lines l on l.entry_id=e.id where e.tenant_id=$1 and e.source_type=$2 and e.source_id=$3 order by l.account_id,l.id",
  [args.tenantId,args.sourceType,args.sourceId]
 );
 if(existing.rowCount){
  const entryId=existing.rows[0].id as string;
  if(existing.rows[0].status!=="posted")throw new Error("سند دفترکل موجود برای این منبع در وضعیت قطعی‌شده نیست");
  const expected=[];
  for(const line of args.lines){
   const accountId=await ensureLedgerAccount(client,args.tenantId,line);
   expected.push({accountId,debit:moneyToMinorUnits(line.debit??"0"),credit:moneyToMinorUnits(line.credit??"0")});
  }
  const actual=existing.rows.filter((row:any)=>row.account_id!==null).map((row:any)=>({
   accountId:row.account_id as string,
   debit:moneyToMinorUnits(String(row.debit)),
   credit:moneyToMinorUnits(String(row.credit))
  }));
  const sort=(items:Array<{accountId:string;debit:bigint;credit:bigint}>)=>items.sort((a,b)=>a.accountId.localeCompare(b.accountId)|| (a.debit<b.debit?-1:a.debit>b.debit?1:0)|| (a.credit<b.credit?-1:a.credit>b.credit?1:0));
  const wanted=sort(expected),found=sort(actual);
  if(wanted.length!==found.length||wanted.some((line,index)=>line.accountId!==found[index].accountId||line.debit!==found[index].debit||line.credit!==found[index].credit)){
   throw new Error("سند دفترکل موجود برای این منبع با اقلام و مبلغ درخواستی تطبیق ندارد؛ ثبت مجدد مسدود شد");
  }
  return entryId;
 }
 const entry=await client.query("insert into ledger_entries(tenant_id,entry_no,source_type,source_id,description,status,created_by) values($1,$2,$3,$4,$5,'posted',$6) returning id",[args.tenantId,args.entryNo,args.sourceType,args.sourceId,args.description,args.createdBy||null]);
 for(const line of args.lines){
  const accountId=await ensureLedgerAccount(client,args.tenantId,line);
  const debit=moneyToMinorUnits(line.debit??"0"),credit=moneyToMinorUnits(line.credit??"0");
  if(debit<0n||credit<0n||(debit>0n)===(credit>0n)) throw new Error("هر ردیف دفترکل باید فقط یک مبلغ مثبت در سمت بدهکار یا بستانکار داشته باشد");
  await client.query("insert into ledger_lines(entry_id,account_id,debit,credit,description) values($1,$2,$3,$4,$5)",[entry.rows[0].id,accountId,minorUnitsToMoney(debit),minorUnitsToMoney(credit),line.description||null]);
 }
 return entry.rows[0].id as string;
}