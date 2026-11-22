import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");
const start=source.indexOf('settlementRouter.post("/api/marketplace/settlements/financial-issue-documents/drafts"');
const end=source.indexOf('settlementRouter.get("/api/marketplace/settlements/financial-issue-line-link-readiness"',start);
const route=source.slice(start,end);

test("finance issue draft is generated only from fully consumed tenant reservations",()=>{
 assert.notEqual(start,-1);
 assert.ok(end>start);
 assert.match(route,/requirePermission\("accounting-finance.write"\)/);
 assert.match(route,/so\.marketplace_order_id=\$2/);
 assert.match(route,/\["shipped","delivered"\]/);
 assert.match(route,/r\.supply_order_id=\$2/);
 assert.match(route,/r\.status!=="consumed"/);
 assert.match(route,/finance_product_mapping_status!=="active"/);
 assert.match(route,/finance_warehouse_mapping_status!=="active"/);
 assert.match(route,/marketplace_inventory_product_links/);
 assert.match(route,/marketplace_finance_product_links/);
 assert.match(route,/marketplace_finance_warehouse_links/);
});

test("finance issue draft is idempotent and never posts or changes operational stock",()=>{
 assert.match(route,/pg_advisory_xact_lock/);
 assert.match(route,/source_type='marketplace_order'/);
 assert.match(route,/source_id=\$2/);
 assert.match(route,/values\(\$1,\$2,\$3,'issue',\$4,'draft','marketplace_order',\$5/);
 assert.match(route,/operationalStockChanged:false/);
 assert.match(route,/costPostingCreated:false/);
 assert.doesNotMatch(route,/update inventory_stock|status='posted'|postLedgerEntry/i);
});
