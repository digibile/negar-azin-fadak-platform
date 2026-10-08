begin;

insert into module_runtime(module_id,lifecycle,route,api_prefix,owner_team,description)
select id,'active','/modules/?code=16-page-builder&panel=frontend','/api/platform/modules/17-frontend-management','platform','مدیریت بخش‌های فرانت‌اند، نواحی نمایش، ترتیب، دسترسی و رفتار واکنش‌گرا'
from platform_modules where code='17-frontend-management' and is_active=true
on conflict(module_id) do update set lifecycle=excluded.lifecycle,route=excluded.route,api_prefix=excluded.api_prefix,owner_team=excluded.owner_team,description=excluded.description;

insert into module_permissions(module_id,permission)
select m.id,'modules:17-frontend-management:'||a.action
from platform_modules m cross join (values('read'),('write'),('delete')) a(action)
where m.code='17-frontend-management' and m.is_active=true
on conflict do nothing;

insert into role_permissions(role,permission)
select r.role,'modules:17-frontend-management:'||r.action
from (values
('admin','read'),('admin','write'),('admin','delete'),
('manager','read'),('manager','write'),('viewer','read')
) r(role,action)
on conflict do nothing;

insert into module_actions(module_id,action_code,title,permission)
select m.id,a.action,
case a.action when 'read' then 'مشاهده بخش‌های فرانت‌اند' when 'write' then 'ثبت و ویرایش بخش‌های فرانت‌اند' else 'حذف بخش‌های فرانت‌اند' end,
'modules:17-frontend-management:'||a.action
from platform_modules m cross join (values('read'),('write'),('delete')) a(action)
where m.code='17-frontend-management' and m.is_active=true
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,f.field_key,f.title,f.field_type,f.required,f.sort_order,f.options
from platform_modules m
cross join (values
('section-code','کد بخش','text',true,10,'{}'::jsonb),
('section-title','عنوان بخش','text',true,20,'{}'::jsonb),
('page-code','کد صفحه','text',true,30,'{}'::jsonb),
('section-type','نوع بخش','select',true,40,'{"options":["هدر","منوی اصلی","قهرمان","محتوای اصلی","کارت‌ها","فهرست","فراخوان اقدام","فرم","اعلان","فوتر","سفارشی"]}'::jsonb),
('template-code','قالب بخش','text',false,50,'{}'::jsonb),
('block-reference','مرجع بلوک','text',false,60,'{}'::jsonb),
('order-index','ترتیب نمایش','number',true,70,'{}'::jsonb),
('visibility','سطح نمایش','select',true,80,'{"options":["عمومی","کاربران واردشده","نقش‌محور","سازمانی"]}'::jsonb),
('responsive-mode','رفتار ریسپانسیو','select',true,90,'{"options":["خودکار","موبایل‌محور","دسکتاپ‌محور","سفارشی"]}'::jsonb),
('status','وضعیت','select',true,100,'{"options":["پیش‌نویس","فعال","غیرفعال","آرشیو شده"]}'::jsonb),
('version','نسخه','number',true,110,'{}'::jsonb),
('content-reference','مرجع محتوا','text',false,120,'{}'::jsonb),
('notes','یادداشت','textarea',false,130,'{}'::jsonb)
) f(field_key,title,field_type,required,sort_order,options)
where m.code='17-frontend-management' and m.is_active=true
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

commit;
