import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const checkout=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/999_storefront_customer_checkout.sql",import.meta.url),"utf8");
const webCheckout=fs.readFileSync(new URL("../../web/app/store/checkout/page.tsx",import.meta.url),"utf8");
const customerOrders=fs.readFileSync(new URL("../../web/app/account/orders/page.tsx",import.meta.url),"utf8");

test("storefront delivery options are tenant scoped and validate every requested product",()=>{
 assert.ok(checkout.includes('checkoutRouter.get("/api/storefront/delivery-methods"'));
 assert.ok(checkout.includes("p.tenant_id=$2 and p.store_id=$3 and p.status='active'"));
 assert.ok(checkout.includes("sl.status='active'"));
 assert.ok(checkout.includes("from commerce_delivery_methods d where d.tenant_id=$1 and d.enabled=true"));
 assert.ok(checkout.includes("from product_delivery_rules pr where pr.tenant_id=d.tenant_id"));
 assert.ok(checkout.includes("currencies.length!==1"));
});

test("storefront checkout is atomic, idempotent, and revalidates ownership, price and stock",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/storefront/checkout"');
 const end=checkout.indexOf('checkoutRouter.post("/api/storefront/orders/:id/cancel"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes("begin"));
 assert.ok(route.includes("marketplace_checkout_requests"));
 assert.ok(route.includes("idempotency_key"));
 assert.ok(route.includes("marketplace_customer_addresses where id=$1 and tenant_id=$2 and user_id=$3"));
 assert.ok(route.includes("for update of p"));
 assert.ok(route.includes("product_inventory"));
 assert.ok(route.includes("reserved_quantity"));
 assert.ok(route.includes("delivery_method_id"));
 assert.ok(route.includes("shipping_amount"));
 assert.ok(route.includes("commit"));
 assert.ok(route.includes("rollback"));
});

test("customer cancellation cannot cross account boundaries or bypass active payments",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/storefront/orders/:id/cancel"');
 const end=checkout.indexOf('checkoutRouter.get("/api/storefront/delivery-methods"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes("customer_ref=$3"));
 assert.ok(route.includes("for update"));
 assert.ok(route.includes("status in ('paid','authorized','pending')"));
 assert.ok(route.includes("reserved_quantity=greatest(0,reserved_quantity-$1)"));
 assert.ok(route.includes("platform_audit_events"));
 assert.ok(route.includes("order.cancelled"));
});

test("customer payment verification is owner scoped and provider confirmed",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/storefront/orders/:id/verify-payment"');
 const end=checkout.indexOf('));',start);
 const route=checkout.slice(start, start+10000);
 assert.ok(route.includes("customer_ref=$3"));
 assert.ok(route.includes("getPaymentProvider"));
 assert.ok(route.includes("verifyPayment"));
 assert.ok(route.includes('verified.status!=="paid"'));
 assert.ok(route.includes("postLedgerEntry"));
 assert.ok(route.includes("inventory_movements"));
});

test("checkout migration reuses the central delivery tariff and does not create a parallel shipping engine",()=>{
 assert.ok(migration.includes("marketplace_customer_addresses"));
 assert.ok(migration.includes("marketplace_checkout_requests"));
 assert.ok(!migration.includes("marketplace_shipping_rates"));
 assert.ok(!migration.includes("storefront_shipping_quotes"));
});

test("customer checkout UI sends product identifiers only and delegates final amounts to the API",()=>{
 assert.ok(webCheckout.includes('request("/api/storefront/checkout","POST"'));
 assert.ok(webCheckout.includes("items:items.map(x=>({productId:x.id,quantity:x.quantity}))"));
 assert.ok(webCheckout.includes("deliveryMethodId:selectedDeliveryMethodId"));
 assert.ok(webCheckout.includes("startPayment"));
 assert.ok(webCheckout.includes("verifyPayment"));
 assert.ok(webCheckout.includes("checkoutRequestKey(signature)"));
 assert.ok(webCheckout.includes("sessionStorage.removeItem(\"sookar.store.checkout.request.v1\")"));
});

test("customer order history exposes payment verification and safe cancellation actions",()=>{
 assert.ok(customerOrders.includes("/api/storefront/orders/"));
 assert.ok(customerOrders.includes("/cancel"));
 assert.ok(customerOrders.includes("/verify-payment"));
 assert.ok(customerOrders.includes("لغو سفارش"));
 assert.ok(customerOrders.includes("بررسی نتیجه پرداخت"));
});
