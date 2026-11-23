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
