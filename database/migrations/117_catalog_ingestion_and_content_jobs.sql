-- 117: automated catalog ingestion and reusable product-content jobs
create table if not exists catalog_import_connectors(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null,
 title text not null,
 connector_type text not null check(connector_type in ('api','feed','authorized_browser_agent','file')),
 base_url text,
 secret_reference text,
 schedule_minutes int not null default 360,
 enabled boolean not null default false,
 mapping jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);

create table if not exists catalog_import_jobs(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 connector_id uuid references catalog_import_connectors(id) on delete set null,
 job_no text not null,
 status text not null default 'queued' check(status in ('queued','running','completed','partial','failed','cancelled')),
 source_ref text,
 requested_by uuid references users(id) on delete set null,
 started_at timestamptz,
 completed_at timestamptz,
 stats jsonb not null default '{}'::jsonb,
 error_message text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,job_no)
);

create table if not exists catalog_import_items(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 job_id uuid not null references catalog_import_jobs(id) on delete cascade,
 external_ref text,
 source_url text,
 raw_payload jsonb not null default '{}'::jsonb,
 normalized_payload jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check(status in ('pending','normalized','review','imported','rejected','failed')),
 target_product_id uuid references products(id) on delete set null,
 confidence numeric(6,5),
 error_message text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists product_content_jobs(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 product_id uuid references products(id) on delete cascade,
 job_type text not null check(job_type in ('description','seo','social_post','reel_script','story','faq','customer_reply')),
 channel text,
 locale text not null default 'fa-IR',
 status text not null default 'queued' check(status in ('queued','processing','completed','failed','needs_review')),
 input_snapshot jsonb not null default '{}'::jsonb,
 output_payload jsonb not null default '{}'::jsonb,
 model_reference text,
 requested_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists idx_catalog_import_jobs on catalog_import_jobs(tenant_id,status,created_at desc);
create index if not exists idx_catalog_import_items on catalog_import_items(tenant_id,job_id,status);
create index if not exists idx_product_content_jobs on product_content_jobs(tenant_id,product_id,status,created_at desc);

insert into role_permissions(role,permission) values
('admin','catalog-import:read'),('admin','catalog-import:manage'),('admin','content-ai:read'),('admin','content-ai:manage'),
('manager','catalog-import:read'),('manager','catalog-import:manage'),('manager','content-ai:read'),('manager','content-ai:manage'),
('viewer','catalog-import:read'),('viewer','content-ai:read')
on conflict do nothing;
