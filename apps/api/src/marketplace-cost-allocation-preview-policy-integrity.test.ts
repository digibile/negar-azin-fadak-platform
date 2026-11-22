import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");
const previewStart=source.indexOf('settlementRouter.get("/api/marketplace/settlements/cost-layer-allocation-preview"');
const allocationStart=source.indexOf('settlementRouter.post("/api/marketplace/settlements/:issueDocumentId/allocate-cost"',previewStart);
const readinessStart=source.indexOf('settlementRouter.get("/api/marketplace/settlements/costing-readiness"',allocationStart);
const preview=source.slice(previewStart,allocationStart);
const allocation=source.slice(allocationStart,readinessStart);

test("cost allocation preview never presents unimplemented valuation methods as allocatable",()=>{
 assert.notEqual(previewStart,-1);
 assert.ok(allocationStart>previewStart);
 assert.match(preview,/allocation_method_not_implemented/);
 assert.match(preview,/ap\.valuation_method\s*<>\s*'fifo'\s+or\s+cl\.method\s*<>\s*'fifo'/);
 assert.match(preview,/ap\.valuation_method\s*===?'fifo'|ap\.valuation_method='fifo'/);
 assert.match(preview,/cl\.method\s*===?'fifo'|cl\.method='fifo'/);
 assert.match(preview,/allocation اجرایی فقط برای FIFO/);
});

test("cost allocation execution remains explicitly FIFO-only and tenant-scoped",()=>{
 assert.ok(readinessStart>allocationStart);
 assert.match(allocation,/requirePermission\("accounting-finance\.write"\)/);
 assert.match(allocation,/p\.valuation_method='fifo'/);
 assert.match(allocation,/cl\.method='fifo'/);
 assert.match(allocation,/'fifo:'\|\|\$2::text/);
 assert.match(allocation,/method:"fifo"/);
});
