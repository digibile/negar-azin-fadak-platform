# نقشه انتقال رابطه‌ای دیتابیس Vamcity به هسته Sookar

تاریخ بررسی: 2026-10-30  
مخزن مقصد: `digibile/negar-azin-fadak-platform`  
شاخه بررسی: `integration/vamcity-relational-mapping-2026-10-30`

## تصمیم اجرایی

این سند نقشه انتقال است، نه دستور اجرای انتقال. تا زمان دسترسی به بکاپ واقعی و تأیید صحت شمارش‌ها، هیچ داده‌ای از دیتابیس تولیدی وارد Sookar نمی‌شود و هیچ migration روی دیتابیس عملیاتی اجرا نمی‌شود.

مقصد canonical همان PostgreSQL موجود در Sookar است. SQL Server یا PostgreSQL دوم، سرویس موازی و موتور وام مستقل ساخته نمی‌شود.

## شواهد منبع

فایل مرجع ساختار و شمارش:
`digibile/digibail/docs/vamcity-database-inventory.md`

این inventory برای سه دیتابیس snapshot زیر گزارش می‌دهد:

| دیتابیس منبع | جدول | ستون | ردیف گزارش‌شده |
|---|---:|---:|---:|
| `vamcityc_vamcity` | 88 | 957 | 531,172 |
| `vamcityc_bluvamdb` | 56 | 573 | 286,597 |
| `vamcityc_transferDb` | 12 | 78 | 29 |
| **مجموع** | **156** | **1,608** | **817,798** |

این اعداد از inventory ثبت‌شده خوانده شده‌اند و تا زمان اجرای شمارش مجدد روی بکاپ معتبر، نباید به‌عنوان تعداد زنده دیتابیس تولیدی معرفی شوند. در دیتابیس اصلی، inventory تعدادهای جداگانه‌ای برای کاربران، درخواست‌های وام، پرونده‌های وام و پرداخت‌ها ثبت کرده است.

## مقصدهای موجود در هسته

Migrationهای موجود مقصد عملیاتی زیر را تعریف می‌کنند:

- `lendtech_applications`: درخواست اعتبار، متقاضی، محصول، مبلغ، مدت، KYC و شرایط اولیه
- `lendtech_scores`: امتیاز و ورودی‌های ارزیابی
- `lendtech_decisions`: تصمیم و مبلغ/مدت مصوب
- `lendtech_facilities`: تسهیلات مصوب و مانده قابل استفاده
- `lendtech_contracts`: قرارداد وام
- `lendtech_installments`: اقساط، سررسید و مبالغ اصل/سود پرداخت‌شده
- `lendtech_repayments`: پرداخت‌ها و تخصیص مبالغ
- `lendtech_delinquencies`: معوقات
- `lendtech_restructures`: بازسازی و تقسیط مجدد
- `lendtech_collaterals`: وثایق
- `lendtech_collection_cases`: پرونده‌های وصول
- `lendtech_events`: رخدادهای ممیزی چرخه تسهیلات

هسته همچنین `users`, `tenants`, `user_tenants`, `security_sessions`, `accounting_documents`, `ledger_accounts` و زیرساخت دفترکل را دارد.

Migrationهای قدیمی منوهای 11 تا 31 در بسیاری موارد فقط تعریف فیلد و مجوز برای `module_records` را ثبت می‌کنند؛ وجود آن metadata به‌تنهایی به معنی وجود جدول تراکنشی و رابطه‌ای واقعی نیست. برای انتقال عملیاتی، مقصدهای نرمال‌شده بالا مبنا هستند.

## نگاشت اولیه جدول‌های اصلی

