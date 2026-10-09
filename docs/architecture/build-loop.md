# چرخه ساخت و انتشار واحد

این سند مرجع اجرای تغییرات است. مخزن اصلی GitHub است و فقط workflow رسمی `.github/workflows/deploy-sookar-main.yml` چرخه build/release را اجرا می‌کند.

```text
Change -> TypeScript/API/UI checks -> Database migration tests -> Web build
      -> clean review artifact -> human review/approval -> production deploy
      -> health + HTTPS verification
```

## قوانین غیرقابل‌مذاکره
1. Push به `main` فقط build، migration/test و تولید artifact قابل بازبینی را اجرا می‌کند؛ به‌تنهایی مجوز استقرار تولید نیست.
2. استقرار سرور فقط در اجرای دستی با انتخاب SHA دقیق و فعال‌کردن صریح `deploy_to_server` انجام می‌شود.
3. هر انتشار باید دقیقاً از همان SHA بررسی‌شده ساخته شود. تغییر کد پس از بررسی به معنی نیاز به build و تأیید مجدد است.
4. artifact شامل `.env`، `.env.*`، کلیدها، `node_modules`، `.next`، cache، log، temp و backup نیست.
5. فقط یک workflow رسمی وجود دارد؛ مسیرهای build/deploy موازی و تکراری ایجاد نمی‌شوند.
6. deploy با rollback، health check داخلی، reload کنترل‌شده Nginx و بررسی HTTPS عمومی محافظت می‌شود.
7. سبزشدن build به معنی تأیید UI یا مجوز deploy نیست؛ هر دو بررسی انسانی و فنی جدا دارند.

## ترتیب اجرای کار
1. قرارداد محصول و طراحی را در اسناد canonical بررسی کن.
2. قابلیت را در همان مسیر موجود توسعه بده؛ پیش از ساخت فایل جدید، مسئولیت‌های موجود را جستجو کن.
3. API، مجوز، tenant scope، migration و audit مورد نیاز را تکمیل کن.
4. رابط RTL و موبایل را با tokenهای مشترک، وضعیت‌های loading/error/empty/success و دسترسی‌پذیری کامل کن.
5. build و تست‌های CI را بررسی کن و artifact را برای بازبینی نگه دار.
6. پس از تأیید صریح، SHA دقیق را با `deploy_to_server=true` به سرور منتشر کن.
7. نتیجه health و HTTPS را از خروجی همان run تأیید کن؛ بدون شواهد موفقیت ادعای انتشار نکن.
