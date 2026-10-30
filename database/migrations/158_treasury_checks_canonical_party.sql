-- 158: connect treasury checks to the tenant-scoped canonical counterparty registry.
-- Existing checks remain intact and unlinked until an evidence-backed reconciliation.
begin;

alter table public.treasury_checks
  add column if not exists counterparty_party_id uuid,
  add column if not exists counterparty_bank_account_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='treasury_checks_tenant_id_unique'
      and conrelid='public.treasury_checks'::regclass
  ) then
    alter table public.treasury_checks
      add constraint treasury_checks_tenant_id_unique unique(tenant_id,id);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='treasury_checks_counterparty_party_fk'
      and conrelid='public.treasury_checks'::regclass
  ) then
    alter table public.treasury_checks
      add constraint treasury_checks_counterparty_party_fk
      foreign key(tenant_id,counterparty_party_id)
      references public.accounting_parties(tenant_id,id)
      on delete restrict not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='treasury_checks_counterparty_bank_fk'
      and conrelid='public.treasury_checks'::regclass
  ) then
    alter table public.treasury_checks
      add constraint treasury_checks_counterparty_bank_fk
      foreign key(tenant_id,counterparty_party_id,counterparty_bank_account_id)
      references public.accounting_party_bank_accounts(tenant_id,party_id,id)
      on delete restrict not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='treasury_checks_counterparty_bank_requires_party'
      and conrelid='public.treasury_checks'::regclass
  ) then
    alter table public.treasury_checks
      add constraint treasury_checks_counterparty_bank_requires_party
      check(counterparty_bank_account_id is null or counterparty_party_id is not null) not valid;
  end if;
end $$;

create index if not exists treasury_checks_counterparty_party_idx
  on public.treasury_checks(tenant_id,counterparty_party_id)
  where counterparty_party_id is not null;
create index if not exists treasury_checks_counterparty_bank_idx
  on public.treasury_checks(tenant_id,counterparty_bank_account_id)
  where counterparty_bank_account_id is not null;

commit;
