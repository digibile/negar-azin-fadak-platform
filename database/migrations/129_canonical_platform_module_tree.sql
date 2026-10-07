begin;

insert into platform_modules(code,title,core,parent_id,sort_order,is_active)
values
('01-dashboard','پنل مدیریت','command-platform',null,1,true),
('02-organizations','پنل سازمان‌ها و شرکت‌ها','organization',null,2,true),
('03-users-access','پنل کاربران، نقش‌ها و دسترسی‌ها','identity',null,3,true),
('04-customers-360','پنل مشتریان و پرونده ۳۶۰','crm',null,4,true),
('05-smart-calendar','پنل تقویم هوشمند','smart-calendar',null,5,true),
('06-business-rules','پنل قوانین کسب‌وکار','business-rules',null,6,true),
('07-sla','پنل مدیریت SLA','sla-management',null,7,true),
('08-accounting-finance','پنل حسابداری و مالی','accounting-finance',null,8,true),
('09-commerce-stores','پنل تجارت و فروشگاه‌ها','marketplace',null,9,true),
('10-domains','پنل مدیریت دامنه‌ها','domain-management',null,10,true),
('11-merchants','پنل پذیرندگان','acceptors',null,11,true),
('12-sellers','پنل فروشندگان','sellers',null,12,true),
('13-payments-settlement','پنل پرداخت و تسویه','payments-settlement',null,13,true),
('14-form-builder','پنل فرم‌ساز','page-builder',null,14,true),
('15-menu-builder','پنل منوساز','page-builder',null,15,true),
('16-page-builder','پنل صفحه‌ساز','page-builder',null,16,true),
('17-frontend-management','پنل مدیریت فرانت‌اند','frontend-management',null,17,true),
('18-notifications','پنل اعلان‌ها','communications',null,18,true),
('19-documents-governance','پنل مستندات و حاکمیت اسناد','documents-governance',null,19,true),
('20-system-settings','پنل تنظیمات و مدیریت سامانه','governance',null,20,true)
on conflict (code) do update set
title=excluded.title,
core=excluded.core,
sort_order=excluded.sort_order,
is_active=excluded.is_active;

with mapping(child_code,parent_code) as (values
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
update platform_modules c
set parent_id=p.id
from mapping x
join platform_modules p on p.code=x.parent_code
where c.code=x.child_code;

commit;