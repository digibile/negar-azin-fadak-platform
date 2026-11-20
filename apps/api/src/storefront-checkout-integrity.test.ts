import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const checkout=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/999_storefront_customer_checkout.sql",import.meta.url),"utf8");
const webCheckout=fs.readFileSync(new URL("../../web/app/store/checkout/page.tsx",import.meta.url),"utf8");
const customerOrders=fs.readFileSync(new URL("../../web/app/account/orders/page.tsx",import.meta.url),"utf8");
const commerceIntelligence=fs.readFileSync(new URL("./commerce-intelligence.ts",import.meta.url),"utf8");
const deliveryAdmin=fs.readFileSync(new URL("../../web/app/marketplace/delivery-methods/page.tsx",import.meta.url),"utf8");
const returnsMigration=fs.readFileSync(new URL("../../../database/migrations/999_storefront_customer_returns.sql",import.meta.url),"utf8");
const customerReturns=fs.readFileSync(new URL("../../web/app/account/returns/page.tsx",import.meta.url),"utf8");
const adminReturns=fs.readFileSync(new URL("../../web/app/marketplace/returns/page.tsx",import.meta.url),"utf8");
const returnGuide=fs.readFileSync(new URL("../../web/app/store/returns/page.tsx",import.meta.url),"utf8");
const productPage=fs.readFileSync(new URL("../../web/app/store/product/[slug]/page.tsx",import.meta.url),"utf8");
const productControls=fs.readFileSync(new URL("../../web/app/store/product/[slug]/ProductPurchaseControls.tsx",import.meta.url),"utf8");
const productCss=fs.readFileSync(new URL("../../web/app/store/product/[slug]/digikala-product.css",import.meta.url),"utf8");

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
 assert.ok(checkout.includes("select o.id,o.id as order_id,o.order_no,o.status,o.subtotal,o.shipping_amount,o.total_amount,o.delivery_method_id,o.delivery_method_snapshot,o.created_at from marketplace_checkout_requests"));
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
 assert.ok(webCheckout.includes("order.delivery_method_snapshot?.currency"));
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


test("canonical product detail supports selected quantity before adding to the shared cart",()=>{
 assert.ok(productPage.includes('import ProductPurchaseControls from "./ProductPurchaseControls"'));
 assert.ok(productPage.includes("<ProductPurchaseControls product="));
 assert.ok(productControls.includes("quantity={quantity}"));
 assert.ok(productControls.includes("Math.min(maximum,value+1)"));
 assert.ok(productControls.includes("Math.max(1,value-1)"));
 assert.ok(productCss.includes(".sk-product-quantity-control"));
});


test("delivery tariff administration is tenant scoped, permission protected and validates tariffs",()=>{
 assert.ok(commerceIntelligence.includes('commerceIntelligenceRouter.get("/api/commerce/delivery-methods",requireAuth,requirePermission("supplier:manage")'));
 assert.ok(commerceIntelligence.includes('commerceIntelligenceRouter.post("/api/commerce/delivery-methods",requireAuth,requirePermission("supplier:manage"),requireCsrf'));
 assert.ok(commerceIntelligence.includes('commerceIntelligenceRouter.patch("/api/commerce/delivery-methods/:id",requireAuth,requirePermission("supplier:manage"),requireCsrf'));
 assert.ok(commerceIntelligence.includes("where tenant_id=$1 order by enabled desc,cost,title"));
 assert.ok(commerceIntelligence.includes("where id=$1 and tenant_id=$2"));
 assert.ok(commerceIntelligence.includes('["courier","post","pickup","freight","digital"]'));
 assert.ok(commerceIntelligence.includes("max<min"));
 assert.ok(commerceIntelligence.includes("cost<0"));
});

test("delivery tariff management page supports create, edit, enable and disable using real APIs",()=>{
 assert.ok(deliveryAdmin.includes('"/api/commerce/delivery-methods"'));
 assert.ok(deliveryAdmin.includes('method:"PATCH"'));
 assert.ok(deliveryAdmin.includes("ویرایش تعرفه"));
 assert.ok(deliveryAdmin.includes("فعال‌سازی"));
 assert.ok(deliveryAdmin.includes("غیرفعال‌سازی"));
 assert.ok(deliveryAdmin.includes("rules:items.find(item=>item.id===editingId)?.rules||{}"));
});


test("customer return requests require delivered owned orders, order items and unclaimed quantity",()=>{
 assert.ok(checkout.includes('checkoutRouter.post("/api/storefront/orders/:id/returns",requireAuth,requireCsrf'));
 assert.ok(checkout.includes("customer_ref=$3 for update"));
 assert.ok(checkout.includes("status!==\"delivered\"&&order.rows[0].status!==\"returned\""));
 assert.ok(checkout.includes("oi.id=$1 and oi.order_id=$2 for update of oi"));
 assert.ok(checkout.includes("sum(requested_quantity)"));
 assert.ok(checkout.includes("status not in ('rejected','cancelled')"));
 assert.ok(checkout.includes("storefront.return.requested"));
});

