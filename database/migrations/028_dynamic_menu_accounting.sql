-- Dynamic shared menu catalog and accounting book/account modes.
-- Menus are data, not UI constants. Each panel can share, hide, reorder and move items.
alter table menu_items add column if not exists children jsonb not null default '[]'::jsonb;
alter table menu_items add column if not exists menu_key text;
create unique index if not exists uq_menu_items_menu_key on menu_items(menu_key) where menu_key is not null;

create table if not exists menu_panels(
 code text primary key,
 title text not null,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
insert into menu_panels(code,title) values
('admin','مرکز مدیریت'),('finance','پنل حسابداری'),('seller','پنل فروشنده'),('customer','پنل مشتری'),('credit','پنل اعتبار'),('operations','پنل عملیات')
on conflict(code) do update set title=excluded.title,is_active=true,updated_at=now();

create table if not exists menu_item_panels(
 menu_item_id uuid not null references menu_items(id) on delete cascade,
 panel_code text not null references menu_panels(code) on delete cascade,
 is_shared boolean not null default false,
 sort_order integer not null default 0,
 is_visible boolean not null default true,
 primary key(menu_item_id,panel_code)
);
create index if not exists idx_menu_item_panels_panel_order on menu_item_panels(panel_code,is_visible,sort_order);

with seed(menu_key,title,path,sort_order,permission,children) as (values
('dashboard','داشبورد و مرکز مدیریت','/modules/?code=command-center',10,'modules:command-center:read','["داشبورد اصلی","داشبورد مدیرعامل","داشبورد مدیر مالی","داشبورد فروش","داشبورد عملیات","داشبورد شعب","KPI سازمان","هشدارهای مدیریتی","فعالیت‌های اخیر","اعلان‌های مهم"]'::jsonb),
('organization','مدیریت سازمان و هلدینگ','/modules/?code=governance',20,'modules:governance:read','["ساختار سازمان","شرکت‌ها","هلدینگ‌ها","شعب","واحدها","دپارتمان‌ها","مراکز هزینه","مراکز درآمد","مراکز سود","ساختار مالکیت","تنظیمات سازمان"]'::jsonb),
('users-security','کاربران و امنیت','/modules/?code=identity',30,'modules:identity:read','["کاربران","پروفایل کاربران","نقش‌ها","گروه‌های کاربری","مجوزها","سیاست‌های دسترسی","ورودها","نشست‌ها","دستگاه‌های مجاز","احراز هویت","2FA","گزارش امنیتی"]'::jsonb),
('central-settings','تنظیمات مرکزی','/modules/?code=governance',40,'modules:governance:read','["تنظیمات عمومی","تنظیمات سازمان","تنظیمات مالی","تنظیمات فروش","تنظیمات خرید","تنظیمات عملیات","تنظیمات اعلان","تنظیمات پیامک","تنظیمات ایمیل","تاریخ و تقویم","شماره‌گذاری","تنظیمات سیستم"]'::jsonb),
('accounting','حسابداری','/modules/?code=accounting-finance',50,'modules:accounting-finance:read','["داشبورد حسابداری","وضعیت اسناد","مانده حساب‌ها","بدهکاران","بستانکاران","نقدینگی","هشدارهای مالی","دوره‌های مالی","دوره جاری","ایجاد دوره","بستن دوره","افتتاحیه","انتقال مانده","ساختار حساب‌ها","درخت حساب‌ها","گروه حساب","حساب کل","حساب معین","حساب تفصیلی","حساب شناور","تفصیلی‌ها","اشخاص","مشتریان","تأمین‌کنندگان","کارکنان","بانک‌ها","شعب","پروژه‌ها","مراکز هزینه","اسناد حسابداری","سند جدید","سند مرکب","سند موقت","سند تأییدشده","سند قطعی","سند اصلاحی","سند تعدیلی","سند افتتاحیه","سند اختتامیه","سند انتقالی","ابطال سند","کپی سند","تاریخچه اسناد","دفاتر","ترازها","صورت‌های مالی","دریافت و پرداخت","بانک","صندوق و تنخواه","دریافتنی","پرداختنی","چک و اسناد","بهای تمام‌شده","حسابداری مدیریت","بودجه","مالیات","کنترل حسابداری","بین‌شرکتی","پایان ماه","پایان سال","اسناد خودکار","گزارش‌های حسابداری","گزارش‌ساز","تنظیمات حسابداری","هوش نگار حسابداری"]'::jsonb),
('financial-reports','گزارش‌های مالی','/modules/?code=reports-analytics',60,'modules:reports-analytics:read','["تراز آزمایشی","ترازنامه","سود و زیان","جریان وجوه نقد","گردش حساب","گزارش هزینه","گزارش درآمد","گزارش شعب","گزارش شرکت‌ها","گزارش تلفیقی","گزارش سفارشی"]'::jsonb),
('treasury','خزانه‌داری','/modules/?code=treasury-bank',70,'modules:treasury-bank:read','["داشبورد خزانه","دریافت‌ها","پرداخت‌ها","صندوق‌ها","بانک‌ها","انتقال بین حساب‌ها","تنخواه","مغایرت بانکی","پیش‌بینی نقدینگی","گزارش خزانه"]'::jsonb),
('checks','چک و اسناد','/modules/?code=treasury-bank',80,'modules:treasury-bank:read','["چک دریافتی","چک پرداختی","چک در جریان","چک وصول‌شده","چک برگشتی","واگذاری چک","سفته","ضمانت‌نامه","سررسیدها"]'::jsonb),
('sales','فروش','/modules/?code=sales-trade',90,'modules:sales-trade:read','["داشبورد فروش","مشتریان","پیش‌فاکتور","سفارش فروش","فاکتور فروش","برگشت","تخفیف","پورسانت","اهداف","قیمت‌گذاری","گزارش فروش"]'::jsonb),
('purchasing','خرید و تأمین','/modules/?code=sales-trade',100,'modules:sales-trade:read','["درخواست خرید","استعلام","سفارش خرید","فاکتور خرید","برگشت خرید","تأمین‌کنندگان","ارزیابی تأمین‌کنندگان","قرارداد تأمین","گزارش خرید"]'::jsonb),
('inventory','انبار','/modules/?code=delivery-logistics',110,'modules:delivery-logistics:read','["داشبورد انبار","انبارها","کالاها","دسته‌بندی","واحدها","رسید","حواله","انتقال","انبارگردانی","موجودی لحظه‌ای","گزارش انبار"]'::jsonb),
('supply-logistics','زنجیره تأمین و لجستیک','/modules/?code=delivery-logistics',120,'modules:delivery-logistics:read','["برنامه تأمین","سفارش تأمین","حمل","ناوگان","رانندگان","مسیرها","ارسال","تحویل","رهگیری","گزارش لجستیک"]'::jsonb),
('crm','CRM و مشتریان','/modules/?code=crm',130,'modules:crm:read','["مشتریان","پروفایل","مشتری 360","سرنخ","فرصت فروش","فعالیت مشتری","تماس","جلسه","یادآوری","امتیاز","گزارش CRM"]'::jsonb),
('marketing','بازاریابی','/modules/?code=content-management',140,'modules:content-management:read','["کمپین‌ها","پیامکی","ایمیلی","تبلیغات","لیدها","صفحات فرود","کد تخفیف","وفاداری","باشگاه مشتریان","تحلیل بازاریابی"]'::jsonb),
('marketplace','تجارت و مارکت‌پلیس','/modules/?code=marketplace',150,'modules:marketplace:read','["فروشگاه","محصولات","فروشندگان","سفارشات آنلاین","تسویه فروشندگان","کمیسیون‌ها","درگاه‌ها","مرجوعی","امتیازدهی","گزارش مارکت‌پلیس"]'::jsonb),
('credit','اعتبار و تسهیلات','/modules/?code=credit-facilities',160,'modules:credit-facilities:read','["داشبورد اعتبار","انواع تسهیلات","طرح‌ها","درخواست وام","پرونده اعتباری","بررسی کارشناسی","اعتبارسنجی","قرارداد","پرداخت","اقساط","وصول"]'::jsonb),
('digital-file','پرونده دیجیتال','/modules/?code=digital-binder',170,'modules:digital-binder:read','["زونکن دیجیتال","مدارک هویتی","کارت ملی","شناسنامه","مدارک مالی","قراردادها","اسناد ضمانت","مدارک تسهیلات","OCR","تاریخچه","آرشیو"]'::jsonb),
('collections','وصول مطالبات','/modules/?code=collections',180,'modules:collections:read','["مطالبات مشتریان","بدهکاران","سررسید","برنامه وصول","پیگیری","اقساط معوق","اخطار","پرونده حقوقی","گزارش وصول"]'::jsonb),
('hr','منابع انسانی','/modules/?code=human-resources',190,'modules:human-resources:read','["کارکنان","پرونده پرسنلی","قرارداد","سمت‌ها","ساختار سازمانی","استخدام","آموزش","ارزیابی","مزایا","خروج"]'::jsonb),
('payroll','حقوق و دستمزد','/modules/?code=human-resources',200,'modules:human-resources:read','["دوره حقوق","محاسبه","فیش","مزایا","کسورات","بیمه","مالیات حقوق","پرداخت","سند حقوق","گزارش حقوق"]'::jsonb),
('attendance','حضور و غیاب','/modules/?code=human-resources',210,'modules:human-resources:read','["ورود و خروج","شیفت","اضافه‌کاری","تأخیر","مرخصی","ماموریت","تعطیلات","گزارش حضور و غیاب"]'::jsonb),
('office-automation','اتوماسیون اداری','/modules/?code=documents-office',220,'modules:documents-office:read','["نامه‌های دریافتی","نامه‌های ارسالی","نامه جدید","ارجاعات","درخواست‌ها","تأییدیه‌ها","کارتابل","دبیرخانه","بایگانی"]'::jsonb),
('documents','مدیریت اسناد','/modules/?code=documents-office',230,'modules:documents-office:read','["مخزن اسناد","پوشه‌ها","اسناد سازمانی","اشتراک","نسخه‌بندی","دسترسی","آرشیو","جستجو","سطل بازیابی"]'::jsonb),
('contracts','قراردادها','/modules/?code=documents-office',240,'modules:documents-office:read','["قراردادهای فروش","قراردادهای خرید","قراردادهای کارکنان","قراردادهای نمایندگان","قراردادهای تسهیلات","پیش‌نویس","فعال","منقضی","تمدید","الگوها"]'::jsonb),
('workflow','گردش کار','/modules/?code=business-rules',250,'modules:business-rules:read','["فرآیندها","گردش تأیید","مراحل","قوانین","تخصیص کار","کارتابل","فرآیندهای متوقف","Triggerها","گزارش گردش کار"]'::jsonb),
('projects','مدیریت پروژه','/modules/?code=projects-operations',260,'modules:projects-operations:read','["پروژه‌ها","پروژه جدید","وظایف","اعضا","زمان‌بندی","بودجه","هزینه","پیشرفت","گزارش پروژه"]'::jsonb),
('production','تولید','/modules/?code=projects-operations',270,'modules:projects-operations:read','["محصولات تولیدی","مواد اولیه","فرمول ساخت","سفارش تولید","برنامه تولید","خطوط تولید","مصرف","تولید نهایی","ضایعات","گزارش تولید"]'::jsonb),
('maintenance','نگهداری و تعمیرات','/modules/?code=projects-operations',280,'modules:projects-operations:read','["تجهیزات","ماشین‌آلات","برنامه سرویس","درخواست تعمیر","تعمیرات پیشگیرانه","تعمیرات اضطراری","قطعات","سوابق تعمیرات","گزارش"]'::jsonb),
('assets','دارایی‌های ثابت','/modules/?code=accounting-finance',290,'modules:accounting-finance:read','["دارایی‌ها","اموال","خودروها","تجهیزات","انتقال","واگذاری","استهلاک","تجدید ارزیابی","گزارش دارایی‌ها"]'::jsonb),
('tax','مالیات','/modules/?code=accounting-finance',300,'modules:accounting-finance:read','["پرونده مالیاتی","ارزش افزوده","معاملات","صورتحساب","اظهارنامه","مالیات حقوق","مالیات تکلیفی","معاملات فصلی","گزارش مالیاتی","سامانه‌های مالیاتی"]'::jsonb),
('bi','هوش تجاری','/modules/?code=reports-analytics',310,'modules:reports-analytics:read','["داشبورد BI","KPI","تحلیل فروش","تحلیل مالی","تحلیل مشتری","تحلیل عملیات","تحلیل شعب","تحلیل سودآوری","گزارش‌ساز","مرکز خروجی"]'::jsonb),
('ai-center','مرکز هوش مصنوعی','/modules/?code=negar-ai',320,'modules:negar-ai:read','["داشبورد AI","دستیار مدیرعامل","دستیار مالی","دستیار فروش","دستیار عملیات","دستیار منابع انسانی","پرسش از داده‌ها","گزارش هوشمند","پیشنهاد تصمیم","حافظه سازمانی","جستجوی هوشمند","مدیریت مدل‌ها"]'::jsonb),
('smart-analysis','تحلیل هوشمند','/modules/?code=negar-ai',330,'modules:negar-ai:read','["پیش‌بینی فروش","پیش‌بینی درآمد","پیش‌بینی هزینه","پیش‌بینی نقدینگی","تحلیل روند","کشف ناهنجاری","سودآوری","ریسک","رفتار مشتری","پیشنهاد مدیریتی"]'::jsonb),
('ai-finance','AI مالی و حسابداری','/modules/?code=negar-ai',340,'modules:negar-ai:read','["OCR فاکتور","خواندن سند","پیشنهاد کدینگ","پیشنهاد سند","تطبیق اسناد","کشف مغایرت","کشف تقلب","تحلیل حساب‌ها","پیش‌بینی نقدینگی","دستیار حسابدار"]'::jsonb),
('ai-sales-crm','AI فروش و CRM','/modules/?code=negar-ai',350,'modules:negar-ai:read','["پیش‌بینی فروش","امتیازدهی لید","امتیازدهی مشتری","پیشنهاد محصول","پیشنهاد قیمت","پیش‌بینی ریزش","پیشنهاد کمپین","Customer 360 AI","دستیار فروش"]'::jsonb),
('ai-credit','AI اعتبارسنجی','/modules/?code=credit-scoring',360,'modules:credit-scoring:read','["امتیاز ریسک","تحلیل پرونده","تحلیل مدارک","تشخیص ریسک","پیش‌بینی نکول","پیشنهاد سقف","پیشنهاد مدت","هشدار پرونده مشکوک","تحلیل رفتار اعتباری"]'::jsonb),
('ai-documents','AI اسناد و OCR','/modules/?code=digital-binder',370,'modules:digital-binder:read','["OCR کارت ملی","OCR شناسنامه","OCR فاکتور","OCR قرارداد","استخراج اطلاعات","دسته‌بندی خودکار","جستجوی معنایی","خلاصه‌سازی","تطبیق","تشخیص جعل"]'::jsonb),
('ai-contact','AI مرکز تماس','/modules/?code=contact-center',380,'modules:contact-center:read','["تماس ورودی","صوت به متن","تحلیل مکالمه","خلاصه مکالمه","رضایت مشتری","پیشنهاد پاسخ","دستیار اپراتور","Voice Agent","گزارش مرکز تماس"]'::jsonb),
('ai-agents','AI Agentها','/modules/?code=negar-ai',390,'modules:negar-ai:read','["Agentهای سازمان","ساخت Agent","Agent مالی","Agent فروش","Agent پشتیبانی","Agent منابع انسانی","Agent اعتبار","ابزارها","دسترسی‌ها","لاگ Agent"]'::jsonb),
('smart-automation','اتوماسیون هوشمند','/modules/?code=business-rules',400,'modules:business-rules:read','["AI Workflow","اتوماسیون وظایف","پیشنهاد اتوماسیون","Trigger","Action","Rule Engine","زمان‌بندی","اجرای خودکار","مانیتور اتوماسیون"]'::jsonb),
('integrations','یکپارچه‌سازی','/modules/?code=providers-integrations',410,'modules:providers-integrations:read','["بانک‌ها","درگاه‌ها","پیامک","ایمیل","سرویس‌های دولتی","اعتبارسنجی","هویتی","API خارجی","Webhook"]'::jsonb),
('developer-api','API و توسعه‌دهندگان','/modules/?code=api-integration',420,'modules:api-integration:read','["API Gateway","APIها","API Keys","OAuth","Webhooks","Rate Limits","API Logs","مستندات API","Developer Portal"]'::jsonb),
('apps-portals','اپلیکیشن‌ها و پورتال‌ها','/modules/?code=mobile-app',430,'modules:mobile-app:read','["پورتال مشتری","پورتال فروشنده","پورتال نماینده","پورتال کارکنان","پورتال اعتبار","اپ موبایل","نسخه‌ها","دستگاه‌ها","تنظیمات پورتال"]'::jsonb),
('appearance-content','مدیریت ظاهر و محتوا','/modules/?code=page-builder',440,'modules:page-builder:read','["Theme Manager","منوی مرکزی","Page Builder","Form Builder","Widget Builder","Banner","صفحات","Header","Footer","قالب‌ها","مدیریت Frontend"]'::jsonb),
('notifications','اعلان و ارتباطات','/modules/?code=communications',450,'modules:communications:read','["مرکز اعلان","اعلان‌ها","پیامک","ایمیل","Push","پیام درون‌سامانه","Template","صف ارسال","تاریخچه","گزارش"]'::jsonb),
('support','پشتیبانی و خدمات','/modules/?code=tickets-support',460,'modules:tickets-support:read','["تیکت‌ها","تیکت جدید","کارتابل","SLA","دسته‌بندی خدمات","دانشنامه","پاسخ آماده","رضایت مشتری","گزارش پشتیبانی"]'::jsonb),
('audit','حسابرسی و کنترل داخلی','/modules/?code=audit-control',470,'modules:audit-control:read','["Audit Center","لاگ عملیات","تغییرات داده","تغییرات کاربر","کنترل داخلی","تخلفات","رویدادهای امنیتی","کنترل دسترسی","گزارش حسابرسی"]'::jsonb),
('monitoring','مانیتورینگ سیستم','/modules/?code=monitoring-events',480,'modules:monitoring-events:read','["وضعیت سرویس‌ها","سلامت API","سلامت DB","Performance","خطاها","لاگ","Queueها","Jobها","منابع","System Health"]'::jsonb),
('backup','پشتیبان‌گیری و نگهداری','/modules/?code=infrastructure-data',490,'modules:infrastructure-data:read','["Backup","Schedule","History","Restore","Migration","آرشیو","پاک‌سازی","نگهداری لاگ","Disaster Recovery","سلامت Backup"]'::jsonb),
('profile','حساب کاربری','/modules/?code=identity',500,'modules:identity:read','["پروفایل من","اطلاعات شخصی","تنظیمات شخصی","اعلان‌های من","فعالیت‌ها","نشست‌ها","دستگاه‌ها","تغییر رمز","امنیت","ترجیحات","خروج"]'::jsonb)
)
insert into menu_items(menu_key,title,path,sort_order,permission,children)
select menu_key,title,path,sort_order,permission,children from seed
on conflict(menu_key) where menu_key is not null do update set title=excluded.title,path=excluded.path,permission=excluded.permission,children=excluded.children,updated_at=now();

insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order)
select m.id,p.code,true,m.sort_order
from menu_items m cross join menu_panels p
where m.menu_key is not null
on conflict(menu_item_id,panel_code) do update set is_shared=true,is_visible=true,sort_order=excluded.sort_order;

