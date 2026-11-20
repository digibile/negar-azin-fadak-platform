begin;

alter table logistics_shipments
  add column if not exists marketplace_order_id uuid references marketplace_orders(id) on delete restrict;

create unique index if not exists uq_logistics_marketplace_order_shipment
  on logistics_shipments(tenant_id,marketplace_order_id)
  where marketplace_order_id is not null;

create index if not exists idx_logistics_marketplace_order_tracking
  on logistics_shipments(tenant_id,marketplace_order_id,status,created_at desc)
  where marketplace_order_id is not null;

commit;
