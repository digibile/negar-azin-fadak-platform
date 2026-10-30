# ممیزی و نقشه ادغام Digibail در پلتفرم مرکزی

تاریخ: ۲۰۲۶-۱۰-۳۰  
مبدأ: `digibile/digibail`, branch `main`  
مقصد: `digibile/negar-azin-fadak-platform`, branch `integration/repository-audit-2026-10-30`  
وضعیت: ممیزی سورس و تطبیق؛ بدون انتقال کد یا داده

## ۱. ساختار مبدأ

مخزن مبدأ شامل frontend با Next.js، backend Node.js/PostgreSQL و بسته‌های C# جداگانه برای ماژول‌های Core، Contracts، Security، Tenancy، Enterprise و Ops است. README اجرای Node 22 و PostgreSQL 16 را اعلام می‌کند و تصریح دارد:
- ارسال SMS واقعی تا تنظیم Kavenegar API key/template فعال نیست؛ در نبود آن API باید 503 بدهد.
- OCR واقعی در README فعلی به provider نیاز دارد و نباید پاسخ ساختگی تولید کند.
- تست CI از PostgreSQL موقت استفاده می‌کند؛ نه دیتابیس تولیدی.

## ۲. حذف تکرار با VamCity

دو فایل `backend/ops/files/OpsModule.cs` و `OpsControllers.cs` در Digibail از نظر Git blob SHA دقیقاً با فایل‌های همان مسیر در `digibile/vamcity` یکسان‌اند:
- `OpsModule.cs`: `de336f0e1f31eb57ebc24c5d2fb95b6dd8b04b91`
- `OpsControllers.cs`: `eb5cad75e32700eb5baa4955d462d1e95d62cfa4`

پس PaymentDeclaration، CounterParty، Marketer، AppSetting، InquiryRequest و PurchaseOrder در دو repo یک قابلیت تکراری‌اند؛ این‌ها دوباره به مقصد منتقل نمی‌شوند. ادغام انجام‌شده در PR #124 مرجع هر دو repo برای این بخش است.

## ۳. ماژول‌هایی که معادل مرکزی دارند

### قراردادها
Digibail دارای `ContractTemplate`, `ContractVariableDef`, `ProductContract`, `GeneratedContract`, `ContractEvent`، نسخه‌بندی، approval/publish، تولید HTML، hash متن، رویداد امضا و لینک قالب به محصول وام است.
مقصد این قابلیت‌ها را در `lendtech_contract_templates`, `lendtech_contract_variable_defs`, `lendtech_product_contract_templates`, `lendtech_contract_documents`, `lendtech_contract_events` و `lendtech-contract-documents.ts` پیاده کرده است؛ migration 147 و API فعلی شامل CRUD، version، validate، approve، publish، generate، present، sign و reject هستند.
**تصمیم:** هیچ ContractTemplate یا ContractDocument دوم ساخته نشود. تفاوت‌های احتمالی فقط با تست تطبیقی موتور قرارداد بررسی شوند.

### امنیت و OTP
Digibail شامل Captcha تصویری SVG، OTP، pepper، محدودیت IP/شماره، ثبت‌نام موبایلی، AuthAdapter برای تطبیق مدل کاربر EF و صدور JWT است.
مقصد از قبل `otp_challenges`، هش HMAC کد، انقضا/مصرف یک‌باره، ثبت تلاش‌های verify در `otp_verification_attempts`، provider کاوه‌نگار با خطای 503 در نبود کلید، `human-check` امضاشده، CSRF، نشست و رخدادهای امنیتی را دارد.
تفاوت: CAPTCHA مقصد در حال حاضر چالش جمع ساده با HMAC است، نه تصویر ۵ رقمی Digibail. این یک گزینه بهبود anti-bot در همان endpoint موجود است؛ نباید SecurityController یا OTP subsystem موازی ایجاد شود. Captcha تصویری مبدأ هم مبتنی بر MemoryCache محلی است و در چند replica بدون cache مشترک نیازمند بازطراحی خواهد بود.

### محصول وام
`LoanProduct` مبدأ دارای مبلغ حداقل/حداکثر، tiers، شرایط، مدارک، فاصله اقساط، روش/درصد بهره، ضرایب دیرکرد/زودکرد و metadata نمایشی است. مقصد از قبل ماژول `lendtech` و مدل محصولات/قرارداد/اقساط را دارد. هر فیلد نمایشی یا هزینه عملیاتی مفقود باید در همان مدل موجود و backend محاسبه شود؛ جدول محصول دوم ساخته نشود.

## ۴. شکاف‌های واقعی و قابلیت‌های قابل بررسی

