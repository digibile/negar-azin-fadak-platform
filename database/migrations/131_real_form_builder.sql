begin;

alter table form_definitions add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table form_definitions add column if not exists code text;
alter table form_definitions add column if not exists category text not null default 'عمومی';
alter table form_definitions add column if not exists validation_mode text not null default 'قابل تنظیم';
alter table form_definitions add column if not exists access_level text not null default 'کاربران واردشده';
alter table form_definitions add column if not exists submit_mode text not null default 'ثبت مستقیم';
alter table form_definitions add column if not exists owner_ref text;
alter table form_definitions add column if not exists notes text;
alter table form_definitions add column if not exists status text not null default 'draft' check(status in ('draft','published','disabled','archived'));
alter table form_definitions add column if not exists version integer not null default 1;
alter table form_definitions add column if not exists published_at timestamptz;

do $$ declare tid uuid; begin
  select id into tid from tenants where status='active' order by created_at limit 1;
  if tid is not null then update form_definitions set tenant_id=tid where tenant_id is null; end if;
end $$;

create unique index if not exists uq_form_definitions_tenant_code on form_definitions(tenant_id,code) where code is not null;
create unique index if not exists uq_form_definitions_tenant_slug on form_definitions(tenant_id,slug);

create table if not exists form_submissions(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 form_id uuid not null references form_definitions(id) on delete cascade,
 form_version integer not null,
 status text not null default 'submitted' check(status in ('draft','submitted','under_review','approved','rejected','archived')),
 payload jsonb not null default '{}'::jsonb,
 submitted_by uuid references users(id) on delete set null,
 submitted_at timestamptz not null default now(),
 reviewed_by uuid references users(id) on delete set null,
 reviewed_at timestamptz,
 review_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_form_submissions_tenant_form on form_submissions(tenant_id,form_id,submitted_at desc);
create index if not exists idx_form_submissions_status on form_submissions(tenant_id,status,submitted_at desc);

insert into role_permissions(role,permission) values
('admin','form:view'),('admin','form:manage'),('admin','form:publish'),('admin','form:submission:view'),('admin','form:submission:manage'),
('manager','form:view'),('manager','form:manage'),('manager','form:publish'),('manager','form:submission:view'),('manager','form:submission:manage'),
('viewer','form:view'),('viewer','form:submission:view')
on conflict do nothing;

commit;