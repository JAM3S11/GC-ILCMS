-- Issued Certificates of Analysis of Water. When the Head approves the memo, the server freezes
-- everything printed on the certificate (the snapshot), hashes it with SHA-256 and signs the hash with
-- the server's Ed25519 key. The paper carries a QR code and serial pointing to a public verify page that
-- shows this stored original, so an altered or forged paper copy shows up as a mismatch.
-- Issued rows are never edited, except to mark them superseded or revoked; a correction is a new version.

CREATE TABLE IF NOT EXISTS certificate_signing_keys (
  key_id TEXT PRIMARY KEY,
  algorithm TEXT NOT NULL DEFAULT 'Ed25519' CHECK (algorithm = 'Ed25519'),
  public_key_pem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS water_certificate_serial_seq;

CREATE TABLE IF NOT EXISTS water_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES water_exhibit_intakes(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version >= 1),
  serial TEXT NOT NULL UNIQUE,
  -- Random and unguessable; it is the only thing the QR code and the verify page address.
  verification_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  snapshot JSONB NOT NULL,
  snapshot_hash TEXT NOT NULL CHECK (snapshot_hash ~ '^[0-9a-f]{64}$'),
  -- Hash of the printed content alone (no serial or dates), to tell when the results have changed since issue.
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  signature TEXT NOT NULL,
  key_id TEXT NOT NULL REFERENCES certificate_signing_keys(key_id) ON DELETE RESTRICT,
  issued_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'CURRENT' CHECK (status IN ('CURRENT', 'SUPERSEDED', 'REVOKED')),
  superseded_by UUID REFERENCES water_certificates(id) ON DELETE RESTRICT,
  superseded_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT CHECK (revoke_reason IS NULL OR LENGTH(BTRIM(revoke_reason)) BETWEEN 3 AND 500),
  reissue_reason TEXT CHECK (reissue_reason IS NULL OR LENGTH(BTRIM(reissue_reason)) BETWEEN 3 AND 500),
  print_count INTEGER NOT NULL DEFAULT 0 CHECK (print_count >= 0),
  last_printed_at TIMESTAMPTZ,
  UNIQUE (intake_id, version),
  CHECK (
    (status = 'CURRENT' AND superseded_by IS NULL AND revoked_at IS NULL)
    OR (status = 'SUPERSEDED' AND superseded_at IS NOT NULL AND revoked_at IS NULL)
    OR (status = 'REVOKED' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND revoke_reason IS NOT NULL)
  )
);

-- At most one current certificate per exhibit.
CREATE UNIQUE INDEX IF NOT EXISTS water_certificates_one_current_idx
  ON water_certificates (intake_id) WHERE status = 'CURRENT';
CREATE INDEX IF NOT EXISTS water_certificates_intake_idx ON water_certificates (intake_id, version DESC);

-- Every check on the public verify page, found or not.
CREATE TABLE IF NOT EXISTS certificate_verifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  certificate_id UUID REFERENCES water_certificates(id) ON DELETE RESTRICT,
  lookup TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('CURRENT', 'SUPERSEDED', 'REVOKED', 'NOT_FOUND', 'INVALID_SIGNATURE')),
  ip_address TEXT,
  user_agent TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS certificate_verifications_checked_idx ON certificate_verifications (checked_at DESC);

INSERT INTO water_intake_event_types (event_type) VALUES ('CERTIFICATE_REISSUED'), ('CERTIFICATE_REVOKED')
ON CONFLICT (event_type) DO NOTHING;
