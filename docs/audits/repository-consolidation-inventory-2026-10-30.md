# گزارش نهایی ممیزی و یکپارچه‌سازی مخازن
تاریخ: 2026-10-30

## مقصد و معماری canonical
- مخزن مقصد: `digibile/negar-azin-fadak-platform`
- دامنه هدف: `https://sookar.ir`
- مسیر استقرار شناخته‌شده: `/home/sookar/domains/sookar.ir/negar-platform`
- Frontend: Next.js 16، React 19، TypeScript
- Backend: Express 5، TypeScript
- Database: PostgreSQL 16 و migrationهای SQL نسخه‌گذاری‌شده
- Package manager: pnpm 12.3.4
- ساختار فعلی حفظ می‌شود؛ backend دوم ASP.NET Core یا frontend دوم Vite ساخته نمی‌شود.

## مخازن قابل مشاهده در اتصال GitHub
| مخزن | فایل‌های main | فناوری/ماهیت | تصمیم |
|---|---:|---|---|
| `negar-azin-fadak-platform` | 501 در زمان ممیزی | Next.js/Express/PostgreSQL | مقصد اصلی |
| `MASTER-MOTHER-NEGARAZINFAKA` | 283 | ASP.NET Core 10، C# 14، EF Core؛ هسته مستقل هویت و سازمان | مقایسه قابلیت؛ انتقال فقط پس از تطبیق قراردادها |
| `negarazin-accounting` | یک ZIP | آرشیو UI/UX؛ نتیجه استخراج پایین‌تر | فاقد backend حسابداری قابل انتقال |
| `vamcity` | 66 | کد و مستندات انتقال سامانه وام | منبع بررسی دیتابیس و گردش‌کار |
| `digibail` | 152 | Next.js/TypeScript/PostgreSQL به‌علاوه کدهای C# | منبع موتور قرارداد و قابلیت‌های متمایز |
| `tejarhstore` | 46 | ASP.NET Core 9 و EF Core | مدل‌های فروشگاه با مدل‌های موجود تطبیق داده شوند؛ schema موازی ممنوع |
| `sarajon` | 42 | C#، Core/Ops/Security | مقایسه با Vamcity/Digibail برای قابلیت‌های یکتا |
| `uminex` | 2 | README و Gitignore | در main کد اجرایی قابل انتقال مشاهده نشد |
| `sitnela` | 1 | README | در main کد اجرایی قابل انتقال مشاهده نشد |
| `aqayevam` | 1 | README | در main کد اجرایی قابل انتقال مشاهده نشد |

این فهرست فقط مخازن قابل مشاهده از اتصال فعلی و مالک `digibile` را پوشش می‌دهد؛ سایر حساب‌های شخصی/سازمانی متصل‌نشده قابل ادعا نیستند.

## یافته‌های هم‌پوشانی
مقایسه SHA فایل‌ها در درخت main:
- Vamcity و Digibail: حداقل 35 فایل یکسان در مسیر و محتوا
- Vamcity و Sarajon: حداقل 37 فایل یکسان
- Digibail و Sarajon: حداقل 32 فایل یکسان

این سه مخزن نباید به‌صورت کپی کامل ادغام شوند. باید یک baseline برای هر قابلیت انتخاب و فقط اختلاف معنادار منتقل شود.

## بررسی ZIP موسوم به حسابداری
- ZIP اصلی شامل یک فایل HTML preview و یک ZIP رابط کاربری بود.
- ZIP داخلی شامل 81 فایل منبع قابل استخراج و 2 فایل غیرمنبع/خروجی build بود.
- الگوهای متداول کلید محرمانه در فایل‌های استخراج‌شده یافت نشد.
- فناوری: React 18، TypeScript، Vite 5 و React Router 6.
- README پروژه صریحاً اعلام می‌کند این پروژه فقط UI/UX نمایشی است و backend، database، API واقعی، Authentication، Authorization، RBAC، business logic و data model ندارد؛ داده‌ها Mock/Static هستند.
- تصمیم: هیچ‌یک از mockها یا اپ Vite به runtime منتقل نشد. ZIP و کپی‌های مرجع پس از ممیزی از شاخه مقصد حذف شدند. فایل منبع اصلی در مخزن منبع تغییر نکرد.

## قابلیت منتقل‌شده به runtime
- موتور قالب قرارداد Digibail به TypeScript در `apps/api/src/contract-engine.ts` منتقل شد.
- تست‌های واحد در `apps/api/src/contract-engine.test.ts` اضافه شد.
- endpoint محاسبه پیش‌فاکتور اقساط در `apps/api/src/lendtech.ts` اضافه شد:
  `POST /api/lendtech/installment-quote`
- endpoint از احراز هویت، مجوز `modules:lendtech:read` و Tenant context موجود استفاده می‌کند. این endpoint فقط quote محاسبه می‌کند و هیچ قرارداد، قسط یا تراکنش مالی را ثبت نمی‌کند.
- ماژول‌های accounting، ledger، identity، dynamic menu، marketplace، commerce و lendtech از قبل در هسته مقصد وجود دارند؛ نسخه‌های موازی یا جداول تکراری ساخته نشدند.

