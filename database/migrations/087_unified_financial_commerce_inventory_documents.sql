-- 087: unified financial, commerce, inventory, costing and intelligent document foundation.
-- No demo business data. All records are tenant-scoped and auditable.

create table if not exists accounting_companies(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null, name text not null, legal_name text, tax_id text, national_id text,
 accounting_mode text not null default 'hybrid' check(accounting_mode in ('official','internal','hybrid')),
 parent_company_id uuid references accounting_companies(id) on delete set null,
 base_currency text not null default 'IRR',
 fiscal_calendar text not null default 'jalali',
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);
create index if not exists accounting_companies_tenant_idx on accounting_companies(tenant_id,status);

create table if not exists accounting_company_books(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 company_id uuid not null references accounting_companies(id) on delete cascade,
 book_id uuid not null references accounting_books(id) on delete cascade,
 is_primary boolean not null default false,
 created_at timestamptz not null default now(),
 unique(company_id,book_id)
);

create table if not exists finance_products(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 sku text, barcode text, code text not null, title text not null,
 product_type text not null default 'goods' check(product_type in ('goods','service','raw_material','semi_finished','finished_good','asset','consumable')),
 brand text, category text, unit text not null default 'عدد', secondary_unit text,
 tax_rate numeric(8,4) not null default 0, purchase_price numeric(20,4) not null default 0,
 sale_price numeric(20,4) not null default 0, reorder_point numeric(20,4) not null default 0,
 tracking_mode text not null default 'none' check(tracking_mode in ('none','serial','batch','serial_batch')),
 expiry_required boolean not null default false,
 accounting_data jsonb not null default '{}'::jsonb,
 is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);
create index if not exists finance_products_search_idx on finance_products(tenant_id,title,sku,barcode);

create table if not exists finance_warehouses(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 company_id uuid references accounting_companies(id) on delete set null,
 code text not null, title text not null, address text, manager_user_id uuid references users(id) on delete set null,
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(), unique(tenant_id,code)
);

create table if not exists finance_inventory_balances(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 warehouse_id uuid not null references finance_warehouses(id) on delete cascade,
 product_id uuid not null references finance_products(id) on delete restrict,
 quantity numeric(20,4) not null default 0,
 reserved_quantity numeric(20,4) not null default 0,
 unit_cost numeric(20,4) not null default 0,
 value_amount numeric(20,4) not null default 0,
 updated_at timestamptz not null default now(),
 unique(warehouse_id,product_id)
);

create table if not exists finance_inventory_documents(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 warehouse_id uuid not null references finance_warehouses(id) on delete restrict,
 document_no text not null, document_type text not null check(document_type in ('receipt','issue','transfer','return_receipt','return_issue','adjustment','count')),
 document_date date not null, status text not null default 'draft' check(status in ('draft','approved','posted','void')),
 source_type text, source_id uuid, description text not null default '',
 created_by uuid references users(id) on delete set null, posted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,warehouse_id,document_no)
);

create table if not exists finance_inventory_lines(
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references finance_inventory_documents(id) on delete cascade,
 product_id uuid not null references finance_products(id) on delete restrict,
 quantity numeric(20,4) not null check(quantity>0),
 unit_cost numeric(20,4) not null default 0,
 serial_no text, batch_no text, expires_on date,
 destination_warehouse_id uuid references finance_warehouses(id) on delete restrict
);

create table if not exists finance_cost_layers(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 product_id uuid not null references finance_products(id) on delete restrict,
 inventory_document_line_id uuid references finance_inventory_lines(id) on delete set null,
 method text not null check(method in ('weighted_average','fifo','standard','actual')),
 quantity numeric(20,4) not null default 0,
 unit_cost numeric(20,4) not null default 0,
 total_cost numeric(20,4) not null default 0,
 created_at timestamptz not null default now()
);

