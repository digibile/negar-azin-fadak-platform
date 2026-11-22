import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");
const settlementUiSource=fs.readFileSync(new URL("../../web/app/marketplace/settlements/page.tsx",import.meta.url),"utf8");
const allocationMigration=fs.readFileSync(new URL("../../../database/migrations/149_finance_cost_layer_allocation_ledger.sql",import.meta.url),"utf8");
const valuationPolicyMigration=fs.readFileSync(new URL("../../../database/migrations/150_finance_cost_valuation_policy_governance.sql",import.meta.url),"utf8");
const accountingFinanceSource=fs.readFileSync(new URL("./accounting-finance.ts",import.meta.url),"utf8");
const financeWorkspaceSource=fs.readFileSync(new URL("../../web/app/modules/AccountingFinanceWorkspace.tsx",import.meta.url),"utf8");

test("settlement generation keeps caller reference for a single seller",()=>{
 assert.match(source,/bySeller\.size>1\?requestedSettlementNo\+"-"\+sellerId:requestedSettlementNo/);
});

test("settlement generation scopes a shared caller reference by the full seller id",()=>{
 assert.match(source,/requestedSettlementNo\+"-"\+sellerId/);
 assert.match(source,/\("SET-"\+Date\.now\(\)\+"-"\+sellerId\)/);
 assert.ok(!source.includes('sellerId.slice(0,8)'));
});

test("order cost analysis only counts confirmed refunds, paid settlements and posted freight",()=>{
 assert.match(source,/order-cost-analysis/);
 assert.ok(source.includes("r.status='refunded'"));
 assert.ok(source.includes("ss.status='paid'"));
 assert.ok(source.includes("i.status='posted'"));
 assert.ok(source.includes("d.status='posted'"));
 assert.match(source,/cost_of_goods_status/);
 assert.match(source,/profit_status/);
 assert.ok(source.includes("tenant_id=o.tenant_id"));
});
test("order cost analysis rejects invalid and reversed date ranges",()=>{
 assert.ok(source.includes("validDate(req.query.from)"));
 assert.ok(source.includes("validDate(req.query.to)"));
 assert.ok(source.includes("if(from>to)"));
});

test("costing readiness reconciles marketplace, operational inventory and financial mappings",()=>{
 assert.ok(source.includes("costing-readiness"));
 assert.ok(source.includes("marketplace_order_items"));
 assert.ok(source.includes("marketplace_inventory_product_links"));
 assert.ok(source.includes("marketplace_finance_product_links"));
 assert.ok(source.includes("marketplace_inventory_reservations"));
 assert.ok(source.includes("mir.status='consumed'"));
 assert.ok(source.includes("finance_cost_layers"));
 assert.ok(source.includes("finance_inventory_balances"));
 assert.ok(source.includes("financial_balances as"));
 assert.ok(source.includes("financial_inventory_balance_row_count"));
 assert.ok(source.includes("financial_inventory_value_amount"));
 assert.ok(source.includes("fid.status='posted'"));
 assert.ok(source.includes("cost_layers_present_financial_issue_link_pending"));
 assert.ok(source.includes("marketplace_finance_warehouse_links"));
 assert.ok(source.includes("mapped_operational_warehouse_count"));
 assert.ok(source.includes("missing_finance_warehouse_mapping"));
 assert.ok(source.includes("posted_layer_methods"));
 assert.ok(source.includes("mapped_finance_warehouse_ids"));
 assert.ok(source.includes("matching_layers"));
 assert.ok(source.includes("pl.warehouse_id=any(c.mapped_finance_warehouse_ids)"));
 assert.ok(source.includes("missing_posted_finance_cost_layers_at_consumed_warehouse"));
 assert.ok(source.includes("mixed_cost_layer_valuation_methods"));
 assert.ok(source.includes("not_calculated"));
 assert.ok(source.includes("logistics_supply_orders"));
 assert.ok(source.includes("logistics_shipments"));
 assert.ok(source.includes("supply_order_not_shipped"));
 assert.ok(source.includes("shipment_dispatched_financial_issue_pending"));
 assert.ok(source.includes("shipment_dispatch_timestamp_missing"));
 assert.ok(source.includes("dispatchSummary"));
});
test("costing readiness is tenant scoped, date bounded and explicitly limited",()=>{
 assert.ok(source.includes("o.tenant_id=$1"));
 assert.ok(source.includes("mir.tenant_id=$1"));
 assert.ok(source.includes("cl.tenant_id=$1"));
 assert.ok(source.includes("validDate(req.query.from)"));
 assert.ok(source.includes("if(from>to)"));
 assert.ok(source.includes("limit 500"));
 assert.ok(source.includes("limit 2000"));
 assert.ok(source.includes("does not post a financial issue document linked to each marketplace order"));
});


