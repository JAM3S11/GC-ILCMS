-- Reception notifications can now open the Check Out page directly: the lab
-- sends "exhibit intake complete — ready for checkout" once it has registered a
-- visitor's exhibit intake, so reception can release the visitor.
--
-- The allowed list also includes WORK_ALLOCATION (the analyst's copy of a work
-- allocation form, added in 026) and ACCOUNT_SETTINGS (decisions on a user's own
-- department change request, added in 032). scripts/migrate.js re-runs every file, so this
-- list must contain every link action in use or a re-run would fail on old rows.
ALTER TABLE reception_activity_notifications
  DROP CONSTRAINT IF EXISTS reception_activity_notifications_link_action_check;
ALTER TABLE reception_activity_notifications
  ADD CONSTRAINT reception_activity_notifications_link_action_check
  CHECK (link_action IN ('RECEPTION_REGISTER', 'RECEPTION_LAB_BAY', 'RECEPTION_CHECK_OUT', 'WORK_ALLOCATION', 'ACCOUNT_SETTINGS'));
