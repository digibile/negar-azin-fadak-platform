-- Bind marketplace sellers and payouts to the existing accounting master data.
-- Existing sellers remain unmapped until reviewed by finance.
alter table sellers add column if not exists accounting_party_id uuid;
alter table seller_settlements add column if not exists payout_bank_account_id uuid;
alter table seller_settlements add column if not exists payout_ledger_entry_id uuid;
alter table seller_settlements add column if not exists payout_reference text;

-- Composite unique keys allow PostgreSQL to enforce tenant ownership at the FK layer.
create unique index if not exists uq_accounting_parties_tenant_id_id on accounting_parties(tenant_id,id);
create unique index if not exists uq_accounting_bank_accounts_tenant_id_id on accounting_bank_accounts(tenant_id,id);
create unique index if not exists uq_ledger_entries_tenant_id_id on ledger_entries(tenant_id,id);

alter table sellers drop constraint if exists sellers_accounting_party_fk;
alter table seller_settlements drop constraint if exists seller_settlements_payout_bank_account_fk;
alter table seller_settlements drop constraint if exists seller_settlements_payout_ledger_entry_fk;

do $$
begin
 if not exists(select 1 from pg_constraint where conname='sellers_accounting_party_tenant_fk') then
  alter table sellers add constraint sellers_accounting_party_tenant_fk
   foreign key(tenant_id,accounting_party_id) references accounting_parties(tenant_id,id) on delete restrict;
 end if;
 if not exists(select 1 from pg_constraint where conname='seller_settlements_payout_bank_tenant_fk') then
  alter table seller_settlements add constraint seller_settlements_payout_bank_tenant_fk
   foreign key(tenant_id,payout_bank_account_id) references accounting_bank_accounts(tenant_id,id) on delete restrict;
 end if;
 if not exists(select 1 from pg_constraint where conname='seller_settlements_payout_ledger_tenant_fk') then
  alter table seller_settlements add constraint seller_settlements_payout_ledger_tenant_fk
   foreign key(tenant_id,payout_ledger_entry_id) references ledger_entries(tenant_id,id) on delete restrict;
 end if;
end $$;

create index if not exists idx_sellers_accounting_party
 on sellers(tenant_id,accounting_party_id) where accounting_party_id is not null;
create index if not exists idx_seller_settlements_payout_bank
 on seller_settlements(tenant_id,payout_bank_account_id) where payout_bank_account_id is not null;
create unique index if not exists uq_seller_settlement_payout_ledger_entry
 on seller_settlements(tenant_id,payout_ledger_entry_id) where payout_ledger_entry_id is not null;
