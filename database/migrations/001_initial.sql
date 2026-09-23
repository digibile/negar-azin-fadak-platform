create extension if not exists pgcrypto;

create table if not exists users(
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 password_hash text not null,
 full_name text not null,
 role text not null default 'viewer',
 status text not null default 'active',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists menu_items(
 id uuid primary key default gen_random_uuid(),
 parent_id uuid references menu_items(id) on delete cascade,
 title text not null,
 path text not null default '#',
 icon text,
 sort_order integer not null default 0,
 permission text,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists form_definitions(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 slug text not null unique,
 schema jsonb not null default '{"fields":[]}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists page_definitions(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 slug text not null unique,
 definition jsonb not null default '{"blocks":[]}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists idx_menu_parent on menu_items(parent_id);
create index if not exists idx_users_role on users(role);
