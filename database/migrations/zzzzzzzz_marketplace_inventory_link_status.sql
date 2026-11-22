-- Add an explicit lifecycle to the operational marketplace-to-inventory mapping.
-- Existing mappings remain active for backward compatibility; no business data is rewritten.
begin;

alter table marketplace_inventory_product_links
 add column if not exists status text not null default 'active'
 check(status in ('active','inactive'));

create index if not exists marketplace_inventory_product_links_status_idx
 on marketplace_inventory_product_links(tenant_id,status,product_id);

-- A financial issue trace may only be created while the operational product mapping is active.
create or replace function guard_marketplace_finance_issue_link_active_inventory_mapping()
returns trigger language plpgsql as $$
declare
 v_status text;
begin
 select mil.status into v_status
 from marketplace_inventory_product_links mil
 join marketplace_inventory_reservations mir
  on mir.tenant_id=mil.tenant_id and mir.marketplace_product_id=mil.product_id
 where mir.tenant_id=new.tenant_id and mir.id=new.reservation_id
 for update of mil;
 if not found or v_status<>'active' then
  raise exception 'Marketplace product-to-inventory mapping must be active when the financial issue link is created';
 end if;
 return new;
end;
$$;

drop trigger if exists aaa_marketplace_finance_issue_link_active_mapping on marketplace_finance_issue_line_links;
create trigger aaa_marketplace_finance_issue_link_active_mapping
before insert on marketplace_finance_issue_line_links
for each row execute function guard_marketplace_finance_issue_link_active_inventory_mapping();

commit;
