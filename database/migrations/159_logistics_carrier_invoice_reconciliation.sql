-- 159: operational reconciliation of carrier invoices against delivered marketplace shipments.
-- This stage records and reviews carrier invoices only. It does not post a payable or payment
-- to the general ledger until the tenant's approved carrier-liability account mapping is configured.
begin;

create table if not exists logistics_carrier_invoices (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 shipment_id uuid not null references logistics_shipments(id) on delete restrict,
 order_id uuid not null references marketplace_orders(id) on delete restrict,
 delivery_quote_id uuid not null references marketplace_delivery_quotes(id) on delete restrict,
 invoice_no text not null,
 carrier_name text not null,
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 quoted_cost numeric(20,2) not null check(quoted_cost >= 0),
 invoice_amount numeric(20,2) not null check(invoice_amount >= 0),
 variance_amount numeric(20,2) not null,
 status text not null check(status in ('matched','disputed','approved','void')),
 notes text,
 resolution_note text,
 created_by uuid references users(id) on delete set null,
 reviewed_by uuid references users(id) on delete set null,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,shipment_id,invoice_no),
 check(variance_amount = invoice_amount - quoted_cost)
);

create unique index if not exists uq_logistics_carrier_invoice_active_shipment
 on logistics_carrier_invoices(tenant_id,shipment_id) where status <> 'void';

create index if not exists idx_logistics_carrier_invoices_tenant_status
 on logistics_carrier_invoices(tenant_id,status,created_at desc);
create index if not exists idx_logistics_carrier_invoices_order
 on logistics_carrier_invoices(tenant_id,order_id,created_at desc);

commit;
