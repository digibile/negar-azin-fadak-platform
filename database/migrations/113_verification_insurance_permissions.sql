-- 113: permissions for provider-backed checks and insurance
insert into role_permissions(role,permission) values
('admin','verification:run'),('admin','insurance:manage'),
('manager','verification:run'),('manager','insurance:manage'),
('viewer','verification:read')
on conflict do nothing;
