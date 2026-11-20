-- 124: warehouse reservations for newly linked marketplace orders.
begin;
alter table marketplace_inventory_product_links
  add column if not exists quantity_factor numeric(20,6) not null default 1
  check(quantity_factor>0);

create unique index if not exists logistics_supply_orders_tenant_id_uq
  on logistics_supply_orders(tenant_id,id);
create unique index if not exists marketplace_orders_tenant_id_uq
  on marketplace_orders(tenant_id,id);
create unique index if not exists inventory_warehouses_tenant_id_uq
  on inventory_warehouses(tenant_id,id);

create table if not exists marketplace_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  supply_order_id uuid not null,
  marketplace_order_id uuid not null,
  warehouse_id uuid not null,
  marketplace_product_id uuid not null,
  inventory_product_id uuid not null,
  quantity numeric(20,4) not null check(quantity>0),
  status text not null default 'reserved' check(status in ('reserved','consumed','released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_inventory_reservation_supply_fk
    foreign key(tenant_id,supply_order_id) references logistics_supply_orders(tenant_id,id) on delete restrict,
  constraint marketplace_inventory_reservation_order_fk
    foreign key(tenant_id,marketplace_order_id) references marketplace_orders(tenant_id,id) on delete restrict,
  constraint marketplace_inventory_reservation_warehouse_fk
    foreign key(tenant_id,warehouse_id) references inventory_warehouses(tenant_id,id) on delete restrict,
  constraint marketplace_inventory_reservation_marketplace_product_fk
    foreign key(tenant_id,marketplace_product_id) references products(tenant_id,id) on delete restrict,
  constraint marketplace_inventory_reservation_inventory_product_fk
    foreign key(tenant_id,inventory_product_id) references inventory_products(tenant_id,id) on delete restrict,
  constraint marketplace_inventory_reservation_unique
    unique(tenant_id,supply_order_id,marketplace_product_id)
);
create index if not exists marketplace_inventory_reservation_order_idx
  on marketplace_inventory_reservations(tenant_id,marketplace_order_id,status);
create index if not exists marketplace_inventory_reservation_warehouse_idx
  on marketplace_inventory_reservations(tenant_id,warehouse_id,inventory_product_id,status);
commit;
