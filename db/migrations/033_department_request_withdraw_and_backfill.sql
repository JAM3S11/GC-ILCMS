-- 1. Staff can withdraw their own pending department change request.
ALTER TABLE department_change_requests
  DROP CONSTRAINT IF EXISTS department_change_requests_status_check;
ALTER TABLE department_change_requests
  ADD CONSTRAINT department_change_requests_status_check
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'));

-- 2. Requests decided before requesters were notified (032) get their decision
-- notification now, dated when the decision was made. Safe to re-run: a request
-- that already has a notification is skipped.
INSERT INTO reception_activity_notifications (
  recipient_user_id, title, message, type, link_action,
  related_record_type, related_record_id, created_at
)
SELECT
  r.user_id,
  CASE WHEN r.status = 'APPROVED' THEN 'Department change approved' ELSE 'Department change not approved' END,
  CASE WHEN r.status = 'APPROVED'
    THEN 'Your move from ' || r.current_department || ' to ' || r.requested_department || ' was approved. You now work in ' || r.requested_department || '.'
    ELSE 'Your request to move from ' || r.current_department || ' to ' || r.requested_department || ' was not approved. You remain in ' || COALESCE(u.department, r.current_department) || '.'
  END,
  CASE WHEN r.status = 'APPROVED' THEN 'success' ELSE 'info' END,
  'ACCOUNT_SETTINGS',
  'department_change_request',
  r.id::text,
  COALESCE(r.decision_at, r.created_at)
FROM department_change_requests r
JOIN users u ON u.id = r.user_id
WHERE r.status IN ('APPROVED', 'REJECTED')
  AND NOT EXISTS (
    SELECT 1 FROM reception_activity_notifications n
    WHERE n.related_record_type = 'department_change_request'
      AND n.related_record_id = r.id::text
  );
