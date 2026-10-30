-- 150: bank accounts owned by external accounting parties.
-- accounting_bank_accounts remains reserved for the tenant's own treasury accounts.
BEGIN;

CREATE OR REPLACE FUNCTION is_valid_iranian_iban(input_iban text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  normalized text;
  rearranged text;
  expanded text := '';
  ch text;
  remainder integer := 0;
  i integer;
BEGIN
  normalized := upper(regexp_replace(input_iban, '[[:space:]-]', '', 'g'));
  IF normalized !~ '^IR[0-9]{24}$' THEN
    RETURN false;
  END IF;

  rearranged := substring(normalized FROM 5) || substring(normalized FROM 1 FOR 4);
  FOR i IN 1..length(rearranged) LOOP
    ch := substring(rearranged FROM i FOR 1);
    IF ch ~ '^[A-Z]$' THEN
      expanded := expanded || (ascii(ch) - 55)::text;
    ELSE
      expanded := expanded || ch;
    END IF;
  END LOOP;

  FOR i IN 1..length(expanded) LOOP
    remainder := (remainder * 10 + substring(expanded FROM i FOR 1)::integer) % 97;
  END LOOP;

  RETURN remainder = 1;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounting_parties_tenant_id_unique'
      AND conrelid = 'accounting_parties'::regclass
  ) THEN
    ALTER TABLE accounting_parties
      ADD CONSTRAINT accounting_parties_tenant_id_unique UNIQUE (tenant_id, id);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS accounting_party_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  party_id uuid NOT NULL,
  account_title text,
  bank_name text,
  branch_name text,
  account_no text,
  iban text NOT NULL,
  card_no text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'blocked')),
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_method text,
  verification_note text,
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_party_bank_accounts_party_fk
    FOREIGN KEY (tenant_id, party_id)
    REFERENCES accounting_parties(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT accounting_party_bank_accounts_iban_valid
    CHECK (is_valid_iranian_iban(iban)),
  CONSTRAINT accounting_party_bank_accounts_verified_metadata
    CHECK (
      verification_status <> 'verified'
      OR (verified_by IS NOT NULL AND verified_at IS NOT NULL AND verification_method IS NOT NULL)
    ),
  UNIQUE (tenant_id, iban)
);

CREATE INDEX IF NOT EXISTS accounting_party_bank_accounts_party_idx
  ON accounting_party_bank_accounts(tenant_id, party_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS accounting_party_bank_accounts_verification_idx
  ON accounting_party_bank_accounts(tenant_id, verification_status, status, created_at DESC);

COMMIT;