test("financial cost layer allocation ledger is tenant-scoped and idempotent",()=>{
 assert.ok(allocationMigration.includes("create table if not exists finance_cost_layer_allocations"));
 assert.ok(allocationMigration.includes("unique(tenant_id,issue_document_line_id,cost_layer_id)"));
 assert.ok(allocationMigration.includes("unique(tenant_id,idempotency_key)"));
 assert.ok(allocationMigration.includes("foreign key(tenant_id,cost_layer_id,product_id)"));
 assert.ok(allocationMigration.includes("for update of cl"));
 assert.ok(allocationMigration.includes("for update of issue_line"));
 assert.ok(allocationMigration.includes("pg_advisory_xact_lock"));
 assert.ok(allocationMigration.includes("source_line.product_id<>v_layer.product_id"));
 assert.ok(allocationMigration.includes("Valuation method must remain consistent"));
});

test("financial cost layer allocation rejects over-consumption and non-posted documents",()=>{
 assert.ok(allocationMigration.includes("v_layer_allocated+new.quantity>v_layer.quantity"));
 assert.ok(allocationMigration.includes("v_issue_allocated+new.quantity>v_issue.quantity"));
 assert.ok(allocationMigration.includes("source_document_status<>'posted'"));
 assert.ok(allocationMigration.includes("v_issue.status<>'posted'"));
 assert.ok(allocationMigration.includes("v_issue.document_type<>'issue'"));
 assert.ok(allocationMigration.includes("before insert or update or delete"));
 assert.ok(allocationMigration.includes("allocations are immutable"));
});

test("cost layer allocation preview is read-only, tenant-scoped and requires a posted issue document",()=>{
 assert.ok(source.includes("cost-layer-allocation-preview"));
 assert.ok(source.includes('requirePermission("settlement:view")'));
 assert.ok(source.includes("issueDocumentId"));
 assert.ok(source.includes("finance_inventory_documents d"));
 assert.ok(source.includes("d.tenant_id=$1 and d.id=$2"));
 assert.ok(source.includes('doc.document_type!=="issue"||doc.status!=="posted"'));
 assert.ok(source.includes("finance_cost_layer_allocations"));
 assert.ok(source.includes("source_doc.status='posted'"));
 assert.ok(source.includes("source_doc.document_type in ('receipt','return_receipt','adjustment')"));
 assert.ok(source.includes("layer.quantity>coalesce(la2.allocated_quantity,0)"));
 assert.ok(source.includes("issue_quantity-coalesce(ia.allocated_quantity,0)"));
 assert.ok(source.includes("policyDecision"));
 assert.ok(source.includes("allocationEnabled:false"));
 assert.ok(source.includes("automaticSelection:false"));
});

test("cost layer allocation preview preserves PostgreSQL numeric precision",()=>{
 assert.ok(source.includes("issueQuantity:row.issue_quantity"));
 assert.ok(source.includes("unitCost:row.unit_cost"));
 assert.ok(source.includes("maxAllocatableQuantity:row.max_allocatable_quantity"));
 assert.ok(!source.includes("unitCost:Number(row.unit_cost)"));
});

test("posted finance issue document picker is tenant-scoped and read-only",()=>{
 assert.ok(source.includes("posted-issue-documents"));
 assert.ok(source.includes("d.tenant_id=$1 and d.document_type='issue' and d.status='posted'"));
 assert.ok(source.includes("limit 100"));
 assert.ok(source.includes("line_count"));
 assert.ok(source.includes("readOnly:true"));
});

test("valuation policies are tenant/product/warehouse scoped, versioned and immutable after activation",()=>{
 assert.ok(valuationPolicyMigration.includes("finance_cost_valuation_policies"));
 assert.ok(valuationPolicyMigration.includes("foreign key(tenant_id,product_id)"));
 assert.ok(valuationPolicyMigration.includes("foreign key(tenant_id,warehouse_id)"));
 assert.ok(valuationPolicyMigration.includes("where status='active'"));
 assert.ok(valuationPolicyMigration.includes("Valuation policy history is immutable"));
 assert.ok(valuationPolicyMigration.includes("Activation may only approve an unchanged draft policy"));
 assert.ok(valuationPolicyMigration.includes("Retirement may only close an active policy"));
 assert.ok(valuationPolicyMigration.includes("No active valuation policy exists for this product and warehouse"));
 assert.ok(valuationPolicyMigration.includes("Allocation valuation method does not match the active policy"));
});

test("valuation policy API uses tenant scope and explicit draft approval and retirement",()=>{
 assert.ok(accountingFinanceSource.includes("/api/accounting-finance/cost-valuation-policies"));
 assert.ok(accountingFinanceSource.includes("accounting-finance.write"));
 assert.ok(accountingFinanceSource.includes("status='draft'"));
 assert.ok(accountingFinanceSource.includes("status='active'"));
 assert.ok(accountingFinanceSource.includes("status='retired'"));
 assert.ok(accountingFinanceSource.includes("priorMethods"));
 assert.ok(accountingFinanceSource.includes("سوابق تخصیص ثبت‌شده روش قبلی را قفل کرده‌اند"));
});

