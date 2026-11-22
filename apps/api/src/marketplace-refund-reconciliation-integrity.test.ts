import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const checkout=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");
const provider=fs.readFileSync(new URL("./payment-provider.ts",import.meta.url),"utf8");

test("refund reconciliation listing is authenticated, permission-scoped, and tenant-scoped",()=>{
 const start=checkout.indexOf('checkoutRouter.get("/api/marketplace/refunds/reconciliation"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/reconcile"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.startsWith('checkoutRouter.get("/api/marketplace/refunds/reconciliation",requireAuth,requirePermission("payment:refund")'));
 assert.ok(route.includes("where r.tenant_id=$1"));
 assert.ok(route.includes("r.status='pending'"));
 assert.ok(route.includes("join marketplace_orders o on o.id=r.order_id and o.tenant_id=r.tenant_id"));
 assert.ok(route.includes("join marketplace_payments p on p.id=r.payment_id and p.tenant_id=r.tenant_id"));
});

test("refund reconciliation requires CSRF, claims one row, and uses the documented provider lookup only",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/reconcile"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.startsWith('checkoutRouter.post("/api/marketplace/refunds/:id/reconcile",requireAuth,requirePermission("payment:refund"),requireCsrf'));
 assert.ok(route.includes("provider_claim_token=$1"));
 assert.ok(route.includes("provider_claimed_at<now()-interval '5 minutes'"));
 assert.ok(route.includes("lookupPaymentRefundStatus(provider"));
 assert.ok(!route.includes("provider.refundPayment"));
});

test("confirmed lookup must include a distinct provider refund transaction reference before finalization",()=>{
 assert.ok(provider.includes("refundTransactionId?:string"));
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/reconcile"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('result.status==="refunded"&&!result.refundTransactionId'));
 assert.ok(route.includes("provider_refund_transaction_id=case when $1='refunded' then $3"));
 assert.ok(route.includes("finalizationRequired:true"));
});

test("an attempted full refund cannot be blindly sent to the provider again on a repeated request",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const end=checkout.indexOf('checkoutRouter.get("/api/marketplace/refunds/reconciliation"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes("Number(refund.provider_attempt_count||0)>0"));
 assert.ok(route.includes("ابتدا نتیجه را از پنل تطبیق استعلام کنید"));
 assert.ok(route.includes("provider_claim_token=$1"));
 assert.ok(route.includes("provider_claim_token=null,provider_claimed_at=null"));
});

test("order item inventory restoration uses the established order_items schema without a nonexistent tenant parameter",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const end=checkout.indexOf('checkoutRouter.get("/api/marketplace/refunds/reconciliation"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('finalize.query("select * from marketplace_order_items where order_id=$1",[order.id])'));
 assert.ok(!route.includes('finalize.query("select * from marketplace_order_items where order_id=$1",[order.id,t.id])'));
});


test("manual reconciliation requires a provider refund reference, evidence reference, and explanation with audit event",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/refunds/:id/confirm-manual"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/cancel"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.startsWith('checkoutRouter.post("/api/marketplace/refunds/:id/confirm-manual",requireAuth,requirePermission("payment:refund"),requireCsrf'));
 assert.ok(route.includes("providerRefundReference"));
 assert.ok(route.includes("evidenceReference"));
 assert.ok(route.includes("confirmationNote"));
 assert.ok(route.includes("payment.refund.manually_reconciled"));
 assert.ok(route.includes("provider_attempt_count"));
});

test("provider lookup rejects an empty or oversized distinct refund reference",()=>{
 assert.ok(provider.includes('result.refundTransactionId!==undefined'));
 assert.ok(provider.includes('!result.refundTransactionId.trim()||result.refundTransactionId.length>200'));
});

test("previously confirmed provider refund bypasses another refund call and proceeds to local finalization",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/orders/:id/refund"');
 const end=checkout.indexOf('checkoutRouter.get("/api/marketplace/refunds/reconciliation"',start);
 const route=checkout.slice(start,end);
 const confirmed=route.indexOf('refund.provider_last_status==="refunded"&&providerRefundId');
 const providerCall=route.indexOf("provider.refundPayment");
 const finalization=route.indexOf("const finalize=await pool.connect()");
 assert.ok(confirmed>=0&&providerCall>confirmed&&finalization>providerCall);
 assert.ok(route.includes("continue to local finalization only"));
});
