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
 assert.match(r.body,/select coalesce\(sum\(amount\),0\)::numeric total from purchase_payments where tenant_id=\$1 and invoice_id=\$2 and status='confirmed'/);
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

test("RFQ creation locks the approved request and atomically records invitations and transition",()=>{
 const r=route('router.post("/api/purchasing/rfqs"','router.post("/api/purchasing/quotes"');
 assert.ok(r.start>=0);
 assert.ok(r.body.includes("begin"));
 assert.ok(r.body.includes("purchase_requests where id=$1 and tenant_id=$2 for update"));
 assert.ok(r.body.includes("purchase_suppliers where id=$1 and tenant_id=$2 and status='active' for update"));
 assert.ok(r.body.includes("new Set(suppliers.map(String))"));
 assert.ok(r.body.includes("insert into purchase_rfq_suppliers"));
 assert.ok(r.body.includes("status='approved' returning id"));
 assert.ok(r.body.includes("insert into purchase_events"));
 assert.ok(r.body.includes("commit"));
 assert.ok(r.body.includes("rollback"));
 assert.ok(r.body.includes("finally{c.release()}"));
});

test("supplier quote selection serializes on the RFQ and permits one terminal selection",()=>{
 const r=route('router.patch("/api/purchasing/rfqs/:id/select"','router.post("/api/purchasing/orders"');
 assert.ok(r.start>=0);
 assert.match(r.body,/for update of q,r/);
 assert.match(r.body,/selected\.status!=="received"/);
 assert.match(r.body,/\["sent","quoting","compared"\]\.includes\(selected\.rfq_status\)/);
 assert.match(r.body,/update purchase_rfqs set status='selected' where id=\$1 and tenant_id=\$2 and status in \('sent','quoting','compared'\) returning id/);
 assert.ok(r.body.indexOf("update purchase_rfqs set status='selected'")<r.body.indexOf("update purchase_supplier_quotes set status='rejected'"));
 assert.match(r.body,/status='rejected' where rfq_id=\$1 and id<>\$2 and status='received'/);
 assert.match(r.body,/set status='selected' where id=\$1 and rfq_id=\$2 and status='received' returning \*/);
 assert.match(r.body,/insert into purchase_events/);
 assert.match(r.body,/begin/);
 assert.match(r.body,/commit/);
 assert.match(r.body,/rollback/);
 assert.match(r.body,/finally\{c\.release\(\)\}/);
});

test("purchase order creation rejects reused selected quotes and advances request atomically",()=>{
 const r=route('router.post("/api/purchasing/orders"','router.patch("/api/purchasing/orders/:id/status"');
 assert.ok(r.start>=0);
 assert.match(r.body,/for update of q,r/);
 assert.match(r.body,/select id,order_no from purchase_orders where tenant_id=\$1 and quote_id=\$2 limit 1/);
 assert.match(r.body,/برای این پیشنهاد قبلاً سفارش خرید ثبت شده است/);
 assert.match(r.body,/select id,status from purchase_requests where id=\$1 and tenant_id=\$2 for update/);
 assert.match(r.body,/update purchase_requests set status='ordered',updated_at=now\(\) where id=\$1 and tenant_id=\$2 and status=\$3 returning id/);
 assert.match(r.body,/purchase_order_created/);
 assert.match(r.body,/insert into purchase_order_items/);
 assert.match(r.body,/begin/);
 assert.match(r.body,/commit/);
 assert.match(r.body,/rollback/);
 assert.match(r.body,/finally\{c\.release\(\)\}/);
});


test("purchase order lifecycle allows only draft approval, supplier dispatch and cancellation before receipt",()=>{
 const lifecycle=fs.readFileSync(new URL("./commerce-lifecycle.ts",import.meta.url),"utf8");
 assert.match(lifecycle,/draft:\["approved","cancelled"\]/);
 assert.match(lifecycle,/approved:\["sent","cancelled"\]/);
 assert.match(lifecycle,/sent:\["cancelled"\]/);
 assert.match(lifecycle,/partially_received:\[\]/);
 assert.match(lifecycle,/received:\[\]/);
 assert.match(lifecycle,/invoiced:\[\]/);
 assert.match(lifecycle,/paid:\[\]/);
});

test("purchase order status changes lock the tenant-owned order and validate active supplier before approval",()=>{
 const r=route('router.patch("/api/purchasing/orders/:id/status"','router.post("/api/purchasing/receipts"');
 assert.ok(r.start>=0);
 assert.match(r.body,/requireAuth,requirePermission\("modules:21-purchasing-supply:approve"\)/);
 assert.match(r.body,/begin/);
 assert.match(r.body,/purchase_orders where id=\$1 and tenant_id=\$2 for update/);
 assert.match(r.body,/isAllowedLifecycleTransition\(purchaseOrderTransitions,old\.status,to\)/);
 assert.match(r.body,/purchase_suppliers where id=\$1 and tenant_id=\$2 for update/);
 assert.match(r.body,/supplier\.rows\[0\]\.status!=="active"/);
 assert.match(r.body,/update purchase_orders set status=\$1,updated_at=now\(\) where id=\$2 and tenant_id=\$3 returning \*/);
 assert.match(r.body,/insert into purchase_events/);
 assert.match(r.body,/commit/);
 assert.match(r.body,/rollback/);
 assert.match(r.body,/finally\{c\.release\(\)\}/);
});

