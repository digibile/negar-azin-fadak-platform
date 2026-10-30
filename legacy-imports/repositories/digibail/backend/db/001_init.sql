CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY, username VARCHAR(80) UNIQUE, phone VARCHAR(16) UNIQUE,
  full_name VARCHAR(160) NOT NULL, national_code CHAR(10) UNIQUE, email VARCHAR(254),
  password_hash TEXT NOT NULL, role VARCHAR(32) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin','superadmin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at DESC);
CREATE TABLE IF NOT EXISTS sms_provider_settings (
  provider VARCHAR(40) PRIMARY KEY,
  api_key_encrypted TEXT NOT NULL,
  sender VARCHAR(32) NOT NULL,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS captcha_challenges (
  id UUID PRIMARY KEY, answer_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS captcha_expiry_idx ON captcha_challenges(expires_at);
CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY, phone VARCHAR(16) NOT NULL, purpose VARCHAR(16) NOT NULL CHECK (purpose IN ('login','register','password_reset')),
  code_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, resend_at TIMESTAMPTZ NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0, consumed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS otp_phone_created_idx ON otp_challenges(phone, created_at DESC);
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL, ip_address INET, details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_created_at_idx ON audit_logs(created_at DESC);


-- Legacy account compatibility and imported Digibail modules.
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS legacy_source TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS legacy_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_legacy_source_id_uq
  ON users(legacy_source, legacy_id)
  WHERE legacy_source IS NOT NULL AND legacy_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS legacy_customers (
  legacy_id UUID PRIMARY KEY,
  name TEXT,
  mobile TEXT,
  email TEXT,
  customer_code INTEGER,
  registered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN,
  purchased BOOLEAN,
  affiliate_code TEXT,
  parked_domain TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_templates (
  id BIGSERIAL PRIMARY KEY,
  legacy_id UUID UNIQUE,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  status INTEGER NOT NULL DEFAULT 0,
  category INTEGER NOT NULL DEFAULT 0,
  provider_panel INTEGER NOT NULL DEFAULT 0,
  is_pattern_base BOOLEAN NOT NULL DEFAULT FALSE,
  pattern_base_code TEXT,
  reject_reason TEXT,
  legacy_customer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sms_templates_status_idx ON sms_templates(status, category);

CREATE TABLE IF NOT EXISTS sms_logs (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT REFERENCES sms_templates(id) ON DELETE SET NULL,
  recipient_masked VARCHAR(32),
  status VARCHAR(24) NOT NULL,
  provider_message_id TEXT,
  error_code VARCHAR(80),
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sms_logs_created_at_idx ON sms_logs(created_at DESC);

ALTER TABLE otp_challenges DROP CONSTRAINT IF EXISTS otp_challenges_purpose_check;
ALTER TABLE otp_challenges ADD CONSTRAINT otp_challenges_purpose_check CHECK (purpose IN ('login','register','password_reset'));

-- Preserve legacy operational records whose schema varies between old releases.
CREATE TABLE IF NOT EXISTS legacy_source_data (
  source_table VARCHAR(120) NOT NULL,
  legacy_id VARCHAR(160) NOT NULL,
  payload JSONB NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_table, legacy_id)
);
CREATE INDEX IF NOT EXISTS legacy_source_data_table_idx
  ON legacy_source_data(source_table, imported_at DESC);

CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(80) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  file_data BYTEA NOT NULL,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ocr_text TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Verified','Rejected')),
  review_note TEXT,
  created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customer_documents_user_created_idx ON customer_documents(user_id, created_on DESC);

CREATE TABLE IF NOT EXISTS customer_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(240) NOT NULL,
  number VARCHAR(120) NOT NULL,
  body_html TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Presented' CHECK (status IN ('Presented','AwaitingSignature','Signed','Rejected','Expired')),
  expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_note TEXT,
  created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customer_contracts_user_created_idx ON customer_contracts(user_id, created_on DESC);

CREATE TABLE IF NOT EXISTS beta_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(32) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  national_code CHAR(10) NOT NULL,
  consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(40) NOT NULL DEFAULT 'pending_provider',
  status_note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS beta_inquiries_user_created_idx ON beta_inquiries(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS loan_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL, title VARCHAR(160) NOT NULL DEFAULT '', description VARCHAR(500) NOT NULL DEFAULT '', badge VARCHAR(40) NOT NULL DEFAULT '',
  min_amount NUMERIC(18,2) NOT NULL DEFAULT 0, max_amount NUMERIC(18,2) NOT NULL DEFAULT 0, interval_days INTEGER NOT NULL DEFAULT 0,
  tiers JSONB NOT NULL DEFAULT '[]'::jsonb, conditions JSONB NOT NULL DEFAULT '{}'::jsonb, documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE, sort_order INTEGER NOT NULL DEFAULT 0,
  interest_method VARCHAR(12) NOT NULL DEFAULT 'Monthly' CHECK (interest_method IN ('Monthly','Annual','Flat')),
  interest_percent NUMERIC(18,6) NOT NULL DEFAULT 0, late_daily_coef NUMERIC(18,8) NOT NULL DEFAULT 0, early_daily_coef NUMERIC(18,8) NOT NULL DEFAULT 0,
  show_in_list BOOLEAN NOT NULL DEFAULT FALSE, send_reminders BOOLEAN NOT NULL DEFAULT FALSE, image_url TEXT NOT NULL DEFAULT '',
  labels JSONB NOT NULL DEFAULT '[]'::jsonb, full_description_html TEXT NOT NULL DEFAULT '', operational_costs JSONB NOT NULL DEFAULT '[]'::jsonb,
  legacy_source_table VARCHAR(120), legacy_id VARCHAR(160), legacy_payload JSONB NOT NULL DEFAULT '{}'::jsonb, needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS loan_products_legacy_source_id_uq ON loan_products(legacy_source_table,legacy_id) WHERE legacy_source_table IS NOT NULL AND legacy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS loan_products_public_idx ON loan_products(is_active,show_in_list,sort_order);
