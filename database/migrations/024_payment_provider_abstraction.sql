alter table marketplace_payments
 add column if not exists provider_code text not null default 'manual',
 add column if not exists idempotency_key text,
 add column if not exists provider_transaction_id text,
 add column if not exists provider_payload jsonb;

create unique index if not exists uq_marketplace_payment_idempotency
 on marketplace_payments(tenant_id,idempotency_key)
 where idempotency_key is not null;

create unique index if not exists uq_marketplace_payment_provider_tx
 on marketplace_payments(tenant_id,provider_code,provider_transaction_id)
 where provider_transaction_id is not null;

insert into role_permissions(role,permission) values
('admin','payment:refund'),('manager','payment:refund')
on conflict do nothing;