## وضعیت پاک‌سازی
- کپی‌های C#، مدل‌های TejarhStore، راهنمای مهاجرت، آرشیو ZIP رابط کاربری و اسکریپت موقت استخراج از شاخه مقصد حذف شدند.
- پوشه `integrations/` و workflow موقت audit از شاخه مقصد حذف شدند.
- workflow canonical استقرار Sookar بدون تغییر حفظ شد.
- فقط کد runtime منتخب، تست‌ها و دو سند ممیزی در PR باقی مانده‌اند.
- مخازن منبع دست‌نخورده‌اند؛ حذف فایل یا مخزن از منابع تا تکمیل انتقال و تأیید مستقل انجام نمی‌شود.

## موارد باز پیش از تکمیل کل برنامه
1. دریافت و بررسی بکاپ واقعی SQL Server مربوط به Vamcity؛ مستندات migration به‌تنهایی inventory دیتابیس نیست.
2. استخراج schema، stored procedures، views، jobs، constraints، triggers و داده‌های مرجع از بکاپ Vamcity؛ تطبیق با مدل‌های `lendtech_*` موجود و برنامه مهاجرت کنترل‌شده.
3. ممیزی عمیق MASTER-MOTHER برای قابلیت‌های هویت مرکزی، OTP، MFA، audit و tenant isolation. در runtime فعلی provider اجرایی SMS متصل نیست؛ بنابراین OTP پیامکی نباید بدون provider و secrets مدیریت‌شده فعال شود.
4. ممیزی شاخه‌ها و تاریخچه Digibail/Vamcity/Sarajon؛ انتقال فقط قابلیت‌های غیرتکراری و تست‌شده.
5. تطبیق TejarhStore با catalog، sellers، cart، orders، checkout و payment provider موجود؛ بدون ایجاد schema دوم.
6. تکمیل بررسی تجارت خارجی، صادرات/واردات، اسناد و معرفی شرکت‌ها در مخازن منبع و اتصال به ماژول‌های موجود.
7. اجرای build، تست، migrationهای آزمایشی و سپس بررسی پذیرش؛ انتشار تولیدی فقط از workflow دستی Sookar.ir.

## ایمنی
در این شاخه هیچ دیتابیس تولیدی، DNS، فایل env سرور یا سرویس production تغییر نکرده و هیچ deployment تولیدی اجرا نشده است.


## بررسی عمیق‌تر شاخه‌ها و منابع اجرایی
### Vamcity
- شاخه `import/ghestine-platform-2026-10-26` طبق `DEPLOYMENT-GATE.md` بسته‌ای برای `digibail.ir` است، نه Sookar یا سامانه NAF.
- همان مستند می‌گوید بسته .NET کامل شامل solution/projectهای backend نیست و endpointهای captcha/OTP روی سایت هدف 404 بوده‌اند؛ سبز بودن تست بسته‌بندی به معنی build backend یا اتصال DB نیست.
- این شاخه صریحاً ادغام با main یا کپی به مسیرهای Sookar/NAF را ممنوع می‌کند؛ بنابراین وارد مخزن canonical Sookar نشد.
- شاخه `database-linux-migration` فقط اسکریپت read-only بررسی وجود دیتابیس‌های `vamcityc_vamcity`، `vamcityc_bluvamdb`، `vamcityc_transferDb` و `vamcity_stage` را دارد؛ این اسکریپت دیتابیس را ایجاد، تغییر یا restore نمی‌کند.
- بکاپ واقعی SQL Server هنوز باید جداگانه از سرور/آرشیو معتبر خوانده و schema کامل آن استخراج شود.

### Digibail
- اسکریپت `database/02-schema-new-modules.sql` صریحاً می‌گوید schema جدول‌های قدیمی کاربران، وام‌ها و اقساط را شامل نمی‌شود و فقط روی دیتابیس خالی/تستی قابل استفاده است.
- `backend/db/001_init.sql` یک طرح PostgreSQL جداگانه با users، OTP، SMS، customer_documents و customer_contracts است؛ این schema با مدل‌های فعلی پلتفرم یکی فرض نشده و روی دیتابیس Sookar اجرا نشده است.
- موتور قرارداد، پس از انتقال به TypeScript و افزودن تست، در هسته فعلی استفاده می‌شود؛ سایر جداول/ماژول‌ها فقط پس از mapping و migration plan قابل انتقال‌اند.

### MASTER-MOTHER
- کد OTP از abstraction قابل‌جایگزینی برای rate-limit store و SMS sender استفاده می‌کند؛ در runtime مقصد هنوز SMS provider اجرایی متصل نیست.
- بنابراین پیاده‌سازی OTP پیامکی تا زمان تعریف provider، secretهای امن، جدول challenge، سیاست rate-limit و تست‌های امنیتی به production متصل نمی‌شود.
- مدل‌های مرکزی User/Tenant/Permission باید با `users`، `user_tenants`، `identity_*` و `security_sessions` موجود تطبیق داده شوند؛ جداول موازی ساخته نمی‌شوند.

### TejarhStore
- README شامل credential پیش‌فرض ادمین برای نصب مستقل است؛ هیچ appsettings یا credential از این پروژه وارد مخزن canonical نشده است.
- Product/Category/Brand/Cart/Order در بازارگاه فعلی با catalog، sellers، orders، checkout و payment provider موجود تطبیق داده می‌شوند؛ پروژه ASP.NET Core دوم اجرا نمی‌شود.
