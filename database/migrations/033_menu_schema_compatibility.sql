alter table menu_items add column if not exists menu_key text;
alter table menu_items add column if not exists children jsonb not null default '[]'::jsonb;

update menu_items
set menu_key=coalesce(menu_key,regexp_replace(lower(path),'[^a-z0-9]+','-','g'))
where menu_key is null;

update menu_items
set path='/modules/?code=security',
children='["کاربران","پروفایل کاربران","نقش‌ها","گروه‌های کاربری","مجوزها","سیاست‌های دسترسی","ورودها","نشست‌ها","دستگاه‌های مجاز","احراز هویت","2FA","گزارش امنیتی"]'::jsonb
where menu_key='users-security';
