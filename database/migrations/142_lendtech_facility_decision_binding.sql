ALTER TABLE lendtech_facilities
  ADD COLUMN IF NOT EXISTS decision_id uuid;

UPDATE lendtech_facilities f
SET decision_id = (
  SELECT d.id
  FROM lendtech_decisions d
  WHERE d.application_id = f.application_id
    AND d.tenant_ref = f.tenant_ref
    AND d.decision = 'approve'
    AND d.decided_at <= f.created_at
  ORDER BY d.decided_at DESC, d.id DESC
  LIMIT 1
)
WHERE f.decision_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lendtech_facilities_decision_id_fkey'
      AND conrelid = 'lendtech_facilities'::regclass
  ) THEN
    ALTER TABLE lendtech_facilities
      ADD CONSTRAINT lendtech_facilities_decision_id_fkey
      FOREIGN KEY (decision_id) REFERENCES lendtech_decisions(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lendtech_facility_decision_tenant
  ON lendtech_facilities(tenant_ref, decision_id)
  WHERE decision_id IS NOT NULL;
