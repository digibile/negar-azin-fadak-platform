import test from "node:test";
import assert from "node:assert/strict";
import {ensureCanonicalParty} from "./canonical-party.js";

function client(matches:any[]=[]){
 const calls:{sql:string;params?:unknown[]}[]=[];
 return {
  calls,
  query:async(sql:string,params?:unknown[])=>{
   calls.push({sql,params});
   if(sql.includes("select id from accounting_parties where tenant_id=$1 and national_id=$2"))return {rows:matches};
   if(sql.startsWith("insert into accounting_parties"))return {rows:[{id:"party-created"}]};
   return {rows:[]};
  }
 };
}

test("canonical party resolver reuses one exact tenant-scoped national identity match",async()=>{
 const db=client([{id:"party-existing"}]);
 const id=await ensureCanonicalParty(db as any,{tenantId:"tenant-1",kind:"customer",title:"مشتری",nationalId:"0012345678",sourceSystem:"sales_partners"});
 assert.equal(id,"party-existing");
 assert.ok(db.calls.some(x=>x.sql.includes("pg_advisory_xact_lock")));
 assert.ok(db.calls.some(x=>x.sql.includes("tenant_id=$1 and national_id=$2")));
 assert.equal(db.calls.some(x=>x.sql.startsWith("insert into accounting_parties")),false);
});

test("canonical party resolver rejects ambiguous exact identity matches",async()=>{
 const db=client([{id:"party-a"},{id:"party-b"}]);
 await assert.rejects(
  ensureCanonicalParty(db as any,{tenantId:"tenant-1",kind:"supplier",title:"تأمین‌کننده",nationalId:"0012345678",sourceSystem:"purchase_suppliers"}),
  (error:any)=>error?.statusCode===409
 );
 assert.equal(db.calls.some(x=>x.sql.startsWith("insert into accounting_parties")),false);
});

test("canonical party resolver creates a new party when no exact match exists",async()=>{
 const db=client([]);
 const id=await ensureCanonicalParty(db as any,{tenantId:"tenant-1",kind:"other",title:"پذیرنده",nationalId:"0098765432",taxId:"TAX-1",phone:"09120000000",email:"merchant@example.test",sourceSystem:"payment_merchants"});
 assert.equal(id,"party-created");
 const insert=db.calls.find(x=>x.sql.startsWith("insert into accounting_parties"));
 assert.ok(insert);
 assert.equal((insert?.params?.[2] as string),"other");
 assert.equal((insert?.params?.[3] as string),"پذیرنده");
});
