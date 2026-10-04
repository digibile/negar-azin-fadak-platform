create table if not exists cart_sessions(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id) on delete cascade,customer_ref text not null,store_id uuid not null references stores(id) on delete restrict,status text not null default 'open' check(status in ('open','checked_out','abandoned')),currency text not null default 'IRR',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists cart_items(id uuid primary key default gen_random_uuid(),cart_id uuid not null references cart_sessions(id) on delete cascade,product_id uuid not null references products(id) on delete restrict,quantity numeric(20,3) not null check(quantity>0),unit_price numeric(20,2) not null check(unit_price>=0),created_at timestamptz not null default now(),unique(cart_id,product_id));
create table if not exists inventory_movements(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id) on delete cascade,product_id uuid not null references products(id) on delete restrict,store_id uuid references stores(id) on delete restrict,movement_type text not null,quantity numeric(20,3) not null,reference_type text,reference_id uuid,note text,created_by uuid references users(id) on delete set null,created_at timestamptz not null default now());
create table if not exists ledger_accounts(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id) on delete cascade,code text not null,name text not null,account_type text not null,status text not null default 'active',unique(tenant_id,code));
create table if not exists ledger_entries(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id) on delete cascade,entry_no text not null,source_type text not null,source_id uuid,description text not null,status text not null default 'posted',posted_at timestamptz not null default now(),created_by uuid references users(id) on delete set null,unique(tenant_id,entry_no));
create table if not exists ledger_lines(id uuid primary key default gen_random_uuid(),entry_id uuid not null references ledger_entries(id) on delete cascade,account_id uuid not null references ledger_accounts(id) on delete restrict,debit numeric(20,2) not null default 0,credit numeric(20,2) not null default 0,description text,check((debit>0 and credit=0) or (credit>0 and debit=0)));
alter table business_rules add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table business_rules add column if not exists event_key text not null default 'manual';
alter table business_rules add column if not exists priority int not null default 100;
alter table business_rules add column if not exists enabled boolean not null default true;
alter table sla_policies add column if not exists tenant_id uuid references tenants(id) on delete cascade;
alter table sla_policies add column if not exists target_minutes int not null default 0;
alter table sla_policies add column if not exists calendar_code text;
alter table sla_policies add column if not exists enabled boolean not null default true;
create table if not exists calendar_definitions(id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id) on delete cascade,code text not null,name text not null,timezone text not null default 'Asia/Tehran',week_days jsonb not null default '[6,0,1,2,3,4,5]'::jsonb,holidays jsonb not null default '[]'::jsonb,enabled boolean not null default true,unique(tenant_id,code));
create table if not exists platform_audit_events(
 id uuid primary key default gen_random_uuid(),tenant_id uuid references tenants(id) on delete cascade,
 actor_user_id uuid references users(id) on delete set null,action text not null,entity_type text not null,
 entity_id uuid,request_id text,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());
create table if not exists platform_notifications(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references tenants(id) on delete cascade,
 user_id uuid references users(id) on delete cascade,channel text not null,title text not null,body text not null,
 status text not null default 'queued',created_at timestamptz not null default now(),read_at timestamptz);
create index if not exists idx_cart_tenant on cart_sessions(tenant_id,status,updated_at desc);
create index if not exists idx_inventory_tenant_product on inventory_movements(tenant_id,product_id,created_at desc);
create index if not exists idx_ledger_tenant on ledger_entries(tenant_id,posted_at desc);
create index if not exists idx_ledger_lines_entry on ledger_lines(entry_id);
create index if not exists idx_rules_tenant on business_rules(tenant_id,enabled,event_key);
create index if not exists idx_sla_tenant on sla_policies(tenant_id,enabled);
create index if not exists idx_calendar_tenant on calendar_definitions(tenant_id,enabled);
create index if not exists idx_platform_audit_tenant on platform_audit_events(tenant_id,created_at desc);
create index if not exists idx_platform_notifications_user on platform_notifications(user_id,status,created_at desc);
insert into role_permissions(role,permission) values('admin','inventory:view'),('admin','inventory:manage'),('admin','cart:manage'),('admin','checkout:manage'),('admin','ledger:view'),('admin','ledger:manage'),('admin','rule:view'),('admin','rule:manage'),('admin','sla:view'),('admin','sla:manage'),('admin','calendar:view'),('admin','calendar:manage'),('admin','audit:view'),('admin','notification:view'),('manager','inventory:view'),('manager','inventory:manage'),('manager','cart:manage'),('manager','checkout:manage'),('manager','ledger:view'),('manager','ledger:manage'),('manager','rule:view'),('manager','rule:manage'),('manager','sla:view'),('manager','sla:manage'),('manager','calendar:view'),('manager','calendar:manage'),('manager','audit:view'),('manager','notification:view'),('viewer','inventory:view'),('viewer','ledger:view'),('viewer','rule:view'),('viewer','sla:view'),('viewer','calendar:view'),('viewer','audit:view'),('viewer','notification:view') on conflict do nothing;