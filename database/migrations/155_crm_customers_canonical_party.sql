-- 155: connect Customer 360 to the tenant-scoped canonical party registry.
-- CRM records and their interaction history remain intact; this adds identity linkage only.
begin;

alter table public.crm_customers
  add column if not exists party_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='crm_customers_tenant_id_id_unique'
      and conrelid='public.crm_customers'::regclass
  ) then
    alter table public.crm_customers
      add constraint crm_customers_tenant_id_id_unique unique(tenant_id,id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='crm_customers_canonical_party_fk'
      and conrelid='public.crm_customers'::regclass
  ) then
    alter table public.crm_customers
      add constraint crm_customers_canonical_party_fk
      foreign key(tenant_id,party_id)
      references public.accounting_parties(tenant_id,id)
      on delete restrict;
  end if;
end $$;

create unique index if not exists crm_customers_canonical_party_idx
  on public.crm_customers(tenant_id,party_id)
  where party_id is not null;

create index if not exists crm_customers_normalized_national_id_idx
  on public.crm_customers(
    tenant_id,
    (regexp_replace(
      translate(coalesce(national_id,''),'۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩','01234567890123456789'),
      '[^0-9]','','g'
    ))
  )
  where national_id is not null;

commit;
