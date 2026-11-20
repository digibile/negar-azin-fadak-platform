import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const checkout=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");

test("refund releases only pre-dispatch warehouse reservations and cancels linked supply request",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const end=checkout.indexOf("checkoutRouter.",start+40);
 const route=checkout.slice(start,end>start?end:undefined);
 assert.ok(route.includes("marketplace_inventory_reservations"));
 assert.ok(route.includes('["draft","submitted","approved","assigned"].includes(linkedSupply.status)'));
 assert.ok(route.includes("reserved_quantity=reserved_quantity-$1"));
 assert.ok(route.includes("status='released'"));
 assert.ok(route.includes("set status='cancelled'"));
 assert.ok(route.includes("refund_cancelled"));
 assert.ok(route.includes("رزرو انبار با دفتر موجودی هم‌خوانی ندارد"));
});

test("refund blocks while a shipment is active before calling the payment provider",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const route=checkout.slice(start);
 const guard=route.indexOf("activeShipment");
 const provider=route.indexOf("provider.refundPayment");
 assert.ok(guard>=0&&provider>guard);
 assert.ok(route.includes("status in ('planned','assigned','picked_up','in_transit','failed')"));
 assert.ok(route.includes("پیش از بازپرداخت، مرسوله فعال باید از مسیر حمل تعیین تکلیف شود"));
});
