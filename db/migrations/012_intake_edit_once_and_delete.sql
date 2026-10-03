-- Water & Environment exhibit intakes: a registered intake may be edited once
-- (before analysis starts), and the Head of Department can delete it. Deletion
-- is a soft delete so the custody history and audit trail stay intact.
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE water_exhibit_intake_events
  DROP CONSTRAINT IF EXISTS water_exhibit_intake_events_event_type_check;
ALTER TABLE water_exhibit_intake_events
  ADD CONSTRAINT water_exhibit_intake_events_event_type_check
  CHECK (event_type IN ('REGISTERED', 'APPROVED', 'ASSIGNED', 'ANALYSIS_COMPLETED', 'EDITED', 'DELETED'));

CREATE INDEX IF NOT EXISTS water_exhibit_intakes_active_idx
  ON water_exhibit_intakes (created_at DESC) WHERE deleted_at IS NULL;
