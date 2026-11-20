-- Seller recovery claims for customer refunds issued after seller settlement payout.
create table if not exists marketplace_seller_recovery_claims(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 seller_id uuid not null references sellers(id) on delete restrict,
 settlement_id uuid not null references seller_settlements(id) on delete restrict,
 order_id uuid not null references marketplace_orders(id) on delete restrict,
 refund_id uuid not null references marketplace_refunds(id) on delete restrict,
 amount numeric(20,2) not null check(amount>0),
 currency text not null default 'IRR',
 status text not null default 'open' check(status in ('open','recovered','waived')),
 reason text,
 payment_ref text,
 recognition_ledger_entry_id uuid references ledger_entries(id) on delete restrict,
 collection_ledger_entry_id uuid references ledger_entries(id) on delete restrict,
 created_by uuid references users(id) on delete set null,
 recovered_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,order_id)
);
create index if not exists idx_seller_recovery_claims_tenant_status
 on marketplace_seller_recovery_claims(tenant_id,status,created_at desc);
create index if not exists idx_seller_recovery_claims_seller
 on marketplace_seller_recovery_claims(tenant_id,seller_id,status);
insert into role_permissions(role,permission) values
 ('admin','settlement:view'),('admin','settlement:manage'),
 ('manager','settlement:view'),('manager','settlement:manage')
on conflict do nothing;
