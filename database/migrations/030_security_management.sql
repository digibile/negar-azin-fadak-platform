create table if not exists security_sessions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
 tenant_id uuid references tenants(id) on delete cascade, ip_address inet, user_agent text, started_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(), expires_at timestamptz, revoked_at timestamptz
);
create table if not exists security_login_events(
 id bigserial primary key, user_id uuid references users(id) on delete set null, tenant_id uuid references tenants(id) on delete cascade,
 email text, ip_address inet, user_agent text, success boolean not null, failure_reason text, occurred_at timestamptz not null default now()
);
create table if not exists security_policies(
 id uuid primary key default gen_random_uuid(), tenant_id uuid references tenants(id) on delete cascade,
 policy_key text not null, title text not null, enabled boolean not null default true, config jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(), unique(tenant_id,policy_key)
);
create index if not exists idx_security_sessions_tenant on security_sessions(tenant_id,last_seen_at);
create index if not exists idx_security_login_events_tenant on security_login_events(tenant_id,occurred_at desc);