-- A single, auditable pointer to the existing platform-owner identity.
-- This migration never creates users, changes roles, or touches credentials.
create table if not exists platform_owner_accounts (
  account_key smallint primary key default 1 check (account_key = 1),
  user_id uuid not null unique references users(id) on delete restrict,
  account_label varchar(160) not null default 'مدیرکل سامانه',
  source_system varchar(80),
  source_user_id varchar(160),
  identity_confirmed_at timestamptz,
  linked_by_user_id uuid references users(id) on delete set null,
  notes text,
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_owner_accounts_user_id
  on platform_owner_accounts(user_id);

-- Auto-link only when there is exactly one active legacy super-admin identity.
-- Ambiguous or absent matches are deliberately left unlinked for explicit verification.
insert into platform_owner_accounts(account_key,user_id,account_label,source_system,identity_confirmed_at)
select 1,u.id,'مدیرکل سامانه','existing-users-role',null
from users u
where lower(u.role) in ('super_admin','superadmin')
  and u.status='active'
  and (select count(*) from users candidate
       where lower(candidate.role) in ('super_admin','superadmin')
         and candidate.status='active') = 1
on conflict (account_key) do nothing;
