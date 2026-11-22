import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {ensureLedgerAccount,postLedgerEntry} from "./ledger.js";

function clientWith(responses:Array<{rows:any[];rowCount:number}>){
 const calls:Array<{sql:string;params:unknown[]}>=[];
 return {
  calls,
  async query(sql:string,params:unknown[]=[]){
   calls.push({sql,params});
   const next=responses.shift();
   if(!next)throw new Error("Unexpected database query");
   return next;
  }
 } as any;
}

test("existing ledger account is reused without overwriting its configured name or type",async()=>{
 const client=clientWith([{rows:[{id:"account-1",status:"active",is_active:true,is_postable:true}],rowCount:1}]);
 const id=await ensureLedgerAccount(client,"tenant-1",{accountCode:"2101",accountName:"نام پیشنهادی",accountType:"liability"});
 assert.equal(id,"account-1");
 assert.equal(client.calls.length,1);
 assert.match(client.calls[0].sql,/select id,status,is_active,is_postable from ledger_accounts/);
 assert.doesNotMatch(client.calls[0].sql,/update ledger_accounts/i);
});

test("inactive ledger accounts cannot receive postings",async()=>{
 const client=clientWith([{rows:[{id:"account-2",status:"inactive",is_active:false,is_postable:true}],rowCount:1}]);
 await assert.rejects(()=>ensureLedgerAccount(client,"tenant-1",{accountCode:"2101",accountName:"بستانکاران",accountType:"liability"}),/غیرفعال/);
});

test("accounts disabled for direct posting cannot receive ledger lines",async()=>{
 const client=clientWith([{rows:[{id:"account-4",status:"active",is_active:true,is_postable:false}],rowCount:1}]);
 await assert.rejects(()=>ensureLedgerAccount(client,"tenant-1",{accountCode:"2102",accountName:"کنترلی",accountType:"liability"}),/غیرقابل ثبت/);
});

test("missing ledger accounts are created without changing existing account definitions",async()=>{
 const client=clientWith([
  {rows:[],rowCount:0},
  {rows:[{id:"new-account"}],rowCount:1}
 ]);
 const id=await ensureLedgerAccount(client,"tenant-1",{accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability"});
 assert.equal(id,"new-account");
 assert.equal(client.calls.length,2);
 assert.match(client.calls[1].sql,/on conflict\(tenant_id,code\) do nothing returning id/i);
 assert.doesNotMatch(client.calls[1].sql,/do update/i);
});

test("concurrent account creation re-reads and validates the winning account",async()=>{
 const client=clientWith([
  {rows:[],rowCount:0},
  {rows:[],rowCount:0},
  {rows:[{id:"winner-account",status:"active",is_active:true,is_postable:true}],rowCount:1}
 ]);
 const id=await ensureLedgerAccount(client,"tenant-1",{accountCode:"1101",accountName:"حساب پرداخت",accountType:"asset"});
 assert.equal(id,"winner-account");
 assert.equal(client.calls.length,3);
});

test("ledger account guard reads persisted active and postable state",async()=>{
 const source=fs.readFileSync(new URL("./ledger.ts",import.meta.url),"utf8");
 assert.ok(source.includes("select id,status,is_active,is_postable from ledger_accounts"));
 assert.ok(source.includes("is_active"));
 assert.ok(source.includes("is_postable"));
});


test("an existing ledger source entry is reused only when its posted lines exactly match",async()=>{
 const client=clientWith([
  {rows:[{id:"entry-1",status:"posted",account_id:"account-1",debit:"125.00",credit:"0.00"},{id:"entry-1",status:"posted",account_id:"account-2",debit:"0.00",credit:"125.00"}],rowCount:2},
  {rows:[{id:"account-1",status:"active",is_active:true,is_postable:true}],rowCount:1},
  {rows:[{id:"account-2",status:"active",is_active:true,is_postable:true}],rowCount:1}
 ]);
 const id=await postLedgerEntry(client,{tenantId:"tenant-1",entryNo:"SET-1",sourceType:"seller_settlement",sourceId:"settlement-1",description:"پرداخت",lines:[
  {accountCode:"2101",accountName:"بستانکاران",accountType:"liability",debit:"125.00"},
  {accountCode:"1101",accountName:"بانک",accountType:"asset",credit:"125.00"}
 ]});
 assert.equal(id,"entry-1");
 assert.equal(client.calls.length,3);
 assert.ok(client.calls[0].sql.includes("left join ledger_lines"));
});

test("an existing ledger source entry with different amounts or accounts is rejected",async()=>{
 const client=clientWith([
  {rows:[{id:"entry-2",status:"posted",account_id:"account-1",debit:"100.00",credit:"0.00"},{id:"entry-2",status:"posted",account_id:"account-2",debit:"0.00",credit:"100.00"}],rowCount:2},
  {rows:[{id:"account-1",status:"active",is_active:true,is_postable:true}],rowCount:1},
  {rows:[{id:"account-2",status:"active",is_active:true,is_postable:true}],rowCount:1}
 ]);
 await assert.rejects(()=>postLedgerEntry(client,{tenantId:"tenant-1",entryNo:"SET-2",sourceType:"seller_settlement",sourceId:"settlement-2",description:"پرداخت",lines:[
  {accountCode:"2101",accountName:"بستانکاران",accountType:"liability",debit:"125.00"},
  {accountCode:"1101",accountName:"بانک",accountType:"asset",credit:"125.00"}
 ]}),/تطبیق ندارد/);
});

test("existing non-posted ledger source entries cannot be treated as completed idempotent postings",async()=>{
 const client=clientWith([{rows:[{id:"entry-3",status:"draft",account_id:null,debit:null,credit:null}],rowCount:1}]);
 await assert.rejects(()=>postLedgerEntry(client,{tenantId:"tenant-1",entryNo:"SET-3",sourceType:"seller_settlement",sourceId:"settlement-3",description:"پرداخت",lines:[
  {accountCode:"2101",accountName:"بستانکاران",accountType:"liability",debit:"50.00"},
  {accountCode:"1101",accountName:"بانک",accountType:"asset",credit:"50.00"}
 ]}),/قطعی‌شده نیست/);
});
