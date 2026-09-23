insert into menu_items(title,path,sort_order,permission) values
('مرکز مدیریت','/','1','dashboard:read'),
('سازمان و ساختار','/organization','10','organization:read'),
('مالی و حسابداری','/finance','20','finance:read'),
('اعتبار','/credit','30','credit:read'),
('تجارت','/commerce','40','commerce:read'),
('مدیریت کاربران و دسترسی','/admin/users','50','users:manage'),
('مدیریت قالب','/admin/templates','60','templates:manage'),
('مدیریت منو','/admin/menus','70','menus:manage'),
('مدیریت Frontend','/admin/frontend','80','frontend:manage')
on conflict do nothing;