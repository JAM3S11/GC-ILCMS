CREATE TABLE IF NOT EXISTS reception_activity_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role TEXT,
  recipient_department TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'urgent', 'success')),
  link_action TEXT NOT NULL CHECK (link_action IN ('RECEPTION_REGISTER', 'RECEPTION_LAB_BAY')),
  related_visit_id UUID REFERENCES reception_visits(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (recipient_role IS NOT NULL OR recipient_department IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS reception_activity_notifications_role_created_idx
  ON reception_activity_notifications (recipient_role, created_at DESC)
  WHERE recipient_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS reception_activity_notifications_department_created_idx
  ON reception_activity_notifications (recipient_department, created_at DESC)
  WHERE recipient_department IS NOT NULL;

CREATE TABLE IF NOT EXISTS reception_activity_notification_reads (
  notification_id UUID NOT NULL REFERENCES reception_activity_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS reception_activity_notification_reads_user_idx
  ON reception_activity_notification_reads (user_id, notification_id);
