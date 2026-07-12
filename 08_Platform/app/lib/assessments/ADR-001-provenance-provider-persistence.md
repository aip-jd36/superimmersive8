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

## Future Architecture: Assessment / AssessmentArtifact / ProvenanceRecord Separation

This section documents a three-entity separation that is NOT implemented in v1. It describes where the v1 flat schema breaks down and what the correct decomposition looks like when those breaks occur.

### The Three Entities

**Assessment** — the primary object. Owns the commercial assurance decision, institutional status, methodology, outcome, and verification URL. It does not own provenance-provider state. In v1, assessment-domain fields and provenance-domain fields coexist on the same table (`assessments`). This is acceptable at one provider, one asset per assessment.

**AssessmentArtifact** — one or more files produced by an assessment. In v1, the only artifact is the signed MP4 at `signed_asset_path`. A future assessment might produce: a signed MP4, a signed still frame, a chain-of-title PDF (once the PDF itself is signed via Capture API), and a provenance manifest export. Each artifact has its own storage path, content type, and lifecycle — it does not belong as a column on the Assessment.

**ProvenanceRecord** — the provider-specific signing record for one artifact. It owns: `provider` (string enum), `asset_id` (the provider CID), `verify_url` (provider-side link), `created_at`. A ProvenanceRecord is 1:1 with an artifact in the common case, but could be 1:N if an artifact is re-signed by multiple providers.

In v1, these three concepts are collapsed: `signed_asset_path` is the AssessmentArtifact and `numbers_asset_id` is the ProvenanceRecord, both as columns on Assessment.

### Five Concrete Migration Triggers

Implement the separation when any of the following occur:

1. **A second provenance provider is introduced** (e.g., self-hosted C2PA signer, Numbrs alternative, or a direct Content Credentials node). At that point, `numbers_asset_id` is no longer sufficient — you need `provider` + `asset_id` + `verify_url` per signing event, not just a CID field whose name encodes the provider.

2. **One assessment produces multiple signed media assets** (e.g., the source MP4 and a compressed delivery version, or a vertical crop signed separately for platform delivery). The current schema has one `signed_asset_path` per assessment — it cannot represent multiple artifacts.

3. **Reports require multiple immutable versions** (e.g., the PDF is revised and the original PDF is retained alongside the replacement). The current schema has no PDF artifact tracking — `pdf_hash_sha256` is a hash of the current PDF with no version history. If SI8 ever issues a corrected report (while keeping the original on record), a separate artifact table is required.

4. **Provider-specific columns begin spreading through assessment-domain code** (e.g., if a `numbers_verify_url` column is added to `assessments`, or if the signing route begins branching on `IF provider == 'numbers' THEN...`). This is the signal that the flat schema is becoming a maintenance problem. The fix is to extract provenance state to a `provenance_records` table keyed on `assessment_id` and `artifact_id`.

5. **Artifact retention or replacement requires independent lifecycle management** (e.g., a signed asset must be re-hosted from Numbers CDN to SI8 Supabase Storage because Numbers is shutting down, or an artifact must be marked superseded without superseding the Assessment itself). Independent lifecycle requires independent tables.

### Why This Is NOT Implemented in v1

- One provider, one artifact per assessment, no report versioning, no artifact supersession — the v1 complexity budget does not justify a three-table join on the Verification Page load.
- The `ProvenanceProvider` interface and `signAssessment()` orchestration are already provider-agnostic. The only coupling is the column names (`numbers_asset_id`, `signed_asset_path`) and the URL construction in `page.tsx`. This is acceptable until a trigger condition fires.
- Migration when a trigger fires is an `ALTER TABLE` rename (Option A) or a new `provenance_records` table (Option B) — both are schema-only changes with no business logic impact.

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
