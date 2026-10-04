-- Structured Water & Environment test results. The Analysis Officer fills in the
-- physical and chemical parameters (result and report) in the case file; the
-- values are stored per exhibit as JSON so the parameter list can grow without a
-- schema change. Shape: { "results": { "<parameterId>": { "result": "...", "report": "..." } }, "remarks": "..." }
-- Nullable: existing exhibits keep their plain-text findings.
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS findings_results JSONB
  CHECK (findings_results IS NULL OR jsonb_typeof(findings_results) = 'object');
