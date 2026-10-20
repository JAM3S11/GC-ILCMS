-- The super-admin's Members list shows when each officer last signed in, read from the
-- USER_LOGIN audit events. This index keeps that lookup quick as the audit log grows.
CREATE INDEX IF NOT EXISTS audit_log_user_login_idx
  ON audit_log (actor_user_id, created_at DESC)
  WHERE action = 'USER_LOGIN';
