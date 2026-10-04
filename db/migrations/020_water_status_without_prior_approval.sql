-- The Head now approves the intake documents at the memo stage, after the analysis (see 019), so the
-- status rule no longer requires approved_at / approved_by before assignment. It still requires the
-- assignment and completion fields to match each stage; approval may be recorded at any stage.
ALTER TABLE water_exhibit_intakes DROP CONSTRAINT IF EXISTS water_exhibit_intakes_check3;
ALTER TABLE water_exhibit_intakes DROP CONSTRAINT IF EXISTS water_exhibit_intakes_status_stage_check;

UPDATE water_exhibit_intakes
   SET status = 'Awaiting Assignment', updated_at = NOW()
 WHERE status = 'Awaiting Approval';

ALTER TABLE water_exhibit_intakes ADD CONSTRAINT water_exhibit_intakes_status_stage_check CHECK (
  ((approved_by IS NULL) = (approved_at IS NULL)) AND (
    (status = 'Awaiting Assignment'
      AND analysis_officer_id IS NULL AND assigned_by IS NULL AND assigned_at IS NULL
      AND completed_by IS NULL AND completed_at IS NULL)
    OR (status = 'Under Analysis'
      AND analysis_officer_id IS NOT NULL AND assigned_by IS NOT NULL AND assigned_at IS NOT NULL
      AND completed_by IS NULL AND completed_at IS NULL)
    OR (status = 'Analysis Complete'
      AND analysis_officer_id IS NOT NULL AND assigned_by IS NOT NULL AND assigned_at IS NOT NULL
      AND completed_by IS NOT NULL AND completed_at IS NOT NULL)
  )
);
