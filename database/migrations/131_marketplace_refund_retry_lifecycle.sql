-- Durable, idempotent retry lifecycle for customer-return refunds.
ALTER TABLE marketplace_refunds
  ADD COLUMN IF NOT EXISTS provider_idempotency_key text,
  ADD COLUMN IF NOT EXISTS provider_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_claim_token uuid,
  ADD COLUMN IF NOT EXISTS provider_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_last_status text,
  ADD COLUMN IF NOT EXISTS provider_last_error text;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='marketplace_refunds'::regclass
      AND conname='marketplace_refunds_provider_attempt_count_check'
  ) THEN
    ALTER TABLE marketplace_refunds
      ADD CONSTRAINT marketplace_refunds_provider_attempt_count_check
      CHECK (provider_attempt_count >= 0);
  END IF;
END;
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_refund_provider_idempotency
  ON marketplace_refunds(tenant_id,provider_code,provider_idempotency_key)
  WHERE provider_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_refunds_retry_queue
  ON marketplace_refunds(tenant_id,status,provider_last_attempt_at)
  WHERE status IN ('pending','failed');
