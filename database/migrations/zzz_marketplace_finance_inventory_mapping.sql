-- Explicit bridge between operational marketplace inventory and financial inventory.
begin;

create unique index if not exists inventory_products_tenant_id_uq
 on inventory_products(tenant_id,id);
create unique index if not exists finance_products_tenant_id_uq
 on finance_products(tenant_id,id);
create unique index if not exists finance_warehouses_tenant_id_uq
 on finance_warehouses(tenant_id,id);

create table if not exists marketplace_finance_product_links(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 inventory_product_id uuid not null,
 finance_product_id uuid not null,
 quantity_factor numeric(20,6) not null default 1 check(quantity_factor>0),
 status text not null default 'active' check(status in ('active','inactive')),
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,inventory_product_id),
 foreign key(tenant_id,inventory_product_id) references inventory_products(tenant_id,id) on delete restrict,
 foreign key(tenant_id,finance_product_id) references finance_products(tenant_id,id) on delete restrict
);
create index if not exists marketplace_finance_product_links_finance_idx
 on marketplace_finance_product_links(tenant_id,finance_product_id,status);

create table if not exists marketplace_finance_warehouse_links(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 inventory_warehouse_id uuid not null,
 finance_warehouse_id uuid not null,
 status text not null default 'active' check(status in ('active','inactive')),
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,inventory_warehouse_id),
 unique(tenant_id,finance_warehouse_id),
 foreign key(tenant_id,inventory_warehouse_id) references inventory_warehouses(tenant_id,id) on delete restrict,
 foreign key(tenant_id,finance_warehouse_id) references finance_warehouses(tenant_id,id) on delete restrict
);
create index if not exists marketplace_finance_warehouse_links_finance_idx
 on marketplace_finance_warehouse_links(tenant_id,finance_warehouse_id,status);

commit;
