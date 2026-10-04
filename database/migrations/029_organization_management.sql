create table if not exists organizations(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null,
 name text not null,
 organization_type text not null default 'company',
 national_id text,
 registration_no text,
 economic_code text,
 status text not null default 'active',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);
create table if not exists organization_entities(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 organization_id uuid references organizations(id) on delete cascade,
 parent_id uuid references organization_entities(id) on delete restrict,
 entity_type text not null check(entity_type in ('holding','company','branch','unit','department')),
 code text not null,
 name text not null,
 status text not null default 'active',
 address text,
 phone text,
 manager_name text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_org_entities_tenant_parent on organization_entities(tenant_id,parent_id);
create index if not exists idx_org_entities_tenant_type on organization_entities(tenant_id,entity_type);
create table if not exists organization_centers(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 organization_id uuid references organizations(id) on delete cascade,
 center_type text not null check(center_type in ('cost','revenue','profit')),
 code text not null,
 name text not null,
 status text not null default 'active',
 parent_id uuid references organization_centers(id) on delete restrict,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,center_type,code)
);
create table if not exists organization_ownership(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 owner_entity_id uuid not null references organization_entities(id) on delete cascade,
 owned_entity_id uuid not null references organization_entities(id) on delete cascade,
 ownership_percent numeric(7,4) not null check(ownership_percent>=0 and ownership_percent<=100),
 ownership_type text not null default 'direct',
 status text not null default 'active',
 created_at timestamptz not null default now(),
 unique(tenant_id,owner_entity_id,owned_entity_id)
);
create table if not exists organization_settings(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 organization_id uuid references organizations(id) on delete cascade,
 setting_key text not null,
 setting_value jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 unique(tenant_id,organization_id,setting_key)
);
