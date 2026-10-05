-- MENU 13: LOAN CONTRACTS
-- All menu-13 schema changes are intentionally grouped in this single migration.
-- No demo/fake business records are inserted.

insert into platform_modules (code,title,is_active)
values ('13-loan-contracts','قراردادهای وام',true)
on conflict (code) do update set title=excluded.title,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('contract-code','شماره قرارداد','text',true,10,'{}'),
 ('application-code','کد درخواست اعتباری','text',false,20,'{}'),
 ('borrower-id','شناسه وام‌گیرنده','text',true,30,'{}'),
 ('credit-product','محصول اعتباری','text',true,40,'{}'),
 ('principal-amount','مبلغ اصل تسهیلات','number',true,50,'{}'),
 ('interest-rate','نرخ/کارمزد','number',false,60,'{}'),
 ('term-months','مدت قرارداد (ماه)','number',true,70,'{}'),
 ('installment-amount','مبلغ قسط','number',false,80,'{}'),
 ('start-date','تاریخ شروع','date',false,90,'{}'),
 ('maturity-date','تاریخ سررسید','date',false,100,'{}'),
 ('contract-status','وضعیت قرارداد','select',true,110,'{"options":["پیش‌نویس","فعال","تسویه‌شده","فسخ‌شده","خاتمه‌یافته"]}'),
 ('collateral-summary','خلاصه وثایق','textarea',false,120,'{}'),
 ('guarantor-summary','خلاصه ضامنین','textarea',false,130,'{}'),
 ('termination-reason','علت فسخ/خاتمه','textarea',false,140,'{}'),
 ('contract-notes','یادداشت قرارداد','textarea',false,150,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.code='13-loan-contracts'
on conflict(module_id,field_key) do update set
 title=excluded.title,field_type=excluded.field_type,required=excluded.required,
 sort_order=excluded.sort_order,options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده','modules:13-loan-contracts:read'),
 ('write','ثبت و ویرایش','modules:13-loan-contracts:write'),
 ('delete','حذف','modules:13-loan-contracts:delete'),
 ('terminate','فسخ و خاتمه','modules:13-loan-contracts:terminate')
) v(action_code,title,permission)
where m.code='13-loan-contracts'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

-- MENU 13 UI metadata is grouped here so the next build has one auditable change-set.
