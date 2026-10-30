-- 145: one-time mobile sign-in challenges; only keyed digests are persisted.
create table if not exists otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null default 'login' check(purpose in ('login')),
  code_hash text not null,
  requested_ip inet,
  attempts integer not null default 0 check(attempts>=0 and attempts<=5),
  send_status text not null default 'pending' check(send_status in ('pending','sent','failed')),
  send_info text,
  expires_at timestamptz not null,
  resend_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_otp_challenges_phone_purpose_created
  on otp_challenges(phone,purpose,created_at desc);
create index if not exists idx_otp_challenges_ip_created
  on otp_challenges(requested_ip,created_at desc);
