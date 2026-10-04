-- The Head's approval of the intake documents moved from before assignment to the memo stage
-- (after the analysis), so a newly registered exhibit now waits for assignment, not approval.
-- Any exhibit still waiting for approval simply becomes one waiting for assignment; approved_at /
-- approved_by keep recording when the Head approved the documents.
UPDATE water_exhibit_intakes
   SET status = 'Awaiting Assignment', updated_at = NOW()
 WHERE status = 'Awaiting Approval' AND deleted_at IS NULL;
