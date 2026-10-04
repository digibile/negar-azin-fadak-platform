create table if not exists module_runtime(
  module_id smallint primary key references platform_modules(id) on delete cascade,
  lifecycle text not null default 'planned' check (lifecycle in ('planned','foundation','active','maintenance')),
  route text,
  api_prefix text,
  owner_team text,
  description text,
  updated_at timestamptz not null default now()
);

insert into module_runtime(module_id,lifecycle,route,api_prefix,owner_team,description)
select id,'foundation','/modules/'||code,'/api/modules/'||code,'platform',title
from platform_modules
on conflict (module_id) do nothing;

create index if not exists idx_module_runtime_lifecycle on module_runtime(lifecycle);

create table if not exists module_actions(
  id bigserial primary key,
  module_id smallint not null references platform_modules(id) on delete cascade,
  action_code text not null,
  title text not null,
  permission text not null,
  is_active boolean not null default true,
  unique(module_id,action_code)
);

insert into module_actions(module_id,action_code,title,permission)
select id,'read','مشاهده','modules:'||code||':read'
from platform_modules
on conflict (module_id,action_code) do nothing;
