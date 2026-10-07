-- 119: branded payment gateways and merchant verification
create table if not exists payment_gateway_profiles(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null, title text not null, brand_code text not null, brand_title text not null,
 gateway_type text not null check(gateway_type in ('shaparak','international','proprietary')),
 provider_code text, currency_scope jsonb not null default '[]'::jsonb,
 enabled boolean not null default false, public_enabled boolean not null default true,
 internal_only boolean not null default false, verification_required boolean not null default true,
 merchant_review_timeout_seconds int not null default 900 check(merchant_review_timeout_seconds between 60 and 86400),
 auto_reverse_on_timeout boolean not null default true, config_reference text,
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(tenant_id,code)
);
create table if not exists payment_gateway_attempts(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
 payment_intent_id uuid not null references commerce_payment_intents(id) on delete cascade,
 gateway_profile_id uuid not null references payment_gateway_profiles(id) on delete restrict,
 attempt_no text not null, provider_code text, provider_transaction_id text,
 status text not null default 'created' check(status in ('created','redirected','paid_pending_review','verified','reversal_pending','reversed','reversal_failed','failed','expired')),
 amount numeric(20,2) not null check(amount>0), currency text not null default 'IRR',
 provider_payload jsonb not null default '{}'::jsonb, paid_at timestamptz, review_deadline_at timestamptz,
 verified_at timestamptz, reversal_requested_at timestamptz, reversed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,attempt_no)
);
create table if not exists payment_merchant_reviews(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
 payment_intent_id uuid not null references commerce_payment_intents(id) on delete cascade,
 gateway_attempt_id uuid not null references payment_gateway_attempts(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected','expired','reversal_pending','reversed','reversal_failed')),
 review_deadline_at timestamptz not null, decision_reason text, availability_confirmed boolean,
 decided_by uuid references users(id) on delete set null, decided_at timestamptz, reversal_reason text,
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(gateway_attempt_id)
);
alter table commerce_payment_intents drop constraint if exists commerce_payment_intents_status_check;
alter table commerce_payment_intents add constraint commerce_payment_intents_status_check
 check(status in ('created','authorized','pending','paid_pending_review','paid','failed','expired','cancelled','refunded','reversal_pending','reversed','reversal_failed'));
create index if not exists idx_gateway_profiles_public on payment_gateway_profiles(tenant_id,enabled,public_enabled,gateway_type);
create index if not exists idx_gateway_attempts_review_deadline on payment_gateway_attempts(tenant_id,status,review_deadline_at);
create index if not exists idx_payment_reviews_due on payment_merchant_reviews(tenant_id,status,review_deadline_at);
insert into role_permissions(role,permission) values
('admin','payment-gateway:read'),('admin','payment-gateway:manage'),('admin','payment-review:read'),('admin','payment-review:manage'),
('manager','payment-gateway:read'),('manager','payment-gateway:manage'),('manager','payment-review:read'),('manager','payment-review:manage'),
('viewer','payment-gateway:read'),('viewer','payment-review:read') on conflict do nothing;
