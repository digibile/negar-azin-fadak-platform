-- Menu 09: treasury and banking operational domain.
create table if not exists treasury_bank_accounts(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 bank_name text not null,
 account_title text not null,
 account_number text not null,
 iban text,
 currency text not null default 'IRR',
 account_type text not null default 'current' check(account_type in ('current','savings','deposit','card')),
 branch_name text,
 opening_balance numeric(20,2) not null default 0,
 current_balance numeric(20,2) not null default 0,
 status text not null default 'active' check(status in ('active','blocked','closed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,account_number)
);
create index if not exists treasury_bank_accounts_lookup on treasury_bank_accounts(tenant_id,status,bank_name);

create table if not exists treasury_receipts(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 bank_account_id uuid not null references treasury_bank_accounts(id) on delete restrict,
 receipt_no text not null,
 receipt_date date not null,
 amount numeric(20,2) not null check(amount>0),
 payer_name text not null default '',
 reference_no text,
 method text not null default 'bank_transfer' check(method in ('cash','bank_transfer','card','cheque')),
 description text not null default '',
 status text not null default 'pending' check(status in ('pending','confirmed','cancelled')),
 created_by uuid references users(id) on delete set null,
 confirmed_by uuid references users(id) on delete set null,
 confirmed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,receipt_no)
);
create index if not exists treasury_receipts_lookup on treasury_receipts(tenant_id,receipt_date desc,status);

create table if not exists treasury_payments(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 bank_account_id uuid not null references treasury_bank_accounts(id) on delete restrict,
 payment_no text not null,
 payment_date date not null,
 amount numeric(20,2) not null check(amount>0),
 payee_name text not null default '',
 reference_no text,
 method text not null default 'bank_transfer' check(method in ('cash','bank_transfer','card','cheque')),
 description text not null default '',
 status text not null default 'pending' check(status in ('pending','approved','paid','cancelled')),
 created_by uuid references users(id) on delete set null,
 approved_by uuid references users(id) on delete set null,
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,payment_no)
);
create index if not exists treasury_payments_lookup on treasury_payments(tenant_id,payment_date desc,status);

create table if not exists treasury_bank_transactions(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 bank_account_id uuid not null references treasury_bank_accounts(id) on delete restrict,
 transaction_date date not null,
 value_date date,
 reference_no text,
 description text not null default '',
 amount numeric(20,2) not null,
 direction text not null check(direction in ('credit','debit')),
 statement_balance numeric(20,2),
 matched_receipt_id uuid references treasury_receipts(id) on delete set null,
 matched_payment_id uuid references treasury_payments(id) on delete set null,
 reconciliation_status text not null default 'unmatched' check(reconciliation_status in ('unmatched','matched','ignored')),
 created_at timestamptz not null default now()
);
create index if not exists treasury_transactions_reconcile_idx on treasury_bank_transactions(tenant_id,bank_account_id,transaction_date,reconciliation_status);

create table if not exists treasury_cashboxes(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null,
 title text not null,
 custodian_user_id uuid references users(id) on delete set null,
 opening_balance numeric(20,2) not null default 0,
 current_balance numeric(20,2) not null default 0,
 max_balance numeric(20,2),
 status text not null default 'active' check(status in ('active','suspended','closed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);
create table if not exists treasury_cash_movements(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 cashbox_id uuid not null references treasury_cashboxes(id) on delete restrict,
 movement_no text not null,
 movement_date date not null,
 amount numeric(20,2) not null check(amount>0),
 direction text not null check(direction in ('in','out')),
 description text not null default '',
 reference_no text,
 status text not null default 'posted' check(status in ('draft','posted','void')),
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(tenant_id,movement_no)
);

create table if not exists treasury_audit(
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
create index if not exists treasury_audit_lookup on treasury_audit(tenant_id,created_at desc);

insert into identity_permissions(permission_key,title,module_key,action) values
('treasury-bank.read','مشاهده خزانه و بانک','09-treasury-bank','read'),
('treasury-bank.write','مدیریت خزانه و بانک','09-treasury-bank','write')
on conflict(permission_key) do nothing;
insert into identity_role_permissions(role_key,permission_key)
select x.role,'treasury-bank.read' from (values('admin'),('manager'),('viewer')) x(role) on conflict do nothing;
insert into identity_role_permissions(role_key,permission_key)
select x.role,'treasury-bank.write' from (values('admin'),('manager')) x(role) on conflict do nothing;
