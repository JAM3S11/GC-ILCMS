-- Narcotics exhibit intake. Lab references run per year as K0001/2026,
-- K0002/2026, ... To continue from an existing paper register, seed the year's
-- last used number, e.g. INSERT INTO narcotics_intake_sequences VALUES (2026, 2033);
CREATE TABLE IF NOT EXISTS narcotics_intake_sequences (
  intake_year INTEGER PRIMARY KEY,
  last_value INTEGER NOT NULL CHECK (last_value > 0)
);

CREATE TABLE IF NOT EXISTS narcotics_exhibit_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_reference TEXT NOT NULL UNIQUE,
  cr_number TEXT NOT NULL CHECK (LENGTH(BTRIM(cr_number)) BETWEEN 2 AND 100),
  reception_visit_id UUID NOT NULL REFERENCES reception_visits(id) ON DELETE RESTRICT,
  -- The submitting officer, copied from the reception record when registered.
  officer_name TEXT NOT NULL,
  badge_number TEXT NOT NULL,
  officer_mobile TEXT NOT NULL,
  police_station TEXT NOT NULL,
  -- Intake documents
  documents_received TEXT[] NOT NULL DEFAULT '{}',
  documents_confirmed_at TIMESTAMPTZ,
  documents_confirmed_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  -- Receipt
  receiving_officer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  registered_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  date_received DATE NOT NULL,
  time_received TIME NOT NULL,
  -- Sample description
  exhibit_type TEXT NOT NULL CHECK (LENGTH(BTRIM(exhibit_type)) BETWEEN 2 AND 100),
  number_of_items INTEGER NOT NULL CHECK (number_of_items BETWEEN 1 AND 10000),
  packaging TEXT NOT NULL CHECK (LENGTH(BTRIM(packaging)) BETWEEN 2 AND 200),
  seal_condition TEXT NOT NULL CHECK (seal_condition IN ('Intact & Sealed', 'Compromised', 'Damaged', 'Resealed')),
  seal_number TEXT,
  markings TEXT,
  declared_weight TEXT,
  colour_appearance TEXT,
  description TEXT NOT NULL CHECK (LENGTH(BTRIM(description)) BETWEEN 20 AND 4000),
  status TEXT NOT NULL DEFAULT 'Awaiting Assignment'
    CHECK (status IN ('Awaiting Assignment', 'Under Analysis', 'Analysis Complete')),
  analysis_officer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK ((documents_confirmed_at IS NULL) = (documents_confirmed_by IS NULL))
);

CREATE INDEX IF NOT EXISTS narcotics_exhibit_intakes_status_date_idx
  ON narcotics_exhibit_intakes (status, date_received DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS narcotics_exhibit_intakes_visit_idx
  ON narcotics_exhibit_intakes (reception_visit_id);
CREATE INDEX IF NOT EXISTS narcotics_exhibit_intakes_cr_idx
  ON narcotics_exhibit_intakes (cr_number);

CREATE TABLE IF NOT EXISTS narcotics_exhibit_intake_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  intake_id UUID NOT NULL REFERENCES narcotics_exhibit_intakes(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS narcotics_exhibit_intake_events_history_idx
  ON narcotics_exhibit_intake_events (intake_id, occurred_at, id);
