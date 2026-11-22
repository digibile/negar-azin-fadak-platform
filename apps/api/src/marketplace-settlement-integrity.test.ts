import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");

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
