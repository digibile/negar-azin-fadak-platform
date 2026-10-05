-- Menu 05: Smart Calendar real operational domain.
create table if not exists calendar_work_calendars(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 calendar_key text not null,
 title text not null,
 timezone text not null default 'Asia/Tehran',
 week_days smallint[] not null default '{6,0,1,2,3}'::smallint[],
 day_start time not null default '08:00',
 day_end time not null default '17:00',
 is_default boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,calendar_key)
);
create table if not exists calendar_holidays(
 id bigserial primary key,
 tenant_id uuid not null references tenants(id) on delete cascade,
 calendar_id uuid references calendar_work_calendars(id) on delete cascade,
 holiday_date date not null,
 title text not null,
 holiday_type text not null default 'official',
 is_working_day_override boolean not null default false,
 notes text not null default '',
 unique(tenant_id,holiday_date,title)
);
create index if not exists calendar_holidays_tenant_date_idx on calendar_holidays(tenant_id,holiday_date);
create table if not exists calendar_events(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 calendar_id uuid references calendar_work_calendars(id) on delete set null,
 title text not null,
 description text not null default '',
 start_at timestamptz not null,
 end_at timestamptz not null,
 all_day boolean not null default false,
 status text not null default 'scheduled',
 event_type text not null default 'general',
 location text not null default '',
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(end_at>=start_at)
);
create index if not exists calendar_events_tenant_start_idx on calendar_events(tenant_id,start_at);
create table if not exists calendar_deadlines(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 title text not null,
 description text not null default '',
 due_at timestamptz not null,
 priority text not null default 'normal',
 status text not null default 'open',
 owner_user_id uuid references users(id) on delete set null,
 source_type text not null default 'manual',
 source_id text,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists calendar_deadlines_tenant_due_idx on calendar_deadlines(tenant_id,due_at,status);
create table if not exists calendar_plans(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 title text not null,
 plan_date date not null,
 start_time time,
 end_time time,
 owner_user_id uuid references users(id) on delete set null,
 status text not null default 'planned',
 capacity_minutes integer,
 notes text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists calendar_plans_tenant_date_idx on calendar_plans(tenant_id,plan_date);
create table if not exists calendar_audit(
 id bigserial primary key,
 tenant_id uuid not null references tenants(id) on delete cascade,
 entity_type text not null,
 entity_id text,
 action text not null,
 actor_user_id uuid references users(id) on delete set null,
 before_data jsonb,
 after_data jsonb,
 created_at timestamptz not null default now()
);
insert into identity_permissions(permission_key,title,module_key,action) values
('smart-calendar.read','مشاهده تقویم و برنامه‌ریزی','05-smart-calendar','read'),
('smart-calendar.write','مدیریت تقویم و برنامه‌ریزی','05-smart-calendar','write')
on conflict(permission_key) do nothing;
insert into identity_role_permissions(role_key,permission_key)
select r.role,'smart-calendar.read' from (values('admin'),('manager'),('viewer')) r(role) on conflict do nothing;
insert into identity_role_permissions(role_key,permission_key)
select r.role,'smart-calendar.write' from (values('admin'),('manager')) r(role) on conflict do nothing;
