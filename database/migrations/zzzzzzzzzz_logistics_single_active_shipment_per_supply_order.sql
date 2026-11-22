begin;

-- One active shipment per supply order prevents duplicate dispatch and inventory bypass.
-- Abort safely if historical data already contains multiple active shipments; resolve those
-- records explicitly before retrying this migration.
do $$
begin
  if exists (
    select 1
    from logistics_shipments
    where supply_order_id is not null
      and status in ('planned','assigned','picked_up','in_transit')
    group by tenant_id,supply_order_id
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce one active shipment per supply order: duplicate active shipments exist';
  end if;
end $$;

create unique index if not exists logistics_shipments_one_active_per_supply_order_uq
  on logistics_shipments(tenant_id,supply_order_id)
  where supply_order_id is not null
    and status in ('planned','assigned','picked_up','in_transit');

commit;
