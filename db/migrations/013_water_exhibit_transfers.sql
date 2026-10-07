-- Superseded by 014 (event types live in water_intake_event_types). migrate.js
-- re-runs every file, so only add this list on a database that predates 014.
DO $$
BEGIN
  IF to_regclass('public.water_intake_event_types') IS NULL THEN
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
  END IF;
END $$;
