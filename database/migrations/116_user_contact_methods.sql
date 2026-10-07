-- 116: centralized user contact methods for scheduled commerce notifications
create table if not exists user_contact_methods(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id) on delete cascade,
 channel text not null check(channel in ('sms','email','push','whatsapp','telegram')),
 value text not null,
 is_primary boolean not null default false,
 verified_at timestamptz,
 status text not null default 'active' check(status in ('active','disabled','unverified')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,channel,value)
);
create index if not exists idx_user_contacts_channel on user_contact_methods(user_id,channel,status,is_primary desc);
