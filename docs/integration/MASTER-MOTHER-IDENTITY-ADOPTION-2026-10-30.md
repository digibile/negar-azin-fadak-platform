# ممیزی دامنه هویت MASTER-MOTHER و نگاشت به پلتفرم مرکزی

تاریخ: ۲۰۲۶-۱۰-۳۰  
مبدأ: `digibile/MASTER-MOTHER-NEGARAZINFAKA`, branch `main`  
مقصد: `digibile/negar-azin-fadak-platform`  
وضعیت: بررسی مدل دامنه و تصمیم معماری؛ بدون migration یا backfill

## ۱. مدل مبدأ که بررسی شد

### IdentityProfile
موجودیت `IdentityProfile` به ازای یک user ایجاد می‌شود و این اطلاعات را نگه می‌دارد:
- FirstName, LastName, FatherName, MotherName
- NationalId به‌صورت ValueObject معتبر
- DateOfBirth, Gender, PlaceOfBirth, Occupation, MaritalStatus, NationalityCode
- VerificationStatus: Unverified, Extracted, PendingVerification, Verified, Rejected, NeedsReview, Expired
- VerifiedAt, VerifiedBy, VerificationMethod
- ConcurrencyStamp و تاریخچه تغییر صفات

### FieldProvenance
برای هر فیلد، منشأ داده ثبت می‌شود:
- None
- OcrExtracted
- UserEntered
- UserConfirmed
- ReviewerApproved
- ProviderVerified

قاعده مهم: OCR هرگز مقدار UserConfirmed/ReviewerApproved/ProviderVerified را overwrite نمی‌کند. تأیید کاربر به‌تنهایی profile را verified نمی‌کند. MarkVerified فقط وقتی profile کامل باشد اجازه اجرا دارد.

### کنترل تطبیق هویت
- تطبیق کد ملی با ۱۰ رقم؛
- تطبیق تاریخ تولد؛
- مقایسه نام فارسی با normalize کردن ی/ي، ک/ك، نیم‌فاصله، اعراب و ارقام فارسی/عربی؛
- conflictها با نوع mismatch/missing و فهرست checkهای انجام‌شده ثبت می‌شوند؛
- کد ملی متعارض نیازمند بازبینی انسانی است.
- DuplicateDetectionPolicy تطبیق exact کد ملی/موبایل را مانع ایجاد خودکار می‌داند و شباهت نام را فقط برای review بالا می‌آورد؛ merge همیشه تصمیم انسانی است.

### BankAccount
مدل بانکی مبدأ به UserId متصل است و BankCode, AccountNumber, IBAN, CardNumber, BankName, Ownership(Self/Other/Unverified), VerifiedAt و VerificationMethod دارد. ValueObject مربوط به IBAN قالب IR+24 رقم و MOD-97 را کنترل می‌کند.

## ۲. تطبیق با مقصد فعلی

| مفهوم مبدأ | معادل موجود مقصد | وضعیت |
|---|---|---|
| User identity principal | `users`, `identity.ts` | هویت ورود و اطلاعات پایه موجود است |
| FullName / NationalId | `users.full_name`, `users.national_id`, بخشی از `crm_customers` | داده پایه موجود، اما مالکیت canonical و provenance فیلدها کامل نیست |
| IdentityProfile | `IdentityVerificationWorkspace` و رکوردهای عمومی ماژول | معادل aggregate واقعی نیست؛ UI فعلی رکورد generic و file-reference متنی دارد |
| FieldProvenance | معادل مستقلی پیدا نشد | gap |
| Profile change request/history | audit events عمومی | workflow تغییر قانونی فیلدهای هویتی و before/after تخصصی پیدا نشد |
| IdentityVerification | `platform_verification_requests`, KYC در lendtech | foundation و صف وجود دارد؛ cross-check پروفایل و فیلدها کامل نیست |
| DuplicateDetectionPolicy | unique national_id/mobile در بخش‌هایی از schema | policy یکپارچه تشخیص duplicate و review/merge identity پیدا نشد |
| Identity BankAccount | `accounting_parties` + `accounting_party_bank_accounts` | حساب بانکی طرف تجاری اضافه شده؛ ارتباط یک user شخصی به party canonical هنوز تصمیم‌گیری نشده |
| IdentityDocument | `platform_attachments`, `platform_attachment_links`, `platform_ocr_jobs` | ذخیره و لینک عمومی موجود؛ اتصال owner-scoped به identity و OCR worker کامل نیست |

