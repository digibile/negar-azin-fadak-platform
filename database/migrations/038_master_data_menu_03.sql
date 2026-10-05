-- Menu 03: Master data and controlled vocabularies.
create table if not exists master_data_sets(
 id bigserial primary key,
 data_key text not null unique,
 title text not null,
 description text not null default '',
 is_system boolean not null default false,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists master_data_items(
 id bigserial primary key,
 data_set_id bigint not null references master_data_sets(id) on delete cascade,
 item_key text not null,
 title text not null,
 code text,
 parent_id bigint references master_data_items(id) on delete restrict,
 sort_order integer not null default 0,
 is_active boolean not null default true,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(data_set_id,item_key)
);
create index if not exists master_data_items_set_idx on master_data_items(data_set_id,is_active,sort_order);
create index if not exists master_data_items_parent_idx on master_data_items(parent_id);
create table if not exists master_data_codes(
 id bigserial primary key,
 namespace text not null,
 code text not null,
 title text not null,
 value text,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(namespace,code)
);
create table if not exists master_units(
 id bigserial primary key,
 unit_key text not null unique,
 title text not null,
 symbol text,
 unit_type text not null,
 factor numeric(24,10) not null default 1,
 base_unit_key text,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists master_data_audit(
 id bigserial primary key,
 entity_type text not null,
 entity_id bigint,
 action text not null,
 actor_user_id uuid references users(id) on delete set null,
 before_data jsonb,
 after_data jsonb,
 created_at timestamptz not null default now()
);
create index if not exists master_data_audit_entity_idx on master_data_audit(entity_type,entity_id,created_at desc);
insert into master_data_sets(data_key,title,description,is_system) values
('countries','کشورها','فهرست کشورهای قابل استفاده در سامانه',true),
('provinces','استان‌ها','فهرست استان‌ها و نواحی',true),
('cities','شهرها','فهرست شهرها و محدوده‌های شهری',true),
('customer-types','انواع مشتری','دسته‌بندی پایه مشتریان',true),
('document-types','انواع مدرک','انواع مدارک هویتی و تجاری',true),
('channels','کانال‌ها','کانال‌های ارتباطی و تجاری',true)
on conflict(data_key) do nothing;
insert into master_units(unit_key,title,symbol,unit_type,factor,base_unit_key) values
('piece','عدد','عدد','count',1,'piece'),
('kilogram','کیلوگرم','kg','mass',1,'kilogram'),
('gram','گرم','g','mass',0.001,'kilogram'),
('meter','متر','m','length',1,'meter'),
('centimeter','سانتی‌متر','cm','length',0.01,'meter'),
('liter','لیتر','L','volume',1,'liter'),
('milliliter','میلی‌لیتر','mL','volume',0.001,'liter')
on conflict(unit_key) do nothing;

insert into identity_permissions(permission_key,title,module_key,action) values
('master-data.read','مشاهده داده‌های پایه','03-master-data','read'),
('master-data.write','مدیریت داده‌های پایه','03-master-data','write')
on conflict(permission_key) do nothing;
insert into identity_role_permissions(role_key,permission_key)
select 'admin',permission_key from identity_permissions where permission_key like 'master-data.%' on conflict do nothing;

insert into identity_role_permissions(role_key,permission_key)
select 'manager',permission_key from identity_permissions where permission_key='master-data.read' on conflict do nothing;
insert into identity_role_permissions(role_key,permission_key)
select 'manager',permission_key from identity_permissions where permission_key='master-data.write' on conflict do nothing;
insert into identity_role_permissions(role_key,permission_key)
select 'viewer',permission_key from identity_permissions where permission_key='master-data.read' on conflict do nothing;
