-- MENU 27: LOAN DELINQUENCY & OVERDUE MANAGEMENT
insert into platform_modules (code,title,is_active)
values ('27-loan-delinquency','مدیریت معوقات تسهیلات',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
('delinquency-code','کد پرونده معوق','text',true,10,'{}'),
('contract-code','کد قرارداد','text',true,20,'{}'),
('borrower-id','شناسه بدهکار','text',true,30,'{}'),
('installment-no','شماره قسط','number',false,40,'{}'),
('due-date','تاریخ سررسید','date',true,50,'{}'),
('overdue-date','تاریخ شروع معوق','date',true,60,'{}'),
('days-overdue','روزهای تأخیر','number',true,70,'{}'),
('principal-due','اصل سررسیدشده','number',true,80,'{}'),
('interest-due','سود سررسیدشده','number',false,90,'{}'),
('penalty-amount','جریمه تأخیر','number',false,100,'{}'),
('total-overdue','کل مبلغ معوق','number',true,110,'{}'),
('risk-level','سطح ریسک','select',true,120,'{"options":["عادی","کم","متوسط","زیاد","بحرانی"]}'),
('collection-stage','مرحله پیگیری','select',true,130,'{"options":["هشدار اولیه","پیگیری تلفنی","اخطار رسمی","ارجاع وصول","اقدام حقوقی"]}'),
('contact-status','وضعیت تماس','select',false,140,'{"options":["تماس نشده","تماس موفق","عدم پاسخ","شماره نامعتبر","نیازمند پیگیری مجدد"]}'),
('promise-date','تاریخ تعهد پرداخت','date',false,150,'{}'),
('promise-amount','مبلغ تعهد پرداخت','number',false,160,'{}'),
('legal-reference','مرجع حقوقی','text',false,170,'{}'),
('resolution-status','وضعیت تعیین تکلیف','select',true,180,'{"options":["باز","در حال پیگیری","تعهد پرداخت","تسویه شده","تقسیط مجدد","ارجاع حقوقی","مختومه"]}'),
('assigned-to','مسئول پیگیری','text',false,190,'{}'),
('last-contact-at','آخرین پیگیری','datetime',false,200,'{}'),
('next-action-date','اقدام بعدی','date',false,210,'{}'),
('notes','یادداشت','textarea',false,220,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='27-loan-delinquency'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
('read','مشاهده معوقات','modules:27-loan-delinquency:read'),
('write','ثبت و ویرایش','modules:27-loan-delinquency:write'),
('delete','حذف','modules:27-loan-delinquency:delete'),
('contact','ثبت پیگیری','modules:27-loan-delinquency:contact'),
('promise','ثبت تعهد پرداخت','modules:27-loan-delinquency:promise'),
('escalate','ارجاع وصول','modules:27-loan-delinquency:escalate'),
('legal','ارجاع حقوقی','modules:27-loan-delinquency:legal'),
('resolve','تعیین تکلیف','modules:27-loan-delinquency:resolve')
) v(action_code,title,permission)
where m.code='27-loan-delinquency'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;