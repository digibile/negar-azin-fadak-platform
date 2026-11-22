begin;

alter table logistics_carrier_invoices
  add column if not exists verified_by uuid references users(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists accounting_document_id uuid;

create unique index if not exists accounting_documents_tenant_id_uq
  on accounting_documents(tenant_id,id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='logistics_carrier_invoice_accounting_document_fk'
      and conrelid='logistics_carrier_invoices'::regclass
  ) then
    alter table logistics_carrier_invoices
      add constraint logistics_carrier_invoice_accounting_document_fk
      foreign key(tenant_id,accounting_document_id)
      references accounting_documents(tenant_id,id) on delete restrict;
  end if;
end $$;

create unique index if not exists accounting_documents_carrier_invoice_source_uq
  on accounting_documents(tenant_id,source_module,source_document_id)
  where source_module='logistics-carrier-invoice' and source_document_id is not null;


-- A carrier invoice can create at most one payable, even under concurrent posting attempts.
create unique index if not exists accounting_carrier_invoice_payable_source_uq
  on accounting_receivable_payables(tenant_id,(metadata->>'carrierInvoiceId'))
  where direction='payable' and metadata ? 'carrierInvoiceId';

commit;
