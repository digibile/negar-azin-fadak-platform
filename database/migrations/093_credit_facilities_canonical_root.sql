-- Materialize the exact legacy credit runtime root used by the 01..50 operational contract.
begin;

insert into menu_items(menu_key,title,path,sort_order,permission,children,is_active,parent_id)
values (
  'credit-facilities',
  'اعتبارات و تسهیلات',
  '/modules/?code=credit-facilities',
 110,
  'modules:credit-facilities:read',
  '["محصولات اعتباری","پرونده‌های اعتباری","درخواست اعتبار","پرداخت تسهیلات","گزارش اعتبارات"]'::jsonb,
  true,
  null
)
on conflict(menu_key) where menu_key is not null do update
set title=excluded.title,path=excluded.path,sort_order=excluded.sort_order,
    permission=excluded.permission,children=excluded.children,is_active=true,updated_at=now();

with p as (
 select id,path,permission,children
 from menu_items
 where menu_key='credit-facilities' and is_active=true
)
insert into menu_items(menu_key,parent_id,title,path,sort_order,permission,children,is_active)
select 'credit-facilities:canonical:'||x.ord,p.id,x.title,
       p.path||'&tab=canonical-'||x.ord,x.ord,p.permission,'[]'::jsonb,true
from p
cross join lateral jsonb_array_elements_text(p.children) with ordinality x(title,ord)
where x.ord<=5
on conflict(menu_key) where menu_key is not null do update
set parent_id=excluded.parent_id,title=excluded.title,path=excluded.path,
    sort_order=excluded.sort_order,permission=excluded.permission,is_active=true,updated_at=now();

insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible)
select m.id,p.code,true,m.sort_order,true
from menu_items m cross join menu_panels p
where m.menu_key like 'credit-facilities:canonical:%'
on conflict(menu_item_id,panel_code) do update
set is_shared=true,is_visible=true,sort_order=excluded.sort_order;

commit;
