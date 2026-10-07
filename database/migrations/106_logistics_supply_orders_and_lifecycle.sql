begin;

create table if not exists logistics_supply_orders(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_no text not null,
  plan_id uuid references logistics_supply_plans(id),
  origin text not null,
  destination text not null,
  cargo_description text,
  quantity numeric(20,3) not null default 0 check(quantity >= 0),
  status text not null default 'draft' check(status in ('draft','submitted','approved','assigned','shipped','delivered','cancelled')),
  requested_date date,
  notes text,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,order_no)
);

alter table logistics_shipments add column if not exists supply_order_id uuid references logistics_supply_orders(id);
alter table logistics_shipments add column if not exists delivered_reason text;
alter table logistics_shipments add column if not exists failed_reason text;
alter table logistics_shipments add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_logistics_orders_tenant_status on logistics_supply_orders(tenant_id,status);
create index if not exists idx_logistics_shipments_order on logistics_shipments(tenant_id,supply_order_id);

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.a,v.t,v.p
from platform_modules m
cross join (values
  ('read','مشاهده لجستیک','modules:12-logistics-supply:read'),
  ('write','ثبت و ویرایش لجستیک','modules:12-logistics-supply:write'),
  ('dispatch','اعزام و تغییر وضعیت حمل','modules:12-logistics-supply:dispatch'),
  ('track','رهگیری محموله','modules:12-logistics-supply:track'),
  ('deliver','ثبت تحویل','modules:12-logistics-supply:deliver')
) v(a,t,p)
where m.code='12-logistics-supply'
on conflict(module_id,action_code) do update
set title=excluded.title,permission=excluded.permission,is_active=true;

commit;