### الف) زونکن مدارک مشتری و OCR
Digibail مدل `CustomerDocument` و APIهای مشتری/مدیر دارد:
- upload تصویر JPG/PNG/WEBP با سقف ۶MB و بررسی signature فایل؛
- ذخیره فایل رمزنگاری‌شده با ASP.NET DataProtection در مسیر private؛
- ثبت نوع مدرک، کاربر، وام، hash/size و وضعیت Pending/Verified/Rejected؛
- ویرایش فیلدهای استخراج‌شده توسط کاربر تا پیش از تأیید؛
- دانلود امن فایل توسط مالک و مدیر؛
- OCR محلی با Tesseract و زبان fas+eng؛ در نبود Tesseract خروجی خالی و بررسی دستی باقی می‌ماند؛
- parser کارت ملی، تاریخ تولد، نام و نام پدر؛ فقط کد ملی با کنترل رقم آخر validate می‌شود و بقیه فیلدها صراحتاً حدسی و نیازمند بازبینی‌اند.

مقصد از قبل foundation مناسب دارد:
- `finance_document_vaults`
- `finance_document_files` شامل file_data/storage_key، SHA-256، نسخه و OCR status/text/extracted_data
- `finance_document_links` برای اتصال سند به entity
- `finance_ocr_jobs` برای provider، status، language، raw_text، extracted_data، confidence و خطا
- مرکز اسناد، governance، retention، approvals و identity verification UI

در مقصد API عمومی پیوست در `enterprise-interaction.ts` با `POST /api/enterprise/attachments` و `GET /api/enterprise/attachments/:id` وجود دارد و `AttachmentCapture.tsx` از آن استفاده می‌کند؛ این مسیرها فعلاً مجوز `documents:manage/read` می‌خواهند. صفحه `IdentityVerificationWorkspace.tsx` هنوز `file-reference` را به‌صورت متن در `module_records` ذخیره می‌کند و فایل واقعی را به پرونده مشتری متصل نمی‌کند. همچنین در API و `notification-worker.ts` مصرف‌کننده‌ای برای `platform_ocr_jobs` پیدا نشد؛ endpoint فقط job را enqueue می‌کند.

بنابراین gap دقیق‌تر self-service امن مشتری، اتصال فایل واقعی به پرونده identity/lendtech، بازبینی فیلدهای OCR و worker واقعی OCR است. مقصد دو storage foundation موازی دارد: `finance_document_files` در migration 087 و `platform_attachments` در migration 108. پیش از توسعه باید مرز آن‌ها روشن شود و جدول سوم یا ذخیره دوباره bytes ساخته نشود.

**محدودیت‌های کد مبدأ که نباید کپی شوند:**
- `loanId` ارسالی کاربر پیش از ذخیره در controller به مالکیت/tenant قرارداد متصل نمی‌شود.
- OCR فقط استخراج کمکی است؛ تأیید هویت یا KYC نیست.
- status Verified باید با بازبینی مجاز و audit ثبت شود؛ داده OCR به‌تنهایی نباید KYC را verified کند.
- DataProtection keys باید پایدار و مشترک بین replicaها باشند؛ مسیر private خارج از webroot و مجوز فایل محدود باشد.
- در endpointهای review مبدأ audit trail مستقل کامل برای before/after وضعیت مشاهده نشد.

### ب) کارت مجازی
Digibail `VirtualCard` و `VirtualCardTxn` دارد:
- PAN و CVV با DataProtection رمز می‌شوند؛ PAN hash برای lookup نگه‌داری می‌شود.
- صدور به ازای Loan، reveal برای صاحب کارت، freeze/unfreeze/close، تغییر سقف و transaction history.
- `/api/v1/gateway/card-charge` با Merchant-Key، CVV، expiry، سقف تراکنش و موجودی سقف کارت را بررسی می‌کند و `Spent` را افزایش می‌دهد.

در مقصد migration 122 فقط index/کنترل‌های پایه برای `credit_virtual_cards` دیده شد؛ API اجرایی کارت مجازی در tree فعلی مقصد پیدا نشد.

**اما gateway مبدأ کارت بانکی واقعی یا شبکه پرداخت نیست.** این یک closed-loop internal spending credential با PAN شبیه کارت است و هیچ issuer، شاپرک/بانک، settlement واقعی، authorization network یا اتصال به ledger/سفارش مقصد اثبات نشده است.

