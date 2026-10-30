# مخزن‌های منبع یکپارچه

این پوشه محل اتصال مخزن‌های مستقل سازمان Digibile به پلتفرم مرکزی است. برای جلوگیری از حذف تاریخچه، تداخل نام فایل‌ها و خراب‌شدن ساختار پروژه‌ها، هر مخزن به‌صورت Git submodule نگهداری می‌شود؛ کدها و تاریخچه اصلی در مخزن مبدأ باقی می‌مانند.

## مخزن‌های متصل

- `uminex`: https://github.com/digibile/uminex
- `tejarhstore`: https://github.com/digibile/tejarhstore
- `negarazin-accounting`: https://github.com/digibile/negarazin-accounting
- `MASTER-MOTHER-NEGARAZINFAKA`: https://github.com/digibile/MASTER-MOTHER-NEGARAZINFAKA
- `vamcity`: https://github.com/digibile/vamcity
- `sitnela`: https://github.com/digibile/sitnela
- `aqayevam`: https://github.com/digibile/aqayevam
- `digibail`: https://github.com/digibile/digibail
- `sarajon`: https://github.com/digibile/sarajon

## دریافت کامل کدها

برای clone همراه با همه زیرمخزن‌ها:

```bash
git clone --recurse-submodules https://github.com/digibile/negar-azin-fadak-platform.git
```

برای مخزن موجود:

```bash
git submodule update --init --recursive
```

## نکات ادغام

این اتصال، انتقال داده عملیاتی یا ادغام خودکار جداول پایگاه داده نیست. پیش از انتقال هر قابلیت به هسته مرکزی، وابستگی‌ها، مسیرهای اجرا، مجوزها، مدل داده و تکراری‌بودن آن باید بررسی شود. فایل‌های محرمانه و تنظیمات محیطی نباید به مخزن مرکزی منتقل شوند.
