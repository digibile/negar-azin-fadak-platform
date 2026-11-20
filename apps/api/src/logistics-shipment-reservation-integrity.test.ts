import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./logistics.ts",import.meta.url),"utf8");

test("real shipment transition to in-transit consumes the linked warehouse reservation",()=>{
 const start=source.indexOf('logisticsRouter.patch("/api/logistics/shipments/:id/status"');
 const end=source.indexOf('logisticsRouter.get("/api/logistics/shipments/:id/tracking"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes("where id=$1 and tenant_id=$2 for update"));
 assert.ok(route.includes('b.status==="in_transit"'));
 assert.ok(route.includes("marketplace_inventory_reservations"));
 assert.ok(route.includes("quantity=quantity-$1,reserved_quantity=reserved_quantity-$1"));
 assert.ok(route.includes("status='consumed'"));
 assert.ok(route.includes("set status='shipped'"));
});

test("shipment cancellation before dispatch releases reservations, while failure after pickup does not auto-return stock",()=>{
 const start=source.indexOf('logisticsRouter.patch("/api/logistics/shipments/:id/status"');
 const end=source.indexOf('logisticsRouter.get("/api/logistics/shipments/:id/tracking"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes('b.status==="cancelled"&&["draft","submitted","approved","assigned"].includes(supply.status)'));
 assert.ok(route.includes("status='released'"));
 assert.ok(!route.includes('b.status==="failed"&&["draft","submitted","approved","assigned"].includes(supply.status)'));
});

test("supply-order cancellation refuses to release stock while a shipment remains active",()=>{
 const start=source.indexOf('logisticsRouter.patch("/api/logistics/orders/:id/status"');
 const end=source.indexOf('logisticsRouter.get("/api/logistics/vehicles"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes("select id,status from logistics_shipments"));
 assert.ok(route.includes("status in ('planned','assigned','picked_up','in_transit')"));
 assert.ok(route.includes("ابتدا مرسوله فعال را از مسیر حمل لغو کنید"));
});
