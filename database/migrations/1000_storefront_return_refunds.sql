-- Link each approved customer return to one idempotent partial refund.
ALTER TABLE marketplace_refunds
  ADD COLUMN IF NOT EXISTS return_request_id uuid
  REFERENCES marketplace_return_requests(id) ON DELETE RESTRICT;

DROP INDEX IF EXISTS uq_marketplace_refund_payment;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_refund_return_request
  ON marketplace_refunds(tenant_id,return_request_id)
  WHERE return_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_refunds_payment_status
  ON marketplace_refunds(tenant_id,payment_id,status,created_at);

