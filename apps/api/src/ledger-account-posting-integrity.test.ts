import assert from "node:assert/strict";
import test from "node:test";
import {ensureLedgerAccount} from "./ledger.js";

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
 const client=clientWith([{rows:[{id:"account-1",is_active:true,is_postable:true}],rowCount:1}]);
 const id=await ensureLedgerAccount(client,"tenant-1",{accountCode:"2101",accountName:"نام پیشنهادی",accountType:"liability"});
 assert.equal(id,"account-1");
 assert.equal(client.calls.length,1);
 assert.match(client.calls[0].sql,/select id,is_active,is_postable/);
 assert.doesNotMatch(client.calls[0].sql,/update ledger_accounts/i);
});

test("inactive ledger accounts cannot receive postings",async()=>{
 const client=clientWith([{rows:[{id:"account-2",is_active:false,is_postable:true}],rowCount:1}]);
 await assert.rejects(()=>ensureLedgerAccount(client,"tenant-1",{accountCode:"2101",accountName:"بستانکاران",accountType:"liability"}),/غیرفعال/);
});

test("non-postable control accounts cannot receive direct postings",async()=>{
 const client=clientWith([{rows:[{id:"account-3",is_active:true,is_postable:false}],rowCount:1}]);
 await assert.rejects(()=>ensureLedgerAccount(client,"tenant-1",{accountCode:"2101",accountName:"بستانکاران",accountType:"liability"}),/غیرقابل ثبت/);
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
  {rows:[{id:"winner-account",is_active:true,is_postable:true}],rowCount:1}
 ]);
 const id=await ensureLedgerAccount(client,"tenant-1",{accountCode:"1101",accountName:"حساب پرداخت",accountType:"asset"});
 assert.equal(id,"winner-account");
 assert.equal(client.calls.length,3);
});
