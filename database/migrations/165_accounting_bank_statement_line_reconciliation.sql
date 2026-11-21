-- 165: line-level bank statement reconciliation against posted accounting documents.
begin;

create table if not exists accounting_bank_reconciliation_matches(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 reconciliation_id uuid not null references accounting_bank_reconciliations(id) on delete cascade,
 treasury_transaction_id uuid not null references treasury_bank_transactions(id) on delete restrict,
 accounting_document_line_id uuid not null references accounting_document_lines(id) on delete restrict,
 matched_amount numeric(20,2) not null check(matched_amount>0),
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(tenant_id,treasury_transaction_id),
 unique(tenant_id,accounting_document_line_id)
);

create index if not exists ix_bank_reconciliation_matches_batch
 on accounting_bank_reconciliation_matches(tenant_id,reconciliation_id);

alter table accounting_bank_reconciliations
 add column if not exists treasury_bank_account_id uuid references treasury_bank_accounts(id) on delete restrict;

create index if not exists ix_bank_reconciliations_treasury_account
 on accounting_bank_reconciliations(tenant_id,treasury_bank_account_id,statement_date desc);

commit;
