create table if not exists role_permissions(
  role text not null,
  permission text not null,
  primary key(role,permission)
);

insert into role_permissions(role,permission) values
('admin','dashboard:read'),('admin','organization:read'),('admin','organization:manage'),
('admin','finance:read'),('admin','finance:manage'),('admin','credit:read'),('admin','credit:manage'),
('admin','commerce:read'),('admin','commerce:manage'),('admin','users:manage'),
('admin','templates:manage'),('admin','menus:manage'),('admin','frontend:manage'),
('manager','dashboard:read'),('manager','organization:read'),('manager','organization:manage'),
('manager','finance:read'),('manager','finance:manage'),('manager','credit:read'),('manager','credit:manage'),
('manager','commerce:read'),('manager','commerce:manage'),('manager','templates:manage'),
('manager','menus:manage'),('manager','frontend:manage'),
('viewer','dashboard:read'),('viewer','organization:read'),('viewer','finance:read'),
('viewer','credit:read'),('viewer','commerce:read')
on conflict do nothing;
