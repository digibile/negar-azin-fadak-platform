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
