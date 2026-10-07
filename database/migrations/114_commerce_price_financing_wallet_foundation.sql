-- 114: commerce price intelligence, financing offers, quotes, business-day delivery and segregated credit wallets
create table if not exists commerce_suppliers(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null,
 legal_name text not null,
 display_name text not null,
 supplier_type text not null check(supplier_type in ('goods','service','finance','insurance','market_data','logistics')),
 status text not null default 'pending' check(status in ('pending','active','suspended','closed')),
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);

create table if not exists financing_brands(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 supplier_id uuid references commerce_suppliers(id) on delete set null,
 code text not null,
 title text not null,
 landing_path text,
 card_enabled boolean not null default false,
 wallet_enabled boolean not null default true,
 status text not null default 'draft' check(status in ('draft','active','suspended','closed')),
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);

create table if not exists financing_programs(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 brand_id uuid references financing_brands(id) on delete set null,
 supplier_id uuid not null references commerce_suppliers(id) on delete restrict,
 code text not null,
 title text not null,
 financing_type text not null default 'installment' check(financing_type in ('installment','credit_line','bnpl','card','cash_loan')),
 rate_percent numeric(10,4) not null default 0 check(rate_percent>=0),
 fixed_fee numeric(20,2) not null default 0 check(fixed_fee>=0),
 pricing_formula text not null default 'principal_plus_rate_plus_fee',
 min_amount numeric(20,2) not null default 0 check(min_amount>=0),
 max_amount numeric(20,2),
 min_term_months int,
 max_term_months int,
 approval_business_days int not null default 0 check(approval_business_days>=0),
 offer_validity_minutes int not null default 1440 check(offer_validity_minutes>0),
 requires_preapproval boolean not null default true,
 wallet_mode text not null default 'credit_only' check(wallet_mode in ('credit_only','cash','hybrid')),
 currency text not null default 'IRR',
 status text not null default 'draft' check(status in ('draft','active','suspended','closed')),
 rules jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);

create table if not exists market_price_sources(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null,
 name text not null,
 source_type text not null check(source_type in ('api','feed','authorized_crawler','manual')),
 base_url text,
 secret_reference text,
 refresh_interval_minutes int not null default 60,
 enabled boolean not null default false,
 terms_reference text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);

create table if not exists product_market_offers(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 product_id uuid not null references products(id) on delete cascade,
 source_id uuid not null references market_price_sources(id) on delete cascade,
 external_product_ref text,
 external_url text,
 seller_name text,
 price numeric(20,2) not null check(price>=0),
 shipping_amount numeric(20,2) not null default 0 check(shipping_amount>=0),
 currency text not null default 'IRR',
 availability text not null default 'unknown',
 confidence numeric(6,5),
 captured_at timestamptz not null default now(),
 expires_at timestamptz,
 raw_metadata jsonb not null default '{}'::jsonb
);
create index if not exists idx_market_offers_product_time on product_market_offers(tenant_id,product_id,currency,captured_at desc);

create table if not exists product_price_policies(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 product_id uuid not null references products(id) on delete cascade,
 strategy text not null default 'lowest_verified_market' check(strategy in ('fixed','lowest_verified_market','market_minus','cost_plus')),
 delta_amount numeric(20,2) not null default 0,
 delta_percent numeric(10,4) not null default 0,
 min_price numeric(20,2),
 max_price numeric(20,2),
 freshness_minutes int not null default 180,
 enabled boolean not null default true,
 unique(tenant_id,product_id)
);

create table if not exists commerce_purchase_quotes(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 quote_no text not null,
 customer_ref text not null,
 cart_id uuid references cart_sessions(id) on delete set null,
 status text not null default 'offered' check(status in ('draft','offered','financing_pending','ready','expired','converted','cancelled')),
 currency text not null default 'IRR',
 cash_amount numeric(20,2) not null default 0,
 selected_financing_program_id uuid references financing_programs(id) on delete set null,
 financed_amount numeric(20,2),
 total_repayable numeric(20,2),
 quoted_at timestamptz not null default now(),
 valid_until timestamptz not null,
 approval_due_at timestamptz,
 delivery_due_at timestamptz,
 price_snapshot jsonb not null default '{}'::jsonb,
 terms_snapshot jsonb not null default '{}'::jsonb,
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,quote_no)
);

create table if not exists commerce_quote_items(
 id uuid primary key default gen_random_uuid(),
 quote_id uuid not null references commerce_purchase_quotes(id) on delete cascade,
 product_id uuid not null references products(id) on delete restrict,
 quantity numeric(20,3) not null check(quantity>0),
 unit_price numeric(20,2) not null,
 line_total numeric(20,2) not null,
 variant_snapshot jsonb not null default '{}'::jsonb
);

