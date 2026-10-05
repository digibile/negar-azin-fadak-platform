-- Menu 10: wallet and ledger domain.
create table if not exists wallet_accounts(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 owner_user_id uuid references users(id) on delete set null,
 code text not null,
 title text not null,
 currency text not null default 'IRR',
 opening_balance numeric(20,2) not null default 0,
 current_balance numeric(20,2) not null default 0,
 status text not null default 'active' check(status in ('active','blocked','closed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);
create index if not exists wallet_accounts_lookup on wallet_accounts(tenant_id,status,owner_user_id);

create table if not exists wallet_ledger_entries(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 wallet_id uuid not null references wallet_accounts(id) on delete restrict,
 entry_no text not null,
 entry_date timestamptz not null default now(),
 direction text not null check(direction in ('credit','debit')),
 amount numeric(20,2) not null check(amount>0),
 balance_after numeric(20,2) not null,
 reference_type text,
 reference_id text,
 external_reference text,
 description text not null default '',
 idempotency_key text not null,
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(tenant_id,entry_no),
 unique(tenant_id,idempotency_key)
);
create index if not exists wallet_ledger_wallet_date_idx on wallet_ledger_entries(tenant_id,wallet_id,entry_date desc);
create index if not exists wallet_ledger_direction_idx on wallet_ledger_entries(tenant_id,direction,entry_date desc);
create index if not exists wallet_ledger_reference_idx on wallet_ledger_entries(tenant_id,reference_type,reference_id);

create table if not exists wallet_audit(
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
create index if not exists wallet_audit_lookup on wallet_audit(tenant_id,created_at desc);

insert into identity_permissions(permission_key,title,module_key,action) values
('wallet-ledger.read','مشاهده کیف پول و دفترکل','10-wallet-ledger','read'),
('wallet-ledger.write','مدیریت کیف پول و دفترکل','10-wallet-ledger','write')
on conflict(permission_key) do nothing;

insert into identity_role_permissions(role_key,permission_key)
select x.role,'wallet-ledger.read' from (values('admin'),('manager'),('viewer')) x(role) on conflict do nothing;
insert into identity_role_permissions(role_key,permission_key)
select x.role,'wallet-ledger.write' from (values('admin'),('manager')) x(role) on conflict do nothing;

create unique index if not exists wallet_ledger_entry_no_unique on wallet_ledger_entries(tenant_id,entry_no);
