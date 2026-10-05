-- MENU 14: INSTALLMENT SCHEDULES
-- All menu-14 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('14-installment-schedules','برنامه اقساط و بازپرداخت',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('contract-code','شماره قرارداد','text',true,10,'{}'),
 ('installment-no','شماره قسط','number',true,20,'{}'),
 ('due-date','تاریخ سررسید','date',true,30,'{}'),
 ('principal-amount','سهم اصل قسط','number',true,40,'{}'),
 ('interest-amount','سهم سود/کارمزد','number',false,50,'{}'),
 ('total-amount','مبلغ کل قسط','number',true,60,'{}'),
 ('paid-amount','مبلغ پرداخت‌شده','number',false,70,'{}'),
 ('payment-date','تاریخ پرداخت','date',false,80,'{}'),
 ('installment-status','وضعیت قسط','select',true,90,'{"options":["برنامه‌ریزی‌شده","سررسید شده","پرداخت ناقص","پرداخت‌شده","معوق","بخشوده"]}'),
 ('payment-reference','مرجع پرداخت','text',false,100,'{}'),
 ('late-fee','جریمه دیرکرد','number',false,110,'{}'),
 ('notes','یادداشت','textarea',false,120,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='14-installment-schedules'
on conflict(module_id,field_key) do update set
 title=excluded.title,field_type=excluded.field_type,required=excluded.required,
 sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:14-installment-schedules:read'),
 ('write','ثبت و ویرایش','modules:14-installment-schedules:write'),
 ('delete','حذف','modules:14-installment-schedules:delete'),
 ('settle','ثبت پرداخت','modules:14-installment-schedules:settle')
) v(action_code,title,permission)
where m.code='14-installment-schedules'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 14 UI metadata is grouped here so the next build has one auditable change-set.
