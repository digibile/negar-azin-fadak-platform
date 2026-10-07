begin;

with roots(menu_key,title,path,sort_order,permission) as (values
('01-dashboard','پنل مدیریت','/admin',1,'modules:command-center:read'),
('02-organizations','پنل سازمان‌ها و شرکت‌ها','/modules/?code=02-organizations',2,'modules:governance:read'),
('03-users-access','پنل کاربران، نقش‌ها و دسترسی‌ها','/modules/?code=03-users-access',3,'modules:identity:read'),
('04-customers-360','پنل مشتریان و پرونده ۳۶۰','/modules/?code=04-customers-360',4,'modules:customer-360:read'),
('05-smart-calendar','پنل تقویم هوشمند','/modules/?code=05-smart-calendar',5,'modules:smart-calendar:read'),
('06-business-rules','پنل قوانین کسب‌وکار','/modules/?code=06-business-rules',6,'modules:business-rules:read'),
('07-sla','پنل مدیریت SLA','/modules/?code=07-sla',7,'modules:sla:read'),
('08-accounting-finance','پنل حسابداری و مالی','/modules/?code=08-accounting-finance',8,'modules:accounting-finance:read'),
('09-commerce-stores','پنل تجارت و فروشگاه‌ها','/modules/?code=09-commerce-stores',9,'modules:09-commerce-stores:read'),
('10-domains','پنل مدیریت دامنه‌ها','/modules/?code=09-commerce-stores&panel=domains',10,'modules:domain-management:read'),
('11-merchants','پنل پذیرندگان','/modules/?code=09-commerce-stores&panel=acceptors',11,'modules:acceptors:read'),
('12-sellers','پنل فروشندگان','/modules/?code=09-commerce-stores&panel=sellers',12,'modules:sellers:read'),
('13-payments-settlement','پنل پرداخت و تسویه','/modules/?code=10-wallet-ledger&panel=payments',13,'modules:payments-settlement:read'),
('14-form-builder','پنل فرم‌ساز','/modules/?code=16-page-builder&panel=form',14,'modules:page-builder:read'),
('15-menu-builder','پنل منوساز','/modules/?code=16-page-builder&panel=menu',15,'modules:page-builder:read'),
('16-page-builder','پنل صفحه‌ساز','/modules/?code=16-page-builder',16,'modules:page-builder:read'),
('17-frontend-management','پنل مدیریت فرانت‌اند','/modules/?code=16-page-builder&panel=frontend',17,'modules:frontend-management:read'),
('18-notifications','پنل اعلان‌ها','/modules/?code=18-notifications',18,'modules:communications:read'),
('19-documents-governance','پنل مستندات و حاکمیت اسناد','/modules/?code=19-documents-governance',19,'modules:documents-governance:read'),
('20-system-settings','پنل تنظیمات و مدیریت سامانه','/modules/?code=20-system-settings',20,'modules:governance:read')
)
insert into menu_items(menu_key,title,path,sort_order,permission,children,is_active,parent_id)
select menu_key,title,path,sort_order,permission,'[]'::jsonb,true,null from roots
on conflict(menu_key) where menu_key is not null do update
set title=excluded.title,path=excluded.path,sort_order=excluded.sort_order,
permission=excluded.permission,parent_id=null,is_active=true,updated_at=now();

with mapping(child_key,parent_key) as (values
('21-purchasing-supply','09-commerce-stores'),('22-sales-revenue','09-commerce-stores'),('23-inventory-warehouse','09-commerce-stores'),
('24-production','02-organizations'),('25-costing','08-accounting-finance'),('26-treasury-bank','08-accounting-finance'),
('27-receivables','08-accounting-finance'),('28-payables','08-accounting-finance'),('29-wallet-ledger','13-payments-settlement'),
('30-projects-cost-centers','02-organizations'),('31-fixed-assets','08-accounting-finance'),('32-tax-e-invoicing','08-accounting-finance'),
('33-budget-financial-control','08-accounting-finance'),('34-financial-commitments','08-accounting-finance'),('35-credit-financing','08-accounting-finance'),
('36-loans','08-accounting-finance'),('37-collateral-guarantees','08-accounting-finance'),('38-collections','08-accounting-finance'),
('39-human-resources','02-organizations'),('40-ai-finance','08-accounting-finance'),('41-ai-documents-ocr','19-documents-governance'),
('42-audit-internal-control','19-documents-governance'),('43-communication-hub','18-notifications'),('44-marketing-content','04-customers-360'),
('45-search-analytics','01-dashboard'),('46-unified-applications','20-system-settings'),('47-contracts-legal','19-documents-governance'),
('48-shipping-delivery','09-commerce-stores'),('49-reconciliation','13-payments-settlement'),('50-release-health','20-system-settings')
)
update menu_items c set parent_id=p.id,updated_at=now()
from mapping x join menu_items p on p.menu_key=x.parent_key
where c.menu_key=x.child_key and c.menu_key is not null;

update menu_items set is_active=false,parent_id=null,updated_at=now()
where menu_key in ('governance','identity','master-data','customer-360','treasury-bank','wallet-ledger','credit-facilities')
and menu_key not in ('08-accounting-finance');

commit;