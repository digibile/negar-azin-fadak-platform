-- 112: provider-backed verification and insurance foundations
create table if not exists platform_verification_requests(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  subject_type text not null,
  subject_id text not null,
  verification_type text not null,
  provider_code text not null,
  correlation_id text not null,
  status text not null default 'queued' check(status in ('queued','processing','completed','failed','timeout','needs_review')),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  score numeric(12,4),
  decision text,
  error_code text,
  error_message text,
  attempts int not null default 0,
  requested_by uuid references users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,correlation_id)
);

create table if not exists platform_insurance_policies(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  subject_type text not null,
  subject_id text not null,
  provider_code text,
  policy_no text,
  coverage_code text,
  status text not null default 'quote' check(status in ('quote','requested','active','expired','cancelled','claim')),
  insured_amount numeric(20,2),
  premium_amount numeric(20,2),
  currency text not null default 'IRR',
  starts_at timestamptz,
  ends_at timestamptz,
  policy_payload jsonb not null default '{}'::jsonb,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_verification_requests_subject on platform_verification_requests(tenant_id,subject_type,subject_id,created_at desc);
create index if not exists idx_verification_requests_status on platform_verification_requests(tenant_id,status,created_at);
create index if not exists idx_insurance_subject on platform_insurance_policies(tenant_id,subject_type,subject_id,status);
