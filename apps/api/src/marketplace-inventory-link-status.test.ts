-- Migration guard: the operational product mapping used by settlement readiness
-- must expose an explicit active/inactive state and preserve legacy mappings as active.
begin;
do $$
begin
 if not exists(
  select 1 from information_schema.columns
  where table_schema=current_schema()
   and table_name='marketplace_inventory_product_links'
   and column_name='status'
 ) then
  raise exception 'marketplace_inventory_product_links.status was not added';
 end if;
end $$;
commit;