test("allocation preview only advertises layers allowed by the active valuation policy",()=>{
 assert.ok(source.includes("active_policies as"));
 assert.ok(source.includes("active_policy_missing"));
 assert.ok(source.includes("cost_layer_method_conflicts_with_active_policy"));
 assert.ok(source.includes("eligible_under_active_policy"));
 assert.ok(source.includes("activePolicyMethod:row.active_policy_method"));
});

test("accounting finance workspace exposes real valuation policy lifecycle controls",()=>{
 assert.ok(financeWorkspaceSource.includes('["costPolicies","سیاست بهای تمام‌شده"]'));
 assert.ok(financeWorkspaceSource.includes("/api/accounting-finance/cost-valuation-policies"));
 assert.ok(financeWorkspaceSource.includes("ثبت پیش‌نویس سیاست"));
 assert.ok(financeWorkspaceSource.includes("تأیید و فعال‌سازی"));
 assert.ok(financeWorkspaceSource.includes("بازنشسته‌سازی"));
 assert.ok(financeWorkspaceSource.includes("new Date(policyDraft.effectiveFrom+\"T00:00:00\").toISOString()"));
});

test("FIFO allocation endpoint is transactional, tenant-scoped and requires the approved FIFO policy",()=>{
 assert.ok(source.includes("/:issueDocumentId/allocate-cost"));
 assert.ok(source.includes('requirePermission("accounting-finance.write")'));
 assert.ok(source.includes("pg_advisory_xact_lock"));
 assert.ok(source.includes("for share"));
 assert.ok(source.includes("valuation_method='fifo'"));
 assert.ok(source.includes("sd.document_type in ('receipt','return_receipt','adjustment')"));
 assert.ok(source.includes("if(blocked.length)"));
 assert.ok(source.includes("await client.query(\"begin\")"));
 assert.ok(source.includes("await client.query(\"commit\")"));
 assert.ok(source.includes("await client.query(\"rollback\")"));
 assert.ok(source.includes("'fifo:'||$2::text"));
 assert.ok(source.includes("finance.cost_layer_allocated"));
});

test("FIFO allocation plan preserves decimal quantities and orders cost layers by receipt chronology",()=>{
 assert.ok(source.includes("sum(remaining_quantity) over(partition by product_id order by created_at,cost_layer_id"));
 assert.ok(source.includes("least(i.issue_end,l.layer_end)-greatest(i.issue_start,l.layer_start)"));
 assert.ok(source.includes("round(allocation_quantity*unit_cost,4)"));
 assert.ok(source.includes("and sl.product_id=cl.product_id"));
});

test("settlement workspace exposes FIFO write action only when preview contains eligible active FIFO layers",()=>{
 assert.ok(settlementUiSource.includes("/allocate-cost"));
 assert.ok(settlementUiSource.includes('layer.activePolicyMethod==="fifo"'));
 assert.ok(settlementUiSource.includes("ثبت تخصیص بهای تمام‌شده بر مبنای FIFO"));
 assert.ok(settlementUiSource.includes("تخصیص خودکار در این مرحله فقط برای سیاست FIFO"));
});

test("financial issue linkage audit is tenant-scoped, read-only and does not infer an order link from source id alone",()=>{
 assert.ok(source.includes("/financial-issue-link-audit"));
 assert.ok(source.includes('requirePermission("settlement:view")'));
 assert.ok(source.includes("mir.status='consumed'"));
 assert.ok(source.includes("d.document_type='issue' and d.status='posted'"));
 assert.ok(source.includes("source_id_order_match"));
 assert.ok(source.includes("برابری شناسه منبع با شناسه سفارش"));
 assert.ok(source.includes("readOnly:true"));
 assert.ok(settlementUiSource.includes("ممیزی ارتباط سفارش و سند خروج مالی"));
 assert.ok(settlementUiSource.includes("تطبیق شناسه با سفارش"));
 assert.ok(settlementUiSource.includes("بدون تأیید نوع منبع و ارتباط قلم‌ها"));
});

test("COGS accounting readiness is read-only and requires explicit order-line reconciliation",()=>{
 assert.ok(source.includes("/cogs-accounting-readiness"));
 assert.ok(source.includes('requirePermission("accounting-finance.read")'));
 assert.ok(source.includes("source_type='marketplace-cogs-issue'"));
 assert.ok(source.includes("source_id=$2::text"));
 assert.ok(source.includes("accounting_fiscal_periods"));
 assert.ok(source.includes("period_status"));
 assert.ok(source.includes("account_nature in ('asset','expense')"));
 assert.ok(source.includes("ارتباط تک‌تک اقلام سفارش با اقلام سند خروج هنوز ثبت و تأیید نشده است"));
 assert.ok(source.includes("draftCreationAllowed:false,postingAllowed:false"));
 assert.ok(source.includes("تولید سند خودکار مجاز نیست"));
 assert.ok(settlementUiSource.includes("کنترل آمادگی سند حسابداری بهای کالا"));
 assert.ok(settlementUiSource.includes("حساب‌های کاندیدا، بدون انتخاب خودکار"));
 assert.ok(settlementUiSource.includes("ایجاد پیش‌نویس مجاز نیست"));
});
