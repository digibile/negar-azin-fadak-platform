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
