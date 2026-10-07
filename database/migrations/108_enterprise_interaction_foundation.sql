-- 108: enterprise interaction foundation
-- Universal lifecycle, attachments, OCR jobs, exports and communication outbox.
-- This is infrastructure, not a replacement for domain-specific accounting/commerce tables.

create extension if not exists pgcrypto;

create table if not exists platform_workflow_definitions(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  code text not null,
  title text not null,
  entity_type text not null,
  version int not null default 1,
  status text not null default 'active' check(status in ('draft','active','retired')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,code,version)
);

create table if not exists platform_workflow_states(
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references platform_workflow_definitions(id) on delete cascade,
  code text not null,
  title text not null,
  category text not null default 'open',
  color_token text,
  is_initial boolean not null default false,
  is_terminal boolean not null default false,
  sort_order int not null default 0,
  unique(workflow_id,code)
);

create table if not exists platform_workflow_transitions(
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references platform_workflow_definitions(id) on delete cascade,
  from_state_id uuid not null references platform_workflow_states(id) on delete cascade,
  to_state_id uuid not null references platform_workflow_states(id) on delete cascade,
  action_code text not null,
  title text not null,
  permission text,
  requires_reason boolean not null default false,
  requires_comment boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  unique(workflow_id,from_state_id,to_state_id,action_code)
);

create table if not exists platform_entity_workflow(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  workflow_id uuid not null references platform_workflow_definitions(id),
  entity_type text not null,
  entity_id text not null,
  state_id uuid not null references platform_workflow_states(id),
  version bigint not null default 1,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(tenant_id,workflow_id,entity_type,entity_id)
);

