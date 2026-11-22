import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const web=fs.readFileSync(new URL("../../web/app/modules/LogisticsWorkspace.tsx",import.meta.url),"utf8");
const logistics=fs.readFileSync(new URL("./logistics.ts",import.meta.url),"utf8");
const accounting=fs.readFileSync(new URL("./accounting-finance.ts",import.meta.url),"utf8");
const treasury=fs.readFileSync(new URL("./treasury-bank.ts",import.meta.url),"utf8");

test("workspace loads real carrier invoice, supplier, payable, accounting and treasury data",()=>{
 for(const path of ["/api/logistics/carrier-invoices","/api/accounting-finance/operations-overview","/api/accounting-finance/overview","/api/treasury-bank/overview"])assert.ok(web.includes('api("'+path+'")'));
 assert.ok(web.includes('party_type==="supplier"'));
 assert.ok(web.includes("metadata?.carrierInvoiceId"));
});

test("carrier invoice screen creates allocation rows and uses existing logistics endpoints",()=>{
 assert.ok(web.includes('["carrierInvoices","صورتحساب شرکت حمل"]'));
 assert.ok(web.includes("carrierAllocations.map"));
 assert.ok(web.includes('"/api/logistics/carrier-invoices"'));
 assert.ok(web.includes('"/api/logistics/carrier-invoices/"+x.id+"/verify"'));
 assert.ok(web.includes('"/api/logistics/carrier-invoices/"+activeCarrierInvoice.id+"/accounting-draft"'));
 assert.ok(logistics.includes('logisticsRouter.post("/api/logistics/carrier-invoices"'));
 assert.ok(logistics.includes('logisticsRouter.post("/api/logistics/carrier-invoices/:id/verify"'));
 assert.ok(logistics.includes('logisticsRouter.post("/api/logistics/carrier-invoices/:id/accounting-draft"'));
 assert.ok(logistics.includes("d.status accounting_document_status"));
});

test("carrier invoice accounting document can be submitted, approved and posted from logistics",()=>{
 assert.ok(web.includes('accounting_document_status==="draft"'));
 assert.ok(web.includes('accounting_document_status==="submitted"'));
 assert.ok(web.includes('accounting_document_status==="approved"'));
 assert.ok(web.includes('body:JSON.stringify({status:"submitted"})'));
 assert.ok(web.includes('body:JSON.stringify({status:"approved"})'));
 assert.ok(web.includes('body:JSON.stringify({status:"posted"})'));
 assert.ok(accounting.includes("carrierInvoice.accounting_document_id!==old.id"));
});

test("carrier payment UI uses the accounting document lifecycle and treasury settlement",()=>{
 assert.ok(web.includes('"/api/accounting-finance/carrier-invoices/"+activeCarrierInvoice.id+"/payments"'));
 assert.ok(web.includes("قطعی‌سازی و پرداخت"));
 assert.ok(accounting.includes("carrierPayment.accounting_document_id!==old.id"));
 assert.ok(!accounting.includes("carrierPayment.document_id!==old.id"));
 assert.ok(treasury.includes("accounting_document_id)return deny(res,409"));
 assert.ok(web.includes("carrierBanks.filter(x=>x.currency===activeCarrierInvoice.currency)"));
 assert.ok(web.includes('activeCarrierInvoice.currency==="IRR"'));
 assert.ok(web.includes("Number(carrierPaymentForm.amount)>remaining"));
});
