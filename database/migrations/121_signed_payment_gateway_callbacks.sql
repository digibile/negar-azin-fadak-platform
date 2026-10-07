-- 121: signed payment gateway callbacks and replay protection
create table if not exists payment_gateway_callback_events(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 gateway_profile_id uuid not null references payment_gateway_profiles(id) on delete cascade,
 event_id text not null,
 attempt_id uuid references payment_gateway_attempts(id) on delete set null,
 event_type text not null,
 signature_algorithm text not null default 'HMAC-SHA256',
 received_at timestamptz not null default now(),
 processed_at timestamptz,
 payload_hash text not null,
 metadata jsonb not null default '{}'::jsonb,
 unique(gateway_profile_id,event_id)
);
create index if not exists idx_gateway_callback_events_attempt on payment_gateway_callback_events(tenant_id,attempt_id,received_at);
