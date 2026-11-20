alter table marketplace_orders
  add column if not exists shipping_address jsonb;

comment on column marketplace_orders.shipping_address is 'Customer delivery address snapshot captured during checkout; editable only before order processing.';
