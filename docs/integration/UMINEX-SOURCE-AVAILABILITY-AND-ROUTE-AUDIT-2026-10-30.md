# ممیزی دسترسی سورس و مسیرهای Uminex

تاریخ ثبت: ۲۰۲۶-۱۰-۳۰  
مبدأ: `digibile/uminex`  
مقصد: `digibile/negar-azin-fadak-platform`  
وضعیت: شواهد تاریخی/فهرست مسیرها؛ سورس کامل در دسترس فعلی نیست

## ۱. وضعیت GitHub و فایل‌های در دسترس

- بررسی همه branchهای GitHub فقط branch `main` را نشان می‌دهد.
- درخت branch فعلی فقط `.gitignore` و `README.md` دارد؛ هیچ فایل `.cs`, `.csproj`, `.sln`, `.sql` یا migration در GitHub موجود نیست.
- در فایل‌های Library آرشیو قابل استخراجی با نام Uminex پیدا نشد.
- گزارش‌های ثبت‌شده از سرور در جلسات قبلی مسیرهای `/home/uminex/domains/uminex.ir/merged-uminex` و snapshot قدیمی `merged-uminex-BEFORE-ALL-ZIPS-20260906-043752` را نشان می‌دهند. فهرست‌های موجود، بخش‌هایی از source tree و فایل‌های publish/obj را نشان می‌دهند؛ اما bytes سورس در این مرحله قابل دسترسی نیست.

## ۲. شواهد ساختار ماژولار در snapshot سرور

فهرست فایل‌های publish/deps ثبت‌شده، این بخش‌ها را نشان می‌دهد:
- Core: Domain, Application, Infrastructure
- Accounting: API, Domain, Application, Infrastructure
- CRM: API, Domain, Application, Infrastructure
- ECommerce: API, Domain, Application, Infrastructure
- Credit: API, Domain, Application, Infrastructure
- HR: API, Domain, Application, Infrastructure
- Intelligence: API, Domain, Application, Infrastructure
- Projects: API, Domain, Application, Infrastructure
- Representatives: API, Domain, Application, Infrastructure
- Workflow: API, Domain, Application, Infrastructure
- Integrations: payment gateways, messaging, shipments
- API host و UnitTests

این فهرست از نام assemblyها و مسیرهای build/publish استخراج شده است؛ وجود assembly به‌تنهایی اثبات کیفیت، فعال بودن یا صحت هر قابلیت نیست.

## ۳. مسیرهای API مشاهده‌شده در route audit تاریخی

در snapshot route declarations این مسیرها گزارش شده‌اند:

| دامنه | مسیرهای مبدأ |
|---|---|
| Core | `/api/v1/auth`, `/api/v1/health`, `/api/v1/document-center` |
| Intelligence | `/api/v1/search`, `/api/v1/ai`, `/api/v1/reports` |
| Credit | `/api/v1/credit/applications`, `/api/v1/credit/loans` |
| Projects | `/api/v1/projects`, `/api/v1/projects/tasks` |
| CRM | `/api/v1/crm/customers`, `/api/v1/crm/tickets` |
| Accounting | `/api/v1/accounting/reports`, `/api/v1/accounting/treasury`, `/api/v1/accounting/chart-of-accounts`, `/api/v1/accounting/vouchers` |
| HR | `/api/v1/hr/employees`, `/api/v1/hr/leave-requests`, `/api/v1/hr/payroll` |
| ECommerce | `/api/v1/ecommerce/products`, `/api/v1/ecommerce/orders`, `/api/v1/ecommerce/payments` |
| Workflow | `/api/v1/workflow/letters`, `/api/v1/workflow/inbox`, `/api/v1/workflow/instances` |
| Representatives | `/api/v1/representatives`, `/api/v1/representatives/settlements` |
| Integrations | `/api/v1/integrations/payment-gateways`, `/api/v1/integrations/messaging`, `/api/v1/integrations/shipments` |

### محدودیت route audit تاریخی

در تست HTTP ثبت‌شده در ۳۰ اوت ۲۰۲۶:
- `/swagger` پاسخ 200 داشت.
- `/`, `/health` و `/api` پاسخ 404 داشتند؛ این مسیرها root/health عمومی نبودند و مسیر health تعریف‌شده `/api/v1/health` بود.
- این تست مربوط به همان تاریخ و port 7100 است و وضعیت فعلی سرویس را ثابت نمی‌کند.
- لاگ‌های قدیمی سرویس `uminex` listener روی `127.0.0.1:5601` را نشان می‌دهند؛ همچنین warning مربوط به تعیین نشدن HTTPS redirect port و چند warning thread-pool heartbeat ثبت شده است. این‌ها شواهد تاریخی‌اند، نه وضعیت زنده امروز.

## ۴. نگاشت اولیه به مقصد canonical

| ماژول Uminex | مالکیت مقصد |
|---|---|
| Accounting | `accounting`, `ledger`, `treasury` |
| CRM | `customer-360`, CRM مرکزی |
| ECommerce | `marketplace`, `domain-checkout`, inventory و payments |
| Credit | `lendtech` و risk/repayment |
| HR | سازمان، هویت و گردش‌کار منابع انسانی در پنل‌های canonical |
| Intelligence | مرکز هوش مصنوعی، گزارش و BI |
| Projects | مدیریت پروژه و گردش‌کار؛ پس از تطبیق با ماژول موجود |
| Representatives | نمایندگان/بازاریاب‌ها و تسویه مرکزی |
| Workflow | گردش‌کار و approvals مرکزی |
| Integrations | adapterهای payment, messaging, shipments مرکزی |
| Document Center | اسناد و بایگانی مرکزی |

این نگاشت فقط مرز مالکیت پیشنهادی است. هنوز مدل‌ها، schemaها، permissions، migrations یا منطق تجاری Uminex با مقصد تطبیق داده نشده‌اند.

## ۵. تصمیم

- هیچ جدول یا کد Uminex از روی assembly name یا route name به مقصد اضافه نمی‌شود.
- نام/namespace قدیمی مبدأ در UI و برند مقصد ظاهر نمی‌شود.
- مسیرهای هم‌نام با APIهای مقصد به معنی قابلیت معادل نیستند؛ هر قرارداد باید با source code و schema واقعی بررسی شود.
- مرحله بعدی ممیزی Uminex نیازمند آرشیو سورس کامل `merged-uminex` است؛ ترجیحاً شامل `backend/src`, `*.sln`, `*.csproj`, migrations، تست‌ها و frontend source. فایل‌های publish و DLL به‌تنهایی برای port کردن منطق کافی نیستند.
- هیچ داده، schema، secret یا deployment از Uminex در این مرحله منتقل نشده است.
