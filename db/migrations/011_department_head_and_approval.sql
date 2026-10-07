-- One Head of Department per department.
--
-- Reuses the existing HEAD_OF_DEPARTMENT role: a department may have exactly
-- one non-disabled head. Disabled accounts do not reserve the slot, so the
-- super-admin can replace a head by disabling the old one first.
CREATE UNIQUE INDEX IF NOT EXISTS users_one_head_per_department_idx
  ON users (department)
  WHERE role = 'HEAD_OF_DEPARTMENT' AND status <> 'DISABLED';

-- Water & Environment: registration now stops at an approval stage. The Head
-- of Water & Environment reviews the submitted documents before an Analysis
-- Officer can be assigned.
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE water_exhibit_intakes
  ALTER COLUMN status SET DEFAULT 'Awaiting Approval';

ALTER TABLE water_exhibit_intakes
  DROP CONSTRAINT IF EXISTS water_exhibit_intakes_status_check;
ALTER TABLE water_exhibit_intakes
  ADD CONSTRAINT water_exhibit_intakes_status_check
  CHECK (status IN ('Awaiting Approval', 'Awaiting Assignment', 'Under Analysis', 'Analysis Complete'));

-- scripts/migrate.js re-runs every file on each deploy. The steps below were
-- superseded by later migrations, so they only run on a database that has not
-- reached those migrations yet; re-running them on a newer schema would undo
-- the newer rules or fail on rows the newer rules allow.
DO $$
BEGIN
  -- Superseded by 019/020: approval moved to the memo stage and the stage rule
  -- became water_exhibit_intakes_status_stage_check. Back-filling approved_by
  -- here would mark exhibits as approved that the Head never approved.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'water_exhibit_intakes_status_stage_check'
  ) THEN
    -- Bring any rows created under the old flow up to the new invariant before
    -- the tightened CHECK constraint is applied.
    UPDATE water_exhibit_intakes
    SET approved_by = COALESCE(approved_by, registered_by),
        approved_at = COALESCE(approved_at, created_at)
    WHERE status <> 'Awaiting Approval' AND approved_by IS NULL;

    ALTER TABLE water_exhibit_intakes
      DROP CONSTRAINT IF EXISTS water_exhibit_intakes_check3;
    ALTER TABLE water_exhibit_intakes
      ADD CONSTRAINT water_exhibit_intakes_check3 CHECK (
        (status = 'Awaiting Approval' AND approved_by IS NULL AND approved_at IS NULL
          AND analysis_officer_id IS NULL AND assigned_by IS NULL AND assigned_at IS NULL
          AND completed_by IS NULL AND completed_at IS NULL)
        OR
        (status = 'Awaiting Assignment' AND approved_by IS NOT NULL AND approved_at IS NOT NULL
          AND analysis_officer_id IS NULL AND assigned_by IS NULL AND assigned_at IS NULL
          AND completed_by IS NULL AND completed_at IS NULL)
        OR
        (status = 'Under Analysis' AND approved_by IS NOT NULL AND approved_at IS NOT NULL
          AND analysis_officer_id IS NOT NULL AND assigned_by IS NOT NULL AND assigned_at IS NOT NULL
          AND completed_by IS NULL AND completed_at IS NULL)
        OR
        (status = 'Analysis Complete' AND approved_by IS NOT NULL AND approved_at IS NOT NULL
          AND analysis_officer_id IS NOT NULL AND assigned_by IS NOT NULL AND assigned_at IS NOT NULL
          AND completed_by IS NOT NULL AND completed_at IS NOT NULL)
      );
  END IF;

  -- Superseded by 014: event types are allowed by the water_intake_event_types
  -- lookup table instead of this list.
  IF to_regclass('public.water_intake_event_types') IS NULL THEN
    ALTER TABLE water_exhibit_intake_events
      DROP CONSTRAINT IF EXISTS water_exhibit_intake_events_event_type_check;
    ALTER TABLE water_exhibit_intake_events
      ADD CONSTRAINT water_exhibit_intake_events_event_type_check
      CHECK (event_type IN ('REGISTERED', 'APPROVED', 'ASSIGNED', 'ANALYSIS_COMPLETED'));
  END IF;
END $$;

ALTER TABLE water_exhibit_intake_events
  DROP CONSTRAINT IF EXISTS water_exhibit_intake_events_from_status_check;
ALTER TABLE water_exhibit_intake_events
  ADD CONSTRAINT water_exhibit_intake_events_from_status_check
  CHECK (from_status IS NULL OR from_status IN ('Awaiting Approval', 'Awaiting Assignment', 'Under Analysis', 'Analysis Complete'));

ALTER TABLE water_exhibit_intake_events
  DROP CONSTRAINT IF EXISTS water_exhibit_intake_events_to_status_check;
ALTER TABLE water_exhibit_intake_events
  ADD CONSTRAINT water_exhibit_intake_events_to_status_check
  CHECK (to_status IN ('Awaiting Approval', 'Awaiting Assignment', 'Under Analysis', 'Analysis Complete'));

CREATE INDEX IF NOT EXISTS water_exhibit_intakes_approved_idx
  ON water_exhibit_intakes (approved_at DESC) WHERE approved_at IS NOT NULL;
