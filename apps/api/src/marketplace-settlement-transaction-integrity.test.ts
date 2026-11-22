import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");
const start=source.indexOf('settlementRouter.post("/api/marketplace/settlements/:id/pay"');
const end=source.indexOf('settlementRouter.get("/api/ledger/accounts"',start);
const payout=start>=0&&end>start?source.slice(start,end):"";

test("seller settlement payout rolls back when the settlement does not exist",()=>{
 assert.ok(payout.includes('if(!r.rowCount){await client.query("rollback");return res.status(404)'));
});

test("seller settlement payout rolls back when the settlement is not approved",()=>{
 assert.ok(payout.includes('if(settlement.status!=="approved"){await client.query("rollback");return res.status(409)'));
});

test("seller settlement payout commits only after ledger and audit records are written",()=>{
 const commit=payout.indexOf('await client.query("commit")');
 const ledger=payout.indexOf("postLedgerEntry(client");
 const audit=payout.indexOf("settlement.paid");
 assert.ok(ledger>=0&&audit>ledger&&commit>audit);
});

test("seller settlement payout releases its client after every transaction path",()=>{
 assert.ok(payout.includes('finally{client.release();}'));
 assert.ok(payout.includes('catch(e){await client.query("rollback");throw e;}'));
});


test("settlement generation aggregates database money as exact minor-unit strings",()=>{
 const start=source.indexOf('settlementRouter.post("/api/marketplace/settlements/generate"');
 const end=source.indexOf('settlementRouter.patch("/api/marketplace/settlements/:id/approve"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes("moneyToMinorUnits(String(o.total_amount))"));
 assert.ok(route.includes("moneyToMinorUnits(String(o.commission_amount))"));
 assert.ok(route.includes("moneyToMinorUnits(String(o.seller_payable))"));
 assert.ok(!route.includes("Number(o.total_amount)"));
});

test("settlement ledger posting preserves numeric database values as strings",()=>{
 const start=source.indexOf('settlementRouter.post("/api/marketplace/settlements/:id/pay"');
 const end=source.indexOf('settlementRouter.get("/api/ledger/accounts"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes('debit:String(settlement.net_amount)'));
 assert.ok(route.includes('credit:String(settlement.net_amount)'));
 assert.ok(!route.includes("Number(settlement.net_amount)"));
});

test("settlement payout uses the seller supplier account and selected tenant bank account",()=>{
 assert.ok(payout.includes("s.accounting_party_id"));
 assert.ok(payout.includes("ap.party_type"));
 assert.ok(payout.includes("ap.default_account_id"));
 assert.ok(payout.includes("ba.id=$3 and ba.tenant_id=s.tenant_id"));
 assert.ok(payout.includes("ap.status party_status"));
 assert.ok(payout.includes("payable.is_active payable_is_active"));
 assert.ok(payout.includes("payable.is_postable payable_is_postable"));
 assert.ok(payout.includes("payable.is_postable=true"));
 assert.ok(payout.includes("bank.is_postable=true"));
 assert.ok(payout.includes("bank.code bank_code"));
 assert.ok(payout.includes("accountCode:mapping.bank_code,accountName:mapping.bank_name"));
 assert.ok(payout.includes("payout_bank_account_id=$3,payout_ledger_entry_id=$4,payout_reference=$5"));
 assert.doesNotMatch(payout,/accountCode:"(?:2101|1101)"/);
});

test("payout bank account choices are tenant-scoped and require an active ledger account",()=>{
 const start=source.indexOf('settlementRouter.get("/api/marketplace/settlements/payout-bank-accounts"');
 const end=source.indexOf('settlementRouter.get("/api/marketplace/settlements"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes("ba.tenant_id=$1"));
 assert.ok(route.includes("ba.status='active'"));
 assert.ok(route.includes("la.status='active'"));
 assert.ok(route.includes("la.is_active=true"));
 assert.ok(route.includes("la.is_postable=true"));
});

test("payout validates bank UUID and locks supplier and bank ledger accounts before posting",()=>{
 assert.ok(payout.includes('if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bankAccountId)'));
 assert.ok(payout.includes("for update of ap,ba,payable,bank"));
 assert.ok(payout.includes("if(!locked.rowCount)"));
});

test("settlement schema migration preserves unmapped sellers and requires evidence for new paid settlements",()=>{
 const migration=fs.readFileSync(new URL("../../../database/migrations/151_marketplace_seller_accounting_payout_binding.sql",import.meta.url),"utf8");
 assert.ok(migration.includes("add column if not exists accounting_party_id"));
 assert.ok(migration.includes("add column if not exists payout_bank_account_id"));
 assert.ok(migration.includes("payout_ledger_entry_id uuid"));
 assert.ok(!migration.includes("update seller_settlements"));
 assert.ok(migration.includes("existing sellers remain unmapped"));
});

test("seller payout workspace selects a real bank account and requires a payment reference",()=>{
 const ui=fs.readFileSync(new URL("../../web/app/modules/CommercePanelWorkspace.tsx",import.meta.url),"utf8");
 assert.ok(ui.includes("/api/marketplace/settlements/payout-bank-accounts"));
 assert.ok(ui.includes('"/pay"'));
 assert.ok(ui.includes("ثبت پرداخت و سند مالی"));
 assert.ok(ui.includes("شماره پیگیری پرداخت"));
});

test("payout migration enforces tenant-bound foreign keys for accounting references",()=>{
 const migration=fs.readFileSync(new URL("../../../database/migrations/151_marketplace_seller_accounting_payout_binding.sql",import.meta.url),"utf8");
 assert.ok(migration.includes("foreign key(tenant_id,accounting_party_id) references accounting_parties(tenant_id,id)"));
 assert.ok(migration.includes("foreign key(tenant_id,payout_bank_account_id) references accounting_bank_accounts(tenant_id,id)"));
 assert.ok(migration.includes("foreign key(tenant_id,payout_ledger_entry_id) references ledger_entries(tenant_id,id)"));
 assert.ok(migration.includes("uq_accounting_parties_tenant_id_id"));
});

test("payout bank options do not expose full bank account or IBAN values",()=>{
 const start=source.indexOf('settlementRouter.get("/api/marketplace/settlements/payout-bank-accounts"');
 const end=source.indexOf('settlementRouter.get("/api/marketplace/settlements"',start);
 const route=source.slice(start,end);
 assert.ok(!route.includes("ba.account_no"));
 assert.ok(!route.includes("ba.iban"));
});


test("settlement generation compares persisted order item totals with order subtotal",()=>{
 const start=source.indexOf('settlementRouter.post("/api/marketplace/settlements/generate"');
 const end=source.indexOf('settlementRouter.patch("/api/marketplace/settlements/:id/approve"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes("sum(line_total)::text as item_gross"));
 assert.ok(route.includes("moneyToMinorUnits(String(items.item_gross))!==moneyToMinorUnits(String(order.subtotal))"));
 assert.ok(route.includes("if(!items||items.item_count<1"));
});

test("settlement generation validates total, discount, shipping, commission and seller payable arithmetic",()=>{
 const start=source.indexOf('settlementRouter.post("/api/marketplace/settlements/generate"');
 const end=source.indexOf('settlementRouter.patch("/api/marketplace/settlements/:id/approve"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes("moneyToMinorUnits(String(order.subtotal))-moneyToMinorUnits(String(order.discount_amount))+moneyToMinorUnits(String(order.shipping_amount))"));
 assert.ok(route.includes("moneyToMinorUnits(String(order.commission_amount))+moneyToMinorUnits(String(order.seller_payable))"));
});

test("settlement generation refuses to combine different currencies for one seller",()=>{
 const start=source.indexOf('settlementRouter.post("/api/marketplace/settlements/generate"');
 const end=source.indexOf('settlementRouter.patch("/api/marketplace/settlements/:id/approve"',start);
 const route=source.slice(start,end);
 assert.ok(route.includes("const currencyBySeller=new Map<string,string>()"));
 assert.ok(route.includes('existingCurrency!==currency'));
 assert.ok(route.includes("سفارش‌های یک فروشنده با ارزهای متفاوت"));
});

test("settlement preflight failures roll back before creating settlement headers",()=>{
 const start=source.indexOf('settlementRouter.post("/api/marketplace/settlements/generate"');
 const end=source.indexOf('settlementRouter.patch("/api/marketplace/settlements/:id/approve"',start);
 const route=source.slice(start,end);
 const firstInsert=route.indexOf("insert into seller_settlements");
 const checks=["جمع اقلام سفارش با مبلغ پایه سفارش","مبلغ نهایی، کمیسیون و سهم فروشنده","سفارش‌های یک فروشنده با ارزهای متفاوت"];
 for(const message of checks){
  const at=route.indexOf(message);
  assert.ok(at>=0&&route.lastIndexOf('await client.query("rollback")',at)>route.lastIndexOf("const bySeller",0));
  assert.ok(at<firstInsert);
 }
});
