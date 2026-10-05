-- MENU 15: INSTALLMENT COLLECTIONS
-- All menu-15 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('15-installment-collections','وصول اقساط',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('contract-code','شماره قرارداد','text',true,10,'{}'),
 ('installment-no','شماره قسط','number',true,20,'{}'),
 ('collection-date','تاریخ وصول','date',true,30,'{}'),
 ('amount','مبلغ وصولی','number',true,40,'{}'),
 ('payment-method','روش پرداخت','select',true,50,'{"options":["واریز بانکی","درگاه پرداخت","کارتخوان","پرداخت نقدی","تهاتر"]}'),
 ('payment-reference','مرجع پرداخت','text',false,60,'{}'),
 ('collector','ثبت‌کننده وصول','text',false,70,'{}'),
 ('collection-status','وضعیت وصول','select',true,80,'{"options":["ثبت اولیه","تأیید شده","رد شده","برگشت خورده","لغو شده"]}'),
 ('bank-account','حساب مقصد','text',false,90,'{}'),
 ('receipt-code','شماره رسید','text',false,100,'{}'),
 ('notes','یادداشت وصول','textarea',false,110,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='15-installment-collections'
on conflict(module_id,field_key) do update set
 title=excluded.title,field_type=excluded.field_type,required=excluded.required,
 sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:15-installment-collections:read'),
 ('write','ثبت و ویرایش','modules:15-installment-collections:write'),
 ('delete','حذف','modules:15-installment-collections:delete'),
 ('confirm','تأیید وصول','modules:15-installment-collections:confirm'),
 ('reverse','برگشت وصول','modules:15-installment-collections:reverse')
) v(action_code,title,permission)
where m.code='15-installment-collections'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 15 UI metadata is grouped here so the next build has one auditable change-set.
