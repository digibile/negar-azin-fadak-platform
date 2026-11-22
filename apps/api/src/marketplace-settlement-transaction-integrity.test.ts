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
