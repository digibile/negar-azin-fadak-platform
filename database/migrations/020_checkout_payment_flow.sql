create table if not exists marketplace_payments(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
 order_id uuid not null references marketplace_orders(id) on delete cascade, payment_no text not null,
 amount numeric(20,2) not null check(amount>0), method text not null,
 status text not null default 'pending' check(status in ('pending','authorized','paid','failed','refunded')),
 provider_ref text, paid_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,payment_no)
);
create index if not exists idx_marketplace_payments_order on marketplace_payments(tenant_id,order_id,status);
insert into role_permissions(role,permission) values
('admin','payment:view'),('admin','payment:manage'),('manager','payment:view'),('manager','payment:manage'),('viewer','payment:view')
on conflict do nothing;
insert into menu_items(title,path,sort_order,permission) values('پرداخت و وضعیت تراکنش','/marketplace/payments',985,'payment:view') on conflict do nothing;