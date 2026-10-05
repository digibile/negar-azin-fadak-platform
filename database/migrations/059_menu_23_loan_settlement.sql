-- MENU 23: EARLY SETTLEMENT & PAYOFF
-- All menu-23 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('23-loan-settlement','تسویه و بازپرداخت پیش از موعد',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('settlement-code','کد تسویه','text',true,10,'{}'),
 ('contract-code','کد قرارداد','text',true,20,'{}'),
 ('borrower-id','شناسه بدهکار','text',true,30,'{}'),
 ('request-date','تاریخ درخواست','date',true,40,'{}'),
 ('settlement-date','تاریخ تسویه','date',false,50,'{}'),
 ('outstanding-principal','اصل بدهی باقیمانده','number',true,60,'{}'),
 ('outstanding-interest','سود باقیمانده','number',false,70,'{}'),
 ('late-fees','جرایم و وجه التزام','number',false,80,'{}'),
 ('discount-amount','مبلغ تخفیف','number',false,90,'{}'),
 ('other-charges','سایر هزینه‌ها','number',false,100,'{}'),
 ('settlement-amount','مبلغ نهایی تسویه','number',true,110,'{}'),
 ('payment-reference','مرجع پرداخت','text',false,120,'{}'),
 ('payment-method','روش پرداخت','select',false,130,'{"options":["واریز بانکی","انتقال داخلی","پرداخت نقدی","سایر"]}'),
 ('settlement-type','نوع تسویه','select',true,140,'{"options":["تسویه پیش از موعد","تسویه در سررسید","تسویه کامل","تسویه توافقی"]}'),
 ('approval-status','وضعیت تأیید','select',true,150,'{"options":["در انتظار بررسی","تأیید شده","رد شده","نیازمند اصلاح"]}'),
 ('settlement-status','وضعیت تسویه','select',true,160,'{"options":["درخواست اولیه","در حال بررسی","آماده پرداخت","پرداخت شده","تسویه نهایی","لغو شده"]}'),
 ('approved-by','تأییدکننده','text',false,170,'{}'),
 ('notes','یادداشت','textarea',false,180,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='23-loan-settlement'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:23-loan-settlement:read'),
 ('write','ثبت و ویرایش','modules:23-loan-settlement:write'),
 ('delete','حذف','modules:23-loan-settlement:delete'),
 ('calculate','محاسبه تسویه','modules:23-loan-settlement:calculate'),
 ('approve','تأیید تسویه','modules:23-loan-settlement:approve'),
 ('settle','ثبت تسویه نهایی','modules:23-loan-settlement:settle'),
 ('cancel','لغو درخواست','modules:23-loan-settlement:cancel')
) v(action_code,title,permission)
where m.code='23-loan-settlement'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 23 UI metadata is grouped here so the next build has one auditable change-set.
