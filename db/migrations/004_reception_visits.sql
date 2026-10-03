CREATE SEQUENCE IF NOT EXISTS reception_visit_number_seq;

CREATE TABLE IF NOT EXISTS reception_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_number TEXT NOT NULL UNIQUE DEFAULT (
    'VIS-' ||
    TO_CHAR(NOW() AT TIME ZONE 'Africa/Nairobi', 'YYYY') ||
    '-' ||
    LPAD(NEXTVAL('reception_visit_number_seq')::TEXT, 6, '0')
  ),
  visitor_type TEXT NOT NULL CHECK (visitor_type IN ('POLICE_OFFICER', 'GENERAL_CLIENT')),
  visitor_name TEXT NOT NULL CHECK (LENGTH(BTRIM(visitor_name)) BETWEEN 2 AND 150),
  national_id TEXT NOT NULL CHECK (LENGTH(BTRIM(national_id)) BETWEEN 2 AND 100),
  phone TEXT NOT NULL CHECK (LENGTH(BTRIM(phone)) BETWEEN 7 AND 30),
  badge_number TEXT,
  station_or_organization TEXT NOT NULL CHECK (LENGTH(BTRIM(station_or_organization)) BETWEEN 2 AND 200),
  vehicle_registration TEXT,
  postal_address TEXT,
  destination_department TEXT NOT NULL CHECK (destination_department IN (
    'Narcotics', 'Food & Drugs', 'Criminalistic', 'DNA',
    'Instruments', 'Water', 'Toxicology', 'Procurement'
  )),
  purpose_of_visit TEXT NOT NULL CHECK (LENGTH(BTRIM(purpose_of_visit)) BETWEEN 2 AND 500),
  documents_presented TEXT NOT NULL DEFAULT '',
  exhibits_summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'AWAITING_LAB_RECEPTION'
    CHECK (status IN ('AWAITING_LAB_RECEPTION', 'IN_LABORATORY', 'COMPLETED', 'DEPARTED')),
  arrived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  departed_at TIMESTAMPTZ,
  registered_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  checked_out_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (visitor_type = 'POLICE_OFFICER' AND LENGTH(BTRIM(COALESCE(badge_number, ''))) >= 7)
    OR
    (visitor_type = 'GENERAL_CLIENT' AND LENGTH(BTRIM(COALESCE(vehicle_registration, ''))) >= 2)
  ),
  CHECK (destination_department <> 'Food & Drugs' OR LENGTH(BTRIM(COALESCE(postal_address, ''))) >= 3),
  CHECK (
    (status = 'DEPARTED' AND departed_at IS NOT NULL AND checked_out_by IS NOT NULL)
    OR
    (status <> 'DEPARTED' AND departed_at IS NULL AND checked_out_by IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS reception_visits_arrived_idx
  ON reception_visits (arrived_at DESC);
CREATE INDEX IF NOT EXISTS reception_visits_department_status_arrived_idx
  ON reception_visits (destination_department, status, arrived_at DESC);
CREATE INDEX IF NOT EXISTS reception_visits_active_arrived_idx
  ON reception_visits (arrived_at DESC)
  WHERE status <> 'DEPARTED';

CREATE TABLE IF NOT EXISTS reception_visit_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES reception_visits(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'REGISTERED', 'LAB_QUEUE_UPDATED', 'NATIONAL_ID_REVEALED', 'LAB_RECEIVED',
    'SERVICE_COMPLETED', 'CHECKED_OUT'
  )),
  from_status TEXT CHECK (
    from_status IS NULL OR from_status IN ('AWAITING_LAB_RECEPTION', 'IN_LABORATORY', 'COMPLETED', 'DEPARTED')
  ),
  to_status TEXT CHECK (
    to_status IS NULL OR to_status IN ('AWAITING_LAB_RECEPTION', 'IN_LABORATORY', 'COMPLETED', 'DEPARTED')
  ),
  actor_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS reception_visit_events_visit_idx
  ON reception_visit_events (visit_id, occurred_at, id);
