import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./logistics.ts",import.meta.url),"utf8");

test("logistics create endpoints validate numeric capacities and distances",()=>{
 assert.match(source,/const plateNo=String\(b\.plateNo\?\?""\)\.trim\(\),title=String\(b\.title\?\?" "\)\.trim\(\),capacity=Number\(b\.capacity\?\?0\)/);
 assert.match(source,/Number\.isFinite\(capacity\)\|\|capacity<0/);
 assert.match(source,/Number\.isFinite\(distance\)\|\|distance<0/);
});

test("logistics create endpoints normalize and bound required text fields",()=>{
 assert.match(source,/orderNo=String\(b\.orderNo\?\?" "\)\.trim\(\),origin=String\(b\.origin\?\?" "\)\.trim\(\),destination=String\(b\.destination\?\?" "\)\.trim\(\)/);
 assert.match(source,/name=String\(b\.name\?\?" "\)\.trim\(\),mobile=String\(b\.mobile\?\?" "\)\.trim\(\),licenseNo=String\(b\.licenseNo\?\?" "\)\.trim\(\)/);
 assert.match(source,/planNo\.length>120/);
 assert.match(source,/code\.length>80/);
});

test("logistics write endpoints remain permission protected and tenant scoped",()=>{
 assert.match(source,/logisticsRouter\.post\("\/api\/logistics\/vehicles",requireAuth,requirePermission\("modules:12-logistics-supply:write"\)/);
 assert.match(source,/logisticsRouter\.post\("\/api\/logistics\/drivers",requireAuth,requirePermission\("modules:12-logistics-supply:write"\)/);
 assert.match(source,/logisticsRouter\.post\("\/api\/logistics\/routes",requireAuth,requirePermission\("modules:12-logistics-supply:write"\)/);
 assert.match(source,/where id=\$1 and tenant_id=\$2/);
});

test("logistics draft edits reject stale status and tenant-crossing references",()=>{
 assert.match(source,/if\(old\.status!==\"draft\"\)return fail\(res,409/);
 assert.match(source,/select id,status from logistics_supply_plans where id=\$1 and tenant_id=\$2/);
 assert.match(source,/where id=\$9 and tenant_id=\$10 and status='draft'/);
});

test("shipment dispatch serializes driver assignment and rejects concurrent active work",()=>{
 assert.match(source,/select id,status,license_expiry from logistics_drivers where id=\$1 and tenant_id=\$2 for update/);
 assert.match(source,/from logistics_shipments where tenant_id=\$1 and driver_id=\$2 and status in \('planned','assigned','picked_up','in_transit'\)/);
});
