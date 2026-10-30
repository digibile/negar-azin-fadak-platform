-- 157: link treasury receipts to the canonical payer registry.
-- Existing payer_name values remain intact; historical links are reconciled separately.
begin;

alter table public.treasury_receipts
  add column if not exists party_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='treasury_receipts_party_tenant_fk'
      and conrelid='public.treasury_receipts'::regclass
  ) then
    alter table public.treasury_receipts
      add constraint treasury_receipts_party_tenant_fk
      foreign key(tenant_id,party_id)
      references public.accounting_parties(tenant_id,id)
      on delete restrict not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='treasury_receipts_own_bank_tenant_fk'
      and conrelid='public.treasury_receipts'::regclass
  ) then
    alter table public.treasury_receipts
      add constraint treasury_receipts_own_bank_tenant_fk
      foreign key(tenant_id,bank_account_id)
      references public.treasury_bank_accounts(tenant_id,id)
      on delete restrict not valid;
  end if;
end $$;

create index if not exists treasury_receipts_party_idx
  on public.treasury_receipts(tenant_id,party_id,receipt_date desc)
  where party_id is not null;

commit;
