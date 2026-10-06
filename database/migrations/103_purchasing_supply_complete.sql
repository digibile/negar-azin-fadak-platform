begin;
create extension if not exists pgcrypto;

create table if not exists purchase_suppliers(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, code text not null, name text not null,
 national_id text, phone text, email text, status text not null default 'active' check(status in ('active','blocked','inactive')),
 payment_terms_days int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);
create table if not exists purchase_requests(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, request_no text not null, requester_user_id uuid,
 status text not null default 'draft' check(status in ('draft','submitted','approved','rejected','rfq','ordered','closed','cancelled')),
 required_date date, department text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,request_no)
);
create table if not exists purchase_request_items(
 id uuid primary key default gen_random_uuid(), request_id uuid not null references purchase_requests(id) on delete cascade,
 product_name text not null, sku text, quantity numeric(20,4) not null check(quantity>0), unit text not null default 'عدد', estimated_unit_price numeric(20,2) not null default 0,
 unique(request_id,sku,product_name)
);
create table if not exists purchase_rfqs(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, rfq_no text not null, request_id uuid not null references purchase_requests(id),
 status text not null default 'draft' check(status in ('draft','sent','quoting','compared','selected','closed','cancelled')),
 deadline date, notes text, created_by uuid, created_at timestamptz not null default now(), unique(tenant_id,rfq_no)
);
create table if not exists purchase_rfq_suppliers(
 rfq_id uuid not null references purchase_rfqs(id) on delete cascade, supplier_id uuid not null references purchase_suppliers(id),
 status text not null default 'invited' check(status in ('invited','responded','declined')), invited_at timestamptz not null default now(),
 primary key(rfq_id,supplier_id)
);
create table if not exists purchase_supplier_quotes(
 id uuid primary key default gen_random_uuid(), rfq_id uuid not null references purchase_rfqs(id) on delete cascade,
 supplier_id uuid not null references purchase_suppliers(id), quote_no text, status text not null default 'received' check(status in ('received','selected','rejected')),
 subtotal numeric(20,2) not null default 0, tax_total numeric(20,2) not null default 0, shipping_total numeric(20,2) not null default 0,
 total numeric(20,2) not null default 0, delivery_days int not null default 0, quality_score numeric(8,2), notes text,
 created_at timestamptz not null default now(), unique(rfq_id,supplier_id)
);
create table if not exists purchase_supplier_quote_items(
 id uuid primary key default gen_random_uuid(), quote_id uuid not null references purchase_supplier_quotes(id) on delete cascade,
 product_name text not null, quantity numeric(20,4) not null check(quantity>0), unit_price numeric(20,2) not null, tax_rate numeric(8,4) not null default 0,
 line_total numeric(20,2) not null
);
create table if not exists purchase_orders(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, order_no text not null, supplier_id uuid not null references purchase_suppliers(id),
 request_id uuid references purchase_requests(id), quote_id uuid references purchase_supplier_quotes(id),
 status text not null default 'draft' check(status in ('draft','approved','sent','partially_received','received','invoiced','paid','cancelled')),
 issue_date date not null default current_date, expected_date date, subtotal numeric(20,2) not null default 0,
 tax_total numeric(20,2) not null default 0, total numeric(20,2) not null default 0, notes text, created_by uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,order_no)
);
create table if not exists purchase_order_items(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references purchase_orders(id) on delete cascade,
 product_name text not null, sku text, quantity numeric(20,4) not null check(quantity>0), unit text not null default 'عدد',
 unit_price numeric(20,2) not null default 0, tax_rate numeric(8,4) not null default 0, line_total numeric(20,2) not null,
 received_qty numeric(20,4) not null default 0
);
create table if not exists purchase_receipts(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, receipt_no text not null, order_id uuid not null references purchase_orders(id),
 status text not null default 'received' check(status in ('received','inspected','accepted','rejected','cancelled')),
 received_at timestamptz not null default now(), inspector_user_id uuid, notes text, created_by uuid, created_at timestamptz not null default now(),
 unique(tenant_id,receipt_no)
);
create table if not exists purchase_receipt_items(
 id uuid primary key default gen_random_uuid(), receipt_id uuid not null references purchase_receipts(id) on delete cascade,
 order_item_id uuid not null references purchase_order_items(id), quantity numeric(20,4) not null check(quantity>0), accepted_qty numeric(20,4) not null default 0,
 rejected_qty numeric(20,4) not null default 0
);
create table if not exists purchase_invoices(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, invoice_no text not null, supplier_id uuid not null references purchase_suppliers(id),
 order_id uuid not null references purchase_orders(id), status text not null default 'issued' check(status in ('draft','issued','approved','partially_paid','paid','cancelled')),
 issue_date date not null default current_date, subtotal numeric(20,2) not null default 0, tax_total numeric(20,2) not null default 0,
 total numeric(20,2) not null default 0, paid_total numeric(20,2) not null default 0, due_date date, notes text, created_by uuid, created_at timestamptz not null default now(),
 unique(tenant_id,invoice_no)
);
create table if not exists purchase_payments(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, invoice_id uuid not null references purchase_invoices(id),
 amount numeric(20,2) not null check(amount>0), method text not null check(method in ('bank','cash','card','wallet')), reference_no text, status text not null default 'confirmed' check(status in ('pending','confirmed','reversed')),
 paid_at timestamptz not null default now(), created_by uuid
);
create table if not exists purchase_returns(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, return_no text not null, order_id uuid not null references purchase_orders(id),
 status text not null default 'requested' check(status in ('requested','approved','shipped','received','credited','rejected','cancelled')),
 amount numeric(20,2) not null default 0, reason text, created_by uuid, created_at timestamptz not null default now(), unique(tenant_id,return_no)
);
create table if not exists supplier_evaluations(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, supplier_id uuid not null references purchase_suppliers(id),
 period_start date not null, period_end date not null, quality_score numeric(8,2) not null default 0, delivery_score numeric(8,2) not null default 0,
 price_score numeric(8,2) not null default 0, service_score numeric(8,2) not null default 0, total_score numeric(8,2) not null default 0,
 notes text, created_by uuid, created_at timestamptz not null default now()
);
create table if not exists supplier_contracts(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, contract_no text not null, supplier_id uuid not null references purchase_suppliers(id),
 title text not null, status text not null default 'draft' check(status in ('draft','active','expired','terminated')),
 start_date date, end_date date, value numeric(20,2) not null default 0, notes text, created_by uuid, created_at timestamptz not null default now(),
 unique(tenant_id,contract_no)
);
create table if not exists purchase_events(
 id bigserial primary key, tenant_id uuid not null, entity_type text not null, entity_id uuid not null, from_status text, to_status text,
 event_type text not null, reason text, actor_user_id uuid, created_at timestamptz not null default now()
);
create index if not exists purchase_events_entity_idx on purchase_events(tenant_id,entity_type,entity_id,created_at desc);
create table if not exists purchase_financial_events(
 id bigserial primary key, tenant_id uuid not null, source_type text not null, source_id uuid not null, event_type text not null,
 amount numeric(20,2) not null default 0, state text not null default 'pending_accounting' check(state in ('pending_accounting','posted','reversed')),
 reference_no text, created_at timestamptz not null default now()
);
insert into platform_modules(code,title,is_active) values('21-purchasing-supply','خرید و تأمین',true)
on conflict(code) do update set title=excluded.title,is_active=true;
insert into module_actions(module_id,action_code,title,permission)
select m.id,v.a,v.t,v.p from platform_modules m cross join (values
('read','مشاهده خرید','modules:21-purchasing-supply:read'),('write','ثبت خرید','modules:21-purchasing-supply:write'),
('approve','تأیید خرید','modules:21-purchasing-supply:approve'),('receive','دریافت کالا','modules:21-purchasing-supply:receive'),
('invoice','ثبت فاکتور خرید','modules:21-purchasing-supply:invoice'),('payment','پرداخت خرید','modules:21-purchasing-supply:payment'),
('return','برگشت خرید','modules:21-purchasing-supply:return')
)v(a,t,p) where m.code='21-purchasing-supply'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;
commit;