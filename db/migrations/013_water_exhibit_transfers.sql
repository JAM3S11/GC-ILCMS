ALTER TABLE water_exhibit_intake_events
  DROP CONSTRAINT IF EXISTS water_exhibit_intake_events_event_type_check;
ALTER TABLE water_exhibit_intake_events
  ADD CONSTRAINT water_exhibit_intake_events_event_type_check
  CHECK (event_type IN (
    'REGISTERED',
    'APPROVED',
    'ASSIGNED',
    'TRANSFERRED',
    'ANALYSIS_COMPLETED',
    'EDITED',
    'DELETED'
  ));
