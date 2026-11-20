-- Customer-owned delivery addresses for the public storefront.
CREATE TABLE IF NOT EXISTS marketplace_customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name varchar(200) NOT NULL,
  mobile varchar(20) NOT NULL,
  province varchar(100) NOT NULL,
  city varchar(100) NOT NULL,
  address_line text NOT NULL,
  postal_code varchar(20) NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_customer_addresses_postal_code_check CHECK (postal_code ~ '^[0-9۰-۹٠-٩-]{5,20}$')
);

CREATE INDEX IF NOT EXISTS marketplace_customer_addresses_owner_idx
  ON marketplace_customer_addresses(tenant_id,user_id,created_at DESC);

ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS delivery_address_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='marketplace_orders_delivery_address_fk'
      AND conrelid='marketplace_orders'::regclass
  ) THEN
    ALTER TABLE marketplace_orders
      ADD CONSTRAINT marketplace_orders_delivery_address_fk
      FOREIGN KEY (delivery_address_id)
      REFERENCES marketplace_customer_addresses(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS marketplace_checkout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key varchar(160) NOT NULL,
  order_id uuid REFERENCES marketplace_orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_checkout_requests_owner_key UNIQUE(tenant_id,user_id,idempotency_key)
);

