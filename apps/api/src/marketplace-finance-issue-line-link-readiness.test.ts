import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");

test("financial issue link readiness is a tenant-scoped read-only report",()=>{
 const start=source.indexOf('settlementRouter.get("/api/marketplace/settlements/financial-issue-line-link-readiness"');
 assert.notEqual(start,-1);
 const end=source.indexOf('settlementRouter.post("/api/marketplace/settlements/financial-issue-line-links"',start);
 assert.ok(end>start);
 const route=source.slice(start,end);
 assert.match(route,/requirePermission\("settlement:view"\)/);
 assert.match(route,/r\.tenant_id=\$1 and r\.status='consumed'/);
 assert.match(route,/doc\.source_type='marketplace_order'/);
 assert.match(route,/doc\.source_id=r\.marketplace_order_id/);
 assert.match(route,/doc\.document_type='issue'/);
 assert.match(route,/doc\.status='posted'/);
 assert.match(route,/marketplace_finance_issue_line_links/);
 assert.match(route,/readOnly:true/);
 assert.doesNotMatch(route,/insert into|update\s+finance_inventory|postLedgerEntry/i);
});

test("readiness requires matching financial product, warehouse and converted quantity",()=>{
 const start=source.indexOf('settlementRouter.get("/api/marketplace/settlements/financial-issue-line-link-readiness"');
 const end=source.indexOf('settlementRouter.post("/api/marketplace/settlements/financial-issue-line-links"',start);
 const route=source.slice(start,end);
 assert.match(route,/fpl\.finance_product_id/);
 assert.match(route,/fwl\.finance_warehouse_id/);
 assert.match(route,/round\(r\.quantity\*fpl\.quantity_factor,4\)/);
});
