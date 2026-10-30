-- 152: staged links from operational registries to the canonical accounting party.
-- Existing registry rows remain untouched; party_id is nullable until reconciled.
-- The composite foreign keys prevent cross-tenant links even if an API check is bypassed.

begin;

do $$
declare
  target_table text;
  constraint_name text;
begin
  foreach target_table in array array[
    'purchase_suppliers',
    'sales_partners',
    'payment_merchants',
    'sellers'
  ] loop
    if to_regclass('public.' || target_table) is null then
      raise exception 'Required registry table public.% is missing', target_table;
    end if;

    execute format(
      'alter table public.%I add column if not exists party_id uuid',
      target_table
    );

    constraint_name := target_table || '_tenant_id_id_unique';
    if not exists (
      select 1
      from pg_constraint
      where conname = constraint_name
        and conrelid = to_regclass('public.' || target_table)
    ) then
      execute format(
        'alter table public.%I add constraint %I unique (tenant_id, id)',
        target_table,
        constraint_name
      );
    end if;

    constraint_name := target_table || '_canonical_party_fk';
    if not exists (
      select 1
      from pg_constraint
      where conname = constraint_name
        and conrelid = to_regclass('public.' || target_table)
    ) then
      execute format(
        'alter table public.%I add constraint %I
           foreign key (tenant_id, party_id)
           references public.accounting_parties (tenant_id, id)
           on delete restrict',
        target_table,
        constraint_name
      );
    end if;

    execute format(
      'create index if not exists %I on public.%I (tenant_id, party_id)
       where party_id is not null',
      target_table || '_canonical_party_idx',
      target_table
    );
  end loop;
end $$;

commit;
