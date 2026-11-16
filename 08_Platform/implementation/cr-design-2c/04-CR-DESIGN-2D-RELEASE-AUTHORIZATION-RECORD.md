# CR-DESIGN-2D — Release authorization record (Institutional Trust customer PDF)

**Status: RELEASED AND CLOSED (2026-11-16).** Stage A and Stage B are deployed; Production UAT passed PM/Architecture acceptance, and every mandatory engineering verification gate passed (§8, §9). Sections 4–7 below were written before deployment and are kept as history.

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

## 8. Stage B deployment and post-deployment checks (2026-11-16)

**Operator confirmation (before D2):**
- Vercel `si8-creator-portal`: Fluid Compute enabled, Standard CPU (1 vCPU), 2 GB memory, region `iad1`; no configuration change.
- The live pause message was displayed.

**Duration check.** The dashboard shows no maximum duration; engineering verified the routes instead.
- `maxDuration = 60` is set explicitly on `/api/webhooks/stripe`, `/api/internal/payment-fulfillments/sweep` and `/api/admin/payments/[sessionId]/reconcile`.
- `/api/admin/submissions/[id]/generate-creator-record` sets none (platform default). This is unchanged.
- 60 s is within the Hobby plan's limits, and the same configuration already deployed.
- D2 changes no runtime configuration file: `next.config.js`, `vercel.json`, package files, middleware or route files.

**Drain refreshed immediately before D2: PASS.**

| Condition | Result |
|---|---|
| Q3, Q4, Q5 | 0 |
| Q6 guards | 3 enabled |
| Q8 | 1 (the accepted exception) |
| Paid not completed | 0 |
| Pending artifacts | 0 |
| Checkout sessions in the last 24 h | 0 |

**D2 deployed.** `f97429a4` fast-forwarded onto `main` from `59f3ee26`. Vercel `si8-creator-portal` Production deployment `BSws4fCapgBriHwdUjL35iXkREZX`, success at 05:49:04 UTC.

**Post-deployment checks: PASS.**
- **Identities** recomputed on the deployed commit: schema 7 → v6 `a0cd0c24…`, schema 8 → v7 `5d7ccfc8…` (both approved); presentation `aa50507b…`; generator `creator-record-v2-pdf-v4`; v4/v5 superseded and unchanged.
- **Production state:** Q3/Q4/Q5 = 0; Q6 guards enabled; AI-permission authority unchanged.
- **Historical artifacts:** the three issued before the release are unchanged in hash, size and update time, with their objects present (Q2).
- **Live app:** it responded normally.

## 9. Production UAT and final engineering verification (2026-11-16)

**Both records are operator UAT purchases.** They used single-use 100% complimentary codes and **must be excluded from customer and commercial traction metrics** by record ID: CR-2026-0454615D and CR-2026-AA5D2711. As at the MVP UAT, their `uat` column is `false`; the records are not modified.

**These purchases do not validate nonzero payment collection.** Every Production payment to date, including these two, collected US$0.00.

**PM/Architecture accepted the content and visual presentation of both PDFs.**

| | UAT 1 | UAT 2 |
|---|---|---|
| Record | CR-2026-0454615D | CR-2026-AA5D2711 |
| Schema / template | 7 / v6 `a0cd0c24…` | 8 / v7 `5d7ccfc8…` |
| Presentation | `aa50507b…` | `aa50507b…` |
| Pages | 5 | 8 |
| Documents | none | one synthetic Runway receipt (SHA-256 `f9e49519…`), freshly examined |
| Artifact | `6d9c6527…`, `creator-record-v2-pdf-v4`, issued 05:57:00 UTC | `d4f58e08…`, `creator-record-v2-pdf-v4`, issued 06:07:30 UTC |
| PDF SHA-256 / size | `d4a0ba469e1c485119ee4659ddda11092a6d23753bead53c4d5bc8d6a5f8f925` / 63,509 | `41aa0ffa98ef724aa1f94626714b7b8321633f4c60c8a94631a02245e0fd10f7` / 82,646 |
| Artifacts per order | 1 | 1 |
| Payment rows | 1: subtotal US$29.00, discount US$29.00, total US$0.00; one Stripe event; one attempt | the same |
| Fulfilment / PDF / email | completed / completed / accepted; anomaly `none` | the same |