create table if not exists finance_purchases(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 company_id uuid references accounting_companies(id) on delete set null,
 supplier_id uuid, invoice_no text, invoice_date date,
 status text not null default 'draft' check(status in ('draft','confirmed','received','paid','cancelled')),
 subtotal numeric(20,2) not null default 0, discount numeric(20,2) not null default 0,
 tax numeric(20,2) not null default 0, total numeric(20,2) not null default 0,
 accounting_document_id uuid references accounting_documents(id) on delete set null,
 created_by uuid references users(id) on delete set null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists finance_purchase_lines(
 id uuid primary key default gen_random_uuid(),
 purchase_id uuid not null references finance_purchases(id) on delete cascade,
 product_id uuid references finance_products(id) on delete restrict,
 description text not null default '', quantity numeric(20,4) not null default 1,
 unit_price numeric(20,4) not null default 0, discount numeric(20,4) not null default 0,
 tax numeric(20,4) not null default 0, total numeric(20,4) not null default 0
);

create table if not exists finance_sales(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 company_id uuid references accounting_companies(id) on delete set null,
 customer_id uuid, invoice_no text, invoice_date date,
 status text not null default 'draft' check(status in ('draft','confirmed','delivered','paid','cancelled')),
 subtotal numeric(20,2) not null default 0, discount numeric(20,2) not null default 0,
 tax numeric(20,2) not null default 0, total numeric(20,2) not null default 0,
 accounting_document_id uuid references accounting_documents(id) on delete set null,
 created_by uuid references users(id) on delete set null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists finance_sales_lines(
 id uuid primary key default gen_random_uuid(),
 sale_id uuid not null references finance_sales(id) on delete cascade,
 product_id uuid references finance_products(id) on delete restrict,
 description text not null default '', quantity numeric(20,4) not null default 1,
 unit_price numeric(20,4) not null default 0, discount numeric(20,4) not null default 0,
 tax numeric(20,4) not null default 0, total numeric(20,4) not null default 0,
 cost_of_goods numeric(20,4) not null default 0
);

create table if not exists finance_document_vaults(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 vault_no text not null, title text not null, entity_type text, entity_id uuid,
 document_type text not null default 'other',
 confidentiality text not null default 'internal' check(confidentiality in ('public','internal','confidential','restricted')),
 retention_until date, status text not null default 'active' check(status in ('active','archived','void','pending_review')),
 created_by uuid references users(id) on delete set null, created_at timestamptz not null default now(),
 unique(tenant_id,vault_no)
);

create table if not exists finance_document_files(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 vault_id uuid not null references finance_document_vaults(id) on delete cascade,
 file_name text not null, mime_type text not null, file_size bigint not null default 0,
 storage_key text, sha256 text, version_no integer not null default 1,
 is_original boolean not null default true, ocr_status text not null default 'pending' check(ocr_status in ('pending','processing','completed','failed')),
 ocr_text text, extracted_data jsonb not null default '{}'::jsonb,
 uploaded_by uuid references users(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists finance_document_files_vault_idx on finance_document_files(vault_id,version_no desc);

create table if not exists finance_document_links(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 vault_id uuid not null references finance_document_vaults(id) on delete cascade,
 entity_type text not null, entity_id uuid not null, relation_type text not null default 'attachment',
 created_by uuid references users(id) on delete set null, created_at timestamptz not null default now(),
 unique(vault_id,entity_type,entity_id,relation_type)
);

create table if not exists finance_ocr_jobs(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 file_id uuid not null references finance_document_files(id) on delete cascade,
 provider text not null default 'pending',
 status text not null default 'queued' check(status in ('queued','processing','completed','failed','needs_review')),
 language text not null default 'fas',
 raw_text text, extracted_data jsonb not null default '{}'::jsonb,
 confidence numeric(6,3),
 error_message text,
 created_at timestamptz not null default now(), completed_at timestamptz
);

create table if not exists finance_audit_binders(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 vault_id uuid not null references finance_document_vaults(id) on delete cascade,
 entity_type text not null, entity_id uuid not null,
 event_count integer not null default 0,
 last_event_at timestamptz,
 created_at timestamptz not null default now(),
 unique(vault_id,entity_type,entity_id)
);

create table if not exists finance_audit_events(
 id bigserial primary key,
 tenant_id uuid not null references tenants(id) on delete cascade,
 binder_id uuid references finance_audit_binders(id) on delete cascade,
 entity_type text not null, entity_id uuid,
 action text not null, actor_user_id uuid references users(id) on delete set null,
 before_data jsonb, after_data jsonb, request_id text, ip_address inet,
 created_at timestamptz not null default now()
);
create index if not exists finance_audit_events_lookup on finance_audit_events(tenant_id,entity_type,entity_id,created_at desc);

insert into identity_permissions(permission_key,title,module_key,action) values
('accounting-finance.read','مشاهده هسته مالی','08-accounting-finance','read'),
('accounting-finance.write','مدیریت هسته مالی','08-accounting-finance','write'),
('accounting-finance.documents','مدیریت زونکن و اسناد مالی','08-accounting-finance','documents'),
('accounting-finance.audit','حسابرسی مالی','08-accounting-finance','audit')
on conflict(permission_key) do nothing;
insert into identity_role_permissions(role_key,permission_key)
select r,'accounting-finance.documents' from (values('admin'),('manager')) x(r) on conflict do nothing;
insert into identity_role_permissions(role_key,permission_key)
select r,'accounting-finance.audit' from (values('admin'),('manager'),('viewer')) x(r) on conflict do nothing;

-- Consolidate the old top-level finance/document modules under menu 08 at data level.
update menu_items set parent_id=(select id from menu_items where menu_key='accounting')
where menu_key in ('treasury','checks','digital-file','documents','financial-reports','assets','tax')
  and exists(select 1 from menu_items where menu_key='accounting');

-- Keep the legacy 09/10/17/41-50 runtime modules available for compatibility,
-- but their navigation ownership is the unified 08 financial domain.
