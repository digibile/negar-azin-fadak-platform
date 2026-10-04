-- Tenant-safe seller surface: custom domains, licensing, seller permissions and tenant-scoped content.
alter table form_definitions add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table form_definitions add column if not exists store_id uuid references stores(id) on delete cascade;
alter table form_definitions add column if not exists status text not null default 'draft' check(status in ('draft','published','archived'));
alter table form_definitions add column if not exists version integer not null default 1;
alter table form_definitions add column if not exists published_at timestamptz;
alter table page_definitions add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table page_definitions add column if not exists store_id uuid references stores(id) on delete cascade;
alter table page_definitions add column if not exists status text not null default 'draft' check(status in ('draft','published','archived'));
alter table page_definitions add column if not exists version integer not null default 1;
alter table page_definitions add column if not exists published_at timestamptz;
do $$ begin
  if exists(select 1 from pg_constraint where conname='form_definitions_slug_key') then alter table form_definitions drop constraint form_definitions_slug_key; end if;
  if exists(select 1 from pg_constraint where conname='page_definitions_slug_key') then alter table page_definitions drop constraint page_definitions_slug_key; end if;
end $$;
create unique index if not exists uq_form_tenant_slug on form_definitions(tenant_id,slug);
create unique index if not exists uq_page_tenant_slug on page_definitions(tenant_id,slug);
do $$ declare tid uuid; begin
  select id into tid from tenants where status='active' order by created_at limit 1;
  if tid is not null then
    update form_definitions set tenant_id=tid where tenant_id is null;
    update page_definitions set tenant_id=tid where tenant_id is null;
  end if;
end $$;
alter table form_definitions alter column tenant_id set not null;
alter table page_definitions alter column tenant_id set not null;

create table if not exists seller_domains(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 seller_id uuid not null references sellers(id) on delete cascade,
 store_id uuid references stores(id) on delete cascade,
 hostname text not null,
 verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected','disabled')),
 verification_token text not null,
 verified_at timestamptz,
 is_primary boolean not null default false,
 ssl_mode text not null default 'managed' check(ssl_mode in ('managed','external')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,hostname)
);
create unique index if not exists uq_seller_primary_domain on seller_domains(store_id) where is_primary=true;

create table if not exists seller_licenses(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 seller_id uuid not null references sellers(id) on delete cascade,
 license_type text not null,
 license_no text not null,
 issuer text,
 issued_at date,
 expires_at date,
 status text not null default 'pending' check(status in ('pending','active','expired','revoked')),
 document_ref text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,seller_id,license_type,license_no)
);

create table if not exists seller_permissions(
 seller_id uuid not null references sellers(id) on delete cascade,
 tenant_id uuid not null references tenants(id) on delete cascade,
 permission text not null,
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 primary key(seller_id,permission)
);

create table if not exists seller_users(
 seller_id uuid not null references sellers(id) on delete cascade,
 tenant_id uuid not null references tenants(id) on delete cascade,
 user_id uuid not null references users(id) on delete cascade,
 is_primary boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(seller_id,user_id)
);

create index if not exists idx_seller_domains_tenant on seller_domains(tenant_id,seller_id,verification_status);
create index if not exists idx_seller_licenses_tenant on seller_licenses(tenant_id,seller_id,status);
create index if not exists idx_seller_users_user on seller_users(user_id,tenant_id);

insert into role_permissions(role,permission) values
('admin','seller:domain:view'),('admin','seller:domain:manage'),('admin','seller:license:view'),('admin','seller:license:manage'),('admin','seller:permission:view'),('admin','seller:permission:manage'),('admin','seller:user:view'),('admin','seller:user:manage'),
('manager','seller:domain:view'),('manager','seller:domain:manage'),('manager','seller:license:view'),('manager','seller:license:manage'),('manager','seller:permission:view'),('manager','seller:permission:manage'),
('viewer','seller:domain:view'),('viewer','seller:license:view'),('viewer','seller:permission:view')
on conflict do nothing;

insert into menu_items(title,path,sort_order,permission)
values
('دامنه و هویت فروشنده','/marketplace/domains',961,'seller:domain:view'),
('مجوزها و اسناد فروشنده','/marketplace/licenses',962,'seller:license:view'),
('دسترسی‌های فروشنده','/marketplace/permissions',963,'seller:permission:view')
on conflict do nothing;
