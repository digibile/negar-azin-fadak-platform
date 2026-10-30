-- 151: allow administrators and managers to inspect the canonical verification queue.
insert into role_permissions(role,permission) values
('admin','verification:read'),
('manager','verification:read')
on conflict do nothing;