test("customer return cancellation is limited to the owning customer and submitted requests",()=>{
 assert.ok(checkout.includes('checkoutRouter.post("/api/storefront/returns/:id/cancel",requireAuth,requireCsrf'));
 assert.ok(checkout.includes("customer_ref=$3 for update"));
 assert.ok(checkout.includes('current.rows[0].status!=="submitted"'));
 assert.ok(checkout.includes("storefront.return.cancelled"));
});

test("marketplace return review uses permission protected audited lifecycle transitions",()=>{
 assert.ok(checkout.includes('checkoutRouter.get("/api/marketplace/returns",requireAuth,requirePermission("order:manage")'));
 assert.ok(checkout.includes('checkoutRouter.patch("/api/marketplace/returns/:id/status",requireAuth,requirePermission("order:manage"),requireCsrf'));
 assert.ok(checkout.includes('submitted:["approved","rejected"]'));
 assert.ok(checkout.includes('approved:["received","cancelled"]'));
 assert.ok(checkout.includes('received:["inspected"]'));
 assert.ok(checkout.includes('inspected:["closed"]'));
 assert.ok(checkout.includes("marketplace.return.status.changed"));
});

test("return request migration records tenant, order, item, quantity, reason and lifecycle",()=>{
 assert.ok(returnsMigration.includes("marketplace_return_requests"));
 assert.ok(returnsMigration.includes("marketplace_order_items(id)"));
 assert.ok(returnsMigration.includes("requested_quantity numeric(20,3)"));
 assert.ok(returnsMigration.includes("UNIQUE (tenant_id,request_no)"));
 assert.ok(returnsMigration.includes("marketplace_return_requests_customer_idx"));
});

test("customer and marketplace return pages use the real return request APIs",()=>{
 assert.ok(customerReturns.includes("/api/storefront/returns"));
 assert.ok(customerReturns.includes("/api/storefront/orders/"));
 assert.ok(customerReturns.includes("orderItemId:selected.item.itemId"));
 assert.ok(customerReturns.includes("/cancel"));
 assert.ok(adminReturns.includes("/api/marketplace/returns"));
 assert.ok(adminReturns.includes("/status"));
 assert.ok(adminReturns.includes("تأیید بازرسی"));
 assert.ok(returnGuide.includes("/account/returns"));
});


test("inspected customer returns use one idempotent partial refund, the configured provider and central ledger",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/returns/:id/refund"');
 const end=checkout.indexOf('checkoutRouter.post("/api/storefront/orders/:id/cancel"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('requirePermission("payment:refund")'));
 assert.ok(route.includes("requireCsrf"));
 assert.ok(route.includes('status!=="inspected"'));
 assert.ok(route.includes("return_request_id"));
 assert.ok(route.includes("requested_quantity"));
 assert.ok(route.includes("unit_price"));
 assert.ok(route.includes("paymentRefunded"));
 assert.ok(route.includes("provider.refundPayment"));
 assert.ok(route.includes("idempotencyKey:\"return-refund-\"+refund.id"));
 assert.ok(route.includes("postLedgerEntry"));
 assert.ok(route.includes('sourceType:"marketplace_refund"'));
 assert.ok(route.includes("inventory_movements"));
 assert.ok(route.includes("status='closed'"));
 assert.ok(route.includes("status='refunded'"));
 assert.ok(route.includes("rollback"));
});

test("partial return refunds are unique per return and full-order refund cannot double-refund",()=>{
 assert.ok(returnsMigration.includes("return_request_id"));
 assert.ok(returnsMigration.includes("uq_marketplace_refund_return_request"));
 assert.ok(returnsMigration.includes("DROP INDEX IF EXISTS uq_marketplace_refund_payment"));
 const fullStart=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const fullEnd=checkout.indexOf('checkoutRouter.post("/api/marketplace/returns/:id/refund"',fullStart);
 const fullRoute=checkout.slice(fullStart,fullEnd);
 assert.ok(fullRoute.includes("coalesce(sum(amount),0)"));
 assert.ok(fullRoute.includes("بازپرداخت جزئی"));
});

test("marketplace return workspace exposes refund status and only executes refunds after inspection",()=>{
 assert.ok(checkout.includes("mr.status refund_status"));
 assert.ok(checkout.includes("mr.return_request_id=rr.id"));
 assert.ok(adminReturns.includes("/refund"));
 assert.ok(adminReturns.includes("ثبت و اجرای بازپرداخت"));
 assert.ok(adminReturns.includes("در انتظار پاسخ درگاه"));
});
