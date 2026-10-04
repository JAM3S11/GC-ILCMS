-- Water & Environment exhibit findings. The Analysis Officer records what the
-- analysis actually found before completing the exhibit, so the case file shows
-- the work rather than only that the status flipped. Every column is nullable:
-- existing rows stay valid, and an officer may still complete an exhibit without
-- recording anything (some analyses legitimately yield no narrative).
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS findings TEXT
  CHECK (findings IS NULL OR LENGTH(findings) BETWEEN 1 AND 5000);
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS findings_recorded_at TIMESTAMPTZ;
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS findings_recorded_by UUID REFERENCES users(id) ON DELETE RESTRICT;

-- Allowed event types now live in a table instead of being spelled out in the
-- CHECK constraint. Several features each add their own type to this same
-- constraint, and a plain DROP + ADD made the result depend on filename sort
-- order: whichever migration sorted last silently removed the other features'
-- types, so an INSERT of that type then failed at runtime. A CHECK cannot
-- reference the lookup table (Postgres rejects subqueries in CHECK), so the
-- allowlist is enforced by a foreign key instead - validated on every insert,
-- and strictly stronger than the CHECK it replaces. A future migration that
-- introduces an event type should ONLY insert it here and must not touch this
-- constraint, so the set is additive and migration order stops mattering.
CREATE TABLE IF NOT EXISTS water_intake_event_types (
  event_type TEXT PRIMARY KEY
);

INSERT INTO water_intake_event_types (event_type) VALUES
  ('REGISTERED'),
  ('APPROVED'),
  ('ASSIGNED'),
  ('TRANSFERRED'),
  ('ANALYSIS_COMPLETED'),
  ('EDITED'),
  ('DELETED'),
  ('FINDINGS_RECORDED')
ON CONFLICT (event_type) DO NOTHING;

-- Every type already stored satisfies the new key, so this validates cleanly.
ALTER TABLE water_exhibit_intake_events
  DROP CONSTRAINT IF EXISTS water_exhibit_intake_events_event_type_check;
ALTER TABLE water_exhibit_intake_events
  DROP CONSTRAINT IF EXISTS water_exhibit_intake_events_event_type_fkey;
ALTER TABLE water_exhibit_intake_events
  ADD CONSTRAINT water_exhibit_intake_events_event_type_fkey
  FOREIGN KEY (event_type) REFERENCES water_intake_event_types(event_type);

CREATE INDEX IF NOT EXISTS water_exhibit_intakes_findings_idx
  ON water_exhibit_intakes (findings_recorded_at DESC) WHERE findings IS NOT NULL;