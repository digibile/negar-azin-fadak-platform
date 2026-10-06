-- Ensure the exact operational 01..11 navigation roots have real child rows.
-- The existing menu catalog already stores rich child labels in JSON; this migration
-- materializes the first five as actual navigable menu_items for the canonical tree.
begin;

with parents as (
  select m.id,m.menu_key,m.path,m.permission,m.children
  from menu_items m
  where m.is_active=true
    and m.path in (
      '/modules/?code=governance',
      '/modules/?code=identity',
      '/modules/?code=master-data',
      '/modules/?code=customer-360',
      '/modules/?code=smart-calendar',
      '/modules/?code=business-rules',
      '/modules/?code=sla',
      '/modules/?code=accounting-finance',
      '/modules/?code=treasury-bank',
      '/modules/?code=wallet-ledger',
      '/modules/?code=credit-facilities'
    )
    and (select count(*) from menu_items c where c.parent_id=m.id and c.is_active=true) < 5
),
labels as (
  select p.id,p.menu_key,p.path,p.permission,x.title,x.ord
  from parents p
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(p.children)='array' then p.children else '[]'::jsonb end
  ) with ordinality x(title,ord)
  where x.ord <= 5
)
insert into menu_items(menu_key,parent_id,title,path,sort_order,permission,children,is_active)
select l.menu_key||':canonical:'||l.ord,l.id,l.title,
       l.path||'&tab=canonical-'||l.ord,
       l.ord,l.permission,'[]'::jsonb,true
from labels l
on conflict(menu_key) where menu_key is not null do update
set parent_id=excluded.parent_id,title=excluded.title,path=excluded.path,
    sort_order=excluded.sort_order,permission=excluded.permission,is_active=true,updated_at=now();

insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible)
select m.id,p.code,true,m.sort_order,true
from menu_items m cross join menu_panels p
where m.menu_key like '%:canonical:%'
on conflict(menu_item_id,panel_code) do update
set is_shared=true,is_visible=true,sort_order=excluded.sort_order;

commit;
