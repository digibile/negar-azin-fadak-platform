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
