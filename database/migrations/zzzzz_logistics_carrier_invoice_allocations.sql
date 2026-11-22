begin;

create unique index if not exists accounting_parties_tenant_id_uq
  on accounting_parties(tenant_id,id);

create unique index if not exists logistics_shipments_tenant_id_uq
  on logistics_shipments(tenant_id,id);

create table if not exists logistics_carrier_invoices(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  carrier_party_id uuid not null,
  invoice_no text not null,
  invoice_date date not null,
  currency text not null default 'IRR' check(currency ~ '^[A-Z]{3}$'),
  subtotal numeric(20,2) not null check(subtotal>=0),
  tax_amount numeric(20,2) not null default 0 check(tax_amount>=0),
  total_amount numeric(20,2) not null check(total_amount>0 and total_amount=subtotal+tax_amount),
  status text not null default 'draft' check(status in ('draft','verified','posted','void')),
  verified_by uuid references users(id) on delete set null,
  verified_at timestamptz,
  notes text not null default '',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,id),
  unique(tenant_id,carrier_party_id,invoice_no),
  foreign key(tenant_id,carrier_party_id)
    references accounting_parties(tenant_id,id) on delete restrict
);

create table if not exists logistics_carrier_invoice_shipments(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  invoice_id uuid not null,
  shipment_id uuid not null,
  allocated_amount numeric(20,2) not null check(allocated_amount>0),
  created_at timestamptz not null default now(),
  unique(tenant_id,invoice_id,shipment_id),
  foreign key(tenant_id,invoice_id)
    references logistics_carrier_invoices(tenant_id,id) on delete cascade,
  foreign key(tenant_id,shipment_id)
    references logistics_shipments(tenant_id,id) on delete restrict
);

create index if not exists logistics_carrier_invoice_tenant_status_idx
  on logistics_carrier_invoices(tenant_id,status,invoice_date desc);
create index if not exists logistics_carrier_invoice_shipment_idx
  on logistics_carrier_invoice_shipments(tenant_id,shipment_id);

commit;
