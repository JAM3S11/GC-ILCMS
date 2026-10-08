-- Laboratory worksheet as the paper form GCD/GL/01/LWG/FOODS/F11: lab sample no.,
-- the sub-sample list and analysis required (pre-filled from the receipt form but
-- editable), longer results, signatures, and attached charts (e.g. GC-MS).
ALTER TABLE food_drug_worksheets ADD COLUMN IF NOT EXISTS lab_sample_no TEXT
  CHECK (lab_sample_no IS NULL OR LENGTH(lab_sample_no) <= 60);
ALTER TABLE food_drug_worksheets ADD COLUMN IF NOT EXISTS sub_samples JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE food_drug_worksheets ADD COLUMN IF NOT EXISTS analysis_required TEXT
  CHECK (analysis_required IS NULL OR LENGTH(analysis_required) <= 2000);
ALTER TABLE food_drug_worksheets ADD COLUMN IF NOT EXISTS analyst_signature TEXT;
ALTER TABLE food_drug_worksheets ADD COLUMN IF NOT EXISTS checker_signature TEXT;

-- Results may hold long findings and computations.
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT con.conname FROM pg_constraint con
    WHERE con.conrelid = 'food_drug_worksheets'::regclass AND con.contype = 'c'
      AND (pg_get_constraintdef(con.oid) LIKE '%results%10000%' OR pg_get_constraintdef(con.oid) LIKE '%test_methods%2000%')
  LOOP
    EXECUTE format('ALTER TABLE food_drug_worksheets DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE food_drug_worksheets DROP CONSTRAINT IF EXISTS food_drug_worksheets_results_len;
ALTER TABLE food_drug_worksheets ADD CONSTRAINT food_drug_worksheets_results_len
  CHECK (results IS NULL OR LENGTH(results) <= 50000);
ALTER TABLE food_drug_worksheets DROP CONSTRAINT IF EXISTS food_drug_worksheets_methods_len;
ALTER TABLE food_drug_worksheets ADD CONSTRAINT food_drug_worksheets_methods_len
  CHECK (LENGTH(BTRIM(test_methods)) BETWEEN 3 AND 10000);

CREATE TABLE IF NOT EXISTS food_drug_worksheet_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id TEXT NOT NULL REFERENCES food_drug_worksheets(intake_id) ON DELETE CASCADE,
  caption TEXT NOT NULL DEFAULT '' CHECK (LENGTH(caption) <= 200),
  image TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS food_drug_worksheet_attachments_intake_idx
  ON food_drug_worksheet_attachments (intake_id, uploaded_at);
