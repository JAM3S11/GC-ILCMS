-- The Narcotics process after intake, mirroring Water & Environment: the Head
-- assigns an Analysis Officer with a work allocation form, the officer records
-- the findings (which completes the analysis), and the Head approves the intake
-- documents and the memo. Intakes can be edited before analysis and deleted
-- (soft) by the Head.
ALTER TABLE narcotics_exhibit_intakes
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tests_performed TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS substance_identified TEXT,
  ADD COLUMN IF NOT EXISTS net_weight TEXT,
  ADD COLUMN IF NOT EXISTS findings TEXT,
  ADD COLUMN IF NOT EXISTS findings_recorded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS findings_recorded_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS memo_approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS memo_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS narcotics_exhibit_intakes_assignee_status_idx
  ON narcotics_exhibit_intakes (analysis_officer_id, status, date_received DESC);

-- Work allocation forms now cover Narcotics exhibits too.
ALTER TABLE work_allocations DROP CONSTRAINT IF EXISTS work_allocations_record_type_check;
ALTER TABLE work_allocations
  ADD CONSTRAINT work_allocations_record_type_check
  CHECK (record_type IN ('WATER_INTAKE', 'FOOD_DRUG_INTAKE', 'NARCOTICS_INTAKE'));
