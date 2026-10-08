-- Certificate of Analysis – Draft Report (GCD/GL/01/LWG/FOODS/F12): one per sub
-- sample, prepared by the analyst once the Head has checked the laboratory
-- worksheet. The analyst signs it ("Analysed by"); the Head of Department signs it
-- ("Checked by"), which approves and locks it. Only a Super Admin can unlock it.
CREATE TABLE IF NOT EXISTS food_drug_draft_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id TEXT NOT NULL REFERENCES food_drug_intakes(id) ON DELETE RESTRICT,
  lab_sample_no TEXT NOT NULL CHECK (LENGTH(BTRIM(lab_sample_no)) BETWEEN 1 AND 60),
  senders_ref TEXT CHECK (senders_ref IS NULL OR LENGTH(senders_ref) <= 100),
  sender_contacts TEXT NOT NULL CHECK (LENGTH(BTRIM(sender_contacts)) BETWEEN 2 AND 600),
  date_received DATE NOT NULL,
  analysis_started_on DATE NOT NULL,
  sample_description TEXT NOT NULL CHECK (LENGTH(BTRIM(sample_description)) BETWEEN 2 AND 2000),
  analysis_required TEXT NOT NULL CHECK (LENGTH(BTRIM(analysis_required)) BETWEEN 2 AND 2000),
  test_methods TEXT NOT NULL CHECK (LENGTH(BTRIM(test_methods)) BETWEEN 2 AND 10000),
  analytical_report TEXT NOT NULL DEFAULT '' CHECK (LENGTH(analytical_report) <= 50000),
  remarks TEXT CHECK (remarks IS NULL OR LENGTH(remarks) <= 2000),
  copy_type TEXT NOT NULL DEFAULT 'ORIGINAL' CHECK (copy_type IN ('ORIGINAL', 'DUPLICATE')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED')),
  analyst_signature TEXT,
  analysed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  analysed_at TIMESTAMPTZ,
  checker_signature TEXT,
  checked_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  checked_at TIMESTAMPTZ,
  unlocked_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  unlocked_at TIMESTAMPTZ,
  unlock_reason TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (intake_id, lab_sample_no),
  CHECK ((analysed_by IS NULL) = (analysed_at IS NULL)),
  CHECK ((checked_by IS NULL) = (checked_at IS NULL)),
  CHECK (
    (status = 'DRAFT' AND analysed_at IS NULL AND checked_at IS NULL)
    OR (status = 'SUBMITTED' AND analysed_at IS NOT NULL AND checked_at IS NULL)
    OR (status = 'APPROVED' AND analysed_at IS NOT NULL AND checked_at IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS food_drug_draft_reports_intake_idx ON food_drug_draft_reports (intake_id, created_at);
