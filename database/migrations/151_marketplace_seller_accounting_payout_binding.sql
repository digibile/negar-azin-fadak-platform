-- Bind marketplace sellers and payouts to the existing accounting master data.
-- This migration is additive; existing sellers remain unmapped until reviewed by finance.
alter table sellers add column if not exists accounting_party_id uuid;
alter table seller_settlements add column if not exists payout_bank_account_id uuid;
alter table seller_settlements add column if not exists payout_ledger_entry_id uuid;
alter table seller_settlements add column if not exists payout_reference text;

do $$
begin
 if not exists(select 1 from pg_constraint where conname='sellers_accounting_party_fk') then
  alter table sellers add constraint sellers_accounting_party_fk
   foreign key(accounting_party_id) references accounting_parties(id) on delete restrict;
 end if;
 if not exists(select 1 from pg_constraint where conname='seller_settlements_payout_bank_account_fk') then
  alter table seller_settlements add constraint seller_settlements_payout_bank_account_fk
   foreign key(payout_bank_account_id) references accounting_bank_accounts(id) on delete restrict;
 end if;
 if not exists(select 1 from pg_constraint where conname='seller_settlements_payout_ledger_entry_fk') then
  alter table seller_settlements add constraint seller_settlements_payout_ledger_entry_fk
   foreign key(payout_ledger_entry_id) references ledger_entries(id) on delete restrict;
 end if;
end $$;

create index if not exists idx_sellers_accounting_party
 on sellers(tenant_id,accounting_party_id) where accounting_party_id is not null;
create index if not exists idx_seller_settlements_payout_bank
 on seller_settlements(tenant_id,payout_bank_account_id) where payout_bank_account_id is not null;
create unique index if not exists uq_seller_settlement_payout_ledger_entry
 on seller_settlements(tenant_id,payout_ledger_entry_id) where payout_ledger_entry_id is not null;
