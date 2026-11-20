-- 131: persist redirectable marketplace payment attempts
alter table marketplace_payments
 add column if not exists redirect_url text,
 add column if not exists failure_reason text;

create index if not exists idx_marketplace_payments_pending
 on marketplace_payments(tenant_id,status,created_at)
 where status in ('pending','authorized');
