# Marketplace Delivery and Financial Reconciliation Readiness

## Scope

This audit records the current boundary between marketplace delivery tracking, warehouse reservation consumption, and financial inventory issue documents. It is a read-only design note. It does not change schemas, operational behavior, accounting balances, or production data.

## Existing capabilities verified in source

### Delivery status reconciliation

`GET /api/marketplace/settlements/delivery-reconciliation` in `apps/api/src/domain-settlement.ts` is tenant-scoped, permission-protected, and read-only. It joins paid marketplace orders to their supply order and latest shipment, and classifies the result as:

- `logistics_not_created`
- `shipment_not_created`
- `delivery_exception`
- `delivered`
- `shipment_in_progress`

It reports shipment status and timestamps. It does not report a carrier-confirmed delivered quantity.

### Inventory consumption

The shipment status transition in `apps/api/src/logistics.ts` consumes marketplace reservations when a linked shipment enters `in_transit`. It decreases physical quantity and reserved quantity in the same transaction, marks reservation rows `consumed`, and writes inventory events.

A later `delivered` transition updates the supply-order status. It does not consume inventory again. A `failed` transition does not automatically restore stock, which is appropriate while physical return/recovery has not been confirmed.

### Financial issue document

`POST /api/marketplace/settlements/financial-issue-documents/drafts` in `apps/api/src/domain-settlement.ts`:

- requires a linked supply order in `shipped` or `delivered` state;
- requires all reservations for the order to be `consumed`;
- requires active operational-product, finance-product, and finance-warehouse mappings;
- rejects orders mapped to multiple finance warehouses until a multi-warehouse policy exists;
- uses an advisory transaction lock and checks for an existing source-linked issue document;
- creates a draft only, with `unit_cost=0`;
- explicitly reports `posted:false`, `operationalStockChanged:false`, and `costPostingCreated:false`.

The separate line-link readiness endpoint compares consumed reservation quantities (after the configured conversion factor) with lines in existing posted financial issue documents. It is read-only and does not infer cost-of-goods values.

## Reconciliation gaps

1. **No confirmed delivered quantity:** the current `logistics_shipments` schema has no delivered-quantity field or per-item delivery confirmation. The supply order's aggregate `quantity` is not proof of physical delivery.
2. **No partial-delivery model:** there is no evidenced per-product accepted/rejected/short-delivered quantity contract for marketplace shipments. Do not infer one from the aggregate order quantity.
3. **Consumption and delivery are different events:** reservation consumption occurs at `in_transit`. A failed or later-delivered shipment must not cause a second stock decrement.
4. **Financial issue is not a posted cost:** the generated draft uses zero unit cost and is explicitly not a cost posting. A posted inventory issue line alone must not be described as validated COGS unless its valuation source and posting rules are separately established.
5. **Existing reports have different jobs:** delivery status reconciliation and financial issue-line readiness are separate read-only reports. A new duplicate endpoint is not justified until the desired combined operational workflow is specified.

## Safe next implementation sequence

1. Define the carrier/recipient proof contract for delivered quantities, including per-item quantities, partial delivery, rejection, return, and evidence references. Use only a real provider or internal operator contract; do not invent webhook fields.
2. Define how a shipment maps to marketplace order items and inventory reservations. Preserve tenant scope and exact unit-conversion factors.
3. Define the inventory policy for shortages, partial delivery, failed delivery, and returned goods. Never silently release consumed stock.
4. Define the accounting valuation source for inventory issue lines. Replace zero-cost placeholders only after the authoritative cost method, currency, rounding, and accounting-period rules are agreed and tested.
5. Extend the existing read-only reconciliation surfaces rather than creating parallel ledgers or duplicate report routes.
6. Add transaction and concurrency tests for duplicate confirmations, partial quantities, tenant isolation, retries, returns, and reconciliation against posted financial lines.
7. Keep automatic posting disabled until finance mapping, valuation, and approval controls pass review.

## Explicit non-goals

- No new migration or delivered-quantity column in this audit.
- No inferred carrier webhook schema, signature header, or event identifier.
- No automatic stock restoration for failed deliveries.
- No automatic cost posting or journal posting.
- No production changes.

## Evidence files

- `apps/api/src/logistics.ts`
- `database/migrations/105_logistics_supply_complete.sql`
- `database/migrations/106_logistics_supply_orders_and_lifecycle.sql`
- `apps/api/src/domain-settlement.ts`
- `apps/api/src/marketplace-delivery-reconciliation-integrity.test.ts`
- `apps/api/src/marketplace-finance-issue-draft-integrity.test.ts`
- `apps/api/src/marketplace-finance-issue-line-link-readiness.test.ts`
