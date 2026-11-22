import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./accounting-finance.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/zzzzzzz_logistics_carrier_payments.sql",import.meta.url),"utf8");
const paymentStart=source.indexOf('router.post("/api/accounting-finance/carrier-invoices/:invoiceId/payments"');
const paymentEnd=source.indexOf('router.get("/api/accounting-finance/carrier-invoices/:invoiceId/payments"',paymentStart+10);
const paymentRoute=paymentStart<0?"":source.slice(paymentStart,paymentEnd);
const statusStart=source.indexOf('router.patch("/api/accounting-finance/documents/:id/status"');
const statusEnd=source.indexOf('router.get("/api/accounting-finance/reports"',statusStart+10);
const statusRoute=statusStart<0?"":source.slice(statusStart,statusEnd);

test("carrier payment draft requires tenant-owned posted invoice and matching payable",()=>{
 assert.ok(paymentStart>=0);
 assert.match(paymentRoute,/requirePermission\("accounting-finance\.write"\)/);
 assert.match(paymentRoute,/logistics_carrier_invoices where id=\$1 and tenant_id=\$2 for update/);
 assert.match(paymentRoute,/accounting_receivable_payables where id=\$1 and tenant_id=\$2 and direction='payable' for update/);
 assert.match(paymentRoute,/payable\.party_id!==invoice\.carrier_party_id/);
 assert.match(paymentRoute,/payable\.document_id!==invoice\.accounting_document_id/);
 assert.match(paymentRoute,/value>remaining\+0\.005/);
});

test("carrier payment draft uses exactly one mapped treasury account and creates a balanced journal",()=>{
 assert.match(paymentRoute,/Boolean\(bankAccountId\)===Boolean\(cashboxId\)/);
 assert.match(paymentRoute,/accounting_bank_accounts where id=\$1 and tenant_id=\$2 for update/);
 assert.match(paymentRoute,/accounting_cashboxes where id=\$1 and tenant_id=\$2 for update/);
 assert.match(paymentRoute,/current_balance/);
 assert.match(paymentRoute,/source_module,source_document_id,is_automatic/);
 assert.match(paymentRoute,/logistics-carrier-payment/);
 assert.match(paymentRoute,/accounting_document_lines/);
 assert.match(paymentRoute,/settlementStatus:"not_updated_until_document_posting"/);
});

test("posting atomically settles payable and reduces bank or cash balance",()=>{
 assert.match(statusRoute,/source_module==="logistics-carrier-payment"/);
 assert.match(statusRoute,/logistics_carrier_payments where id=\$1 and tenant_id=\$2 for update/);
 assert.match(statusRoute,/accounting_receivable_payables where id=\$1 and tenant_id=\$2 and direction='payable' for update/);
 assert.match(statusRoute,/settled_amount=settled_amount\+\$1/);
 assert.match(statusRoute,/status=case when settled_amount\+\$1>=original_amount-0\.005 then 'settled' else 'partially_settled' end/);
 assert.match(statusRoute,/accounting_bank_accounts set current_balance=current_balance-\$1/);
 assert.match(statusRoute,/accounting_cashboxes set current_balance=current_balance-\$1/);
 assert.match(statusRoute,/carrier_payment_posted/);
 assert.match(statusRoute,/platform_audit_events/);
});

test("posted carrier payments cannot be voided directly",()=>{
 assert.match(statusRoute,/carrierPayment\.status==="posted"/);
 assert.match(statusRoute,/پرداخت قطعی‌شده قابل ابطال مستقیم نیست/);
});

test("carrier payment schema enforces tenant-safe source and treasury relationships",()=>{
 assert.match(migration,/foreign key\(tenant_id,carrier_invoice_id\)\s+references logistics_carrier_invoices\(tenant_id,id\)/);
 assert.match(migration,/foreign key\(tenant_id,payable_id\)\s+references accounting_receivable_payables\(tenant_id,id\)/);
 assert.match(migration,/foreign key\(tenant_id,bank_account_id\)\s+references accounting_bank_accounts\(tenant_id,id\)/);
 assert.match(migration,/foreign key\(tenant_id,cashbox_id\)\s+references accounting_cashboxes\(tenant_id,id\)/);
 assert.match(migration,/accounting_documents_carrier_payment_source_uq/);
});
