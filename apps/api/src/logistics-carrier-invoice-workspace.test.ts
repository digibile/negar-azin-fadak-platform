import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const web=fs.readFileSync(new URL("../../web/app/modules/LogisticsWorkspace.tsx",import.meta.url),"utf8");
const logistics=fs.readFileSync(new URL("./logistics.ts",import.meta.url),"utf8");
const accounting=fs.readFileSync(new URL("./accounting-finance.ts",import.meta.url),"utf8");
const treasury=fs.readFileSync(new URL("./treasury-bank.ts",import.meta.url),"utf8");

test("logistics workspace loads real carrier invoices, suppliers, payable, accounting and treasury sources",()=>{
 assert.match(web,/api\("\/api\/logistics\/carrier-invoices"\)/);
 assert.match(web,/api\("\/api\/accounting-finance\/operations-overview"\)/);
 assert.match(web,/api\("\/api\/accounting-finance\/overview"\)/);
 assert.match(web,/api\("\/api\/treasury-bank\/overview"\)/);
 assert.match(web,/party_type==="supplier"/);
 assert.match(web,/metadata\?\.carrierInvoiceId/);
});

test("carrier invoice screen registers shipment allocations and follows existing API",()=>{
 assert.match(web,/\["carrierInvoices","صورتحساب شرکت حمل"\]/);
 assert.match(web,/\/api\/logistics\/carrier-invoices/);
 assert.match(web,/\/verify/);
 assert.match(web,/\/accounting-draft/);
 assert.match(web,/carrierAllocations/);
 assert.match(web,/allocations:carrierAllocations\.map/);
 assert.match(logistics,/logisticsRouter\.post\("\/api\/logistics\/carrier-invoices"/);
 assert.match(logistics,/logisticsRouter\.post\("\/api\/logistics\/carrier-invoices\/:id\/verify"/);
 assert.match(logistics,/logisticsRouter\.post\("\/api\/logistics\/carrier-invoices\/:id\/accounting-draft"/);
});

test("carrier payment UI uses document lifecycle and refreshes payment records",()=>{
 assert.match(web,/\/api\/accounting-finance\/carrier-invoices\/.*\/payments/);
 assert.match(web,/status:JSON\.stringify\(\{status:"submitted"\}\)/);
 assert.match(web,/status:JSON\.stringify\(\{status:"approved"\}\)/);
 assert.match(web,/status:JSON\.stringify\(\{status:"posted"\}\)/);
 assert.match(web,/قطعی‌سازی و پرداخت/);
 assert.match(web,/accounting_document_status==="draft"/);
 assert.match(web,/accounting_document_status==="submitted"/);
 assert.match(web,/accounting_document_status==="approved"/);
 assert.match(logistics,/d\\.status accounting_document_status/);
 assert.match(accounting,/carrierPayment\.accounting_document_id!==old\.id/);
 assert.doesNotMatch(accounting,/carrierPayment\.document_id!==old\.id/);
 assert.match(treasury,/accounting_document_id\)return deny\(res,409/);
});

test("carrier payment selector constrains treasury currency and settlement balance",()=>{
 assert.match(web,/carrierBanks\.filter\(x=>x\.currency===activeCarrierInvoice\.currency\)/);
 assert.match(web,/Number\(carrierPaymentForm\.amount\)>remaining/);
 assert.match(web,/activeCarrierInvoice\.currency==="IRR"/);
});
