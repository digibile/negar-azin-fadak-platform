-- Read-only preflight for tenant-bound logistics references.
-- Safe to run against a staging/production database: SELECT statements only.
-- Review returned counts and sample rows before proposing any constraint migration.

select 'shipments -> supply order' as relation,
       count(*) filter (where s.tenant_id <> o.tenant_id) as cross_tenant_rows,
       count(*) filter (where o.id is null) as missing_reference_rows
from logistics_shipments s
left join logistics_supply_orders o on o.id = s.supply_order_id
where s.supply_order_id is not null

union all
select 'shipments -> route',
       count(*) filter (where s.tenant_id <> r.tenant_id),
       count(*) filter (where r.id is null)
from logistics_shipments s
left join logistics_routes r on r.id = s.route_id
where s.route_id is not null

union all
select 'shipments -> vehicle',
       count(*) filter (where s.tenant_id <> v.tenant_id),
       count(*) filter (where v.id is null)
from logistics_shipments s
left join logistics_vehicles v on v.id = s.vehicle_id
where s.vehicle_id is not null

union all
select 'shipments -> driver',
       count(*) filter (where s.tenant_id <> d.tenant_id),
       count(*) filter (where d.id is null)
from logistics_shipments s
left join logistics_drivers d on d.id = s.driver_id
where s.driver_id is not null

union all
select 'supply orders -> plan',
       count(*) filter (where o.tenant_id <> p.tenant_id),
       count(*) filter (where p.id is null)
from logistics_supply_orders o
left join logistics_supply_plans p on p.id = o.plan_id
where o.plan_id is not null

union all
select 'supply orders -> source warehouse',
       count(*) filter (where o.tenant_id <> w.tenant_id),
       count(*) filter (where w.id is null)
from logistics_supply_orders o
left join inventory_warehouses w on w.id = o.source_warehouse_id
where o.source_warehouse_id is not null

union all
select 'delivery events -> shipment',
       count(*) filter (where e.tenant_id <> s.tenant_id),
       count(*) filter (where s.id is null)
from logistics_delivery_events e
left join logistics_shipments s on s.id = e.shipment_id;

-- Detailed samples for any cross-tenant relationship.
-- IDs are cast to text because delivery-event IDs are bigint while other IDs are UUID.
select 'shipment_supply_order' as relation, s.id::text as source_id,
       s.tenant_id::text as source_tenant_id, o.id::text as target_id,
       o.tenant_id::text as target_tenant_id
from logistics_shipments s
join logistics_supply_orders o on o.id = s.supply_order_id
where s.tenant_id <> o.tenant_id

union all
select 'shipment_route', s.id::text, s.tenant_id::text, r.id::text, r.tenant_id::text
from logistics_shipments s
join logistics_routes r on r.id = s.route_id
where s.tenant_id <> r.tenant_id

union all
select 'shipment_vehicle', s.id::text, s.tenant_id::text, v.id::text, v.tenant_id::text
from logistics_shipments s
join logistics_vehicles v on v.id = s.vehicle_id
where s.tenant_id <> v.tenant_id

union all
select 'shipment_driver', s.id::text, s.tenant_id::text, d.id::text, d.tenant_id::text
from logistics_shipments s
join logistics_drivers d on d.id = s.driver_id
where s.tenant_id <> d.tenant_id

union all
select 'supply_order_plan', o.id::text, o.tenant_id::text, p.id::text, p.tenant_id::text
from logistics_supply_orders o
join logistics_supply_plans p on p.id = o.plan_id
where o.tenant_id <> p.tenant_id

union all
select 'supply_order_source_warehouse', o.id::text, o.tenant_id::text, w.id::text, w.tenant_id::text
from logistics_supply_orders o
join inventory_warehouses w on w.id = o.source_warehouse_id
where o.tenant_id <> w.tenant_id

union all
select 'delivery_event_shipment', e.id::text, e.tenant_id::text, s.id::text, s.tenant_id::text
from logistics_delivery_events e
join logistics_shipments s on s.id = e.shipment_id
where e.tenant_id <> s.tenant_id;

-- No INSERT/UPDATE/DELETE/DDL is performed by this file.
