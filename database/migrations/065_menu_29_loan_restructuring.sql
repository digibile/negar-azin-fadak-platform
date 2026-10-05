-- MENU 29: RESTRUCTURING & RESCHEDULING
insert into platform_modules (code,title,is_active)
values ('29-loan-restructuring','بازسازی و تقسیط مجدد تسهیلات',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
('restructuring-code','کد پرونده تقسیط مجدد','text',true,10,'{}'),
('contract-code','کد قرارداد قبلی','text',true,20,'{}'),
('borrower-id','شناسه بدهکار','text',true,30,'{}'),
('request-date','تاریخ درخواست','date',true,40,'{}'),
('reason','علت تقسیط مجدد','select',true,50,'{"options":["کاهش توان پرداخت","افت درآمد","بیماری یا حادثه","تغییر شرایط کسب‌وکار","توافق وصول","سایر"]}'),
('old-principal','مانده اصل قبلی','number',true,60,'{}'),
('old-interest','مانده سود قبلی','number',false,70,'{}'),
('old-penalty','مانده جریمه قبلی','number',false,80,'{}'),
('waiver-amount','مبلغ بخشودگی','number',false,90,'{}'),
('new-principal','اصل مبنای قرارداد جدید','number',true,100,'{}'),
('new-interest-rate','نرخ سود جدید','number',false,110,'{}'),
('new-term-months','مدت جدید ماه','number',true,120,'{}'),
('installment-amount','مبلغ قسط جدید','number',true,130,'{}'),
('first-due-date','اولین سررسید جدید','date',true,140,'{}'),
('payment-frequency','دوره پرداخت','select',true,150,'{"options":["ماهانه","دوماهه","سه‌ماهه","شش‌ماهه","سالانه"]}'),
('collateral-treatment','وضعیت وثایق','select',true,160,'{"options":["بدون تغییر","نیازمند ارزیابی مجدد","تعویض وثیقه","افزایش وثیقه","کاهش وثیقه"]}'),
('approval-status','وضعیت تأیید','select',true,170,'{"options":["در انتظار بررسی","تأیید شده","رد شده","نیازمند اصلاح"]}'),
('restructuring-status','وضعیت تقسیط مجدد','select',true,180,'{"options":["درخواست اولیه","در حال بررسی","تأیید شده","قرارداد جدید صادر شد","فعال","رد شده","لغو شده"]}'),
('new-contract-code','کد قرارداد جدید','text',false,190,'{}'),
('approved-by','تأییدکننده','text',false,200,'{}'),
('effective-date','تاریخ اجرا','date',false,210,'{}'),
('notes','یادداشت','textarea',false,220,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='29-loan-restructuring'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
('read','مشاهده پرونده‌ها','modules:29-loan-restructuring:read'),
('write','ثبت و ویرایش','modules:29-loan-restructuring:write'),
('delete','حذف','modules:29-loan-restructuring:delete'),
('review','بررسی درخواست','modules:29-loan-restructuring:review'),
('approve','تأیید تقسیط مجدد','modules:29-loan-restructuring:approve'),
('issue','صدور قرارداد جدید','modules:29-loan-restructuring:issue'),
('activate','فعال‌سازی','modules:29-loan-restructuring:activate'),
('cancel','لغو درخواست','modules:29-loan-restructuring:cancel')
) v(action_code,title,permission)
where m.code='29-loan-restructuring'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;