-- Issuing the Certificate of Analysis of Water. The Head of Water & Environment prints the
-- certificate from the exhibit case file; printing is recorded here as the approval and
-- issue of the document. Once issued, only the Head can correct the test results.
-- Nullable: every existing exhibit simply has no certificate issued yet.
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS certificate_issued_at TIMESTAMPTZ;
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS certificate_issued_by UUID REFERENCES users(id) ON DELETE RESTRICT;

-- Additive, as migration 014 documents: only insert the new event type.
INSERT INTO water_intake_event_types (event_type) VALUES ('CERTIFICATE_ISSUED')
ON CONFLICT (event_type) DO NOTHING;
