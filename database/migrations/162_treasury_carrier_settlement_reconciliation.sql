-- Link imported bank statement debits to recorded accounting payable settlements.
alter table treasury_bank_transactions
 add column if not exists payable_settlement_id uuid references accounting_rp_settlements(id) on delete restrict;
create unique index if not exists uq_treasury_bank_transaction_payable_settlement
 on treasury_bank_transactions(tenant_id,payable_settlement_id)
 where payable_settlement_id is not null;
create index if not exists ix_treasury_bank_transactions_settlement
 on treasury_bank_transactions(tenant_id,payable_settlement_id)
 where payable_settlement_id is not null;
