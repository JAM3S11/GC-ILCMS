-- Report of Government Analyst (Narcotics). Once the Head of Narcotics has checked the Draft Report of
-- Analysis (Cannabis), they approve the final report from the Memo section. Approving stores the
-- Findings text and a snapshot of every printed value, so the locked report never changes when an
-- officer's profile or the draft is edited later.

-- How an officer is named on reports they sign: "Vivian Gacheri Mpekethu, MSc", "Government Analyst",
-- and the initials used in reference lines (blank initials fall back to those of the name).
ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification TEXT NOT NULL DEFAULT ''
  CHECK (LENGTH(qualification) <= 60);
ALTER TABLE users ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT ''
  CHECK (LENGTH(title) <= 80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS initials TEXT NOT NULL DEFAULT ''
  CHECK (initials ~ '^[A-Za-z]{0,6}$');

CREATE TABLE IF NOT EXISTS narcotics_analyst_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL UNIQUE REFERENCES narcotics_exhibit_intakes(id) ON DELETE RESTRICT,
  findings TEXT NOT NULL CHECK (LENGTH(BTRIM(findings)) BETWEEN 1 AND 3000),
  -- Every value printed on the report at the moment of approval.
  snapshot JSONB NOT NULL,
  approved_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
