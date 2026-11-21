-- 166: idempotent statement imports and bank-fee review metadata.
begin;

create table if not exists treasury_bank_statement_imports(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 bank_account_id uuid not null references treasury_bank_accounts(id) on delete restrict,
 file_name text not null,
 statement_date_from date,
 statement_date_to date,
 row_count integer not null default 0,
 imported_count integer not null default 0,
 duplicate_count integer not null default 0,
 rejected_count integer not null default 0,
 status text not null default 'imported' check(status in ('imported','reviewed','cancelled')),
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now()
);

alter table treasury_bank_transactions
 add column if not exists import_batch_id uuid references treasury_bank_statement_imports(id) on delete set null,
 add column if not exists import_fingerprint text,
 add column if not exists fee_candidate boolean not null default false,
 add column if not exists fee_candidate_reason text,
 add column if not exists fee_journal_document_id uuid references accounting_documents(id) on delete set null;

create unique index if not exists uq_treasury_bank_transaction_import_fingerprint
 on treasury_bank_transactions(tenant_id,bank_account_id,import_fingerprint)
 where import_fingerprint is not null;

create index if not exists ix_treasury_bank_transaction_fee_review
 on treasury_bank_transactions(tenant_id,bank_account_id,fee_candidate,fee_journal_document_id)
 where fee_candidate=true;

create index if not exists ix_treasury_bank_statement_imports_account
 on treasury_bank_statement_imports(tenant_id,bank_account_id,created_at desc);

commit;