| SQL Server منبع | مقصد PostgreSQL | تصمیم |
|---|---|---|
| `AspNetUsers` | `users` + `user_tenants` | تطبیق هویت با کلید legacy پایدار؛ بررسی hash رمز و نقش‌ها اجباری |
| `AspNetRoles`, `AspNetUserRoles`, Claims | نقش‌ها و مجوزهای مرکزی | تبدیل نقش‌ها به RBAC مقصد؛ claims خام بدون mapping فعال نشوند |
| `Customers` | `tenants` / `companies` یا مرجع مشتری | نیازمند تفکیک tenant از شخص؛ Customer را خودکار tenant فرض نکن |
| `Loans` | کاتالوگ محصول تسهیلاتی | نگاشت محصول/ضوابط؛ نه قرارداد و نه درخواست |
| `LoanRequestStatuses` | وضعیت‌های چرخه درخواست | نگاشت کدهای enum و ترتیب وضعیت با حفظ کد مبدأ |
| `UserLoanRequests` | `lendtech_applications` | نگاشت مشتری، محصول، مبلغ، مدت، تاریخ، وضعیت و ارجاع کارگزار/ضامن |
| `UserLoanRequestStatusHistories` | `lendtech_events` | حفظ ترتیب زمانی و وضعیت قبل/بعد؛ رویدادها immutable |
| `UserLoanRequestAuthorizationItems` و پیوست‌ها | مخزن اسناد و روابط پرونده | انتقال metadata و فایل‌ها با checksum؛ هیچ فایل گمشده به‌عنوان موفق ثبت نشود |
| `UserLoans` | `lendtech_facilities` + `lendtech_contracts` | حفظ شناسه مبدأ، مبلغ، مانده، تاریخ شروع/تسویه و رابطه درخواست |
| `UserLoanPayments`, `UserLoanPaymentRequests`, `UserLoanPaymentOthers` | `lendtech_repayments` و دفترکل | تعیین نهایی براساس معنای واقعی هر جدول؛ پرداخت درخواست‌شده با پرداخت موفق یکی نیست |
| `UserLoanSponsoreDueDate` | اقساط/تعهدات ضامن یا وصول | نیازمند تعیین معنای حقوقی و رابطه دقیق؛ به قسط وام‌گیرنده تبدیل خودکار نشود |
| `Assurances`, `LoanAuthorizationItems`, `AssuranceRequirements` | `lendtech_collaterals` + اسناد | حفظ نوع وثیقه، مالک، ارزش، وضعیت بازگشت و پیوست |
| `AgentLoans`, `AgentFactors`, `AgentFactorItem` | پذیرندگان/نمایندگان، تسویه و دفترکل | حفظ قرارداد کارگزار، کمیسیون و جزئیات فاکتور؛ با سفارش فروش اشتباه نشود |
| `Withdraws`, `OnlineMoneyTransfer`, `ThirdPartyTransfer` | کیف پول/دفترکل و پرداخت | تعیین موفقیت/برگشت و تطبیق مرجع بانکی پیش از ثبت سند |
| `SmsPatterns`, `AppSms` | `sms_templates` و رخدادهای اعلان | قالب‌ها قابل انتقال‌اند؛ logها آرشیوی و حاوی داده شخصی‌اند |
| `Tickets`, `TicketResponses` | CRM/ارتباطات و گردش‌کار | حفظ مالک، مشتری، ترتیب پاسخ و پیوست‌ها |
| `CustomerPurchasePlan`, `MemberPurchases`, `Purchases` | marketplace/orders یا برنامه خرید اعتباری | نیازمند تفکیک خرید نقدی، خرید اعتباری، سفارش و برنامه مجاز خرید |

این جدول نگاشت اولیه مفهومی است؛ mapping ستون‌به‌ستون، enum و foreign key باید از بکاپ اصلی و مدل‌های EF استخراج شود. هیچ کد وضعیت یا معنای مالی از روی نام ستون حدس زده نمی‌شود.

## خطرهای شناسایی‌شده در اسکریپت import موجود Digibail

فایل `scripts/import-vamcity-real-data.mjs` در مخزن Digibail:

