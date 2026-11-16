# CR-DESIGN-2D — Guarded release plan (Institutional Trust customer PDF)

**Status: PLAN ONLY — NOT AUTHORISED.**

- Nothing here may run until the founder gives explicit release authorisation for CR-DESIGN-2D, with the §6 values filled from the founder approval record (`02-FOUNDER-APPROVAL-RECORD.md`).
- Engineering does not run Production SQL. The operator runs the read-only checks and reports the results; engineering never infers a result.
- The plan follows the CR-V2-MVP release precedent:
  - `RELEASE-RUNBOOK.md`;
  - `operator-preflight.sql` Q0–Q10;
  - `apply-cutover.py`, with frozen fingerprints, refusing on any mismatch.

## 0. What the release changes, and what it does not

**Changes:**
- **Template registration.** v6 (schema 7) and v7 (schema 8) are registered **approved**; v4 and v5 stay registered as **superseded** (readable for audit, never selected).
- **Generator.** `CREATOR_RECORD_V2_GENERATOR_VERSION`: `creator-record-v2-pdf-v3` → `creator-record-v2-pdf-v4`. New artifacts are then distinguishable; the takeover guard refuses to re-render a pending `-pdf-v3` row under the new templates.
- **Branch integration.** The local branch `work/cr-design-2b` (`eba9f52d` + the 2C commit) is integrated onto `origin/main`.

**Does not change:**
- record schemas, the questionnaire, Source Text, wording, the ledger and registry, Living Knowledge;
- eligibility, checkout, consent;
- Terms `terms-2026-11-14`, privacy `privacy-2026-11-09`, AI permission `cr-v2-ai-permission-1` (no section W write);
- issued artifacts;
- the D10 boundaries.

**Selection.** `approvedPdfTemplates` selects exactly one **approved** set per schema. Zero or two approved sets select nothing, and issuance fails closed.

## 1. Prepared before authorisation (engineering, local; rehearsed, not applied)

1. **Cutover script** `apply-design-cutover.py`, modelled on `apply-cutover.py`:
   - takes v6/v7 verbatim from the committed proposal files;
   - refuses unless the fingerprints equal the FROZEN values: v6 `a0cd0c24…f476`, v7 `5d7ccfc8…61ab`, presentation `aa50507b…17db`, base v4 `d4ecf3f3…4f7e`, base v5 `a27e23cd…3408`;
   - fills the approval metadata only from the §6 values;
   - marks v4/v5 superseded;
   - bumps the generator.
2. **Release-test updates** (as a patch): the tests that pin v4/v5 and `-pdf-v3` as current.
3. **Operator preflight** `operator-preflight-2d.sql`: Q0–Q8 with Q0's expected values updated to v6/v7 and `-pdf-v4`, plus the all-product check.
4. **Rehearsal** on a fresh integration of `origin/main` + the branch:
   - the script applies and refuses on a tampered value;
   - `tsc`, the customer-wording check, `next build` with font tracing and the 13-case byte checks all pass;
   - the full suite equals the 24/89 baseline;
   - a rehearsal render of all 13 cases through the *approved* (not synthetic) path.

## 2. Production preflight (operator, read-only), on the current build

| Check | Expected |
|---|---|
| Q0 | Production deployment = `4c88a8a4` lineage (Build B `0bec2dee` application); v4/v5; `-pdf-v3` |
| Q3 | v2 records bound or paid but not issued: **0 rows** |
| Q4 | v2 fulfilments pending, failed or awaiting reconciliation: **0 rows** |
| Q5 | pending v2 artifacts: **0 rows** (otherwise reconcile first) |
| Q6 | issued-artifact immutability trigger present and enabled (`tgenabled = 'O'`) |
| Q8, Q10 | as at the MVP release: only the previously accepted exception rows (Q8 = 1, Q10 = 3, which are the same three unpaid prepared records under synthetic authority, preserved unchanged, which cannot be bought or issued). Anything else: STOP. v7 is v5 verbatim, so its comparison-method refusal is unchanged |
| All-product check | zero LIVE paid-not-completed rows |
| Q7 | prepared, unpaid records (informational): these will be issued under v6/v7 if bought after the swap. Their content is unchanged, so no re-preparation is needed |
| Vercel function memory and duration | memory comfortably above about 330 MB RSS (measured, §3 of the acceptance record); `maxDuration` 60 s unchanged |

