-- The receptionist can delete a visitor record (e.g. registered by mistake). The row is kept for the
-- audit trail but hidden everywhere: deleted_at / deleted_by record who removed it and when.
ALTER TABLE reception_visits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE reception_visits ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS reception_visits_live_arrived_idx
  ON reception_visits (arrived_at DESC)
  WHERE deleted_at IS NULL;
