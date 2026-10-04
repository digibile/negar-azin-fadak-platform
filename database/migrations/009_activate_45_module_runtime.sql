-- Activate real runtime capabilities and role permissions for all 45 modules
insert into module_permissions(module_id,permission)
select id,'modules:'||code||':write' from platform_modules
on conflict do nothing;

insert into module_permissions(module_id,permission)
select id,'modules:'||code||':delete' from platform_modules
on conflict do nothing;

insert into role_permissions(role,permission)
select 'admin','modules:'||code||':read' from platform_modules
on conflict do nothing;

insert into role_permissions(role,permission)
select 'admin','modules:'||code||':write' from platform_modules
on conflict do nothing;

insert into role_permissions(role,permission)
select 'admin','modules:'||code||':delete' from platform_modules
on conflict do nothing;

insert into role_permissions(role,permission)
select 'manager','modules:'||code||':read' from platform_modules
on conflict do nothing;

insert into role_permissions(role,permission)
select 'manager','modules:'||code||':write' from platform_modules
on conflict do nothing;

insert into role_permissions(role,permission)
select 'viewer','modules:'||code||':read' from platform_modules
on conflict do nothing;

insert into module_actions(module_id,action_code,title,permission)
select id,'write','ثبت و ویرایش','modules:'||code||':write'
from platform_modules
on conflict (module_id,action_code) do nothing;

insert into module_actions(module_id,action_code,title,permission)
select id,'delete','حذف','modules:'||code||':delete'
from platform_modules
on conflict (module_id,action_code) do nothing;

update module_runtime
set lifecycle='active',updated_at=now()
where module_id in (select id from platform_modules where is_active=true);
