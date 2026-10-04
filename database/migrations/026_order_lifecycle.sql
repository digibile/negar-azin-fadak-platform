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

create unique index if not exists uq_sla_open_subject on sla_cases(tenant_id,subject_type,subject_id) where status in ('open','paused');
create index if not exists idx_sla_breach_scan on sla_cases(status,due_at) where status='open' and due_at is not null;
