# CR-DESIGN-2C — Final acceptance record (Institutional Trust customer PDF)

**Status: DECISION-READY. NOT RELEASED. Awaiting the founder's approval (`02-FOUNDER-APPROVAL-RECORD.md`) and, separately, explicit founder release authorisation for CR-DESIGN-2D (`03-CR-DESIGN-2D-RELEASE-PLAN.md`).**

Production is unchanged:
- v4 (schema 7) and v5 (schema 8) are the approved template sets;
- the generator is `creator-record-v2-pdf-v3`;
- `origin/main` = `4c88a8a4` (docs only since Build B `0bec2dee`; rollback floor Build A `60b1d84d`);
- nothing was activated, deployed, merged or pushed.

**Physical print verification is PENDING OPERATOR ACTION** until the founder confirms it.

## 1. What is accepted, and on what evidence

**Implementation accepted for release preparation.** PM/Architecture accepted it for final release preparation (CR-DESIGN-2C), subject to founder approval, physical print verification and operational checks. The accepted implementation is commit **`eba9f52d`** on the local branch `work/cr-design-2b`:

| Commit | Content |
|---|---|
| `a6258d81` | 2B, work in progress |
| `f3c20eaa` | 2B |
| `6587dcd0` | R1 |
| `eba9f52d` | R2 |

All four are off `origin/main` `4c88a8a4`, which has not moved since. The reviewed artefact is `C:\Users\User\SI8-review\CR-DESIGN-2B-R2-Final-Review-Package.zip`, SHA-256 `547fb2e4b37df5ff1d575cac622262a777ce284493bc727dbaf9edb13ba10487` (verifies).

**2C engineering additions, on top of `eba9f52d` and committed with this record:**

| File | Purpose |
|---|---|
| `lib/creator-record/customer-pdf/presentation/render-queue.ts` | Bounded serialisation of presentation renders (task 4, §4) |
| `__tests__/creator-record/cr-design-2b.test.ts` | Queue and single-entry-point tests |
| `customer-pdf.test.ts` | Boundary allowlist entry for the queue module |
| `test-support/cr-design-2b/perf-check.tsx` | Performance observation (§3) |
| `test-support/cr-design-2b/fingerprint-check.ts` | Fingerprint verification (§2) |

None of these changes rendering output: the fingerprints and the reviewed PDFs are unchanged (§2).

**Accepted decisions (PM/Architecture, CR-DESIGN-2C):**
- the R2 presentation and panel placement;
- the remaining declaration spillover whitespace;
- the revised P3 and P10 coverage;
- the per-document glyph isolation architecture, in principle;
- the within-document shared-glyph limitation, retained subject to explicit founder acceptance;
- the legacy v4/v5 rare-character issue, recorded as deferred maintenance;
- D10 and all governance boundaries, preserved.

## 2. Final fingerprints, verified (task 2)

Every value below was recomputed from the code (`test-support/cr-design-2b/fingerprint-check.ts`). Each equals the committed proposal file, the R2 package README and implementation report, and the "Document layout fingerprint" printed inside each of the 13 R2 review PDFs: schema 7 cases print version 6 with the v6 value, and schema 8 cases print version 7 with the v7 value.

| Item | Version | SHA-256 | Status |
|---|---|---|---|
| Template set, schema 7 | **v6** | `a0cd0c248ce270d2826712910aa606579ce429f7923b051d68a0502c5305f476` | pending, authority `null`, registered nowhere |
| Template set, schema 8 | **v7** | `5d7ccfc8ce824e57f6e904d51f1027b59e43ab250a7f4895b0f804debe1761ab` | pending, authority `null`, registered nowhere |
| Presentation configuration `si8/creator-record-pdf-presentation` | **v1** | `aa50507b4f76e8168744d88645220735e8b7820577e7be72e19c83dbedc017db` | referenced by both sets |
| Base: approved v4 (schema 7) | v4 | `d4ecf3f39487ed43ce6c5e621d988d6525b638c952a8c5ead01e0cc9b8504f7e` | approved, live |
| Base: approved v5 (schema 8) | v5 | `a27e23cdbc1b12c16330b9518bba210b218bb0e8807e53ac164d6673ec873408` | approved, live |

