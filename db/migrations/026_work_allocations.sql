-- Work allocation forms. Before the Head of Department assigns an exhibit or
-- sample, they fill in a work allocation form: lab reference, instructions on
-- what to analyse, the analyst receiving it, and their own name and the date
-- (both filled automatically). The stored row is the Head's original; the
-- analyst receives a copy with the task. A transfer issues a new form and marks
-- the earlier one superseded, so the history stays complete.
CREATE SEQUENCE IF NOT EXISTS work_allocation_number_seq;

CREATE TABLE IF NOT EXISTS work_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_number TEXT NOT NULL UNIQUE DEFAULT (
    'WAF-' || TO_CHAR(NOW() AT TIME ZONE 'Africa/Nairobi', 'YYYY') || '-' ||
    LPAD(NEXTVAL('work_allocation_number_seq')::TEXT, 5, '0')
  ),
  department TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('WATER_INTAKE', 'FOOD_DRUG_INTAKE')),
  record_id TEXT NOT NULL,
  lab_reference TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  remarks TEXT NOT NULL CHECK (LENGTH(BTRIM(remarks)) BETWEEN 20 AND 2000),
  analyst_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  allocated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS work_allocations_record_idx
  ON work_allocations (record_type, record_id, allocated_at DESC);
CREATE INDEX IF NOT EXISTS work_allocations_analyst_idx
  ON work_allocations (analyst_id, allocated_at DESC);

-- Notifications can now go to one person (the analyst receiving the copy).
ALTER TABLE reception_activity_notifications
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reception_activity_notifications
  DROP CONSTRAINT IF EXISTS reception_activity_notifications_check;
ALTER TABLE reception_activity_notifications
  ADD CONSTRAINT reception_activity_notifications_check
  CHECK (recipient_role IS NOT NULL OR recipient_department IS NOT NULL OR recipient_user_id IS NOT NULL);
-- related_visit_id is optional for these notifications; the allocation is linked by record.
ALTER TABLE reception_activity_notifications
  ADD COLUMN IF NOT EXISTS related_record_type TEXT;
ALTER TABLE reception_activity_notifications
  ADD COLUMN IF NOT EXISTS related_record_id TEXT;

CREATE INDEX IF NOT EXISTS reception_activity_notifications_user_idx
  ON reception_activity_notifications (recipient_user_id, created_at DESC)
  WHERE recipient_user_id IS NOT NULL;
