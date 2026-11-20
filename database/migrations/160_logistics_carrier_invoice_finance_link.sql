-- 160: link approved carrier invoices to the existing supplier subledger and ledger.
begin;
alter table logistics_carrier_invoices
 add column if not exists party_id uuid references accounting_parties(id) on delete restrict,
 add column if not exists payable_id uuid references accounting_receivable_payables(id) on delete restrict,
 add column if not exists ledger_adjustment_entry_id uuid references ledger_entries(id) on delete set null;
create unique index if not exists uq_logistics_carrier_invoice_payable
 on logistics_carrier_invoices(payable_id) where payable_id is not null;
create unique index if not exists uq_logistics_carrier_invoice_ledger_adjustment
 on logistics_carrier_invoices(ledger_adjustment_entry_id) where ledger_adjustment_entry_id is not null;
commit;
