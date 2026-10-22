-- The owner's super-admin account stays a super-admin in General Administration for good, however
-- many other super-admins are added later. Its role, department and ACTIVE status cannot change, it
-- cannot be deleted, and no other administrator can force a password reset on it. The API refuses
-- these with a clear message first; the triggers below make the rule hold for every code path.
-- Lifting it takes a database owner disabling the trigger by hand - the app itself never can.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT FALSE;

-- Marked by email once; from then on the flag follows the row, so changing the email keeps it.
UPDATE users SET is_protected = TRUE
  WHERE lower(email) = 'jdndirangu2020@gmail.com' AND NOT is_protected;

CREATE OR REPLACE FUNCTION protect_owner_account() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT OLD.is_protected THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'The protected owner account cannot be deleted.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT NEW.is_protected OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.department IS DISTINCT FROM OLD.department
     OR (OLD.status = 'ACTIVE' AND NEW.status <> 'ACTIVE') THEN
    RAISE EXCEPTION 'The protected owner account''s role, department and status cannot be changed.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS users_protect_owner_account ON users;
CREATE TRIGGER users_protect_owner_account
  BEFORE UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION protect_owner_account();

-- Self-service resets carry no forced_by, so the owner can still use Forgot password.
CREATE OR REPLACE FUNCTION protect_owner_password_reset() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.forced_by IS NOT NULL AND NEW.forced_by <> NEW.user_id
     AND EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND is_protected) THEN
    RAISE EXCEPTION 'Another administrator cannot reset the protected owner account''s password.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS password_reset_tokens_protect_owner ON password_reset_tokens;
CREATE TRIGGER password_reset_tokens_protect_owner
  BEFORE INSERT ON password_reset_tokens
  FOR EACH ROW EXECUTE FUNCTION protect_owner_password_reset();
