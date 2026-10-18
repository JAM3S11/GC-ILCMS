-- Access requests: an officer without an account asks the super-admin to add
-- them to the nominal roll. A request creates nothing by itself; the admin
-- reviews it and either adds the officer to the roll or dismisses it.
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_number TEXT NOT NULL CHECK (LENGTH(BTRIM(staff_number)) BETWEEN 1 AND 40),
  full_name TEXT NOT NULL CHECK (LENGTH(BTRIM(full_name)) BETWEEN 2 AND 150),
  email TEXT NOT NULL CHECK (LENGTH(email) <= 254),
  department TEXT NOT NULL,
  note TEXT CHECK (note IS NULL OR LENGTH(note) <= 500),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ADDED', 'DISMISSED')),
  nominal_roll_id UUID REFERENCES nominal_roll(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One open request per email, so a single officer cannot flood the queue.
CREATE UNIQUE INDEX IF NOT EXISTS access_requests_pending_email_idx
  ON access_requests (LOWER(email)) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS access_requests_pending_idx
  ON access_requests (created_at DESC) WHERE status = 'PENDING';
