CREATE TABLE IF NOT EXISTS water_intake_sequences (
  intake_year INTEGER PRIMARY KEY,
  last_value INTEGER NOT NULL CHECK (last_value > 0)
);

CREATE TABLE IF NOT EXISTS water_exhibit_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibit_number TEXT NOT NULL UNIQUE,
  seal_number TEXT NOT NULL UNIQUE,
  packaging TEXT NOT NULL DEFAULT 'Sealed Water Sampling Bottle',
  condition TEXT NOT NULL DEFAULT 'Intact & Sealed',
  storage_location TEXT NOT NULL DEFAULT 'Water & Environment Sample Store — Cold Room W-01',
  lab_reference TEXT NOT NULL UNIQUE,
  reception_visit_id UUID NOT NULL REFERENCES reception_visits(id) ON DELETE RESTRICT,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('Individual', 'Organisation')),
  sender_name TEXT NOT NULL CHECK (LENGTH(BTRIM(sender_name)) BETWEEN 2 AND 200),
  sender_address TEXT NOT NULL CHECK (LENGTH(BTRIM(sender_address)) BETWEEN 2 AND 300),
  sender_mobile TEXT,
  contact_person TEXT,
  contact_person_mobile TEXT,
  receiving_officer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  registered_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  date_received DATE NOT NULL,
  supporting_documents TEXT NOT NULL DEFAULT '',
  remarks TEXT NOT NULL DEFAULT '',
  test_type TEXT NOT NULL CHECK (test_type IN ('Full Chemical Analysis', 'Specific Chemical Analysis')),
  specific_parameters TEXT[] NOT NULL DEFAULT '{}',
  source_category TEXT NOT NULL CHECK (source_category IN ('Potable Water', 'Effluent Water')),
  source_type TEXT NOT NULL CHECK (LENGTH(BTRIM(source_type)) BETWEEN 2 AND 100),
  location_from TEXT NOT NULL CHECK (LENGTH(BTRIM(location_from)) BETWEEN 2 AND 300),
  discharge_to TEXT CHECK (discharge_to IS NULL OR discharge_to IN ('Public Sewer', 'Environment')),
  charges INTEGER NOT NULL CHECK (charges > 0),
  receipt_number TEXT,
  status TEXT NOT NULL DEFAULT 'Awaiting Assignment'
    CHECK (status IN ('Awaiting Assignment', 'Under Analysis', 'Analysis Complete')),
  analysis_officer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (sender_type = 'Individual' AND sender_mobile IS NOT NULL AND contact_person IS NULL AND contact_person_mobile IS NULL)
    OR
    (sender_type = 'Organisation' AND sender_mobile IS NULL AND contact_person IS NOT NULL)
  ),
  CHECK (
    (source_category = 'Effluent Water' AND discharge_to IS NOT NULL)
    OR
    (source_category = 'Potable Water' AND discharge_to IS NULL)
  ),
  CHECK (
    (test_type = 'Specific Chemical Analysis' AND CARDINALITY(specific_parameters) > 0)
    OR
    (test_type = 'Full Chemical Analysis' AND CARDINALITY(specific_parameters) = 0)
  ),
  CHECK (
    (status = 'Awaiting Assignment' AND analysis_officer_id IS NULL AND assigned_by IS NULL AND assigned_at IS NULL AND completed_by IS NULL AND completed_at IS NULL)
    OR
    (status = 'Under Analysis' AND analysis_officer_id IS NOT NULL AND assigned_by IS NOT NULL AND assigned_at IS NOT NULL AND completed_by IS NULL AND completed_at IS NULL)
    OR
    (status = 'Analysis Complete' AND analysis_officer_id IS NOT NULL AND assigned_by IS NOT NULL AND assigned_at IS NOT NULL AND completed_by IS NOT NULL AND completed_at IS NOT NULL)
  )
);

ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS seal_number TEXT NOT NULL
    DEFAULT ('WE-SEAL-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 10)));
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS packaging TEXT NOT NULL DEFAULT 'Sealed Water Sampling Bottle';
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT 'Intact & Sealed';
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS storage_location TEXT NOT NULL DEFAULT 'Water & Environment Sample Store — Cold Room W-01';
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS supporting_documents TEXT NOT NULL DEFAULT '';
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS remarks TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS water_exhibit_intakes_status_date_idx
  ON water_exhibit_intakes (status, date_received DESC, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS water_exhibit_intakes_seal_number_uidx
  ON water_exhibit_intakes (seal_number);
CREATE INDEX IF NOT EXISTS water_exhibit_intakes_assignee_status_idx
  ON water_exhibit_intakes (analysis_officer_id, status, date_received DESC);
CREATE INDEX IF NOT EXISTS water_exhibit_intakes_visit_idx
  ON water_exhibit_intakes (reception_visit_id);

CREATE TABLE IF NOT EXISTS water_exhibit_intake_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  intake_id UUID NOT NULL REFERENCES water_exhibit_intakes(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('REGISTERED', 'ASSIGNED', 'ANALYSIS_COMPLETED')),
  from_status TEXT CHECK (from_status IS NULL OR from_status IN ('Awaiting Assignment', 'Under Analysis', 'Analysis Complete')),
  to_status TEXT NOT NULL CHECK (to_status IN ('Awaiting Assignment', 'Under Analysis', 'Analysis Complete')),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS water_exhibit_intake_events_history_idx
  ON water_exhibit_intake_events (intake_id, occurred_at, id);
