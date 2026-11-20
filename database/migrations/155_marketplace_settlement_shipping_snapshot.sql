alter table seller_settlement_items
  add column if not exists shipping_amount numeric(20,2) not null default 0
  check (shipping_amount >= 0);

update seller_settlement_items si
set shipping_amount = greatest(0, coalesce(o.shipping_amount, 0))
from marketplace_orders o
where o.id = si.order_id
  and o.tenant_id = si.tenant_id
  and si.shipping_amount = 0
  and coalesce(o.shipping_amount, 0) > 0;

create index if not exists idx_settlement_items_shipping
  on seller_settlement_items(tenant_id, settlement_id, shipping_amount);

