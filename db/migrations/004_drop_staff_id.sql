-- Drop staff_id columns and related indexes/constraints
-- Safe to run after 001-003; idempotent

-- USERS
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_staff_id_key;

DROP INDEX IF EXISTS users_staff_id_lower_idx;

ALTER TABLE users
  DROP COLUMN IF EXISTS staff_id;

-- ACCOUNT REQUESTS
DROP INDEX IF EXISTS account_requests_pending_staff_id_idx;

ALTER TABLE account_requests
  DROP COLUMN IF EXISTS staff_id;
