-- Draft Report of Analysis (Cannabis): one per Narcotics exhibit, filled in by the
-- Analysis Officer under Findings. The officer signs and submits it; the Head of
-- Narcotics signs "Checked by", which approves and locks it. Only a Super Admin can
-- unlock it. The memo cannot be approved while an exhibit's draft report is unapproved.
CREATE TABLE IF NOT EXISTS narcotics_draft_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL UNIQUE REFERENCES narcotics_exhibit_intakes(id) ON DELETE RESTRICT,
  sample_k_no TEXT NOT NULL CHECK (LENGTH(BTRIM(sample_k_no)) BETWEEN 1 AND 60),
  date_received DATE,
  submitted_by TEXT NOT NULL DEFAULT '' CHECK (LENGTH(submitted_by) <= 300),
  date_analysed DATE,
  envelope_marked TEXT NOT NULL DEFAULT '' CHECK (LENGTH(envelope_marked) <= 300),
  police_station TEXT NOT NULL DEFAULT '' CHECK (LENGTH(police_station) <= 200),
  cr_number TEXT NOT NULL DEFAULT '' CHECK (LENGTH(cr_number) <= 100),
  accused TEXT NOT NULL DEFAULT '' CHECK (LENGTH(accused) <= 2000),
  containing TEXT NOT NULL DEFAULT '' CHECK (LENGTH(containing) <= 2000),
  -- { testKey: result text } for the nine rows of the results table.
  results JSONB NOT NULL DEFAULT '{}'::JSONB,
  quantity TEXT NOT NULL DEFAULT '' CHECK (LENGTH(quantity) <= 300),
  gck_no TEXT NOT NULL DEFAULT '' CHECK (LENGTH(gck_no) <= 100),
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
  CHECK ((analysed_by IS NULL) = (analysed_at IS NULL)),
  CHECK ((checked_by IS NULL) = (checked_at IS NULL)),
  CHECK (
    (status = 'DRAFT' AND analysed_at IS NULL AND checked_at IS NULL)
    OR (status = 'SUBMITTED' AND analysed_at IS NOT NULL AND checked_at IS NULL)
    OR (status = 'APPROVED' AND analysed_at IS NOT NULL AND checked_at IS NOT NULL)
  )
);
