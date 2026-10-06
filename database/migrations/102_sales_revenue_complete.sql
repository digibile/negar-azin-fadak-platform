begin;
create extension if not exists pgcrypto;

create table if not exists sales_partners(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null,
 code text not null, name text not null, national_id text, phone text, email text,
 credit_limit numeric(20,2) not null default 0, credit_used numeric(20,2) not null default 0,
 status text not null default 'active' check(status in ('active','blocked','inactive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);
create table if not exists sales_products(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null,
 sku text not null, name text not null, unit text not null default 'عدد',
 sale_price numeric(20,2) not null default 0, tax_rate numeric(8,4) not null default 0,
 discount_rate numeric(8,4) not null default 0, stock_available numeric(20,4) not null default 0,
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,sku)
);
create table if not exists sales_price_lists(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null,
 name text not null, currency text not null default 'IRR', valid_from date, valid_to date,
 status text not null default 'active' check(status in ('draft','active','closed')),
 created_at timestamptz not null default now()
);
create table if not exists sales_price_list_items(
 id uuid primary key default gen_random_uuid(), price_list_id uuid not null references sales_price_lists(id) on delete cascade,
 product_id uuid not null references sales_products(id), price numeric(20,2) not null, min_qty numeric(20,4) not null default 1,
 unique(price_list_id,product_id,min_qty)
);
create table if not exists sales_quotes(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, quote_no text not null,
 partner_id uuid not null references sales_partners(id), price_list_id uuid, status text not null default 'draft'
 check(status in ('draft','submitted','approved','rejected','expired','converted','cancelled')),
 issue_date date not null default current_date, valid_until date, subtotal numeric(20,2) not null default 0,
 discount_total numeric(20,2) not null default 0, tax_total numeric(20,2) not null default 0, total numeric(20,2) not null default 0,
 notes text, created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,quote_no)
);
create table if not exists sales_quote_items(
 id uuid primary key default gen_random_uuid(), quote_id uuid not null references sales_quotes(id) on delete cascade,
 product_id uuid not null references sales_products(id), quantity numeric(20,4) not null check(quantity>0),
 unit_price numeric(20,2) not null, discount_rate numeric(8,4) not null default 0, tax_rate numeric(8,4) not null default 0,
 line_total numeric(20,2) not null
);
create table if not exists sales_orders(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, order_no text not null,
 partner_id uuid not null references sales_partners(id), quote_id uuid references sales_quotes(id),
 status text not null default 'draft' check(status in ('draft','pending_credit','confirmed','reserved','delivering','delivered','invoiced','cancelled','returned')),
 issue_date date not null default current_date, due_date date, subtotal numeric(20,2) not null default 0,
 discount_total numeric(20,2) not null default 0, tax_total numeric(20,2) not null default 0, total numeric(20,2) not null default 0,
 notes text, created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,order_no)
);
create table if not exists sales_order_items(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references sales_orders(id) on delete cascade,
 product_id uuid not null references sales_products(id), quantity numeric(20,4) not null check(quantity>0),
 unit_price numeric(20,2) not null, discount_rate numeric(8,4) not null default 0, tax_rate numeric(8,4) not null default 0,
 line_total numeric(20,2) not null, reserved_qty numeric(20,4) not null default 0
);
create table if not exists sales_invoices(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, invoice_no text not null,
 order_id uuid not null references sales_orders(id), partner_id uuid not null references sales_partners(id),
 status text not null default 'draft' check(status in ('draft','issued','final','partially_paid','paid','cancelled','returned')),
 issue_date date not null default current_date, due_date date, subtotal numeric(20,2) not null default 0,
 discount_total numeric(20,2) not null default 0, tax_total numeric(20,2) not null default 0, total numeric(20,2) not null default 0,
 paid_total numeric(20,2) not null default 0, notes text, created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,invoice_no)
);
create table if not exists sales_payments(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, invoice_id uuid not null references sales_invoices(id),
 amount numeric(20,2) not null check(amount>0), method text not null check(method in ('cash','bank','card','wallet','credit')),
 reference_no text, status text not null default 'confirmed' check(status in ('pending','confirmed','reversed')),
 paid_at timestamptz not null default now(), created_by uuid
);
create table if not exists sales_returns(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, return_no text not null,
 invoice_id uuid not null references sales_invoices(id), status text not null default 'requested'
 check(status in ('requested','approved','received','inspected','refunded','rejected','cancelled')),
 reason text, amount numeric(20,2) not null default 0, created_by uuid, created_at timestamptz not null default now(),
 unique(tenant_id,return_no)
);
create table if not exists sales_commissions(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, order_id uuid references sales_orders(id),
 seller_user_id uuid, rate numeric(8,4) not null, base_amount numeric(20,2) not null, amount numeric(20,2) not null,
 status text not null default 'accrued' check(status in ('accrued','approved','paid','cancelled')), created_at timestamptz not null default now()
);
create table if not exists sales_targets(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null, period_start date not null,
 period_end date not null, target_amount numeric(20,2) not null, achieved_amount numeric(20,2) not null default 0,
 status text not null default 'active' check(status in ('draft','active','closed')), created_at timestamptz not null default now()
);
create table if not exists sales_events(
 id bigserial primary key, tenant_id uuid not null, entity_type text not null, entity_id uuid not null,
 from_status text, to_status text, event_type text not null, reason text, actor_user_id uuid, created_at timestamptz not null default now()
);
create index if not exists sales_events_entity_idx on sales_events(tenant_id,entity_type,entity_id,created_at desc);
create table if not exists sales_financial_events(
 id bigserial primary key, tenant_id uuid not null, source_type text not null, source_id uuid not null,
 event_type text not null, amount numeric(20,2) not null default 0, state text not null default 'pending_accounting'
 check(state in ('pending_accounting','posted','reversed')), reference_no text, created_at timestamptz not null default now()
);

insert into platform_modules(code,title,is_active) values('22-sales-revenue','فروش و درآمد',true)
on conflict(code) do update set title=excluded.title,is_active=true;
insert into module_actions(module_id,action_code,title,permission)
select m.id,v.a,v.t,v.p from platform_modules m cross join (values
('read','مشاهده فروش','modules:22-sales-revenue:read'),
('write','ثبت فروش','modules:22-sales-revenue:write'),
('approve','تأیید فروش','modules:22-sales-revenue:approve'),
('invoice','صدور فاکتور','modules:22-sales-revenue:invoice'),
('payment','ثبت دریافت','modules:22-sales-revenue:payment'),
('return','ثبت برگشت','modules:22-sales-revenue:return')
)v(a,t,p) where m.code='22-sales-revenue'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;
commit;