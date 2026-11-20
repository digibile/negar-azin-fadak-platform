-- 123: explicit tenant-safe link between storefront products and warehouse catalog items.
begin;
create unique index if not exists products_tenant_id_id_uq on products(tenant_id,id);
create unique index if not exists inventory_products_tenant_id_id_uq on inventory_products(tenant_id,id);
create table if not exists marketplace_inventory_product_links (
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null,
  inventory_product_id uuid not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(tenant_id,product_id),
  constraint marketplace_inventory_link_product_fk foreign key(tenant_id,product_id)
    references products(tenant_id,id) on delete cascade,
  constraint marketplace_inventory_link_inventory_fk foreign key(tenant_id,inventory_product_id)
    references inventory_products(tenant_id,id) on delete restrict
);
create index if not exists marketplace_inventory_link_inventory_idx
  on marketplace_inventory_product_links(tenant_id,inventory_product_id);
commit;
