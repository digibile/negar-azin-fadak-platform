# ممیزی ساختار ذخیره‌سازی لجستیک، موجودی و اعلان

تاریخ بررسی: ۲۰۲۶-۱۱-۲۲  
شاخه: `feat/commerce-management-workspace`  
مبنای بررسی: فایل‌های واقعی `database/migrations` در شاخه و مسیر اجرای migration در `apps/api/src/migrate.ts`.

## دامنه و محدودیت

این گزارش فقط DDL قابل بازیابی از migrationهای زیر را توصیف می‌کند. هیچ SQL روی دیتابیس اجرا نشده و وضعیت واقعی دیتابیس‌های عملیاتی/تولیدی از این بررسی قابل استنتاج نیست. تعریف کامل `notification_outbox` و `platform_audit_events` در migrationهای بازیابی‌شده این مرحله پیدا نشد؛ بنابراین درباره ستون‌ها و قیود آن دو جدول نتیجه قطعی داده نمی‌شود.

## ۱. `logistics_shipments` و رویدادهای تحویل

منبع اصلی: `105_logistics_supply_complete.sql`.

- `logistics_shipments`: کلید اصلی `id uuid` با `gen_random_uuid()`؛ `tenant_id` اجباری؛ شماره مرسوله `shipment_no`؛ وضعیت دارای CHECK با مقادیر planned/assigned/picked_up/in_transit/delivered/failed/cancelled؛ ارجاع اختیاری به supply order، route، vehicle و driver؛ کد رهگیری؛ زمان اعزام و تحویل؛ علت تحویل/عدم تحویل؛ کاربر ایجادکننده و زمان‌های ایجاد/به‌روزرسانی.
- قیود یکتا: `unique(tenant_id,shipment_no)` و `unique(tenant_id,tracking_code)`. قید دوم اجازه چند مقدار NULL را در PostgreSQL می‌دهد.
- ارجاعات supply order، route، vehicle و driver در DDL اولیه فقط با شناسه تکی تعریف شده‌اند؛ FK مرکب tenant به tenant در همان DDL دیده نمی‌شود. این نکته به‌تنهایی اثبات‌کننده امکان دسترسی بین‌سازمانی در API نیست، اما یک شکاف دفاع در عمق دیتابیس است که باید جداگانه ارزیابی شود.
- `logistics_delivery_events`: شناسه bigserial؛ `tenant_id` و `shipment_id` اجباری؛ FK تکی به shipment با `ON DELETE CASCADE`؛ وضعیت، مکان، توضیح، actor و `occurred_at` با پیش‌فرض now.
- در DDL اولیه روی delivery events قید یکتای provider-event یا کلید deduplication وجود ندارد. ایندکس `(tenant_id,shipment_id,occurred_at)` در migration هم‌نام دیگر `106_logistics_supply_schema_fix.sql` ساخته می‌شود.
- این جدول تاریخچه رویدادهای تحویل یک مرسوله است، نه inbox ورودی وب‌هوک؛ ستون‌های raw payload، provider، provider event ID، signature result، received_at، processing status و retry metadata در DDL بررسی‌شده وجود ندارند.

## ۲. `logistics_events`

منبع: `105_logistics_supply_complete.sql`.

- جدول عمومی‌تر رویداد عملیاتی با `entity_type`، `entity_id`، `event_type`، from/to status، actor، reason و `created_at`.
- کلید اصلی bigserial و `tenant_id` اجباری است.
- ایندکس `(tenant_id,entity_type,entity_id,created_at)` در `106_logistics_supply_schema_fix.sql` ساخته می‌شود.
- در DDL بازیابی‌شده قید deduplication، شناسه رویداد بیرونی، payload خام یا چرخه پردازش/retry وجود ندارد. این جدول نیز دفتر رویداد دامنه‌ای است، نه صف ورودی پایدار.

## ۳. `inventory_events`

منبع: `104_inventory_warehouse_complete.sql`.

- ساختار شامل `tenant_id`، `entity_type`، `entity_id`، `event_type`، from/to status، quantity، actor، reason و `created_at` است.
- کلید اصلی bigserial است و ایندکس `(tenant_id,entity_type,entity_id,created_at desc)` دارد.
- این جدول برای رویدادهای موجودی طراحی شده است؛ فیلدهای مربوط به provider، دریافت خام، deduplication و retry در DDL آن دیده نمی‌شود. بنابراین نباید به‌عنوان inbox حمل استفاده شود.

## ۴. صورتحساب شرکت حمل و تخصیص مرسوله

منبع: `zzzzz_logistics_carrier_invoice_allocations.sql`.

- `logistics_carrier_invoices`: شناسه UUID؛ tenant؛ طرف حساب شرکت حمل؛ شماره و تاریخ صورتحساب؛ ارز سه‌حرفی uppercase با پیش‌فرض IRR؛ subtotal/tax/total با CHECKهای غیرمنفی و شرط `total_amount=subtotal+tax_amount)؛ وضعیت draft/verified/posted/void؛ توضیح، ایجادکننده و timestampها.
- قیود: `unique(tenant_id,id)`، `unique(tenant_id,carrier_party_id,invoice_no)` و FK مرکب `(tenant_id,carrier_party_id)` به `accounting_parties(tenant_id,id)` با restrict.
- `logistics_carrier_invoice_shipments`: FK مرکب tenant+invoice به صورتحساب با cascade و tenant+shipment به مرسوله با restrict؛ مبلغ تخصیص‌یافته باید مثبت باشد؛ هر مرسوله در هر صورتحساب حداکثر یک بار با `unique(tenant_id,invoice_id,shipment_id)` تخصیص می‌یابد.
- ایندکس‌های tenant/status/date و tenant/shipment تعریف شده‌اند.

منبع تکمیلی: `zzzzzz_logistics_carrier_invoice_accounting_link.sql`.

- ستون‌های verified_by، verified_at و accounting_document_id اضافه می‌شوند.
- FK مرکب tenant+accounting_document به سند حسابداری با restrict تعریف شده است.
- یکتایی سند حسابداری برای source module مربوط به صورتحساب حمل و یکتایی payable متناظر در سطح tenant با partial unique index اعمال شده است.

منبع پرداخت: `zzzzzzz_logistics_carrier_payments.sql`.

- پرداخت به جدول موجود `treasury_payments` متصل می‌شود؛ دفتر پرداخت موازی ایجاد نشده است.
- پرداخت دقیقاً باید یکی از bank_account یا cashbox را داشته باشد.
- FKهای مرکب tenant برای حساب بانکی، صندوق، صورتحساب حمل، payable و سند حسابداری ایجاد شده‌اند.
- ایندکس‌های پیگیری پرداخت بر اساس صورتحساب و payable و unique source برای سند پرداخت تعریف شده‌اند.
- در همین migration، constraintهای FK روی treasury bank/cashbox ledger account بدون guard وجود دارند؛ اجرای مجدد کل فایل به‌صورت مستقل لزوماً idempotent نیست، هرچند runner با ثبت نام فایل از اجرای مجدد migration ثبت‌شده جلوگیری می‌کند.

## ۵. صف اعلان

منبع قابل بازیابی: `025_notification_worker.sql`.

- روی `notification_outbox` ایندکس یکتای جزئی `(notification_id,channel)` با شرط `notification_id is not null` تعریف شده است.
- ایندکس claim روی `(status,available_at,created_at)` وجود دارد.
- ستون‌های `locked_at` و `locked_by` با `ADD COLUMN IF NOT EXISTS` اضافه می‌شوند.
- این migration تعریف اولیه جدول را شامل نمی‌شود؛ بنابراین نوع و nullability همه ستون‌ها، FKها، tenant constraintها و سیاست نگهداری از این فایل به‌تنهایی قابل تأیید نیست.
- یکتایی notification+channel یک قید تحویل اعلان است، نه کلید idempotency رویدادهای شرکت حمل.

## ۶. migrationهای شماره ۱۰۶ و ترتیب اجرا

دو فایل متفاوت با پیشوند یکسان وجود دارد:

- `106_logistics_supply_orders_and_lifecycle.sql`
- `106_logistics_supply_schema_fix.sql`

طبق `apps/api/src/migrate.ts` فایل‌ها با نام کامل مرتب می‌شوند و مقدار کامل نام فایل در `schema_migrations.version` ثبت می‌شود؛ بنابراین این دو فایل دو نسخه مجزا محسوب می‌شوند و هر دو در ترتیب لغوی اجرا خواهند شد. هر دو بخش‌هایی از ایجاد/تکمیل `logistics_supply_orders` و ستون‌های `logistics_shipments` را تکرار می‌کنند و از `IF NOT EXISTS` استفاده کرده‌اند. این وضعیت لزوماً شکست اجرا نیست، اما شماره‌گذاری تکراری خوانایی تاریخچه و تشخیص ترتیب منطقی را تضعیف می‌کند. نام فایل‌ها را بدون بررسی محیط‌های موجود تغییر ندهید؛ چون runner نام فایل را کلید اعمال‌شدن migration می‌داند.

## ۷. جمع‌بندی تصمیم فنی

1. هیچ‌یک از `logistics_delivery_events`، `logistics_events`، `inventory_events` یا `notification_outbox` بر اساس DDL بازیابی‌شده جایگزین مناسبی برای inbox پایدار وب‌هوک شرکت حمل نیست.
2. برای اتصال واقعی، ابتدا باید قرارداد رسمی provider مشخص کند event ID، امضا، headerها، timestamp، ترتیب رخداد و retry چگونه تعریف شده‌اند. هیچ‌کدام نباید حدس زده شوند.
3. پس از دریافت قرارداد، باید جداگانه تصمیم‌گیری شود که inbox مستقل لازم است یا abstraction موجودی در مخزن وجود دارد؛ این تصمیم نیازمند بررسی کامل DDL و worker و قیود tenant است.
4. FKهای مرکب tenant در اسناد carrier invoice و پرداخت نمونه خوبی از الگوی محافظت دیتابیسی هستند؛ در مقابل، برخی FKهای لجستیک پایه تک‌ستونی‌اند. بررسی و اصلاح آن‌ها باید با تحلیل داده‌های موجود و migration سازگار انجام شود، نه با تغییر فوری و بدون داده‌برداری.
5. این ممیزی migration جدید یا تغییر دیتابیس ایجاد نمی‌کند.

## منابع داخل مخزن

- `database/migrations/104_inventory_warehouse_complete.sql`
- `database/migrations/105_logistics_supply_complete.sql`
- `database/migrations/106_logistics_supply_orders_and_lifecycle.sql`
- `database/migrations/106_logistics_supply_schema_fix.sql`
- `database/migrations/107_marketplace_logistics_order_link.sql`
- `database/migrations/108_logistics_source_warehouse_link.sql`
- `database/migrations/025_notification_worker.sql`
- `database/migrations/zzzzz_logistics_carrier_invoice_allocations.sql`
- `database/migrations/zzzzzz_logistics_carrier_invoice_accounting_link.sql`
- `database/migrations/zzzzzzz_logistics_carrier_payments.sql`
