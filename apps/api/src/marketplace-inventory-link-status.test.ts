import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/zzzzzzzz_marketplace_inventory_link_status.sql",import.meta.url),"utf8");

test("marketplace inventory mapping lifecycle is explicitly migrated",()=>{
 assert.match(migration,/add column if not exists status text not null default 'active'/i);
 assert.match(migration,/check\s*\(status in\s*\('active','inactive'\)\)/i);
 assert.match(migration,/marketplace_inventory_product_links_status_idx/i);
});

test("settlement readiness filters only active operational product mappings",()=>{
 assert.match(source,/marketplace_inventory_product_links mil on mil\.tenant_id=\$1 and mil\.product_id=oi\.product_id and mil\.status='active'/);
});
