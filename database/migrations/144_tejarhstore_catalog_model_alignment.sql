-- 144: align TejarhStore's useful catalog capabilities with the canonical Sookar model.
-- Additive and tenant-scoped; no second catalog or checkout engine is introduced.

alter table marketplace_categories
  add column if not exists slug text,
  add column if not exists icon_url text,
  add column if not exists parent_category_id uuid;

update marketplace_categories
set slug=coalesce(nullif(slug,''),code)
where slug is null or slug='';

alter table marketplace_categories alter column slug set not null;

create unique index if not exists uq_marketplace_categories_tenant_slug
  on marketplace_categories(tenant_id,slug);
create unique index if not exists uq_marketplace_categories_tenant_id
  on marketplace_categories(tenant_id,id);

alter table marketplace_categories
  add constraint fk_marketplace_categories_parent_tenant
  foreign key (tenant_id,parent_category_id)
  references marketplace_categories(tenant_id,id)
  on delete set null (parent_category_id);

alter table products
  add column if not exists category_id uuid,
  add column if not exists discount_price numeric(20,2);

create unique index if not exists uq_products_tenant_id
  on products(tenant_id,id);

alter table products
  add constraint fk_products_category_tenant
  foreign key (tenant_id,category_id)
  references marketplace_categories(tenant_id,id)
  on delete set null (category_id);

alter table products
  add constraint ck_products_discount_price
  check (discount_price is null or (discount_price >= 0 and discount_price <= price));

create index if not exists idx_products_tenant_category
  on products(tenant_id,category_id,status);

alter table brands add column if not exists logo_url text;

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null,
  url text not null,
  alt_text text,
  is_main boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_product_images_product_tenant
    foreign key (tenant_id,product_id)
    references products(tenant_id,id)
    on delete cascade
);

create index if not exists idx_product_images_product_order
  on product_images(tenant_id,product_id,is_main desc,sort_order,created_at);
create unique index if not exists uq_product_images_one_main
  on product_images(tenant_id,product_id)
  where is_main=true;

insert into role_permissions(role,permission) values
 ('admin','product:image:manage'),
 ('manager','product:image:manage')
on conflict do nothing;