**Checks on both records:**
- **Stored PDF integrity.** The stored object exists at the recorded size. The PDF the operator downloaded hashes to the recorded SHA-256 (delivery re-verifies the hash before serving), and UAT 2 also equals the operator's independent calculation.
- **Template identity.** Each PDF prints its template version and fingerprint ("Document layout version 6/7"), matching its schema's approved set.
- **Complete byte checks** (`verify_pdf_bytes.py`) on the downloaded Production PDFs, with expectations rebuilt from each stored record (whose SHA-256 matched its recorded digest) through the approved templates:
  - UAT 1: 5 pages, 161 printed strings, 5 search probes;
  - UAT 2: 8 pages, 256 strings, 6 probes;
  - **all pass**: complete running disclosures and correct page numbers on every page, bounds, overlap, obscured text, reserved bands, complete in-order text and search.

**Fresh AI examination (UAT 2):**
- **Attempt:** `52733653…`, live model (Anthropic `claude-sonnet-5`, receipt profile v1, `receipt-extraction-v2` / `receipt-prompt-v2`), outcome `examined`, executed 2026-11-16 06:05:56 UTC. Envelope `5d899bb05872…`, the reading reference printed in the PDF.
- **Permission:** granted 06:05:46 UTC, before execution, under the current authority `cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-14`.
- **Cost reservation:** `11bf98d2…`, settled 06:05:58 UTC, charging 14,836 micro-USD against 138,720 reserved.
- **Access:** exactly one document-access event (`live_examination`, owner); no replay run.
- **Linkage:** the document is the one in the record (same document ID and SHA-256), and the attempt belongs to the order's own user.

This closes the MVP qualification "fresh AI examination under the revised Terms was not exercised" (PRD MVP scope §12.3, item 1).

**D10 (UAT 2): PASS.**
- **Guidance selection.** Guidance was selected only from the declared tool (`runway-gen3`, question T1). Its guidance item (`CLAIM-RUNWAY-COMMERCIAL-USE-001-v1`) is field-for-field identical to the document-free UAT 1: applicability `met`, conclusion `relevant_on_declared_facts`, explanation, caveats, dependencies and provenance. Only the record's own observation ID differs.
- **Comparison** withheld (`not_assessed` / `determination_withheld`).
- **Placement in the PDF.** The reading's values (plan "Standard", the receipt reference) print only on pages 5–6, the reading-register pages of section 6. The declared plan "Pro" and "What you told us" sit on pages 2–3. None of the reading's values appears outside section 6 in the document model.

**Historical artifacts.**
- CR-2026-719228D9 (`-pdf-v1`), CR-2026-8D1022F5 (`-pdf-v2`) and CR-2026-7E82CA09 (`-pdf-v3`) are unchanged in hash, size and update time, with their stored objects present.
- The delivery path is unchanged by the release: `deliver.ts`, `store.ts` and the PDF route.
- The copies downloaded before the release hash to the recorded values.
- A live re-download after the release was not separately exercised.

**Final Production state: PASS.**

| Item | Result |
|---|---|
| Q3, Q4, Q5 | 0 |
| Paid not completed | 0 |
| Pending artifacts | 0 |
| Live attempts not examined since the release | 0 |
| Unsettled reservations | 0 |
| v2 artifacts by generator | `-pdf-v1` 1, `-pdf-v2` 1, `-pdf-v3` 1, `-pdf-v4` 2 |
| Guards | enabled |

**Evidence.** Kept privately (not in the repository) at `C:\Users\User\SI8-private-evidence\creator-record-v2\cr-design-2d-uat\`: both PDFs, their stored records, the byte-check expectations and results, the model checks, and the one-off verification script.

## 10. Closure

**CR-DESIGN-2D is released and closed (2026-11-16).** Production runs `f97429a4`; later commits are documentation only.

**Still in force:**
- **Physical print verification (F-2C-7):** NOT PERFORMED, NOT PASSED (accepted residual limitation).
- **Within-document shared-glyph limitation** (F-2C-3).
- **Deferred maintenance (F-2C-4):**
  - the legacy v4/v5 rare-character text layer;
  - "(continued)" headers;
  - declaration spillover pages;
  - tagged PDF (PDF/UA) and viewers other than MuPDF;
  - the FD-11 and earlier wording maintenance, including the legacy comparison wording.
- **No nonzero payment collected:** nonzero payment collection has not been validated.
- **Earlier MVP qualifications:** still in force, except the fresh-examination gap closed above.
