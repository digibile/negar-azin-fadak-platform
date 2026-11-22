import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./logistics.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/105_logistics_supply_complete.sql",import.meta.url),"utf8");

function routeBetween(startMarker:string,endMarker:string){
  const start=source.indexOf(startMarker);
  assert.ok(start>=0,`missing route marker: ${startMarker}`);
  const end=source.indexOf(endMarker,start+startMarker.length);
  assert.ok(end>start,`missing route end marker: ${endMarker}`);
  return source.slice(start,end);
}

test("shipment delivery is a tenant-scoped, locked and permission-protected transition",()=>{
  const route=routeBetween(
    'logisticsRouter.patch("/api/logistics/shipments/:id/status"',
    'logisticsRouter.get("/api/logistics/shipments/:id/tracking"'
  );
  assert.ok(route.includes("where id=$1 and tenant_id=$2"));
  assert.ok(route.includes("select id from logistics_supply_orders where id=$1 and tenant_id=$2 for update"));
  assert.ok(route.includes("select * from logistics_shipments where id=$1 and tenant_id=$2 for update"));
  assert.ok(route.includes('const permission=isDelivery?"modules:12-logistics-supply:deliver"'));
  assert.ok(route.includes('in_transit:["delivered","failed"]'));
  assert.ok(route.includes('b.status==="delivered"&&!String(b.location||"").trim()'));
  assert.ok(route.includes("where id=$3 and tenant_id=$4 and status=$5 returning *"));
});

test("warehouse reservation is consumed at dispatch, never a second time at delivery",()=>{
  const route=routeBetween(
    'logisticsRouter.patch("/api/logistics/shipments/:id/status"',
    'logisticsRouter.get("/api/logistics/shipments/:id/tracking"'
  );
  const dispatch=route.indexOf('b.status==="in_transit"');
  const delivered=route.indexOf('else if(supply&&b.status==="delivered")');
  const cancelled=route.indexOf('else if(supply&&b.status==="cancelled")',delivered);
  assert.ok(dispatch>=0&&delivered>dispatch&&cancelled>delivered);
  const dispatchBlock=route.slice(dispatch,delivered);
  const deliveredBlock=route.slice(delivered,cancelled);
  assert.ok(dispatchBlock.includes("inventory_stock"));
  assert.ok(dispatchBlock.includes("status='consumed'"));
  assert.ok(deliveredBlock.includes("status='delivered'"));
  assert.ok(!deliveredBlock.includes("inventory_stock"));
  assert.ok(!deliveredBlock.includes("marketplace_inventory_reservations"));
});

test("marketplace supply-order delivery cannot bypass the shipment lifecycle",()=>{
  const route=routeBetween(
    'logisticsRouter.patch("/api/logistics/orders/:id/status"',
    'logisticsRouter.get("/api/logistics/vehicles"'
  );
  assert.ok(route.includes('if(o.marketplace_order_id&&["shipped","delivered"].includes(b.status))'));
  assert.ok(route.includes("وضعیت ارسال و تحویل سفارش بازارگاه فقط از مسیر گردش وضعیت مرسوله ثبت می‌شود"));
});

test("shipment event history is appended only after the validated transition",()=>{
  const route=routeBetween(
    'logisticsRouter.patch("/api/logistics/shipments/:id/status"',
    'logisticsRouter.get("/api/logistics/shipments/:id/tracking"'
  );
  const update=route.indexOf("update logistics_shipments set status=$1");
  const event=route.indexOf("insert into logistics_delivery_events");
  const commit=route.indexOf('await c.query("commit")');
  assert.ok(update>=0&&event>update&&commit>event);
  assert.ok(route.includes("tenant_id,shipment_id,status,location,description,actor_user_id"));
});

test("shipment base schema stores transport timestamps and tenant-owned delivery events",()=>{
  assert.ok(migration.includes("tenant_id uuid not null,shipment_no text not null"));
  assert.ok(migration.includes("dispatch_at timestamptz"));
  assert.ok(migration.includes("delivered_at timestamptz"));
  assert.ok(migration.includes("create table if not exists logistics_delivery_events"));
  assert.ok(migration.includes("occurred_at timestamptz not null default now()"));
});
