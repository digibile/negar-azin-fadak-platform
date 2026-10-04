create table if not exists seller_settlement_items(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 settlement_id uuid not null references seller_settlements(id) on delete cascade,
 order_id uuid not null references marketplace_orders(id) on delete restrict,
 gross_amount numeric(20,2) not null check(gross_amount>=0),
 commission_amount numeric(20,2) not null check(commission_amount>=0),
 net_amount numeric(20,2) not null check(net_amount>=0),
 created_at timestamptz not null default now(),
 unique(tenant_id,order_id),
 unique(settlement_id,order_id)
);
create unique index if not exists uq_ledger_source on ledger_entries(tenant_id,source_type,source_id) where source_id is not null;
create index if not exists idx_settlement_items_settlement on seller_settlement_items(tenant_id,settlement_id);
create index if not exists idx_settlement_items_order on seller_settlement_items(tenant_id,order_id);
insert into role_permissions(role,permission) values
('admin','settlement:view'),('admin','settlement:manage'),
('manager','settlement:view'),('manager','settlement:manage'),
('viewer','settlement:view'),('admin','ledger:view'),('admin','ledger:manage'),
('manager','ledger:view'),('manager','ledger:manage'),('viewer','ledger:view')
on conflict do nothing;
insert into menu_items(title,path,sort_order,permission)
values('دفترکل و رویدادهای مالی','/marketplace/ledger',986,'ledger:view')
on conflict do nothing;