## ۳. شکاف‌های مهم

1. **منشأ فیلد:** مقصد نمی‌تواند بگوید full_name یا national_id از OCR، ورود کاربر، تأیید کاربر، بازبین یا provider آمده است.
2. **تغییر اطلاعات هویتی:** API عمومی users امکان update نام/کد ملی دارد، اما workflow تخصصی تغییر اطلاعات قانونی با دلیل، before/after، review و concurrency check در سطح aggregate دیده نشد.
3. **تأیید هویت:** KYC در lendtech با provider معتبر محافظت شده، اما IdentityVerificationWorkspace عمومی نباید به‌عنوان master identity یا KYC verified تلقی شود.
4. **تطبیق OCR با profile:** مقصد صف OCR دارد، اما worker و consistency checker برای تطبیق فیلدهای سند با داده confirmed موجود نیست.
5. **تشخیص هویت تکراری:** باید قبل از ساخت مشتری/کاربر یا merge پرونده‌ها، تطبیق دقیق کد ملی/موبایل و review نام مشابه انجام شود.
6. **حساب بانکی شخص:** migration 150 حساب بانکی طرف‌حساب را اضافه کرده، اما رابطه canonical بین users و accounting_parties هنوز وجود ندارد. ساخت جدول BankAccount دوم ممنوع است.

## ۴. تصمیم معماری پیشنهادی

- `users` تنها principal ورود/نشست باقی بماند؛ IdentityProfile نباید حساب ورود دوم یا user table موازی بسازد.
- یک extension یک‌به‌یک برای پروفایل قانونی کاربر طراحی شود، با فیلدهای هویتی، provenance فیلدبه‌فیلد، status، concurrency stamp و تاریخچه تغییر. پیش از migration باید مشخص شود کدام ستون‌های فعلی users صرفاً projection سازگار باقی می‌مانند و کدام منبع حقیقت خواهند بود.
- تغییر کد ملی/نام قانونی بعد از user confirmation فقط از مسیر change request با دلیل، بازبین، audit و optimistic concurrency انجام شود.
- OCR فقط پیشنهاد فیلد با provenance=OcrExtracted ایجاد کند؛ کاربر آن را تأیید کند؛ provider/reviewer بعداً می‌تواند provenance را ارتقا دهد. OCR به‌تنهایی هیچ‌گاه Verified نمی‌شود.
- `platform_verification_requests` برای استعلام‌ها استفاده شود؛ جدول verification موازی ساخته نشود. پاسخ provider باید correlation، signature، timestamp و audit داشته باشد.
- Duplicate detection پیش از ایجاد/merge در همان identity/customer registration flow قرار گیرد؛ fuzzy name فقط هشدار است و merge خودکار ممنوع.
- مدارک به attachment storage موجود متصل شوند؛ قبل از self-service باید encryption-at-rest، MIME signature validation، owner scope و OCR worker تکمیل شود.
- حساب بانکی شخص پس از تصمیم درباره user-to-party link به `accounting_party_bank_accounts` وصل شود؛ BankAccount table دوم ساخته نشود.

## ۵. ترتیب ادامه

1. مشخص کردن source of truth برای full_name/national_id و طراحی profile extension بدون شکستن APIهای فعلی.
2. افزودن field provenance و change request در همان identity service.
3. افزودن duplicate detection در registration/customer onboarding با review انسانی.
4. اتصال فایل‌های identity به attachment service پس از رفع ریسک‌های امنیتی و OCR worker.
5. اتصال user به accounting_party و استفاده از party bank accounts؛ نه ساخت حساب بانکی موازی.
6. تست‌های domain برای جلوگیری از overwrite confirmed data، mark verified ناقص، merge خودکار و تغییر هویت بدون audit.

هیچ schema یا کدی از MASTER-MOTHER در این مرحله منتقل نشده است؛ این سند نقشه نگاشت domain است، نه ادعای پیاده‌سازی.
