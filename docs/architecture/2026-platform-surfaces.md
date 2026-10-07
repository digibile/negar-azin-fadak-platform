# معماری سطوح محصول و قواعد توسعه 2026

این سند قرارداد معماری رابط کاربری و سطح محصول است. هر توسعه‌دهنده قبل از ایجاد صفحه، ماژول، قالب یا کانال جدید باید این قواعد را رعایت کند.

## 1. سطوح محصول

- دامنه اصلی: فروشگاه اینترنتی اصلی.
- Marketplace: بازارگاه چندفروشنده.
- Seller Store: فروشگاه اختصاصی هر فروشنده/پذیرنده با دامنه و قالب مستقل.
- Pay: اعتبار، وام و تسهیلات.
- Corporate: معرفی شرکت، اخبار، محتوا و کمپین‌های عمومی.
- Management: مرکز مدیریت کل و تنها سطح مدیریت سازمانی.

این سطوح تجربه‌های متفاوت دارند اما Identity، Tenant Context، Permission، API و داده‌های هسته را دوباره‌کاری نمی‌کنند.

## 2. Multi-tenant

دامنه/Host به Tenant Context نگاشت می‌شود. هیچ داده‌ای بدون Tenant Context معتبر خوانده یا نوشته نمی‌شود.

هر Tenant می‌تواند:
- دامنه و زیردامنه داشته باشد.
- Theme و Template مستقل داشته باشد.
- صفحات و منوی اختصاصی داشته باشد.
- کاربران، نقش‌ها و مجوزهای محدود به همان محدوده داشته باشد.

## 3. Identity واحد

کاربر فقط یک هویت مرکزی دارد. وب، Android، iOS، فروشگاه، Marketplace، Pay و Management از همان User/Session/Permission استفاده می‌کنند.

ساخت User Database موازی برای هر محصول ممنوع است.

## 4. Localization و Currency

Locale، زبان، منطقه زمانی، قالب تاریخ/عدد و Currency باید در سطح Tenant و در صورت نیاز در سطح User قابل تنظیم باشند.

هیچ متن UI جدیدی نباید فقط به صورت literal فارسی در یک Component قفل شود. متن‌های قابل ترجمه باید کلید ترجمه داشته باشند.

محاسبات مالی باید Currency-aware باشند و تبدیل ارز فقط از سرویس نرخ معتبر و ثبت‌شده انجام شود.

## 5. Theme و Page Builder

Theme فقط رنگ و فونت نیست. Theme شامل:
- tokens
- typography
- spacing
- components
- header/footer
- navigation
- page templates
- responsive rules
- content sections

است.

قالب‌ها باید قابل نسخه‌بندی، پیش‌نمایش، انتشار، rollback و تخصیص به Tenant باشند.

## 6. ارتباطات و کانال‌ها

SMS، Email، Push، WhatsApp، Telegram، Instagram، پیام‌رسان‌های ایرانی و سایر Providerها باید از Integration/Communication Hub عبور کنند.

هر Provider باید adapter مستقل داشته باشد. منطق کسب‌وکار نباید مستقیماً به SDK یک Provider وابسته شود.

## 7. AI و دستیار صوتی

AI از طریق permission، tenant و policy به داده دسترسی می‌گیرد.

دستیار صوتی «نگار» باید به صورت Agent قابل توسعه ساخته شود:
- Voice input
- Speech-to-text
- Intent/Agent orchestration
- Permission check
- Business action
- Text-to-speech
- Audit log

هیچ Agent نباید بدون Permission مستقیماً عملیات مالی، اعتباری یا مدیریتی انجام دهد.

## 8. CSS

Global CSS فقط برای reset، tokens و قواعد واقعاً سراسری است.

هر Surface و Component باید stylesheet/module مستقل داشته باشد. افزودن selector عمومی برای حل مشکل یک صفحه ممنوع است.

قبل از افزودن CSS جدید، Component/Pattern موجود بررسی شود.

## 9. کامنت و مستندسازی

کامنت باید «چرایی» معماری را توضیح دهد، نه اینکه کد را به زبان دیگر تکرار کند.

برای نقاط حساس از این برچسب‌ها استفاده شود:
- Architecture
- Security
- Tenant Isolation
- Data Ownership
- API Contract
- Design System
- Accessibility
- SEO
- Mobile Behavior
- Extension Point

## 10. قانون ضد تکرار

قبل از ساخت قابلیت جدید:
1. قابلیت موجود جستجو شود.
2. API موجود بررسی شود.
3. Entity و migration موجود بررسی شود.
4. Workspace موجود بررسی شود.
5. Shared UI بررسی شود.
6. فقط در صورت نبود قابلیت واقعی، قابلیت جدید ساخته شود.

## 11. سطح دسترسی مدیریت

مدیرکل/مدیرعامل از مرکز مدیریت می‌تواند:
- Tenant ایجاد و مدیریت کند.
- کاربر و نقش تعریف کند.
- Permission اختصاص دهد.
- دسترسی فروشنده/پذیرنده/کارمند/حسابدار/مدیر مالی را کنترل کند.
- قالب، دامنه و کانال ارتباطی را مدیریت کند.

هیچ پنل تخصصی نباید User/Role مستقل خارج از Identity مرکزی ایجاد کند.

## Commerce price and financing architecture

- Market price intelligence is source-driven: API/feed/authorized crawler/manual source registry, timestamped offer snapshots, freshness windows and confidence.
- Store pricing is policy-driven. Lowest verified market price is an input, not an uncontrolled overwrite. Policies support fixed, lowest-market, market-minus and cost-plus with floor/ceiling.
- Financing providers are first-class suppliers. Banks, lenders, financing brands and individual programs are data/configuration, so a brand such as «باما» can be defined centrally when its exact commercial terms are supplied.
- Product checkout distinguishes cash price, financing offer, quote and final invoice/order. A financing quote can expire and be repriced before conversion.
- Financing approval uses business-day calendars. Canonical storage remains ISO/Gregorian timestamps; presentation can be Persian/Jalali, English/Gregorian or other supported calendars. ISO 8601 is the interchange baseline. 
- Credit wallets are segregated from cash wallets. They cannot be cashed out or transferred by default; purchase authorization uses holds and immutable credit-wallet ledger entries.
- Virtual cards store provider references/tokens and masked presentation only. Raw PAN/CVV are not stored in the platform.
- Scheduled approval reminders enter the central notification outbox at the configured local time, then use the enabled provider adapter.
- Catalog variants support attributes such as color, RAM, storage, camera and other product-specific dimensions without hard-coding a mobile-only schema.
