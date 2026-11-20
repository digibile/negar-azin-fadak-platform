-- Physical return authorization and inspection before inventory restoration.
create table if not exists marketplace_order_returns(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 order_id uuid not null references marketplace_orders(id) on delete restrict,
 customer_ref text,
 reason text not null,
 status text not null default 'requested' check(status in ('requested','approved','received','accepted','rejected')),
 rejection_reason text,
 created_by uuid references users(id) on delete set null,
 inspected_by uuid references users(id) on delete set null,
 received_at timestamptz,
 inspected_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,order_id)
);
create index if not exists idx_marketplace_order_returns_tenant_status
 on marketplace_order_returns(tenant_id,status,created_at desc);
create index if not exists idx_marketplace_order_returns_order
 on marketplace_order_returns(tenant_id,order_id);
insert into role_permissions(role,permission) values
 ('admin','order:lifecycle'),('manager','order:lifecycle')
on conflict do nothing;
