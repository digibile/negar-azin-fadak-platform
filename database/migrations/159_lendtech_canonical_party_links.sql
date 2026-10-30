-- 159: connect lending applications to the canonical party registry.
-- Existing customer_ref values remain the operational reference and are not rewritten.
-- The tenant UUID is stored alongside the legacy text tenant_ref so the FK can enforce tenant isolation.
begin;

alter table public.lendtech_applications
  add column if not exists party_tenant_id uuid,
  add column if not exists party_id uuid;

alter table public.lendtech_applications
  add constraint lendtech_applications_canonical_party_fk
  foreign key(party_tenant_id,party_id)
  references public.accounting_parties(tenant_id,id)
  on delete restrict not valid;

alter table public.lendtech_applications
  add constraint lendtech_applications_canonical_party_tenant_check
  check(
    (party_id is null and party_tenant_id is null)
    or
    (party_id is not null and party_tenant_id is not null and party_tenant_id::text=tenant_ref)
  );

create index if not exists lendtech_applications_canonical_party_idx
  on public.lendtech_applications(tenant_ref,party_id)
  where party_id is not null;

commit;
