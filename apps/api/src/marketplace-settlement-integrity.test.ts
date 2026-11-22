import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");

test("settlement generation keeps caller reference for a single seller",()=>{
 assert.match(source,/bySeller\.size>1\?requestedSettlementNo\+"-"\+sellerId:requestedSettlementNo/);
});

test("settlement generation scopes a shared caller reference by the full seller id",()=>{
 assert.match(source,/requestedSettlementNo\+"-"\+sellerId/);
 assert.match(source,/\("SET-"\+Date\.now\(\)\+"-"\+sellerId\)/);
 assert.ok(!source.includes('sellerId.slice(0,8)'));
});

test("order cost analysis only counts confirmed refunds, paid settlements and posted freight",()=>{
 assert.match(source,/order-cost-analysis/);
 assert.match(source,/r\\.status='refunded'/);
 assert.match(source,/ss\\.status='paid'/);
 assert.match(source,/i\\.status='posted'/);
 assert.match(source,/d\\.status='posted'/);
 assert.match(source,/cost_of_goods_status/);
 assert.match(source,/profit_status/);
 assert.match(source,/tenant_id=o\\.tenant_id/);
});
test("order cost analysis rejects invalid and reversed date ranges",()=>{
 assert.match(source,/validDate\\(req\\.query\\.from\\)/);
 assert.match(source,/validDate\\(req\\.query\\.to\\)/);
 assert.match(source,/if\\(from>to\\)/);
});
