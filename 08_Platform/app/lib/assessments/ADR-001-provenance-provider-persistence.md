# ADR-001: Provenance Provider Fields in the Assessments Table

**Status:** Decision
**Date:** 2026-07-12
**Context:** Assessment Service v1.0 hardening pass

---

## Problem

The `assessments` table contains `numbers_asset_id` — a field whose name is provider-specific (Numbers Protocol). This creates a naming coupling: if SI8 migrates to a different provenance provider (self-hosted C2PA, alternative signing service), the column name would be semantically wrong.

Additionally, the public Verification Page derives the Numbers verify URL from `numbers_asset_id` inline in `page.tsx`:

```tsx
const verifyUrl = `https://verify.numbersprotocol.io/asset-profile?nid=${numbers_asset_id}`
```

This means the page code contains a hard-coded Numbers domain.

---

## Current State

The `assessments` table has:

- `numbers_asset_id TEXT` — the CID assigned by Numbers Protocol after signing
- `signed_asset_path TEXT` — Supabase Storage path of the downloaded signed MP4

The `ProvenanceProvider` interface in `types/assessment.ts` is correctly abstracted (no Numbers import in `repository.ts`, `service.ts`, or `page.tsx`). The coupling is in column names and one inline URL construction in `page.tsx`.

---

## Why This Is NOT a v1 Problem

In v1, Numbers Protocol is the only provider. The coupling in column naming is acknowledged but acceptable:

1. There is one reviewer, one provider, and (initially) one assessment. Premature schema generalization adds complexity with zero benefit until a second provider exists.
2. The IMPLEMENTATION-NOTE.md explicitly documents `numbers_asset_id` as pending deprecation if a provider migration occurs.
3. Changing the column name now would require a migration that renames `numbers_asset_id` to something like `provenance_asset_id` — a pure rename with no functional change. This is safe to defer.
4. The `ProvenanceProvider` interface and `signAssessment()` in `service.ts` are already provider-agnostic. The only coupling is the column name and the URL construction in `page.tsx`.

---

## Trigger for Future Migration

Migrate when any of the following occur:

- A second ProvenanceProvider implementation is added (e.g., self-hosted C2PA, Numbrs alternative)
- The Numbers verify URL format changes and `page.tsx` needs updating for a different provider
- Audit requirements mandate a normalized `provenance_records` table for multi-provider audit trails

---

## Likely Schema (if migration occurs)

Replace `numbers_asset_id` on `assessments` with a generic field and/or a separate table:

```sql
-- Option A: Rename the column (minimal change)
ALTER TABLE assessments
  RENAME COLUMN numbers_asset_id TO provenance_asset_id;

-- Also add a provenance_provider column to identify which system issued the CID:
ALTER TABLE assessments
  ADD COLUMN provenance_provider TEXT DEFAULT 'numbers_protocol';
```

```sql
-- Option B: Separate provenance_records table (more normalized)
CREATE TABLE provenance_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id    UUID NOT NULL REFERENCES assessments(id) ON DELETE RESTRICT,
  provider         TEXT NOT NULL,           -- 'numbers_protocol', 'self_hosted', etc.
  asset_id         TEXT NOT NULL,           -- provider-assigned CID
  verify_url       TEXT,                    -- provider verification URL (may change)
  created_at       TIMESTAMPTZ DEFAULT now()
);
```

Option B is more extensible but requires a join on every Verification Page load. Option A is sufficient unless multi-provider output per assessment is required.

---

## Tradeoffs

| Option | Pros | Cons |
|--------|------|------|
| **Current (v1)** | No migration needed; no complexity | Column name encodes provider; page has hard-coded Numbers URL |
| **Option A: rename** | Generic column name; minimal migration | Still flat; does not support multi-provider per assessment |
| **Option B: separate table** | Fully normalized; multi-provider capable | Adds join complexity; over-engineered for v1 |

---

## v1 Decision

Keep the current schema. `numbers_asset_id` is acceptable in v1 with one provider. Document this ADR so the trigger conditions are explicit.

The `page.tsx` Numbers URL construction is a known coupling point — annotate it with a TODO for clarity.

---

## Related files

- `08_Platform/app/lib/assessments/repository.ts` — confirmed: no Numbers imports
- `08_Platform/app/lib/assessments/service.ts` — confirmed: calls provider only through `ProvenanceProvider` interface
- `08_Platform/app/app/assessment/[assessment_number]/page.tsx` — contains the hard-coded Numbers URL construction
- `08_Platform/app/types/assessment.ts` — `ProvenanceProvider` interface is provider-agnostic
- `08_Platform/app/lib/assessments/providers/numbers.ts` — `NumbersProvenanceProvider` adapter
- `08_Platform/app/supabase/migrations/20260712000000_create_assessments_table.sql` — source schema

---

*ADR-001 · SI8 Assessment Service v1.0 · PMF Strategy Inc. d/b/a SuperImmersive 8 · July 12, 2026*
