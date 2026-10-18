-- 139: ensure the Digibile storefront has its own tenant so its persistent
-- reference catalog can bootstrap and be read without borrowing another tenant.
insert into tenants(code,name,status)
values ('digibile','دیجی‌بایل','active')
on conflict (code) do nothing;
