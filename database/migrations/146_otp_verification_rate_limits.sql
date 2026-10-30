-- 146: IP-scoped rate accounting for OTP verification attempts.
create table if not exists otp_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  requested_ip inet not null,
  phone text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists idx_otp_verification_attempts_ip_time
  on otp_verification_attempts(requested_ip,attempted_at desc);
