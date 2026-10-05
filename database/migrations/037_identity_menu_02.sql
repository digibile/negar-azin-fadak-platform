-- Menu 02: Identity and access domain. Real relational catalog for users, roles, groups and permissions.
create table if not exists identity_roles(
  role_key text primary key,
  title text not null,
  description text not null default '',
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists identity_groups(
  id bigserial primary key,
  group_key text not null unique,
  title text not null,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists identity_group_members(
  group_id bigint not null references identity_groups(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key(group_id,user_id)
);
create index if not exists identity_group_members_user_idx on identity_group_members(user_id);
create table if not exists identity_permissions(
  permission_key text primary key,
  title text not null,
  module_key text,
  action text not null,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists identity_role_permissions(
  role_key text not null references identity_roles(role_key) on delete cascade,
  permission_key text not null references identity_permissions(permission_key) on delete cascade,
  granted boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(role_key,permission_key)
);
insert into identity_roles(role_key,title,description,is_system) values
('admin','مدیر سامانه','دسترسی کامل مدیریتی',true),
('manager','مدیر سازمان','مدیریت عملیاتی سازمان',true),
('viewer','مشاهده‌گر','دسترسی فقط خواندنی',true)
on conflict(role_key) do nothing;
insert into identity_permissions(permission_key,title,module_key,action) values
('identity.users.read','مشاهده کاربران','02-identity','read'),
('identity.users.write','مدیریت کاربران','02-identity','write'),
('identity.roles.read','مشاهده نقش‌ها','02-identity','read'),
('identity.roles.write','مدیریت نقش‌ها','02-identity','write'),
('identity.groups.read','مشاهده گروه‌ها','02-identity','read'),
('identity.groups.write','مدیریت گروه‌ها','02-identity','write'),
('identity.permissions.read','مشاهده مجوزها','02-identity','read'),
('identity.permissions.write','مدیریت مجوزها','02-identity','write'),
('identity.sessions.read','مشاهده ورود و نشست','02-identity','read'),
('identity.sessions.write','مدیریت نشست','02-identity','write')
on conflict(permission_key) do nothing;
insert into identity_role_permissions(role_key,permission_key)
select r.role_key,p.permission_key from identity_roles r cross join identity_permissions p where r.role_key='admin'
on conflict do nothing;
insert into identity_role_permissions(role_key,permission_key)
select 'manager',permission_key from identity_permissions where permission_key like 'identity.%.read'
on conflict do nothing;
insert into identity_role_permissions(role_key,permission_key)
select 'viewer',permission_key from identity_permissions where permission_key like 'identity.%.read'
on conflict do nothing;
