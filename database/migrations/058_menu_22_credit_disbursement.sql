-- MENU 22: CREDIT DISBURSEMENT
-- All menu-22 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('22-credit-disbursement','پرداخت تسهیلات',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('disbursement-code','کد پرداخت','text',true,10,'{}'),
 ('contract-code','کد قرارداد','text',true,20,'{}'),
 ('application-code','کد درخواست اعتبار','text',false,30,'{}'),
 ('borrower-id','شناسه دریافت‌کننده','text',true,40,'{}'),
 ('approved-amount','مبلغ مصوب','number',true,50,'{}'),
 ('disbursement-amount','مبلغ پرداختی','number',true,60,'{}'),
 ('disbursement-date','تاریخ پرداخت','date',true,70,'{}'),
 ('payment-method','روش پرداخت','select',true,80,'{"options":["واریز بانکی","انتقال داخلی","پرداخت مرحله‌ای","سایر"]}'),
 ('bank-account','حساب مقصد','text',false,90,'{}'),
 ('bank-reference','مرجع بانکی','text',false,100,'{}'),
 ('installment-plan','برنامه بازپرداخت','text',false,110,'{}'),
 ('recipient-confirmation','تأیید دریافت','select',true,120,'{"options":["در انتظار تأیید","تأیید شده","عدم تأیید"]}'),
 ('disbursement-status','وضعیت پرداخت','select',true,130,'{"options":["پیش‌نویس","در انتظار پرداخت","در حال پردازش","پرداخت شده","ناموفق","برگشت خورده","لغو شده"]}'),
 ('processed-by','پردازش‌کننده','text',false,140,'{}'),
 ('processed-at','زمان پردازش','datetime',false,150,'{}'),
 ('failure-reason','علت خطا','textarea',false,160,'{}'),
 ('notes','یادداشت','textarea',false,170,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='22-credit-disbursement'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:22-credit-disbursement:read'),
 ('write','ثبت و ویرایش','modules:22-credit-disbursement:write'),
 ('delete','حذف','modules:22-credit-disbursement:delete'),
 ('process','پردازش پرداخت','modules:22-credit-disbursement:process'),
 ('confirm','تأیید پرداخت','modules:22-credit-disbursement:confirm'),
 ('reverse','برگشت پرداخت','modules:22-credit-disbursement:reverse')
) v(action_code,title,permission)
where m.code='22-credit-disbursement'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 22 UI metadata is grouped here so the next build has one auditable change-set.
