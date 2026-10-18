-- 138: durable tenant-scoped external reference catalog.
-- Reference products are stored separately from owned seller inventory and never enable checkout.
create table if not exists catalog_reference_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  source_name text not null,
  source_product_id text not null,
  sku text not null,
  title text not null,
  description text,
  category text not null,
  source_price numeric(20,2) not null check(source_price > 0),
  original_price numeric(20,2),
  discount_percent numeric(5,2),
  currency text not null default 'IRR',
  image_url text not null,
  source_url text not null,
  brand text,
  rating numeric(4,2),
  source_available boolean,
  specifications jsonb not null default '[]'::jsonb,
  gallery_images jsonb not null default '[]'::jsonb,
  source_fetched_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, source_name, source_product_id),
  unique(tenant_id, sku)
);
create index if not exists catalog_reference_products_public_idx
  on catalog_reference_products(tenant_id, category, updated_at desc);
