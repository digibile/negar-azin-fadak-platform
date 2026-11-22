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
 assert.ok(route.includes('if(!["paid","processing"].includes(order.status)&&order.status!=="refunded")'));
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
 assert.ok(route.includes("const prior=await client.query(\"select * from marketplace_refunds where tenant_id=$1 and payment_id=$2"));
 assert.ok(route.includes("prior.rows.some((x:any)=>x.return_request_id||Number(x.amount)!==Number(payment.amount))"));
 assert.ok(route.includes("بازپرداخت جزئی یا مرجوعی ثبت شده است"));
});

test("direct full refund requires CSRF protection",()=>{
 const route=checkout.slice(checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"'));
 assert.ok(route.startsWith('checkoutRouter.post("/api/marketplace/orders/:id/refund",requireAuth,requirePermission("payment:refund"),requireCsrf'));
});


test("full gateway refund requires provider-declared idempotency and sends a stable payment-scoped key",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes("provider.supportsIdempotentRefunds!==true"));
 assert.ok(route.includes('const idempotencyKey="order-full-refund-"+payment.id'));
 assert.ok(route.includes("idempotencyKey}}"));
 assert.ok(route.includes("manualReconciliationRequired:true"));
});

test("full refund does not treat a pending provider response as confirmed money return",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('providerResult.status!=="refunded"'));
 assert.ok(route.includes('providerStatus:providerResult.status'));
 assert.ok(route.includes("ابتدا استعلام معتبر انجام دهید"));
});


test("full refund request is durably inserted and committed before contacting the provider",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"',start);
 const route=checkout.slice(start,end);
 const insert=route.indexOf("insert into marketplace_refunds");
 const firstCommit=route.indexOf('await client.query("commit")');
 const provider=route.indexOf("provider.refundPayment");
 assert.ok(insert>=0&&firstCommit>insert&&provider>firstCommit);
 assert.ok(route.includes("provider_idempotency_key"));
 assert.ok(route.includes("'pending'"));
});

test("full refund provider confirmation is persisted before independent financial finalization",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"',start);
 const route=checkout.slice(start,end);
 const persist=route.indexOf("set provider_code=$1,provider_refund_transaction_id=$2");
 const finalize=route.indexOf("const finalize=await pool.connect()");
 const ledger=route.indexOf("postLedgerEntry(finalize");
 assert.ok(persist>=0&&finalize>persist&&ledger>finalize);
 assert.ok(route.includes("provider_last_status='unknown'"));
 assert.ok(route.includes("providerResult.status!==\"refunded\""));
});

test("repeated full-refund requests reuse the existing payment-scoped refund record",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes("const full=prior.rows.find"));
 assert.ok(route.includes("if(full){refund=full;}"));
 assert.ok(route.includes('if(full?.status==="refunded")'));
 assert.ok(route.includes('const idempotencyKey=refund.provider_idempotency_key||("order-full-refund-"+payment.id)'));
});


test("confirmed provider refund can resume local finalization without a second gateway request",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const end=checkout.indexOf('checkoutRouter.get("/api/marketplace/refunds/reconciliation"',start);
 const route=checkout.slice(start,end);
 const confirmed=route.indexOf('refund.provider_last_status==="refunded"&&providerRefundId');
 const retryGuard=route.indexOf("Number(refund.provider_attempt_count||0)>0");
 const providerCall=route.indexOf("provider.refundPayment");
 const finalization=route.indexOf("const finalize=await pool.connect()");
 assert.ok(confirmed>=0&&retryGuard>confirmed&&providerCall>retryGuard&&finalization>providerCall);
});

test("reconciliation and manual confirmation can hand a confirmed refund back to the same finalization route",()=>{
 const reconciliation=checkout.slice(checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/reconcile"'),checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/confirm-manual"'));
 const manual=checkout.slice(checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/confirm-manual"'),checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"'));
 assert.ok(reconciliation.includes("finalizationRequired:true"));
 assert.ok(reconciliation.includes('provider_last_status==="refunded"&&refund.provider_refund_transaction_id'));
 assert.ok(manual.includes("finalizationRequired:true"));
 assert.ok(manual.includes("providerRefundReference"));
});


test("automatic provider reconciliation rejects a refund reference already attached to another refund",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/reconcile"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/confirm-manual"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('if(result.status==="refunded"&&result.refundTransactionId)'));
 assert.ok(route.includes("provider_refund_transaction_id=$3 and id<>$4 limit 1"));
 assert.ok(route.includes("شناسه بازپرداخت درگاه تکراری است"));
});

test("manual reconciliation cannot override an active provider lookup claim",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/confirm-manual"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes("refund.provider_claim_token&&refund.provider_claimed_at"));
 assert.ok(route.includes("فرایند استعلام درگاه قرار دارد"));
});


test("refund reconciliation endpoints are permission-gated and mutating endpoints require CSRF",()=>{
 const list=checkout.slice(checkout.indexOf('checkoutRouter.get("/api/marketplace/refunds/reconciliation"'),checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/reconcile"'));
 const lookup=checkout.slice(checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/reconcile"'),checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/confirm-manual"'));
 const manual=checkout.slice(checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/confirm-manual"'),checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"'));
 assert.ok(list.startsWith('checkoutRouter.get("/api/marketplace/refunds/reconciliation",requireAuth,requirePermission("payment:refund")'));
 assert.ok(lookup.startsWith('checkoutRouter.post("/api/marketplace/refunds/:id/reconcile",requireAuth,requirePermission("payment:refund"),requireCsrf'));
 assert.ok(manual.startsWith('checkoutRouter.post("/api/marketplace/refunds/:id/confirm-manual",requireAuth,requirePermission("payment:refund"),requireCsrf'));
});

test("refund reconciliation list and mutations scope records to the authenticated tenant",()=>{
 const start=checkout.indexOf('checkoutRouter.get("/api/marketplace/refunds/reconciliation"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"',start);
 const routes=checkout.slice(start,end);
 assert.ok(routes.includes("where r.tenant_id=$1"));
 assert.ok(routes.includes("where id=$2 and tenant_id=$3"));
 assert.ok(routes.includes("where id=$1 and tenant_id=$2"));
 assert.ok(routes.includes("ctx(req)"));
});

test("admin refund workbench is linked from the central payments menu",()=>{
 const menu=fs.readFileSync(new URL("../../web/app/admin/master-menu.ts",import.meta.url),"utf8");
 const page=fs.readFileSync(new URL("../../web/app/admin/refunds/page.tsx",import.meta.url),"utf8");
 assert.ok(menu.includes('"/admin/refunds"'));
 assert.ok(page.includes("/api/marketplace/refunds/reconciliation?limit=100"));
 assert.ok(page.includes("/confirm-manual"));
});
