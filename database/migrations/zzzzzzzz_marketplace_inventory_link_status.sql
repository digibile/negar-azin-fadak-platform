-- Add an explicit lifecycle to the operational marketplace-to-inventory mapping.
-- Existing mappings remain active for backward compatibility; no business data is rewritten.
begin;

alter table marketplace_inventory_product_links
 add column if not exists status text not null default 'active'
 check(status in ('active','inactive'));

create index if not exists marketplace_inventory_product_links_status_idx
 on marketplace_inventory_product_links(tenant_id,status,product_id);

commit;
