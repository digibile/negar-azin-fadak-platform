-- 114: auditable reference-source sync kept separate from the owned product catalog.
create table if not exists catalog_source_links (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 product_id uuid not null references products(id) on delete cascade,
 source_name text not null,
 source_product_id text not null,
 source_sku text,
 source_url text,
 source_currency text not null default 'IRR',
 source_price numeric(20,2),
 source_available boolean,
 price_policy text not null default 'manual' check(price_policy in ('manual','mirror','markup')),
 markup_percent numeric(8,4) not null default 0 check(markup_percent >= -100 and markup_percent <= 10000),
 last_checked_at timestamptz,
 last_success_at timestamptz,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,source_name,source_product_id),
 unique(tenant_id,product_id,source_name)
);
create index if not exists catalog_source_links_product_idx on catalog_source_links(tenant_id,product_id);
create table if not exists catalog_source_sync_runs (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 source_name text not null,
 status text not null check(status in ('running','succeeded','partial','failed')),
 requested_count integer not null default 0 check(requested_count >= 0),
 matched_count integer not null default 0 check(matched_count >= 0),
 updated_count integer not null default 0 check(updated_count >= 0),
 skipped_count integer not null default 0 check(skipped_count >= 0),
 failed_count integer not null default 0 check(failed_count >= 0),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 summary jsonb not null default '{}'::jsonb,
 created_by uuid references users(id) on delete set null
);
create index if not exists catalog_source_sync_runs_tenant_idx on catalog_source_sync_runs(tenant_id,started_at desc);
