# دیجی‌بایل | برنامه و پایگاه داده

این شاخه شامل فرانت‌اند فارسی، API احراز هویت متصل به PostgreSQL، مهاجرت‌های دیتابیس و اجرای Docker روی پورت `1631` است.

## اجزا

- Node.js 22+
- PostgreSQL 16
- ورود با رمز ثابت، کپچای سمت سرور، ثبت‌نام با تأیید پیامکی، OTP، JWT و ثبت رخدادهای امنیتی
- مهاجرت دیتابیس خودکار هنگام شروع برنامه
- Docker Compose با volume پایدار برای داده‌ها

## نام دیتابیس

- Database: `digibail_prod`
- Database user: `digibail_app`
- Port: `1631`

رمز پایگاه داده و کلیدهای امنیتی در Git ذخیره نمی‌شوند. روی محیطی که Docker و OpenSSL دارد، فایل `.env` را بسازید:

```sh
bash scripts/generate-env.sh
```

این دستور رمز تصادفی قوی تولید می‌کند و فایل را با مجوز `600` ذخیره می‌کند. فایل واقعی `.env` نباید commit یا منتشر شود.

## اجرا

```sh
npm install
bash scripts/generate-env.sh
docker compose up --build -d
docker compose ps
curl -i http://127.0.0.1:1631/healthz
```

برنامه ابتدا مایگریشن `backend/db/001_init.sql` را اعمال می‌کند و بعد روی پورت 1631 بالا می‌آید. سلامت `/healthz` اتصال واقعی دیتابیس را بررسی می‌کند.

## پیامک و OTP واقعی

برای ارسال OTP، مقادیر `KAVENEGAR_API_KEY` و `KAVENEGAR_TEMPLATE` را در فایل محرمانه `.env` تنظیم کنید. اگر این تنظیمات موجود نباشد، API با خطای مشخص `503` متوقف می‌شود و کد ساختگی یا ورود جعلی ایجاد نمی‌کند.

## ساخت حساب مدیرکل

پس از بالا آمدن دیتابیس، حساب مدیرکل را با اطلاعاتی که مالک سامانه انتخاب کرده ایجاد کنید. دستور زیر نمونه است؛ مقادیر را در همان محیط امن وارد کنید و رمز را در خط فرمان مشترک یا Git ننویسید:

```sh
read -r -p "نام کاربری مدیر: " ADMIN_USERNAME
read -r -p "موبایل مدیر: " ADMIN_PHONE
read -r -p "نام کامل مدیر: " ADMIN_FULL_NAME
read -r -p "کد ملی مدیر: " ADMIN_NATIONAL_CODE
read -r -s -p "رمز قوی مدیر (حداقل ۱۶ نویسه): " ADMIN_PASSWORD; echo
export ADMIN_USERNAME ADMIN_PHONE ADMIN_FULL_NAME ADMIN_NATIONAL_CODE ADMIN_PASSWORD
docker compose exec -T -e ADMIN_USERNAME -e ADMIN_PHONE -e ADMIN_FULL_NAME -e ADMIN_NATIONAL_CODE -e ADMIN_PASSWORD app node scripts/create-admin.js
unset ADMIN_PASSWORD
```

اسکریپت رمز را چاپ نمی‌کند و رمز عبور را با bcrypt هش می‌کند. اگر متغیرها به کانتینر منتقل نشده باشند، اجرای آن باید از محیطی انجام شود که `DATABASE_URL` و همین متغیرها را به‌صورت امن دارد.

## تست‌ها و CI

GitHub Actions سرویس PostgreSQL موقت بالا می‌آورد، تست‌ها را اجرا می‌کند، مهاجرت را اعمال می‌کند، سلامت دیتابیس و API کپچا را می‌سنجد و Docker image را می‌سازد. این دیتابیس فقط برای CI است و دیتابیس دائمی تولیدی نیست.

## محدودیت‌های صادقانه

- OCR مدارک هنوز به ارائه‌دهنده OCR نیاز دارد و عمداً `501` می‌دهد.
- ارسال پیامک واقعی تا زمان تنظیم کلید و قالب کاوه‌نگار فعال نیست.
- این شاخه روی GitHub آماده‌سازی و تست می‌شود؛ تا وقتی روی میزبان واقعی اجرا نشود، دیتابیس تولیدی و دامنه آنلاین ایجاد نشده‌اند.
- توکن نشست در کوکی `HttpOnly` نیز تنظیم می‌شود و پنل از مسیر مستقیم بدون نشست معتبر باز نمی‌شود.
