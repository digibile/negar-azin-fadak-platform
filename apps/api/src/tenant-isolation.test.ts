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
