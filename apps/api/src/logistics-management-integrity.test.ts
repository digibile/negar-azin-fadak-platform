import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./logistics.ts",import.meta.url),"utf8");

test("logistics create endpoints validate numeric capacities and distances",()=>{
 assert.ok(source.includes("capacity=Number(b.capacity??0)"));
 assert.ok(source.includes("Number.isFinite(capacity)||capacity<0"));
 assert.ok(source.includes("Number.isFinite(distance)||distance<0"));
 assert.ok(source.includes("quantity=Number(b.quantity??0)"));
 assert.ok(source.includes("Number.isFinite(quantity)||quantity<0"));
});

test("logistics create endpoints normalize and bound required text fields",()=>{
 assert.ok(source.includes('orderNo=String(b.orderNo??"").trim()'));
 assert.ok(source.includes('origin=String(b.origin??"").trim()'));
 assert.ok(source.includes('destination=String(b.destination??"").trim()'));
 assert.ok(source.includes('name=String(b.name??"").trim()'));
 assert.ok(source.includes('mobile=String(b.mobile??"").trim()'));
 assert.ok(source.includes("planNo.length>120"));
 assert.ok(source.includes("code.length>80"));
});

test("logistics write endpoints remain permission protected and tenant scoped",()=>{
 assert.ok(source.includes('logisticsRouter.post("/api/logistics/vehicles",requireAuth,requirePermission("modules:12-logistics-supply:write")'));
 assert.ok(source.includes('logisticsRouter.post("/api/logistics/drivers",requireAuth,requirePermission("modules:12-logistics-supply:write")'));
 assert.ok(source.includes('logisticsRouter.post("/api/logistics/routes",requireAuth,requirePermission("modules:12-logistics-supply:write")'));
 assert.ok(source.includes("where id=$1 and tenant_id=$2"));
});

test("logistics draft edits reject stale status and tenant-crossing references",()=>{
 assert.ok(source.includes('if(old.status!=="draft")return fail(res,409'));
 assert.ok(source.includes("select id,status from logistics_supply_plans where id=$1 and tenant_id=$2"));
 assert.ok(source.includes("where id=$9 and tenant_id=$10 and status='draft'"));
});

test("shipment dispatch serializes driver assignment and rejects concurrent active work",()=>{
 assert.ok(source.includes("select id,status,license_expiry from logistics_drivers where id=$1 and tenant_id=$2 for update"));
 assert.ok(source.includes("from logistics_shipments where tenant_id=$1 and driver_id=$2 and status in ('planned','assigned','picked_up','in_transit')"));
});


test("paid storefront orders can be linked to logistics once by stable order id",()=>{
 assert.ok(source.includes('/api/logistics/orders/from-marketplace/:orderId'));
 assert.ok(source.includes('requirePermission("modules:12-logistics-supply:write")'));
 assert.ok(source.includes('if(order.status!=="paid")'));
 assert.ok(source.includes("marketplace_order_id=$2"));
 assert.ok(source.includes("marketplace_order_linked"));
 assert.ok(source.includes("idempotent:true"));
});


test("logistics storefront fulfillment queue lists only paid tenant orders and exposes existing linkage",()=>{
 assert.ok(source.includes('/api/logistics/marketplace-orders/eligible'));
 assert.ok(source.includes("where o.tenant_id=$1 and o.status='paid'"));
 assert.ok(source.includes("so.marketplace_order_id=o.id"));
 assert.ok(source.includes("as supply_order_id"));
});


test("marketplace fulfillment requires an active warehouse in the same tenant",()=>{
 assert.ok(source.includes('sourceWarehouseId=String(req.body?.sourceWarehouseId??"").trim()'));
 assert.ok(source.includes("from inventory_warehouses where id=$1 and tenant_id=$2 and status='active'"));
 assert.ok(source.includes("source_warehouse_id,origin,destination"));
 assert.ok(source.includes("warehouse.id,origin,destination"));
});


test("shipment list and tracking joins enforce tenant equality on every related record",()=>{
 const listStart=source.indexOf('logisticsRouter.get("/api/logistics/shipments"');
 const createStart=source.indexOf('logisticsRouter.post("/api/logistics/shipments"');
 const listRoute=source.slice(listStart,createStart);
 assert.ok(listRoute.includes("o.tenant_id=s.tenant_id"));
 assert.ok(listRoute.includes("r.tenant_id=s.tenant_id"));
 assert.ok(listRoute.includes("v.tenant_id=s.tenant_id"));
 assert.ok(listRoute.includes("d.tenant_id=s.tenant_id"));
 const trackingStart=source.indexOf('logisticsRouter.get("/api/logistics/shipments/:id/tracking"');
 const invoiceStart=source.indexOf('logisticsRouter.post("/api/logistics/carrier-invoices/:id/accounting-draft"',trackingStart);
 const trackingRoute=source.slice(trackingStart,invoiceStart);
 assert.ok(trackingRoute.includes("o.tenant_id=s.tenant_id"));
});


test("logistics eligible-order product details and supply-plan joins remain tenant scoped",()=>{
 const eligibleStart=source.indexOf('logisticsRouter.get("/api/logistics/marketplace-orders/eligible"');
 const supplyListStart=source.indexOf('logisticsRouter.get("/api/logistics/orders"');
 const eligibleRoute=source.slice(eligibleStart,supplyListStart);
 assert.ok(eligibleRoute.includes("p.tenant_id=o.tenant_id"));
 const supplyOrderListStart=source.indexOf('logisticsRouter.get("/api/logistics/orders"');
 const supplyOrderCreateStart=source.indexOf('logisticsRouter.post("/api/logistics/orders/from-marketplace/:orderId"');
 const supplyOrderList=source.slice(supplyOrderListStart,supplyOrderCreateStart);
 assert.ok(supplyOrderList.includes("p.tenant_id=o.tenant_id"));
});
