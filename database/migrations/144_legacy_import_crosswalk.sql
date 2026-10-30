-- 144: controlled legacy import crosswalk for one central PostgreSQL database.
-- This migration adds provenance/idempotency metadata only; it imports no source records.

CREATE TABLE IF NOT EXISTS legacy_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  source_system text NOT NULL,
  source_database text NOT NULL,
  source_snapshot text NOT NULL,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','running','applied','reconciled','failed')),
  source_checksum text,
  source_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (tenant_id, source_system, source_database, source_snapshot)
);

CREATE INDEX IF NOT EXISTS legacy_import_batches_tenant_status_idx
  ON legacy_import_batches(tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS legacy_entity_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  batch_id uuid REFERENCES legacy_import_batches(id) ON DELETE SET NULL,
  source_system text NOT NULL,
  source_database text NOT NULL,
  source_table text NOT NULL,
  source_id text NOT NULL,
  target_table text NOT NULL,
  target_id text NOT NULL,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(trim(source_id)) > 0),
  CHECK (length(trim(target_id)) > 0),
  UNIQUE (tenant_id, source_system, source_database, source_table, source_id, target_table)
);

CREATE INDEX IF NOT EXISTS legacy_entity_map_target_idx
  ON legacy_entity_map(tenant_id, target_table, target_id);

CREATE INDEX IF NOT EXISTS legacy_entity_map_source_idx
  ON legacy_entity_map(tenant_id, source_system, source_database, source_table);

ALTER TABLE lendtech_events
  ADD COLUMN IF NOT EXISTS source_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lendtech_events_source_ref
  ON lendtech_events(tenant_ref, source_ref)
  WHERE source_ref IS NOT NULL;

ALTER TABLE lendtech_applications
  ADD COLUMN IF NOT EXISTS legacy_imported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_lock boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS lendtech_applications_legacy_lock_idx
  ON lendtech_applications(tenant_ref, legacy_lock, created_at DESC)
  WHERE legacy_imported = true;
