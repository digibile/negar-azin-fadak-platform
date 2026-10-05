-- Menu 06: Business Rules real operational domain.
-- Backward-compatible with older installations where business_rules.id is bigint.
create table if not exists business_rules(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 rule_key text not null,
 title text not null,
 description text not null default '',
 event_key text not null,
 status text not null default 'draft',
 priority integer not null default 100,
 stop_on_match boolean not null default false,
 effective_from timestamptz,
 effective_to timestamptz,
 created_by uuid references users(id) on delete set null,
 updated_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,rule_key),
 check(status in ('draft','active','paused','archived'))
);

-- Older deployments may already have business_rules with a different shape.
alter table if exists business_rules add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table if exists business_rules add column if not exists rule_key text;
alter table if exists business_rules add column if not exists title text not null default '';
alter table if exists business_rules add column if not exists description text not null default '';
alter table if exists business_rules add column if not exists event_key text not null default 'manual';
alter table if exists business_rules add column if not exists status text not null default 'draft';
alter table if exists business_rules add column if not exists priority integer not null default 100;
alter table if exists business_rules add column if not exists stop_on_match boolean not null default false;
alter table if exists business_rules add column if not exists effective_from timestamptz;
alter table if exists business_rules add column if not exists effective_to timestamptz;
alter table if exists business_rules add column if not exists created_by uuid references users(id) on delete set null;
alter table if exists business_rules add column if not exists updated_by uuid references users(id) on delete set null;

update business_rules
set rule_key = coalesce(nullif(rule_key,''), code)
where rule_key is null or rule_key = '';

update business_rules
set title = coalesce(nullif(title,''), name)
where title is null or title = '';

alter table if exists business_rules alter column rule_key set not null;

create unique index if not exists business_rules_tenant_rule_key_uidx
  on business_rules(tenant_id,rule_key);
create index if not exists business_rules_tenant_event_idx
  on business_rules(tenant_id,event_key,status,priority);

do $$
declare
  rule_id_type text;
