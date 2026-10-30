# ممیزی و نقشه ادغام TejarhStore در پلتفرم مرکزی

تاریخ: ۲۰۲۶-۱۰-۳۰  
مبدأ: `digibile/tejarhstore`، شاخه `main`  
مقصد: `digibile/negar-azin-fadak-platform`، شاخه `integration/repository-audit-2026-10-30`  
وضعیت: ممیزی سورس؛ بدون انتقال کد/داده یا تغییر دیتابیس

## ۱. دامنه سورس بررسی‌شده

مخزن مبدأ ۴۶ فایل دارد؛ سورس اصلی در `tejarhstore/src` و شامل لایه‌های Domain، Application، Infrastructure و Web است. فایل‌های کلیدی بررسی‌شده:
- Domain: `AppUser`, `Product`, `ProductImage`, `Category`, `Brand`, `Order`, `OrderItem`, `CartItem`.
- Infrastructure: `ApplicationDbContext`, `ProductConfiguration`, `DbInitializer`.
- Web: `AccountController`, `AdminProductsController`, APIهای Auth/Categories/Products، `CartController`, `CheckoutController`, `CartService`, `ZarinpalService`, `Program.cs`.
- راهنمای مبدأ ASP.NET Core 9 و PostgreSQL را اعلام می‌کند.

در tree فعلی migrationهای EF Core دیده نمی‌شوند؛ `Program.cs` در startup، `Database.Migrate()` را صدا می‌زند. بنابراین schema قابل بازتولید از migrationهای tracked در همین branch اثبات نشده است.

## ۲. موجودیت‌ها و رفتار مبدأ

| دامنه | مدل/رفتار |
|---|---|
| کاربر | `AppUser`: نام، ایمیل، هش رمز BCrypt، نقش Customer/Admin و تلفن؛ یکتایی ایمیل در DbContext |
| محصول | عنوان، slug، توضیحات، قیمت، قیمت تخفیف، موجودی عددی، دسته، برند، تصاویر |
| دسته‌بندی | نام، slug، آیکون، parent/children |
| برند | نام و لوگو |
| سبد | `CartService` در Session؛ اقلام شامل ProductId، عنوان، قیمت snapshot و تعداد |
| سفارش | `Order` با UserId عددی، مبلغ کل، Pending/Paid/Failed/Cancelled، Authority، RefId، نشانی/تلفن ارسال و OrderItems |
| پرداخت | اتصال مستقیم `ZarinpalService` به API درخواست/تأیید؛ مبلغ در کد در ۱۰ ضرب می‌شود تا از تومان به ریال تبدیل شود |
| مدیریت | CRUD محصول برای Admin؛ API عمومی فهرست/جزئیات/جستجوی محصول و دسته‌بندی |
| ورود | Cookie برای MVC؛ endpoint جداگانه `POST /api/auth/login` یک JWT هفت‌روزه صادر می‌کند |

در سورس قابل مشاهده مدل مستقل فروشنده، فروشگاه، tenant، تأمین‌کننده، کیف پول، اعتبار اقساطی، مرجوعی، تسویه فروشنده، حمل‌ونقل یا تاریخچه رویداد سفارش وجود ندارد.

## ۳. تطبیق با مقصد canonical

| قابلیت TejarhStore | معادل مقصد | تصمیم |
|---|---|---|
| Product / ProductImage | `products`, `product_images`, `marketplace_categories`, `brands`, `product_inventory` | مدل‌های مقصد مرجع باشند؛ قیمت/موجودی و رسانه از API مرکزی خوانده شود |
| Category / Brand | دسته‌بندی بازارگاه و `brands` | انتقال به taxonomy مرکزی؛ دسته/برند جدید موازی ممنوع |
| Cart Session | `cart_sessions`, `cart_items` و `domain-checkout.ts` | سبد session-only مبدأ جایگزین سبد tenant/customer/store مرکزی نشود |
| Order / OrderItem | `marketplace_orders`, `marketplace_order_items` | نگاشت به سفارش بازارگاه؛ سفارش با store/seller/customerRef و اقلام واقعی |
| Checkout | `domain-checkout.ts` | مسیر مقصد حفظ شود؛ در checkout قیمت جاری دوباره خوانده، موجودی قفل/رزرو و سفارش در تراکنش ساخته می‌شود |
| Zarinpal | `payment-provider.ts`, `commerce_payment_intents`, `payment_gateway_profiles`, `payment_gateway_attempts`, `payment_gateway_callback_events` | adapter مستقیم Zarinpal و کلیدهای مبدأ کپی نشوند؛ provider باید از قرارداد مرکزی و callback امضاشده/replay protection عبور کند |
| Refund | مسیر refund مرکزی بازارگاه | در TejarhStore مسیر کامل refund دیده نشد؛ مسیر مقصد حفظ شود |
| کاربران/نقش‌ها | IAM مرکزی | AppUser و نقش Admin/Customer مبدأ به جدول/هویت جدا منتقل نشوند |

