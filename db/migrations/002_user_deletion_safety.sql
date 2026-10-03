-- Let a super-admin delete an account without destroying the history that
-- references it. Every column below keeps its row; only the user pointer is
-- cleared. audit_log.actor_email and account_requests are NOT NULL text, so
-- the audit trail still shows who did what after the account is gone.
--
-- account_invites.user_id and auth_sessions.user_id already ON DELETE CASCADE:
-- deleting an account must invalidate its live sessions and pending invites.

ALTER TABLE account_invites DROP CONSTRAINT IF EXISTS account_invites_created_by_fkey;
ALTER TABLE account_invites ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE account_invites ADD CONSTRAINT account_invites_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE account_requests DROP CONSTRAINT IF EXISTS account_requests_decision_by_fkey;
ALTER TABLE account_requests ADD CONSTRAINT account_requests_decision_by_fkey
  FOREIGN KEY (decision_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE account_requests DROP CONSTRAINT IF EXISTS account_requests_user_id_fkey;
ALTER TABLE account_requests ADD CONSTRAINT account_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_user_id_fkey;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL;