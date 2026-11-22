-- 153: tenant-safe party dimension for the existing operational ledger.
-- Additive only: historical lines receive their tenant from the parent entry.
-- No party backfill, account remapping, amount change, or operational execution is performed here.

begin;

alter table ledger_lines add column if not exists tenant_id uuid;
alter table ledger_lines add column if not exists party_id uuid;

-- Parent entry is the only authoritative source for a historical line's tenant.
update ledger_lines ll
set tenant_id = le.tenant_id
from ledger_entries le
where le.id = ll.entry_id
  and ll.tenant_id is null;

do $$
begin
 if exists(select 1 from ledger_lines where tenant_id is null) then
  raise exception 'LEDGER_LINE_TENANT_BACKFILL_INCOMPLETE';
 end if;
end $$;

alter table ledger_lines alter column tenant_id set not null;

-- Composite parent keys are created by migration 151. Reuse them rather than
-- introducing duplicate unique indexes or weakening tenant isolation.
do $$
begin
 if not exists(select 1 from pg_constraint where conname='ledger_lines_entry_tenant_fk') then
  alter table ledger_lines add constraint ledger_lines_entry_tenant_fk
   foreign key(tenant_id,entry_id)
   references ledger_entries(tenant_id,id) on delete cascade;
 end if;

 if not exists(select 1 from pg_constraint where conname='ledger_lines_party_tenant_fk') then
  alter table ledger_lines add constraint ledger_lines_party_tenant_fk
   foreign key(tenant_id,party_id)
   references accounting_parties(tenant_id,id) on delete restrict;
 end if;
end $$;

create index if not exists idx_ledger_lines_tenant_party_account
 on ledger_lines(tenant_id,party_id,account_id)
 where party_id is not null;

commit;
