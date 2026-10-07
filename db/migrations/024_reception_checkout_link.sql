-- Reception notifications can now open the Check Out page directly: the lab
-- sends "exhibit intake complete — ready for checkout" once it has registered a
-- visitor's exhibit intake, so reception can release the visitor.
ALTER TABLE reception_activity_notifications
  DROP CONSTRAINT IF EXISTS reception_activity_notifications_link_action_check;
ALTER TABLE reception_activity_notifications
  ADD CONSTRAINT reception_activity_notifications_link_action_check
  CHECK (link_action IN ('RECEPTION_REGISTER', 'RECEPTION_LAB_BAY', 'RECEPTION_CHECK_OUT'));
