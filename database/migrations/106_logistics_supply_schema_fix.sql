begin;

create table if not exists logistics_supply_orders(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_no text not null,
  plan_id uuid references logistics_supply_plans(id),
  status text not null default 'draft' check(status in ('draft','submitted','approved','assigned','shipped','delivered','cancelled')),
  origin text not null,
  destination text not null,
  cargo_description text,
  quantity numeric(20,3) default 0,
  requested_date date,
  notes text,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,order_no)
);

alter table logistics_shipments add column if not exists supply_order_id uuid references logistics_supply_orders(id);
alter table logistics_shipments add column if not exists delivered_reason text;
alter table logistics_shipments add column if not exists failed_reason text;
alter table logistics_shipments add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_logistics_shipments_supply_order on logistics_shipments(tenant_id,supply_order_id);
create index if not exists idx_logistics_delivery_events_shipment on logistics_delivery_events(tenant_id,shipment_id,occurred_at);
create index if not exists idx_logistics_events_entity on logistics_events(tenant_id,entity_type,entity_id,created_at);

commit;