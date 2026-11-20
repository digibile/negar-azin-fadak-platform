import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const logistics=fs.readFileSync(new URL("./logistics.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/124_marketplace_warehouse_reservations.sql",import.meta.url),"utf8");
const mappingMigration=fs.readFileSync(new URL("../../../database/migrations/123_marketplace_inventory_product_links.sql",import.meta.url),"utf8");
const marketplace=fs.readFileSync(new URL("./domain-marketplace.ts",import.meta.url),"utf8");
const productPage=fs.readFileSync(new URL("../../web/app/marketplace/products/page.tsx",import.meta.url),"utf8");
const logisticsPage=fs.readFileSync(new URL("../../web/app/modules/LogisticsWorkspace.tsx",import.meta.url),"utf8");

test("warehouse reservation ledger is tenant-bound and records unit conversion",()=>{
 assert.match(migration,/quantity_factor numeric\(20,6\) not null default 1 check\(quantity_factor>0\)/);
 assert.match(migration,/foreign key\(tenant_id,supply_order_id\) references logistics_supply_orders\(tenant_id,id\)/);
 assert.match(migration,/foreign key\(tenant_id,marketplace_order_id\) references marketplace_orders\(tenant_id,id\)/);
 assert.match(migration,/foreign key\(tenant_id,warehouse_id\) references inventory_warehouses\(tenant_id,id\)/);
 assert.match(migration,/foreign key\(tenant_id,inventory_product_id\) references inventory_products\(tenant_id,id\)/);
 assert.match(migration,/status text not null default 'reserved' check\(status in \('reserved','consumed','released'\)\)/);
 assert.match(mappingMigration,/primary key\(tenant_id,product_id\)/);
});

test("marketplace fulfillment validates all mappings and reserves only available stock atomically",()=>{
 const start=logistics.indexOf('logisticsRouter.post("/api/logistics/orders/from-marketplace/:orderId"');
 const end=logistics.indexOf('logisticsRouter.post("/api/logistics/orders",',start);
 const route=logistics.slice(start,end);
 assert.ok(route.includes("order.status!==\"paid\""));
 assert.ok(route.includes("mil.quantity_factor"));
 assert.ok(route.includes("all products"));
 assert.ok(route.includes("for update"));
 assert.ok(route.includes("quantity-reserved_quantity"));
 assert.ok(route.includes("reserved_quantity=reserved_quantity+$1"));
 assert.ok(route.includes("insert into marketplace_inventory_reservations"));
 assert.ok(route.includes("await c.query(\"begin\")"));
 assert.ok(route.includes("await c.query(\"commit\")"));
});

test("shipment consumes reserved stock and pre-dispatch cancellation releases it",()=>{
 const start=logistics.indexOf('logisticsRouter.patch("/api/logistics/orders/:id/status"');
 const end=logistics.indexOf('logisticsRouter.get("/api/logistics/vehicles"',start);
 const route=logistics.slice(start,end);
 assert.ok(route.includes('b.status==="shipped"'));
 assert.ok(route.includes("quantity=quantity-$1,reserved_quantity=reserved_quantity-$1"));
 assert.ok(route.includes("status='consumed'"));
 assert.ok(route.includes('b.status==="cancelled"&&["draft","submitted","approved","assigned"].includes(o.status)'));
 assert.ok(route.includes("reserved_quantity=reserved_quantity-$1"));
 assert.ok(route.includes("status='released'"));
 assert.ok(route.includes("if(o.marketplace_order_id&&!reservations.length)"));
});

test("product editor configures conversion and logistics queue displays reservation status",()=>{
 assert.ok(marketplace.includes("quantity_factor"));
 assert.ok(productPage.includes("mappingQuantityFactor"));
 assert.ok(productPage.includes("quantityFactor: Number(mappingQuantityFactor)"));
 assert.ok(logistics.includes("as inventory_reservations"));
 assert.ok(logisticsPage.includes("رزرو انبار"));
 assert.ok(logisticsPage.includes("consumed:\"کسرشده از انبار\""));
});
