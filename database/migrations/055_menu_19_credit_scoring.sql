-- MENU 19: CREDIT SCORING
-- All menu-19 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('19-credit-scoring','اعتبارسنجی و امتیاز اعتباری',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('scoring-code','کد اعتبارسنجی','text',true,10,'{}'),
 ('applicant-id','شناسه متقاضی','text',true,20,'{}'),
 ('application-code','کد درخواست اعتبار','text',false,30,'{}'),
 ('evaluation-date','تاریخ ارزیابی','date',true,40,'{}'),
 ('credit-score','امتیاز اعتباری','number',false,50,'{}'),
 ('risk-level','سطح ریسک','select',true,60,'{"options":["کم","متوسط","زیاد","بحرانی"]}'),
 ('income-score','امتیاز درآمد','number',false,70,'{}'),
 ('payment-history-score','امتیاز سابقه پرداخت','number',false,80,'{}'),
 ('debt-score','امتیاز تعهدات','number',false,90,'{}'),
 ('identity-score','امتیاز هویتی','number',false,100,'{}'),
 ('score-status','وضعیت ارزیابی','select',true,110,'{"options":["در انتظار بررسی","در حال ارزیابی","تکمیل شده","نیازمند بازبینی","باطل شده"]}'),
 ('reviewer','ارزیاب','text',false,120,'{}'),
 ('review-notes','یادداشت ارزیابی','textarea',false,130,'{}'),
 ('valid-until','اعتبار تا','date',false,140,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='19-credit-scoring'
on conflict(module_id,field_key) do update set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:19-credit-scoring:read'),
 ('write','ثبت و ویرایش','modules:19-credit-scoring:write'),
 ('delete','حذف','modules:19-credit-scoring:delete'),
 ('calculate','محاسبه امتیاز','modules:19-credit-scoring:calculate'),
 ('review','بازبینی ارزیابی','modules:19-credit-scoring:review')
) v(action_code,title,permission)
where m.code='19-credit-scoring'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 19 UI metadata is grouped here so the next build has one auditable change-set.
