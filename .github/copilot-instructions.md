# پلتفرم بیزینس نگار آذین فدک

## قوانین غیرقابل‌مذاکره

- محصول فارسی و RTL است.
- از واژه ممنوع‌شده برای نام‌گذاری این محصول استفاده نشود.
- کد تولیدی باید واقعی و قابل استقرار باشد.
- API ساختگی و داده تجاری ساختگی در مسیر تولید ممنوع است.
- PostgreSQL پایگاه داده اصلی است.
- احراز هویت، مجوزها و RBAC واقعی هستند.
- Migrationها باید نسخه‌گذاری و قابل اجرای مجدد باشند.
- Secret، token، password و credential داخل repository ممنوع است.
- node_modules، .next، cache، log، temp و backup وارد release نمی‌شوند.

## معماری

- apps/api: API و هسته سرویس
- apps/web: رابط کاربری Next.js
- database/migrations: تغییرات PostgreSQL
- docs/architecture: قرارداد معماری
- هشت هسته اجرایی، پوشش‌دهنده ۴۵ حوزه محصول، در docs/architecture/module-map.md تعریف شده‌اند.

## روش تغییر

هر قابلیت باید تا حد امکان همراه با:
1. migration
2. domain/service
3. API
4. permission
5. test
6. UI

تحویل شود.

هیچ تغییر ناقصی صرفاً برای سبز کردن Build پذیرفته نیست.

## GitHub

هر push به main و هر Pull Request باید از workflow ساخت عبور کند.
