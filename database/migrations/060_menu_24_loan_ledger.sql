-- MENU 24: SETTLEMENT LEDGER & ACCOUNT
-- One auditable migration for menu 24. No demo business records.

insert into platform_modules (code,title,is_active)
values ('24-loan-ledger','دفتر حساب تسهیلات و مانده تعهدات',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('ledger-code','کد دفتر حساب','text',true,10,'{}'),
 ('contract-code','کد قرارداد','text',true,20,'{}'),
 ('borrower-id','شناسه بدهکار','text',true,30,'{}'),
 ('transaction-date','تاریخ عملیات','date',true,40,'{}'),
 ('transaction-type','نوع عملیات','select',true,50,'{"options":["پرداخت اصل","ثبت سود","پرداخت سود","جریمه","بخشودگی","تعدیل","تسویه","برگشت پرداخت","سایر"]}'),
 ('reference-code','کد مرجع','text',false,60,'{}'),
 ('debit-amount','مبلغ بدهکار','number',false,70,'{}'),
 ('credit-amount','مبلغ بستانکار','number',false,80,'{}'),
 ('principal-balance','مانده اصل','number',true,90,'{}'),
 ('interest-balance','مانده سود','number',true,100,'{}'),
 ('penalty-balance','مانده جریمه','number',false,110,'{}'),
 ('total-balance','مانده کل','number',true,120,'{}'),
 ('payment-method','روش پرداخت','select',false,130,'{"options":["واریز بانکی","انتقال داخلی","پرداخت نقدی","کسر از حساب","سایر"]}'),
 ('posting-status','وضعیت ثبت','select',true,140,'{"options":["پیش‌نویس","ثبت شده","تأیید شده","برگشت خورده","باطل شده"]}'),
 ('posted-by','ثبت‌کننده','text',false,150,'{}'),
 ('posted-at','زمان ثبت','datetime',false,160,'{}'),
 ('notes','یادداشت','textarea',false,170,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='24-loan-ledger'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده دفتر حساب','modules:24-loan-ledger:read'),
 ('write','ثبت و ویرایش عملیات','modules:24-loan-ledger:write'),
 ('delete','حذف عملیات','modules:24-loan-ledger:delete'),
 ('post','ثبت نهایی','modules:24-loan-ledger:post'),
 ('reverse','برگشت عملیات','modules:24-loan-ledger:reverse')
) v(action_code,title,permission)
where m.code='24-loan-ledger'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;
