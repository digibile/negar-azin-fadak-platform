import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const marketplaceSource=fs.readFileSync(new URL("./domain-marketplace.ts",import.meta.url),"utf8");
const settlementSource=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");

test("seller settlement list has one canonical finance-aware route",()=>{
 assert.ok(!marketplaceSource.includes('domainMarketplaceRouter.get("/api/marketplace/settlements"'));
 assert.equal((settlementSource.match(/settlementRouter\.get\("\/api\/marketplace\/settlements"/g)||[]).length,1);
 assert.ok(settlementSource.includes("bankAccounts:banks.rows"));
 assert.ok(settlementSource.includes("summary:summary.rows"));
});

test("settlement generation selects only paid, unsettled orders inside the active tenant",()=>{
 assert.ok(settlementSource.includes("o.tenant_id=$1"));
 assert.ok(settlementSource.includes("o.status='paid'"));
 assert.ok(settlementSource.includes("not exists(select 1 from seller_settlement_items"));
 assert.ok(settlementSource.includes("order by o.created_at for update"));
});

test("settlement generation keeps seller and currency groups separate",()=>{
 assert.ok(settlementSource.includes("bySellerCurrency"));
 assert.ok(settlementSource.includes('const key=o.seller_id+"::"+currency'));
 assert.ok(settlementSource.includes("currency"));
});

test("seller settlement payment uses tenant-scoped idempotency keys",()=>{
 assert.ok(settlementSource.includes("idempotency_key=$2"));
 assert.ok(settlementSource.includes("where tenant_id=$1 and idempotency_key=$2"));
 assert.ok(settlementSource.includes("کلید یکتای پرداخت برای تسویه دیگری استفاده شده است"));
});

test("marketplace mutation routes are registered once",()=>{
 const routeCounts=new Map();
 for(const match of marketplaceSource.matchAll(/domainMarketplaceRouter\.(?:get|post|patch|put|delete)\\("([^"]+)"/g)){
  const route=match[1];
  routeCounts.set(route,(routeCounts.get(route)||0)+1);
 }
 for(const route of [
  "/api/marketplace/sellers/:id/status",
  "/api/marketplace/stores/:id/status",
  "/api/marketplace/products/:id",
  "/api/marketplace/products/:id/inventory",
  "/api/marketplace/products/:id/status"
 ])assert.equal(routeCounts.get(route),1,"duplicate marketplace route: "+route);
});
