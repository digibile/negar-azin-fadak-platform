-- 126: persistent public storefront taxonomy.
-- Category labels are real tenant-scoped records; this migration never creates products or prices.
create table if not exists marketplace_categories(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'active' check(status in ('active','inactive')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,code),
  unique(tenant_id,name)
);

create index if not exists idx_marketplace_categories_public
  on marketplace_categories(tenant_id,status,sort_order,name);

insert into marketplace_categories(tenant_id,code,name,status,sort_order)
select t.id,c.code,c.name,'active',c.sort_order
from tenants t
cross join (values
 ('mobile-tablet','موبایل و تبلت',10),
 ('laptop-computer','لپ‌تاپ و کامپیوتر',20),
 ('home-kitchen','خانه و آشپزخانه',30),
 ('fashion-apparel','مد و پوشاک',40),
 ('beauty-health','زیبایی و سلامت',50),
 ('audio-video','صوتی و تصویری',60),
 ('sports-travel','ورزش و سفر',70),
 ('books-stationery','کتاب و لوازم‌التحریر',80),
 ('baby-kids','کودک و نوزاد',90),
 ('auto-tools','خودرو و ابزار',100),
 ('supermarket','سوپرمارکت',110),
 ('office-supplies','لوازم اداری',120)
) as c(code,name,sort_order)
where t.status='active'
on conflict(tenant_id,code) do update
set name=excluded.name,sort_order=excluded.sort_order,updated_at=now();

insert into role_permissions(role,permission) values
 ('admin','category:view'),('admin','category:manage'),
 ('manager','category:view'),('manager','category:manage'),
 ('viewer','category:view')
on conflict do nothing;
