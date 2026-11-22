import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./purchasing-supply.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/103_purchasing_supply_complete.sql",import.meta.url),"utf8");

const route=(startMarker:string,endMarker:string)=>{
 const start=source.indexOf(startMarker);
 const end=source.indexOf(endMarker,start+startMarker.length);
 return {start,body:start<0?"":source.slice(start,end<0?undefined:end)};
};

test("purchase receipt is tenant-scoped, locked and atomic",()=>{
 const r=route('router.post("/api/purchasing/receipts"','router.post("/api/purchasing/invoices"');
 assert.ok(r.start>=0);
 assert.match(r.body,/requireAuth,requirePermission\("modules:21-purchasing-supply:receive"\)/);
 assert.match(r.body,/select \* from purchase_orders where id=\$1 and tenant_id=\$2 for update/);
 assert.match(r.body,/begin/);
 assert.match(r.body,/commit/);
 assert.match(r.body,/rollback/);
 assert.match(r.body,/finally\{c\.release\(\)\}/);
});

test("purchase receipt rejects duplicate or inconsistent received, accepted and rejected quantities",()=>{
 const r=route('router.post("/api/purchasing/receipts"','router.post("/api/purchasing/invoices"');
 assert.match(r.body,/const seen=new Set<string>\(\)/);
 assert.match(r.body,/seen\.has\(itemId\)/);
 assert.match(r.body,/accepted\+rejected-quantity/);
 assert.match(r.body,/quantity>open\+0\.000001/);
 assert.match(r.body,/where id=\$1 and order_id=\$2 for update/);
});

test("receipt records delivered quantity separately from accepted and rejected quantities",()=>{
 const r=route('router.post("/api/purchasing/receipts"','router.post("/api/purchasing/invoices"');
 assert.match(r.body,/received_qty=received_qty\+\$1/);
 assert.match(r.body,/purchase_receipt_items\(receipt_id,order_item_id,quantity,accepted_qty,rejected_qty\)/);
 assert.match(migration,/received_qty numeric\(20,4\) not null default 0/);
 assert.match(migration,/accepted_qty numeric\(20,4\) not null default 0/);
 assert.match(migration,/rejected_qty numeric\(20,4\) not null default 0/);
});

test("purchase invoice is issued only after full delivery and values accepted quantities",()=>{
 const r=route('router.post("/api/purchasing/invoices"','router.post("/api/purchasing/invoices/:id/payments"');
 assert.match(r.body,/old\.status!=="received"/);
 assert.match(r.body,/sum\(oi\.unit_price\*ri\.accepted_qty\)/);
 assert.match(r.body,/sum\(oi\.unit_price\*ri\.accepted_qty\*oi\.tax_rate\/100\)/);
 assert.match(r.body,/purchase_invoices where tenant_id=\$1 and order_id=\$2/);
 assert.match(r.body,/purchase_financial_events/);
 assert.match(r.body,/pending_accounting/);
});

test("supplier payment is locked, tenant-scoped and cannot exceed the invoice balance",()=>{
 const r=route('router.post("/api/purchasing/invoices/:id/payments"','router.post("/api/purchasing/returns"');
 assert.match(r.body,/requireAuth,requirePermission\("modules:21-purchasing-supply:payment"\)/);
 assert.match(r.body,/purchase_invoices where id=\$1 and tenant_id=\$2 for update/);
 assert.match(r.body,/paidBefore\+amount>total\+0\.000001/);
 assert.match(r.body,/purchase_payments/);
 assert.match(r.body,/purchase_financial_events/);
 assert.match(r.body,/pending_accounting/);
 assert.match(r.body,/begin/);
 assert.match(r.body,/commit/);
 assert.match(r.body,/rollback/);
});


test("purchase request status transitions are tenant-scoped, locked and atomic",()=>{
 const r=route('router.patch("/api/purchasing/requests/:id/status"','router.post("/api/purchasing/rfqs"');
 assert.ok(r.start>=0);
 assert.ok(r.body.includes('requireAuth,requirePermission("modules:21-purchasing-supply:approve")'));
 assert.ok(r.body.includes("begin"));
 assert.ok(r.body.includes("purchase_requests where id=$1 and tenant_id=$2 for update"));
 assert.ok(r.body.includes("where id=$2 and tenant_id=$3 and status=$4 returning *"));
 assert.ok(r.body.includes("insert into purchase_events"));
 assert.ok(r.body.includes("commit"));
 assert.ok(r.body.includes("rollback"));
 assert.ok(r.body.includes("finally{c.release()}"));
});
