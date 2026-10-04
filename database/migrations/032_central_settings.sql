create table if not exists central_settings(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 setting_key text not null,
 category text not null,
 title text not null,
 value jsonb not null default '{}'::jsonb,
 is_sensitive boolean not null default false,
 is_editable boolean not null default true,
 updated_by uuid references users(id) on delete set null,
 updated_at timestamptz not null default now(),
 unique(tenant_id,setting_key)
);
create index if not exists idx_central_settings_tenant_category on central_settings(tenant_id,category,setting_key);

insert into menu_items(title,path,sort_order,permission)
select 'تنظیمات مرکزی','/modules/?code=central-settings',40,'settings:manage'
where not exists (select 1 from menu_items where path='/modules/?code=central-settings');

create table if not exists central_setting_audit(
 id bigserial primary key,
 tenant_id uuid not null references tenants(id) on delete cascade,
 setting_id uuid references central_settings(id) on delete set null,
 user_id uuid references users(id) on delete set null,
 old_value jsonb,
 new_value jsonb,
 changed_at timestamptz not null default now()
);
create index if not exists idx_central_setting_audit_tenant on central_setting_audit(tenant_id,changed_at desc);

insert into menu_items(title,path,sort_order,permission,parent_id)
select v.title,v.path,v.sort_order,'settings:manage',m.id
from (values
 ('تنظیمات عمومی','/modules/?code=central-settings&tab=general',10),
 ('تقویم و منطقه','/modules/?code=central-settings&tab=localization',20),
 ('شماره‌گذاری اسناد','/modules/?code=central-settings&tab=numbering',30),
 ('اعلان‌ها','/modules/?code=central-settings&tab=notifications',40),
 ('امنیت مرکزی','/modules/?code=central-settings&tab=security',50),
 ('مدیریت فایل','/modules/?code=central-settings&tab=files',60),
 ('گردش‌کار','/modules/?code=central-settings&tab=workflow',70),
 ('نگهداری و عملیات','/modules/?code=central-settings&tab=maintenance',80),
 ('تاریخچه تغییرات','/modules/?code=central-settings&tab=audit',90)
) v(title,path,sort_order)
cross join lateral (select id from menu_items where path='/modules/?code=central-settings' order by created_at desc limit 1) m
where not exists(select 1 from menu_items x where x.path=v.path);
