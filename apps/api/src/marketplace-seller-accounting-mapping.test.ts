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

test("seller identifier is validated before opening a database transaction",()=>{
 assert.ok(mapping.includes("شناسه فروشنده نامعتبر است"));
 assert.ok(mapping.indexOf("شناسه فروشنده نامعتبر است")<mapping.indexOf('await client.query("begin")'));
});


const receivableRoutes=source.slice(source.indexOf('domainMarketplaceRouter.get("/api/marketplace/seller-refund-receivable-account-options"'),source.indexOf('domainMarketplaceRouter.post("/api/marketplace/sellers"'));

test("seller refund receivable options expose only active postable asset and receivable accounts in the tenant",()=>{
 assert.ok(receivableRoutes.includes("account_type in ('asset','receivable')"));
 assert.ok(receivableRoutes.includes("status='active' and is_active=true and is_postable=true"));
 assert.ok(receivableRoutes.includes("tenant_id=$1"));
});

test("seller refund receivable mapping locks seller and validates tenant-owned postable asset account",()=>{
 const start=receivableRoutes.indexOf('domainMarketplaceRouter.patch("/api/marketplace/sellers/:id/refund-receivable-account"');
 const end=receivableRoutes.indexOf('domainMarketplaceRouter.post("/api/marketplace/sellers/:id/refund-receivables/reclassify"',start);
 const route=receivableRoutes.slice(start,end);
 assert.ok(route.includes("for update"));
 assert.ok(route.includes("id=$1 and tenant_id=$2"));
 assert.ok(route.includes("account_type in ('asset','receivable')"));
 assert.ok(route.includes("seller.refund_receivable_account.updated"));
 assert.ok(route.includes('requirePermission("seller:manage")'));
});

test("seller refund receivable reclassification uses only paid settlements and posted refund ledger debits",()=>{
 const start=receivableRoutes.indexOf('domainMarketplaceRouter.post("/api/marketplace/sellers/:id/refund-receivables/reclassify"');
 const route=receivableRoutes.slice(start);
 assert.ok(route.includes("ss.status='paid'"));
 assert.ok(route.includes("mr.status='refunded'"));
 assert.ok(route.includes("le.source_type='marketplace_refund'"));
 assert.ok(route.includes("le.status='posted'"));
 assert.ok(route.includes("la.code='2101'"));
 assert.ok(route.includes("sum(ll.debit)"));
 assert.ok(route.includes("seller.accounting_party_id"));
 assert.ok(route.includes("seller.refund_receivable_account_id"));
});

test("seller refund receivable reclassification posts a balanced idempotent journal and receivable subledger item",()=>{
 const start=receivableRoutes.indexOf('domainMarketplaceRouter.post("/api/marketplace/sellers/:id/refund-receivables/reclassify"');
 const route=receivableRoutes.slice(start);
 assert.ok(route.includes('sourceType:"marketplace_seller_refund_receivable"'));
 assert.ok(route.includes("accountCode:seller.receivable_code"));
 assert.ok(route.includes("accountCode:control.code"));
 assert.ok(route.includes("source_module,source_document_id"));
 assert.ok(route.includes("'marketplace_refund'"));
 assert.ok(route.includes("on conflict(tenant_id,source_module,source_document_id)"));
 assert.ok(route.includes("refund_receivables.reclassified"));
 assert.ok(route.includes('requirePermission("ledger:manage")'));
});

test("seller page requires explicit receivable account mapping before reclassification",()=>{
 const ui=fs.readFileSync(new URL("../../web/app/marketplace/sellers/page.tsx",import.meta.url),"utf8");
 assert.ok(ui.includes("/api/marketplace/seller-refund-receivable-account-options"));
 assert.ok(ui.includes("/refund-receivable-account"));
 assert.ok(ui.includes("/refund-receivables/reclassify"));
 assert.ok(ui.includes("حساب مطالبات بازپرداخت"));
 assert.ok(ui.includes("!item.refund_receivable_account_id"));
});

test("seller refund receivable migration keeps existing mappings null and makes source references unique",()=>{
 const migration=fs.readFileSync(new URL("../../../database/migrations/152_marketplace_seller_refund_receivables.sql",import.meta.url),"utf8");
 assert.ok(migration.includes("add column if not exists refund_receivable_account_id"));
 assert.ok(migration.includes("foreign key(tenant_id,refund_receivable_account_id)"));
 assert.ok(migration.includes("source_module,source_document_id"));
 assert.ok(migration.includes("unique index if not exists uq_accounting_rp_source"));
 assert.ok(migration.includes("references accounting_parties(tenant_id,id)"));
});


test("seller refund receivable subledger listing is tenant-scoped and returns outstanding balances read-only",()=>{
 const start=receivableRoutes.indexOf('domainMarketplaceRouter.get("/api/marketplace/seller-refund-receivables"');
 const end=receivableRoutes.indexOf('domainMarketplaceRouter.post("/api/marketplace/sellers"',start);
 const route=receivableRoutes.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.ok(route.includes('requirePermission("seller:view")'));
 assert.ok(route.includes("rp.tenant_id=$1"));
 assert.ok(route.includes("rp.source_module='marketplace_refund'"));
 assert.ok(route.includes("rp.direction='receivable'"));
 assert.ok(route.includes("s.id::text=rp.metadata->>'sellerId'"));
 assert.ok(route.includes("outstanding_amount"));
 assert.ok(route.includes("limit 500"));
 assert.ok(!/\b(insert into|update\s+|delete from)\b/i.test(route));
});

test("seller UI displays outstanding refund receivables by seller",()=>{
 const ui=fs.readFileSync(new URL("../../web/app/marketplace/sellers/page.tsx",import.meta.url),"utf8");
 assert.ok(ui.includes("/api/marketplace/seller-refund-receivables"));
 assert.ok(ui.includes("مطالبات ثبت‌شده این فروشنده"));
 assert.ok(ui.includes("outstanding_amount"));
});
