import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/zzzzzzz_marketplace_finance_issue_line_links.sql",import.meta.url),"utf8");

test("marketplace financial issue line linking is tenant-scoped and permission-gated",()=>{
 assert.ok(source.includes("/financial-issue-line-links"));
 assert.ok(source.includes('requirePermission("accounting-finance.write")'));
 assert.ok(source.includes("marketplace_finance_issue_line_links"));
 assert.ok(source.includes("platform_audit_events"));
});

test("financial issue line link migration enforces composite tenant-safe foreign keys",()=>{
 assert.ok(migration.includes("foreign key(tenant_id,reservation_id)"));
 assert.ok(migration.includes("references marketplace_inventory_reservations(tenant_id,id)"));
 assert.ok(migration.includes("foreign key(tenant_id,issue_document_id)"));
 assert.ok(migration.includes("references finance_inventory_documents(tenant_id,id)"));
 assert.ok(migration.includes("foreign key(issue_document_line_id,issue_document_id)"));
 assert.ok(migration.includes("references finance_inventory_lines(id,document_id)"));
});

test("financial issue line link requires a consumed reservation and a posted issue for the same order",()=>{
 assert.ok(migration.includes("v.reservation_status<>'consumed'"));
 assert.ok(migration.includes("v.document_type<>'issue' or v.issue_document_status<>'posted'"));
 assert.ok(migration.includes("v.source_type<>'marketplace_order' or v.source_id<>v.marketplace_order_id"));
 assert.ok(migration.includes("v.finance_warehouse_id<>v.issue_finance_warehouse_id"));
 assert.ok(migration.includes("v.finance_product_id<>v.issue_finance_product_id"));
});

test("financial issue line link validates unit conversion and is immutable",()=>{
 assert.ok(migration.includes("round(v.reservation_quantity*v.quantity_factor,4)"));
 assert.ok(migration.includes("abs(v.issue_quantity-v_expected)>0.0001"));
 assert.ok(migration.includes("Marketplace financial issue line links are immutable"));
 assert.ok(migration.includes("unique(tenant_id,reservation_id)"));
 assert.ok(migration.includes("unique(tenant_id,issue_document_line_id)"));
});

test("link creation does not create a cost or accounting posting",()=>{
 assert.ok(source.includes("costPostingCreated:false"));
 assert.ok(source.includes("readOnlyCostingUntilAccountingApproval:true"));
});
