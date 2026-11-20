-- 157: persist the selected delivery method as an order snapshot
alter table marketplace_orders
  add column if not exists delivery_method_id uuid
    references commerce_delivery_methods(id) on delete set null,
  add column if not exists delivery_method_snapshot jsonb;

create index if not exists idx_marketplace_orders_delivery_method
  on marketplace_orders(tenant_id, delivery_method_id, created_at desc);
