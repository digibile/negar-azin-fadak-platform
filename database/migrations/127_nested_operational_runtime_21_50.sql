begin;

-- Canonical runtime identities for nested operational modules 21..50.
insert into platform_modules(id,code,title,core,parent_id,sort_order,is_active)
values
(90,'21-purchasing-supply','تأمین و خرید','commerce',null,21,true),
(91,'22-sales-revenue','فروش و درآمد','commerce',null,22,true),
(92,'23-inventory-warehouse','انبار و موجودی','commerce',null,23,true),
(93,'24-production','تولید','organization',null,24,true),
(94,'25-costing','بهای تمام‌شده','finance',null,25,true),
(95,'26-treasury-bank','خزانه و بانک','finance',null,26,true),
(96,'27-receivables','حساب‌های دریافتنی','finance',null,27,true),
(97,'28-payables','حساب‌های پرداختنی','finance',null,28,true),
(98,'29-wallet-ledger','دفتر کیف پول','finance',null,29,true),
(99,'30-projects-cost-centers','پروژه و مراکز هزینه','organization',null,30,true),
(100,'31-fixed-assets','دارایی‌های ثابت','finance',null,31,true),
(101,'32-tax-e-invoicing','مالیات و صورتحساب','finance',null,32,true),
(102,'33-budget-financial-control','بودجه و کنترل مالی','finance',null,33,true),
(103,'34-financial-commitments','تعهدات مالی','finance',null,34,true),
(104,'35-credit-financing','اعتبار و تأمین مالی','finance',null,35,true),
(105,'36-loans','تسهیلات','finance',null,36,true),
(106,'37-collateral-guarantees','وثایق و ضمانت‌ها','finance',null,37,true),
(107,'38-collections','وصول مطالبات','finance',null,38,true),
(108,'39-human-resources','منابع انسانی','organization',null,39,true),
(109,'40-ai-finance','هوش مالی','finance',null,40,true),
(110,'41-ai-documents-ocr','هوش اسناد و OCR','documents-content',null,41,true),
(111,'42-audit-internal-control','حسابرسی و کنترل داخلی','command-platform',null,42,true),
(112,'43-communication-hub','مرکز ارتباطات','communication',null,43,true),
(113,'44-marketing-content','بازاریابی و محتوا','communication',null,44,true),
(114,'45-search-analytics','جستجو و تحلیل','command-platform',null,45,true),
(115,'46-unified-applications','درخواست‌های یکپارچه','command-platform',null,46,true),
(116,'47-contracts-legal','قراردادها و حقوقی','documents-content',null,47,true),
(117,'48-shipping-delivery','ارسال و تحویل','commerce',null,48,true),
(118,'49-reconciliation','تطبیق و مغایرت‌گیری','finance',null,49,true),
(119,'50-release-health','سلامت انتشار','command-platform',null,50,true)
on conflict(id) do update set code=excluded.code,title=excluded.title,core=excluded.core,sort_order=excluded.sort_order,is_active=true;

insert into module_runtime(module_id,lifecycle,route,api_prefix,owner_team,description)
select id,'active','/modules/?code='||code,'/api/platform/modules/'||code,'platform',title
from platform_modules
where id between 90 and 119
on conflict(module_id) do update
set lifecycle='active',route=excluded.route,api_prefix=excluded.api_prefix,owner_team=excluded.owner_team,description=excluded.description,updated_at=now();

insert into module_permissions(module_id,permission)
select m.id,'modules:'||m.code||':'||a.action
from platform_modules m
cross join (values('read'),('write'),('delete')) a(action)
where m.id between 90 and 119
on conflict do nothing;

insert into role_permissions(role,permission)
select r.role,'modules:'||m.code||':'||r.action
from platform_modules m
cross join (values('admin','read'),('admin','write'),('admin','delete'),('manager','read'),('manager','write'),('viewer','read')) r(role,action)
where m.id between 90 and 119
on conflict do nothing;

insert into module_actions(module_id,action_code,title,permission)
select m.id,a.action,case a.action when 'read' then 'مشاهده' when 'write' then 'ثبت و ویرایش' else 'حذف' end,'modules:'||m.code||':'||a.action
from platform_modules m
cross join (values('read'),('write'),('delete')) a(action)
where m.id between 90 and 119
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
values
(90,'reference','مرجع','text',true,10,'{}'::jsonb),
(90,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(90,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(91,'reference','مرجع','text',true,10,'{}'::jsonb),
(91,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(91,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(92,'reference','مرجع','text',true,10,'{}'::jsonb),
(92,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(92,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(93,'reference','مرجع','text',true,10,'{}'::jsonb),
(93,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(93,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(94,'reference','مرجع','text',true,10,'{}'::jsonb),
(94,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(94,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(95,'reference','مرجع','text',true,10,'{}'::jsonb),
(95,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(95,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(96,'reference','مرجع','text',true,10,'{}'::jsonb),
(96,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(96,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(97,'reference','مرجع','text',true,10,'{}'::jsonb),
(97,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(97,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(98,'reference','مرجع','text',true,10,'{}'::jsonb),
(98,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(98,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(99,'reference','مرجع','text',true,10,'{}'::jsonb),
(99,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(99,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(100,'reference','مرجع','text',true,10,'{}'::jsonb),
(100,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(100,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(101,'reference','مرجع','text',true,10,'{}'::jsonb),
(101,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(101,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(102,'reference','مرجع','text',true,10,'{}'::jsonb),
(102,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(102,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(103,'reference','مرجع','text',true,10,'{}'::jsonb),
(103,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(103,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(104,'reference','مرجع','text',true,10,'{}'::jsonb),
(104,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(104,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(105,'reference','مرجع','text',true,10,'{}'::jsonb),
(105,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(105,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(106,'reference','مرجع','text',true,10,'{}'::jsonb),
(106,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(106,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(107,'reference','مرجع','text',true,10,'{}'::jsonb),
(107,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(107,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(108,'reference','مرجع','text',true,10,'{}'::jsonb),
(108,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(108,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(109,'reference','مرجع','text',true,10,'{}'::jsonb),
(109,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(109,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(110,'reference','مرجع','text',true,10,'{}'::jsonb),
(110,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(110,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(111,'reference','مرجع','text',true,10,'{}'::jsonb),
(111,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(111,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(112,'reference','مرجع','text',true,10,'{}'::jsonb),
(112,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(112,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(113,'reference','مرجع','text',true,10,'{}'::jsonb),
(113,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(113,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(114,'reference','مرجع','text',true,10,'{}'::jsonb),
(114,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(114,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(115,'reference','مرجع','text',true,10,'{}'::jsonb),
(115,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(115,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(116,'reference','مرجع','text',true,10,'{}'::jsonb),
(116,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(116,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(117,'reference','مرجع','text',true,10,'{}'::jsonb),
(117,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(117,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(118,'reference','مرجع','text',true,10,'{}'::jsonb),
(118,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(118,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb),
(119,'reference','مرجع','text',true,10,'{}'::jsonb),
(119,'description','توضیحات','textarea',false,20,'{}'::jsonb),
(119,'status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb)
on conflict(module_id,field_key) do update
set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

commit;
