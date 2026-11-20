begin;

alter table logistics_supply_orders
  add column if not exists marketplace_order_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='logistics_supply_orders_marketplace_order_fk'
      and conrelid='logistics_supply_orders'::regclass
  ) then
    alter table logistics_supply_orders
      add constraint logistics_supply_orders_marketplace_order_fk
      foreign key (marketplace_order_id)
      references marketplace_orders(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists logistics_supply_orders_marketplace_order_uq
  on logistics_supply_orders(tenant_id,marketplace_order_id)
  where marketplace_order_id is not null;

update logistics_supply_orders so
set marketplace_order_id=mo.id,updated_at=now()
from marketplace_orders mo
where so.tenant_id=mo.tenant_id
  and so.order_no=mo.order_no
  and so.marketplace_order_id is null;

commit;
