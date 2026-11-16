# CR-DESIGN-2D — Release authorization record (Institutional Trust customer PDF)

**Status: STAGE A COMPLETE EXCEPT ONE OPERATOR CONFIRMATION; STAGE B PREPARED, NOT DEPLOYED. Release NOT complete.**

## 1. Founder authorization (2026-11-16)

**Authority.** Founder, PMF Strategy Inc. d/b/a SuperImmersive 8.
**Authorization date.** 2026-11-16.
**Accepted implementation.** `327a56d9` on `work/cr-design-2b`. It was rebased onto `main` for the release with every commit patch-identical (`git range-diff`). The release tree equals `327a56d9` plus only the release changes in §4.

**Founder decisions, as given in the authorization:**

| Item | Decision |
|---|---|
| F-2C-1 | Final templates and presentation contract: **approved** |
| F-2C-2 | Navigational wording: **approved** |
| F-2C-3 | Documented within-document shared-glyph limitation: **accepted** |
| F-2C-4 | Deferred maintenance items: **accepted** |
| F-2C-5 | Corrected fail-closed render queue: **approved** |
| F-2C-6 | Revised P3/P10 acceptance coverage: **approved** |
| F-2C-7 | Physical print verification: **deferred. Recorded as NOT PERFORMED, NOT PASSED**, and accepted as a residual release limitation |

## 2. Approved release identities (recomputed before activation; all match)

| Item | Identity |
|---|---|
| Schema 7, template v6 | `a0cd0c248ce270d2826712910aa606579ce429f7923b051d68a0502c5305f476` |
| Schema 8, template v7 | `5d7ccfc8ce824e57f6e904d51f1027b59e43ab250a7f4895b0f804debe1761ab` |
| Presentation contract `si8/creator-record-pdf-presentation` v1 | `aa50507b4f76e8168744d88645220735e8b7820577e7be72e19c83dbedc017db` |
| Generator | `creator-record-v2-pdf-v4` |

**How they were verified.** `test-support/cr-design-2b/verify-release-identities.ts` recomputes every identity from the registered Production bundle, through what `approvedPdfTemplates` selects at issuance. It reports no problems:
- schema 7 selects v6 and schema 8 selects v7, both approved;
- the presentation references match;
- v4 (`d4ecf3f3…`) and v5 (`a27e23cd…`) stay registered, superseded and unchanged;
- the generator is `-pdf-v4`.

## 3. Review references (recorded verbatim in the v6/v7 approvals)

| Field | Value |
|---|---|
| `authority` | `Founder, PMF Strategy Inc. d/b/a SuperImmersive 8` |
| `decision_date` | `2026-11-16` |
| `review_ref` (v6) | `CR-DESIGN-2D-RELEASE-AUTHORIZATION-20261116 v6; CR-DESIGN-2B-R2 final review package sha256 547fb2e4b37df5ff1d575cac622262a777ce284493bc727dbaf9edb13ba10487; CR-DESIGN-2C acceptance record at 327a56d9` |
| `review_ref` (v7) | the same, with `v7` |

## 4. Release builds

### D1 — Stage A pause (DEPLOYED)

**Commit.** `59f3ee26` on `main`. Vercel `si8-creator-portal` Production deployment succeeded at 2026-11-16T05:34:51Z.

**Change.** Only `CREATOR_RECORD_V2_SUBMISSIONS = 'stopped'`. New submissions, evidence intake, examination and purchase binding answer 503 `submissions_stopped`; issuance stays `'enabled'`.

**Verification:**
- `tsc` clean; `next build` exit 0.
- Full suite = the 24/89 baseline plus exactly 21 tests that pin the shipping state `'open'`. Each fails only on `'open'` versus `'stopped'`.

### D2 — Stage B cutover (PREPARED AND VERIFIED LOCALLY; NOT PUSHED)

**Commit.** Branch `release/cr-design-2d-d2` = `main` (`59f3ee26`) + the rebased accepted commits + the release commit.

