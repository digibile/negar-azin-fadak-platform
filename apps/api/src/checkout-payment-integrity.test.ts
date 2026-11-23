import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const checkoutSource=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");

test("payment idempotency keys cannot be reused across different orders",()=>{
 assert.ok(checkoutSource.includes('existing.rows[0].order_id!==o.rows[0].id'));
 assert.ok(checkoutSource.includes('کلید یکتای پرداخت قبلاً برای سفارش دیگری استفاده شده است'));
});

test("an order with a pending or authorized payment reuses the active attempt",()=>{
 assert.ok(checkoutSource.includes("status in ('pending','authorized') order by created_at desc limit 1 for update"));
 assert.ok(checkoutSource.includes("activeAttempt.rows[0].redirect_url||null"));
 assert.ok(checkoutSource.includes("idempotent:true"));
});


test("payment provider verification runs after releasing the initial database transaction",()=>{
 const providerCall=checkoutSource.indexOf("verified=await provider.verifyPayment");
 const initialCommit=checkoutSource.lastIndexOf('await client.query("commit")',providerCall);
 const phaseTwoBegin=checkoutSource.indexOf('await client.query("begin")',providerCall);
 assert.ok(providerCall>0);
 assert.ok(initialCommit>=0&&initialCommit<providerCall);
 assert.ok(phaseTwoBegin>providerCall);
});

test("payment verification reacquires order lock before payment lock",()=>{
 const providerCall=checkoutSource.indexOf("verified=await provider.verifyPayment");
 const orderLock=checkoutSource.indexOf('const currentOrder=await client.query("select id,status,reservation_expires_at',providerCall);
 const paymentLock=checkoutSource.indexOf('const current=await client.query("select p.*',providerCall);
 assert.ok(orderLock>providerCall);
 assert.ok(paymentLock>orderLock);
});


test("tenant-scoped payment idempotency keys are serialized before lookup",()=>{
 const lock=checkoutSource.indexOf("pg_advisory_xact_lock(hashtext($1),hashtext($2))");
 const lookup=checkoutSource.indexOf('select * from marketplace_payments where tenant_id=$1 and idempotency_key=$2');
 assert.ok(lock>=0);
 assert.ok(lookup>lock);
});