test("receipt completion is driven by cumulative delivered quantity, not accepted quantity",()=>{
 const r=route('router.post("/api/purchasing/receipts"','router.post("/api/purchasing/invoices"');
 assert.match(r.body,/const row=found\.rows\[0\],open=Number\(row\.quantity\)-Number\(row\.received_qty\|\|0\)/);
 assert.match(r.body,/quantity>open\+0\.000001/);
 assert.match(r.body,/update purchase_order_items set received_qty=received_qty\+\$1/);
 assert.match(r.body,/count\(\*\) filter\(where received_qty<quantity\) remaining/);
 assert.match(r.body,/remaining\?"partially_received":"received"/);
 assert.doesNotMatch(r.body,/accepted_qty<quantity/);
});


test("purchase invoice is created under an order lock and leaves accounting event pending",()=>{
 const r=route('router.post("/api/purchasing/invoices"','router.post("/api/purchasing/invoices/:id/payments"');
 assert.ok(r.start>=0);
 assert.match(r.body,/purchase_orders where id=\$1 and tenant_id=\$2 for update/);
 assert.match(r.body,/old\.status!=="received"/);
 assert.match(r.body,/purchase_invoices where tenant_id=\$1 and order_id=\$2 limit 1/);
 assert.match(r.body,/purchase_financial_events\(tenant_id,source_type,source_id,event_type,amount,state,reference_no\)/);
 assert.match(r.body,/'pending_accounting'/);
 assert.match(r.body,/update purchase_orders set status='invoiced'.*status='received' returning id/);
 assert.match(r.body,/begin/);
 assert.match(r.body,/commit/);
 assert.match(r.body,/rollback/);
});

test("supplier payment is serialized on the invoice and emits a pending accounting event",()=>{
 const r=route('router.post("/api/purchasing/invoices/:id/payments"','router.post("/api/purchasing/returns"');
 assert.match(r.body,/purchase_invoices where id=\$1 and tenant_id=\$2 for update/);
 assert.match(r.body,/paidBefore\+amount>total\+0\.000001/);
 assert.match(r.body,/insert into purchase_payments/);
 assert.match(r.body,/update purchase_invoices set paid_total=\$1,status=\$2 where id=\$3 and tenant_id=\$4/);
 assert.match(r.body,/purchase_financial_events\(tenant_id,source_type,source_id,event_type,amount,state,reference_no\)/);
 assert.match(r.body,/'pending_accounting'/);
 assert.match(r.body,/update purchase_orders set status='paid'.*status='invoiced' returning id/);
 assert.match(r.body,/begin/);
 assert.match(r.body,/commit/);
 assert.match(r.body,/rollback/);
});

test("credited purchase returns create a separate pending accounting event without posting a ledger entry",()=>{
 const r=route('router.patch("/api/purchasing/returns/:id/status"','router.get("/api/purchasing/');
 assert.ok(r.start>=0);
 assert.match(r.body,/if\(to==="credited"\)/);
 assert.match(r.body,/purchase_financial_events\(tenant_id,source_type,source_id,event_type,amount,state,reference_no\)/);
 assert.match(r.body,/'purchase_return'.*'supplier_credit_note'.*'pending_accounting'/);
 assert.match(r.body,/insert into purchase_events/);
 assert.match(r.body,/begin/);
 assert.match(r.body,/commit/);
 assert.match(r.body,/rollback/);
});


test("purchase return requests reserve invoice value under an order and invoice lock",()=>{
 const r=route('router.post("/api/purchasing/returns"','router.patch("/api/purchasing/returns/:id/status"');
 assert.ok(r.start>=0);
 assert.match(r.body,/purchase_orders where id=\$1 and tenant_id=\$2 for update/);
 assert.match(r.body,/purchase_invoices where order_id=\$1 and tenant_id=\$2 for update/);
 assert.match(r.body,/purchase_returns where tenant_id=\$1 and order_id=\$2 and status not in \('rejected','cancelled'\)/);
 assert.match(r.body,/amount\+already>invoiceTotal\+0\.000001/);
 assert.match(r.body,/insert into purchase_returns/);
 assert.match(r.body,/insert into purchase_events/);
 assert.match(r.body,/begin/);
 assert.match(r.body,/commit/);
 assert.match(r.body,/rollback/);
});

test("purchase return credit requires received goods and is bounded by prior credited value",()=>{
 const r=route('router.patch("/api/purchasing/returns/:id/status"','router.post("/api/purchasing/evaluations"');
 assert.ok(r.start>=0);
 assert.match(r.body,/requested:\["approved","rejected","cancelled"\]/);
 assert.match(r.body,/approved:\["shipped","rejected"\]/);
 assert.match(r.body,/shipped:\["received"\]/);
 assert.match(r.body,/received:\["credited"\]/);
 assert.match(r.body,/purchase_returns where id=\$1 and tenant_id=\$2 for update/);
 assert.match(r.body,/purchase_orders where id=\$1 and tenant_id=\$2 for update/);
 assert.match(r.body,/status='credited'/);
 assert.match(r.body,/credited\+amount>total\+0\.000001/);
 assert.match(r.body,/supplier_credit_note/);
 assert.match(r.body,/'pending_accounting'/);
 assert.match(r.body,/insert into purchase_events/);
 assert.match(r.body,/begin/);
 assert.match(r.body,/commit/);
 assert.match(r.body,/rollback/);
});
