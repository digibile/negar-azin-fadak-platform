-- Supra-enterprise tenancy and commerce foundation.
-- This migration adds real tenant/company/brand/branch/store/seller/catalog/order
-- primitives without replacing the existing 45-module runtime.

create table if not exists tenants(
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'active' check(status in ('active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists companies(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,code)
);

create table if not exists brands(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  code text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,code)
);

create table if not exists branches(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  brand_id uuid references brands(id) on delete set null,
  code text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,code)
);

create table if not exists sellers(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  legal_name text not null,
  display_name text not null,
  status text not null default 'pending' check(status in ('pending','active','suspended','closed')),
  commission_rate numeric(8,4) not null default 0 check(commission_rate>=0 and commission_rate<=100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stores(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  seller_id uuid not null references sellers(id) on delete cascade,
  brand_id uuid references brands(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  code text not null,
  name text not null,
  slug text not null,
  status text not null default 'draft' check(status in ('draft','active','suspended','closed')),
  domain text,
  theme jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,slug),
  unique(tenant_id,code)
);

create table if not exists products(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  seller_id uuid not null references sellers(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  brand_id uuid references brands(id) on delete set null,
  sku text not null,
  title text not null,
  description text,
  category text,
  price numeric(20,2) not null default 0 check(price>=0),
  currency text not null default 'IRR',
  status text not null default 'draft' check(status in ('draft','active','archived')),
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,sku)
);

create table if not exists product_inventory(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  store_id uuid references stores(id) on delete cascade,
  quantity numeric(20,3) not null default 0 check(quantity>=0),
  reserved_quantity numeric(20,3) not null default 0 check(reserved_quantity>=0),
  updated_at timestamptz not null default now(),
  unique(product_id,store_id)
);

create table if not exists marketplace_orders(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete restrict,
  seller_id uuid not null references sellers(id) on delete restrict,
  order_no text not null,
  customer_ref text,
  status text not null default 'pending' check(status in ('pending','confirmed','paid','processing','shipped','delivered','cancelled','returned','refunded')),
  currency text not null default 'IRR',
  subtotal numeric(20,2) not null default 0 check(subtotal>=0),
  discount_amount numeric(20,2) not null default 0 check(discount_amount>=0),
  shipping_amount numeric(20,2) not null default 0 check(shipping_amount>=0),
  total_amount numeric(20,2) not null default 0 check(total_amount>=0),
  commission_amount numeric(20,2) not null default 0 check(commission_amount>=0),
  seller_payable numeric(20,2) not null default 0 check(seller_payable>=0),
  payment_method text,
  delivery_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,order_no)
);

create table if not exists marketplace_order_items(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references marketplace_orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity numeric(20,3) not null check(quantity>0),
  unit_price numeric(20,2) not null check(unit_price>=0),
  discount_amount numeric(20,2) not null default 0 check(discount_amount>=0),
  line_total numeric(20,2) not null check(line_total>=0)
);

create table if not exists seller_settlements(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  seller_id uuid not null references sellers(id) on delete restrict,
  settlement_no text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  gross_amount numeric(20,2) not null default 0,
  commission_amount numeric(20,2) not null default 0,
  adjustment_amount numeric(20,2) not null default 0,
  net_amount numeric(20,2) not null default 0,
  status text not null default 'pending' check(status in ('pending','approved','paid','reversed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,settlement_no)
);

create table if not exists user_tenants(
  user_id uuid not null references users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(user_id,tenant_id)
);

create index if not exists idx_companies_tenant on companies(tenant_id);
create index if not exists idx_brands_tenant on brands(tenant_id);
create index if not exists idx_branches_tenant on branches(tenant_id);
create index if not exists idx_sellers_tenant on sellers(tenant_id,status);
create index if not exists idx_stores_tenant on stores(tenant_id,seller_id,status);
create index if not exists idx_products_tenant on products(tenant_id,seller_id,status);
create index if not exists idx_inventory_tenant on product_inventory(tenant_id,product_id);
create index if not exists idx_orders_tenant on marketplace_orders(tenant_id,status,created_at desc);
create index if not exists idx_order_items_order on marketplace_order_items(order_id);
create index if not exists idx_settlements_tenant on seller_settlements(tenant_id,status,created_at desc);
create index if not exists idx_user_tenants_tenant on user_tenants(tenant_id,user_id);

insert into role_permissions(role,permission) values
('admin','tenant:view'),('admin','tenant:manage'),
('admin','company:view'),('admin','company:manage'),
('admin','brand:view'),('admin','brand:manage'),
('admin','branch:view'),('admin','branch:manage'),
('admin','seller:view'),('admin','seller:manage'),
('admin','store:view'),('admin','store:manage'),
('admin','product:view'),('admin','product:manage'),
('admin','order:view'),('admin','order:manage'),
('admin','settlement:view'),('admin','settlement:manage'),
('manager','tenant:view'),('manager','company:view'),('manager','company:manage'),
('manager','brand:view'),('manager','branch:view'),
('manager','seller:view'),('manager','seller:manage'),
('manager','store:view'),('manager','store:manage'),
('manager','product:view'),('manager','product:manage'),
('manager','order:view'),('manager','order:manage'),
('manager','settlement:view'),
('viewer','tenant:view'),('viewer','company:view'),('viewer','brand:view'),
('viewer','branch:view'),('viewer','seller:view'),('viewer','store:view'),
('viewer','product:view'),('viewer','order:view'),('viewer','settlement:view')
on conflict do nothing;

insert into menu_items(title,path,sort_order,permission)
values
('مدیریت مستاجران','/platform/tenants',940,'tenant:view'),
('شرکت‌ها و ساختار سازمانی','/platform/companies',950,'company:view'),
('فروشندگان و فروشگاه‌ها','/marketplace/sellers',960,'seller:view'),
('کاتالوگ محصولات','/marketplace/products',970,'product:view'),
('سفارش‌ها','/marketplace/orders',980,'order:view'),
('تسویه فروشندگان','/marketplace/settlements',990,'settlement:view')
on conflict do nothing;
