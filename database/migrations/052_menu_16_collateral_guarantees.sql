-- MENU 16: COLLATERAL AND GUARANTEES
-- All menu-16 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('16-collateral-guarantees','وثایق و ضمانت‌ها',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('contract-code','شماره قرارداد','text',true,10,'{}'),
 ('record-type','نوع تضمین','select',true,20,'{"options":["وثیقه","ضامن"]}'),
 ('security-code','کد وثیقه یا ضمانت','text',true,30,'{}'),
 ('person-id','شناسه مالک یا ضامن','text',true,40,'{}'),
 ('security-type','نوع وثیقه / ضمانت','select',true,50,'{"options":["ملک","خودرو","سپرده بانکی","ضمانت شخصی","چک","سفته","سایر"]}'),
 ('description','شرح','textarea',false,60,'{}'),
 ('estimated-value','ارزش برآوردی','number',false,70,'{}'),
 ('accepted-value','ارزش پذیرفته‌شده','number',false,80,'{}'),
 ('valuation-date','تاریخ ارزیابی','date',false,90,'{}'),
 ('document-reference','مرجع سند','text',false,100,'{}'),
 ('guarantee-limit','سقف ضمانت','number',false,110,'{}'),
 ('security-status','وضعیت','select',true,120,'{"options":["ثبت اولیه","در انتظار ارزیابی","تأیید شده","در رهن","آزاد شده","رد شده"]}'),
 ('release-date','تاریخ آزادسازی','date',false,130,'{}'),
 ('notes','یادداشت','textarea',false,140,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='16-collateral-guarantees'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:16-collateral-guarantees:read'),
 ('write','ثبت و ویرایش','modules:16-collateral-guarantees:write'),
 ('delete','حذف','modules:16-collateral-guarantees:delete'),
 ('evaluate','ثبت ارزیابی','modules:16-collateral-guarantees:evaluate'),
 ('release','آزادسازی','modules:16-collateral-guarantees:release')
) v(action_code,title,permission)
where m.code='16-collateral-guarantees'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 16 UI metadata is grouped here so the next build has one auditable change-set.
