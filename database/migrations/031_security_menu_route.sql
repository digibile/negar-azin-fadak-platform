update menu_items set path='/modules/?code=security',
children='["کاربران","پروفایل کاربران","نقش‌ها","گروه‌های کاربری","مجوزها","سیاست‌های دسترسی","ورودها","نشست‌ها","دستگاه‌های مجاز","احراز هویت","2FA","گزارش امنیتی"]'::jsonb
where menu_key='users-security';