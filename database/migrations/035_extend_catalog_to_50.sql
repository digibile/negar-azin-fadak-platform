-- Extend the canonical operational catalog from 45 to 50 modules.
-- These are real platform capabilities backed by the existing tenant-safe module runtime.

insert into platform_modules(id,code,title,core,parent_id,sort_order,is_active)
values
(46,'risk-compliance','ریسک و انطباق','command-platform',null,46,true),
(47,'branch-network','شعب و شبکه','command-platform',null,47,true),
(48,'procurement-supply','تأمین و تدارکات','command-platform',null,48,true),
(49,'customer-experience','تجربه مشتری و وفاداری','command-platform',null,49,true),
(50,'service-lifecycle','مدیریت انتشار و چرخه سرویس','command-platform',null,50,true)
on conflict (id) do update set
  code=excluded.code,
  title=excluded.title,
  core=excluded.core,
  sort_order=excluded.sort_order,
  is_active=excluded.is_active;

insert into module_permissions(module_id,permission)
select m.id,'modules:'||m.code||':'||a.action
from platform_modules m
cross join (values ('read'),('write'),('delete')) a(action)
where m.id between 46 and 50
on conflict do nothing;

insert into module_runtime(module_id,lifecycle,route,api_prefix,owner_team,description)
select id,'active','/modules/'||code,'/api/platform/modules/'||code,'platform',title
from platform_modules
where id between 46 and 50
on conflict(module_id) do update set
  lifecycle=excluded.lifecycle,
  route=excluded.route,
  api_prefix=excluded.api_prefix,
  owner_team=excluded.owner_team,
  description=excluded.description,
  updated_at=now();

insert into module_actions(module_id,action_code,title,permission)
select m.id,a.action,'مشاهده','modules:'||m.code||':read'
from platform_modules m cross join (values ('read')) a(action)
where m.id between 46 and 50
on conflict(module_id,action_code) do nothing;

insert into module_actions(module_id,action_code,title,permission)
select m.id,a.action,case a.action when 'write' then 'ثبت و ویرایش' else 'حذف' end,'modules:'||m.code||':'||a.action
from platform_modules m cross join (values ('write'),('delete')) a(action)
where m.id between 46 and 50
on conflict(module_id,action_code) do nothing;

insert into role_permissions(role,permission)
select r.role,'modules:'||m.code||':'||r.action
from platform_modules m
cross join (values ('admin','read'),('admin','write'),('admin','delete'),('manager','read'),('manager','write'),('viewer','read')) r(role,action)
where m.id between 46 and 50
on conflict do nothing;

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
values
(46,'risk-code','شناسه پرونده ریسک','text',true,10,'{}'::jsonb),
(46,'risk-level','سطح ریسک','select',true,20,'{"options":["low","medium","high","critical"]}'::jsonb),
(46,'risk-owner','مسئول پیگیری','text',true,30,'{}'::jsonb),
(46,'risk-review-date','تاریخ بازبینی','date',false,40,'{}'::jsonb),
(46,'risk-notes','شرح و اقدامات کنترلی','textarea',false,50,'{}'::jsonb),

(47,'branch-code','کد شعبه','text',true,10,'{}'::jsonb),
(47,'branch-name','نام شعبه','text',true,20,'{}'::jsonb),
(47,'branch-manager','مدیر شعبه','text',false,30,'{}'::jsonb),
(47,'branch-city','شهر','text',true,40,'{}'::jsonb),
(47,'branch-status','وضعیت شعبه','select',true,50,'{"options":["active","pending","closed"]}'::jsonb),

(48,'supplier-code','کد تأمین‌کننده','text',true,10,'{}'::jsonb),
(48,'supplier-name','نام تأمین‌کننده','text',true,20,'{}'::jsonb),
(48,'contract-value','ارزش قرارداد','number',false,30,'{}'::jsonb),
(48,'contract-start','شروع قرارداد','date',false,40,'{}'::jsonb),
(48,'contract-end','پایان قرارداد','date',false,50,'{}'::jsonb),
(48,'procurement-notes','شرح تأمین و تعهدات','textarea',false,60,'{}'::jsonb),

