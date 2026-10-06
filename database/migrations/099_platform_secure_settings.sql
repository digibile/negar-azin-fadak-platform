create table if not exists platform_secure_settings (
  setting_key text primary key,
  encrypted_value text not null,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);