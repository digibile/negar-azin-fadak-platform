-- Canonical operational menu 12..50.
-- Preserves the existing 45-module catalog and adds the exact 12..50 operational
-- runtime codes used by the platform integrity contract and management navigation.
begin;

with seed(menu_key,title,path,sort_order,permission,children) as (values
('12-credit-applications','درخواست‌های اعتبار','/modules/?code=12-credit-applications',12,'modules:12-credit-applications:read','["درخواست جدید","کارتابل درخواست‌ها","بررسی مدارک","بررسی کارشناسی","وضعیت درخواست"]'::jsonb),
('13-loan-contracts','قراردادهای تسهیلات','/modules/?code=13-loan-contracts',13,'modules:13-loan-contracts:read','["قرارداد جدید","قراردادهای فعال","وثایق و ضامنین","فسخ و خاتمه","گزارش قراردادها"]'::jsonb),
('14-installment-schedules','برنامه اقساط','/modules/?code=14-installment-schedules',14,'modules:14-installment-schedules:read','["برنامه اقساط","سررسیدها","پرداخت اقساط","معوقات","تسویه اقساط"]'::jsonb),
('15-installment-collections','وصول اقساط','/modules/?code=15-installment-collections',15,'modules:15-installment-collections:read','["پرونده‌های وصول","ثبت وصول","وعده پرداخت","برگشت وصول","گزارش وصول"]'::jsonb),
('16-collateral-guarantees','وثایق و تضمین‌ها','/modules/?code=16-collateral-guarantees',16,'modules:16-collateral-guarantees:read','["وثایق","ضامنین","ارزیابی وثایق","آزادسازی","گزارش تضمین‌ها"]'::jsonb),
('17-digital-binder','زونکن دیجیتال','/modules/?code=17-digital-binder',17,'modules:17-digital-binder:read','["پرونده‌ها","مدارک هویتی","مدارک مالی","قراردادها","آرشیو دیجیتال"]'::jsonb),
('18-identity-verification','احراز هویت','/modules/?code=18-identity-verification',18,'modules:18-identity-verification:read','["درخواست احراز","مدارک هویتی","OCR","بررسی تطبیق","نتیجه احراز"]'::jsonb),
('19-credit-scoring','امتیازدهی اعتباری','/modules/?code=19-credit-scoring',19,'modules:19-credit-scoring:read','["مدل‌های امتیازدهی","پارامترها","محاسبه امتیاز","نتایج","تاریخچه"]'::jsonb),
('20-credit-decisions','تصمیمات اعتباری','/modules/?code=20-credit-decisions',20,'modules:20-credit-decisions:read','["پرونده‌های در انتظار","پیشنهاد تصمیم","تصمیم‌گیری","اعتراض و بازبینی","گزارش تصمیمات"]'::jsonb),
('21-credit-committee','کمیته اعتباری','/modules/?code=21-credit-committee',21,'modules:21-credit-committee:read','["جلسات کمیته","دستور جلسه","پرونده‌های ارجاعی","مصوبات","صورتجلسات"]'::jsonb),
('22-credit-disbursement','پرداخت تسهیلات','/modules/?code=22-credit-disbursement',22,'modules:22-credit-disbursement:read','["صف پرداخت","کنترل پرداخت","پرداخت","ثبت سند","گزارش پرداخت"]'::jsonb),
('23-loan-settlement','تسویه تسهیلات','/modules/?code=23-loan-settlement',23,'modules:23-loan-settlement:read','["درخواست تسویه","محاسبه مانده","تسویه زودهنگام","تسویه نهایی","گواهی تسویه"]'::jsonb),
('24-loan-ledger','دفترکل تسهیلات','/modules/?code=24-loan-ledger',24,'modules:24-loan-ledger:read','["دفترکل","گردش اصل","سود و کارمزد","تعدیلات","گزارش دفترکل"]'::jsonb),
('25-loan-refunds','برگشت وجوه','/modules/?code=25-loan-refunds',25,'modules:25-loan-refunds:read','["درخواست برگشت","بررسی برگشت","تأیید برگشت","ثبت تراکنش","گزارش برگشت"]'::jsonb),
('26-loan-closure','بستن تسهیلات','/modules/?code=26-loan-closure',26,'modules:26-loan-closure:read','["پرونده‌های آماده بستن","کنترل نهایی","تسویه اسناد","بستن پرونده","آرشیو"]'::jsonb),
('27-loan-delinquency','معوقات','/modules/?code=27-loan-delinquency',27,'modules:27-loan-delinquency:read','["اقساط معوق","پرونده‌های سررسید گذشته","محاسبه جریمه","اخطار","گزارش معوقات"]'::jsonb),
('28-collection-workflow','گردش وصول','/modules/?code=28-collection-workflow',28,'modules:28-collection-workflow:read','["صف وصول","اقدام وصول","وعده پرداخت","ارجاع","نتیجه اقدام"]'::jsonb),
('29-loan-restructuring','بازسازی تسهیلات','/modules/?code=29-loan-restructuring',29,'modules:29-loan-restructuring:read','["درخواست بازسازی","ارزیابی","طرح جدید","مصوبه","ثبت قرارداد جدید"]'::jsonb),
('30-loan-relief','مساعدت و بخشودگی','/modules/?code=30-loan-relief',30,'modules:30-loan-relief:read','["درخواست مساعدت","بخشودگی جرایم","تخفیف","مصوبه","گزارش بخشودگی"]'::jsonb),
('31-loan-legal-cases','پرونده‌های حقوقی','/modules/?code=31-loan-legal-cases',31,'modules:31-loan-legal-cases:read','["پرونده جدید","ارجاع حقوقی","اقدامات قضایی","اسناد حقوقی","نتیجه پرونده"]'::jsonb),
('32-form-builder','فرم‌ساز','/modules/?code=32-form-builder',32,'modules:32-form-builder:read','["فرم‌ها","فرم جدید","فیلدها","اعتبارسنجی","انتشار فرم"]'::jsonb),
('33-menu-builder','منوساز','/modules/?code=33-menu-builder',33,'modules:33-menu-builder:read','["درخت منو","منوی جدید","زیرمنوها","دسترسی منو","انتشار منو"]'::jsonb),
('34-page-builder','صفحه‌ساز','/modules/?code=34-page-builder',34,'modules:34-page-builder:read','["صفحات","صفحه جدید","بلوک‌ها","پیش‌نمایش","انتشار صفحه"]'::jsonb),
('35-page-block-editor','ویرایشگر بلوک صفحه','/modules/?code=35-page-block-editor',35,'modules:35-page-block-editor:read','["بلوک‌ها","ویرایش بلوک","تنظیمات بلوک","نسخه‌ها","انتشار"]'::jsonb),
('36-page-templates','قالب‌های صفحه','/modules/?code=36-page-templates',36,'modules:36-page-templates:read','["قالب‌ها","قالب جدید","پیش‌نمایش","نسخه‌ها","انتشار قالب"]'::jsonb),
('37-frontend-sections','بخش‌های فرانت‌اند','/modules/?code=37-frontend-sections',37,'modules:37-frontend-sections:read','["Header","Footer","Banner","Widgetها","بخش‌های سفارشی"]'::jsonb),
('38-navigation-rules','قوانین ناوبری','/modules/?code=38-navigation-rules',38,'modules:38-navigation-rules:read','["قواعد مسیر","شرایط دسترسی","Redirect","اولویت قواعد","آزمون ناوبری"]'::jsonb),
('39-frontend-notifications','اعلان‌های فرانت‌اند','/modules/?code=39-frontend-notifications',39,'modules:39-frontend-notifications:read','["اعلان‌ها","اعلان جدید","هدف‌گیری","زمان‌بندی","گزارش نمایش"]'::jsonb),
('40-notification-templates','قالب‌های اعلان','/modules/?code=40-notification-templates',40,'modules:40-notification-templates:read','["قالب پیام","قالب ایمیل","قالب SMS","Push","نسخه‌بندی"]'::jsonb),
('41-documentation','مستندسازی','/modules/?code=41-documentation',41,'modules:41-documentation:read','["اسناد","راهنماها","مقالات","نسخه‌ها","انتشار"]'::jsonb),
('42-document-approvals','تأیید اسناد','/modules/?code=42-document-approvals',42,'modules:42-document-approvals:read','["کارتابل تأیید","مراحل تأیید","تأیید","رد","تاریخچه"]'::jsonb),
('43-document-versions','نسخه‌های اسناد','/modules/?code=43-document-versions',43,'modules:43-document-versions:read','["نسخه‌ها","مقایسه نسخه","ایجاد نسخه","بازگردانی","تاریخچه"]'::jsonb),
('44-document-search','جستجوی اسناد','/modules/?code=44-document-search',44,'modules:44-document-search:read','["جستجوی متنی","جستجوی پیشرفته","فیلترها","جستجوی OCR","نتایج ذخیره‌شده"]'::jsonb),
('45-document-retention','نگهداری اسناد','/modules/?code=45-document-retention',45,'modules:45-document-retention:read','["قوانین نگهداری","دوره نگهداری","انقضا","امحا","گزارش نگهداری"]'::jsonb),
('46-document-distribution','توزیع اسناد','/modules/?code=46-document-distribution',46,'modules:46-document-distribution:read','["ارسال سند","گیرندگان","اشتراک‌گذاری","پیگیری دریافت","گزارش توزیع"]'::jsonb),
('47-document-access-log','لاگ دسترسی اسناد','/modules/?code=47-document-access-log',47,'modules:47-document-access-log:read','["دسترسی‌ها","مشاهده‌ها","دانلودها","تغییرات دسترسی","گزارش امنیتی"]'::jsonb),
('48-document-audit-reports','گزارش حسابرسی اسناد','/modules/?code=48-document-audit-reports',48,'modules:48-document-audit-reports:read','["گزارش حسابرسی","تغییرات","رویدادها","موارد مشکوک","خروجی گزارش"]'::jsonb),
('49-document-compliance','انطباق اسناد','/modules/?code=49-document-compliance',49,'modules:49-document-compliance:read','["قواعد انطباق","کنترل مدارک","موارد ناقص","اقدامات اصلاحی","گزارش انطباق"]'::jsonb),
('50-document-governance','حاکمیت اسناد','/modules/?code=50-document-governance',50,'modules:50-document-governance:read','["سیاست‌های اسناد","مالکیت","سطوح دسترسی","چرخه عمر","گزارش حاکمیت"]'::jsonb)
)
insert into menu_items(menu_key,title,path,sort_order,permission,children,is_active,parent_id)
select menu_key,title,path,sort_order,permission,children,true,null
from seed
on conflict(menu_key) where menu_key is not null do update
set title=excluded.title,path=excluded.path,sort_order=excluded.sort_order,
    permission=excluded.permission,children=excluded.children,is_active=true,updated_at=now();

