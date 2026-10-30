-- 153: move the remaining primary navigation links into the canonical backend menu.
-- The frontend only renders this tree; it no longer owns a parallel 20-panel registry.
begin;

with entries(menu_key,parent_key,title,path,sort_order,permission) as (values
 ('01-dashboard:command-center','01-dashboard','مرکز فرماندهی عملیاتی','/command-center',1,'modules:01-dashboard:read'),
 ('03-users-access:users','03-users-access','مدیریت کاربران و حساب‌ها','/modules/?code=03-users-access&tab=users',1,'modules:03-users-access:read'),
 ('03-users-access:profiles','03-users-access','پروفایل کاربران','/modules/?code=03-users-access&tab=profiles',2,'modules:03-users-access:read'),
 ('03-users-access:roles','03-users-access','نقش‌ها و مسئولیت‌ها','/modules/?code=03-users-access&tab=roles',3,'modules:03-users-access:read'),
 ('03-users-access:groups','03-users-access','گروه‌های کاربری','/modules/?code=03-users-access&tab=groups',4,'modules:03-users-access:read'),
 ('03-users-access:permissions','03-users-access','کاتالوگ مجوزها و دسترسی‌ها','/modules/?code=03-users-access&tab=permissions',5,'modules:03-users-access:read'),
 ('03-users-access:policies','03-users-access','سیاست‌های امنیتی','/modules/?code=03-users-access&tab=policies',6,'modules:03-users-access:read'),
 ('03-users-access:auth','03-users-access','احراز هویت و ورود امن','/modules/?code=03-users-access&tab=auth',7,'modules:03-users-access:read'),
 ('03-users-access:twofa','03-users-access','احراز هویت دومرحله‌ای','/modules/?code=03-users-access&tab=twofa',8,'modules:03-users-access:read'),
 ('03-users-access:sessions','03-users-access','نشست‌ها و دستگاه‌های مجاز','/modules/?code=03-users-access&tab=sessions',9,'modules:03-users-access:read'),
 ('03-users-access:audit','03-users-access','تاریخچه ورود و ممیزی امنیتی','/modules/?code=03-users-access&tab=audit',10,'modules:03-users-access:read'),
 ('09-commerce-stores:categories','09-commerce-stores','مدیریت دسته‌بندی‌های بازارگاه','/marketplace/categories',1,'modules:09-commerce-stores:read'),
 ('09-commerce-stores:product-import','09-commerce-stores','ورود محصول از کاتالوگ مرجع','/marketplace/products?tab=import',2,'modules:09-commerce-stores:read')
)
insert into menu_items(menu_key,parent_id,title,path,sort_order,permission,children,is_active)
select e.menu_key,p.id,e.title,e.path,e.sort_order,e.permission,'[]'::jsonb,true
from entries e
join menu_items p on p.menu_key=e.parent_key and p.parent_id is null
on conflict(menu_key) where menu_key is not null do update
set parent_id=excluded.parent_id,title=excluded.title,path=excluded.path,
    sort_order=excluded.sort_order,permission=excluded.permission,
    children='[]'::jsonb,is_active=true,updated_at=now();

commit;
