# SI8-UX-2 — Controlled release plan (NOT EXECUTED)

**Status:** prepared for a separate Production release authorization. Nothing here has been run. Invitation-only access is retained
throughout. Follows the CR-DESIGN-2D pattern (D1 pause → drain gate → D2 release → admin UAT → reopen).

## Release candidate

| | |
|---|---|
| Branch | `work/si8-ux-2` (local; not pushed) |
| Candidate | `8ec47a16` (approvals recorded in `a4fae119`, ref `JD-SI8-UX-2-R2-20261116`) |
| Base | `29919c57`. `origin/main` is now `bc18fee4` (a weekly marketing digest, `02_Marketing/intelligence/*` only, no overlap), so integration is a plain rebase. |
| Current Production | Vercel `si8-creator-portal` deployment `Ck2KQgd95mKUdXH1W8JRYxNk14vA` (`bc18fee4`; application code identical to the CR-DESIGN-2D release `f97429a4` / `29919c57`) |

## Read-only Production state (2026-11-16 15:36 UTC, `supabase_read_only_user`)

| Check | Finding |
|---|---|
| Unpaid preparations (latest version per draft) | **Non-admin:** 1 draft, a confirmed schema 6 version from 2026-11-04 (test era), never purchased; already ineligible under existing policy (no questionnaire contract). **Admin:** 1 unconfirmed schema 8 version from 2026-11-11 under the superseded v8/contract v3 approvals; 5 older confirmed versions (schemas 5–8) under even earlier approvals, all already ineligible. |
| Confirmed but unpaid | As above: 1 non-admin (schema 6) and 5 admin, all already ineligible before this release. |
| Open Checkout sessions | None possible from the v2 flow: every v2 submission (5) is paid; a v2 Checkout session is created only from a submission row. The Stripe dashboard itself was not inspected. |
| Paid but unissued | **0** (all 5 paid v2 submissions have an issued artifact) |
| Fulfilment / reconciliation | `payment_fulfillments`: 7 `completed`, 1 `not_required`; **0** `needs_reconciliation` |
| Active examinations / cost reservations | **0** unsettled of 3 reservations (1 in the last 24 h, settled) |
| Storage consent identity | Documents recorded under `cr-v2-storage-consent-1__privacy-2026-11-09__terms-2026-11-14` (1), `…terms-2026-11-09` (2), and a historical draft identifier (2). The candidate derives exactly `cr-v2-storage-consent-1__privacy-2026-11-09__terms-2026-11-14`. |
| AI permission identity | Authority row: exactly 1, `cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-14`. The candidate derives exactly the same string, so the row needs no change and current grants stay valid. |
| Consent withdrawals | 0 |
| Historical artifacts | 7 issued; 0 missing a fingerprint, size or path; 0 missing their stored object. v2 generators: pdf-v1, v2, v3, v4 (×2). |
| Storage access | `creator-records`, `documents` and `creator-record-evidence` buckets private (public: only catalog thumbnails and videos, unrelated) |
| Invitation-only | `creator_record_v2_pilot_access`: 1 row, the admin; 0 non-admin |
| Live gates (anonymous HTTP) | `/creator-record` → 307 to login; `/auth/signup` 200; evidence API 401; PDF download API 401 |
| Release switches | `CREATOR_RECORD_V2_SUBMISSIONS='open'`, `CREATOR_RECORD_V2_ISSUANCE='enabled'`, `CREATOR_RECORD_ARTIFACT_ROLLOUT='all'`, as confirmed by the operator at CR-DESIGN-2D. **Not re-verified** (no Vercel environment access from this session); the operator must confirm at cutover. |

**Recovery path for existing unpaid preparations.** Nothing is deleted, rewritten or regenerated:

- **The only version affected for the first time** is the admin's unconfirmed 2026-11-11 schema 8 version (v8 / contract v3).
  After cutover:
  - it remains stored and readable, but cannot be paid for;
  - on the admin UAT page it can be reopened and "Correct my answers" used: the earlier answers are shown for reference (another
    contract); the admin re-enters them; a new version is prepared under v10 / contract v4;
  - its documents (if any) return needing an explicit choice.
- **The non-admin schema 6 version** was already non-purchasable; the user has no invitation, so there is no customer path to
  recover it or need to.

## Sequence

### R0 — Before the window (read-only)
1. Release authorization recorded.
2. Rebase `work/si8-ux-2` onto `origin/main`, then re-run tests, build and browser harness on the rebased commit (expected: baseline
   24/89, build exit 0, 113/113).
3. Operator confirms the Vercel switches and that Production is `Ck2KQgd9…`.

### R1 — Pause
1. Operator sets `CREATOR_RECORD_V2_SUBMISSIONS='stopped'` and redeploys the **current** commit (as CR-DESIGN-2D D1). This stops
   preparation, uploads, examination and purchase; downloads continue.

### R2 — Drain gate (read-only, must all hold)
- 0 paid-unissued v2 orders;
- 0 `needs_reconciliation`;
- 0 unpaid v2 submissions (no checkout can complete across the cutover);
- 0 unsettled examination reservations;
- the permission authority row unchanged;
- invitation list unchanged.

### R3 — Release
1. Push the rebased candidate to `main` (fast-forward; no force).
2. Vercel builds; `next build` runs the wording guard.
3. Confirm the deployment succeeded.
4. Keep `SUBMISSIONS='stopped'` until the UAT passes.

### R4 — Admin-only Production UAT

Under the existing admin UAT exception (the submissions stop does not apply to the admin UAT page), with synthetic content:

- **Path A:** one tool, no documents, through review, a 100% single-use comp code, issuance and owner download.
- **Path B:** two tools, a previously uploaded and a new document, live examination with AI permission, tool removal and relinking,
  review with the separate reading view, a reading response, purchase, issuance and download.
- **PDF:** byte checks on both PDFs (`verify_pdf_bytes.py`).
- **Embedded approvals:** the issued records embed Source Text v9/v10 and contract v4.
- **Historical access:** download one pre-release v2 record and one legacy record; compare the bytes with the stored fingerprints.
- **Exclusion:** mark the UAT records so they are excluded from traction (as before).

### R5 — Reopen

Reopen only when all hold:
- R4 passed and PM/Architecture accepted it;
- no reconciliation items;
- historical downloads verified;
- the permission authority row unchanged.

Then the operator sets `CREATOR_RECORD_V2_SUBMISSIONS='open'` and redeploys. **The invitation gate is unchanged** (public access is
CR-PUBLIC-1, separately).

## Rollback

- **Target:** redeploy the previous Production deployment `Ck2KQgd95mKUdXH1W8JRYxNk14vA` (or `9CRTHAUHiZ5Mhxavg2RQATMKbwxF`; same
  application code). Never below Build A `60b1d84d`.
- **Compatibility:**
  - rolling back restores the earlier wording identity and approvals together;
  - versions prepared under v9/v10/contract v4 become non-purchasable, so pause and drain before a rollback too;
  - issued records and downloads are unaffected either way;
  - no database or migration change is involved, so rollback is application-only;
  - the permission authority row and grants are valid in both states (the id-based strings are identical).

## Not part of this release

Public access (CR-PUBLIC-1), the dashboard and marketing redesign, PDF templates or generator, pricing.
