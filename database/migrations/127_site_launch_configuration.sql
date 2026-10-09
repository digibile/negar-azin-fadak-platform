begin;

insert into module_permissions(module_id,permission)
select id,v.permission
from platform_modules
cross join (values
 ('modules:36-page-templates:read'),
 ('modules:36-page-templates:write'),
 ('modules:36-page-templates:delete')
) v(permission)
where platform_modules.code='36-page-templates'
on conflict do nothing;

insert into role_permissions(role,permission) values
 ('admin','modules:36-page-templates:read'),
 ('admin','modules:36-page-templates:write'),
 ('admin','modules:36-page-templates:delete'),
 ('manager','modules:36-page-templates:read'),
 ('manager','modules:36-page-templates:write')
on conflict do nothing;

insert into menu_items(title,path,sort_order,permission)
select 'مدیریت قالب‌های صفحات','/modules/?code=36-page-templates',36,'modules:36-page-templates:read'
where not exists(select 1 from menu_items where path='/modules/?code=36-page-templates');

insert into menu_items(title,path,sort_order,permission,parent_id)
select 'راه‌اندازی و تنظیمات سایت','/modules/?code=36-page-templates&panel=site-launch',25,'modules:36-page-templates:write',p.id
from menu_items p
where p.path='/modules/?code=36-page-templates'
and not exists(select 1 from menu_items x where x.path='/modules/?code=36-page-templates&panel=site-launch');

insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible)
select id,'admin',true,25,true
from menu_items
where path='/modules/?code=36-page-templates&panel=site-launch'
on conflict(menu_item_id,panel_code) do update
set is_shared=true,sort_order=excluded.sort_order,is_visible=true;

commit;
