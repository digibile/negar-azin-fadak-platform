begin;

create extension if not exists pgcrypto;

create table if not exists platform_locales(
  code text primary key,
  title text not null,
  native_title text not null,
  direction text not null check(direction in ('rtl','ltr')),
  is_active boolean not null default true
);

create table if not exists platform_currencies(
  code text primary key,
  numeric_code text,
  title text not null,
  symbol text,
  decimal_places smallint not null default 2 check(decimal_places between 0 and 6),
  is_active boolean not null default true
);

create table if not exists platform_tenant_settings(
  tenant_id uuid primary key,
  default_locale text not null default 'fa-IR',
  default_currency text not null default 'IRR',
  timezone text not null default 'Asia/Tehran',
  supported_locales jsonb not null default '["fa-IR"]'::jsonb,
  supported_currencies jsonb not null default '["IRR"]'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists platform_experience_themes(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  code text not null,
  title text not null,
  surface text not null check(surface in ('commerce','marketplace','seller','pay','corporate','management')),
  version integer not null default 1,
  status text not null default 'draft' check(status in ('draft','preview','published','archived')),
  config jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,code,version)
);

create table if not exists platform_experience_domains(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  hostname text not null unique,
  surface text not null check(surface in ('commerce','marketplace','seller','pay','corporate','management')),
  theme_id uuid references platform_experience_themes(id) on delete set null,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists platform_communication_integrations(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  channel text not null,
  provider text not null,
  display_name text not null,
  status text not null default 'draft' check(status in ('draft','connected','disabled','error')),
  capabilities jsonb not null default '[]'::jsonb,
  secret_reference text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,channel,provider)
);

create table if not exists platform_voice_agents(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  code text not null,
  name text not null,
  status text not null default 'draft' check(status in ('draft','active','paused','archived')),
  supported_locales jsonb not null default '["fa-IR"]'::jsonb,
  channels jsonb not null default '["phone"]'::jsonb,
  provider text,
  policy jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,code)
);

create index if not exists idx_platform_experience_domains_tenant on platform_experience_domains(tenant_id,is_active);
create index if not exists idx_platform_experience_themes_tenant_surface on platform_experience_themes(tenant_id,surface,status);
create index if not exists idx_platform_communication_integrations_tenant on platform_communication_integrations(tenant_id,channel,status);
create index if not exists idx_platform_voice_agents_tenant on platform_voice_agents(tenant_id,status);

insert into platform_locales(code,title,native_title,direction) values
('fa-IR','Persian','فارسی','rtl'),
('en-US','English','English','ltr'),
('ar-SA','Arabic','العربية','rtl'),
('tr-TR','Turkish','Türkçe','ltr')
on conflict(code) do update set title=excluded.title,native_title=excluded.native_title,direction=excluded.direction,is_active=true;

insert into platform_currencies(code,numeric_code,title,symbol,decimal_places) values
('IRR','364','ریال ایران','﷼',0),
('IRT','000','تومان ایران','تومان',0),
('USD','840','دلار آمریکا','$',2),
('EUR','978','یورو','€',2),
('AED','784','درهم امارات','د.إ',2),
('TRY','949','لیر ترکیه','₺',2)
on conflict(code) do update set title=excluded.title,symbol=excluded.symbol,decimal_places=excluded.decimal_places,is_active=true;

insert into platform_experience_themes(tenant_id,code,title,surface,version,status,config)
values
(null,'commerce-premium-2026','فروشگاه پریمیوم 2026','commerce',1,'published','{"layout":"commerce","density":"comfortable","supportsRTL":true,"supportsLTR":true}'),
(null,'marketplace-premium-2026','بازارگاه پریمیوم 2026','marketplace',1,'published','{"layout":"marketplace","density":"comfortable","supportsRTL":true,"supportsLTR":true}'),
(null,'pay-trust-2026','اعتبار و تسهیلات 2026','pay',1,'published','{"layout":"financial","density":"comfortable","supportsRTL":true,"supportsLTR":true}'),
(null,'corporate-editorial-2026','معرفی شرکت و محتوای 2026','corporate',1,'published','{"layout":"editorial","density":"comfortable","supportsRTL":true,"supportsLTR":true}')
on conflict(tenant_id,code,version) do nothing;

commit;
