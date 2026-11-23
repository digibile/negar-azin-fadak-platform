import assert from "node:assert/strict";
import test from "node:test";
import {postLedgerEntry,validateLedgerLines} from "./ledger.js";

type TestLine={accountCode:string;accountName:string;accountType:string;debit?:number;credit?:number;description?:string};
type ExistingHeader={entry_no?:string;description?:string;created_by?:string|null;currency?:string};
const balanced:TestLine[]=[
 {accountCode:"1001",accountName:"بانک",accountType:"asset",debit:1250},
 {accountCode:"2101",accountName:"بدهی",accountType:"liability",credit:1250}
];

test("ledger accepts balanced finite non-negative lines",()=>{
 const totals=validateLedgerLines(balanced);
 assert.equal(totals.totalDebit,1250);
 assert.equal(totals.totalCredit,1250);
});

test("ledger rejects unbalanced entries",()=>{
 assert.throws(()=>validateLedgerLines([
  {...balanced[0],debit:1250},
  {...balanced[1],credit:1200}
 ]),/نامتوازن/);
});

test("ledger rejects negative or non-finite amounts",()=>{
 for(const debit of [-1,Number.NaN,Number.POSITIVE_INFINITY]){
  assert.throws(()=>validateLedgerLines([
   {...balanced[0],debit},
   {...balanced[1],credit:1250}
  ]),/معتبر و غیرمنفی/);
 }
});

test("ledger rejects rows that are both debit and credit or neither",()=>{
 assert.throws(()=>validateLedgerLines([
  {...balanced[0],debit:1250,credit:1},
  {...balanced[1],debit:0,credit:1250}
 ]),/دقیقاً بدهکار یا بستانکار/);
 assert.throws(()=>validateLedgerLines([
  {...balanced[0],debit:0,credit:0},
  {...balanced[1],debit:0,credit:1250}
 ]),/دقیقاً بدهکار یا بستانکار/);
});

test("ledger requires at least two valid lines",()=>{
 assert.throws(()=>validateLedgerLines([balanced[0]]),/حداقل دو ردیف/);
 assert.throws(()=>validateLedgerLines([
  {...balanced[0],debit:0},
  {...balanced[1],credit:0}
 ]),/دقیقاً بدهکار یا بستانکار/);
});

const entryArgs={
 tenantId:"tenant-1",entryNo:"JE-1",sourceType:"test",sourceId:"source-1",
 description:"ثبت آزمایشی",createdBy:"user-1",currency:"IRR",lines:balanced
};

function duplicateClient(lines:TestLine[]=balanced,headerOverrides:ExistingHeader={}){
 return {query:async(sql:string)=>{
  if(sql.startsWith("insert into ledger_entries"))return {rows:[],rowCount:0};
  if(sql.startsWith("select id,entry_no,description,created_by,currency"))return {rows:[{
   id:"entry-existing",entry_no:"JE-1",description:"ثبت آزمایشی",created_by:"user-1",currency:"IRR",...headerOverrides
  }],rowCount:1};
  if(sql.startsWith("select a.code as account_code"))return {rows:lines.map(line=>({
   account_code:line.accountCode,debit:line.debit??0,credit:line.credit??0,description:line.description??null
  })),rowCount:lines.length};
  throw new Error("Unexpected SQL in test: "+sql);
 }} as any;
}

test("ledger returns the existing id for an identical source replay",async()=>{
 const id=await postLedgerEntry(duplicateClient(),entryArgs);
 assert.equal(id,"entry-existing");
});

test("ledger rejects a source replay with different lines",async()=>{
 const changed:TestLine[]=[
  {...balanced[0],debit:1200},
  {...balanced[1],credit:1200}
 ];
 await assert.rejects(()=>postLedgerEntry(duplicateClient(changed),entryArgs),/محتوای متفاوت/);
});

test("ledger rejects a source replay with a different header",async()=>{
 await assert.rejects(()=>postLedgerEntry(duplicateClient(balanced,{entry_no:"JE-OTHER"}),entryArgs),/محتوای متفاوت/);
});
