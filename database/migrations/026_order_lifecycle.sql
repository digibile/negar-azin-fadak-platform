alter table marketplace_orders
 add column if not exists confirmed_at timestamptz,
 add column if not exists paid_at timestamptz,
 add column if not exists processing_at timestamptz,
 add column if not exists shipped_at timestamptz,
 add column if not exists delivered_at timestamptz,
 add column if not exists cancelled_at timestamptz,
 add column if not exists cancellation_reason text;

create index if not exists idx_marketplace_orders_lifecycle
 on marketplace_orders(tenant_id,status,updated_at desc);

insert into role_permissions(role,permission) values
('admin','order:lifecycle'),('manager','order:lifecycle')
on conflict do nothing;
