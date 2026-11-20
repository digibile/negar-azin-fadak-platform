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


-- Shipping charges are tenant-configured. No default tariff is invented.
CREATE TABLE IF NOT EXISTS marketplace_shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  province varchar(100),
  city varchar(100),
  base_amount numeric(18,2) NOT NULL DEFAULT 0,
  per_item_amount numeric(18,2) NOT NULL DEFAULT 0,
  free_shipping_threshold numeric(18,2),
  currency varchar(10) NOT NULL DEFAULT 'IRR',
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_shipping_rates_base_check CHECK (base_amount >= 0),
  CONSTRAINT marketplace_shipping_rates_item_check CHECK (per_item_amount >= 0),
  CONSTRAINT marketplace_shipping_rates_threshold_check CHECK (free_shipping_threshold IS NULL OR free_shipping_threshold >= 0)
);

CREATE INDEX IF NOT EXISTS marketplace_shipping_rates_lookup_idx
  ON marketplace_shipping_rates(tenant_id,is_active,store_id,province,city,priority DESC);

ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS shipping_rate_id uuid REFERENCES marketplace_shipping_rates(id) ON DELETE SET NULL;