create table if not exists commerce_financing_offers(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 quote_id uuid not null references commerce_purchase_quotes(id) on delete cascade,
 financing_program_id uuid not null references financing_programs(id) on delete restrict,
 principal numeric(20,2) not null,
 rate_percent numeric(10,4) not null,
 fee_amount numeric(20,2) not null default 0,
 total_repayable numeric(20,2) not null,
 term_months int,
 approval_business_days int not null,
 approval_due_at timestamptz,
 delivery_due_at timestamptz,
 status text not null default 'available' check(status in ('available','selected','pending_approval','approved','rejected','expired','cancelled')),
 provider_reference text,
 decision_payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists commerce_payment_intents(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 quote_id uuid not null references commerce_purchase_quotes(id) on delete restrict,
 order_id uuid references marketplace_orders(id) on delete set null,
 intent_no text not null,
 payment_mode text not null check(payment_mode in ('cash','credit_wallet','virtual_card')),
 amount numeric(20,2) not null check(amount>0),
 currency text not null default 'IRR',
 status text not null default 'created' check(status in ('created','authorized','pending','paid','failed','expired','cancelled','refunded')),
 provider_code text,
 provider_transaction_id text,
 idempotency_key text not null,
 expires_at timestamptz,
 metadata jsonb not null default '{}'::jsonb,
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,intent_no),
 unique(tenant_id,idempotency_key)
);

create table if not exists credit_wallet_accounts(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 owner_user_id uuid references users(id) on delete set null,
 facility_id uuid,
 financing_program_id uuid references financing_programs(id) on delete set null,
 wallet_code text not null,
 currency text not null default 'IRR',
 credit_limit numeric(20,2) not null default 0,
 available_limit numeric(20,2) not null default 0,
 reserved_limit numeric(20,2) not null default 0,
 spent_limit numeric(20,2) not null default 0,
 status text not null default 'active' check(status in ('active','blocked','expired','closed')),
 cash_out_allowed boolean not null default false,
 transfer_allowed boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,wallet_code)
);

create table if not exists credit_wallet_holds(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 wallet_id uuid not null references credit_wallet_accounts(id) on delete cascade,
 payment_intent_id uuid references commerce_payment_intents(id) on delete set null,
 amount numeric(20,2) not null check(amount>0),
 status text not null default 'active' check(status in ('active','captured','released','expired')),
 expires_at timestamptz not null,
 reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists credit_wallet_ledger(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 wallet_id uuid not null references credit_wallet_accounts(id) on delete cascade,
 entry_no text not null,
 direction text not null check(direction in ('reserve','release','capture','adjustment')),
 amount numeric(20,2) not null check(amount>0),
 balance_available numeric(20,2) not null,
 balance_reserved numeric(20,2) not null,
 reference_type text,
 reference_id uuid,
 idempotency_key text not null,
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(tenant_id,entry_no),
 unique(tenant_id,idempotency_key)
);

create table if not exists credit_virtual_cards(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 wallet_id uuid not null references credit_wallet_accounts(id) on delete cascade,
 provider_code text not null,
 provider_card_reference text not null,
 masked_pan text,
 status text not null default 'active' check(status in ('pending','active','blocked','expired','closed')),
 spend_limit numeric(20,2),
 expires_at timestamptz,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,provider_card_reference)
);

create table if not exists catalog_attribute_definitions(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null,
 title text not null,
 value_type text not null default 'text' check(value_type in ('text','number','boolean','choice','multi_choice')),
 unit text,
 options jsonb not null default '[]'::jsonb,
 is_variant_axis boolean not null default false,
 created_at timestamptz not null default now(),
 unique(tenant_id,code)
);

create table if not exists catalog_product_variants(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 product_id uuid not null references products(id) on delete cascade,
 sku text not null,
 title text,
 attributes jsonb not null default '{}'::jsonb,
 price numeric(20,2),
 inventory_quantity numeric(20,3) not null default 0,
 status text not null default 'active' check(status in ('draft','active','archived')),
 unique(tenant_id,sku)
);

create index if not exists idx_financing_programs_active on financing_programs(tenant_id,status);
create index if not exists idx_quotes_customer on commerce_purchase_quotes(tenant_id,customer_ref,created_at desc);
create index if not exists idx_financing_offers_quote on commerce_financing_offers(tenant_id,quote_id,status);
create index if not exists idx_payment_intents_quote on commerce_payment_intents(tenant_id,quote_id,status);
create index if not exists idx_credit_wallet_owner on credit_wallet_accounts(tenant_id,owner_user_id,status);
create index if not exists idx_credit_wallet_holds on credit_wallet_holds(tenant_id,wallet_id,status,expires_at);
create index if not exists idx_credit_wallet_ledger on credit_wallet_ledger(tenant_id,wallet_id,created_at desc);
create index if not exists idx_virtual_cards_wallet on credit_virtual_cards(tenant_id,wallet_id,status);

insert into role_permissions(role,permission) values
('admin','supplier:read'),('admin','supplier:manage'),('admin','financing:read'),('admin','financing:manage'),
('admin','market-price:read'),('admin','market-price:manage'),('admin','quote:read'),('admin','quote:manage'),
('admin','credit-wallet:read'),('admin','credit-wallet:manage'),
('manager','supplier:read'),('manager','supplier:manage'),('manager','financing:read'),('manager','financing:manage'),
('manager','market-price:read'),('manager','market-price:manage'),('manager','quote:read'),('manager','quote:manage'),
('manager','credit-wallet:read'),('manager','credit-wallet:manage'),
('viewer','supplier:read'),('viewer','financing:read'),('viewer','market-price:read'),('viewer','quote:read'),('viewer','credit-wallet:read')
on conflict do nothing;

alter table calendar_work_calendars add column if not exists locale text not null default 'fa-IR';
alter table calendar_work_calendars add column if not exists date_system text not null default 'jalali';
