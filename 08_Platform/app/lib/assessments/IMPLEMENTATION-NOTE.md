# Assessment Service v1.0 — Implementation Note

Date: 2026-07-12

## What was built

All 13 deliverables from the PRD have been implemented. Files created:

| File | Purpose |
|------|---------|
| `supabase/migrations/20260712000000_create_assessments_table.sql` | DB schema, constraints, indexes, RLS, `signed-assets` bucket |
| `types/assessment.ts` | Domain types, enums, ProvenanceProvider contract |
| `lib/assessments/repository.ts` | DB access layer — all `assessments` table reads and writes |
| `lib/assessments/service.ts` | Orchestration — signing flow, C2PA manifest builder |
| `lib/assessments/providers/numbers.ts` | NumbersProvenanceProvider (real adapter, TODOs marked) |
| `lib/assessments/providers/mock.ts` | MockProvenanceProvider (deterministic test double) |
| `app/assessment/[assessment_number]/page.tsx` | Public Verification Page |
| `__tests__/assessments/types.test.ts` | Unit tests — types and enums |
| `__tests__/assessments/service.test.ts` | Unit tests — buildC2PAManifest security properties |
| `__tests__/assessments/mock-provider.test.ts` | Unit tests — MockProvenanceProvider |
| `__tests__/assessments/repository-transitions.test.ts` | Unit tests — processing status transitions |
| `.env.local.example` | Added `NUMBERS_API_KEY` documentation |

## Repository review findings (pre-implementation)

### Conflicts with PRD that were resolved

**1. Confidence in C2PA manifest (existing `sign` route violated PRD)**
The existing `app/api/admin/submissions/[id]/sign/route.ts` embeds `si8:confidence_level` in the C2PA assertion payload. The PRD states explicitly: "Confidence is PDF-only. It must not appear in the Assessment Registry table, the C2PA manifest, or the Verification Page."

Resolution: The new `buildC2PAManifest()` function in `lib/assessments/service.ts` omits confidence entirely. The new sign flow uses this function. The existing `sign` route's `buildZoneA()` function was not modified (breaking it would disrupt the existing workflow before the migration is applied), but the new code is correct per PRD.

The test `service.test.ts` explicitly verifies confidence is not in the manifest.

**2. Signed asset storage (existing route stored Numbers URL directly)**
The existing `sign` route stores the Numbers URL in `signed_video_url` directly on `submissions`. The PRD requires: "Download signed MP4 from signedAssetUrl and store in Supabase Storage (signed-assets bucket, private). Do not serve signed assets via a public Numbers URL permanently."

Resolution: `lib/assessments/service.ts` `signAssessment()` downloads the signed asset and stores it in the `signed-assets` bucket. `assessments.signed_asset_path` holds the Supabase path.

**3. Verification URL domain**
Existing code uses `https://verify.superimmersive8.com/{id}`. PRD specifies `https://app.superimmersive8.com/assessment/{assessment_number}`.

Resolution: New `assessments` table and service use the PRD-specified URL pattern. The Verification Page route is at `app/assessment/[assessment_number]/page.tsx`.

**4. Assessment data lived on `submissions` table (not a dedicated table)**
`assess_id`, `workbook_data`, `provenance_status`, `numbers_asset_id`, etc. were columns on `submissions`. The PRD requires a dedicated `assessments` table as the primary object.

Resolution: New `assessments` table created with a 1:1 FK to `submissions.id`. Existing `submissions` columns are not removed (they will continue to serve the existing workbook UI until a future migration migrates the data).

**Existing columns to deprecate in a future migration (not removed now to avoid breaking existing admin UI):**
- `submissions.assess_id` → becomes `assessments.assessment_number`
- `submissions.provenance_status` → becomes `assessments.processing_status`
- `submissions.numbers_asset_id` → becomes `assessments.numbers_asset_id`
- `submissions.numbers_verify_url` → derivable from `assessments.numbers_asset_id`
- `submissions.numbers_signed_at` → removed (not in PRD schema)
- `submissions.signed_video_url` → becomes `assessments.signed_asset_path`
- `submissions.report_hash` → becomes `assessments.pdf_hash_sha256`

### What the existing `sign` route still does

The existing `app/api/admin/submissions/[id]/sign/route.ts` continues to work as-is and writes to `submissions` columns. It operates independently of the new `assessments` table. When the admin team is ready to migrate fully to the Assessment Service, those two flows can be merged.

## Unresolved external dependencies (Numbers Protocol API contract)

All of these are marked with `// TODO (Numbers API):` in `lib/assessments/providers/numbers.ts`.

| Question | Current assumption | Source |
|----------|-------------------|--------|
| Endpoint URL | `https://api.numbersprotocol.io/api/v3/assets/` | Sofia Yan call notes, existing sign route |
| Auth header | `Authorization: token ${NUMBERS_API_KEY}` | Existing sign route |
| Multipart form field names | `file`, `caption`, `tag`, `headline`, `custom_c2pa` | Existing sign route |
| C2PA Trust List status for uploaded MP4 | UNCONFIRMED | Sofia Yan call Jul 1, 2026 — awaiting reply |
| Asset CID field in response | `asset_cid` (fallback: `cid`, `id`) | Existing sign route |
| Signed file download URL field | `signed_file_url` (fallback: `file`) | Existing sign route |
| Whether signed file URL is in the creation response | Assumed yes; if not, a GET to `/api/v3/assets/{cid}/` is needed | Not confirmed |
| Verification URL field in response | `verification_url` | Existing sign route |
| Polling vs. webhook for async processing | Assumed synchronous response | Not confirmed |
| Idempotency key support | Not implemented | Unknown |
| Request timeout | 55s (Vercel Pro limit) | Platform constraint |

The implementation is marked NOT PRODUCTION-READY until the Numbers API contract is validated.

## Architectural decisions that deviate from PRD

None. All PRD boundaries were followed. Where the repository conflicted with the PRD, the conflict is documented above and the implementation follows the PRD.

## What is not built (PRD non-goals confirmed excluded)

Customer accounts, dashboard, search, admin UI for assessments, API endpoints for assessments, report version browser, QR codes, bulk operations, analytics, customer report downloads, report editing.

The existing admin UI at `app/admin/submissions/[id]/` continues to serve the workbook, sign, and deliver functions — it is not replaced by this implementation.