**Any unexpected result: STOP and reconcile. Do not proceed on expectation.**

## 3. Purchase and issuance drain gate

**Rule.** The swap needs **no v2 order in flight**. A pending `-pdf-v3` artifact whose object is missing would be refused under `-pdf-v4` (by design) and would need manual reconciliation.

**Recommended: two-stage, as at the MVP release.**

1. **Stage D1 (pause).** Deploy `CREATOR_RECORD_V2_SUBMISSIONS = 'stopped'` on the current application, the only code change. The live page shows "Creator Record is not taking new submissions right now." Issuance stays `'enabled'`, so paid records drain.
2. **Drain.** Re-run Q3, Q4, Q5 and the all-product check until all are zero. Wait at least one sweep cycle; the daily cron is at 23:00 UTC, or an admin can trigger the reconcile route.
3. **Stage D2 (cutover).** Deploy the release build (§4), with `CREATOR_RECORD_V2_SUBMISSIONS = 'open'`.

**Alternative (single stage), only if the founder prefers.** Deploy D2 directly, immediately after a clean Q3/Q4/Q5 at a time of no checkout activity. Lower effort; a small window in which a purchase could land between the check and the deploy.

## 4. Template approval and generator activation sequence

1. The founder's 2D authorisation supplies the §6 values.
2. **Integrate.** Fast-forward or rebase `work/cr-design-2b` (`eba9f52d` + the 2C commit) onto `origin/main`. Expect no drift; `origin/main` is `4c88a8a4` today. Verify `git range-diff` is patch-identical.
3. **Register and bump.** Apply `apply-design-cutover.py` with the §6 values. It refuses on any fingerprint mismatch. Then apply the release-test patch.
4. **Commit the records** with the build: the acceptance record, the founder approval record with completed decisions, and the 2D authorisation.
5. **Verify locally:**
   - `tsc`, the customer-wording check, `next build` (font tracing: 9 files × 4 routes);
   - full suite = baseline;
   - 13-case byte checks through the approved path;
   - glyph-isolation regression.
6. **Push to `origin/main`** (fast-forward, never force). Vercel deploys. Record the deployment ID and commit.

## 5. Font packaging verification

- **Before deploy.** The local `next build` traces all 9 font files for `/api/webhooks/stripe`, `/api/internal/payment-fulfillments/sweep`, `/api/admin/payments/[sessionId]/reconcile` and `/api/admin/submissions/[id]/generate-creator-record`.
  - Mechanism: `outputFileTracingIncludes` covers `./lib/creator-record/customer-pdf/fonts/**`.
  - Size: about 18 MB, of which Noto, already deployed, is 16.4 MB.
- **At runtime.** The renderer verifies each font file against its pinned SHA-256 before use. A missing or altered file refuses the render (`font_fingerprint_mismatch`): fail-closed, no PDF. The fulfilment stays retryable and visible in Q4.
- **After deploy.** The UAT issuance (§8) proves the fonts load in the Production function. Check function logs for any `font_fingerprint_mismatch` or `text_unsupported` refusal.

## 6. Values the founder's 2D authorisation must supply (none invented)

```
--authority       "<who approved>"
--decision-date   YYYY-MM-DD
--review-ref-v6   "<approval record reference for v6>"
--review-ref-v7   "<approval record reference for v7>"
```

