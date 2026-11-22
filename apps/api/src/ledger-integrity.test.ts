import assert from "node:assert/strict";
import test from "node:test";
import {validateLedgerLines} from "./ledger.js";

const balanced=[
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
