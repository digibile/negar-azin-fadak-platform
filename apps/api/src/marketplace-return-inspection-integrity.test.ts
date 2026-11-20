import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const checkout=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/125_marketplace_return_inspection_receipt.sql",import.meta.url),"utf8");
const page=fs.readFileSync(new URL("../../web/app/marketplace/returns/page.tsx",import.meta.url),"utf8");

test("return inspection is a tenant-scoped, permission-checked warehouse receipt operation",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/returns/:id/inspect"');
 const end=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/status"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('requirePermission("order:manage")'));
 assert.ok(route.includes('requirePermission("modules:23-inventory-warehouse:post")'));
 assert.ok(route.includes("where rr.id=$1 and rr.tenant_id=$2"));
 assert.ok(route.includes('rr.status!=="received"'));
 assert.ok(route.includes("received>Number(rr.requested_quantity)"));
 assert.ok(route.includes("status='active'"));
 assert.ok(route.includes("mil.tenant_id=$1 and mil.product_id=$2"));
});

test("only inspected sellable quantity is posted into warehouse stock",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/returns/:id/inspect"');
 const end=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/status"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('restock>0&&!mapping'));
 assert.ok(route.includes("inventory_documents"));
 assert.ok(route.includes("inventory_document_items"));
 assert.ok(route.includes("inventory_stock(tenant_id,warehouse_id,product_id,quantity,reserved_quantity)"));
 assert.ok(route.includes("quantity=inventory_stock.quantity+excluded.quantity"));
 assert.ok(route.includes("status='inspected'"));
 assert.ok(route.includes("inventory_receipt_document_id"));
 assert.ok(route.includes("inventory_events"));
});

test("generic return status route cannot bypass physical inspection and receipt",()=>{
 const start=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/status"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/returns/:id/refund"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('approved:["received","cancelled"]'));
 assert.ok(!route.includes('received:["inspected"]'));
});

test("migration enforces tenant-safe receipt and warehouse references",()=>{
 assert.ok(migration.includes("received_quantity"));
 assert.ok(migration.includes("restock_quantity"));
 assert.ok(migration.includes("foreign key(tenant_id,inspection_warehouse_id)"));
 assert.ok(migration.includes("foreign key(tenant_id,inventory_receipt_document_id)"));
 assert.ok(migration.includes("references inventory_documents(tenant_id,id)"));
});

test("returns workspace requires warehouse and separates received from restockable quantity",()=>{
 assert.ok(page.includes("/api/marketplace/returns/"));
 assert.ok(page.includes("/inspect"));
 assert.ok(page.includes("ثبت بازرسی و رسید انبار"));
 assert.ok(page.includes("restockQuantity"));
 assert.ok(page.includes("warehouseId"));
 assert.ok(!page.includes('transition(item,"inspected")'));
 assert.ok(!page.includes("\\n type Warehouse="));
});
