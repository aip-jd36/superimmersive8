# Assessment Archival Note

**Date:** 2026-07-12
**Applies to:** `assessments` table, Assessment Service v1.0

---

## Principle

**Assessments must never be hard-deleted through normal application workflows.**

An assessment is a commercial opinion delivered to a paying client. Once created, it becomes part of a client's chain of documentation. Deleting it would silently invalidate their deliverable and destroy SI8's own audit trail.

---

## Current Delete-Prevention State

Four layers prevent accidental deletion in v1:

1. **No delete function in `repository.ts`** — the repository exposes no `deleteAssessment()` function. No application code can call a delete path that doesn't exist.

2. **No delete API routes** — no route under `app/api/` touches the `assessments` table. The only routes that write to assessments are in `lib/assessments/service.ts` (via supabaseAdmin, service_role).

3. **Explicit RLS DENY policy** — migration `20260712000001_atomic_assessment_number.sql` creates a `RESTRICTIVE` policy that denies DELETE for `anon` and `authenticated` roles:
   ```sql
   CREATE POLICY "assessments_deny_delete" ON assessments
     AS RESTRICTIVE
     FOR DELETE
     TO anon, authenticated
     USING (false);
   ```
   PostgreSQL also denies operations with no matching permissive policy when RLS is enabled — but the explicit RESTRICTIVE policy documents the intent and survives future policy additions.

4. **ON DELETE RESTRICT on FK** — `submission_id UUID NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE RESTRICT` prevents deletion of a submission that has an assessment row.

---

## Archival vs. Withdrawal

The current implementation does not have a soft-delete or archival status. Instead:

- **Withdrawal** is the institutional mechanism for removing an assessment from reliance. `institutional_status = 'WITHDRAWN'` with a `status_reason` is displayed prominently on the Verification Page. The record is preserved; only its displayed validity changes.
- **Supersession** (`institutional_status = 'SUPERSEDED'`) handles the case where a replacement assessment is issued.

**There is no `ARCHIVED` status in v1.** This is intentional. Archival is a records-management concept (move to cold storage, reduce visibility) distinct from institutional withdrawal (still visible, but explicitly invalidated). Conflating them would create ambiguity.

---

## Future Archival Design (v2 consideration)

When SI8 needs to manage a large volume of assessments, consider:

- An `archived_at TIMESTAMPTZ` column — set when an assessment is moved to cold storage; does not change institutional_status
- An admin-only "Archive" action gated to `service_role` + a specific admin permission
- The archived assessment remains readable (Verification Page continues to work) but may be excluded from operational queries by default
- Archival does not affect the UNIQUE constraint on `assessment_number`

**Retention governance** is an open question (see OQ5 in the Provenance Manifest Specification v0.2). Minimum three years is the current policy for Zone D evidence. The `assessments` table should follow the same or longer policy given its role as the authoritative Registry.

---

## What Would Require Evidence to Change

Any change that enables deletion of an assessment record (including soft-delete with actual data removal) requires:

1. A written legal opinion on document retention obligations for commercial assurance records
2. Client notification protocol (if deletion affects their delivered documentation)
3. Audit log of the deletion event (who, when, why) — this would require the `assessment_events` table from ADR-002 to be implemented first

---

*ARCHIVAL-NOTE · SI8 Assessment Service v1.0 · PMF Strategy Inc. d/b/a SuperImmersive 8 · July 12, 2026*
