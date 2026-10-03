# Reception Workflow Database Plan

**Status:** Implemented. PostgreSQL migrations, authenticated visit APIs, audit events, and database-backed reception views are in place.

## Current process

1. Reception staff register a police officer or general client with identity/contact details, destination laboratory, purpose, and any required visitor-specific details.
2. The authenticated API validates and stores each visit in PostgreSQL, assigns a database-generated `VIS-YYYY-NNNNNN` reference and arrival timestamp, and writes registration, queue-update, and audit events transactionally.
3. The Lab Bay reads the persisted queue, scoped to the signed-in laboratory, and refreshes from the database every 15 seconds.
4. An Analyst, Senior Chemist, or Head of Department in the destination laboratory records receipt and completion. Reception staff can check out a visitor only after completion.
5. The register masks National ID by default. An authorized reveal request is audited, and the UI hides the full value after five seconds.

Known scope limits:

- Exhibit details remain a descriptive text summary, not a structured exhibit inventory or proof of chain of custody.
- Queue updates use database polling; there is no email/push outbox worker.
- National ID is stored in PostgreSQL and only masked in list responses; separate encryption/key management and retention policy remain deployment decisions.
- File uploads and signatures are deferred.

## Goals and scope

Persist visitor arrivals, their current reception/laboratory workflow state, departure, and the audit history needed to explain changes. Keep each visit distinct even when the same person visits more than once.

This phase does **not** make the visitor record a laboratory case, create authoritative exhibit/custody records, store document uploads or biometric signatures, or replace the separate Food & Drugs and Water laboratory intake flows. Those workflows should link to a visitor/visit only when their own database designs are ready.

## Proposed relational model

Use PostgreSQL UUID primary keys for relationships and server-side `TIMESTAMPTZ` values for all event times. Add migrations under `db/migrations/`; do not reuse the `users` table to represent visitors.

### `reception_visits`

