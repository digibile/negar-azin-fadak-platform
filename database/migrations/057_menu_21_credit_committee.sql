-- MENU 21: CREDIT COMMITTEE
-- All menu-21 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('21-credit-committee','کمیته اعتباری',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('committee-code','کد جلسه کمیته','text',true,10,'{}'),
 ('application-code','کد درخواست اعتبار','text',true,20,'{}'),
 ('decision-code','کد تصمیم اعتباری','text',false,30,'{}'),
 ('meeting-date','تاریخ جلسه','date',true,40,'{}'),
 ('meeting-time','ساعت جلسه','text',false,50,'{}'),
 ('committee-type','نوع کمیته','select',true,60,'{"options":["اعتباری","تجدیدنظر","ریسک","مدیریت اعتبارات"]}'),
 ('chairperson','رئیس جلسه','text',false,70,'{}'),
 ('secretary','دبیر جلسه','text',false,80,'{}'),
 ('members','اعضای کمیته','textarea',false,90,'{}'),
 ('requested-amount','مبلغ درخواست','number',false,100,'{}'),
 ('proposed-amount','مبلغ پیشنهادی','number',false,110,'{}'),
 ('decision','نتیجه کمیته','select',true,120,'{"options":["تأیید","تأیید مشروط","رد","ارجاع برای بررسی بیشتر"]}'),
 ('decision-reason','دلایل تصمیم','textarea',false,130,'{}'),
 ('conditions','شروط مصوبه','textarea',false,140,'{}'),
 ('meeting-status','وضعیت جلسه','select',true,150,'{"options":["برنامه‌ریزی شده","در حال برگزاری","برگزار شده","لغو شده","مختومه"]}'),
 ('minutes-reference','مرجع صورتجلسه','text',false,160,'{}'),
 ('next-review-date','تاریخ بازبینی','date',false,170,'{}'),
 ('notes','یادداشت','textarea',false,180,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='21-credit-committee'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:21-credit-committee:read'),
 ('write','ثبت و ویرایش','modules:21-credit-committee:write'),
 ('delete','حذف','modules:21-credit-committee:delete'),
 ('hold','ثبت نتیجه جلسه','modules:21-credit-committee:hold'),
 ('close','مختومه کردن جلسه','modules:21-credit-committee:close')
) v(action_code,title,permission)
where m.code='21-credit-committee'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 21 UI metadata is grouped here so the next build has one auditable change-set.
