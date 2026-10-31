-- 148: canonical platform roles and least-privilege baseline grants.
insert into identity_roles(role_key,title,description,is_system) values
 ('super_admin','مدیرکل سامانه','بالاترین سطح مدیریت و نظارت بر کل سامانه',true),
 ('admin','مدیر سامانه','مدیریت عملیاتی در محدوده مجوزهای تخصیص‌یافته',true),
 ('seller','فروشنده','مدیریت فروشگاه، کالاها و سفارش‌های مجاز',true),
 ('representative','نماینده','پیگیری مشتریان و پرونده‌های ارجاع‌شده',true),
 ('customer','مشتری','دسترسی به پروفایل، سفارش‌ها و خدمات شخصی',true)
on conflict(role_key) do update set title=excluded.title,description=excluded.description,is_system=true,is_active=true;

-- Super admin receives the full existing permission catalog.
insert into role_permissions(role,permission)
select 'super_admin',permission from role_permissions where role='admin'
on conflict do nothing;
insert into role_permissions(role,permission) values
 ('super_admin','dashboard:read'),('super_admin','organization:read'),('super_admin','organization:manage'),
 ('super_admin','finance:read'),('super_admin','finance:manage'),('super_admin','credit:read'),('super_admin','credit:manage'),
 ('super_admin','commerce:read'),('super_admin','commerce:manage'),('super_admin','users:manage'),
 ('super_admin','templates:manage'),('super_admin','menus:manage'),('super_admin','frontend:manage')
on conflict do nothing;

-- Admin is deliberately not a super admin: remove legacy blanket grants and keep a managed baseline.
delete from role_permissions where role='admin';
insert into role_permissions(role,permission) values
 ('admin','dashboard:read'),('admin','organization:read'),('admin','organization:manage'),
 ('admin','finance:read'),('admin','credit:read'),('admin','commerce:read'),('admin','commerce:manage'),
 ('admin','users:manage'),('admin','templates:manage'),('admin','menus:manage'),('admin','frontend:manage'),
 ('seller','dashboard:read'),('seller','commerce:read'),('seller','commerce:manage'),
 ('representative','dashboard:read'),('representative','customer:read'),
 ('customer','dashboard:read')
on conflict do nothing;

insert into identity_role_permissions(role_key,permission_key,granted)
select 'super_admin',permission_key,true from identity_permissions
on conflict(role_key,permission_key) do update set granted=true;
delete from identity_role_permissions where role_key='admin';
insert into identity_role_permissions(role_key,permission_key,granted) values
 ('admin','identity.users.read',true),('admin','identity.users.write',true),
 ('admin','identity.roles.read',true),('admin','identity.groups.read',true),
 ('admin','identity.permissions.read',true),('admin','identity.sessions.read',true)
on conflict(role_key,permission_key) do update set granted=true;
