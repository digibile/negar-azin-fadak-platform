-- 161: provenance and approval workflow for legal identity profile changes.
-- Existing values are tagged legacy_unknown; their historical source is not fabricated.
begin;

create extension if not exists pgcrypto;

create table if not exists identity_profile_change_requests(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id) on delete restrict,
 requested_by uuid not null references users(id) on delete restrict,
 before_values jsonb not null check(jsonb_typeof(before_values)='object'),
 proposed_values jsonb not null check(jsonb_typeof(proposed_values)='object'),
 reason text not null check(char_length(reason) between 10 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
 reviewed_by uuid references users(id) on delete set null,
 reviewed_at timestamptz,
 review_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create unique index if not exists identity_profile_one_pending_change_idx
 on identity_profile_change_requests(user_id) where status='pending';
create index if not exists identity_profile_change_requests_review_idx
 on identity_profile_change_requests(status,created_at desc);
create index if not exists identity_profile_change_requests_user_idx
 on identity_profile_change_requests(user_id,created_at desc);

create table if not exists identity_profile_field_provenance(
 user_id uuid not null references users(id) on delete restrict,
 field_key text not null check(field_key in ('full_name','national_id')),
 source_type text not null check(source_type in ('legacy_unknown','user_input','user_confirmed','reviewer_approved','provider_verified','ocr_extracted')),
 value_hash char(64) not null check(length(value_hash)=64),
 source_reference text,
 confidence numeric(5,4) check(confidence is null or confidence between 0 and 1),
 verified_by uuid references users(id) on delete set null,
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,field_key)
);

create table if not exists identity_profile_change_events(
 id bigserial primary key,
 request_id uuid references identity_profile_change_requests(id) on delete restrict,
 user_id uuid not null references users(id) on delete restrict,
 actor_user_id uuid not null references users(id) on delete restrict,
 event_type text not null check(event_type in ('requested','approved','rejected','admin_update')),
 before_values jsonb not null default '{}'::jsonb,
 after_values jsonb not null default '{}'::jsonb,
 note text,
 created_at timestamptz not null default now()
);
create index if not exists identity_profile_change_events_user_idx
 on identity_profile_change_events(user_id,created_at desc);
create index if not exists identity_profile_change_events_request_idx
 on identity_profile_change_events(request_id,created_at desc)
 where request_id is not null;

insert into identity_profile_field_provenance(user_id,field_key,source_type,value_hash,source_reference)
select id,'full_name','legacy_unknown',encode(digest(full_name,'sha256'),'hex'),'migration:161'
from users where full_name is not null and btrim(full_name)<>''
on conflict(user_id,field_key) do nothing;

insert into identity_profile_field_provenance(user_id,field_key,source_type,value_hash,source_reference)
select id,'national_id','legacy_unknown',encode(digest(national_id,'sha256'),'hex'),'migration:161'
from users where national_id is not null and national_id<>''
on conflict(user_id,field_key) do nothing;

commit;
