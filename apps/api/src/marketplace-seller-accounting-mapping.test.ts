import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-marketplace.ts",import.meta.url),"utf8");
const sellerList=source.slice(source.indexOf('domainMarketplaceRouter.get("/api/marketplace/sellers"'),source.indexOf('domainMarketplaceRouter.get("/api/marketplace/seller-accounting/options"'));
const options=source.slice(source.indexOf('domainMarketplaceRouter.get("/api/marketplace/seller-accounting/options"'),source.indexOf('domainMarketplaceRouter.patch("/api/marketplace/sellers/:id/accounting"'));
const mapping=source.slice(source.indexOf('domainMarketplaceRouter.patch("/api/marketplace/sellers/:id/accounting"'),source.indexOf('domainMarketplaceRouter.post("/api/marketplace/sellers"'));

test("seller listing returns accounting mapping only through same-tenant joins",()=>{
 assert.ok(sellerList.includes("s.accounting_party_id"));
 assert.ok(sellerList.includes("ap.tenant_id=s.tenant_id"));
 assert.ok(sellerList.includes("la.tenant_id=ap.tenant_id"));
 assert.ok(sellerList.includes("where s.tenant_id=$1"));
});

test("seller accounting options expose only active supplier parties with active liability accounts",()=>{
 assert.ok(options.includes("p.party_type='supplier'"));
 assert.ok(options.includes("p.status='active'"));
 assert.ok(options.includes("a.status='active'"));
 assert.ok(options.includes("a.is_active=true"));
 assert.ok(options.includes("a.is_postable=true"));
 assert.ok(options.includes("a.account_type='liability'"));
 assert.ok(options.includes("p.tenant_id=$1"));
});

test("seller mapping update validates tenant ownership and locks seller and party rows",()=>{
 assert.ok(mapping.includes("for update"));
 assert.ok(mapping.includes("p.id=$1 and p.tenant_id=$2"));
 assert.ok(mapping.includes("p.party_type='supplier'"));
 assert.ok(mapping.includes("a.account_type='liability'"));
 assert.ok(mapping.includes("a.is_active=true"));
 assert.ok(mapping.includes("a.is_postable=true"));
 assert.ok(mapping.includes("seller.accounting_mapping.updated"));
 assert.ok(mapping.includes("requirePermission(\"seller:manage\")"));
});

test("seller management UI exposes a controlled accounting mapping and save action",()=>{
 const ui=fs.readFileSync(new URL("../../web/app/marketplace/sellers/page.tsx",import.meta.url),"utf8");
 assert.ok(ui.includes("/api/marketplace/seller-accounting/options"));
 assert.ok(ui.includes("/accounting"));
 assert.ok(ui.includes("اتصال به حسابداری"));
 assert.ok(ui.includes("ذخیره اتصال"));
});
