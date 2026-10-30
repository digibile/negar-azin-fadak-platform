-- 160: enforce tenant ownership for treasury check source accounts and event history.
-- NOT VALID preserves historical rows while enforcing every new insert or update.
begin;

alter table public.treasury_check_events
  add constraint treasury_check_events_tenant_check_fk
  foreign key(tenant_id,check_id)
  references public.treasury_checks(tenant_id,id)
  on delete cascade not valid;

create index if not exists treasury_checks_own_bank_idx
  on public.treasury_checks(tenant_id,bank_account_id)
  where bank_account_id is not null;

commit;