**ریسک‌های مبدأ:**
- صدور کارت فقط با شناسه loan/user و tenant انجام می‌شود؛ controller/service مالکیت و وضعیت قرارداد را کامل validate نمی‌کند.
- reveal شماره و CVV فقط به نشست کاربر متکی است؛ re-auth/MFA برای داده حساس مشاهده نشد.
- idempotency پرداخت فقط با جست‌وجوی تراکنش قبلی و lock در حافظه انجام می‌شود؛ برای چند replica کافی نیست و constraint یکتای DB در مسیر بررسی‌شده اثبات نشد.
- rate limit و lock کارت در MemoryCache/static process-local هستند؛ توزیع‌شده نیستند.
- gateway پرداخت را به ledger یا سفارش بازارگاه متصل نمی‌کند و در مسیر مشاهده‌شده بررسی expiry جاری ناقص است.

**تصمیم:** این قابلیت به‌عنوان «کارت بانکی واقعی» منتقل نمی‌شود. اگر محصول closed-loop کارت اعتباری داخلی لازم دارد، باید ابتدا قرارداد کسب‌وکار، اتصال به قرارداد/اعتبار مرکزی، ledger، سقف/مصرف، idempotency توزیع‌شده، MFA برای reveal، کلیدهای رمزنگاری پایدار و مدل issuer/processor مشخص شود. تا آن زمان فقط gap ثبت شده است.

### ج) استعلام بانک بتا
مبدأ endpoint `/api/v1/beta/inquiry` دارد، اما در کد صریحاً 501 برمی‌گرداند تا مستندات واقعی API بانک دریافت شود. هیچ استعلام یا پاسخ ساختگی منتقل نمی‌شود. مقصد `platform_verification_requests` را دارد؛ اتصال provider هنوز gap است.

### ریسک‌های امنیتی attachment API موجود مقصد
- `POST /api/enterprise/attachments` نوع MIME را از درخواست کلاینت می‌گیرد و در مسیر بررسی‌شده magic-byte validation برای JPEG/PNG/WebP/PDF ندارد؛ همچنین نوع‌های دلخواه می‌توانند به‌عنوان `stored_mime_type` ثبت شوند.
- فایل در `platform_attachments.binary_data` به‌صورت بایت خام ذخیره می‌شود؛ رمزنگاری application-level در مسیر فعلی مشاهده نشد.
- `GET /api/enterprise/attachments/:id` فایل را با `Content-Disposition: inline` و MIME ذخیره‌شده برمی‌گرداند؛ برای فایل‌های غیرتصویری یا MIME جعلی خطر اجرای محتوا در origin وجود دارد.
- API فقط tenant و مجوز عمومی documents:read/manage را بررسی می‌کند؛ دسترسی بر اساس مالکیت customer/application و attachment link نیست.
- بنابراین این API برای customer self-service مدارک هویتی تا رفع MIME sniffing، encryption-at-rest، headerهای امن، transaction و owner-level authorization آماده نیست.

