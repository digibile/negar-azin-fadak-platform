begin;

-- Extend the existing treasury payment register; do not create a parallel payment ledger.
create unique index if not exists accounting_receivable_payables_tenant_id_uq
  on accounting_receivable_payables(tenant_id,id);
create unique index if not exists accounting_documents_tenant_id_uq
  on accounting_documents(tenant_id,id);
create unique index if not exists treasury_bank_accounts_tenant_id_uq
  on treasury_bank_accounts(tenant_id,id);
create unique index if not exists treasury_cashboxes_tenant_id_uq
  on treasury_cashboxes(tenant_id,id);
create unique index if not exists treasury_payments_tenant_id_uq
  on treasury_payments(tenant_id,id);
create unique index if not exists ledger_accounts_tenant_id_uq
  on ledger_accounts(tenant_id,id);

alter table treasury_bank_accounts
  add column if not exists ledger_account_id uuid;
alter table treasury_cashboxes
  add column if not exists ledger_account_id uuid;

alter table treasury_bank_accounts
  add constraint treasury_bank_accounts_ledger_tenant_fk
  foreign key(tenant_id,ledger_account_id) references ledger_accounts(tenant_id,id) on delete restrict;
alter table treasury_cashboxes
  add constraint treasury_cashboxes_ledger_tenant_fk
  foreign key(tenant_id,ledger_account_id) references ledger_accounts(tenant_id,id) on delete restrict;

alter table treasury_payments
  alter column bank_account_id drop not null,
  add column if not exists cashbox_id uuid,
  add column if not exists carrier_invoice_id uuid,
  add column if not exists payable_id uuid,
  add column if not exists accounting_document_id uuid;

alter table treasury_payments
  add constraint treasury_payment_one_treasury_check
  check ((bank_account_id is not null)::int + (cashbox_id is not null)::int = 1);

alter table treasury_payments
  add constraint treasury_payment_cashbox_tenant_fk
  foreign key(tenant_id,cashbox_id) references treasury_cashboxes(tenant_id,id) on delete restrict,
  add constraint treasury_payment_invoice_tenant_fk
  foreign key(tenant_id,carrier_invoice_id) references logistics_carrier_invoices(tenant_id,id) on delete restrict,
  add constraint treasury_payment_payable_tenant_fk
  foreign key(tenant_id,payable_id) references accounting_receivable_payables(tenant_id,id) on delete restrict,
  add constraint treasury_payment_document_tenant_fk
  foreign key(tenant_id,accounting_document_id) references accounting_documents(tenant_id,id) on delete restrict;

create index if not exists treasury_carrier_payments_invoice_idx
  on treasury_payments(tenant_id,carrier_invoice_id,payment_date desc)
  where carrier_invoice_id is not null;
create index if not exists treasury_carrier_payments_payable_idx
  on treasury_payments(tenant_id,payable_id,status)
  where payable_id is not null;
create unique index if not exists accounting_documents_carrier_payment_source_uq
  on accounting_documents(tenant_id,source_module,source_document_id)
  where source_module='logistics-carrier-payment' and source_document_id is not null;

commit;
