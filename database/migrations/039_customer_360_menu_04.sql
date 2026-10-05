-- Menu 04: Customer 360 real domain.
create table if not exists crm_customers(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 customer_no text not null,
 customer_type text not null default 'individual',
 full_name text not null,
 national_id text,
 mobile text,
 email text,
 birth_date date,
 status text not null default 'active',
 notes text not null default '',
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,customer_no),
 unique(tenant_id,national_id)
);
create index if not exists crm_customers_tenant_status_idx on crm_customers(tenant_id,status);
create index if not exists crm_customers_tenant_name_idx on crm_customers(tenant_id,full_name);
create table if not exists crm_customer_identities(
 id bigserial primary key,
 customer_id uuid not null references crm_customers(id) on delete cascade,
 document_type text not null,
 document_number text,
 first_name text,
 last_name text,
 father_name text,
 gender text,
 birth_place text,
 address text,
 postal_code text,
 metadata jsonb not null default '{}'::jsonb,
 verified_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists crm_customer_identities_customer_idx on crm_customer_identities(customer_id);
create table if not exists crm_customer_interactions(
 id bigserial primary key,
 tenant_id uuid not null references tenants(id) on delete cascade,
 customer_id uuid not null references crm_customers(id) on delete cascade,
 channel text not null,
 subject text not null,
 body text not null default '',
 occurred_at timestamptz not null default now(),
 actor_user_id uuid references users(id) on delete set null,
 metadata jsonb not null default '{}'::jsonb
);
create index if not exists crm_customer_interactions_customer_idx on crm_customer_interactions(customer_id,occurred_at desc);
create table if not exists crm_customer_purchases(
 id bigserial primary key,
 tenant_id uuid not null references tenants(id) on delete cascade,
 customer_id uuid not null references crm_customers(id) on delete cascade,
 external_ref text,
 description text not null,
 amount numeric(20,2) not null default 0,
 status text not null default 'completed',
 purchased_at timestamptz not null default now(),
 metadata jsonb not null default '{}'::jsonb
);
create index if not exists crm_customer_purchases_customer_idx on crm_customer_purchases(customer_id,purchased_at desc);
create table if not exists crm_customer_financial_snapshots(
 id bigserial primary key,
 tenant_id uuid not null references tenants(id) on delete cascade,
 customer_id uuid not null references crm_customers(id) on delete cascade,
 receivable numeric(20,2) not null default 0,
 payable numeric(20,2) not null default 0,
 credit_limit numeric(20,2) not null default 0,
 credit_used numeric(20,2) not null default 0,
 snapshot_at timestamptz not null default now()
);
create index if not exists crm_customer_financial_customer_idx on crm_customer_financial_snapshots(customer_id,snapshot_at desc);
create table if not exists crm_customer_audit(
 id bigserial primary key,
 tenant_id uuid not null references tenants(id) on delete cascade,
 customer_id uuid references crm_customers(id) on delete set null,
 action text not null,
 actor_user_id uuid references users(id) on delete set null,
 before_data jsonb,
 after_data jsonb,
 created_at timestamptz not null default now()
);
create index if not exists crm_customer_audit_customer_idx on crm_customer_audit(customer_id,created_at desc);
insert into identity_permissions(permission_key,title,module_key,action) values
('customer-360.read','مشاهده پرونده مشتری','04-customer-360','read'),
('customer-360.write','مدیریت پرونده مشتری','04-customer-360','write')
on conflict(permission_key) do nothing;
insert into identity_role_permissions(role_key,permission_key)
select r.role,'customer-360.read' from (values('admin'),('manager'),('viewer')) r(role) on conflict do nothing;
insert into identity_role_permissions(role_key,permission_key)
select r.role,'customer-360.write' from (values('admin'),('manager')) r(role) on conflict do nothing;
