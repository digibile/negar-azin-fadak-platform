begin;

insert into module_runtime(module_id,lifecycle,route,api_prefix,owner_team,description)
select id,'active','/modules/?code=18-notifications','/api/platform/modules/18-notifications','platform','مرکز اعلان‌ها، کانال‌ها، صف ارسال و تاریخچه اعلان'
from platform_modules where code='18-notifications'
on conflict(module_id) do update set
lifecycle=excluded.lifecycle,route=excluded.route,api_prefix=excluded.api_prefix,
owner_team=excluded.owner_team,description=excluded.description;

insert into module_permissions(module_id,permission)
select id,'modules:18-notifications:'||a.action
from platform_modules cross join (values('read'),('write'),('delete')) a(action)
where code='18-notifications'
on conflict do nothing;

insert into role_permissions(role,permission)
select r.role,'modules:18-notifications:'||r.action
from (values
('admin','read'),('admin','write'),('admin','delete'),
('manager','read'),('manager','write'),('viewer','read')
) r(role,action)
on conflict do nothing;

insert into module_actions(module_id,action_code,title,permission)
select id,a.action,case a.action when 'read' then 'مشاهده اعلان‌ها' when 'write' then 'ثبت و ویرایش اعلان' else 'حذف اعلان' end,
'modules:18-notifications:'||a.action
from platform_modules cross join (values('read'),('write'),('delete')) a(action)
where code='18-notifications'
on conflict(module_id,action_code) do update set
title=excluded.title,permission=excluded.permission,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,f.field_key,f.title,f.field_type,f.required,f.sort_order,f.options
from platform_modules m
cross join (values
('notification-code','کد اعلان','text',true,10,'{}'::jsonb),
('notification-title','عنوان اعلان','text',true,20,'{}'::jsonb),
('notification-type','نوع اعلان','select',true,30,'{"options":["اطلاع‌رسانی","موفقیت","هشدار","خطا","اقدام","سیستمی"]}'::jsonb),
('channel','کانال نمایش','select',true,40,'{"options":["داخل سامانه","مرکز اعلان","پیامک","ایمیل","اعلان مرورگر","همه"]}'::jsonb),
('audience','مخاطب','select',true,50,'{"options":["عمومی","کاربران واردشده","نقش‌محور","سازمانی","کاربر مشخص"]}'::jsonb),
('trigger-event','رویداد محرک','text',false,60,'{}'::jsonb),
('target-route','مسیر مقصد','text',false,70,'{}'::jsonb),
('message-reference','مرجع پیام','textarea',false,80,'{}'::jsonb),
('priority','اولویت','number',false,90,'{}'::jsonb),
('delivery-mode','نحوه ارسال','select',true,100,'{"options":["فوری","صف ارسال","زمان‌بندی شده"]}'::jsonb),
('status','وضعیت','select',true,110,'{"options":["پیش‌نویس","فعال","غیرفعال","آرشیو شده"]}'::jsonb),
('scheduled-at','زمان زمان‌بندی','datetime',false,120,'{}'::jsonb),
('expires-at','زمان انقضا','datetime',false,130,'{}'::jsonb),
('read-mode','وضعیت خواندن','select',true,140,'{"options":["قابل خواندن","نیازمند تأیید","خودکار"]}'::jsonb),
('notes','یادداشت','textarea',false,150,'{}'::jsonb)
) f(field_key,title,field_type,required,sort_order,options)
where m.code='18-notifications'
on conflict(module_id,field_key) do update set
title=excluded.title,field_type=excluded.field_type,required=excluded.required,
sort_order=excluded.sort_order,options=excluded.options;

commit;
