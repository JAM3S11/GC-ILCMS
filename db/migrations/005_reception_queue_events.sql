ALTER TABLE reception_visit_events
  DROP CONSTRAINT IF EXISTS reception_visit_events_event_type_check;

ALTER TABLE reception_visit_events
  ADD CONSTRAINT reception_visit_events_event_type_check CHECK (event_type IN (
    'REGISTERED', 'LAB_QUEUE_UPDATED', 'NATIONAL_ID_REVEALED', 'LAB_NOTIFIED',
    'LAB_RECEIVED', 'SERVICE_COMPLETED', 'CHECKED_OUT'
  ));
