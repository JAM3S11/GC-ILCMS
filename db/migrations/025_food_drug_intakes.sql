-- Food & Drugs sample intakes, stored in the database like the Water register so
-- the Food & Drugs dashboard, register and stat cards show live records instead
-- of browser-only demo data.
CREATE TABLE IF NOT EXISTS food_drug_intake_sequences (
  intake_year INTEGER PRIMARY KEY,
  last_value INTEGER NOT NULL CHECK (last_value > 0)
);

CREATE TABLE IF NOT EXISTS food_drug_intakes (
  -- Human-readable sample number, e.g. FDI-2026-001, used in every view and URL.
  id TEXT PRIMARY KEY,
  exhibit_number TEXT NOT NULL UNIQUE,
  seal_number TEXT NOT NULL UNIQUE,
  reception_visit_id UUID NOT NULL REFERENCES reception_visits(id) ON DELETE RESTRICT,
  client_name TEXT NOT NULL CHECK (LENGTH(BTRIM(client_name)) BETWEEN 2 AND 150),
  national_id TEXT NOT NULL CHECK (LENGTH(BTRIM(national_id)) BETWEEN 2 AND 100),
  po_box TEXT NOT NULL CHECK (LENGTH(BTRIM(po_box)) BETWEEN 3 AND 100),
  sample_type TEXT NOT NULL CHECK (sample_type IN ('Aflatoxin', 'Miscellaneous', 'Mycotoxins')),
  notes TEXT NOT NULL DEFAULT '' CHECK (LENGTH(notes) <= 2000),
  receiver TEXT NOT NULL CHECK (LENGTH(BTRIM(receiver)) BETWEEN 2 AND 150),
  registered_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  intake_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Africa/Nairobi')::date),
  status TEXT NOT NULL DEFAULT 'Awaiting Approval'
    CHECK (status IN ('Awaiting Approval', 'Awaiting Assignment', 'Under Analysis', 'Reported')),
  approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  analyst_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ,
  reported_by TEXT,
  reported_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  edited_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'Awaiting Approval' AND analyst_id IS NULL AND reported_at IS NULL)
    OR (status = 'Awaiting Assignment' AND approved_at IS NOT NULL AND analyst_id IS NULL AND reported_at IS NULL)
    OR (status = 'Under Analysis' AND analyst_id IS NOT NULL AND assigned_at IS NOT NULL AND reported_at IS NULL)
    OR (status = 'Reported' AND analyst_id IS NOT NULL AND reported_at IS NOT NULL AND reported_by IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS food_drug_intakes_live_created_idx
  ON food_drug_intakes (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS food_drug_intakes_analyst_status_idx
  ON food_drug_intakes (analyst_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS food_drug_intakes_visit_idx
  ON food_drug_intakes (reception_visit_id);