Further checks:
- **Content.** v6 and v7 differ from v4 and v5 **only** in `version`, `presentation` and `navigation`. Every approved string is carried verbatim; the proposal builder reproduces both committed files exactly.
- **Fonts.** All 9 pinned font files match their configured SHA-256 (the values are in `presentation/institutional-trust.ts`).
- **Production references.** `governed/sources.ts` does not reference v6, v7 or the presentation contract, and `approvedPdfTemplates` returns v4 and v5.

## 3. Performance (task 3), lightweight observation only

**Method.** `test-support/cr-design-2b/perf-check.tsx`, run twice in fresh processes with GC exposed. Local machine (Windows x64, Node v22.17.0), the 13 synthetic review records. Second run:

| Measure | Result |
|---|---|
| Cold first render (font read, hash check, registration, parse) | 424 ms |
| Warm render, redesigned (13 records, 4–10 pages) | median 218 ms; p90 342 ms; max 372 ms (P13) |
| Warm render, today's v4/v5 on the same records | median 143 ms; max 335 ms (the redesign costs about 1.5× a fraction of a second) |
| Concurrent burst, 13 requests at once (serialised) | all done in 3.06 s; latency median 1.55 s, max 3.01 s |
| Queue wait in that burst | median 1.37 s, max 2.64 s |
| Memory | RSS 130 → 236 MB after warm-up and the sequential run (heap 101 MB); peak RSS in the burst 277 MB |
| Memory over 3 further full rounds | RSS 327.3 / 327.0 / 327.6 MB; heap 69.5 MB after GC: **no growth (no leak observed)** |
| Run 1 (GC not exposed) | same timings within about 5% |

**Implications for existing limits:**
- **Issuing routes** (`maxDuration = 60` s): one issuance renders one PDF, about 0.2–0.4 s locally, plus the 0.4 s cold start on a new instance.
- **Fulfilment sweep:** sequential, `SWEEP_BATCH = 10` per invocation, stops starting new work after `SWEEP_BUDGET_MS = 45 000`. Ten renders take about 3 s.
- **Fulfilment lease** (300 s) and the retry policy are unaffected.
- **Queueing** happens only within one server process. A burst of 13 simultaneous issuances on one instance adds at most about 2.6 s of wait locally, so contention at today's volume (every Production payment to date: US$0.00) is negligible.
- **Production hardware.** Vercel functions are typically slower than this machine. Even at 5× slower, a single issuance stays far below 60 s and a sweep of ten stays within its 45 s budget.
- **Memory.** About 330 MB RSS settled. Confirm it against the function memory setting during 2D preflight (configured in Vercel, not in the repository).
- **Conclusion.** No material problem was demonstrated, so no optimisation was started.

## 4. Glyph isolation and serialisation coverage (task 4)

**Single entry point.** The redesigned PDF is drawn in exactly one place:
- the only production caller is `lib/creator-record-flow/production.ts:160` → `renderCustomerRecordPdf`;
- a model with a presentation always goes to `renderPresentation`;
- `renderPresentation` primes the glyph characters and draws inside `withPresentationFonts`.

A model with a presentation is never drawn by the legacy component, and no other application module imports `InstitutionalTrustPDF`. A new static test enforces all three facts. The review harness's separate layout pass (`test-support/`) is test-only.

**Failure releases the queue.** Before 2C, a rejected render already released the next one. A render that **never settled** would have held the queue for the life of a reused server instance, making every later issuance on that instance wait until its own 60 s timeout. That is "blocking indefinitely", so it is corrected:

