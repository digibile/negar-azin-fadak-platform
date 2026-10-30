begin;

-- VamCity capability carried into the canonical CRM/marketing domain.
-- This is a marketer/referral directory only. Commission accrual and payout remain
-- owned by the central sales and ledger workflows; this table never posts money.
create table if not exists crm_marketers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  phone text not null,
  referral_code text not null,
  commission_rate numeric(8,4) not null default 0
    check (commission_rate >= 0 and commission_rate <= 100),
  status text not null default 'active'
    check (status in ('active','inactive')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, phone),
  unique (tenant_id, referral_code),
  unique (tenant_id, id)
);

create index if not exists crm_marketers_tenant_status_idx
  on crm_marketers(tenant_id,status,created_at desc);

create table if not exists crm_marketer_audit (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  marketer_id uuid,
  action text not null,
  actor_user_id uuid references users(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now(),
  foreign key (tenant_id,marketer_id)
    references crm_marketers(tenant_id,id) on delete set null
);

create index if not exists crm_marketer_audit_tenant_created_idx
  on crm_marketer_audit(tenant_id,created_at desc);

insert into role_permissions(role,permission) values
 ('admin','marketing:read'),
 ('admin','marketing:manage'),
 ('manager','marketing:read'),
 ('manager','marketing:manage'),
 ('viewer','marketing:read')
on conflict do nothing;

commit;
