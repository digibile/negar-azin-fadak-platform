insert into role_permissions(role,permission) values
('admin','settings:manage'),
('manager','settings:manage')
on conflict do nothing;

insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible)
select id,'admin',true,40,true
from menu_items where path='/modules/?code=central-settings'
on conflict(menu_item_id,panel_code) do update set is_shared=true,sort_order=40,is_visible=true;

insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible)
select id,'admin',true,sort_order,true
from menu_items
where parent_id=(select id from menu_items where path='/modules/?code=central-settings' limit 1)
on conflict(menu_item_id,panel_code) do update set is_shared=true,is_visible=true;

insert into menu_items(title,path,sort_order,permission,parent_id)
select v.title,v.path,v.sort_order,'settings:manage',m.id
from (values
 ('تنظیمات عمومی','/modules/?code=central-settings&tab=general',10),
 ('تقویم و منطقه','/modules/?code=central-settings&tab=localization',20),
 ('شماره‌گذاری اسناد','/modules/?code=central-settings&tab=numbering',30),
 ('اعلان‌ها','/modules/?code=central-settings&tab=notifications',40),
 ('امنیت مرکزی','/modules/?code=central-settings&tab=security',50),
 ('مدیریت فایل','/modules/?code=central-settings&tab=files',60),
 ('گردش‌کار','/modules/?code=central-settings&tab=workflow',70),
 ('نگهداری و عملیات','/modules/?code=central-settings&tab=maintenance',80),
 ('تاریخچه تغییرات','/modules/?code=central-settings&tab=audit',90)
) v(title,path,sort_order)
cross join lateral (select id from menu_items where path='/modules/?code=central-settings' order by created_at desc limit 1) m
where not exists(select 1 from menu_items x where x.path=v.path);

insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible)
select x.id,'admin',true,x.sort_order,true
from menu_items x
where x.parent_id=(select id from menu_items where path='/modules/?code=central-settings' limit 1)
on conflict(menu_item_id,panel_code) do update set is_shared=true,is_visible=true,sort_order=excluded.sort_order;
