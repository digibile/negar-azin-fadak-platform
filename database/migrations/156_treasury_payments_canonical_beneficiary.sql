-- 156: connect treasury payments to the canonical party and verified beneficiary bank account.
-- Legacy composite references are added NOT VALID: new writes are enforced immediately,
-- while historical tenant links remain untouched until a dedicated reconciliation audit.
begin;

create unique index if not exists accounting_party_bank_accounts_tenant_party_id_uidx
  on public.accounting_party_bank_accounts(tenant_id,party_id,id);
create unique index if not exists treasury_bank_accounts_tenant_id_uidx
  on public.treasury_bank_accounts(tenant_id,id);

alter table public.treasury_payments
  add column if not exists party_id uuid,
  add column if not exists party_bank_account_id uuid;

alter table public.treasury_payments
  add constraint treasury_payments_own_bank_tenant_fk
  foreign key(tenant_id,bank_account_id)
  references public.treasury_bank_accounts(tenant_id,id)
  on delete restrict not valid;

alter table public.treasury_payments
  add constraint treasury_payments_party_tenant_fk
  foreign key(tenant_id,party_id)
  references public.accounting_parties(tenant_id,id)
  on delete restrict not valid;

alter table public.treasury_payments
  add constraint treasury_payments_beneficiary_bank_fk
  foreign key(tenant_id,party_id,party_bank_account_id)
  references public.accounting_party_bank_accounts(tenant_id,party_id,id)
  on delete restrict not valid;

alter table public.treasury_payments
  add constraint treasury_payments_beneficiary_requires_party
  check(party_bank_account_id is null or party_id is not null);

create index if not exists treasury_payments_party_idx
  on public.treasury_payments(tenant_id,party_id,payment_date desc);
create index if not exists treasury_payments_beneficiary_bank_idx
  on public.treasury_payments(tenant_id,party_bank_account_id)
  where party_bank_account_id is not null;

commit;
