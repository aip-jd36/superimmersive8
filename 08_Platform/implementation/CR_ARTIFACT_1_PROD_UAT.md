# CR-ARTIFACT-1S — Phase A Production UAT record (private Creator Record PDF artifacts)

**Status: PHASE A PRODUCTION UAT — PASS (observed, 2026-10-29).**
**Customer rollout: NOT AUTHORIZED.** Blocked by CR-PDF-DECLARATIONS-1 (see "Known release blocker").

This record covers only the private-artifact lifecycle of CR-ARTIFACT-1: issuance, ledger, private storage, authenticated delivery, repeat-issuance immutability and removing the rollout gate. The PDF was produced by the **existing legacy Creator Record generator**. This UAT does **not** validate or launch Creator Record v2 / Option C AI-assisted document checking. Option C's customer integration, evidence persistence, governed checking and review boundaries remain unresolved and separate.

The results below were **observed in one controlled run**. They are not universal security, concurrency or failure-mode guarantees.

## Environment

| Item | Value |
|---|---|
| Domain | `https://app.superimmersive8.com` |
| Deployed commit | `956dbc84` (Vercel `si8-creator-portal`, deployment `GLRZwE31R`) |
| Supabase Production project | `lehqgcgnenwdmuzudbrs` |
| Rollout mode (code constant) | `CREATOR_RECORD_ARTIFACT_ROLLOUT = 'allowlist'` |
| Migration | `20261028000000_creator_record_artifacts.sql`, applied by the operator before deployment |
| Accounts | Three internal SI8 accounts: owner (non-admin), unrelated user (non-admin), admin. No customer accounts or data. |

## Synthetic submission and artifact

| Item | Value |
|---|---|
| Submission ID | `06e8b60a-173f-44c2-b69e-da25e48a3cf5` |
| Tier | `creator_record` |
| Submission status / payment status | `approved` / `unpaid` (deliberate test-only exception; see limitations) |
| Declarations | `custodian_declaration = false`, `indemnification_confirmed = false` (PM-approved; nobody gave either declaration) |
| Content | Synthetic and labelled as such. No real work, media, rights, licences or commercial permissions exist or were reviewed. |
| Record ID | `CR-2026-06E8B60A` |
| Artifact ID | `56846d1f-ca68-4e2c-ba65-9fcd329ff444` |
| Attempt ID | `f63d4604-a56c-4b2d-8ca3-73e6dbdf6414` |
| Generator version | `legacy-creator-record-pdf-v1` |
| UAT flag | `true` |
| Artifact status | `issued` |
| Private bucket / path | `creator-records` / `06e8b60a-173f-44c2-b69e-da25e48a3cf5/f63d4604-a56c-4b2d-8ca3-73e6dbdf6414.pdf` |
| Size | 8,818 bytes |
| SHA-256 | `4bfa290fcb7167eb1dbd3889f16036574a77f576585abd67fa3b30a5fa0ae5b1` |

**The issued synthetic PDF is not evidence of verified rights, clearance or commercial authorization.** It contains fixed declaration wording that the submission did not give (see "Known release blocker"). Do not use it as an external sample.

## Procedure (checkpoints, each operator-approved)

1. **CP1 — preflight (read-only SQL + dashboards):** ledger and allowlist empty; triggers and constraints on `submissions`; no webhook or HTTP triggers; identities of the three accounts; current deployment.
2. **CP2 — create:** one synthetic submission through the existing `POST /api/submissions/create` as the owner, using the Creator Record form's field formats. Application validation was not bypassed.
3. **CP3 — approve and gate:** the submission was set to `approved` while unpaid, by operator SQL rather than the approve route (so no approval email was sent). One allowlist row was added to `creator_record_artifact_uat`.
4. **CP4 — issue:** one admin `POST /api/admin/submissions/[id]/generate-creator-record`, sent without `?force=true`.
5. **CP5 — verify:** ledger, storage metadata, public-exposure checks, owner, unrelated-user and anonymous delivery, payment isolation, one controlled repeat admin POST.
6. **CP6 — remove the gate:** the allowlist row was deleted. The artifact and ledger were preserved; owner delivery was re-checked.

### Execution incidents (no side effects)

- **CP2, first attempt — HTTP 400 `Failed to create submission`.** The prepared payload omitted the NOT NULL columns `tools_used`, `likeness_confirmation`, `ip_confirmation` and `audio_disclosure`, so the single-row insert was rejected. SQL afterwards confirmed the owner had zero submissions. The request was corrected to the form's full payload and re-run once with PM approval.
- **CP4, first attempt — HTTP 401 `Unauthorized`.** The route's session check (route lines 17–19) rejected the request before any database read or write. Admin routes authenticate only with Supabase session cookies. The request was re-run once with PM approval from a freshly loaded admin session on the production origin.

## Observed results

