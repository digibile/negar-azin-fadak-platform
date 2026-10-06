-- Restore the complete 01..50 canonical management navigation roots.
begin;

with seed(menu_key,title,path,sort_order,permission) as (values
('governance','حاکمیت و راهبری','/modules/?code=governance',1,'modules:governance:read'),
('identity','هویت و دسترسی','/modules/?code=identity',2,'modules:identity:read'),
('master-data','داده‌های پایه','/modules/?code=master-data',3,'modules:master-data:read'),
('customer-360','مشتری و پرونده 360','/modules/?code=customer-360',4,'modules:customer-360:read'),
('smart-calendar','تقویم هوشمند','/modules/?code=smart-calendar',5,'modules:smart-calendar:read'),
('business-rules','قوانین کسب‌وکار','/modules/?code=business-rules',6,'modules:business-rules:read'),
('sla','مدیریت SLA','/modules/?code=sla',7,'modules:sla:read'),
('accounting-finance','حسابداری و مالی','/modules/?code=accounting-finance',8,'modules:accounting-finance:read'),
('treasury-bank','خزانه و بانک','/modules/?code=treasury-bank',9,'modules:treasury-bank:read'),
('wallet-ledger','کیف پول و دفترکل','/modules/?code=wallet-ledger',10,'modules:wallet-ledger:read'),
('credit-facilities','اعتبارات و تسهیلات','/modules/?code=credit-facilities',11,'modules:credit-facilities:read'),
('12-credit-applications','درخواست‌های اعتبار','/modules/?code=12-credit-applications',12,null),
('13-loan-contracts','قراردادهای تسهیلات','/modules/?code=13-loan-contracts',13,null),
('14-installment-schedules','برنامه اقساط','/modules/?code=14-installment-schedules',14,null),
('15-installment-collections','وصول اقساط','/modules/?code=15-installment-collections',15,null),
('16-collateral-guarantees','وثایق و تضمین‌ها','/modules/?code=16-collateral-guarantees',16,null),
('17-digital-binder','زونکن دیجیتال','/modules/?code=17-digital-binder',17,null),
('18-identity-verification','احراز هویت','/modules/?code=18-identity-verification',18,null),
('19-credit-scoring','امتیازدهی اعتباری','/modules/?code=19-credit-scoring',19,null),
('20-credit-decisions','تصمیمات اعتباری','/modules/?code=20-credit-decisions',20,null),
('21-credit-committee','کمیته اعتباری','/modules/?code=21-credit-committee',21,null),
('22-credit-disbursement','پرداخت تسهیلات','/modules/?code=22-credit-disbursement',22,null),
('23-loan-settlement','تسویه تسهیلات','/modules/?code=23-loan-settlement',23,null),
('24-loan-ledger','دفترکل تسهیلات','/modules/?code=24-loan-ledger',24,null),
('25-loan-refunds','برگشت وجوه','/modules/?code=25-loan-refunds',25,null),
('26-loan-closure','بستن تسهیلات','/modules/?code=26-loan-closure',26,null),
('27-loan-delinquency','معوقات','/modules/?code=27-loan-delinquency',27,null),
('28-collection-workflow','گردش وصول','/modules/?code=28-collection-workflow',28,null),
('29-loan-restructuring','بازسازی تسهیلات','/modules/?code=29-loan-restructuring',29,null),
('30-loan-relief','مساعدت و بخشودگی','/modules/?code=30-loan-relief',30,null),
('31-loan-legal-cases','پرونده‌های حقوقی تسهیلات','/modules/?code=31-loan-legal-cases',31,null),
('32-form-builder','فرم‌ساز','/modules/?code=32-form-builder',32,null),
('33-menu-builder','منوساز','/modules/?code=33-menu-builder',33,null),
('34-page-builder','صفحه‌ساز','/modules/?code=34-page-builder',34,null),
('35-page-block-editor','ویرایشگر بلوک صفحه','/modules/?code=35-page-block-editor',35,null),
('36-page-templates','قالب‌های صفحه','/modules/?code=36-page-templates',36,null),
('37-frontend-sections','بخش‌های فرانت‌اند','/modules/?code=37-frontend-sections',37,null),
('38-navigation-rules','قوانین ناوبری','/modules/?code=38-navigation-rules',38,null),
('39-frontend-notifications','اعلان‌های فرانت‌اند','/modules/?code=39-frontend-notifications',39,null),
('40-notification-templates','قالب‌های اعلان','/modules/?code=40-notification-templates',40,null),
('41-documentation','مستندسازی','/modules/?code=41-documentation',41,null),
('42-document-approvals','تأیید اسناد','/modules/?code=42-document-approvals',42,null),
('43-document-versions','نسخه‌های اسناد','/modules/?code=43-document-versions',43,null),
('44-document-search','جستجوی اسناد','/modules/?code=44-document-search',44,null),
('45-document-retention','نگهداری اسناد','/modules/?code=45-document-retention',45,null),
('46-document-distribution','توزیع اسناد','/modules/?code=46-document-distribution',46,null),
('47-document-access-log','گزارش دسترسی اسناد','/modules/?code=47-document-access-log',47,null),
('48-document-audit-reports','گزارش حسابرسی اسناد','/modules/?code=48-document-audit-reports',48,null),
('49-document-compliance','انطباق اسناد','/modules/?code=49-document-compliance',49,null),
('50-document-governance','حاکمیت اسناد','/modules/?code=50-document-governance',50,null)
)
insert into menu_items(menu_key,title,path,sort_order,permission,children,is_active,parent_id)
select menu_key,title,path,sort_order,permission,'[]'::jsonb,true,null
from seed
on conflict(menu_key) where menu_key is not null do update
set title=excluded.title,
    path=excluded.path,
    sort_order=excluded.sort_order,
    permission=coalesce(excluded.permission,menu_items.permission),
    parent_id=null,
    is_active=true,
    updated_at=now();

insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible)
select m.id,p.code,true,m.sort_order,true
from menu_items m
cross join menu_panels p
where m.menu_key in ('governance','identity','master-data','customer-360','smart-calendar','business-rules','sla','accounting-finance','treasury-bank','wallet-ledger','credit-facilities','12-credit-applications','13-loan-contracts','14-installment-schedules','15-installment-collections','16-collateral-guarantees','17-digital-binder','18-identity-verification','19-credit-scoring','20-credit-decisions','21-credit-committee','22-credit-disbursement','23-loan-settlement','24-loan-ledger','25-loan-refunds','26-loan-closure','27-loan-delinquency','28-collection-workflow','29-loan-restructuring','30-loan-relief','31-loan-legal-cases','32-form-builder','33-menu-builder','34-page-builder','35-page-block-editor','36-page-templates','37-frontend-sections','38-navigation-rules','39-frontend-notifications','40-notification-templates','41-documentation','42-document-approvals','43-document-versions','44-document-search','45-document-retention','46-document-distribution','47-document-access-log','48-document-audit-reports','49-document-compliance','50-document-governance')
on conflict(menu_item_id,panel_code) do update
set is_shared=true,is_visible=true,sort_order=excluded.sort_order;

commit;
