-- Expire unpaid marketplace stock reservations through the existing notification worker.
alter table marketplace_orders
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists reservation_released_at timestamptz;

update marketplace_orders set reservation_expires_at=created_at+interval '30 minutes' where status in ('pending','confirmed') and reservation_expires_at is null;\n\ncreate index if not exists idx_marketplace_orders_reservation_expiry
  on marketplace_orders(reservation_expires_at,id)
  where status in ('pending','confirmed') and reservation_expires_at is not null;
