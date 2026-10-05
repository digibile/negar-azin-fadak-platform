-- MENU 25: CREDIT REFUNDS & REVERSALS
-- One auditable migration for menu 25. No demo business records.

insert into platform_modules (code,title,is_active)
values ('25-loan-refunds','برگشت پرداخت و اصلاح تسهیلات',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('refund-code','کد برگشت','text',true,10,'{}'),
 ('contract-code','کد قرارداد','text',true,20,'{}'),
 ('borrower-id','شناسه بدهکار','text',true,30,'{}'),
 ('original-reference','مرجع عملیات اصلی','text',true,40,'{}'),
 ('refund-date','تاریخ درخواست برگشت','date',true,50,'{}'),
 ('refund-amount','مبلغ برگشت','number',true,60,'{}'),
 ('refund-type','نوع برگشت','select',true,70,'{"options":["برگشت کامل پرداخت","برگشت جزئی","اصلاح ثبت","برگشت کارمزد","برگشت جریمه","سایر"]}'),
 ('reason','علت برگشت','textarea',true,80,'{}'),
 ('payment-method','روش پرداخت اصلی','select',false,90,'{"options":["واریز بانکی","انتقال داخلی","پرداخت نقدی","کسر از حساب","سایر"]}'),
 ('replacement-reference','مرجع عملیات اصلاحی','text',false,100,'{}'),
 ('approval-status','وضعیت تأیید','select',true,110,'{"options":["در انتظار بررسی","تأیید شده","رد شده","نیازمند اصلاح"]}'),
 ('refund-status','وضعیت برگشت','select',true,120,'{"options":["درخواست اولیه","در حال بررسی","تأیید برای اجرا","در حال پردازش","برگشت انجام شد","لغو شده","ناموفق"]}'),
 ('approved-by','تأییدکننده','text',false,130,'{}'),
 ('processed-by','پردازش‌کننده','text',false,140,'{}'),
 ('processed-at','زمان پردازش','datetime',false,150,'{}'),
 ('failure-reason','علت عدم موفقیت','textarea',false,160,'{}'),
 ('notes','یادداشت','textarea',false,170,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='25-loan-refunds'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده برگشت‌ها','modules:25-loan-refunds:read'),
 ('write','ثبت و ویرایش','modules:25-loan-refunds:write'),
 ('delete','حذف','modules:25-loan-refunds:delete'),
 ('review','بررسی برگشت','modules:25-loan-refunds:review'),
 ('approve','تأیید برگشت','modules:25-loan-refunds:approve'),
 ('process','پردازش برگشت','modules:25-loan-refunds:process'),
 ('cancel','لغو درخواست','modules:25-loan-refunds:cancel')
) v(action_code,title,permission)
where m.code='25-loan-refunds'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;
