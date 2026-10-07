begin;

insert into platform_modules(code,title,core,parent_id,sort_order,is_active)
values
('21-purchasing-supply','خرید و تأمین','commerce',(select id from platform_modules where code='09-commerce-stores' and is_active=true limit 1),21,true),
('22-sales-revenue','فروش و درآمد','commerce',(select id from platform_modules where code='09-commerce-stores' and is_active=true limit 1),22,true),
('23-inventory-warehouse','موجودی و انبار','commerce',(select id from platform_modules where code='09-commerce-stores' and is_active=true limit 1),23,true),
('24-production','تولید و عملیات تولید','organization',(select id from platform_modules where code='02-organizations' and is_active=true limit 1),24,true),
('25-costing','بهای تمام‌شده','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),25,true),
('26-treasury-bank','خزانه و بانک','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),26,true),
('27-receivables','حساب‌های دریافتنی','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),27,true),
('28-payables','حساب‌های پرداختنی','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),28,true),
('29-wallet-ledger','دفتر کیف پول','finance',(select id from platform_modules where code='13-payments-settlement' and is_active=true limit 1),29,true),
('30-projects-cost-centers','پروژه و مراکز هزینه','organization',(select id from platform_modules where code='02-organizations' and is_active=true limit 1),30,true),
('31-fixed-assets','دارایی‌های ثابت','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),31,true),
('32-tax-e-invoicing','مالیات و صورتحساب','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),32,true),
('33-budget-financial-control','بودجه و کنترل مالی','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),33,true),
('34-financial-commitments','تعهدات مالی','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),34,true),
('35-credit-financing','اعتبار و تأمین مالی','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),35,true),
('36-loans','تسهیلات','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),36,true),
('37-collateral-guarantees','وثایق و ضمانت‌ها','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),37,true),
('38-collections','وصول مطالبات','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),38,true),
('39-human-resources','منابع انسانی','organization',(select id from platform_modules where code='02-organizations' and is_active=true limit 1),39,true),
('40-ai-finance','هوش مالی','finance',(select id from platform_modules where code='08-accounting-finance' and is_active=true limit 1),40,true),
('41-ai-documents-ocr','هوش اسناد و OCR','documents-content',(select id from platform_modules where code='19-documents-governance' and is_active=true limit 1),41,true),
('42-audit-internal-control','حسابرسی و کنترل داخلی','command-platform',(select id from platform_modules where code='19-documents-governance' and is_active=true limit 1),42,true),
('43-communication-hub','مرکز ارتباطات','communication',(select id from platform_modules where code='18-notifications' and is_active=true limit 1),43,true),
('44-marketing-content','بازاریابی و محتوا','communication',(select id from platform_modules where code='04-customers-360' and is_active=true limit 1),44,true),
('45-search-analytics','جستجو و تحلیل','command-platform',(select id from platform_modules where code='01-dashboard' and is_active=true limit 1),45,true),
('46-unified-applications','درخواست‌های یکپارچه','command-platform',(select id from platform_modules where code='20-system-settings' and is_active=true limit 1),46,true),
('47-contracts-legal','قراردادها و حقوقی','documents-content',(select id from platform_modules where code='19-documents-governance' and is_active=true limit 1),47,true),
('48-shipping-delivery','ارسال و تحویل','commerce',(select id from platform_modules where code='09-commerce-stores' and is_active=true limit 1),48,true),
('49-reconciliation','تطبیق و مغایرت‌گیری','finance',(select id from platform_modules where code='13-payments-settlement' and is_active=true limit 1),49,true),
('50-release-health','سلامت انتشار','command-platform',(select id from platform_modules where code='20-system-settings' and is_active=true limit 1),50,true)
on conflict (code) do update set
title=excluded.title, core=excluded.core, parent_id=excluded.parent_id,
sort_order=excluded.sort_order, is_active=excluded.is_active;

insert into module_runtime(module_id,lifecycle,route,api_prefix,owner_team,description)
select id,'active','/modules/?code='||code,'/api/platform/modules/'||code,'platform',title
from platform_modules where code between '21' and '50'
on conflict(module_id) do update set lifecycle=excluded.lifecycle,route=excluded.route,api_prefix=excluded.api_prefix,owner_team=excluded.owner_team,description=excluded.description;

insert into module_permissions(module_id,permission)
select m.id,'modules:'||m.code||':'||a.action
from platform_modules m cross join (values('read'),('write'),('delete')) a(action)
where substring(m.code,1,2)::int between 21 and 50
on conflict do nothing;

insert into role_permissions(role,permission)
select r.role,'modules:'||m.code||':'||r.action
from platform_modules m cross join (values('admin','read'),('admin','write'),('admin','delete'),('manager','read'),('manager','write'),('viewer','read')) r(role,action)
where substring(m.code,1,2)::int between 21 and 50
on conflict do nothing;

insert into module_actions(module_id,action_code,title,permission)
select m.id,a.action,case a.action when 'read' then 'مشاهده' when 'write' then 'ثبت و ویرایش' else 'حذف' end,'modules:'||m.code||':'||a.action
from platform_modules m cross join (values('read'),('write'),('delete')) a(action)
where substring(m.code,1,2)::int between 21 and 50
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission,is_active=true;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,f.field_key,f.title,f.field_type,f.required,f.sort_order,f.options
from platform_modules m
cross join (values
('reference','مرجع','text',true,10,'{}'::jsonb),
('description','توضیحات','textarea',false,20,'{}'::jsonb),
('status','وضعیت','select',true,30,'{"options":["active","pending","closed"]}'::jsonb)
) f(field_key,title,field_type,required,sort_order,options)
where substring(m.code,1,2)::int between 21 and 50
on conflict(module_id,field_key) do update
set title=excluded.title,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options=excluded.options;

commit;
