create table if not exists lendtech_applications (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 application_no text not null,
 customer_ref text not null,
 product_code text not null,
 requested_amount numeric(20,2) not null check (requested_amount > 0),
 term_months integer not null check (term_months between 1 and 120),
 purpose text,
 status text not null default 'submitted',
 kyc_status text not null default 'pending',
 kyc_provider_ref text,
 eligibility_status text not null default 'pending',
 eligibility_reason text,
 monthly_income numeric(20,2),
 monthly_obligations numeric(20,2),
 dti_percent numeric(8,3),
 created_by text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_ref,application_no)
);

create table if not exists lendtech_scores (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 application_id uuid not null references lendtech_applications(id) on delete cascade,
 score numeric(8,2) not null check (score between 0 and 1000),
 band text not null,
 inputs jsonb not null default '{}'::jsonb,
 model_version text not null default 'rules-v1',
 created_by text,
 created_at timestamptz not null default now()
);

create table if not exists lendtech_decisions (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 application_id uuid not null references lendtech_applications(id) on delete cascade,
 decision text not null,
 approved_amount numeric(20,2),
 approved_term_months integer,
 interest_rate numeric(8,4),
 reason text,
 decided_by text,
 decided_at timestamptz not null default now()
);

create table if not exists lendtech_facilities (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 application_id uuid not null references lendtech_applications(id),
 facility_no text not null,
 approved_amount numeric(20,2) not null,
 available_amount numeric(20,2) not null,
 status text not null default 'approved',
 currency text not null default 'IRR',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_ref,facility_no)
);

create table if not exists lendtech_contracts (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 facility_id uuid not null references lendtech_facilities(id),
 contract_no text not null,
 principal numeric(20,2) not null,
 interest_rate numeric(8,4) not null,
 term_months integer not null,
 status text not null default 'signed',
 signed_at timestamptz,
 disbursed_at timestamptz,
 closed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_ref,contract_no)
);

create table if not exists lendtech_installments (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 contract_id uuid not null references lendtech_contracts(id) on delete cascade,
 installment_no integer not null,
 due_date date not null,
 principal_due numeric(20,2) not null default 0,
 interest_due numeric(20,2) not null default 0,
 total_due numeric(20,2) not null default 0,
 principal_paid numeric(20,2) not null default 0,
 interest_paid numeric(20,2) not null default 0,
 status text not null default 'scheduled',
 paid_at timestamptz,
 unique(contract_id,installment_no)
);

create table if not exists lendtech_repayments (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 contract_id uuid not null references lendtech_contracts(id),
 payment_ref text not null,
 amount numeric(20,2) not null check (amount > 0),
 paid_at timestamptz not null default now(),
 method text,
 allocation jsonb not null default '{}'::jsonb,
 created_by text,
 unique(tenant_ref,payment_ref)
);

create table if not exists lendtech_delinquencies (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 contract_id uuid not null references lendtech_contracts(id),
 installment_id uuid references lendtech_installments(id),
 days_overdue integer not null default 0,
 amount_due numeric(20,2) not null default 0,
 status text not null default 'open',
 opened_at timestamptz not null default now(),
 resolved_at timestamptz
);

create table if not exists lendtech_restructures (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 contract_id uuid not null references lendtech_contracts(id),
 old_term_months integer not null,
 new_term_months integer not null,
 reason text not null,
 status text not null default 'approved',
 created_by text,
 created_at timestamptz not null default now()
);

alter table if exists marketplace_orders add column if not exists credit_facility_ref uuid;

create table if not exists lendtech_events (
 id bigserial primary key,
 tenant_ref text not null,
 application_id uuid references lendtech_applications(id) on delete set null,
 contract_id uuid references lendtech_contracts(id) on delete set null,
 event_type text not null,
 actor_ref text,
 payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create index if not exists idx_lendtech_app_tenant_status on lendtech_applications(tenant_ref,status,created_at desc);
create index if not exists idx_lendtech_score_application on lendtech_scores(application_id,created_at desc);
create index if not exists idx_lendtech_facility_tenant_status on lendtech_facilities(tenant_ref,status);
create index if not exists idx_lendtech_contract_tenant_status on lendtech_contracts(tenant_ref,status);
create index if not exists idx_lendtech_installment_due on lendtech_installments(tenant_ref,due_date,status);
create unique index if not exists uq_lendtech_open_delinquency on lendtech_delinquencies(contract_id,installment_id) where status='open';
create index if not exists idx_lendtech_delinquency_open on lendtech_delinquencies(tenant_ref,status,days_overdue desc);

insert into platform_modules(code,title,is_active)
values
 ('35-lendtech','تأمین مالی و اعتبارات',true),
 ('36-loans','تسهیلات و وام‌دهی',true),
 ('37-credit-collateral','وثایق و تضمین‌ها',true),
 ('38-collections','وصول مطالبات',true)
on conflict(code) do update set title=excluded.title,is_active=true;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.a,v.t,v.p
from platform_modules m
cross join (values
 ('read','مشاهده','modules:lendtech:read'),
 ('write','ثبت و ویرایش','modules:lendtech:write'),
 ('score','ارزیابی اعتباری','modules:lendtech:score'),
 ('decide','تصمیم اعتباری','modules:lendtech:decide'),
 ('committee','تأیید کمیته','modules:lendtech:committee'),
 ('disburse','پرداخت تسهیلات','modules:lendtech:disburse'),
 ('repay','ثبت بازپرداخت','modules:lendtech:repay'),
 ('collect','مدیریت وصول','modules:lendtech:collect')
) v(a,t,p)
where m.code='35-lendtech'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

insert into role_permissions(role,permission)
select distinct rp.role,v.p
from role_permissions rp
cross join (values
 ('modules:lendtech:read'),
 ('modules:lendtech:write'),
 ('modules:lendtech:score'),
 ('modules:lendtech:decide'),
 ('modules:lendtech:committee'),
 ('modules:lendtech:disburse'),
 ('modules:lendtech:repay'),
 ('modules:lendtech:collect')
) v(p)
where rp.role='admin'
on conflict do nothing;

