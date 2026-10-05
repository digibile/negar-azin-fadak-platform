-- MENU 26: LOAN CLOSURE & RELEASE
-- One auditable migration for menu 26. No demo business records.

insert into platform_modules (code,title,is_active)
values ('26-loan-closure','بستن تسهیلات و آزادسازی تعهدات',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('closure-code','کد خاتمه','text',true,10,'{}'),
 ('contract-code','کد قرارداد','text',true,20,'{}'),
 ('borrower-id','شناسه بدهکار','text',true,30,'{}'),
 ('closure-request-date','تاریخ درخواست خاتمه','date',true,40,'{}'),
 ('closure-date','تاریخ خاتمه','date',false,50,'{}'),
 ('closure-type','نوع خاتمه','select',true,60,'{"options":["تسویه کامل","اتمام مدت قرارداد","فسخ قرارداد","تسویه توافقی","ابطال قرارداد"]}'),
 ('principal-balance','مانده اصل','number',true,70,'{}'),
 ('interest-balance','مانده سود','number',false,80,'{}'),
 ('penalty-balance','مانده جریمه','number',false,90,'{}'),
 ('final-balance','مانده نهایی','number',true,100,'{}'),
 ('collateral-status','وضعیت وثایق','select',true,110,'{"options":["در انتظار آزادسازی","آزادسازی کامل","آزادسازی جزئی","بدون وثیقه","دارای مانده تعهد"]}'),
 ('guarantee-status','وضعیت ضمانت‌ها','select',true,120,'{"options":["در انتظار آزادسازی","آزادسازی کامل","آزادسازی جزئی","بدون ضامن","دارای مانده تعهد"]}'),
 ('release-reference','مرجع آزادسازی','text',false,130,'{}'),
 ('approval-status','وضعیت تأیید','select',true,140,'{"options":["در انتظار بررسی","تأیید شده","رد شده","نیازمند اصلاح"]}'),
 ('closure-status','وضعیت خاتمه','select',true,150,'{"options":["درخواست اولیه","در حال بررسی","آماده خاتمه","مختومه","نیازمند اقدام","لغو شده"]}'),
 ('approved-by','تأییدکننده','text',false,160,'{}'),
 ('closed-by','مختومه‌کننده','text',false,170,'{}'),
 ('closed-at','زمان خاتمه','datetime',false,180,'{}'),
 ('notes','یادداشت','textarea',false,190,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='26-loan-closure'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده پرونده‌های خاتمه','modules:26-loan-closure:read'),
 ('write','ثبت و ویرایش','modules:26-loan-closure:write'),
 ('delete','حذف','modules:26-loan-closure:delete'),
 ('review','بررسی خاتمه','modules:26-loan-closure:review'),
 ('approve','تأیید خاتمه','modules:26-loan-closure:approve'),
 ('close','ثبت خاتمه نهایی','modules:26-loan-closure:close'),
 ('release','ثبت آزادسازی تعهدات','modules:26-loan-closure:release'),
 ('cancel','لغو درخواست','modules:26-loan-closure:cancel')
) v(action_code,title,permission)
where m.code='26-loan-closure'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;
