-- MENU 20: CREDIT DECISIONS
-- All menu-20 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('20-credit-decisions','تصمیم‌گیری اعتباری',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('decision-code','کد تصمیم','text',true,10,'{}'),
 ('application-code','کد درخواست اعتبار','text',true,20,'{}'),
 ('scoring-code','کد اعتبارسنجی','text',false,30,'{}'),
 ('applicant-id','شناسه متقاضی','text',true,40,'{}'),
 ('requested-amount','مبلغ درخواستی','number',true,50,'{}'),
 ('approved-amount','مبلغ مصوب','number',false,60,'{}'),
 ('approved-term','مدت مصوب','number',false,70,'{}'),
 ('approved-rate','نرخ مصوب','number',false,80,'{}'),
 ('decision','نتیجه تصمیم','select',true,90,'{"options":["تأیید","تأیید مشروط","رد","نیازمند بررسی بیشتر"]}'),
 ('decision-date','تاریخ تصمیم','date',true,100,'{}'),
 ('decision-maker','تصمیم‌گیرنده','text',false,110,'{}'),
 ('conditions','شروط مصوبه','textarea',false,120,'{}'),
 ('reason','دلایل تصمیم','textarea',false,130,'{}'),
 ('decision-status','وضعیت مصوبه','select',true,140,'{"options":["پیش‌نویس","در انتظار تصمیم","تصمیم‌گیری شده","ابلاغ شده","منقضی","لغو شده"]}'),
 ('valid-until','اعتبار مصوبه تا','date',false,150,'{}'),
 ('notes','یادداشت','textarea',false,160,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='20-credit-decisions'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:20-credit-decisions:read'),
 ('write','ثبت و ویرایش','modules:20-credit-decisions:write'),
 ('delete','حذف','modules:20-credit-decisions:delete'),
 ('decide','ثبت تصمیم','modules:20-credit-decisions:decide'),
 ('publish','ابلاغ مصوبه','modules:20-credit-decisions:publish')
) v(action_code,title,permission)
where m.code='20-credit-decisions'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 20 UI metadata is grouped here so the next build has one auditable change-set.
