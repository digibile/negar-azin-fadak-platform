import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");
const start=source.indexOf('settlementRouter.post("/api/marketplace/settlements/:id/pay"');
const end=source.indexOf('settlementRouter.get("/api/ledger/accounts"',start);
const payout=start>=0&&end>start?source.slice(start,end):"";

test("seller settlement payout rolls back when the settlement does not exist",()=>{
 assert.ok(payout.includes('if(!r.rowCount){await client.query("rollback");return res.status(404)'));
});

test("seller settlement payout rolls back when the settlement is not approved",()=>{
 assert.ok(payout.includes('if(settlement.status!=="approved"){await client.query("rollback");return res.status(409)'));
});

test("seller settlement payout commits only after ledger and audit records are written",()=>{
 const commit=payout.indexOf('await client.query("commit")');
 const ledger=payout.indexOf("postLedgerEntry(client");
 const audit=payout.indexOf("settlement.paid");
 assert.ok(ledger>=0&&audit>ledger&&commit>audit);
});

test("seller settlement payout releases its client after every transaction path",()=>{
 assert.ok(payout.includes('finally{client.release();}'));
 assert.ok(payout.includes('catch(e){await client.query("rollback");throw e;}'));
});


test("settlement generation aggregates database money as exact minor-unit strings",()=>{
 const start=source.indexOf('settlementRouter.post("/api/marketplace/settlements/generate"');
 const end=source.indexOf('settlementRouter.patch("/api/marketplace/settlements/:id/approve"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes("moneyToMinorUnits(String(o.total_amount))"));
 assert.ok(route.includes("moneyToMinorUnits(String(o.commission_amount))"));
 assert.ok(route.includes("moneyToMinorUnits(String(o.seller_payable))"));
 assert.ok(!route.includes("Number(o.total_amount)"));
});

test("settlement ledger posting preserves numeric database values as strings",()=>{
 const start=source.indexOf('settlementRouter.post("/api/marketplace/settlements/:id/pay"');
 const end=source.indexOf('settlementRouter.get("/api/ledger/accounts"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes('debit:String(settlement.net_amount)'));
 assert.ok(route.includes('credit:String(settlement.net_amount)'));
 assert.ok(!route.includes("Number(settlement.net_amount)"));
});

test("settlement payout uses the seller supplier account and selected tenant bank account",()=>{
 assert.ok(payout.includes("s.accounting_party_id"));
 assert.ok(payout.includes("ap.party_type"));
 assert.ok(payout.includes("ap.default_account_id"));
 assert.ok(payout.includes("ba.id=$3 and ba.tenant_id=s.tenant_id"));
 assert.ok(payout.includes("ap.status party_status"));
 assert.ok(payout.includes("bank.code bank_code"));
 assert.ok(payout.includes("accountCode:mapping.bank_code,accountName:mapping.bank_name"));
 assert.ok(payout.includes("payout_bank_account_id=$3,payout_ledger_entry_id=$4,payout_reference=$5"));
 assert.doesNotMatch(payout,/accountCode:"(?:2101|1101)"/);
});

test("payout bank account choices are tenant-scoped and require an active ledger account",()=>{
 const start=source.indexOf('settlementRouter.get("/api/marketplace/settlements/payout-bank-accounts"');
 const end=source.indexOf('settlementRouter.get("/api/marketplace/settlements"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes("ba.tenant_id=$1"));
 assert.ok(route.includes("ba.status='active'"));
 assert.ok(route.includes("la.status='active'"));
});
