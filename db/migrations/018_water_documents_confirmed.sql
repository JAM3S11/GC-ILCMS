-- The Head's confirmation, made from the exhibit case file, that the intake documents are fine.
-- The memo can only be approved while this is ticked, and the Head can untick it again until the
-- memo has been approved. Nullable: nothing is confirmed on existing exhibits.
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS documents_confirmed_at TIMESTAMPTZ;
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS documents_confirmed_by UUID REFERENCES users(id) ON DELETE RESTRICT;
