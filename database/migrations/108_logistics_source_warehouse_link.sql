begin;

alter table logistics_supply_orders
  add column if not exists source_warehouse_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='logistics_supply_orders_source_warehouse_fk'
      and conrelid='logistics_supply_orders'::regclass
  ) then
    alter table logistics_supply_orders
      add constraint logistics_supply_orders_source_warehouse_fk
      foreign key (source_warehouse_id)
      references inventory_warehouses(id)
      on delete set null;
  end if;
end $$;

create index if not exists logistics_supply_orders_source_warehouse_idx
  on logistics_supply_orders(tenant_id,source_warehouse_id)
  where source_warehouse_id is not null;

commit;
