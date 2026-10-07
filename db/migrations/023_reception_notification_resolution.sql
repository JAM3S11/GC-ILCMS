-- A lab notification about a visitor is resolved for the whole destination
-- department once anyone there registers that visitor's exhibit intake. Read
-- state stays per user in reception_activity_notification_reads; a resolved
-- notification simply counts as read for everyone it was addressed to, and it
-- stops reception from resending.
ALTER TABLE reception_activity_notifications
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE reception_activity_notifications
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE reception_activity_notifications
  ADD COLUMN IF NOT EXISTS resolution TEXT;

CREATE INDEX IF NOT EXISTS reception_activity_notifications_open_lab_idx
  ON reception_activity_notifications (related_visit_id)
  WHERE link_action = 'RECEPTION_LAB_BAY' AND resolved_at IS NULL;