| # | Test | Result |
|---|---|---|
| 1 | Admin issuance API returned HTTP 200, `status: issued` | PASS |
| 2 | Exactly one issued artifact ledger row persisted | PASS |
| 3 | Exactly one matching private storage object found | PASS |
| 4 | Storage metadata matched the ledger: PDF MIME type and byte size | PASS |
| 5 | No legacy `report_pdf_url`, no `rights_packages` row, and no public storage object whose name contains the submission ID | PASS |
| 6 | Authenticated owner delivery returned HTTP 200 with `application/pdf` | PASS |
| 7 | Downloaded PDF starts with the `%PDF-` signature | PASS |
| 8 | Downloaded bytes matched the ledger's size (8,818) and SHA-256 | PASS |
| 9 | Unrelated authenticated non-admin user received HTTP 404 `{"error":"Not found"}` | PASS |
| 10 | Anonymous request received HTTP 401 `{"error":"Unauthorized"}` | PASS |
| 11 | Payment isolation: zero `payment_fulfillments` rows, zero `rights_packages` rows | PASS |
| 12 | Controlled repeat admin POST returned HTTP 409 | PASS |
| 13 | After the repeat POST, the ledger identifiers, timestamps, hash, size and storage path were unchanged; ledger count and private-object count both stayed at one | PASS |
| 14 | The temporary UAT allowlist entry was deleted | PASS |
| 15 | Post-cleanup database check: zero allowlist rows, one issued artifact, one private storage object | PASS |
| 16 | Post-cleanup owner delivery returned HTTP 200; PDF size and SHA-256 still matched the original ledger | PASS |

## Evidence limitations

- One synthetic submission was tested, not a representative customer population.
- The exact HTTP 409 response body for test 12 was not captured. The code at `956dbc84` returns `{"error":"This Creator Record has already been issued and cannot be replaced.","status":"issued","recordId":…}` for this case, but that body was not observed.
- The repeat POST (test 12) ran while the allowlist row was still present. That the rollback floor keeps the private path after gate removal is shown by the code (`precedence.ts` checks for an artifact row before the gate) and by test 16's delivery, not by a repeat POST after cleanup.
- The public-storage search covered object names containing the submission UUID, not every possible legacy naming pattern.
- These Production tests do not establish exhaustive security, concurrency or failure-mode coverage. Takeover, contention, integrity-conflict and fail-closed paths are covered by unit and DB tests only.
- The `approved` / `unpaid` combination was a deliberately controlled internal UAT exception, not a validated customer payment workflow. Paid fulfilment through Stripe → `payment_fulfillments` → artifact issuance was not exercised.
- The issued artifact and its ledger row remain in Production. No deletion or retention decision has been authorized. The issued row is immutable by design: a trigger blocks UPDATE and DELETE, and `service_role` holds no DELETE grant.

## Known release blocker — CR-PDF-DECLARATIONS-1 (OPEN)

`lib/pdf/CreatorRecordPDF.tsx` always prints section 5 (Evidence Custodian Declaration) and section 6 (Indemnification Warranty) as fixed wording. The PDF mapping (`lib/creator-record-artifacts/render.tsx`, and the legacy generator) never reads `submissions.custodian_declaration` or `submissions.indemnification_confirmed`. So a Creator Record PDF can state that the creator gave a declaration or warranty that the submission does not record. The `/record` form requires both boxes, but the server does not enforce them; the database defaults both to `false`.

The UAT synthetic submission had both flags `false`, so its PDF is a known instance of this mismatch.

**This is an unresolved document-integrity issue and a customer-rollout blocker.** Any widening of the private-artifact rollout to customer submissions requires CR-PDF-DECLARATIONS-1 first. No fix has been designed or authorized here.

## Rollback boundary

- **A Production artifact now exists.** Deploying any code older than CR-ARTIFACT-1 would ignore the artifact ledger, and it could issue a public legacy PDF for a submission that already has a private artifact. **A pre-artifact-code rollback therefore requires a compatibility review first.** It is not a routine Instant Rollback.
- **To stop new private issuance:** keep `creator_record_artifact_uat` empty (it is empty now), or deploy CR-ARTIFACT-1 code with `CREATOR_RECORD_ARTIFACT_ROLLOUT = 'off'`. Existing artifacts remain deliverable either way.
- **Do not drop** `creator_record_artifacts` or the `creator-records` bucket: an issued artifact exists. The migration header's drop-table rollback applies only before any artifact is issued.

## Current state after the UAT

| Item | State |
|---|---|
| `creator_record_artifact_uat` | 0 rows |
| `creator_record_artifacts` | 1 row (the synthetic artifact above), `issued` |
| `creator-records` bucket | 1 object (the synthetic artifact above) |
| Rollout mode | `allowlist` (code constant), so no submission is currently eligible |
| Customer rollout | NOT AUTHORIZED |
| Option C | Not part of this UAT; unchanged |
