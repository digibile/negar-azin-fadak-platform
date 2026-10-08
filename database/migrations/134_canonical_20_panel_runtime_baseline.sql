begin;

create temp table canonical_panels(code text primary key,title text not null,route text not null,api_prefix text not null,owner_team text not null,description text not null) on commit drop;

insert into canonical_panels(code,title,route,api_prefix,owner_team,description) values
('01-dashboard','پنل مدیریت','/admin','/api/platform/modules/01-dashboard','platform','مرکز مدیریت و فرماندهی سامانه'),
('02-organizations','پنل سازمان‌ها و شرکت‌ها','/modules/?code=02-organizations','/api/platform/modules/02-organizations','platform','ساختار سازمانی، شرکت‌ها و واحدهای سازمان'),
('03-users-access','پنل کاربران، نقش‌ها و دسترسی‌ها','/modules/?code=03-users-access','/api/platform/modules/03-users-access','platform','هویت، کاربران، نقش‌ها و دسترسی‌ها'),
('04-customers-360','پنل مشتریان و پرونده ۳۶۰','/modules/?code=04-customers-360','/api/platform/modules/04-customers-360','platform','پرونده یکپارچه مشتری و تعاملات'),
('05-smart-calendar','پنل تقویم هوشمند','/modules/?code=05-smart-calendar','/api/platform/modules/05-smart-calendar','platform','تقویم، تعطیلات و زمان‌بندی سازمانی'),
('06-business-rules','پنل قوانین کسب‌وکار','/modules/?code=06-business-rules','/api/platform/modules/06-business-rules','platform','قوانین، گردش کار و اتوماسیون'),
('07-sla','پنل مدیریت SLA','/modules/?code=07-sla','/api/platform/modules/07-sla','platform','سطوح خدمت و تعهدات'),
('08-accounting-finance','پنل حسابداری و مالی','/modules/?code=08-accounting-finance','/api/platform/modules/08-accounting-finance','platform','حسابداری، مالی، خزانه و کنترل مالی'),
('09-commerce-stores','پنل تجارت و فروشگاه‌ها','/modules/?code=09-commerce-stores','/api/platform/modules/09-commerce-stores','platform','تجارت، فروشگاه و بازارگاه'),
('10-domains','پنل مدیریت دامنه‌ها','/modules/?code=09-commerce-stores&panel=domains','/api/platform/modules/10-domains','platform','دامنه‌ها، اتصال و SSL'),
('11-merchants','پنل پذیرندگان','/modules/?code=09-commerce-stores&panel=acceptors','/api/platform/modules/11-merchants','platform','مدیریت پذیرندگان و چرخه احراز و تسویه'),
('12-sellers','پنل فروشندگان','/modules/?code=09-commerce-stores&panel=sellers','/api/platform/modules/12-sellers','platform','فروشندگان، فروشگاه‌ها و عملیات فروشنده'),
('13-payments-settlement','پنل پرداخت و تسویه','/modules/?code=10-wallet-ledger&panel=payments','/api/platform/modules/13-payments-settlement','platform','پرداخت، درگاه، کیف پول و تسویه'),
('14-form-builder','پنل فرم‌ساز','/modules/?code=16-page-builder&panel=form','/api/platform/modules/14-form-builder','platform','ساخت، اعتبارسنجی، انتشار و دریافت فرم'),
('15-menu-builder','پنل منوساز','/modules/?code=16-page-builder&panel=menu','/api/platform/modules/15-menu-builder','platform','ساختار، مجوز و انتشار منو'),
('16-page-builder','پنل صفحه‌ساز','/modules/?code=16-page-builder','/api/platform/modules/16-page-builder','platform','صفحه، نسخه، قالب و انتشار'),
('17-frontend-management','پنل مدیریت فرانت‌اند','/modules/?code=16-page-builder&panel=frontend','/api/platform/modules/17-frontend-management','platform','مدیریت قالب و بخش‌های فرانت‌اند'),
('18-notifications','پنل اعلان‌ها','/modules/?code=18-notifications','/api/platform/modules/18-notifications','platform','مرکز اعلان، کانال‌ها و صف ارسال'),
('19-documents-governance','پنل مستندات و حاکمیت اسناد','/modules/?code=19-documents-governance','/api/platform/modules/19-documents-governance','platform','اسناد، حاکمیت، حسابرسی و دسترسی'),
('20-system-settings','پنل تنظیمات و مدیریت سامانه','/modules/?code=20-system-settings','/api/platform/modules/20-system-settings','platform','تنظیمات مرکزی و یکپارچه‌سازی سامانه');

insert into platform_modules(code,title,core,sort_order,is_active,parent_id)
select code,title,'canonical-panel',row_number() over (),true,null from canonical_panels
on conflict(code) do update set title=excluded.title,core='canonical-panel',sort_order=excluded.sort_order,is_active=true,parent_id=null;

insert into module_runtime(module_id,lifecycle,route,api_prefix,owner_team,description)
select m.id,'active',p.route,p.api_prefix,p.owner_team,p.description from platform_modules m join canonical_panels p on p.code=m.code
on conflict(module_id) do update set lifecycle=excluded.lifecycle,route=excluded.route,api_prefix=excluded.api_prefix,owner_team=excluded.owner_team,description=excluded.description;

insert into module_permissions(module_id,permission)
select m.id,'modules:'||m.code||':'||a.action from platform_modules m join canonical_panels p on p.code=m.code cross join (values('read'),('write'),('delete')) a(action)
on conflict do nothing;

insert into module_actions(module_id,action_code,title,permission)
select m.id,a.action,case a.action when 'read' then 'مشاهده' when 'write' then 'ثبت و ویرایش' else 'حذف' end,'modules:'||m.code||':'||a.action
from platform_modules m join canonical_panels p on p.code=m.code cross join (values('read'),('write'),('delete')) a(action)
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission,is_active=true;

insert into role_permissions(role,permission)
select r.role,'modules:'||m.code||':'||r.action from platform_modules m join canonical_panels p on p.code=m.code cross join (values
('admin','read'),('admin','write'),('admin','delete'),('manager','read'),('manager','write'),('viewer','read')) r(role,action)
on conflict do nothing;

commit;