Also required:
- confirmation of F-2C-1 to F-2C-6 in the founder approval record;
- F-2C-7, physical print verification, completed or explicitly waived by the founder;
- a choice between the two-stage (recommended) and single-stage drain.

## 7. Historical artifact preservation

- Issued PDFs are never re-rendered. Delivery serves the stored bytes after re-checking their recorded SHA-256 (`creator-record-artifacts/deliver.ts`), independent of the current template registration.
- The immutability trigger (Q6) protects issued rows.
- v1–v5 sets stay registered (superseded) for audit.
- `-pdf-v4` matches the v2 generator pattern, so the 12-month customer access window (`customerAccessExpired`) and the renderer's ownership rules apply unchanged.
- Records already issued under v4/v5 keep their own PDFs. They are not re-issued in the new design.

## 8. Production UAT (after D2)

1. **Schema 7.** One admin purchase with a single-use 100% comp code, as in the MVP UAT. Mark the UAT record clearly; the MVP precedent excluded `uat = false` purchases from customer reporting by record ID.
2. **Schema 8 (optional, recommended).** A record with an uploaded document and a reading. Note: a fresh AI examination under the current Terms was not exercised at the MVP release.
3. **Q1.** The new artifact is `-pdf-v4`, status `issued`; its provenance names v6 or v7 with the §2 fingerprints. The PDF itself prints "Document layout version 6/7" and the fingerprint.
4. **Download as the creator** (owner path) and as admin. The bytes are served and the SHA-256 is verified.
5. **Byte checks on the downloaded Production PDF.** Engineering runs `verify_pdf_bytes.py` on the PDF (local, read-only) for chrome, page numbers, bounds, overlap, reserved bands, text and search.
6. **Visual review.** PM/Architecture accept the issued PDF. The founder confirms the print check on the Production PDF if F-2C-7 was not already completed.
7. **Earlier records.** One earlier record (issued under v4 or v5) still downloads, byte-identical.

## 9. Post-release verification

| Check | Expected |
|---|---|
| Q0 | v6/v7 approved, v4/v5 superseded, `-pdf-v4` |
| Q3, Q4, Q5 | 0 |
| Q6 | trigger enabled |
| Function logs, first issuances | no `creator_record_presentation_refused`, `templates_presentation_*`, `text_unsupported` or `font_fingerprint_mismatch` refusals; render durations in line with §3 of the acceptance record |
| Submissions | open; the live submission page renders normally |
| Closure | founder GO recorded in the approval record and CLAUDE.md §3u |

## 10. Retry and rollback protections

**Retries.**
- A failed render (any refusal) creates no PDF. The fulfilment remains retryable by the sweep (sequential, 10 per run, 45 s budget, 300 s lease) or by admin reconcile.
- The render queue releases on failure, or after 30 s if a render never settles.

**Rollback of D2.** Redeploy the previous Production deployment: the D1 pause build, or the current `4c88a8a4` deployment under the single-stage option.
- **Never** roll back below Build A `60b1d84d`. Never to `334d8d9f`, `678add4d` or earlier.
- The Terms and AI-permission rows are unaffected (no section W write).
- **A pending `-pdf-v4` artifact** under the rolled-back `-pdf-v3` build:
  - stored object → issued from its stored, digest-checked bytes;
  - missing object → refused by the guard and reconciled manually (same rule as the MVP release).
- **Already-issued `-pdf-v4` PDFs** remain valid stored bytes and download unchanged; the delivery path does not consult templates.
- After a rollback, new issuances use v4/v5 again (the old build registers v4/v5 as approved).

**Rollback of D1:** redeploy the current Production deployment (submissions open).

## 11. Stop points

- **Before step 4.1:** stop until the founder's explicit 2D authorisation.
- **At preflight or drain:** any non-zero Q3, Q4 or Q5, or any unexpected Q0/Q6 result: STOP and reconcile.
- **At UAT:** any failed byte check, wrong provenance or download failure: roll back per §10 and record the evidence.
