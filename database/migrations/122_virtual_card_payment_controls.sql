-- 122: virtual credit-card controls and payment permissions
create index if not exists idx_virtual_cards_owner_status
on credit_virtual_cards(tenant_id,wallet_id,status,expires_at);

alter table credit_virtual_cards
 add column if not exists last_payment_intent_id uuid references commerce_payment_intents(id) on delete set null;

alter table credit_virtual_cards
 add column if not exists consumed_amount numeric(20,2) not null default 0 check(consumed_amount>=0);

insert into role_permissions(role,permission) values
('admin','payment:read'),('admin','payment:manage'),
('admin','payment-review:read'),('admin','payment-review:manage'),
('admin','payment-gateway:read'),('admin','payment-gateway:manage'),
('manager','payment:read'),('manager','payment:manage'),
('manager','payment-review:read'),('manager','payment-review:manage'),
('manager','payment-gateway:read'),('manager','payment-gateway:manage'),
('viewer','payment:read'),('viewer','payment-review:read'),('viewer','payment-gateway:read')
on conflict do nothing;
