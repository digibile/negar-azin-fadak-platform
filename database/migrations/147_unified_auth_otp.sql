-- 147: bind OTP challenges to an existing user and support email/mobile/national-id identifiers.
alter table otp_challenges add column if not exists user_id uuid references users(id) on delete cascade;
alter table otp_challenges add column if not exists channel text not null default 'sms';
alter table otp_challenges drop constraint if exists otp_challenges_channel_check;
alter table otp_challenges add constraint otp_challenges_channel_check check(channel in ('sms','email'));
create index if not exists idx_otp_challenges_user_created on otp_challenges(user_id,created_at desc);
