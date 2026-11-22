import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");
const routeStart=source.indexOf('settlementRouter.get("/api/marketplace/settlements/delivery-reconciliation"');
const route=routeStart<0?"":source.slice(routeStart);

test("delivery reconciliation is a permission-protected tenant-scoped read-only endpoint",()=>{
 assert.ok(routeStart>=0);
 assert.match(route,/requireAuth,requirePermission\("settlement:view"\)/);
 assert.match(route,/o\.tenant_id=\$1 and o\.status='paid'/);
 assert.match(route,/si\.tenant_id=o\.tenant_id and si\.order_id=o\.id/);
 assert.match(route,/ss\.tenant_id=o\.tenant_id/);
 assert.match(route,/res\.json\(\{items:r\.rows,limit:200,readOnly:true\}\)/);
 assert.doesNotMatch(route,/\b(insert into|update\s+[a-z_]+\s+set|delete from)\b/i);
});

test("delivery reconciliation selects the latest shipment and exposes logistics exceptions",()=>{
 assert.match(route,/left join lateral/);
 assert.match(route,/order by x\.created_at desc,x\.id desc\s+limit 1/);
 assert.match(route,/logistics_not_created/);
 assert.match(route,/shipment_not_created/);
 assert.match(route,/delivery_exception/);
 assert.match(route,/shipment_in_progress/);
 assert.match(route,/when sh\.status='delivered' then 'delivered'/);
});
