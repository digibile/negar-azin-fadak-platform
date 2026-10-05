-- MENU 12: CREDIT APPLICATIONS
-- All menu-12 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('12-credit-applications','درخواست‌های اعتباری',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('application-code','کد درخواست','text',true,10,'{}'),
 ('applicant-id','شناسه متقاضی','text',true,20,'{}'),
 ('credit-product','محصول اعتباری','text',true,30,'{}'),
 ('requested-amount','مبلغ درخواستی','number',true,40,'{}'),
 ('requested-term','مدت درخواستی (ماه)','number',false,50,'{}'),
 ('purpose','هدف مصرف اعتبار','textarea',false,60,'{}'),
 ('application-status','وضعیت درخواست','select',true,70,'{"options":["ثبت اولیه","در حال بررسی","نیازمند تکمیل مدارک","در انتظار اعتبارسنجی","تأیید شده","رد شده","لغو شده"]}'),
 ('submitted-at','تاریخ ثبت','datetime',false,80,'{}'),
 ('review-notes','یادداشت بررسی','textarea',false,90,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='12-credit-applications'
on conflict(module_id,field_key) do update set
 title=excluded.title,field_type=excluded.field_type,required=excluded.required,
 sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:12-credit-applications:read'),
 ('write','ثبت و ویرایش','modules:12-credit-applications:write'),
 ('delete','حذف','modules:12-credit-applications:delete'),
 ('review','بررسی درخواست','modules:12-credit-applications:review')
) v(action_code,title,permission)
where m.code='12-credit-applications'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 12 UI metadata is grouped here so the next build has one auditable change-set.
