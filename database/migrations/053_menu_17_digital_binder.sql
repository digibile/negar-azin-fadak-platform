-- MENU 17: DIGITAL BINDER
-- All menu-17 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('17-digital-binder','زونکن دیجیتال',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('binder-code','کد زونکن','text',true,10,'{}'),
 ('entity-type','نوع پرونده','select',true,20,'{"options":["قرارداد وام","درخواست اعتبار","وثیقه","ضامن","مشتری","سایر"]}'),
 ('entity-code','شناسه پرونده','text',true,30,'{}'),
 ('document-title','عنوان سند','text',true,40,'{}'),
 ('document-type','نوع سند','select',true,50,'{"options":["قرارداد","مدرک هویتی","سند وثیقه","ضمانت‌نامه","رسید پرداخت","گزارش ارزیابی","مکاتبه","سایر"]}'),
 ('file-reference','مرجع فایل','text',true,60,'{}'),
 ('version','نسخه','number',true,70,'{}'),
 ('document-date','تاریخ سند','date',false,80,'{}'),
 ('document-status','وضعیت سند','select',true,90,'{"options":["پیش‌نویس","ثبت شده","تأیید شده","منسوخ","بایگانی شده"]}'),
 ('confidentiality','سطح محرمانگی','select',true,100,'{"options":["عمومی","داخلی","محرمانه","بسیار محرمانه"]}'),
 ('description','شرح','textarea',false,110,'{}'),
 ('notes','یادداشت','textarea',false,120,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='17-digital-binder'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:17-digital-binder:read'),
 ('write','ثبت و ویرایش','modules:17-digital-binder:write'),
 ('delete','حذف','modules:17-digital-binder:delete'),
 ('approve','تأیید سند','modules:17-digital-binder:approve'),
 ('archive','بایگانی','modules:17-digital-binder:archive')
) v(action_code,title,permission)
where m.code='17-digital-binder'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 17 UI metadata is grouped here so the next build has one auditable change-set.
