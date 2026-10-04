create table if not exists marketplace_refunds(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 order_id uuid not null references marketplace_orders(id) on delete restrict,
 payment_id uuid not null references marketplace_payments(id) on delete restrict,
 refund_no text not null,
 amount numeric(20,2) not null check(amount>0),
 reason text,
 status text not null default 'pending' check(status in ('pending','refunded','failed')),
 provider_code text not null,
 provider_transaction_id text,
 provider_refund_transaction_id text,
 provider_payload jsonb not null default '{}'::jsonb,
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,refund_no)
);
create unique index if not exists uq_marketplace_refund_payment
 on marketplace_refunds(tenant_id,payment_id) where status='refunded';
create index if not exists idx_marketplace_refunds_order
 on marketplace_refunds(tenant_id,order_id,created_at desc);
