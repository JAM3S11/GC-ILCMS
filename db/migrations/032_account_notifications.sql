-- Staff are now told the outcome of their own department change request: the
-- Super Admin's decision is sent to the requester as a notification that opens
-- Settings (link action ACCOUNT_SETTINGS).
--
-- 024 holds the same list because scripts/migrate.js re-runs every file in
-- order; keep the two in step.
ALTER TABLE reception_activity_notifications
  DROP CONSTRAINT IF EXISTS reception_activity_notifications_link_action_check;
ALTER TABLE reception_activity_notifications
  ADD CONSTRAINT reception_activity_notifications_link_action_check
  CHECK (link_action IN ('RECEPTION_REGISTER', 'RECEPTION_LAB_BAY', 'RECEPTION_CHECK_OUT', 'WORK_ALLOCATION', 'ACCOUNT_SETTINGS'));
