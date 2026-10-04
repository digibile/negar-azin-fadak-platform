# ارزیابی معماری پلتفرم فوق‌سازمانی نگار آذین فدک

## وضعیت مبنا

این ارزیابی روی Repository موجود انجام شده و مبنای اجرای مرحله‌ای است. هدف، حفظ قابلیت‌های سالم و تبدیل تدریجی لایه‌های عمومی به سرویس‌های واقعی است.

## موجود و قابل حفظ

- Monorepo مبتنی بر pnpm با دو برنامه اصلی API و Web.
- PostgreSQL و migrationهای نسخه‌گذاری‌شده.
- احراز هویت JWT با Cookie و CSRF.
- RBAC و Permissionهای ذخیره‌شده در PostgreSQL.
- منوی مرکزی از جدول menu_items.
- کاتالوگ ۴۵ حوزه عملیاتی و runtime عمومی رکوردها.
- audit برای تغییرات رکوردهای runtime.
- صفحه‌ساز و فرم‌ساز موجود.
- Docker Compose برای محیط عملیاتی و Codespaces.
- CI برای migration، policy check، integrity، build و test.
- رابط فارسی RTL و shell سازمانی اولیه.

## ناقص

- محدوده Tenant در تمام Queryها و Cacheها اعمال نشده است.
- ساختار شرکت، برند، شعبه، فروشنده و فروشگاه تا پیش از migration 017 یکپارچه و عملیاتی نبود.
- Marketplace قبلی عمدتاً storage عمومی داشت و جریان کامل Seller → Store → Product → Order → Commission → Settlement نداشت.
- Checkout، پرداخت و برگشت وجه به provider واقعی متصل نیستند.
- Calendar Engine، Rule Engine و SLA به domain transactionهای تجارت متصل نیستند.
- Accounting/Ledger برای رویدادهای سفارش و تسویه به صورت end-to-end متصل نشده است.
- Global Search، Notification Center و Monitoring Center نیازمند service/API واقعی هستند.
- تست‌های Frontend و E2E هنوز کافی نیستند.

## اصلاح‌شده در این مرحله

1. CORS محیط Codespaces به origin واقعی همان Codespace محدود شد.
2. trailing slash در Next.js برای جلوگیری از redirect روی درخواست‌های POST غیرفعال شد.
3. Navigation اصلی از API واقعی Menu Tree تغذیه می‌شود و فهرست ۴۵ ماژول در Frontend دیگر منبع حقیقت نیست.
4. migration 017 ساختار Tenant، Company، Brand، Branch، Seller، Store، Product، Inventory، Order و Seller Settlement را اضافه کرد.
5. Permissionهای مربوط به این موجودیت‌ها Database-backed هستند.
6. APIهای tenant context و جریان پایه Marketplace با Tenant Scope اضافه شدند.
7. وضعیت‌های Loading، Error و Empty در shell اصلی تکمیل شدند.

## معماری هدف

UI → API → Service/Domain → PostgreSQL → Business Rules → Audit

برای جریان‌های مالی و عملیاتی:

Order → Payment → Commission → Seller Payable → Settlement → Ledger → Reporting

برای هر درخواست کاربر:

Identity → Permission → Tenant Scope → Entity Scope → Business Rule → Audit

## ترتیب ادامه کار

### فاز A: هویت و محدوده دسترسی
- Tenant context پایدار در session.
- Company/Brand/Branch/Store switcher.
- Permission evaluation بر اساس Tenant و entity scope.
- تست جداسازی Tenant.

### فاز B: Marketplace
- Seller lifecycle.
- Storefront.
- Catalog و inventory transaction.
- Cart و checkout.
- Order state machine.
- Return و refund.
- Commission engine.
- Settlement workflow.

### فاز C: مالی
- Ledger abstraction.
- Account mapping.
- Payment events.
- Commission payable.
- Settlement posting.
- Reconciliation.

### فاز D: تقویم، قوانین و SLA
- Persian business calendar.
- Holiday source و versioning.
- Rule execution service.
- SLA clock.
- اتصال سررسید سفارش و اقساط به تقویم.

### فاز E: کنترل و مشاهده‌پذیری
- Audit explorer.
- Notification center.
- Global search.
- Provider health.
- Queue/job monitoring.
- incident model.

### فاز F: کیفیت
- Unit tests.
- API integration tests.
- Authorization tests.
- Tenant isolation tests.
- Migration tests.
- Browser/E2E tests.
- Build و CI gate.

## اصل اجرایی

هیچ UI جدیدی به عنوان منبع داده اصلی ایجاد نمی‌شود. داده عملیاتی باید از PostgreSQL و API بیاید و عملیات حساس باید Permission، Tenant Scope و Audit داشته باشد.
