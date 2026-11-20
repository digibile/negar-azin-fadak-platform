import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const api=fs.readFileSync(new URL("./domain-marketplace.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/123_marketplace_inventory_product_links.sql",import.meta.url),"utf8");
const page=fs.readFileSync(new URL("../../web/app/marketplace/products/page.tsx",import.meta.url),"utf8");

test("storefront inventory mapping is tenant-safe at database and API layers",()=>{
 assert.match(migration,/foreign key\(tenant_id,product_id\)\s*references products\(tenant_id,id\)/);
 assert.match(migration,/foreign key\(tenant_id,inventory_product_id\)\s*references inventory_products\(tenant_id,id\)/);
 assert.ok(api.includes('"/api/marketplace/products/:id/inventory-link"'));
 assert.ok(api.includes('requirePermission("product:manage")'));
 assert.ok(api.includes('where id=$1 and tenant_id=$2",[req.params.id,ctx.id]'));
 assert.ok(api.includes('where id=$1 and tenant_id=$2",[inventoryProductId,ctx.id]'));
 assert.ok(api.includes('inventoryProduct.rows[0].status!=="active"'));
});

test("mapping updates only the explicit link and does not mutate either stock ledger",()=>{
 const start=api.indexOf('domainMarketplaceRouter.put("/api/marketplace/products/:id/inventory-link"');
 const end=api.indexOf('domainMarketplaceRouter.patch("/api/marketplace/products/:id/inventory"',start);
 const route=api.slice(start,end);
 assert.ok(route.includes("insert into marketplace_inventory_product_links"));
 assert.ok(route.includes("delete from marketplace_inventory_product_links"));
 assert.ok(!route.includes("inventory_stock"));
 assert.ok(!route.includes("product_inventory"));
 assert.ok(route.includes("موجودی را رزرو یا کسر نمی‌کند"));
});

test("product management exposes the existing inventory catalog mapping control",()=>{
 assert.ok(page.includes('api<InventoryProduct[]>("/api/inventory/products")'));
 assert.ok(page.includes('"/inventory-link"'));
 assert.ok(page.includes("اتصال به کالای انبار"));
 assert.ok(page.includes("inventory_product_id"));
});
