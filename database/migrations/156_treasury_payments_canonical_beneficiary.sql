-- 156: connect treasury payments to the canonical party and verified beneficiary bank account.
-- The organization's treasury account remains distinct from the beneficiary's external account.
-- Composite foreign keys are NOT VALID for legacy rows; PostgreSQL enforces them for all new writes.
-- Validate them after the historical tenant-link audit is complete.
begin;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='accounting_party_bank_accounts_tenant_party_id_unique'
      and conrelid='public.accounting_party_bank_accounts'::regclass
  ) then
    alter table public.accounting_party_bank_accounts
      add constraint accounting_party_bank_accounts_tenant_party_id_unique
      unique(tenant_id,party_id,id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='treasury_bank_accounts_tenant_id_unique'
      and conrelid='public.treasury_bank_accounts'::regclass
  ) then
    alter table public.treasury_bank_accounts
      add constraint treasury_bank_accounts_tenant_id_unique unique(tenant_id,id);
  end if;
end $$;

alter table public.treasury_payments
  add column if not exists party_id uuid,
  add column if not exists party_bank_account_id uuid;


do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='treasury_payments_own_bank_tenant_fk'
      and conrelid='public.treasury_payments'::regclass
  ) then
    alter table public.treasury_payments
      add constraint treasury_payments_own_bank_tenant_fk
      foreign key(tenant_id,bank_account_id)
      references public.treasury_bank_accounts(tenant_id,id)
      on delete restrict not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='treasury_payments_party_tenant_fk'
      and conrelid='public.treasury_payments'::regclass
  ) then
    alter table public.treasury_payments
      add constraint treasury_payments_party_tenant_fk
      foreign key(tenant_id,party_id)
      references public.accounting_parties(tenant_id,id)
      on delete restrict not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='treasury_payments_beneficiary_bank_fk'
      and conrelid='public.treasury_payments'::regclass
  ) then
    alter table public.treasury_payments
      add constraint treasury_payments_beneficiary_bank_fk
      foreign key(tenant_id,party_id,party_bank_account_id)
      references public.accounting_party_bank_accounts(tenant_id,party_id,id)
      on delete restrict not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='treasury_payments_beneficiary_requires_party'
      and conrelid='public.treasury_payments'::regclass
  ) then
    alter table public.treasury_payments
      add constraint treasury_payments_beneficiary_requires_party
      check(party_bank_account_id is null or party_id is not null);
  end if;
end $$;

create index if not exists treasury_payments_party_idx
  on public.treasury_payments(tenant_id,party_id,payment_date desc);
create index if not exists treasury_payments_beneficiary_bank_idx
  on public.treasury_payments(tenant_id,party_bank_account_id)
  where party_bank_account_id is not null;

commit;
