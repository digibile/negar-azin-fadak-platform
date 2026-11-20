-- Customer return requests for delivered marketplace orders.
CREATE TABLE IF NOT EXISTS marketplace_return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES marketplace_orders(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES marketplace_order_items(id) ON DELETE RESTRICT,
  customer_ref text NOT NULL,
  request_no varchar(80) NOT NULL,
  requested_quantity numeric(20,3) NOT NULL CHECK (requested_quantity > 0),
  reason_code varchar(40) NOT NULL CHECK (reason_code IN ('damaged','defective','wrong_item','not_as_described','missing_parts','changed_mind','other')),
  description text NOT NULL DEFAULT '',
  status varchar(24) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','rejected','received','inspected','cancelled','closed')),
  decision_reason text,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  received_at timestamptz,
  inspected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,request_no)
);

CREATE INDEX IF NOT EXISTS marketplace_return_requests_customer_idx
  ON marketplace_return_requests(tenant_id,customer_ref,created_at DESC);

CREATE INDEX IF NOT EXISTS marketplace_return_requests_order_item_idx
  ON marketplace_return_requests(tenant_id,order_id,order_item_id,status);