create table if not exists platform_workflow_history(
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  entity_workflow_id uuid not null references platform_entity_workflow(id) on delete cascade,
  from_state_id uuid references platform_workflow_states(id),
  to_state_id uuid not null references platform_workflow_states(id),
  action_code text not null,
  reason text,
  comment text,
  actor_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists platform_attachments(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  original_name text not null,
  storage_name text not null,
  mime_type text not null,
  stored_mime_type text not null,
  size_bytes bigint not null check(size_bytes>=0),
  original_size_bytes bigint not null check(original_size_bytes>=0),
  sha256 text not null,
  width int,
  height int,
  storage_kind text not null default 'database' check(storage_kind in ('database','object_storage','external')),
  storage_key text,
  binary_data bytea,
  ocr_status text not null default 'not_requested' check(ocr_status in ('not_requested','queued','processing','completed','failed','needs_review')),
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform_attachment_links(
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  attachment_id uuid not null references platform_attachments(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  relation_type text not null default 'supporting',
  title text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(tenant_id,attachment_id,entity_type,entity_id,relation_type)
);

create table if not exists platform_ocr_jobs(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  attachment_id uuid not null references platform_attachments(id) on delete cascade,
  provider_code text not null default 'configured-provider',
  status text not null default 'queued' check(status in ('queued','processing','completed','failed','needs_review')),
  language_hint text,
  extracted_json jsonb not null default '{}'::jsonb,
  confidence numeric(6,5),
  error_message text,
  attempts int not null default 0,
  requested_by uuid references users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists platform_export_jobs(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  requested_by uuid references users(id) on delete set null,
  entity_type text not null,
  format text not null check(format in ('xlsx','csv','pdf')),
  status text not null default 'queued' check(status in ('queued','processing','completed','failed')),
  filters jsonb not null default '{}'::jsonb,
  file_name text,
  content_type text,
  binary_data bytea,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists platform_message_outbox(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  channel text not null check(channel in ('email','sms','push','whatsapp','telegram','in_app')),
  destination text,
  subject text,
  body text not null,
  template_code text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check(status in ('queued','processing','sent','failed','cancelled')),
  attempts int not null default 0,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table support_tickets add column if not exists status text;
alter table support_tickets add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table support_tickets add column if not exists category text;
alter table support_tickets add column if not exists channel text;
alter table support_tickets add column if not exists requester_ref text;
alter table support_tickets add column if not exists assignee_user_id uuid references users(id) on delete set null;
alter table support_tickets add column if not exists first_response_at timestamptz;
alter table support_tickets add column if not exists resolved_at timestamptz;
alter table support_tickets add column if not exists closed_at timestamptz;
alter table support_tickets add column if not exists sla_response_due_at timestamptz;
alter table support_tickets add column if not exists sla_resolution_due_at timestamptz;
alter table support_tickets add column if not exists last_message_at timestamptz;
update support_tickets set status=case when status is null or status='' then 'new' else status end;
alter table support_tickets alter column status set default 'new';
alter table support_tickets alter column status set not null;

create index if not exists idx_workflow_definitions_entity on platform_workflow_definitions(tenant_id,entity_type,status);
create index if not exists idx_workflow_states_workflow on platform_workflow_states(workflow_id,sort_order);
create index if not exists idx_workflow_history_entity on platform_workflow_history(tenant_id,entity_workflow_id,created_at desc);
create index if not exists idx_attachments_tenant_created on platform_attachments(tenant_id,created_at desc);
create index if not exists idx_attachment_links_entity on platform_attachment_links(tenant_id,entity_type,entity_id);
create index if not exists idx_ocr_jobs_status on platform_ocr_jobs(tenant_id,status,created_at);
create index if not exists idx_export_jobs_status on platform_export_jobs(tenant_id,status,created_at);
create index if not exists idx_message_outbox_status on platform_message_outbox(status,available_at,created_at);
create index if not exists idx_support_tickets_tenant_status on support_tickets(tenant_id,status,updated_at desc);

do $$
declare w uuid; s_new uuid; s_open uuid; s_progress uuid; s_customer uuid; s_internal uuid; s_hold uuid; s_resolved uuid; s_closed uuid; s_reopened uuid; s_cancelled uuid;
begin
  insert into platform_workflow_definitions(tenant_id,code,title,entity_type,version,status)
  values(null,'support-ticket-standard','چرخه استاندارد تیکت پشتیبانی','support_ticket',1,'active')
  on conflict(tenant_id,code,version) do update set title=excluded.title,status='active'
  returning id into w;

  insert into platform_workflow_states(workflow_id,code,title,category,is_initial,is_terminal,sort_order) values
  (w,'new','جدید','open',true,false,10),(w,'open','باز','open',false,false,20),
  (w,'in_progress','در حال بررسی','working',false,false,30),(w,'pending_customer','در انتظار مشتری','waiting',false,false,40),
  (w,'pending_internal','در انتظار واحد داخلی','waiting',false,false,50),(w,'on_hold','معلق','waiting',false,false,60),
  (w,'resolved','حل‌شده','resolved',false,false,70),(w,'closed','بسته‌شده','closed',false,true,80),
  (w,'reopened','بازگشایی‌شده','working',false,false,90),(w,'cancelled','لغوشده','closed',false,true,100)
  on conflict(workflow_id,code) do update set title=excluded.title,category=excluded.category,is_initial=excluded.is_initial,is_terminal=excluded.is_terminal,sort_order=excluded.sort_order;

  select id into s_new from platform_workflow_states where workflow_id=w and code='new';
  select id into s_open from platform_workflow_states where workflow_id=w and code='open';
  select id into s_progress from platform_workflow_states where workflow_id=w and code='in_progress';
  select id into s_customer from platform_workflow_states where workflow_id=w and code='pending_customer';
  select id into s_internal from platform_workflow_states where workflow_id=w and code='pending_internal';
  select id into s_hold from platform_workflow_states where workflow_id=w and code='on_hold';
  select id into s_resolved from platform_workflow_states where workflow_id=w and code='resolved';
  select id into s_closed from platform_workflow_states where workflow_id=w and code='closed';
  select id into s_reopened from platform_workflow_states where workflow_id=w and code='reopened';
  select id into s_cancelled from platform_workflow_states where workflow_id=w and code='cancelled';

  insert into platform_workflow_transitions(workflow_id,from_state_id,to_state_id,action_code,title,requires_reason) values
  (w,s_new,s_open,'open','باز کردن',false),(w,s_open,s_progress,'start','شروع بررسی',false),
  (w,s_progress,s_customer,'request_customer','درخواست اطلاعات از مشتری',true),
  (w,s_progress,s_internal,'request_internal','ارجاع داخلی',true),(w,s_progress,s_hold,'hold','تعلیق',true),
  (w,s_progress,s_resolved,'resolve','اعلام حل‌شدن',true),(w,s_customer,s_progress,'customer_reply','دریافت پاسخ مشتری',false),
  (w,s_internal,s_progress,'internal_reply','دریافت پاسخ داخلی',false),(w,s_hold,s_progress,'resume','ادامه بررسی',false),
  (w,s_resolved,s_closed,'close','بستن نهایی',false),(w,s_resolved,s_reopened,'reopen','بازگشایی',true),
  (w,s_closed,s_reopened,'reopen','بازگشایی',true),(w,s_reopened,s_progress,'start','شروع مجدد',false),
  (w,s_new,s_cancelled,'cancel','لغو',true),(w,s_open,s_cancelled,'cancel','لغو',true)
  on conflict(workflow_id,from_state_id,to_state_id,action_code) do update set title=excluded.title,requires_reason=excluded.requires_reason;
end $$;