**Release commit contents:**
1. **Cutover script.** `apply-design-cutover.py` (`C:\Users\User\SI8-review\cr-design-2d\`, SHA-256 `263ed84937b5910a089e297c3bfcba8818c8cd0d824caa0db80b8d24308c6b45`), applied with the §3 values:
   - v4/v5 → superseded;
   - v6/v7 registered approved, verbatim from the committed proposals;
   - generator `-pdf-v3` → `-pdf-v4`.

   The script was proven on throwaway copies to refuse a tampered v6 fingerprint, a non-approved base, a placeholder value and a second application.
2. **Submissions reopened.** `CREATOR_RECORD_V2_SUBMISSIONS = 'open'`.
3. **Release-test updates.** Each assertion that pinned v4/v5 as approved, `-pdf-v3`, or the template-set count now pins the released state, with v4/v5 asserted superseded and unchanged.
   - New helpers in `test-support/registered-template-sets.ts`: `DESIGN_CUTOVER_*` and `cutoverLiveSet`, following the existing first-cutover pattern.
   - The CR-DESIGN-2B comparisons render v4/v5 through `cutoverLiveSet`.
4. **Release verification scripts.** `verify-release-identities.ts` and `render-approved.tsx`.
5. **This record.**

**Verification (local):**

| Check | Result |
|---|---|
| `tsc` | clean |
| Full suite | **24/89, identical to the baseline test by test**; 9,811 passing |
| Customer-wording check | exit 0 |
| `next build` | exit 0 |
| Font tracing | all 9 font files traced and present for each of the four issuing routes |
| 13 review records rendered through the **registered** approvals (no synthetic approval) | v6 for schema 7, v7 for schema 8; every PDF passes the byte checks (disclosures, page numbers, bounds, overlap, obscured text, reserved bands, text, search) |

## 5. Stage A Production evidence (read-only, `supabase_read_only_user`, 2026-11-16)

**Before D1:**
- Q3 = Q4 = Q5 = 0.
- Q6: `_guard`, `_consent_guard` and `_product_guard` enabled.
- Q8 = 1 and Q10 = 3: the three accepted exception records only (`c84a50f6…`, `fd972639…`, `3351a856…`).
- Q9: `cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-14`.
- All products: no paid-but-not-completed row.
- Issued v2 artifacts: one each for `-pdf-v1`, `-pdf-v2` and `-pdf-v3`.

**After D1 (drain gate): PASS.**

| Condition | Count |
|---|---|
| Q3 | 0 |
| Q4 | 0 |
| Q5 | 0 |
| Paid not completed, all products | 0 |
| Pending artifacts, any product | 0 |
| New bindings today | 0 |
| Checkout sessions in the last 24 h | 0 |

**Previous Production deployment (rollback target for D1).** `4c88a8a4`, `si8-creator-portal` deployment `DfPvosxuytas3FENNB9LhziXRf5x`.

## 6. Gate requiring operator confirmation before D2 is pushed

**Production runtime and memory settings** are not readable from this environment: no Vercel credentials are available here.
- **Measured locally:** about 330 MB RSS settled; 0.2–0.4 s per PDF; `maxDuration = 60` s in code.
- **Operator:** in Vercel → `si8-creator-portal` → Settings → Functions, record the function memory (should comfortably exceed 330 MB; the platform defaults are 1 GB or more) and confirm Fluid compute and the maximum duration are as before.

Also: as a signed-in user, confirm that `/creator-record` now shows "Creator Record is not taking new submissions right now."

## 7. Not yet done (Stage B, UAT and closure)

- Push D2, deploy, and run the post-deployment checks (release plan §9).
- Production UAT (release plan §8), for both paths. It requires an **operator purchase** (single-use 100% comp code) and, for the document-reading path, an operator upload with AI examination.
- Engineering verifies the issued PDF bytes, provenance, delivery and historical preservation.
- The release is **not complete** until every mandatory Production verification gate passes.
