-- Password reset: self-service token flow plus admin-forced resets.
--
-- password_reset_tokens follows the account_invites pattern: a random token is
-- mailed to the user, only its SHA-256 hash is stored, and the row is marked
-- used_at once redeemed so the link cannot be replayed.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  -- Set when a super-admin initiated this instead of the user, so the audit
  -- trail can distinguish an admin-forced reset from a self-service one.
  forced_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id, expires_at DESC);