with seed(menu_key,title,path,sort_order,permission,children) as (values
('12-credit-applications','درخواست‌های اعتبار','/modules/?code=12-credit-applications',12,'modules:12-credit-applications:read','["درخواست جدید","کارتابل درخواست‌ها","بررسی مدارک","بررسی کارشناسی","وضعیت درخواست"]'::jsonb),
('13-loan-contracts','قراردادهای تسهیلات','/modules/?code=13-loan-contracts',13,'modules:13-loan-contracts:read','["قرارداد جدید","قراردادهای فعال","وثایق و ضامنین","فسخ و خاتمه","گزارش قراردادها"]'::jsonb),
('14-installment-schedules','برنامه اقساط','/modules/?code=14-installment-schedules',14,'modules:14-installment-schedules:read','["برنامه اقساط","سررسیدها","پرداخت اقساط","معوقات","تسویه اقساط"]'::jsonb),
('15-installment-collections','وصول اقساط','/modules/?code=15-installment-collections',15,'modules:15-installment-collections:read','["پرونده‌های وصول","ثبت وصول","وعده پرداخت","برگشت وصول","گزارش وصول"]'::jsonb),
('16-collateral-guarantees','وثایق و تضمین‌ها','/modules/?code=16-collateral-guarantees',16,'modules:16-collateral-guarantees:read','["وثایق","ضامنین","ارزیابی وثایق","آزادسازی","گزارش تضمین‌ها"]'::jsonb),
('17-digital-binder','زونکن دیجیتال','/modules/?code=17-digital-binder',17,'modules:17-digital-binder:read','["پرونده‌ها","مدارک هویتی","مدارک مالی","قراردادها","آرشیو دیجیتال"]'::jsonb),
('18-identity-verification','احراز هویت','/modules/?code=18-identity-verification',18,'modules:18-identity-verification:read','["درخواست احراز","مدارک هویتی","OCR","بررسی تطبیق","نتیجه احراز"]'::jsonb),
('19-credit-scoring','امتیازدهی اعتباری','/modules/?code=19-credit-scoring',19,'modules:19-credit-scoring:read','["مدل‌های امتیازدهی","پارامترها","محاسبه امتیاز","نتایج","تاریخچه"]'::jsonb),
('20-credit-decisions','تصمیمات اعتباری','/modules/?code=20-credit-decisions',20,'modules:20-credit-decisions:read','["پرونده‌های در انتظار","پیشنهاد تصمیم","تصمیم‌گیری","اعتراض و بازبینی","گزارش تصمیمات"]'::jsonb),
('21-credit-committee','کمیته اعتباری','/modules/?code=21-credit-committee',21,'modules:21-credit-committee:read','["جلسات کمیته","دستور جلسه","پرونده‌های ارجاعی","مصوبات","صورتجلسات"]'::jsonb),
('22-credit-disbursement','پرداخت تسهیلات','/modules/?code=22-credit-disbursement',22,'modules:22-credit-disbursement:read','["صف پرداخت","کنترل پرداخت","پرداخت","ثبت سند","گزارش پرداخت"]'::jsonb),
('23-loan-settlement','تسویه تسهیلات','/modules/?code=23-loan-settlement',23,'modules:23-loan-settlement:read','["درخواست تسویه","محاسبه مانده","تسویه زودهنگام","تسویه نهایی","گواهی تسویه"]'::jsonb),
('24-loan-ledger','دفترکل تسهیلات','/modules/?code=24-loan-ledger',24,'modules:24-loan-ledger:read','["دفترکل","گردش اصل","سود و کارمزد","تعدیلات","گزارش دفترکل"]'::jsonb),
('25-loan-refunds','برگشت وجوه','/modules/?code=25-loan-refunds',25,'modules:25-loan-refunds:read','["درخواست برگشت","بررسی برگشت","تأیید برگشت","ثبت تراکنش","گزارش برگشت"]'::jsonb),
('26-loan-closure','بستن تسهیلات','/modules/?code=26-loan-closure',26,'modules:26-loan-closure:read','["پرونده‌های آماده بستن","کنترل نهایی","تسویه اسناد","بستن پرونده","آرشیو"]'::jsonb),
('27-loan-delinquency','معوقات','/modules/?code=27-loan-delinquency',27,'modules:27-loan-delinquency:read','["اقساط معوق","پرونده‌های سررسید گذشته","محاسبه جریمه","اخطار","گزارش معوقات"]'::jsonb),
('28-collection-workflow','گردش وصول','/modules/?code=28-collection-workflow',28,'modules:28-collection-workflow:read','["صف وصول","اقدام وصول","وعده پرداخت","ارجاع","نتیجه اقدام"]'::jsonb),
('29-loan-restructuring','بازسازی تسهیلات','/modules/?code=29-loan-restructuring',29,'modules:29-loan-restructuring:read','["درخواست بازسازی","ارزیابی","طرح جدید","مصوبه","ثبت قرارداد جدید"]'::jsonb),
('30-loan-relief','مساعدت و بخشودگی','/modules/?code=30-loan-relief',30,'modules:30-loan-relief:read','["درخواست مساعدت","بخشودگی جرایم","تخفیف","مصوبه","گزارش بخشودگی"]'::jsonb),
('31-loan-legal-cases','پرونده‌های حقوقی','/modules/?code=31-loan-legal-cases',31,'modules:31-loan-legal-cases:read','["پرونده جدید","ارجاع حقوقی","اقدامات قضایی","اسناد حقوقی","نتیجه پرونده"]'::jsonb),
('32-form-builder','فرم‌ساز','/modules/?code=32-form-builder',32,'modules:32-form-builder:read','["فرم‌ها","فرم جدید","فیلدها","اعتبارسنجی","انتشار فرم"]'::jsonb),
('33-menu-builder','منوساز','/modules/?code=33-menu-builder',33,'modules:33-menu-builder:read','["درخت منو","منوی جدید","زیرمنوها","دسترسی منو","انتشار منو"]'::jsonb),
('34-page-builder','صفحه‌ساز','/modules/?code=34-page-builder',34,'modules:34-page-builder:read','["صفحات","صفحه جدید","بلوک‌ها","پیش‌نمایش","انتشار صفحه"]'::jsonb),
('35-page-block-editor','ویرایشگر بلوک صفحه','/modules/?code=35-page-block-editor',35,'modules:35-page-block-editor:read','["بلوک‌ها","ویرایش بلوک","تنظیمات بلوک","نسخه‌ها","انتشار"]'::jsonb),
('36-page-templates','قالب‌های صفحه','/modules/?code=36-page-templates',36,'modules:36-page-templates:read','["قالب‌ها","قالب جدید","پیش‌نمایش","نسخه‌ها","انتشار قالب"]'::jsonb),
('37-frontend-sections','بخش‌های فرانت‌اند','/modules/?code=37-frontend-sections',37,'modules:37-frontend-sections:read','["Header","Footer","Banner","Widgetها","بخش‌های سفارشی"]'::jsonb),
('38-navigation-rules','قوانین ناوبری','/modules/?code=38-navigation-rules',38,'modules:38-navigation-rules:read','["قواعد مسیر","شرایط دسترسی","Redirect","اولویت قواعد","آزمون ناوبری"]'::jsonb),
('39-frontend-notifications','اعلان‌های فرانت‌اند','/modules/?code=39-frontend-notifications',39,'modules:39-frontend-notifications:read','["اعلان‌ها","اعلان جدید","هدف‌گیری","زمان‌بندی","گزارش نمایش"]'::jsonb),
('40-notification-templates','قالب‌های اعلان','/modules/?code=40-notification-templates',40,'modules:40-notification-templates:read','["قالب پیام","قالب ایمیل","قالب SMS","Push","نسخه‌بندی"]'::jsonb),
('41-documentation','مستندسازی','/modules/?code=41-documentation',41,'modules:41-documentation:read','["اسناد","راهنماها","مقالات","نسخه‌ها","انتشار"]'::jsonb),
('42-document-approvals','تأیید اسناد','/modules/?code=42-document-approvals',42,'modules:42-document-approvals:read','["کارتابل تأیید","مراحل تأیید","تأیید","رد","تاریخچه"]'::jsonb),
('43-document-versions','نسخه‌های اسناد','/modules/?code=43-document-versions',43,'modules:43-document-versions:read','["نسخه‌ها","مقایسه نسخه","ایجاد نسخه","بازگردانی","تاریخچه"]'::jsonb),
('44-document-search','جستجوی اسناد','/modules/?code=44-document-search',44,'modules:44-document-search:read','["جستجوی متنی","جستجوی پیشرفته","فیلترها","جستجوی OCR","نتایج ذخیره‌شده"]'::jsonb),
('45-document-retention','نگهداری اسناد','/modules/?code=45-document-retention',45,'modules:45-document-retention:read','["قوانین نگهداری","دوره نگهداری","انقضا","امحا","گزارش نگهداری"]'::jsonb),
('46-document-distribution','توزیع اسناد','/modules/?code=46-document-distribution',46,'modules:46-document-distribution:read','["ارسال سند","گیرندگان","اشتراک‌گذاری","پیگیری دریافت","گزارش توزیع"]'::jsonb),
('47-document-access-log','لاگ دسترسی اسناد','/modules/?code=47-document-access-log',47,'modules:47-document-access-log:read','["دسترسی‌ها","مشاهده‌ها","دانلودها","تغییرات دسترسی","گزارش امنیتی"]'::jsonb),
('48-document-audit-reports','گزارش حسابرسی اسناد','/modules/?code=48-document-audit-reports',48,'modules:48-document-audit-reports:read','["گزارش حسابرسی","تغییرات","رویدادها","موارد مشکوک","خروجی گزارش"]'::jsonb),
('49-document-compliance','انطباق اسناد','/modules/?code=49-document-compliance',49,'modules:49-document-compliance:read','["قواعد انطباق","کنترل مدارک","موارد ناقص","اقدامات اصلاحی","گزارش انطباق"]'::jsonb),
('50-document-governance','حاکمیت اسناد','/modules/?code=50-document-governance',50,'modules:50-document-governance:read','["سیاست‌های اسناد","مالکیت","سطوح دسترسی","چرخه عمر","گزارش حاکمیت"]'::jsonb)
),
parents as (
 select m.id,m.menu_key,m.path,s.permission,s.children
 from menu_items m join seed s on s.menu_key=m.menu_key
)
insert into menu_items(menu_key,parent_id,title,path,sort_order,permission,children,is_active)
select p.menu_key||':'||x.ord,p.id,x.title,
       p.path||'&tab='||p.menu_key||'-'||x.ord,
       x.ord,p.permission,'[]'::jsonb,true
from parents p
cross join lateral jsonb_array_elements_text(p.children) with ordinality x(title,ord)
on conflict(menu_key) where menu_key is not null do update
set parent_id=excluded.parent_id,title=excluded.title,path=excluded.path,
    sort_order=excluded.sort_order,permission=excluded.permission,is_active=true,updated_at=now();

insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible)
select m.id,p.code,true,m.sort_order,true
from menu_items m cross join menu_panels p
where m.menu_key ~ '^(12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49|50)-'
on conflict(menu_item_id,panel_code) do update
set is_shared=true,is_visible=true,sort_order=excluded.sort_order;

commit;