(49,'customer-segment','گروه مشتری','select',true,10,'{"options":["new","active","loyal","at-risk","inactive"]}'::jsonb),
(49,'experience-channel','کانال تجربه','select',true,20,'{"options":["web","mobile","branch","call-center","seller"]}'::jsonb),
(49,'satisfaction-score','امتیاز رضایت','number',false,30,'{}'::jsonb),
(49,'loyalty-level','سطح وفاداری','select',false,40,'{"options":["standard","silver","gold","platinum"]}'::jsonb),
(49,'experience-notes','بازخورد مشتری','textarea',false,50,'{}'::jsonb),

(50,'release-code','شناسه انتشار','text',true,10,'{}'::jsonb),
(50,'release-version','نسخه','text',true,20,'{}'::jsonb),
(50,'release-environment','محیط','select',true,30,'{"options":["development","staging","production"]}'::jsonb),
(50,'release-status','وضعیت انتشار','select',true,40,'{"options":["planned","in-progress","approved","released","rolled-back"]}'::jsonb),
(50,'release-notes','یادداشت انتشار','textarea',false,50,'{}'::jsonb)
on conflict(module_id,field_key) do update set
  title=excluded.title,
  field_type=excluded.field_type,
  required=excluded.required,
  sort_order=excluded.sort_order,
  options=excluded.options;

with menu_seed(menu_key,title,path,sort_order,permission,children) as (
 values
 ('risk-compliance','ریسک و انطباق','/modules/?code=risk-compliance',460,'modules:risk-compliance:read',
  '["ثبت ریسک","ارزیابی ریسک","کنترل‌های داخلی","اقدامات اصلاحی","انطباق مقررات","ریسک اعتباری","ریسک عملیاتی","ریسک مالی","پرونده‌های پرریسک","گزارش ریسک"]'::jsonb),
 ('branch-network','شعب و شبکه','/modules/?code=branch-network',470,'modules:branch-network:read',
  '["شعب","مدیریت شعب","واحدهای خدماتی","مدیران شعب","ظرفیت شعب","عملکرد شعب","انتقال بین شعب","محدوده خدمت","تعطیلات شعب","گزارش شبکه"]'::jsonb),
 ('procurement-supply','تأمین و تدارکات','/modules/?code=procurement-supply',480,'modules:procurement-supply:read',
  '["تأمین‌کنندگان","درخواست تأمین","استعلام قیمت","مقایسه پیشنهادها","قرارداد تأمین","سفارش تأمین","کنترل تحویل","ارزیابی تأمین‌کننده","تسویه تأمین‌کنندگان","گزارش تأمین"]'::jsonb),
 ('customer-experience','تجربه مشتری و وفاداری','/modules/?code=customer-experience',490,'modules:customer-experience:read',
  '["مشتری 360","نظرسنجی","امتیاز رضایت","باشگاه مشتریان","سطح وفاداری","پاداش‌ها","کمپین وفاداری","شکایت و بازخورد","سفر مشتری","تحلیل تجربه"]'::jsonb),
 ('service-lifecycle','مدیریت انتشار و چرخه سرویس','/modules/?code=service-lifecycle',500,'modules:service-lifecycle:read',
  '["نسخه‌ها","برنامه انتشار","محیط‌ها","تأیید انتشار","استقرار","بازگشت نسخه","یادداشت انتشار","سلامت سرویس","تغییرات","گزارش چرخه سرویس"]'::jsonb)
),
updated_menu as (
 update menu_items m
 set title=s.title,path=s.path,sort_order=s.sort_order,permission=s.permission,children=s.children,is_active=true,updated_at=now()
 from menu_seed s
 where m.menu_key=s.menu_key
 returning m.menu_key
)
insert into menu_items(menu_key,title,path,sort_order,permission,children)
select s.menu_key,s.title,s.path,s.sort_order,s.permission,s.children
from menu_seed s
where not exists (select 1 from menu_items m where m.menu_key=s.menu_key);

with command_group as (
 select id from menu_items where path='/core/command' limit 1
)
update menu_items m
set parent_id=(select id from command_group)
where m.menu_key in ('risk-compliance','branch-network','procurement-supply','customer-experience','service-lifecycle');

insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible)
select m.id,p.code,true,m.sort_order,true
from menu_items m
cross join menu_panels p
where m.menu_key in ('risk-compliance','branch-network','procurement-supply','customer-experience','service-lifecycle')
on conflict(menu_item_id,panel_code) do update set
  is_shared=true,
  is_visible=true,
  sort_order=excluded.sort_order;

update platform_modules set is_active=true where id between 46 and 50;
