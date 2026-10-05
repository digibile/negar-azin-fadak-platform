-- MENU 28: COLLECTION WORKFLOW
insert into platform_modules (code,title,is_active)
values ('28-collection-workflow','کارتابل و عملیات وصول تسهیلات',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
('case-code','کد پرونده وصول','text',true,10,'{}'),
('delinquency-code','کد پرونده معوق','text',true,20,'{}'),
('contract-code','کد قرارداد','text',true,30,'{}'),
('borrower-id','شناسه بدهکار','text',true,40,'{}'),
('assignment-date','تاریخ ارجاع','date',true,50,'{}'),
('collector','کارشناس وصول','text',true,60,'{}'),
('priority','اولویت','select',true,70,'{"options":["عادی","مهم","فوری","بحرانی"]}'),
('channel','کانال پیگیری','select',true,80,'{"options":["تماس تلفنی","پیامک","اعلان سامانه","مراجعه حضوری","نامه رسمی","پیگیری حقوقی"]}'),
('attempt-count','تعداد پیگیری','number',false,90,'{}'),
('last-action-date','تاریخ آخرین اقدام','date',false,100,'{}'),
('next-action-date','تاریخ اقدام بعدی','date',false,110,'{}'),
('contact-result','نتیجه تماس','select',false,120,'{"options":["موفق","عدم پاسخ","وعده پرداخت","رد تماس","شماره نامعتبر","نیازمند مراجعه"]}'),
('commitment-date','تاریخ تعهد','date',false,130,'{}'),
('commitment-amount','مبلغ تعهد','number',false,140,'{}'),
('action-result','نتیجه اقدام','textarea',false,150,'{}'),
('escalation-level','سطح ارجاع','select',true,160,'{"options":["بدون ارجاع","سرپرست وصول","مدیریت اعتبارات","واحد حقوقی","اجرای تعهدات"]}'),
('workflow-status','وضعیت کارتابل','select',true,170,'{"options":["جدید","در حال پیگیری","در انتظار اقدام بدهکار","در انتظار تعهد","ارجاع شده","تکمیل شده","مختومه"]}'),
('completion-reason','علت تکمیل','select',false,180,'{"options":["تسویه کامل","توافق پرداخت","تقسیط مجدد","انتقال به حقوقی","بدون نتیجه","سایر"]}'),
('created-by','ثبت‌کننده','text',false,190,'{}'),
('notes','یادداشت','textarea',false,200,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='28-collection-workflow'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
('read','مشاهده کارتابل','modules:28-collection-workflow:read'),
('write','ثبت و ویرایش','modules:28-collection-workflow:write'),
('delete','حذف','modules:28-collection-workflow:delete'),
('assign','ارجاع به کارشناس','modules:28-collection-workflow:assign'),
('contact','ثبت پیگیری','modules:28-collection-workflow:contact'),
('commit','ثبت تعهد پرداخت','modules:28-collection-workflow:commit'),
('escalate','ارجاع پرونده','modules:28-collection-workflow:escalate'),
('complete','تکمیل پرونده','modules:28-collection-workflow:complete')
) v(action_code,title,permission)
where m.code='28-collection-workflow'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;