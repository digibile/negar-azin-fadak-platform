create table if not exists rule_definitions(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null, name text not null, event_key text not null, priority integer not null default 100,
 enabled boolean not null default true, conditions jsonb not null default '{}'::jsonb,
 actions jsonb not null default '[]'::jsonb, version integer not null default 1,
 created_by uuid references users(id) on delete set null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(tenant_id,code));
create table if not exists rule_executions(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
 rule_id uuid not null references rule_definitions(id) on delete restrict, event_key text not null,
 subject_type text, subject_id uuid, status text not null check(status in ('matched','executed','skipped','failed')),
 input_data jsonb not null default '{}'::jsonb, result_data jsonb not null default '{}'::jsonb,
 error_message text, executed_at timestamptz not null default now());
create table if not exists calendar_holidays(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
 calendar_id uuid not null references calendar_definitions(id) on delete cascade, holiday_date date not null,
 title text not null, recurring boolean not null default false, unique(calendar_id,holiday_date,title));
create table if not exists sla_cases(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
 policy_id bigint, subject_type text not null, subject_id uuid,
 status text not null default 'open' check(status in ('open','paused','resolved','breached','cancelled')),
 opened_at timestamptz not null default now(), due_at timestamptz, resolved_at timestamptz,
 breached_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now());
create table if not exists notification_outbox(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade,
 notification_id uuid references platform_notifications(id) on delete cascade, channel text not null,
 destination text, payload jsonb not null default '{}'::jsonb,
 status text not null default 'queued' check(status in ('queued','processing','sent','failed','cancelled')),
 attempts integer not null default 0, available_at timestamptz not null default now(), sent_at timestamptz,
 last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists idx_rule_definitions_event on rule_definitions(tenant_id,event_key,enabled,priority);
create index if not exists idx_rule_executions_subject on rule_executions(tenant_id,subject_type,subject_id,executed_at desc);
create index if not exists idx_calendar_holidays_date on calendar_holidays(tenant_id,calendar_id,holiday_date);
create index if not exists idx_sla_cases_due on sla_cases(tenant_id,status,due_at);
create index if not exists idx_notification_outbox_queue on notification_outbox(status,available_at);
insert into role_permissions(role,permission) values
('admin','rule:view'),('admin','rule:manage'),('admin','calendar:view'),('admin','calendar:manage'),('admin','sla:view'),('admin','sla:manage'),
('admin','notification:view'),('admin','notification:manage'),('admin','audit:view'),
('manager','rule:view'),('manager','rule:manage'),('manager','calendar:view'),('manager','calendar:manage'),('manager','sla:view'),('manager','sla:manage'),
('manager','notification:view'),('manager','notification:manage'),('manager','audit:view'),
('viewer','rule:view'),('viewer','calendar:view'),('viewer','sla:view'),('viewer','notification:view'),('viewer','audit:view') on conflict do nothing;
insert into menu_items(title,path,sort_order,permission) values
('موتور قواعد','/platform/rules',1000,'rule:view'),('تقویم عملیاتی','/platform/calendars',1010,'calendar:view'),
('مدیریت SLA','/platform/sla',1020,'sla:view'),('مرکز اعلان‌ها','/platform/notifications',1030,'notification:view'),
('کاوش رویدادها','/platform/audit',1040,'audit:view') on conflict do nothing;