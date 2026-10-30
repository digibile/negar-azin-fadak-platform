-- Enforce one facility per approved decision.
-- Fail safely instead of deleting or silently merging any pre-existing duplicate rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM lendtech_facilities
    WHERE decision_id IS NOT NULL
    GROUP BY tenant_ref, decision_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate lendtech facilities reference the same approved decision; reconcile them before applying migration 143';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lendtech_facility_decision_tenant
  ON lendtech_facilities(tenant_ref, decision_id)
  WHERE decision_id IS NOT NULL;