- **Mechanism.** `presentation/render-queue.ts` releases the next render when the previous one settles (resolves, rejects or throws synchronously), **or after `PRESENTATION_RENDER_HOLD_MS` = 30 s, whichever is first.** The hold timer is `unref`'d, so it never keeps a process alive.
- **Trade-off.** A render that finishes after its 30 s hold could, in principle, have its own text layer affected by the next document's priming, and only for characters that share a glyph. Its drawing and the next document are unaffected. 30 s is about 80× the slowest observed render.
- **Tests** (`cr-design-2b.test.ts`, "presentation render queue"):
  - one render at a time, in arrival order;
  - a rejected and a synchronously thrown render release the next one at once, and their errors reach their callers;
  - a never-settling render releases the next after the hold;
  - the hold is below 60 s;
  - the single-entry-point static check.
- **Glyph isolation regression** (R2, re-run): 10 sequential and 10 concurrent renders keep exact Unicode text; the uncorrected control fails as required.

## 5. Unchanged MVP boundaries (task 7)

`git diff 4c88a8a4..eba9f52d` and the 2C work touch only:
- the customer-PDF presentation renderer and its fonts (`lib/creator-record/customer-pdf/`);
- the two pending proposal files;
- the CR-DESIGN-2B/2C tests and test support;
- implementation documents.

Unchanged, file for file:

| Area | Files |
|---|---|
| Governed sources | `governed/sources.ts` |
| Approved inputs and the submissions switch | `customer-flow/approved-inputs.ts` |
| Renderer registry and generator | `creator-record-artifacts/renderers.ts` (`creator-record-v2-pdf-v3`) |
| Customer wording | `creator-record-flow/customer-wording.ts` |
| Authorisation versions | `creator-record-flow/authorization-versions.ts` |

Identifier occurrences are identical before and after:
- Terms `terms-2026-11-14`;
- privacy `privacy-2026-11-09`;
- AI permission `cr-v2-ai-permission-1`;
- `CREATOR_RECORD_V2_SUBMISSIONS`;
- `creator-record-v2-pdf-v3`.

Also untouched:
- record schemas, the questionnaire, Source Text, the ledger and registry;
- Living Knowledge, guidance selection and the examination pipeline;
- eligibility, checkout, issuance, consent and migrations.

The MVP product boundary (PRD MVP scope §12) is unchanged. D10 is preserved: readings print only in section 6, on the reading-register pages, and the `readiness_layout_refused` guards still refuse.

## 6. Verification run for this record

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| PDF suites (`cr-design-2b`, `customer-pdf`, `customer-pdf-schema8`, `readiness-summary`) | 170 tests passing |
| `next build` (inert placeholder environment values) and the full regression suite, after the 2C change | see §6a |
| Customer-wording check | exit 0 (R2; no wording file changed since) |
| Font tracing (R2 build) | all 9 fonts present for each of the four issuing routes |

### 6a. Build and full suite after the 2C change

| Check | Result |
|---|---|
| `next build` | **exit 0** |
| Font tracing | all 9 font files traced and present for each of the four issuing routes (`/api/webhooks/stripe`, `/api/internal/payment-fulfillments/sweep`, `/api/admin/payments/[sessionId]/reconcile`, `/api/admin/submissions/[id]/generate-creator-record`) |
| Full regression suite | **24 failing suites / 89 failing tests**, the same failing set as the recorded baseline (compared test by test; no new failures, none fixed); 9,801 passing (+5 for the new queue tests) |

## 7. Known limitations and deferred items (carried into the founder record)

1. **Within-document shared glyph.** One document that prints two characters drawn with the same glyph (for example ʼ U+02BC beside approved ’ U+2019) can name only one of them in the text layer. The more frequent character is kept, the clash is reported, and the drawing is unaffected. Retained subject to founder acceptance.
2. **Legacy v4/v5 rare-character text layer.** The Noto fallback in the Production renderer has the same shared-glyph behaviour for rare characters. Deferred maintenance; Production is not changed.
3. **Long cards.** A split card is drawn to the page foot (library behaviour), and there is no "(continued)" header.
4. **Declaration spillover pages** before the reading register.
5. **No tagged PDF** (PDF/UA).
6. **One reader verified (MuPDF).** Other viewers and screen readers are untested.
7. **Physical print verification** — pending operator action.
8. **Wording maintenance (FD-11)** — deferred, as decided earlier.
