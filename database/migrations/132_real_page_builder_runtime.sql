begin;

insert into module_runtime(module_id,lifecycle,route,api_prefix,owner_team,description)
select id,'active','/modules/?code=16-page-builder','/api/platform/modules/16-page-builder','platform','صفحه‌ساز سازمانی با تعریف صفحه، مسیر، نسخه، انتشار و متادیتا'
from platform_modules
where code='16-page-builder' and is_active=true
on conflict(module_id) do update set
 lifecycle=excluded.lifecycle,
 route=excluded.route,
 api_prefix=excluded.api_prefix,
 owner_team=excluded.owner_team,
 description=excluded.description;

insert into module_permissions(module_id,permission)
select m.id,'modules:16-page-builder:'||a.action
from platform_modules m
cross join (values('read'),('write'),('delete')) a(action)
where m.code='16-page-builder' and m.is_active=true
on conflict do nothing;

insert into role_permissions(role,permission)
select r.role,'modules:16-page-builder:'||r.action
from (values
 ('admin','read'),('admin','write'),('admin','delete'),
 ('manager','read'),('manager','write'),
 ('viewer','read')
) r(role,action)
on conflict do nothing;

insert into module_actions(module_id,action_code,title,permission)
select m.id,a.action,
 case a.action when 'read' then 'مشاهده' when 'write' then 'ثبت و ویرایش' else 'حذف' end,
 'modules:16-page-builder:'||a.action
from platform_modules m
cross join (values('read'),('write'),('delete')) a(action)
where m.code='16-page-builder' and m.is_active=true
on conflict(module_id,action_code) do update set
 title=excluded.title,
 permission=excluded.permission,
 is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,f.field_key,f.title,f.field_type,f.required,f.sort_order,f.options
from platform_modules m
cross join (values
 ('page-code','کد صفحه','text',true,10,'{}'::jsonb),
 ('page-title','عنوان صفحه','text',true,20,'{}'::jsonb),
 ('page-key','کلید صفحه','text',true,30,'{}'::jsonb),
 ('route','مسیر صفحه','text',true,40,'{}'::jsonb),
 ('page-type','نوع صفحه','select',true,50,'{"options":["داخلی","فرود","داشبورد","اطلاعاتی","سازمانی","سایر"]}'::jsonb),
 ('template','قالب پایه','text',false,60,'{}'::jsonb),
 ('version','نسخه','number',true,70,'{}'::jsonb),
 ('definition-reference','مرجع تعریف صفحه','textarea',false,80,'{}'::jsonb),
 ('visibility','سطح نمایش','select',true,90,'{"options":["عمومی","کاربران واردشده","نقش‌محور","سازمانی"]}'::jsonb),
 ('status','وضعیت','select',true,100,'{"options":["پیش‌نویس","فعال","غیرفعال","آرشیو شده"]}'::jsonb),
 ('published-at','تاریخ انتشار','datetime',false,110,'{}'::jsonb),
 ('owner','مالک صفحه','text',false,120,'{}'::jsonb),
 ('seo-title','عنوان SEO','text',false,130,'{}'::jsonb),
 ('seo-description','توضیحات SEO','textarea',false,140,'{}'::jsonb),
 ('notes','یادداشت','textarea',false,150,'{}'::jsonb)
) f(field_key,title,field_type,required,sort_order,options)
where m.code='16-page-builder' and m.is_active=true
on conflict(module_id,field_key) do update set
 title=excluded.title,
 field_type=excluded.field_type,
 required=excluded.required,
 sort_order=excluded.sort_order,
 options=excluded.options;

commit;
