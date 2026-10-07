-- Food & Drugs laboratory worksheet, filled in from the sample's case file after
-- the analytical sample receipt form. The analyst records when the analysis
-- started, the test methods and (optionally) the results, then submits it
-- ("Analysed by" + date); the Head of Section then checks it ("Checked by" + date).
-- Instrument attachments (GC-MS, UV-Vis charts) come in a later phase.
CREATE TABLE IF NOT EXISTS food_drug_worksheets (
  intake_id TEXT PRIMARY KEY REFERENCES food_drug_intakes(id) ON DELETE RESTRICT,
  analysis_started_on DATE NOT NULL,
  test_methods TEXT NOT NULL CHECK (LENGTH(BTRIM(test_methods)) BETWEEN 3 AND 2000),
  results TEXT CHECK (results IS NULL OR LENGTH(results) <= 10000),
  analysed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  analysed_at TIMESTAMPTZ,
  checked_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  checked_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Submitted (analysed) before it can be checked; both stamps come in pairs.
  CHECK ((analysed_by IS NULL) = (analysed_at IS NULL)),
  CHECK ((checked_by IS NULL) = (checked_at IS NULL)),
  CHECK (checked_at IS NULL OR analysed_at IS NOT NULL)
);
