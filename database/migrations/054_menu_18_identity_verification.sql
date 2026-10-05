-- MENU 18: IDENTITY DOCUMENT VERIFICATION
-- All menu-18 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('18-identity-verification','احراز هویت و بررسی مدارک',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('verification-code','کد بررسی','text',true,10,'{}'),
 ('person-id','شناسه شخص','text',true,20,'{}'),
 ('document-type','نوع مدرک','select',true,30,'{"options":["کارت ملی","شناسنامه","گواهینامه","پاسپورت","سند ثبتی","سایر"]}'),
 ('document-number','شماره مدرک','text',false,40,'{}'),
 ('file-reference','مرجع فایل','text',true,50,'{}'),
 ('ocr-status','وضعیت OCR','select',true,60,'{"options":["ثبت نشده","در انتظار پردازش","پردازش شده","نیازمند بازبینی","ناموفق"]}'),
 ('extracted-name','نام استخراج‌شده','text',false,70,'{}'),
 ('extracted-national-id','کد ملی استخراج‌شده','text',false,80,'{}'),
 ('extracted-birth-date','تاریخ تولد استخراج‌شده','date',false,90,'{}'),
 ('verification-status','وضعیت احراز','select',true,100,'{"options":["در انتظار بررسی","تأیید شده","نیازمند اصلاح","رد شده"]}'),
 ('reviewer','بررسی‌کننده','text',false,110,'{}'),
 ('review-date','تاریخ بررسی','date',false,120,'{}'),
 ('review-notes','یادداشت بررسی','textarea',false,130,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='18-identity-verification'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:18-identity-verification:read'),
 ('write','ثبت و ویرایش','modules:18-identity-verification:write'),
 ('delete','حذف','modules:18-identity-verification:delete'),
 ('process','پردازش OCR','modules:18-identity-verification:process'),
 ('verify','تأیید احراز هویت','modules:18-identity-verification:verify')
) v(action_code,title,permission)
where m.code='18-identity-verification'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 18 UI metadata is grouped here so the next build has one auditable change-set.
