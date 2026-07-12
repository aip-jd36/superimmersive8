# ADR-002: Lifecycle Audit Log for Assessment Status Transitions

**Status:** Deferred to v2 — document only
**Date:** 2026-07-12
**Context:** Assessment Service v1.0 hardening pass

---

## Problem

The `assessments` table stores current state only. When `processing_status` transitions (e.g., `SIGNING → FAILED`, `ACTIVE → WITHDRAWN`), the prior state is overwritten. The only traces of history are:

- `created_at` — when the record was inserted
- `updated_at` — when it was last modified (updated by trigger on every UPDATE)
- `failure_diagnostic` — preserved when `processing_status = 'FAILED'`
- `status_reason` — preserved when `institutional_status = 'SUPERSEDED'` or `'WITHDRAWN'`

There is no immutable record of: when SIGNING began, what the status was before a WITHDRAWN event, or the sequence of processing transitions on a multi-retry flow.

---

## What Is Currently Traceable

For the most important failure case (signing failure):

- `processing_status = 'FAILED'` — permanent; FAILED is a terminal status with no further transitions
- `failure_diagnostic` — captures `[timestamp] Step: X | Error: Y`
- `updated_at` — approximate time of the failure transition

For institutional changes (WITHDRAWN):

- `institutional_status = 'WITHDRAWN'` — permanent on the record
- `status_reason` — documents why

For the happy path (DRAFT → DELIVERED):

- No intermediate timestamps are preserved beyond `updated_at` (which is overwritten on each transition)

**Accountability gap:** If a reviewer wants to know "when did signing start?" or "how many retry attempts were made?", the current schema cannot answer these questions.

---

## Why This Is Deferred to v2

In v1 with a single reviewer and a manual signing flow:

1. The signing step is manual and observable — the reviewer initiates it directly in the admin panel
2. The `failure_diagnostic` field captures failure state with enough detail to diagnose what went wrong
3. The `updated_at` trigger gives approximate timing of every transition
4. No accountability requirement from clients or legal counsel has been identified yet (this changes once disputes arise)
5. Adding an events table now increases migration surface area without a concrete driving use case

The gap is real but not materially affecting operations at current volume (sub-100 assessments).

---

## Recommended Future Design

When lifecycle auditability becomes necessary, the smallest correct design is a separate events table. It does not replace the current `assessments` table — it supplements it.

```sql
CREATE TABLE assessment_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
  event_type    TEXT NOT NULL,       -- e.g. 'STATUS_TRANSITION', 'INSTITUTIONAL_CHANGE', 'RETRY'
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload       JSONB NOT NULL       -- e.g. { from: 'SIGNING', to: 'FAILED', diagnostic: '...' }
);

-- Index for per-assessment event history lookup
CREATE INDEX assessment_events_assessment_id_idx
  ON assessment_events (assessment_id, occurred_at DESC);
```

**Key design choices:**

- `ON DELETE RESTRICT` — events cannot be deleted if the assessment is somehow deleted (belt-and-suspenders with the parent table constraint)
- `payload JSONB` — flexible; can carry `from`/`to` status, actor identity, retry count, or any other context without schema changes
- `occurred_at` uses `DEFAULT now()` but is also explicit — allows retroactive event logging (e.g., migrating history from `failure_diagnostic` strings)
- No `updated_at` — events are immutable; they are never updated after insertion

**Event types (initial):**

| event_type | When logged | Payload |
|------------|-------------|---------|
| `PROCESSING_TRANSITION` | On every `transitionProcessingStatus()` call | `{ from, to, triggered_by }` |
| `INSTITUTIONAL_CHANGE` | On `supersede()` or `withdraw()` | `{ from, to, reason, triggered_by }` |
| `SIGNING_RETRY` | On retry attempt | `{ attempt_number, prior_diagnostic }` |
| `DELIVERY_CONFIRMED` | When DELIVERED status is set | `{ delivered_by, delivery_method }` |

---

## Trigger for Implementation

Implement the events table when any of these occur:

- First client dispute involving the timing of an assessment status
- Retry logic is automated (rather than manual), making audit trail load-bearing
- Compliance requirement from an E&O insurer or legal partner requiring a timestamped signing log
- Volume exceeds ~50 assessments and operational monitoring needs per-assessment history

---

## Related Files

- `08_Platform/app/lib/assessments/repository.ts` — `transitionProcessingStatus()`, `supersede()`, `withdraw()` are the write points
- `08_Platform/app/supabase/migrations/20260712000000_create_assessments_table.sql` — current schema with `updated_at` trigger
- `08_Platform/app/lib/assessments/ARCHIVAL-NOTE.md` — notes that deletion of an assessment would require an audit log of the deletion event

---

*ADR-002 · SI8 Assessment Service v1.0 · PMF Strategy Inc. d/b/a SuperImmersive 8 · July 12, 2026*
