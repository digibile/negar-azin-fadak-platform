-- 149: tenant-scoped durable history for the global AI assistant.
begin;

create table if not exists ai_assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  page_path text not null,
  page_title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,user_id,page_path)
);

create table if not exists ai_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_assistant_conversations(id) on delete cascade,
  role text not null check(role in ('user','assistant')),
  content text not null check(length(content) between 1 and 6000),
  model text,
  created_at timestamptz not null default now()
);

create index if not exists ai_assistant_messages_conversation_created_idx
  on ai_assistant_messages(conversation_id,created_at,id);

create index if not exists ai_assistant_conversations_user_updated_idx
  on ai_assistant_conversations(tenant_id,user_id,updated_at desc);

commit;
