-- One authoritative pointer to the existing platform-owner user.
-- No account is created and no password, email, phone, or role is overwritten here.
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

-- Only auto-link a single, active canonical super-admin. Ambiguous records remain untouched.
insert into platform_owner_accounts(account_key,user_id,account_label,source_system)
select 1,u.id,'مدیرکل سامانه','existing-users-role'
from users u
where lower(u.role) in ('super_admin','superadmin')
  and u.status='active'
  and (select count(*) from users candidate
       where lower(candidate.role) in ('super_admin','superadmin')
         and candidate.status='active')=1
on conflict(account_key) do nothing;
