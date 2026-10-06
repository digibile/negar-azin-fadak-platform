create table if not exists lendtech_collaterals (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 facility_id uuid not null references lendtech_facilities(id),
 collateral_no text not null,
 collateral_type text not null,
 owner_ref text,
 description text,
 declared_value numeric(20,2) not null default 0,
 verified_value numeric(20,2),
 status text not null default 'proposed',
 reference_data jsonb not null default '{}'::jsonb,
 created_by text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_ref,collateral_no)
);
create table if not exists lendtech_collection_cases (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 contract_id uuid not null references lendtech_contracts(id),
 delinquency_id uuid references lendtech_delinquencies(id),
 case_no text not null,
 stage text not null default 'early',
 status text not null default 'open',
 assigned_to text,
 next_action_at timestamptz,
 promise_amount numeric(20,2),
 promise_due_date date,
 notes text,
 created_by text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_ref,case_no)
);
create index if not exists idx_lendtech_collateral_facility on lendtech_collaterals(tenant_ref,facility_id,status);
create index if not exists idx_lendtech_collection_contract on lendtech_collection_cases(tenant_ref,contract_id,status);
