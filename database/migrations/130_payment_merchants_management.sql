begin;

create table if not exists payment_merchants(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null,
  legal_name text not null,
  display_name text not null,
  business_type text not null default 'company' check(business_type in ('individual','company','organization')),
  national_id text,
  tax_id text,
  iban text,
  settlement_account_ref text,
  contract_ref text,
  commission_rate numeric(8,4) not null default 0 check(commission_rate>=0 and commission_rate<=100),
  status text not null default 'pending' check(status in ('pending','review','active','suspended','rejected','closed')),
  verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected')),
  verified_at timestamptz,
  verified_by uuid references users(id) on delete set null,
  verification_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,code)
);

create index if not exists idx_payment_merchants_tenant_status
  on payment_merchants(tenant_id,status,created_at desc);
create index if not exists idx_payment_merchants_tenant_verification
  on payment_merchants(tenant_id,verification_status,status);

insert into role_permissions(role,permission) values
('admin','merchant:view'),('admin','merchant:manage'),('admin','merchant:verify'),
('manager','merchant:view'),('manager','merchant:manage'),('manager','merchant:verify'),
('viewer','merchant:view')
on conflict do nothing;

commit;