create table if not exists accounting_books(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null,
 title text not null,
 book_mode text not null check(book_mode in ('official','internal','hybrid')),
 currency text not null default 'IRR',
 fiscal_year int,
 is_default boolean not null default false,
 status text not null default 'active' check(status in ('active','archived')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);

alter table ledger_accounts add column if not exists book_id uuid references accounting_books(id) on delete set null;
alter table ledger_accounts add column if not exists account_mode text not null default 'hybrid' check(account_mode in ('official','internal','hybrid'));
alter table ledger_accounts add column if not exists external_code text;
alter table ledger_accounts add column if not exists parent_id uuid references ledger_accounts(id) on delete restrict;
create index if not exists idx_ledger_accounts_book on ledger_accounts(tenant_id,book_id,account_mode);

create table if not exists accounting_account_transfers(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 source_account_id uuid not null references ledger_accounts(id) on delete restrict,
 target_account_id uuid not null references ledger_accounts(id) on delete restrict,
 source_book_id uuid references accounting_books(id) on delete restrict,
 target_book_id uuid references accounting_books(id) on delete restrict,
 transfer_type text not null check(transfer_type in ('move','copy','map','reclassify')),
 amount numeric(20,2),
 payload jsonb not null default '{}'::jsonb,
 status text not null default 'posted' check(status in ('draft','posted','cancelled')),
 reason text,
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 posted_at timestamptz
);
create index if not exists idx_account_transfers_tenant on accounting_account_transfers(tenant_id,created_at desc);

create table if not exists accounting_account_transfer_lines(
 id uuid primary key default gen_random_uuid(),
 transfer_id uuid not null references accounting_account_transfers(id) on delete cascade,
 entity_type text not null,
 entity_id uuid,
 source_data jsonb,
 target_data jsonb,
 created_at timestamptz not null default now()
);

create table if not exists accounting_account_mappings(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 source_account_id uuid not null references ledger_accounts(id) on delete cascade,
 target_account_id uuid not null references ledger_accounts(id) on delete cascade,
 mapping_type text not null check(mapping_type in ('official_to_internal','internal_to_official','official_to_hybrid','hybrid_to_official','internal_to_hybrid','hybrid_to_internal')),
 is_active boolean not null default true,
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(tenant_id,source_account_id,target_account_id)
);
