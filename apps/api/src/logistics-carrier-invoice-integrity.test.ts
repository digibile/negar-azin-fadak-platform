import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const routeSource=fs.readFileSync(new URL("./logistics.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/zzzzz_logistics_carrier_invoice_allocations.sql",import.meta.url),"utf8");
const accountingLinkMigration=fs.readFileSync(new URL("../../../database/migrations/zzzzzz_logistics_carrier_invoice_accounting_link.sql",import.meta.url),"utf8");
const start=routeSource.indexOf('logisticsRouter.post("/api/logistics/carrier-invoices"');
const route=start<0?"":routeSource.slice(start,routeSource.indexOf('logisticsRouter.get("/api/logistics/reports"',start));

test("carrier invoice registration is permission-protected and tenant-scoped",()=>{
 assert.ok(start>=0);
 assert.match(route,/requireAuth,requirePermission\("modules:12-logistics-supply:write"\)/);
 assert.match(route,/accounting_parties where id=\$1 and tenant_id=\$2 and party_type='supplier' and status='active'/);
 assert.match(route,/sh\.tenant_id=\$1/);
 assert.match(route,/so\.marketplace_order_id/);
 assert.match(route,/mo\.currency/);
});

test("carrier invoice allocations must exactly reconcile to the invoice total",()=>{
 assert.match(route,/normalized\.reduce\(\(sum:number,x:any\)=>sum\+cents\(x\.amount\),0\)!==invoiceTotal/);
 assert.match(route,/new Set\(normalized\.map\(\(x:any\)=>x\.shipmentId\)\)\.size!==normalized\.length/);
 assert.match(route,/accountingStatus:"not_posted"/);
});

test("carrier invoice schema enforces tenant-safe supplier and shipment references",()=>{
 assert.match(migration,/foreign key\(tenant_id,carrier_party_id\)\s+references accounting_parties\(tenant_id,id\)/);
 assert.match(migration,/foreign key\(tenant_id,shipment_id\)\s+references logistics_shipments\(tenant_id,id\)/);
 assert.match(migration,/unique\(tenant_id,carrier_party_id,invoice_no\)/);
 assert.match(migration,/unique\(tenant_id,invoice_id,shipment_id\)/);
 assert.match(migration,/total_amount>0 and total_amount=subtotal\+tax_amount/);
});

test("carrier invoice verification is a tenant-scoped draft-only transition",()=>{
 const verifyStart=routeSource.indexOf('logisticsRouter.post("/api/logistics/carrier-invoices/:id/verify"');
 const verify=verifyStart<0?"":routeSource.slice(verifyStart,routeSource.indexOf('logisticsRouter.post("/api/logistics/carrier-invoices"',verifyStart+10));
 assert.ok(verifyStart>=0);
 assert.match(verify,/requireAuth,requirePermission\("modules:12-logistics-supply:write"\)/);
 assert.match(verify,/where id=\$1 and tenant_id=\$2 for update/);
 assert.match(verify,/invoice\.status!=="draft"/);
 assert.match(verify,/sum\(a\.allocated_amount\)/);
 assert.match(verify,/sh\.status in \('failed','cancelled'\)/);
 assert.match(verify,/status='verified',verified_by=\$1,verified_at=now\(\)/);
 assert.match(verify,/logistics\.carrier_invoice_verified/);
 assert.match(verify,/accountingStatus:"not_posted"/);
});

test("carrier invoice migration stores verification actor and timestamp",()=>{
 assert.match(migration,/verified_by uuid references users\(id\)/);
 assert.match(migration,/verified_at timestamptz/);
});

test("carrier invoice accounting draft requires a verified invoice and tenant-owned open period",()=>{
 const start=routeSource.indexOf('logisticsRouter.post("/api/logistics/carrier-invoices/:id/accounting-draft"');
 const end=routeSource.indexOf('logisticsRouter.get("/api/logistics/carrier-invoices"',start+10);
 const draft=start<0?"":routeSource.slice(start,end);
 assert.ok(start>=0);
 assert.match(draft,/requireAuth,requirePermission\("modules:12-logistics-supply:write"\)/);
 assert.match(draft,/invoice\.status!=="verified"/);
 assert.match(draft,/accounting_document_id/);
 assert.match(draft,/period\.status!=="open"/);
 assert.match(draft,/period\.book_id!==bookId/);
 assert.match(draft,/invoice\.invoice_date/);
 assert.match(draft,/account_nature/);
 assert.match(draft,/accountingStatus:"draft_not_posted"/);
 assert.match(draft,/payableStatus:"not_created_until_document_posting"/);
});

test("carrier invoice accounting draft creates a balanced source-linked journal without posting",()=>{
 const start=routeSource.indexOf('logisticsRouter.post("/api/logistics/carrier-invoices/:id/accounting-draft"');
 const end=routeSource.indexOf('logisticsRouter.get("/api/logistics/carrier-invoices"',start+10);
 const draft=start<0?"":routeSource.slice(start,end);
 assert.match(draft,/source_module,source_document_id,is_automatic/);
 assert.match(draft,/accounting_document_lines/);
 assert.match(draft,/invoice\.subtotal/);
 assert.match(draft,/invoice\.tax_amount/);
 assert.match(draft,/invoice\.total_amount/);
 assert.match(draft,/accounting_finance_audit/);
 assert.match(draft,/accounting_draft_created/);
 assert.doesNotMatch(draft,/status='posted'/);
});

test("carrier invoice accounting document link is tenant-safe and unique by source",()=>{
 assert.match(migration,/accounting_document_id uuid/);
 assert.match(migration,/foreign key\(tenant_id,accounting_document_id\)\s+references accounting_documents\(tenant_id,id\)/);
 assert.match(migration,/accounting_documents_carrier_invoice_source_uq/);
});
