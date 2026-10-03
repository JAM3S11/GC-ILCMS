CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'urgent', 'success')),
  link_action TEXT NOT NULL CHECK (link_action IN ('ADMIN_REQUESTS', 'ADMIN_DEPARTMENT_REQUESTS', 'ADMIN_USERS')),
  record_type TEXT,
  record_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_notifications_created_idx
  ON admin_notifications (created_at DESC);

CREATE TABLE IF NOT EXISTS admin_notification_reads (
  notification_id UUID NOT NULL REFERENCES admin_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ,
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS department_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_department TEXT NOT NULL,
  requested_department TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  decision_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (current_department <> requested_department)
);

CREATE UNIQUE INDEX IF NOT EXISTS department_change_requests_pending_user_idx
  ON department_change_requests (user_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS department_change_requests_pending_idx
  ON department_change_requests (created_at DESC) WHERE status = 'PENDING';
