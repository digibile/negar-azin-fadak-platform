# Marketplace Itemized Delivery Confirmation Design

## Status and scope

Design-only audit on `feat/commerce-management-workspace`. No migration, API route, UI, worker, inventory mutation, accounting posting, or production change is included.

The goal is to define the missing internal contract for recording what was physically handed to the customer for each marketplace order item. This is separate from the carrier provider webhook contract.

## Verified current data model

### Marketplace order items

The checkout flow creates `marketplace_order_items` rows with product, quantity, unit price, and line total. Return requests already reference a specific `order_item_id`, so the order-item identity is available in the existing domain.

### Supply order and reservation model

- `logistics_supply_orders.marketplace_order_id` links one supply order to a marketplace order; migration 107 enforces a tenant-scoped unique index for that link.
- `marketplace_inventory_reservations` is tenant-scoped and links supply order, marketplace order, warehouse, marketplace product, and inventory product.
- Reservation quantity is stored in inventory units and has a product conversion factor in the marketplace-to-inventory product mapping.
- The reservation uniqueness key is `(tenant_id,supply_order_id,marketplace_product_id)`; it does **not** store `marketplace_order_items.id`.
- Reservation lifecycle is `reserved`, `consumed`, or `released`.
- The shipment lifecycle consumes the reservation when the shipment enters `in_transit`, not when delivery is confirmed.
- Existing `logistics_delivery_events` stores shipment status, location, description, actor, and timestamp, but no item-level quantities or proof reference.

### Existing delivery endpoint

`PATCH /api/logistics/shipments/:id/status` requires a location for `delivered`, then updates the shipment and linked supply order. It does not accept item quantities, recipient-level acceptance, partial-delivery detail, or evidence metadata.

### Existing return flow

Customer returns are already item-specific through `marketplace_return_requests.order_item_id`. Physical receipt and inspection separately track received and restockable quantities. Only inspected sellable quantities are posted to available inventory; non-restockable quantities are quarantined. This flow must remain the authority for post-delivery customer returns.

## Design boundary

Delivery confirmation must answer a different question from shipment tracking:

- Shipment tracking: where is the parcel and what is its transport state?
- Itemized delivery confirmation: which ordered items and quantities were actually handed over and accepted/rejected by the recipient?

A carrier event saying `delivered` is not, by itself, proof that every order line and quantity was delivered. A provider-specific proof-of-delivery payload must be mapped only after a real carrier contract is selected.

## Proposed internal confirmation record

The next implementation should introduce a tenant-scoped, append-only itemized delivery confirmation record associated with the internal shipment and exact marketplace order item. The logical record needs:

- tenant ID;
- internal shipment ID;
- marketplace order ID;
- marketplace order-item ID;
- confirmed accepted quantity in the order item's unit;
- confirmed rejected quantity, if the recipient explicitly refused some quantity;
- confirmation source (authorized operator or verified carrier adapter);
- actor or provider reference;
- confirmation timestamp;
- evidence reference/metadata, without storing sensitive raw recipient data in logs;
- idempotency identity for provider event or operator submission;
- audit correlation.

The exact table name, SQL types, foreign-key shape, and uniqueness key must be finalized after checking existing migration naming and the actual order-item schema in the target branch. This document intentionally does not create a speculative schema.

## Required invariants

1. Every confirmation belongs to the same tenant, marketplace order, supply order, and shipment.
2. The order item must belong to the referenced marketplace order.
3. The item product must match the product represented by the reservation. Because reservations currently aggregate by marketplace product rather than order-item ID, the implementation must prove the mapping is unambiguous before applying a quantity.
4. Confirmed accepted plus explicitly rejected quantities must not exceed the ordered quantity, after accounting for prior confirmations and any approved cancellation/return state.
5. Repeated operator submissions and repeated provider events must be idempotent.
6. A late or out-of-order event must not overwrite a newer accepted quantity or regress shipment state.
7. A carrier status event must not mutate inventory reservations by itself.
8. A delivered confirmation must not consume inventory again. Reservation consumption remains at the existing dispatch/in-transit boundary.
9. A post-delivery defect or customer return must use the existing return request, physical receipt, inspection, and quarantine workflow. It must not be represented as a negative delivery confirmation.
10. All reads and writes must be tenant-scoped, permission-protected, transactional, and audited.

## Partial delivery and exception policy to decide before implementation

The current shipment status enum does not include a dedicated partial-delivery state. Do not add or infer one until the business rule is approved.

Before coding, the product owner must decide:

- whether a carrier may close a shipment as delivered when one or more order items are short;
- whether a short quantity remains open for a second shipment, is cancelled, or is refunded;
- whether recipient refusal is recorded as rejected-at-door or becomes a return request after custody transfer;
- how damaged-at-door quantities are represented and physically received;
- whether one order can be completed across multiple shipments over time;
- what proof is mandatory for operator-confirmed delivery versus carrier-confirmed delivery.

No automatic stock release or stock restoration should occur for a shortage, refusal, failed delivery, or return without a separately verified physical inventory event and an approved transition.

## Recommended implementation sequence

1. Preflight the exact `marketplace_order_items` schema, shipment-to-supply-order constraints, reservation rows, and return constraints on the target branch.
2. Resolve whether multiple shipment attempts or multiple shipments per order item are supported by existing constraints.
3. Approve the partial-delivery, refusal, and short-quantity policies above.
4. Add a tenant-safe append-only confirmation model and migration with uniqueness/idempotency constraints.
5. Add an operator confirmation endpoint first, protected by the existing logistics delivery permission and CSRF. Keep carrier ingestion behind the separately specified adapter/inbox.
6. Validate item/order/shipment/reservation relationships and cumulative quantities under row locks in one transaction.
7. Add a read-only reconciliation view joining order items, confirmations, shipment state, reservations, and existing return cases.
8. Add tests for tenant isolation, duplicate submissions, repeated provider events, concurrency, over-quantity, ambiguous reservation mapping, partial delivery, rejection, and post-delivery return separation.
9. Keep automatic refund, inventory release/restoration, and accounting posting disabled until their own policies are approved.

## Explicit non-goals

- No invented carrier webhook fields, signature headers, provider event IDs, or status mappings.
- No new shipment status value in this design-only change.
- No automatic stock restoration, reservation release, refund, or accounting entry.
- No replacement of existing return inspection/quarantine behavior.
- No production or database changes.

## Evidence reviewed

- `apps/api/src/domain-checkout.ts`
- `apps/api/src/logistics.ts`
- `database/migrations/106_logistics_supply_orders_and_lifecycle.sql`
- `database/migrations/107_marketplace_logistics_order_link.sql`
- `database/migrations/123_marketplace_inventory_product_links.sql`
- `database/migrations/124_marketplace_warehouse_reservations.sql`
- `database/migrations/999_storefront_customer_returns.sql`
- `database/migrations/999_storefront_return_inspection_receipt.sql`
- `apps/api/src/marketplace-return-inspection-integrity.test.ts`
- `docs/logistics-carrier-provider-integration-contract.md`
