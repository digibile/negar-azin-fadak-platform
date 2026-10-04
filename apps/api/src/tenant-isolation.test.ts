import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("module record runtime is tenant scoped",()=>{
 const source=fs.readFileSync(new URL("./server.ts",import.meta.url),"utf8");
 assert.match(source,/where id=\$4 and module_id=\$5 and tenant_id=\$7/);
 assert.match(source,/where id=\$1 and module_id=\$2 and tenant_id=\$3/);
 assert.match(source,/insert into module_records\(tenant_id,module_id/);
});
test("business event dispatcher is tenant scoped",()=>{
 const source=fs.readFileSync(new URL("./business-events.ts",import.meta.url),"utf8");
 assert.match(source,/where tenant_id=\$1 and event_key=\$2/);
 assert.match(source,/insert into rule_executions\(tenant_id/);
});

test("checkout payment and order cancellation enforce tenant ownership",()=>{
 const checkout=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");
 assert.match(checkout,/where id=\$1 and tenant_id=\$2 for update/);
 assert.match(checkout,/where id=\$1 and tenant_id=\$2.*for update/);
 assert.match(checkout,/update marketplace_orders set status='cancelled'.*where id=\$1/);
});
test("order lifecycle locks and scopes the order by tenant",()=>{
 const source=fs.readFileSync(new URL("./domain-marketplace.ts",import.meta.url),"utf8");
 assert.match(source,/from marketplace_orders where id=\$1 and tenant_id=\$2 for update/);
 assert.match(source,/update marketplace_orders set \$\{set\} where id=\$3 and tenant_id=\$4/);
 assert.match(source,/tenant_id=\$1.*marketplace_order/);
});

test("payment flow records paid timestamp and tenant guard",()=>{
 const source=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");
 assert.match(source,/set status='paid',paid_at=coalesce\(paid_at,now\(\)\),updated_at=now\(\) where id=\$1 and tenant_id=\$2/);
 assert.match(source,/insert into marketplace_payments\(tenant_id,order_id/);
});
test("settlement flow is tenant scoped and ledger-backed",()=>{
 const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");
 assert.match(source,/where o\.tenant_id=\$1 and o\.status='paid'/);
 assert.match(source,/where id=\$1 and tenant_id=\$2 for update/);
 assert.match(source,/postLedgerEntry\(client/);
 assert.match(source,/sourceType:"seller_settlement"/);
});

test("refund flow is tenant scoped, provider-backed and ledger-reversing",()=>{
 const source=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");
 assert.match(source,/post\("/api/marketplace/orders/:id/refund"/);
 assert.match(source,/payment:refund/);
 assert.match(source,/from marketplace_payments where tenant_id=\$1 and order_id=\$2 and status='paid'/);
 assert.match(source,/provider\.refundPayment/);
 assert.match(source,/sourceType:"marketplace_refund"/);
 assert.match(source,/movement_type,quantity,reference_type,reference_id,created_by/);
 assert.match(source,/eventKey:"payment.refunded"/);
});

test("legacy cancel endpoint rejects paid and fulfilled lifecycle states",()=>{
 const source=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");
 assert.match(source,/\["paid","processing","shipped","delivered","returned","cancelled","refunded"\]/);
 assert.match(source,/این سفارش باید از مسیر بازگشت وجه یا چرخه مجاز مدیریت شود/);
});


test("paid and processing lifecycle require refund path",()=>{
 const source=fs.readFileSync(new URL("./domain-marketplace.ts",import.meta.url),"utf8");
 assert.match(source,/paid:\["processing","refunded"\]/);
 assert.match(source,/processing:\["shipped","returned"\]/);
 assert.match(source,/لغو سفارش پرداخت‌شده باید از مسیر بازپرداخت انجام شود/);
});

test("marketplace lifecycle has the database pool required for transactional transitions",()=>{
 const source=fs.readFileSync(new URL("./domain-marketplace.ts",import.meta.url),"utf8");
 assert.match(source,/import \{pool,query\} from "\.\/db\.js";/);
});

test("legacy cancel update remains tenant scoped",()=>{
 const source=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");
 assert.match(source,/update marketplace_orders set status='cancelled',updated_at=now\(\) where id=\\\$1 and tenant_id=\\\$2/);
});