### تصمیم مرجع فایل و صف OCR پس از بررسی schema و API
- مرجع عمومی پیوست برای مدارک هویتی/مشتری و فایل‌های متصل به موجودیت‌های عملیاتی، platform_attachments و platform_attachment_links در migration 108 است؛ این مدل tenant-scoped است، metadata و hash دارد و bytes یا storage_key را پشتیبانی می‌کند. platform_ocr_jobs نیز به همین attachment متصل است.
- finance_document_files در migration 087 به finance_document_vaults وابسته است و نسخه‌بندی/متن OCR سندهای زونکن مالی را نگه می‌دارد؛ برای هویت مشتری، فایل عمومی یا پشتیبانی نباید از آن به‌عنوان مخزن دوم استفاده شود.
- بنابراین جدول یا storage تازه ساخته نمی‌شود: platform_attachments مرجع واحد bytes و لینک عمومی است؛ finance_document_files فقط برای اسناد دارای مالکیت زونکن مالی باقی می‌ماند. اتصال سند هویتی به پرونده باید از طریق platform_attachment_links و شناسه واقعی module_record یا پرونده اعتباری باشد، نه متن آزاد file-reference.
- نقص امنیتی API فعلی: POST پیوست فقط documents:manage می‌خواهد و entityType/entityId ارسالی را بدون بررسی مالکیت موجودیت مقصد می‌پذیرد؛ GET نیز فقط tenant را کنترل می‌کند. این API برای self-service مشتری مناسب نیست. endpoint مشتری باید شناسه پرونده متعلق به همان user و tenant را خودش resolve کند، attachment را به همان پرونده link کند و دانلود را با مالکیت همان link محدود کند.
- صف OCR در schema و API وجود دارد، اما worker مصرف‌کننده platform_ocr_jobs در مقصد پیدا نشد؛ notification-worker فقط outbox/notification و چند job دیگر را پردازش می‌کند. کد مبدأ Digibail یک TesseractOcrProvider محلی و parser فیلدهای کارت هویت دارد، ولی image مقصد فعلاً node:22-alpine است و Tesseract/language data در آن نصب نیست.
- پیاده‌سازی self-service در همین شاخه انجام شد: GET /api/lendtech/my-applications، GET/POST /api/lendtech/my-documents و GET /api/lendtech/my-documents/:id/file. قبل از ثبت، پرونده با tenant و customer_ref کاربر احراز می‌شود؛ ثبت attachment، link و رویداد lendtech در یک transaction انجام می‌شود. دانلود مشتری فقط از مسیر attachment متصل به پرونده متعلق به همان customer_ref و tenant ممکن است.
- فایل سمت سرور با امضای واقعی PDF/JPEG/PNG/WebP تشخیص داده می‌شود؛ MIME ارسالی مرورگر قابل اعتماد نیست. نام فایل پاک‌سازی، hash SHA-256 ثبت، حجم فایل به ۸ مگابایت محدود و شناسه فایل/پرونده اعتبارسنجی می‌شود. صفحه /customer/documents به داشبورد مشتری اضافه شد و مرکز عملیاتی LendTech مدارک همان پرونده را با دسترسی مدیر نمایش و دانلود می‌کند.
- این پیاده‌سازی جدول یا مخزن جدید نمی‌سازد و OCR را به‌صورت ساختگی اجرا نمی‌کند. فایل‌ها با ocr_status=not_requested ثبت می‌شوند. worker مستقل OCR با provider محلی Tesseract، timeout، محدودیت concurrency، صف قفل‌شده SKIP LOCKED و نتیجه needs_review مرحله بعد است. تا زمانی که worker و Tesseract واقعی در image تست نشده‌اند، وضعیت OCR نباید موفق یا پردازش‌شده نمایش داده شود.

### مسیر تکمیل اسناد در مقصد
1. تعیین مرجع bytes میان `platform_attachments` و `finance_document_files`.
2. افزودن self-service در attachment service موجود با کنترل مالکیت کاربر و application.
3. اتصال IdentityVerificationWorkspace به attachment ID واقعی.
4. افزودن OCR worker به صف `platform_ocr_jobs`؛ Tesseract فقط در صورت نصب binary و زبان فارسی اجرا شود، در غیر این صورت وضعیت خطا/بازبینی دستی ثبت شود.
5. OCR فقط پیشنهاد فیلد است و جای تأیید هویت را نمی‌گیرد.

## ۵. نقشه تصمیم نهایی

| قابلیت Digibail | وضعیت مقصد | تصمیم |
|---|---|---|
| Ops entities/routes | با VamCity دقیقاً یکسان | فقط یک بار در PR #124 |
| قراردادهای نسخه‌دار و امضا | موجود در lendtech و migration 147 | بدون جدول موازی؛ تطبیق تستی |
| OTP و login security | موجود در auth/otp/security | بدون سیستم موازی؛ احتمال بهبود CAPTCHA در همان route |
| LoanProduct | موجود در lendtech | نگاشت فیلدهای متمایز در مدل فعلی |
| CustomerDocument/OCR | foundation vault/OCR موجود، API مشتری gap | پیاده‌سازی در Document Vault موجود؛ بدون جدول جدید |
| VirtualCard | migration foundation ناقص، API ندارد | gap؛ فقط پس از تصمیم محصول و کنترل مالی/امنیتی |
| Bank Beta inquiry | در مبدأ 501؛ مقصد provider gap | منتظر قرارداد واقعی provider |
| Tenancy | مقصد tenants/tenant-context کامل‌تر و مرکزی | هیچ middleware/tenant table موازی |

## ۶. ترتیب ادامه

1. پیاده‌سازی/تکمیل customer document API روی `finance_document_files` و `finance_ocr_jobs`، با tenant/owner validation، CSRF، permissions و audit.
2. اتصال UI موجود Document Center و Identity Verification به همان API.
3. تست OCR محلی فقط در صورت وجود Tesseract واقعی؛ در غیر این صورت status pending/manual، نه داده ساختگی.
4. کارت مجازی پس از تصویب specification مالی و issuer/closed-loop و امنیت؛ تا آن زمان بدون migration یا endpoint.
5. تست مقایسه‌ای موتور قرارداد Digibail و مقصد؛ فقط اصلاح موتور موجود در صورت اثبات اختلاف.

هیچ داده‌ای از Digibail منتقل نشده و در این سند migration یا API جدیدی ساخته نشده است.
