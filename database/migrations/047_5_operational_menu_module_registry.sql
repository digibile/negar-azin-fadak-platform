-- Compatibility registry for operational menu codes 12..50.
-- The canonical 45-module catalog remains unchanged; these are dedicated
-- runtime identities for the operational menu workspaces.
insert into platform_modules(id,code,title,core,parent_id,sort_order,is_active)
values
(51,'12-credit-applications','درخواست‌های اعتباری','credit',null,12,true),
(52,'13-loan-contracts','قراردادهای وام','credit',null,13,true),
(53,'14-installment-schedules','برنامه اقساط','credit',null,14,true),
(54,'15-installment-collections','وصول اقساط','credit',null,15,true),
(55,'16-collateral-guarantees','وثایق و ضامنین','credit',null,16,true),
(56,'17-digital-binder','زونکن دیجیتال','documents-content',null,17,true),
(57,'18-identity-verification','احراز هویت','identity',null,18,true),
(58,'19-credit-scoring','اعتبارسنجی','credit',null,19,true),
(59,'20-credit-decisions','مصوبات اعتباری','credit',null,20,true),
(60,'21-credit-committee','کمیته اعتباری','credit',null,21,true),
(61,'22-credit-disbursement','پرداخت تسهیلات','credit',null,22,true),
(62,'23-loan-settlement','تسویه و بازپرداخت پیش از موعد','credit',null,23,true),
(63,'24-loan-ledger','دفتر تسهیلات','finance',null,24,true),
(64,'25-loan-refunds','برگشت پرداخت تسهیلات','finance',null,25,true),
(65,'26-loan-closure','مختومه‌سازی تسهیلات','credit',null,26,true),
(66,'27-loan-delinquency','مدیریت معوقات تسهیلات','credit',null,27,true),
(67,'28-collection-workflow','کارتابل و عملیات وصول تسهیلات','credit',null,28,true),
(68,'29-loan-restructuring','بازسازی و تقسیط مجدد تسهیلات','credit',null,29,true),
(69,'30-loan-relief','بخشودگی و امهال مطالبات تسهیلات','credit',null,30,true),
(70,'31-loan-legal-cases','پرونده‌های حقوقی مطالبات تسهیلات','credit',null,31,true),
(71,'32-form-builder','فرم‌ساز','documents-content',null,32,true),
(72,'33-menu-builder','مدیریت منوی مرکزی سازمان','command-platform',null,33,true),
(73,'34-page-builder','صفحه‌ساز و مدیریت صفحات','documents-content',null,34,true),
(74,'35-page-block-editor','ویرایشگر بلوک‌های صفحات','documents-content',null,35,true),
(75,'36-page-templates','مدیریت قالب‌های صفحات','documents-content',null,36,true),
(76,'37-frontend-sections','مدیریت بخش‌های فرانت‌اند','documents-content',null,37,true),
(77,'38-navigation-rules','قواعد نمایش و ناوبری فرانت‌اند','documents-content',null,38,true),
(78,'39-frontend-notifications','مدیریت اعلان‌های فرانت‌اند','communication',null,39,true),
(79,'40-notification-templates','قالب‌های اعلان فرانت‌اند','communication',null,40,true),
(80,'41-documentation','مستندات','documents-content',null,41,true),
(81,'42-document-approvals','گردش تأیید و انتشار مستندات','documents-content',null,42,true),
(82,'43-document-versions','مدیریت نسخه‌های مستندات','documents-content',null,43,true),
(83,'44-document-search','جستجو و بایگانی هوشمند مستندات','documents-content',null,44,true),
(84,'45-document-retention','بایگانی و امحای مستندات','documents-content',null,45,true),
(85,'46-document-distribution','گردش و توزیع مستندات','documents-content',null,46,true),
(86,'47-document-access-log','ثبت و پایش دسترسی مستندات','documents-content',null,47,true),
(87,'48-document-audit-reports','گزارش‌های ممیزی مستندات','command-platform',null,48,true),
(88,'49-document-compliance','کنترل انطباق و الزامات مستندات','command-platform',null,49,true),
(89,'50-document-governance','مرکز حاکمیت مستندات','command-platform',null,50,true)
on conflict(id) do update set code=excluded.code,title=excluded.title,core=excluded.core,sort_order=excluded.sort_order,is_active=true;

insert into module_runtime(module_id,lifecycle,route,api_prefix,owner_team,description)
select id,'active','/modules/'||code,'/api/platform/modules/'||code,'platform',title
from platform_modules where id between 51 and 89
on conflict(module_id) do update set lifecycle=excluded.lifecycle,route=excluded.route,api_prefix=excluded.api_prefix,owner_team=excluded.owner_team,description=excluded.description,updated_at=now();

insert into module_permissions(module_id,permission)
select m.id,'modules:'||m.code||':'||a.action
from platform_modules m cross join (values('read'),('write'),('delete')) a(action)
where m.id between 51 and 89
on conflict do nothing;

insert into module_actions(module_id,action_code,title,permission)
select m.id,a.action,case a.action when 'read' then 'مشاهده' when 'write' then 'ثبت و ویرایش' else 'حذف' end,'modules:'||m.code||':'||a.action
from platform_modules m cross join (values('read'),('write'),('delete')) a(action)
where m.id between 51 and 89
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;
