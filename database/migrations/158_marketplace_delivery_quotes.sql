-- 158: manual marketplace delivery quote lifecycle
create table if not exists marketplace_delivery_quotes (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 order_id uuid not null references marketplace_orders(id) on delete cascade,
 version int not null check(version > 0),
 currency text not null,
 carrier_cost numeric(20,2) not null check(carrier_cost >= 0),
 customer_charge numeric(20,2) not null check(customer_charge >= 0),
 carrier_name text,
 service_name text,
 estimated_business_days_min int,
 estimated_business_days_max int,
 notes text,
 status text not null default 'offered' check(status in ('offered','accepted','rejected','expired','superseded')),
 expires_at timestamptz,
 created_by uuid references users(id) on delete set null,
 accepted_by uuid references users(id) on delete set null,
 accepted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,order_id,version),
 check(estimated_business_days_min is null or estimated_business_days_min >= 0),
 check(estimated_business_days_max is null or estimated_business_days_max >= 0),
 check(estimated_business_days_min is null or estimated_business_days_max is null or estimated_business_days_max >= estimated_business_days_min)
);
alter table marketplace_orders
 add column if not exists delivery_quote_id uuid references marketplace_delivery_quotes(id) on delete set null,
 add column if not exists delivery_quote_snapshot jsonb;
alter table marketplace_orders
 add column if not exists delivery_quote_required boolean not null default false;
alter table marketplace_orders alter column delivery_quote_required set default true;
create index if not exists idx_marketplace_delivery_quotes_order
 on marketplace_delivery_quotes(tenant_id,order_id,version desc);
create index if not exists idx_marketplace_delivery_quotes_status
 on marketplace_delivery_quotes(tenant_id,status,expires_at);
