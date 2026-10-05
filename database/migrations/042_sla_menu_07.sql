create table if not exists sla_service_commitments(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
 commitment_key text not null,title text not null,description text not null default '',service_type text not null,
 priority text not null default 'normal',status text not null default 'draft',
 response_minutes integer not null default 60,resolution_minutes integer not null default 1440,
 business_calendar_key text,escalation_policy jsonb not null default '{}'::jsonb,
 effective_from timestamptz,effective_to timestamptz,created_by uuid references users(id) on delete set null,
 updated_by uuid references users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(tenant_id,commitment_key),check(status in ('draft','active','paused','archived')),check(priority in ('low','normal','high','critical')),
 check(response_minutes>=0),check(resolution_minutes>=0)
);
create table if not exists sla_service_levels(
 id uuid primary key default gen_random_uuid(),commitment_id uuid not null references sla_service_commitments(id) on delete cascade,
 level_key text not null,title text not null,target_percent numeric(5,2) not null default 95,window_type text not null default 'business',
 response_minutes integer not null,resolution_minutes integer not null,sort_order integer not null default 0,
 unique(commitment_id,level_key)
);
create table if not exists sla_response_policies(
 id uuid primary key default gen_random_uuid(),commitment_id uuid not null references sla_service_commitments(id) on delete cascade,
 trigger_key text not null,after_minutes integer not null default 0,action_type text not null,
 action_config jsonb not null default '{}'::jsonb,sort_order integer not null default 0,is_enabled boolean not null default true
);
create table if not exists sla_resolution_policies(
 id uuid primary key default gen_random_uuid(),commitment_id uuid not null references sla_service_commitments(id) on delete cascade,
 trigger_key text not null,after_minutes integer not null default 0,action_type text not null,
 action_config jsonb not null default '{}'::jsonb,sort_order integer not null default 0,is_enabled boolean not null default true
);
create table if not exists sla_breaches(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id) on delete cascade,
 commitment_id uuid not null references sla_service_commitments(id) on delete restrict,case_type text not null,case_id text not null,
 target_at timestamptz not null,breached_at timestamptz,minutes_overdue integer,reason text not null default '',
status text not null default 'open',resolved_at timestamptz,resolved_by uuid references users(id) on delete set null,created_at timestamptz not null default now(),
unique(tenant_id,commitment_id,case_type,case_id),check(status in ('open','acknowledged','resolved','waived'))
);
create index if not exists sla_commitments_tenant_status_idx on sla_service_commitments(tenant_id,status);
create index if not exists sla_breaches_tenant_status_idx on sla_breaches(tenant_id,status,target_at);
create table if not exists sla_audit(id bigserial primary key,tenant_id uuid not null references tenants(id) on delete cascade,commitment_id uuid references sla_service_commitments(id) on delete set null,action text not null,actor_user_id uuid references users(id) on delete set null,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());
insert into identity_permissions(permission_key,title,module_key,action) values
('sla.read','مشاهده تعهدات خدمت','07-sla','read'),('sla.write','مدیریت تعهدات خدمت','07-sla','write') on conflict(permission_key) do nothing;
insert into identity_role_permissions(role_key,permission_key) select x.role,'sla.read' from (values('admin'),('manager'),('viewer')) x(role) on conflict do nothing;
insert into identity_role_permissions(role_key,permission_key) select x.role,'sla.write' from (values('admin'),('manager')) x(role) on conflict do nothing;
