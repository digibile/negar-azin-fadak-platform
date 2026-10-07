-- 109: unified comments, notes and communication history
create table if not exists platform_entity_comments(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  author_user_id uuid references users(id) on delete set null,
  body text not null,
  comment_type text not null default 'comment' check(comment_type in ('comment','internal_note','system','resolution')),
  voice_attachment_id uuid references platform_attachments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_entity_comments on platform_entity_comments(tenant_id,entity_type,entity_id,created_at);
alter table support_tickets add column if not exists resolution_code text;
alter table support_tickets add column if not exists resolution_note text;
alter table support_tickets add column if not exists impact text;
alter table support_tickets add column if not exists urgency text;
alter table support_tickets add column if not exists major_incident boolean not null default false;