begin
  select format_type(a.atttypid,a.atttypmod)
    into rule_id_type
  from pg_attribute a
  join pg_class c on c.oid=a.attrelid
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname='business_rules'
    and a.attname='id'
    and not a.attisdropped;

  if rule_id_type in ('bigint','integer','smallint') then
    execute $sql$
      create table if not exists business_rule_conditions(
        id uuid primary key default gen_random_uuid(),
        rule_id bigint not null references business_rules(id) on delete cascade,
        group_no integer not null default 1,
        field_key text not null,
        operator text not null,
        comparison_value jsonb not null default 'null'::jsonb,
        join_operator text not null default 'AND',
        sort_order integer not null default 0,
        created_at timestamptz not null default now(),
        check(operator in ('eq','neq','gt','gte','lt','lte','in','not_in','contains','starts_with','exists','not_exists')),
        check(join_operator in ('AND','OR'))
      );
      create index if not exists business_rule_conditions_rule_idx on business_rule_conditions(rule_id,group_no,sort_order);

      create table if not exists business_rule_actions(
        id uuid primary key default gen_random_uuid(),
        rule_id bigint not null references business_rules(id) on delete cascade,
        action_key text not null,
        action_type text not null,
        parameters jsonb not null default '{}'::jsonb,
        sort_order integer not null default 0,
        is_enabled boolean not null default true,
        created_at timestamptz not null default now()
      );
      create index if not exists business_rule_actions_rule_idx on business_rule_actions(rule_id,sort_order);

      create table if not exists business_rule_priorities(
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null references tenants(id) on delete cascade,
        rule_id bigint not null references business_rules(id) on delete cascade,
        priority integer not null,
        valid_from timestamptz,
        valid_to timestamptz,
        reason text not null default '',
        changed_by uuid references users(id) on delete set null,
        created_at timestamptz not null default now()
      );
      create unique index if not exists business_rule_priorities_active_idx on business_rule_priorities(tenant_id,rule_id,priority);

      create table if not exists business_rule_versions(
        id uuid primary key default gen_random_uuid(),
        rule_id bigint not null references business_rules(id) on delete cascade,
        version_no integer not null,
        snapshot jsonb not null,
        status text not null default 'draft',
        change_note text not null default '',
        created_by uuid references users(id) on delete set null,
        created_at timestamptz not null default now(),
        published_at timestamptz,
        unique(rule_id,version_no),
        check(status in ('draft','published','superseded'))
      );
      create index if not exists business_rule_versions_rule_idx on business_rule_versions(rule_id,version_no desc);

      create table if not exists business_rule_audit(
        id bigserial primary key,
        tenant_id uuid not null references tenants(id) on delete cascade,
        rule_id bigint references business_rules(id) on delete set null,
        action text not null,
        actor_user_id uuid references users(id) on delete set null,
        before_data jsonb,
        after_data jsonb,
        created_at timestamptz not null default now()
      );
    $sql$;
  else
    execute $sql$
      create table if not exists business_rule_conditions(
        id uuid primary key default gen_random_uuid(),
        rule_id uuid not null references business_rules(id) on delete cascade,
        group_no integer not null default 1,
        field_key text not null,
        operator text not null,
        comparison_value jsonb not null default 'null'::jsonb,
        join_operator text not null default 'AND',
        sort_order integer not null default 0,
        created_at timestamptz not null default now(),
        check(operator in ('eq','neq','gt','gte','lt','lte','in','not_in','contains','starts_with','exists','not_exists')),
        check(join_operator in ('AND','OR'))
      );
      create index if not exists business_rule_conditions_rule_idx on business_rule_conditions(rule_id,group_no,sort_order);

      create table if not exists business_rule_actions(
        id uuid primary key default gen_random_uuid(),
        rule_id uuid not null references business_rules(id) on delete cascade,
        action_key text not null,
        action_type text not null,
        parameters jsonb not null default '{}'::jsonb,
        sort_order integer not null default 0,
        is_enabled boolean not null default true,
        created_at timestamptz not null default now()
      );
      create index if not exists business_rule_actions_rule_idx on business_rule_actions(rule_id,sort_order);

      create table if not exists business_rule_priorities(
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid not null references tenants(id) on delete cascade,
        rule_id uuid not null references business_rules(id) on delete cascade,
        priority integer not null,
        valid_from timestamptz,
        valid_to timestamptz,
        reason text not null default '',
        changed_by uuid references users(id) on delete set null,
        created_at timestamptz not null default now()
      );
      create unique index if not exists business_rule_priorities_active_idx on business_rule_priorities(tenant_id,rule_id,priority);

      create table if not exists business_rule_versions(
        id uuid primary key default gen_random_uuid(),
        rule_id uuid not null references business_rules(id) on delete cascade,
        version_no integer not null,
        snapshot jsonb not null,
        status text not null default 'draft',
        change_note text not null default '',
        created_by uuid references users(id) on delete set null,
        created_at timestamptz not null default now(),
        published_at timestamptz,
        unique(rule_id,version_no),
        check(status in ('draft','published','superseded'))
      );
      create index if not exists business_rule_versions_rule_idx on business_rule_versions(rule_id,version_no desc);

      create table if not exists business_rule_audit(
        id bigserial primary key,
        tenant_id uuid not null references tenants(id) on delete cascade,
        rule_id uuid references business_rules(id) on delete set null,
        action text not null,
        actor_user_id uuid references users(id) on delete set null,
        before_data jsonb,
        after_data jsonb,
        created_at timestamptz not null default now()
      );
    $sql$;
  end if;
end $$;

insert into identity_permissions(permission_key,title,module_key,action) values
('business-rules.read','مشاهده و ارزیابی قواعد کسب‌وکار','06-business-rules','read'),
('business-rules.write','مدیریت قواعد کسب‌وکار','06-business-rules','write')
on conflict(permission_key) do nothing;

insert into identity_role_permissions(role_key,permission_key)
select r.role,'business-rules.read' from (values('admin'),('manager'),('viewer')) r(role) on conflict do nothing;

insert into identity_role_permissions(role_key,permission_key)
select r.role,'business-rules.write' from (values('admin'),('manager')) r(role) on conflict do nothing;
