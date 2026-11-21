-- 161: auditable partial/full settlement records for existing accounting payables.
begin;
create table if not exists accounting_rp_settlements(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 receivable_payable_id uuid not null references accounting_receivable_payables(id) on delete restrict,
 bank_account_id uuid not null references accounting_bank_accounts(id) on delete restrict,
 amount numeric(20,2) not null check(amount>0),
 currency text not null default 'IRR',
 payment_date date not null,
 reference_no text not null,
 idempotency_key text not null,
 ledger_entry_id uuid references ledger_entries(id) on delete restrict,
 metadata jsonb not null default '{}'::jsonb,
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(tenant_id,idempotency_key),
 unique(tenant_id,reference_no)
);
create index if not exists accounting_rp_settlements_lookup
 on accounting_rp_settlements(tenant_id,receivable_payable_id,payment_date desc);
commit;
