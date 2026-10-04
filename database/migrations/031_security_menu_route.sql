alter table menu_items add column if not exists menu_key text;
alter table menu_items add column if not exists children jsonb not null default '[]'::jsonb;

update menu_items set path='/modules/?code=security',
children='["کاربران","پروفایل کاربران","نقش‌ها","گروه‌های کاربری","مجوزها","سیاست‌های دسترسی","ورودها","نشست‌ها","دستگاه‌های مجاز","احراز هویت","2FA","گزارش امنیتی"]'::jsonb
where menu_key='users-security';