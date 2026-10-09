-- 137: source data is reference-only; sale prices remain owned by the platform.
begin;

update catalog_source_links
set price_policy='manual',
    markup_percent=0,
    updated_at=now()
where price_policy <> 'manual' or markup_percent <> 0;

alter table catalog_source_links
  drop constraint if exists catalog_source_links_price_policy_check;

alter table catalog_source_links
  add constraint catalog_source_links_price_policy_check
  check (price_policy = 'manual');

commit;
