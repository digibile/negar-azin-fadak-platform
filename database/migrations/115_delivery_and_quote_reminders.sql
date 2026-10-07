-- 115: delivery methods, financing ranges and scheduled quote reminders
alter table financing_programs add column if not exists approval_business_days_min int;
alter table financing_programs add column if not exists approval_business_days_max int;
update financing_programs set approval_business_days_min=approval_business_days,approval_business_days_max=approval_business_days where approval_business_days_min is null;
alter table financing_programs alter column approval_business_days_min set default 0;
alter table financing_programs alter column approval_business_days_max set default 0;

create table if not exists commerce_delivery_methods(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null,
 title text not null,
 carrier_type text not null check(carrier_type in ('courier','post','pickup','freight','digital')),
 business_days_min int not null default 0,
 business_days_max int not null default 0,
 cutoff_hour_local smallint not null default 12 check(cutoff_hour_local between 0 and 23),
 cost numeric(20,2) not null default 0,
 currency text not null default 'IRR',
 enabled boolean not null default true,
 rules jsonb not null default '{}'::jsonb,
 unique(tenant_id,code)
);

create table if not exists product_delivery_rules(
 tenant_id uuid not null references tenants(id) on delete cascade,
 product_id uuid not null references products(id) on delete cascade,
 delivery_method_id uuid not null references commerce_delivery_methods(id) on delete cascade,
 enabled boolean not null default true,
 primary key(product_id,delivery_method_id)
);

create table if not exists commerce_quote_reminders(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 quote_id uuid not null references commerce_purchase_quotes(id) on delete cascade,
 reminder_type text not null check(reminder_type in ('approval_ready','quote_expiring','payment_pending','delivery_update')),
 scheduled_at timestamptz not null,
 channel text not null check(channel in ('sms','email','push','whatsapp','in_app')),
 status text not null default 'queued' check(status in ('queued','sent','failed','cancelled')),
 destination text,
 template_code text,
 payload jsonb not null default '{}'::jsonb,
 sent_at timestamptz,
 created_at timestamptz not null default now()
);

create index if not exists idx_delivery_rules_product on product_delivery_rules(tenant_id,product_id,enabled);
create index if not exists idx_quote_reminders_due on commerce_quote_reminders(tenant_id,status,scheduled_at);
