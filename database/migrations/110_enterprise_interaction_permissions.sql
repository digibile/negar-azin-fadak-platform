-- 110: permissions for enterprise interaction services
insert into role_permissions(role,permission) values
('admin','support:read'),('admin','support:manage'),('admin','documents:read'),('admin','documents:manage'),('admin','exports:run'),('admin','communications:send'),
('manager','support:read'),('manager','support:manage'),('manager','documents:read'),('manager','documents:manage'),('manager','exports:run'),('manager','communications:send'),
('viewer','support:read'),('viewer','documents:read')
on conflict do nothing;
