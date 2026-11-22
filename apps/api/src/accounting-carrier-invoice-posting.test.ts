import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./accounting-finance.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/zzzzzz_logistics_carrier_invoice_accounting_link.sql",import.meta.url),"utf8");

test("accounting status changes are transactional and lock the tenant document",()=>{
 const start=source.indexOf('router.patch("/api/accounting-finance/documents/:id/status"');
 const end=source.indexOf('router.get("/api/accounting-finance/reports"',start+10);
 const route=start<0?"":source.slice(start,end);
 assert.ok(start>=0);
 assert.match(route,/pool\.connect\(\)/);
 assert.match(route,/begin/);
 assert.match(route,/where id=\$1 and tenant_id=\$2 for update/);
 assert.match(route,/commit/);
 assert.match(route,/rollback/);
});

test("posting checks the open fiscal period and balanced journal",()=>{
 const start=source.indexOf('router.patch("/api/accounting-finance/documents/:id/status"');
 const end=source.indexOf('router.get("/api/accounting-finance/reports"',start+10);
 const route=source.slice(start,end);
 assert.match(route,/accounting_fiscal_periods where id=\$1 and tenant_id=\$2 for update/);
 assert.match(route,/Math\.abs\(Number\(sums\.debit\)-Number\(sums\.credit\)\)>0\.005/);
 assert.match(route,/posted_by=case when \$1='posted'/);
});

test("carrier invoice posting creates one payable and advances invoice status atomically",()=>{
 const start=source.indexOf('router.patch("/api/accounting-finance/documents/:id/status"');
 const end=source.indexOf('router.get("/api/accounting-finance/reports"',start+10);
 const route=source.slice(start,end);
 assert.match(route,/source_module==="logistics-carrier-invoice"/);
 assert.match(route,/accounting_document_id!==old\.id/);
 assert.match(route,/accounting_receivable_payables/);
 assert.match(route,/values\(\$1,\$2,\$3,'payable'/);
 assert.match(route,/status='posted'.*status='verified'/s);
 assert.match(route,/logistics\.carrier_invoice_posted/);
 assert.match(route,/platform_audit_events/);
 assert.match(route,/nextStatus==="void"&&old\.source_module==="logistics-carrier-invoice"/);
 assert.match(route,/صورتحساب قطعی‌شده قابل ابطال مستقیم نیست/);
 assert.match(route,/status='void'.*status='verified'/s);
});

test("carrier payable uniqueness is enforced at database level",()=>{
 assert.match(migration,/accounting_carrier_invoice_payable_source_uq/);
 assert.match(migration,/metadata->>'carrierInvoiceId'/);
 assert.match(migration,/where direction='payable' and metadata \? 'carrierInvoiceId'/);
});