1. از سه دیتابیس restore جداشده با نام‌های `*_import_20261028` می‌خواند؛ مقصد اجرای آن مسیر مستقل `/home/digibail/domains/digebail.ir` است، نه Sookar.
2. کاربران، مشتریان و الگوهای پیامک را به چند جدول مشخص وارد می‌کند؛ سایر جدول‌ها را به‌صورت JSON در `legacy_source_data` آرشیو می‌کند.
3. وجود JSON در `legacy_source_data` به معنی انتقال عملیاتی درخواست‌ها، قراردادها، اقساط، پرداخت‌ها یا دفترکل نیست.
4. منطق skip بر پایه تعداد ردیف‌هاست؛ برابری count به‌تنهایی برابری محتوا، کلیدها یا checksum را ثابت نمی‌کند.
5. تبدیل نقش‌ها و رمزهای `AspNetUsers` باید با سازگاری الگوریتم ASP.NET Identity و login مقصد بررسی شود. کد ورود فعلی مقصد از bcrypt استفاده می‌کند؛ prefix کردن hash قدیمی به‌تنهایی امکان ورود را فراهم نمی‌کند.
6. اسکریپت در مسیر جداگانه خود از تنظیمات اتصال SQL Server/PostgreSQL همان استقرار استفاده می‌کند؛ اجرای آن روی Sookar بدون بازنویسی و بازبینی امنیتی ممنوع است.

بنابراین این اسکریپت به‌عنوان ابزار انتقال نهایی Sookar پذیرفته نشده است.

## الزامات قبل از انتقال واقعی

- دریافت و بررسی فایل backup اصلی `.bak` یا نسخه معتبر restore شده؛ ثبت SHA-256 و اندازه فایل.
- اجرای `RESTORE VERIFYONLY` و restore فقط به نام دیتابیس staging ایزوله، نه دیتابیس عملیاتی.
- استخراج مجدد تعداد جدول/ستون/کلید خارجی/ایندکس/trigger/view/procedure و count واقعی هر جدول.
- تطبیق دقیق schema و FKها، سپس ساخت جدول crosswalk برای شناسه‌های SQL Server به UUIDهای مقصد.
- تعیین tenant واقعی هر رکورد و جلوگیری از اتصال داده یک مشتری به tenant اشتباه.
- mapping قطعی وضعیت‌های درخواست، پرداخت موفق/ناموفق/برگشتی، تقسیط، وثیقه و تاریخ‌های شمسی/میلادی.
- سازگاری رمزها و فرآیند اجبار reset در موارد غیرقابل تبدیل؛ هرگز hash ناشناخته را قابل ورود فرض نکن.
- import مرحله‌ای، idempotent و تراکنشی با شمارش مبدأ/مقصد، checksum batch و گزارش اختلاف.
- انتقال فایل‌ها با حفظ مسیر، نام امن، MIME، اندازه و checksum؛ تست دسترسی اسناد.
- تطبیق جمع مبالغ اصل، پرداخت، مانده، اقساط و دفترکل؛ اختلاف مالی باید صفر یا مستند و تأییدشده باشد.
- تست جداسازی tenant، دسترسی نقش‌ها، گزارش‌ها، و rollback کامل در staging.
- تأیید کتبی گزارش تطبیق قبل از cutover.

## وضعیت فعلی

- هیچ دیتابیس production تغییر نکرده است.
- هیچ جدول legacy به‌صورت عملیاتی در Sookar وارد نشده است.
- هیچ داده‌ای از سه دیتابیس Vamcity حذف یا overwrite نشده است.
- هیچ secret، connection string، رمز بانکی، کلید درگاه یا محتوای شخصی در Git ثبت نشده است.
- گام بعدی پس از دسترسی به backup معتبر: ساخت crosswalk و mapping ستون‌به‌ستون، سپس اجرای import در staging و تطبیق گزارش مالی؛ نه اجرای مستقیم روی production.