One row per arrival/visit, containing:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `visit_number TEXT UNIQUE NOT NULL` for a human-readable register reference, assigned safely by the server/database (never from the client clock)
- `visitor_type TEXT NOT NULL CHECK (...)`: `POLICE_OFFICER` or `GENERAL_CLIENT`
- `visitor_name TEXT NOT NULL`
- `national_id TEXT NOT NULL` (or a separately approved, protected representation if policy requires encryption)
- `phone TEXT NOT NULL`
- `badge_number TEXT NULL`; required for police-officer records by a type-aware constraint/validated transaction
- `station_or_organization TEXT NOT NULL`
- `vehicle_registration TEXT NULL`; required for general-client visits under current UI rules
- `postal_address TEXT NULL`; required for Food & Drugs visits under current validation
- `destination_department TEXT NOT NULL` with a check against the supported reception destination list; exclude institution-only `General Administration`
- `purpose_of_visit TEXT NOT NULL`
- `documents_presented TEXT NULL`
- `exhibits_summary TEXT NOT NULL DEFAULT ''`, explicitly descriptive only (not an itemized evidence register)
- `arrived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `departed_at TIMESTAMPTZ NULL`
- `status TEXT NOT NULL CHECK (...)`: `AWAITING_LAB_RECEPTION`, `IN_LABORATORY`, `COMPLETED`, `DEPARTED`
- `registered_by UUID NOT NULL REFERENCES users(id)` and `checked_out_by UUID NULL REFERENCES users(id)`
- `created_at`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Do not persist `receptionistName` as free text: derive the display name from the referenced user account. `documentsVerified` should not be a mutable text array. Record verifications as events (and add a separate document table only if document-level records are required). `signatureCaptured` should remain out of scope until the application actually captures a signature and retention/consent policy is established.

### `reception_visit_events`

Append-only workflow history, linked to a visit:

- `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
- `visit_id UUID NOT NULL REFERENCES reception_visits(id)`
- `event_type TEXT NOT NULL` (initially `REGISTERED`, `LAB_NOTIFIED`, `LAB_RECEIVED`, `SERVICE_COMPLETED`, `CHECKED_OUT`, `CORRECTED`)
- `from_status TEXT NULL`, `to_status TEXT NULL`
- `actor_user_id UUID NULL REFERENCES users(id)`; null only for explicitly identified system actions
- `occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `details JSONB NOT NULL DEFAULT '{}'::jsonb`, restricted to non-secret event facts; never include unnecessary national ID or credentials

Application transactions that change a visit's status must update the visit and append its event atomically. Existing `audit_log` can also receive a high-level audit entry in that same transaction for consistency with the admin audit UI, but should not be the only event history for visit details.

### `reception_visit_documents` (defer unless needed)

Only add this table when the workflow requires separately verified documents. It should reference `reception_visits`, capture a controlled document type, optional safe reference/description, verification state, verifier (`users.id`) and `verified_at`. Store files in approved private object storage and keep metadata/opaque storage keys in the database; do not put file contents or signed URLs in audit JSON.

## Workflow, transaction, and permissions

1. **Register:** Authenticate and require `RECEPTIONIST` (and explicitly approved administrative roles). Validate fields on the server, insert the visit with a database-generated visit number, insert `REGISTERED` event, and write a `VISITOR_REGISTERED` audit entry in one transaction. Only after commit return the persisted visit.
2. **Notify destination:** Registration appends a `LAB_QUEUE_UPDATED` event in the same transaction. The Lab Bay polls the database queue every 15 seconds; no separate notification worker or transport delivery is currently implemented.
3. **Lab handoff:** An authorized member of the destination laboratory records receipt/verification. Enforce allowed source status and department authorization on the server; append the corresponding event transactionally. Do not allow the receptionist UI to claim the laboratory accepted exhibits.
4. **Completion:** Define which laboratory role can mark service complete and whether a reason/reference is required. Record `SERVICE_COMPLETED` with actor and timestamp; only this state should make the visitor eligible for reception check-out.
5. **Check out:** A receptionist records departure. In one transaction, require an eligible current status, set `departed_at`, `checked_out_by`, and `DEPARTED`, and append `CHECKED_OUT` plus the admin/audit event. Reject duplicate check-outs and invalid transitions with a clear `409`.
6. **Corrections:** Never silently overwrite a completed register entry. Provide a narrowly authorized correction path with required reason and append-only event history. Deletion should be disabled for visits once created; handle retention through an approved archival policy.

Enforced transition policy:

```text
AWAITING_LAB_RECEPTION -> IN_LABORATORY -> COMPLETED -> DEPARTED
```

The API enforces the transition and destination-department checks; the UI also disables checkout until completion.

## Read/query patterns and indexes

- Reception register: visits for the current local day, newest first; filters for on-site, awaiting laboratory, and departed.
- Lab Bay: awaiting visits scoped to the authorized destination department, ordered by arrival time.
- Checkout queue: visits in the permitted completed state; departure register for a date range.
- Visit detail/history: one visit plus ordered events.

Add indexes for `(arrived_at DESC)`, `(destination_department, status, arrived_at)`, and partial indexes for active/on-site statuses as query volume warrants. Enforce one-time check-out with status-guarded updates rather than relying on UI state. Avoid globally unique constraints on badge number or national ID; the same person may have multiple visits.

## Implemented API and client behavior

1. Idempotent migrations create the visit/event tables and queue event type. Account tables and bootstrap use email without a staff-ID column.
2. Authenticated APIs provide visit registration and paginated/date/status-filtered listing, National ID reveal, laboratory receipt/completion, and checkout. The actor is derived from the session.
3. Reception views load persisted visits and refresh the first page and laboratory queues every 15 seconds; subsequent pages use a cursor.
4. Mutations wait for the API response, prevent duplicate submissions, and surface validation, conflict, and network errors.
5. Queue refresh is database polling; a retryable notification outbox remains deferred.
6. Seed/demo visitors are not automatically imported as operational database visits.

## Security, privacy, and operations

- Restrict visitor PII to receptionist users and explicitly authorized staff; enforce scope at API query level, not only in navigation.
- Minimize national ID exposure in list views, search results, queue events, and audit details. Full National ID is returned only by the reveal endpoint and is hidden by the UI after five seconds. Define encryption-at-rest/key management and retention requirements with the data owner before production use.
- Use parameterized SQL, strict server-side validation, rate limits where appropriate, least-privilege database roles, and TLS in deployed environments.
- Audit who registered, verified/received, completed, corrected, and checked out each visit. Do not log full request bodies containing identity data.
- Use `TIMESTAMPTZ` in storage and format local dates/times in the UI using the configured `Africa/Nairobi` timezone.
- Back up and test restore of operational records before production rollout; document retention and archival.

## Confirmed workflow decisions

- Analysts, Senior Chemists, and Heads of Department in the destination laboratory can receive and complete a visit.
- Checkout is allowed only after service completion.
- National ID is masked by default and revealed for five seconds only after an explicit user action.
- File uploads and signatures are deferred.
- Visit references use `VIS-YYYY-NNNNNN`, with daily dates based on `Africa/Nairobi`.
