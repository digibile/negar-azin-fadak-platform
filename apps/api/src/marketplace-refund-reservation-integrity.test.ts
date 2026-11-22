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

test("direct full refund is blocked for any order with a shipment before provider execution",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const route=checkout.slice(start);
 const guard=route.indexOf("const shipment=");
 const provider=route.indexOf("provider.refundPayment");
 assert.ok(guard>=0&&provider>guard);
 assert.ok(route.includes("where tenant_id=$1 and supply_order_id=$2 limit 1 for update"));
 assert.ok(route.includes("سابقه مرسوله دارد"));
 assert.ok(route.includes('if(!["paid","processing"].includes(order.status))'));
});


test("generic marketplace order status route cannot mark an order refunded without the formal refund workflow",()=>{
 const marketplace=fs.readFileSync(new URL("./domain-marketplace.ts",import.meta.url),"utf8");
 const start=marketplace.indexOf('domainMarketplaceRouter.patch("/api/marketplace/orders/:id/status"');
 const end=marketplace.indexOf('domainMarketplaceRouter.get("/api/marketplace/settlements"',start);
 const route=marketplace.slice(start,end);
 const guard=route.indexOf('if(next==="refunded")');
 const transition=route.indexOf("if(!allowed[order.status]?.includes(next))");
 assert.ok(guard>=0&&transition>guard);
 assert.ok(route.includes('refundEndpoint:"/api/marketplace/orders/:id/refund"'));
});


test("direct full refund cannot overlap any existing partial, pending, failed, or unknown refund record",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const route=checkout.slice(start);
 assert.ok(route.includes("select count(*)::int refund_count from marketplace_refunds where tenant_id=$1 and payment_id=$2"));
 assert.ok(route.includes("Number(existing.rows[0].refund_count)>0"));
 assert.ok(route.includes("وضعیت آن را از گردش تطبیق بازپرداخت تعیین تکلیف کنید"));
});

test("direct full refund requires CSRF protection",()=>{
 const route=checkout.slice(checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"'));
 assert.ok(route.startsWith('checkoutRouter.post("/api/marketplace/orders/:id/refund",requireAuth,requirePermission("payment:refund"),requireCsrf'));
});
