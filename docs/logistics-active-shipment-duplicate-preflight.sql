-- Read-only preflight for the one-active-shipment-per-supply-order constraint.
-- Run before applying zzzzzzzzzz_logistics_single_active_shipment_per_supply_order.sql.
-- This file performs SELECT only; it does not modify operational data.

select tenant_id,
       supply_order_id,
       count(*) as active_shipment_count,
       array_agg(id order by created_at,id) as shipment_ids,
       array_agg(status order by created_at,id) as shipment_statuses
from logistics_shipments
where supply_order_id is not null
  and status in ('planned','assigned','picked_up','in_transit')
group by tenant_id,supply_order_id
having count(*) > 1
order by active_shipment_count desc,tenant_id,supply_order_id;

select count(*)::bigint as supply_orders_with_multiple_active_shipments
from (
  select tenant_id,supply_order_id
  from logistics_shipments
  where supply_order_id is not null
    and status in ('planned','assigned','picked_up','in_transit')
  group by tenant_id,supply_order_id
  having count(*) > 1
) duplicates;

-- Expected result for safe index creation: zero rows in the first query and count 0 above.
