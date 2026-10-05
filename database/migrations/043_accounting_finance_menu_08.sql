-- Menu 08: accounting and finance operational domain.
create table if not exists accounting_fiscal_periods(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 book_id uuid not null references accounting_books(id) on delete restrict,
 code text not null,
 title text not null,
 starts_on date not null,
 ends_on date not null,
 status text not null default 'open' check(status in ('open','closed','locked')),
 closed_at timestamptz,
 closed_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,book_id,code),
 check(ends_on>=starts_on)
);
create index if not exists accounting_fiscal_periods_lookup on accounting_fiscal_periods(tenant_id,book_id,status,starts_on);

create table if not exists accounting_documents(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 book_id uuid not null references accounting_books(id) on delete restrict,
 period_id uuid references accounting_fiscal_periods(id) on delete restrict,
 document_no text not null,
 document_date date not null,
 document_type text not null default 'journal',
 description text not null default '',
 status text not null default 'draft' check(status in ('draft','submitted','approved','posted','void')),
 source_type text not null default 'manual',
 source_id text,
 created_by uuid references users(id) on delete set null,
 approved_by uuid references users(id) on delete set null,
 posted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,book_id,document_no)
);
create index if not exists accounting_documents_period_idx on accounting_documents(tenant_id,period_id,status,document_date desc);

create table if not exists accounting_document_lines(
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references accounting_documents(id) on delete cascade,
 line_no integer not null,
 account_id uuid not null references ledger_accounts(id) on delete restrict,
 cost_center_id uuid,
 description text not null default '',
 debit numeric(20,2) not null default 0 check(debit>=0),
 credit numeric(20,2) not null default 0 check(credit>=0),
 dimensions jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 unique(document_id,line_no),
 check((debit>0 and credit=0) or (credit>0 and debit=0))
);
create index if not exists accounting_document_lines_account_idx on accounting_document_lines(account_id);

create table if not exists accounting_cost_centers(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null,
 title text not null,
 parent_id uuid references accounting_cost_centers(id) on delete restrict,
 center_type text not null default 'cost' check(center_type in ('cost','revenue','profit')),
 manager_user_id uuid references users(id) on delete set null,
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);

alter table accounting_document_lines add constraint accounting_document_lines_cost_center_fk
 foreign key(cost_center_id) references accounting_cost_centers(id) on delete set null;

create table if not exists accounting_finance_audit(
 id bigserial primary key,
 tenant_id uuid not null references tenants(id) on delete cascade,
 entity_type text not null,
 entity_id text,
 action text not null,
 actor_user_id uuid references users(id) on delete set null,
 before_data jsonb,
 after_data jsonb,
 created_at timestamptz not null default now()
);
create index if not exists accounting_finance_audit_lookup on accounting_finance_audit(tenant_id,created_at desc);

insert into identity_permissions(permission_key,title,module_key,action) values
('accounting-finance.read','مشاهده حسابداری و مالی','08-accounting-finance','read'),
('accounting-finance.write','مدیریت حسابداری و مالی','08-accounting-finance','write')
on conflict(permission_key) do nothing;
insert into identity_role_permissions(role_key,permission_key)
select x.role,'accounting-finance.read' from (values('admin'),('manager'),('viewer')) x(role) on conflict do nothing;
insert into identity_role_permissions(role_key,permission_key)
select x.role,'accounting-finance.write' from (values('admin'),('manager')) x(role) on conflict do nothing;