### مزیت‌های مقصد که نباید با منطق ساده مبدأ تضعیف شوند
- tenant scope و permission در عملیات بازارگاه و checkout.
- ارتباط محصول با فروشنده/فروشگاه.
- کنترل وضعیت فعال محصول و قیمت مجدد در لحظه checkout.
- قفل موجودی و بررسی quantity-reserved_quantity.
- محدودیت سفارش تک‌فروشنده در checkout فعلی.
- ثبت سفارش و اقلام در تراکنش واحد و audit/business event.
- پرداخت دارای provider abstraction، idempotency key، دفترکل مرکزی و refund کنترل‌شده.
- callbackهای gateway با شناسه رویداد یکتا و سازوکار امضای HMAC در migration 121.

## ۴. ریسک‌ها و ایرادهای مبدأ

1. **رمز پیش‌فرض مدیر:** README مقدار `admin@tejarh.ir / Admin@123456` را برای ادمین پیش‌فرض اعلام می‌کند و `DbInitializer` همان رمز را seed می‌کند. این seed نباید وارد محیط production شود.
2. **کلید JWT پیش‌فرض:** `AuthApiController` در صورت نبود `Jwt:Key` از کلید ثابت داخل سورس استفاده می‌کند. این fallback ناامن است.
3. **JWT middleware:** `Program.cs` فقط Cookie Authentication را ثبت می‌کند و در فایل بررسی‌شده `AddJwtBearer` وجود ندارد؛ بنابراین قرارداد JWT API با middleware قابل مشاهده هم‌راستا نیست.
4. **Seed داده نمونه:** `DbInitializer` اگر جدول محصولات خالی باشد سه محصول نمونه درج می‌کند. این رفتار برای داده عملیاتی و مهاجرت واقعی مناسب نیست.
5. **Checkout قیمت/موجودی:** قیمت و تعداد در Session نگهداری می‌شوند؛ در مسیر Pay قیمت فعلی محصول و موجودی دوباره از DB اعتبارسنجی نمی‌شوند. امکان سفارش با قیمت snapshot قدیمی و بدون رزرو موجودی وجود دارد.
6. **Callback پرداخت:** callback ناشناس است و در controller وضعیت قبلی سفارش را قبل از verify به Pending محدود نمی‌کند؛ کنترل idempotency و قفل تراکنش در همان controller دیده نمی‌شود. کد 101 پاسخ Zarinpal هم موفق تلقی می‌شود. این منطق نباید به مقصد منتقل شود.
7. **مقدار RefId:** `GetRawText()` روی JSON number متن خام را برمی‌گرداند؛ باید به‌عنوان قرارداد provider و نوع مرجع پرداخت بررسی شود، نه اینکه بدون normalization منتقل شود.
8. **اعتبارسنجی ورودی:** کنترل‌های محدود تعداد، موجودی، قیمت و نشانی در مسیر checkout مبدأ ضعیف‌اند؛ هیچ محاسبه مالی یا قیمت‌گذاری frontend نباید وارد مقصد شود.
9. **مهاجرت EF:** migrationهای tracked در درخت مبدأ مشاهده نشد؛ ساختار فیزیکی دیتابیس و نسخه داده باید جداگانه از فایل/DB واقعی بررسی شود.

## ۵. تصمیم ادغام

- قابلیت‌های کاتالوگ، دسته‌بندی، برند، سبد، سفارش و پرداخت از نظر دامنه با مقصد هم‌پوشانی مستقیم دارند؛ کپی پروژه ASP.NET یا ایجاد دیتابیس/route/منوی مستقل ممنوع است.
- ارزش قابل استفاده مبدأ در جزئیات تجربه storefront و مدل‌های ساده Product/Category/Brand/Order است؛ این‌ها باید با API و مدل‌های مقصد تطبیق داده شوند، نه اینکه جداول موازی ساخته شوند.
- مقصد فعلاً از نظر checkout و پرداخت از منطق مبدأ کامل‌تر و امن‌تر است؛ Zarinpal integration مبدأ به‌عنوان adapter اجرایی منتقل نمی‌شود.
- هر داده قدیمی باید با نگاشت tenant، seller/store، product، customer identity و order item بررسی شود. شناسه‌های عددی EF مبدأ را مستقیم به UUIDهای مقصد تبدیل نکن.
- هیچ داده‌ای از پایگاه داده TejarhStore خوانده یا منتقل نشده و هیچ migration جدیدی در این مرحله ایجاد نشده است.

## ۶. مرحله بعدی لازم برای انتقال داده

- تهیه schema واقعی و backup سازگار از دیتابیس PostgreSQL مبدأ؛
- استخراج شمارش محصولات/دسته‌ها/برندها/کاربران/سفارش‌ها و وضعیت پرداخت؛
- گزارش رکوردهای یتیم، ایمیل تکراری، محصول بدون تصویر/دسته/برند، سفارش بدون کاربر و اقلام نامعتبر؛
- mapping قطعی به tenant/store/seller/customer/product و تطبیق وضعیت پرداخت با gateway/ledger مقصد؛
- اجرای dry-run در staging و reconciliation قبل از هر backfill.

تا تکمیل این مرحله، هیچ رکورد عملیاتی import نمی‌شود.
