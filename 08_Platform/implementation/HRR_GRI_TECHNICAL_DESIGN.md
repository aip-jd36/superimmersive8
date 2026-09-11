# HRR V1 / Governed Research Interface — Technical Design

**Status:** `CAH-4G.10 SLICE A — CLOSED / PRODUCTION-PROVEN` · `CAH-4G CONVERSATIONAL HRR — VISIBLE THREAD PRODUCTION-PROVEN / BOUNDED CONVERSATIONAL CONTEXT NOT STARTED` · `CAH-4G.11 — FOLLOW-UP DISCOVERY / ARCHITECTURE VALIDATION — DESIGN / EVIDENCE COLLECTION` (`HRR_FOLLOWUP_DISCOVERY.md`; Slice B remains NOT STARTED / NOT AUTHORIZED pending its evidence threshold) (CAH-4G.10C, 2026-09-11) — a PM-performed authenticated production UAT against the internal synthetic fixture `CA-RLK-2a PROD SMOKE` / `ASSESS-007-2026-09-07` passed all 10 acceptance checks (successive turns append; composer clears; tab-switch + inspector close/reopen preserve the thread; workbook navigation clears it per the V1 client-memory contract; "Clear conversation" resets client-only; assessment state unaffected) — full evidence: `HRR_CONVERSATIONAL_ARCHITECTURE.md §FF`. **Closed = the VISIBLE thread only.** Bounded conversational context / follow-up referent resolution (Slice B) remains **NOT STARTED, not PM-authorized**; each question is still researched fully independently. Non-blocking observations recorded (thread density, duplicate question echo, a future navigation-persistence product question) — none are Slice-A defects, none fixed here (`§HH`). **Slices 1–7 COMPLETE** (CAH-4G.1…CAH-4G.7, 2026-09-10); merged to `main` (`0413291`, fast-forward) and deployed to `app.superimmersive8.com` (CAH-4G.8). **CAH-4G.10P (2026-09-11) — deployed-source reconciliation (resolved by CAH-4G.10I, then production-proven by CAH-4G.10C):** an authenticated production UAT observed the OLD single-turn behaviour (a second question replaces the first; composer keeps its text; heading "Governed research response"; button "Clear"). Root cause proven = **DEPLOYMENT GAP**, not an implementation defect: the CAH-4G.10 Slice A commits (`bea6f2d` feat + `f4d33ec` docs) live only on the local branch `work/cah-4f-reviewer-resources` — they are on **no origin ref**; `origin/main` (`f8a4a12`) carries the pre-Slice-A `ReviewerLkLookup.tsx` **byte-identical to `bea6f2d^`** and has **no `hrr-thread.ts`**. Production (Vercel `si8-creator-portal`, `main`) therefore cannot contain Slice A. Next step: integrate the reviewed commits to `main` (see `HRR_CONVERSATIONAL_ARCHITECTURE.md §BB`). **CAH-4G.10 (2026-09-11) — Slice A implemented + reviewed LOCALLY (GO for integration), not pushed/merged/deployed:** HRR is now VISIBLY conversational — successive research turns are append-only and stay on screen (`app/admin/submissions/[id]/review/hrr-thread.ts`, a local pure reducer; `ReviewerLkLookup` rewritten to `useReducer`). NOT yet CONTEXTUALLY conversational: every free-form question is still classified independently from its own text alone; no `prior_context`; no prior turn reaches the classifier / retrieval / applicability / BI / composition / audit. Server route, `runHrrResearch`, model-call budget (topic 0 / free-form ≤1), audit, and CRC are byte-unchanged; `tsc` clean, `next build` exit 0, full-suite failing set byte-identical to a fresh `08f20e9` baseline (zero new failures). Full as-built: `HRR_CONVERSATIONAL_ARCHITECTURE.md §BB`. **CAH-4G.9 (2026-09-10) — DESIGN ONLY, no runtime code:** PM production UAT confirmed PASS on the initial surface, topic shortcut, `copyright_ownership` response, unresolved `copyrightability`, free-form NL classification, and the semantic/authority boundaries exercised — but found the **single-turn model too visible** (asking a second free-form question replaces the first; reviewers expect a conversational research thread). CAH-4G is therefore **not yet `CLOSED / PRODUCTION-PROVEN`** — not an unsafe defect, not a rollback, a material V1 research-experience gap. The conversational-research architecture is designed in **`HRR_CONVERSATIONAL_ARCHITECTURE.md`** (decision: `ADR-003-hrr-conversation-context.md`): the visible thread is client-only UI; the follow-up classifier gets a **bounded enum-only `{topic, scope, bi_status}` referent**, never the transcript; one-model-call ceiling preserved; no persistence, no audit change, no schema/migration, no CRC change; CRC's own `buildUserMessageContent` (bounded `[Context:]` lines, never transcript-to-LLM) is the precedent. **This amends §N (OQ-6).** Implementation = Slices A→B→C, none begun. **CAH-4G.7P (2026-09-10):** the full 19-commit CAH-4G series was rebased onto `origin/main` (`eb4641f`) — `git range-diff` shows all 19 commits patch-identical (`=`), no conflicts (zero file overlap with the Firefly/Veo drift); post-rebase `tsc` clean, `next build` exit 0, full-suite failing set **byte-identical to a fresh `eb4641f` baseline** (77 failing on both — the pre-existing `runway-gen3` cascade — zero new failures; +295 new passing / +2 CRC suites run identically). The rebased HEAD (`e6ddc35`, later `261debf` with the 7P doc) was pushed to **`origin/work/cah-4g-current-main-integration`** (new branch, no force; `origin/main` untouched) to enable a Vercel Preview. Preview credentialed UAT was blocked by a known Cloudflare Turnstile issue in Preview mode. **CAH-4G.8 — Controlled Production Integration (2026-09-10):** PM authorized a controlled production deployment for internal synthetic UAT (no active customer Commercial Assurance work; production not in customer use). `origin/main` had advanced `eb4641f → 9219496` (+5 commits — all NY GBL §396-b synthetic-performer-disclosure Living Knowledge governance: one overlapping test file `wave1-candidate-claims-excluded.test.ts`, non-overlapping hunks, clean rebase; plus a **new `likeness`-topic reviewer-eligible governed claim `CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1`** in `TOPIC_CLAIMS_FIXTURE`, jurisdiction-scoped `jurisdiction == 'New York'`). The 20-commit series was re-rebased onto `9219496` — `git range-diff` all `=`, no conflicts; `tsc` clean; full-suite failing set **byte-identical to a fresh `9219496` baseline** (20 suites / 77 tests failing on both — pre-existing `runway-gen3` cascade — **zero new failures**; +295 passing); `next build` exit 0 with the HRR route present. **Fast-forwarded `main` `9219496 → 0413291` (no force)** and pushed. Production deployment on `app.superimmersive8.com` verified by route topology: `POST /api/admin/submissions/[id]/reviewer-lk/research` → `401 {"error":"Unauthorized"}` (exact CAH-4G contract, `X-Matched-Path` confirms the parametric route), `GET` same path → `405`, legacy `GET /api/admin/submissions/[id]/reviewer-lk` → `404` (retired in Slice 7). **The authenticated production browser UAT (Phases 7–21), the bounded live classifier eval (Phase 16), and the production audit-DB proof (Phase 17) were NOT performed — the Claude Chrome extension is not connected to this session (`list_connected_browsers` → empty), and this environment has no admin/reviewer credential, no `ANTHROPIC_API_KEY`, and no audit-DB access.** These remain the outstanding gates before CAH-4G can be marked `CLOSED / PRODUCTION-PROVEN`. **Behaviour note for the UAT operator:** `likeness` is no longer an empty-coverage topic — for a non-New-York synthetic assessment the NY §396-b claim resolves applicability-unmet (`does_not_apply[]`) rather than `outside_current_coverage`; Phase 14's "outside coverage" check should use a topic that genuinely has zero reviewer-eligible claims, or expect the applicability-unmet rendering. Sections A–R are the design narrative; **§S/§T/§U/§V** are the binding implementation contract. **The Living Knowledge tab is the converged Governed Research Interface: topic shortcuts + Ask HRR both POST `/api/admin/submissions/[id]/reviewer-lk/research` → `runAuditedHrrResearch()` (audit-before-content, fail-closed) → one `HrrResearchAnswer` → one `<HrrResearchAnswerView>`. Single-turn; raw question never persisted. The legacy `GET .../reviewer-lk` topic route is RETIRED (CAH-4G.7 — its fail-closed audit contract transferred to `hrr-research-route.test.ts`). CRC unchanged.** **Not `CLOSED` / `PRODUCTION-PROVEN` — the code is merged and production-deployed, but an authenticated production visual UAT and the live classifier eval have not happened (blocked on browser/credential access in this session, not on any defect). Slice 7 performed a server-rendered-markup composition-quality review (real components + real pipeline data, not an auth browser session — no safe preview/local path exists in the build environment), applied renderer-only consultative hardening (CAH-4G.7 `fix` commit), retired the dead legacy route, kept `HRR_MAX_RESOLVED_TOPICS = 2`, and left the live classifier cost/quality eval as a preview/production UAT item.**

**CAH-4G.1 amendments (2026-09-10), incorporated below:** (1) Slice 1 shipped `BiIntent` + `userGoalsToBiIntents` with a proven byte-for-byte CRC regression; the `BiResult` result-side adapter is **deferred to the HRR-runtime slice** (no Slice-1 consumer). (2) The **mixed-intent authority rule is corrected**: a single utterance may carry multiple semantic intents; the authority gate routes each independently; an assessment-decision intent is declined; every explicitly-supported research clause survives with **its own scope** (usually `informational`) and is **not** converted to `determination_request` by the presence of the decline request. See §C, §D, §S-5, §S-7, §T-2, §T-5, §V-6.

**CAH-4G.2 as-built (2026-09-10), incorporated below:** Slice 2 shipped `interpret-research-intent.{ts,anthropic.ts,mock.ts}` + `hrr-authority-gate.ts` + the `ExplicitResearchIntent` / `PermittedResearchIntent` / `ReviewerResearchTopic` types in `reviewer-lk/types.ts`. The classifier is **intent entry only** — it does not retrieve, evaluate applicability, run BI, or compose an answer. Deviations from frozen prose: (a) `thinking` is **disabled** on the classifier call (the extractor's own later milestone concluded this is better for a pure classification task; frozen §C/§O said "no `thinking`" meaning "not enabled" — disabling is strictly stronger); (b) the **HRR→`BiIntent` adapter is deferred to Slice 3** (the converged pipeline). No synthetic `UserGoal` anywhere.

**CAH-4G.3 as-built (2026-09-10), incorporated below:** Slice 3 shipped the converged pipeline in a **NEW `lib/hrr/` directory** (`run-hrr-research.ts`, `bi-adapters.ts`, `types.ts`) — the CAH-4G convergence layer, the one place allowed to import BOTH `lib/reviewer-lk/` selection AND `lib/bounded-interpretation/`. `lib/reviewer-lk/**` stays the deterministic reviewer-LK authority surface with its no-BI firewall intact; `lib/bounded-interpretation/**` stays pure. Key decisions: **(1) `BiResult` INTRODUCED** — the minimal 6-field result contract, `source_fact` kept nested so a CRC `RetrievalResult` structurally satisfies `BiResult[]` with **zero CRC call-site / test change** (byte-for-byte behavior-neutral, proven); `reviewerClaimToBiResult` builds it from a `ReviewerLkClaim` with **no synthetic field**. **(2) `researchIntentToBiIntent`: `intent_text` is the FIXED topic label, NOT the raw reviewer question** (a safety refinement of the frozen §H proposal — BI's `goal_text` for HRR is the topic being researched; the raw question flows entirely separately as `HrrResearchResult.attributed_question`, never entering BI). **(3) `not_met` applicability claims are excluded from the BI feed** and returned in a separate `does_not_apply[]` — verified against `evaluateApplicabilityDetailed` source. `runHrrResearch()` is PURE (no DB, no audit, no model, no I/O) and returns a **structured internal result**, not the final answer.

**CAH-4G.3A semantic correction (2026-09-10), incorporated below — CONDITIONAL PASS of Slice 3 resolved.** Slice 3's first cut fed an applicability-`unresolved` claim into BI with `diagnostics: []`, so BI (whose unresolved-applicability detection was CRC-diagnostic-driven) classified it `directly_relevant` — an overly strong conclusion past what deterministic applicability had already established. **Fix:** a small **generic** result-side signal — `BiResult.applicability?: { status: 'established' | 'unresolved'; unresolved_requirements? }` (an *upstream semantic fact*, never a channel policy; reuses `ApplicabilityRequirement`; optional, so a CRC `RetrievalResult` still structurally satisfies `BiResult` and CRC is byte-unchanged). BI's existing Case-3B trigger widened from "has project dependencies" to "has project dependencies **OR** `applicability.status === 'unresolved'`" → status `relevant_applicability_unresolved`, governed proposition still visible + verbatim, unresolved requirement(s) preserved. **No new BI status; no composition workaround; no CRC change; no applicability re-evaluation.** The durable principle (§H, `ADR-002`): *deterministic applicability is an upstream semantic input to Bounded Interpretation; a proposition with unresolved applicability must not be interpreted as directly relevant merely because a channel lacks a CRC diagnostic. Composition cannot repair an overly strong BI result.*

**CAH-4G.5 as-built (2026-09-10), incorporated below:** Slice 5 shipped the HRR audit boundary as **Option A — the existing `lk_research` access contract reused UNCHANGED, NO migration** (a deviation from the frozen Option B — see §K). `lib/hrr/project-hrr-audit-record.ts` (PURE: `projectHrrAuditRecord` returns `{actorUserId, submissionId}` when governed research occurred, `null` otherwise; reads nothing from the question or the answer). `lib/hrr-audit/run-audited-hrr-research.ts` (the one impure boundary: pure pipeline → `projectHrrAuditRecord` → `await recordReviewerLkAccess` **throws `HrrAuditNotRecordedError` on failure** → answer returned only on success). Authority-only / unsupported → **no audit event**; multi-topic / mixed → **one row per reviewer action**; raw question never persisted / hashed; applicability / BI status / claim ids deliberately not persisted. No route, no UI. Full suite byte-identical failing set vs baseline `2421749`; `tsc` clean; `next build` exit 0.

**CAH-4G.4 as-built (2026-09-10), incorporated below:** Slice 4 shipped `lib/hrr/project-hrr-research-answer.ts` — `projectHrrResearchAnswer(HrrResearchResult) → HrrResearchAnswer`, **deterministic, no model call**. `HrrResearchAnswer` / `HrrAnswerTopic` / `HrrGovernedConsideration` / `HrrApplicabilityRollup` / `HrrUnresolvedInput` added to `lib/hrr/types.ts`. The complete authored-prose set is one exported enumerable constant (`HRR_ANSWER_TEMPLATES`); a grounding test reconstructs every module-authored string from it. Two structurally-separate lanes (`assessment_authority_note` / `topics`); per-topic consultative hierarchy A–G as the field order; `determination_declined` topics carry only the refusal + boundary + refs; `relevant_applicability_unresolved` is wording-locked away from established/resolved/satisfied/cleared/compliant/sufficient; ordering is deterministic input order (no governed materiality signal — a documented limitation). **No `rules.ts` / CRC-composition change (Phase 21 boundary held). No route, no UI, no audit.** Deviation from the §J sketch: the single `what_lk_does_not_establish` string became the richer `orientation` (A) + `boundary_note` (F) + `unresolved_inputs[].note` (D) fixed-template set; `withheld` moved per-topic; location is `lib/hrr/` not `lib/reviewer-lk/`.

**CAH-4G.7 as-built (2026-09-10):** Slice 7 = the acceptance / hardening / integration closeout. (1) **Visual review** — with no authenticated preview/local browser path available in the build environment, the 7 §V cases were server-rendered from the real components + the real deterministic pipeline and reviewed for structure/density/wording. (2) **Composition hardening (renderer only, `HrrResearchAnswerView.tsx`)** — the review found the `relevant_applicability_unresolved` answer buried its point behind the BI-joined governed reading and re-stated `jurisdiction`/`ref` 5–6×. Fix: "what remains unresolved" now leads (right after orientation); the two per-topic provenance disclosures collapse to one; per-claim requirement/ref re-lists dropped; the "Not yet established" rollup group dropped (unresolved lives once, in "What remains unresolved"). No BI/composition/contract change; `bi_summary_blocks` still verbatim. (3) **Legacy retirement** — `GET .../reviewer-lk` + `route-and-audit.test.ts` + `projectReviewerLkResult` + `ReviewerLkLookupResult` deleted (zero runtime consumers); fail-closed audit contract transferred to `hrr-research-route.test.ts`. (4) **`HRR_MAX_RESOLVED_TOPICS` stays 2** (§T-4). (5) **Live classifier cost/quality eval pending** (no Anthropic key in the environment). One genuinely-open item remains: `HRR_MAX_RESOLVED_TOPICS` value (§T-4) — an experiment, not a blocker.
**Date:** 2026-09-10
**Source basis:** `origin/main` = `238670c` (every file/type/line referenced was read at this commit).
**Product spec (the *what*):** `08_Platform/prds/PRD_CAH_4G_HRR.md`. **Durable decision:** `08_Platform/app/lib/reviewer-lk/ADR-002-governed-research-interface.md`. **Authority firewall inherited:** `ADR-001-reviewer-resources-authority-boundary.md`.
**Naming:** follows `LK_PHASE1_TECHNICAL_DESIGN.md` precedent (design doc for a not-yet-built capability). "HRR" = the product capability; "GRI" = the reusable pattern; "Reviewer LK" = the existing `lib/reviewer-lk/**` implementation.

---

## 0. Design principles

1. **Reuse the CAH-4E reviewer pipeline; add one bounded interpretation stage in front of it for free-form.** Do not fork retrieval, do not build a parallel Bounded Interpretation engine, do not build a second composer.
2. **The model classifies and maps; it never answers.** Its entire influence is choosing which governed topics/scope a deterministic pipeline then processes.
3. **Fail closed at every structured/model/governance boundary.**
4. **Extract only the smallest honest shared contract** needed for HRR V1. No abstraction for symmetry.
5. **Zero CRC change.** `lib/crc-engine/**`, `lib/interview-engine/**` (except the additive `BiIntent`/`BiResult` generalization of `buildBoundedInterpretations` — §S-5, **SHIPPED CAH-4G.1/.3/.3A, all proven byte-for-byte behavior-neutral for CRC**; a CRC `RetrievalResult` structurally satisfies `BiResult` and carries no `applicability` field), CRC routes, CRC UI: untouched.

## A. Entry modes

```
TOPIC PATH  (research_mode = 'topic_pick')  — 0 model classification calls
  chip click → GoalCategory
            → ExplicitResearchIntent { source_kind:'topic_selection', topic, scope:'informational' }
            → GRI pipeline

FREE-FORM PATH  (research_mode = 'question')  — exactly 1 classify-only model call
  reviewer question (verbatim, UNTRUSTED — §L)
            → interpretResearchIntent()  [ONE bounded structured LLM call — classifies/maps, NEVER answers]
            → PermittedResearchIntent { research_intents:[{topic, scope}], assessment_decision_requested, unresolved_ambiguity[] }
            → authority gate (§D) — routes EACH intent independently
            → assessment_decision_requested → authority-refusal block (no scope change to any research clause)
            → for each research_intents[i] (max HRR_MAX_RESOLVED_TOPICS, frozen default 2 — §T-4):
              ExplicitResearchIntent { source_kind:'interpreted_question', topic, scope: research_intents[i].scope, source_text_ref }
            → GRI pipeline
```

**Frozen topic-path contract (§S).** The topic path is **not** "byte-identical to CAH-4E" — it now also flows through Bounded Interpretation + HRR composition (intentional CAH-4G product evolution). What is **frozen unchanged** for the topic path: 0 model classification calls; `evaluateReviewerEligibility` authority; `selectReviewerClaims` selection authority (byte-identical calls); `evaluateApplicabilityDetailed` (`met`/`unresolved`/`not_met`, never collapsed); no inferred project facts; no assessment authority; audit-before-content; the same `GoalCategory` topic identifiers. What **evolves**: the presentation/interpretation layer only — BI status + consultative framing + navigation. Every governed proposition CAH-4E surfaced is still surfaced verbatim.

**GRI pipeline (identical for both modes) — steps 1–3 SHIPPED as `runHrrResearch()` (CAH-4G.3, `lib/hrr/`):**
```
HrrAuthorityGateResult   (free-form: classifier → hrrAuthorityGate ;  topic chip: topicSelectionGateResult())
  → per permitted ExplicitResearchIntent:
  → governed retrieval        selectReviewerClaims() per intent.topic       (lib/reviewer-lk/ — REUSED, byte-identical call)   [SHIPPED]
  → deterministic applicability   evaluateApplicabilityDetailed()           (inside the selector — REUSED)                     [SHIPPED]
       partition: any not_met → does_not_apply[] (NOT fed to BI) ;  met|unresolved → BiResult (with applicability status) → BI
  → Bounded Interpretation     buildBoundedInterpretations(BiIntent[], BiResult[], [], {state:'unknown'})   (§H adapters)      [SHIPPED]
       BiResult.applicability.status === 'unresolved'  →  relevant_applicability_unresolved (proposition shown, CAH-4G.3A)
  → structured internal result HrrResearchResult   (lib/hrr/types.ts — no prose, no conclusion)                                [SHIPPED]
  → consultative composition   projectHrrResearchAnswer()                   (§I — deterministic, no model call)                 [SHIPPED CAH-4G.4]
  → provenance / projection    HrrResearchAnswer                            (§J — NEW type, lib/hrr/types.ts)                    [SHIPPED CAH-4G.4]
  → sanitized audit projection projectHrrAuditRecord()                      (§K — PURE; null when no governed research)          [SHIPPED CAH-4G.5]
  → REQUIRED append-only audit recordReviewerLkAccess() (via runAuditedHrrResearch — audit-before-content, fail closed) [SHIPPED CAH-4G.5]
  → route (the ONE HRR route)  POST app/api/admin/submissions/[id]/reviewer-lk/research/route.ts   (§A/§E)          [SHIPPED CAH-4G.6; legacy GET retired CAH-4G.7]
  → UI (topic chips + Ask HRR)  ReviewerLkLookup.tsx → one <HrrResearchAnswerView>   (consultative order hardened CAH-4G.7)   [SHIPPED CAH-4G.6]
```

**Convergence point:** both modes converge at `ExplicitResearchIntent[]` — *before* retrieval. Everything downstream is shared and model-free.

## B. Intent representation — NO synthetic UserGoals

**`ExplicitResearchIntent`** (NEW type, `lib/reviewer-lk/` — HRR-owned):
```ts
interface ExplicitResearchIntent {
  source_kind: 'topic_selection' | 'interpreted_question'
  topic: GoalCategory                     // GOAL_CATEGORIES \ 'unknown'
  scope: GoalScope                        // THIS research clause's own scope (reused enum from types/interview-engine).
                                          // 'determination_request' only iff this clause itself asks HRR to decide the
                                          // topic — never set by contagion from a separate assessment-decision request
                                          // in the same utterance (CAH-4G.1, 2026-09-10).
  // provenance — survives the whole pipeline, rendered in the answer:
  source_text_ref: string | null          // for 'interpreted_question': a reference/id to the reviewer question (NOT stored raw by default — §K)
  interpreted: boolean                     // true iff source_kind === 'interpreted_question'
}
```

**Why not `UserGoal`:** a `UserGoal` (`types/interview-engine.ts:665`) carries CRC-conversation lifecycle (`state: ConfidenceState`, `superseded_by`, `source_turn`, `source_statement`, confirm/decline/supersede semantics via `mutations.ts`) that is meaningless for a single reviewer research action and would invite CRC-orchestration coupling. **CRC `UserGoal`s stay genuine CRC `UserGoal`s. HRR research questions stay genuine HRR research questions.** They adapt into a smaller shared BI input contract (§H), and explicit provenance survives that adaptation (`interpreted`, `source_kind`, `source_text_ref`).

## C. Free-form structured classification

**SHIPPED (CAH-4G.2 Slice 2, 2026-09-10).** `type ResearchIntentInterpreter = (reviewerQuestion: string) => Promise<PermittedResearchIntent>` — the ONE model call in HRR. Files (all `lib/reviewer-lk/`):

| File | Role |
|---|---|
| `interpret-research-intent.ts` | pure: the `ResearchIntentInterpreter` contract, the enum-only JSON schema (`RESEARCH_INTENT_CLASSIFIER_SCHEMA`, exported for test inspection), the trust-boundary system prompt (`RESEARCH_INTENT_SYSTEM_PROMPT`), the fail-closed result (`unsupportedResearchIntent()`), and the deterministic `validateAndNormalizePermittedResearchIntent(raw): PermittedResearchIntent \| null` |
| `interpret-research-intent.anthropic.ts` | real adapter: `createAnthropicResearchIntentInterpreter()`. `client.messages.parse` with `output_config: jsonSchemaOutputFormat(...)`, `thinking: { type: 'disabled' }`, `max_tokens` 1024 base / 2048 recovery, reusing `callWithOneRecoveryRetry('hrr_intent_classifier', …)` verbatim (no forked retry stack). **Never throws — fails closed to `unsupportedResearchIntent()`** on any provider/SDK error, unrecoverable structured-output miss, or a normalizer rejection. Model: `HRR_INTENT_CLASSIFIER_MODEL` env, else `claude-sonnet-5`; key `ANTHROPIC_API_KEY` (never silently mocked) |
| `interpret-research-intent.mock.ts` | `constantResearchIntentInterpreter` / `functionResearchIntentInterpreter` for deterministic tests — the normal suite never touches live Anthropic |

Input is `reviewerQuestion` only — the topic enum is baked into the schema + prompt, not passed as data. **The free-form classifier needs no project/submission facts to determine what the reviewer explicitly asked to research** (Phase 3, verified).

```ts
interface PermittedResearchIntent {
  // A single utterance may carry MORE THAN ONE semantic intent. The classifier
  // separates them; the authority gate (§D) acts on each independently.
  research_intents: Array<{
    topic: ReviewerResearchTopic          // GoalCategory \ 'unknown' — enum-only, never a fabricated "closest topic".
                                          // Source of truth: REVIEWER_RESEARCH_TOPICS (reviewer-lk/types.ts),
                                          // asserted === GOAL_CATEGORIES\'unknown' === keys(REVIEWER_TOPIC_LABELS).
    scope: GoalScope                      // THIS clause's own scope: 'determination_request' only iff THIS
                                          // research clause itself asks HRR to decide/certify the topic
                                          // (e.g. "can you determine whether copyright ownership is satisfied?"),
                                          // else 'informational'.
  }>                                      // [] allowed. Deduped by topic (stronger scope wins on collision),
                                          // capped at HRR_MAX_RESOLVED_TOPICS (2). Overflow → keep the first 2 by
                                          // governed enum order + add 'multiple_unrelated_topics' (§T-4).
  assessment_decision_requested: boolean  // true iff the utterance also asks HRR to make the assessment
                                          // decision (approve / reject / pass a control / clear the project /
                                          // judge evidence sufficiency / declare a finding / reach an outcome / sign off).
  unresolved_ambiguity: Array<'no_governed_topic_matched' | 'topic_without_governed_coverage' | 'question_too_general' | 'multiple_unrelated_topics'>
}
```

**Deterministic normalization (`validateAndNormalizePermittedResearchIntent`, source-independent of the model).** Returns `null` (→ caller fails closed) for an unrecoverable shape; otherwise: drops any `research_intents` entry with a non-enum `topic` or `scope` (never coerces / guesses / adds one the model did not emit); dedupes by topic keeping the stronger scope and first-seen order; re-caps at `HRR_MAX_RESOLVED_TOPICS` by governed enum order regardless of the schema's own `maxItems`; keeps only recognized `unresolved_ambiguity` reasons. An answer smuggled into an extra key is simply dropped (closed top-level object), never repeated anywhere.

**Per-intent scope is load-bearing (CAH-4G.1 correction, 2026-09-10).** A prohibited
intent in the same utterance NEVER rewrites a permitted research clause's `scope`.
"Should I approve this, **and** what does governed knowledge say about copyright
ownership?" →
```
{
  research_intents: [ { topic: 'copyright_ownership', scope: 'informational' } ],
  assessment_decision_requested: true,
  unresolved_ambiguity: []
}
```
The `copyright_ownership` clause stays `informational` — it flows through normal
governed retrieval / applicability / BI / composition and produces an ordinary
governed answer. `assessment_decision_requested` is handled separately (declined).
The research clause becomes `determination_request` **only** when that clause
itself asks for a determination, judged on its own words, never by contagion from
the assessment-decision clause.

| Attribute | Contract |
|---|---|
| Schema | strict JSON (`output_config.format`, `type: json_schema`): the 3 fields above, all enum-constrained; each `research_intents[]` entry is `{topic, scope}` over the `GoalCategory` enum minus `'unknown'` and the `GoalScope` enum. **No free-text field.** Structurally cannot carry an answer, a claim, or prose. |
| System prompt (forbidden outputs) | "You may only classify and map. Separate distinct intents in the question. Never produce an answer, a legal or commercial statement, a governed claim, a paraphrase of governed knowledge, a project conclusion, or advice. Emit only the schema." |
| Retry | `callWithOneRecoveryRetry('hrr_intent_classifier', …)` (shared, `lib/interview-engine/anthropic-structured-output-retry.ts` — union member added CAH-4G.2, purely a telemetry label, no runtime branch) — 1 bounded recovery retry, raised `max_tokens` (1024→2048), structural `missing_output_max_tokens` / `sdk_parse_failure` classification, telemetry sink. No unbounded loop. |
| Fail-closed | schema-nonconforming after retry, provider/SDK error, an unrecoverable structured-output miss, or a deterministic-normalizer rejection → the adapter **returns `unsupportedResearchIntent()` = `{ research_intents: [], assessment_decision_requested: false, unresolved_ambiguity: ['no_governed_topic_matched'] }`; it NEVER throws** → a future caller shows fixed "try a topic" copy and runs **no retrieval**. A result with `research_intents: []` and `assessment_decision_requested: false` is the "nothing supported" outcome (same copy). |
| `scope` default (per research clause) | `'informational'` (mirrors CRC's proven default rationale — mis-assuming a determination request suppresses a real answerable claim; the reverse is worse only if it *answered*, which this stage cannot). A clause is `'determination_request'` only when its own wording asks HRR to decide the topic. |
| Model/provider | one small `max_tokens: 1024` call, **`thinking: { type: 'disabled' }`** (as-built CAH-4G.2 — a pure classification task has no use for a thinking stage, and disabling it removes the un-requested-`thinking`-block miss mode; matches the extractor's own "Thinking Disable" milestone), no sampling params. Model id: `HRR_INTENT_CLASSIFIER_MODEL` env → `claude-sonnet-5` (§T-8/§S-14). |
| Observability | `callWithOneRecoveryRetry`'s existing `StructuredOutputTelemetryEvent` / `StructuredOutputSuccessTelemetryEvent` sinks cover the model call; a normalizer rejection logs a `console.warn`. A dedicated structured `hrr_intent` analytics event (resolved topics + per-clause scopes + `assessment_decision_requested` + fail-closed flag, enum/boolean only — **never the raw question**) is **deferred to Slice 5** (audit / observability), where it is written alongside the audit row. |

## D. Authority gate — research / assessment-judgment / unsupported

Deterministic routing over the structured `PermittedResearchIntent` (no second
model call). **Each semantic intent is routed independently — a prohibited intent
never changes how a permitted one is handled** (CAH-4G.1, 2026-09-10):

| Signal in `PermittedResearchIntent` | HRR behavior |
|---|---|
| Each `research_intents[i]` (a topic the question explicitly named) | build `ExplicitResearchIntent { topic: research_intents[i].topic, scope: research_intents[i].scope }` and run the GRI pipeline for it. **The clause's own `scope` flows to BI unchanged** — `'informational'` → ordinary governed answer (`directly_relevant` / `outside_current_coverage` / `relevant_applicability_unresolved`); `'determination_request'` → `determination_declined` for that clause, **only because that clause itself asked for a determination**. |
| `assessment_decision_requested: true` | render the assessment-authority refusal (the §5 authority note: "HRR does not determine the assessment outcome; that is your judgment") as its own block. This is handled **without** touching the scope of any `research_intents[]` entry. If `research_intents` is also empty → additionally **offer the research paths** (the topic list). **Never** a yes/no; **never** an invented "closest topic". No retrieval or BI is run *for the decision itself*. |
| `research_intents: []` **and** `assessment_decision_requested: false` (incl. the fail-closed result) | fixed copy: "Human Reviewer Research answers narrower governed questions about this submission. Try one of these topics:" + chips. No retrieval, no BI. |

**Mixed question** ("Should I approve this, and what does governed knowledge say
about copyright ownership?"): `research_intents: [{topic: 'copyright_ownership',
scope: 'informational'}]`, `assessment_decision_requested: true`. The answer
renders the authority-refusal block **and**, separately, the ordinary
`copyright_ownership` governed research answer (**not** `determination_declined` —
that clause was informational). One utterance, two intents, two independent
outcomes, structurally separated in the answer.

**The gate's output is a routing decision, never an answer.**

**SHIPPED (CAH-4G.2 Slice 2):** `hrrAuthorityGate(classified: PermittedResearchIntent, { sourceTextRef? }): HrrAuthorityGateResult` (`lib/reviewer-lk/hrr-authority-gate.ts`) — a **synchronous, pure, no-model, no-I/O** function. Output:
```ts
interface HrrAuthorityGateResult {
  authority_note: 'research' | 'assessment_judgment_redirected' | 'unsupported'
  research_intents: ExplicitResearchIntent[]              // each { source_kind:'interpreted_question', topic, scope, interpreted:true, source_text_ref }
  offered_research_paths: ReviewerResearchTopic[] | null  // full governed list (enum order), ONLY when authority_note !== 'research'
  unresolved_ambiguity: HrrUnresolvedAmbiguityReason[]    // passed through for UI routing / observability
}
```
Routing: `assessment_decision_requested` → `authority_note: 'assessment_judgment_redirected'` (research clauses, if any, still routed at their own scope; `offered_research_paths` only when none survived). Else research clauses present → `'research'`. Else → `'unsupported'` + offered paths. The gate NEVER declines a `determination_request` research clause itself — that is BI's semantic ceiling (Slice 3). Covered by `__tests__/reviewer-lk/hrr-authority-gate.test.ts` (Cases 1–6).

## E. Retrieval

**Reuse `selectReviewerClaims()` (`lib/reviewer-lk/select-reviewer-claims.ts`) per resolved topic — unchanged.** It already:
- pre-filters `TOPIC_CLAIMS_FIXTURE` by `topic` + `providerScopeMatches` + `toolScopeMatches` (generic pure primitives, fail-closed);
- gates each candidate through `evaluateReviewerEligibility` (lifecycle `Adopted` + `publication_scope ∈ REVIEWER_ELIGIBLE_PUBLICATION_SCOPES` + `superseded_by === null`) → ineligible → `withheld[{claim_id, reason}]`;
- runs `evaluateApplicabilityDetailed` per claim → per-requirement `met` / `unresolved` / `not_met`;
- passes through verbatim governed fields → `ReviewerLkClaim`;
- sorts by `claim_id` (never a rank).

**Submission facts** come from `buildReviewerLkContext()` (`lib/reviewer-lk/submission-facts.ts`) over `submissions.{tools_used, territory_preferences}` — unchanged. `assetProviderIds` stays `[]` in V1 (no structured provider field on `submissions`).

**Why not CRC `retrieve()`:** `retrieve()` → `enumerateEligibleClaims` → **`crc_eligible === 'Yes'`** gate (the *unsupervised-channel* filter). Using it for a reviewer would silently narrow reviewer knowledge to the CRC-channel subset, contradicting `eligibility.ts`'s explicit design (*"Reviewer access may legitimately expose knowledge that is Adopted but not CRC Eligible"*). Forking `retrieve()` is worse than reusing the small selector that already exists for exactly this reason. See §Q.

**Multiple resolved topics** → run `selectReviewerClaims` once per topic; results are grouped per topic in `HrrResearchResult.per_topic[]` (never unioned into one flat list — each topic keeps its own `bi_status` + governed claims + `does_not_apply` + `withheld`), in gate order.

**SHIPPED (CAH-4G.3):** `runHrrResearch()` calls `selectReviewerClaims({ topic: intent.topic, topicClaims, assetProviderIds, activeToolIds, applicabilityFacts })` per permitted `ExplicitResearchIntent` — **byte-identical to the CAH-4E topic-path call**. `selectReviewerClaims` / `evaluateReviewerEligibility` / `providerScopeMatches` / `toolScopeMatches` / `evaluateApplicabilityDetailed` are **unmodified**. The reviewer context comes from `buildReviewerLkContext()` (pure), which `runHrrResearch` receives already-resolved — it does no DB read itself. Proven by `__tests__/hrr/run-hrr-research.test.ts` (the topic-shortcut result's `governed_claims` / `withheld` `.toEqual()` a direct `selectReviewerClaims` call).

## F. Reviewer eligibility — independent from CRC eligibility

`evaluateReviewerEligibility` (`lib/reviewer-lk/eligibility.ts`) is the sole gate. It reads **three** governance dimensions and only these three: `lifecycle` (`=== 'Adopted'`), `publication_scope` (`∈ ['Reviewer/Commercial Assurance', 'CRC eligible', 'Public SI8 position']` — `REVIEWER_ELIGIBLE_PUBLICATION_SCOPES`), and supersession (`superseded_by === null`). **`crc_eligible` is deliberately never consulted.** Fail closed: missing / null / unrecognized `publication_scope` → reviewer-ineligible; `'Internal/research'` → reviewer-ineligible.

**Reviewer availability must never be inferred from CRC eligibility or CRC publication scope.** CAH-4G does not change this. HRR does not render `crc_eligible` or raw `crc_publication_scope` "CRC may state…" prose (CAH-4F semantic rule — `authority-firewall.test.ts` F).

## G. Applicability

The generic deterministic evaluator `evaluateApplicabilityDetailed` (`lib/retrieval-engine/lookup-topic-claims.ts:128`) returns `ApplicabilityRequirementStatus = 'met' | 'unresolved' | 'not_met'`:
- `met` — the relevant structured fact is confirmed and matches;
- `unresolved` — the fact isn't confirmed (`actual === undefined`), or conflicting state → **fail closed, never guess**;
- `not_met` — confirmed but the comparison fails (the claim genuinely does not apply).

`selectReviewerClaims` computes `applicability_established = every status === 'met'` per claim. HRR **surfaces the per-requirement statuses verbatim** and never:
- collapses `met`/`unresolved`/`not_met` into pass/fail;
- treats `unresolved` as a negative finding;
- infers a missing submission fact in the free-form interpretation stage;
- converts an **evidence-only fact** (the set `dependency-askability.ts` classifies as *"requires documentary evidence, never askable"*: stock editorial designation, likeness/voice consent, release status, separate authorization, rights-and-clearance status) into a reviewer self-attestation question. Unknown → `unresolved` → shown.

**SHIPPED (CAH-4G.3 + CAH-4G.3A) — the BI partition (`lib/hrr/run-hrr-research.ts`):** for each researched topic, `runHrrResearch` partitions `selectReviewerClaims().claims` by applicability:
- **any `not_met` requirement** → the claim is **excluded from the BI feed** and placed in `HrrResearchTopicResult.does_not_apply[]` (full `ReviewerLkClaim`). Never fed to BI, never a match, never "unresolved", never a finding.
- **only `met`** → `reviewerClaimToBiResult` sets `applicability: { status: 'established' }` → BI's existing `directly_relevant` behavior.
- **≥1 `unresolved` (none `not_met`)** → `reviewerClaimToBiResult` sets `applicability: { status: 'unresolved', unresolved_requirements: [...] }` → **BI classifies the intent `relevant_applicability_unresolved`** (CAH-4G.3A). The governed proposition is still visible + quoted verbatim (Case-3B rendering); the unresolved requirement(s) are preserved in both `HrrResearchTopicResult.governed_claims[].applicability_outcomes` and `BiResult.applicability.unresolved_requirements` for the Slice-4 composer to explain. This is **not withholding** (the reviewer still sees the proposition, unlike the CRC channel which withholds it) and **not a negative finding**.

This was **verified against `evaluateApplicabilityDetailed` source** (a `not_met` comes only from an explicitly-excluded jurisdiction / a confirmed non-matching tool fact — never from silence) before implementing.

## H. Bounded Interpretation — the smallest honest adaptation boundary

**DURABLE PRINCIPLE (frozen CAH-4G.3A; `ADR-002`).** Deterministic applicability
is an **upstream semantic input to Bounded Interpretation**, on a par with
retrieval and eligibility. A retrieved governed proposition whose applicability
requirements are deterministically `unresolved` **must** be represented by BI as
`relevant_applicability_unresolved` — it must **not** become `directly_relevant`
merely because a channel does not supply a CRC `RetrievalDiagnostic`. The
governed proposition stays visible and verbatim; "unresolved" is **not** a
pass/fail and **not** a negative finding (required structured information is not
established). **Composition cannot repair an overly strong BI result** — the fix
lives at or before the BI boundary, never in Projection/Composition. The generic
carrier is `BiResult.applicability` (`{ status; unresolved_requirements? }`), an
upstream fact, never a channel policy.

**Current (post-CAH-4G.3A, 2026-09-10):** `buildBoundedInterpretations(intents: BiIntent[], results: BiResult[], diagnostics?, humanContributionDescription?)` (`build-bounded-interpretation.ts`). It reads only `intent.{intent_id, intent_text, category, scope}` and, per result, `{matched_goal_category, unresolved_project_dependencies, claim_id, candidate_statement, match_origin, source_fact.kind, applicability?.status}` — the exact `BiResult` shape. A CRC `RetrievalResult[]` structurally satisfies `BiResult[]` (the `applicability` field is optional), so CRC call sites are unchanged.

**SHIPPED (CAH-4G.1 Slice 1): the input type generalized to `BiIntent[]`.** CRC adapts through the one-line `userGoalsToBiIntents` adapter; a future research-intent caller builds `BiIntent` directly. CRC `UserGoal`s stay genuine `UserGoal`s; research intents stay genuine research intents. The alternative (HRR-local rule re-application) is **rejected** — it would create a second place the four-status rule table lives.
- `BiIntent` — the minimal shape BI needs (`lib/bounded-interpretation/types.ts`):
  ```ts
  interface BiIntent { intent_id: string; intent_text: string; category: GoalCategory; scope: GoalScope }
  ```
- `buildBoundedInterpretations` accepts `BiIntent[]` instead of `UserGoal[]`; it no longer applies any lifecycle filter itself. `userGoalsToBiIntents(goals: UserGoal[]): BiIntent[]` (`lib/bounded-interpretation/adapters.ts`) filters `superseded_by === null && state === 'confirmed'` (the exact filter BI used to apply inline) and maps `{goal_id→intent_id, raw_text→intent_text, category, scope}`, order preserved. CRC's call site is `buildBoundedInterpretations(userGoalsToBiIntents(understanding.user_goals), …)` — **zero behavior change, proven by the full `__tests__/bounded-interpretation/**` + CRC + retrieval suites (byte-identical 77-failing / 3280-passing set before/after against an isolated baseline worktree) plus `bi-intent-adapter.test.ts`.**
- **SHIPPED (CAH-4G.3):** `researchIntentToBiIntent(intent: ExplicitResearchIntent): BiIntent` (`lib/hrr/bi-adapters.ts`). `intent_id = 'hrr:<source_text_ref or source_kind>:<topic>'` (deterministic, traceable). `category = intent.topic`; `scope = intent.scope` (per-clause, verbatim). **`intent_text = reviewerTopicLabel(intent.topic)` — the FIXED governed topic label, NOT the raw reviewer question.** Safety refinement of the frozen proposal: BI uses `intent_text` only as `BoundedInterpretation.goal_text` (rendered verbatim, never transformed); for CRC that is genuinely the user's own words, but the thing BI interprets for HRR is *"research topic T"*, so the honest, safe `goal_text` is the topic label. The raw reviewer question flows **entirely separately** as `HrrResearchResult.attributed_question`, for Slice-4 attributed display ("You asked: …") — it never enters `BiIntent`, `selectReviewerClaims`, applicability, or BI at all. **No synthetic `UserGoal`.**
- Research provenance (`interpreted`, `source_kind`, `source_text_ref`) is carried by the `ExplicitResearchIntent` / `HrrResearchResult`, never inside `BiIntent`.

**Second adaptation boundary — results: `BiResult` INTRODUCED (CAH-4G.3; `applicability` field CAH-4G.3A).** Slice 1 deferred this "until a real consumer exists"; `runHrrResearch` is that consumer. `BiResult` = exactly what `build-bounded-interpretation.ts` reads off a governed result:
```ts
interface BiResult {
  matched_goal_category: GoalCategory
  unresolved_project_dependencies: string[]
  claim_id: string
  candidate_statement: string | null
  match_origin: MatchOrigin                 // only ever compared === 'related_topic'
  source_fact: { kind: RetrievalSourceFactKind }   // NESTED — so a CRC RetrievalResult satisfies BiResult[]; only ever compared === 'tool'
  applicability?: BiApplicability            // OPTIONAL (CAH-4G.3A). Absent for CRC (retrieve() withholds a non-applicable
                                            //   claim before BI). { status: 'established' | 'unresolved'; unresolved_requirements? }
}
```
`source_fact` nested + `applicability` optional → a CRC `RetrievalResult` (all 6 core fields + more, no `applicability`) structurally satisfies `BiResult[]` and **every CRC call site + BI test is byte-unchanged** (proven byte-for-byte behavior-neutral). HRR builds `BiResult` via **`reviewerClaimToBiResult(claim: ReviewerLkClaim): BiResult`** (`lib/hrr/bi-adapters.ts`): `matched_goal_category = claim.topic` (accurate — the selector only returns claims whose topic equals the researched topic), `candidate_statement = claim.statement` (verbatim), `claim_id` / `unresolved_project_dependencies` verbatim, `match_origin = 'exact_topic'`, `source_fact = { kind: 'topic' }`, and **`applicability`** translated from `claim.applicability_outcomes` (`established` when all `met`; `unresolved` + the specific requirement(s) when ≥1 `unresolved`; a `not_met` claim never reaches this adapter). **It constructs NONE of `RetrievalResult`'s CRC-shaped fields** (`matrix_identifier`, `relationship_id`, `publication_scope`, `topic`, `source_fact.identifier`) and re-evaluates nothing — no synthetic value anywhere. `RetrievalResult` is removed from BI's public contract.

**Frozen BI-input semantics for HRR — SHIPPED CAH-4G.3 + CAH-4G.3A (`lib/hrr/run-hrr-research.ts`, `lib/bounded-interpretation/`):**
- **`diagnostics` is always `[]`** for HRR (`buildBoundedInterpretations([biIntent], biResults, [], {state:'unknown'})`). CRC's `diagnostics`/Case-3A path is the *unsupervised channel's* way of learning "applicability unresolved" *when it has withheld the claim*. HRR does not withhold — so instead the deterministic applicability result reaches BI on the **generic `BiResult.applicability`** field (CAH-4G.3A): `{ status: 'unresolved' }` → **BI classifies `relevant_applicability_unresolved`** (same status as Case 3A, Case-3B-style rendering — proposition shown), **never `directly_relevant`**. Case 3B (`unresolved_project_dependencies.length > 0`) also applies and shares the same status + rendering.
- **`not_met` claims — verified against `evaluateApplicabilityDetailed` source, then implemented.** A `ReviewerLkClaim` with **any** `applicability_outcomes[].status === 'not_met'` (a settled false fact — the claim provably does not apply) is **excluded from the BI feed** and returned in `HrrResearchTopicResult.does_not_apply[]` (the full `ReviewerLkClaim` — verbatim `statement` + the failing requirement). It is **never** converted to `directly_relevant`, `relevant_applicability_unresolved`, or a negative finding. Claims with only `met` and/or `unresolved` requirements feed BI normally. **No BI status was invented for HRR.**
- **`humanContributionDescription` is always `{state:'unknown'}`** for HRR (no submitter contribution narrative — HRR adds no new submission facts). H5 never fires.
- The per-requirement `met`/`unresolved`/`not_met` outcomes always ride alongside in `HrrResearchAnswer.per_topic[].governed_propositions[].applicability_outcomes` — never collapsed into `bi_status`, never into pass/fail.

**Alternative (if the generalization is judged too invasive for V1):** an HRR-local `buildHrrInterpretation()` that imports only `lib/bounded-interpretation/rules.ts` (the fixed templates) + `INTERPRETATION_STATUSES` + `BoundedInterpretation` type — **not** `build-bounded-interpretation.ts` logic — and re-applies the same four-status rule table for HRR's inputs. This is a *second small rule application*, not a second engine, and it risks drift from `rules.ts` updates. **The recommended generalization is preferred** precisely because it keeps one rule table.

**BI output contract for HRR (`BoundedInterpretation`, reused verbatim):** `status ∈ {directly_relevant, outside_current_coverage, determination_declined, relevant_applicability_unresolved}`; `summary` + `summary_blocks` (fixed templated copy from `rules.ts`, verbatim-quotes governed `candidate_statement`, never paraphrases); `supporting_claim_ids` (traceability only); `unresolved_relevant_claims`. **`determination_declined` is the assessment-authority refusal**, fired purely on `scope === 'determination_request'` before any matching.

**BI must not output** (already true; restated as an HRR invariant): assessment finding · control pass/fail · commercial clearance · evidence-sufficiency verdict · fabricated legal conclusion · any project-specific conclusion stronger than applicability permits.

## I. Composition — shared primitives + HRR policy

**Direction (from `PRD_CAH_4G_HRR` + PM review):**
```
            Bounded Interpretation
                     ↓
        Consultative Composition primitives / core
              ↙                    ↘
        CRC policy               HRR policy
            ↓                        ↓
        CRC answer               HRR answer
```

**V1 implementation — SHIPPED CAH-4G.4: deterministic / template-based `projectHrrResearchAnswer()` (`lib/hrr/project-hrr-research-answer.ts`, no model call).** It assembles the `HrrResearchAnswer` from: verbatim governed `statement`s + `BoundedInterpretation.summary_blocks` + fixed per-status templates + mechanical enumerations of `claim_id` / `status` / `requirement`. The reviewer's question is carried **only** as an attributed quotation string (`HrrResearchAnswer.question_text`) — it is displayed, never a factual grounding source (§L, `ADR-002`). **As-built refinements of the sketch below:**
- **Location** is `lib/hrr/` (the CAH-4G convergence layer), not `lib/reviewer-lk/` — the composer consumes a `BoundedInterpretation`-derived type, so it sits with `runHrrResearch`, behind the `lib/hrr` firewall.
- The complete authored-prose set is a single exported, enumerable constant **`HRR_ANSWER_TEMPLATES`** (`{ orientation, boundary_note, does_not_apply_note, unresolved_requirement_note, unresolved_dependency_note, reviewer_responsibility_note, assessment_authority_note }`). The grounding test reconstructs every module-authored string from it — the composer is structurally incapable of emitting free prose.
- **Consultative hierarchy A–G = the field order of `HrrAnswerTopic`.** Empty/irrelevant elements are an empty array / empty string, never a rendered heading.
- **`determination_declined`** topic entries carry **only** `orientation` + `boundary_note` + `withheld` + `governed_claim_refs` — `bi_summary_blocks: []` (the shared BI copy for that status is CRC-channel-worded), no governed proposition, no applicability, no does-not-apply. BI cited nothing → composition cites nothing.
- **`relevant_applicability_unresolved`**: the governed proposition is still shown verbatim (via `bi_summary_blocks` + `governed_considerations`); `unresolved_inputs[]` makes each unresolved requirement / project dependency useful (the specific governed `fact` identifier + which claims it blocks + a fixed note assigning it to the Human Reviewer). No module-authored string renders the requirement as met/satisfied/established/resolved/cleared/compliant/sufficient — wording-locked by test.
- **Materiality/ordering (documented limitation):** `HrrResearchResult` carries no governed materiality signal, so `topics` preserve the authority-gate's deterministic clause order and every within-topic list preserves its upstream order (BI citation order; `claim_id` sort; requirement-key sort for the deduplicated rollup). Signal-driven ordering can be added later without changing the contract.

**FROZEN (OQ-3, §T-3): HRR V1 composition is deterministic / template-based after BI. No second LLM composition call.** `projectHrrResearchAnswer()` reads only the already-built `BoundedInterpretation[]` + the `ReviewerLkClaim[]` (for verbatim `statement` + applicability outcomes + provenance refs) + `withheld[]` + the attributed question quotation, and applies fixed templates. It **does not** re-read retrieval, re-classify askability, re-evaluate applicability, or touch Bounded Interpretation.

**Not built in V1 — the `buildConsultativeAnswerPlan` reuse.** `lib/crc-engine/consultative-answer-plan.ts` is deterministic and carries no governed prose, but it reads two `lib/crc-engine/` askability registries — pulling a crc-engine dependency into the reviewer path. HRR needs less than CRC's plan (no askability classification, no CRC bridge, no email projection). Extracting a genuinely shared `consultative-composition-core` is a **separate future decision** (§R), taken only after HRR's V1 composer and CRC's plan builder are both known real consumers.

**The durable composition invariant (`ADR-002`, FROZEN as semantic — not implementation-specific):** *composition may express only semantic content permitted by Bounded Interpretation and traceable to governed propositions / permitted structured outputs.* "Templates forever" is **not** the architecture — a future HRR composer *may* use a bounded model stage **if** every substantive proposition still traces to grounding source A–E and passes the grounding test.

**Answer grounding rule (FROZEN — test-enforced; `ADR-002` authoritative).** Every HRR **substantive factual proposition** traces to exactly one of:
- **(A)** governed Living Knowledge permitted for HRR (a verbatim `TopicClaim.crc_candidate_statement`);
- **(B)** deterministic applicability / permitted structured submission context (`met`/`unresolved`/`not_met` outcomes, `resolved_tool_ids`, `jurisdiction_included`), accurately characterized;
- **(C)** a `BoundedInterpretation` output (`summary` / `summary_blocks`) derived from permitted governed inputs;
- **(D)** a fixed authority / limitation / navigation template string;
- **(E)** a mechanical provenance / status enumeration (`claim_id`, `governed_claims_reference`, requirement identifiers, status values).

**Reviewer-authored text grounds INTENT provenance only** — it may appear as an attributed quotation and may drive the classifier's structured output; it may **never** substantiate a factual proposition, become governed truth by repetition, or override Living Knowledge / applicability / BI. A false premise in the question (e.g. *"Since Veo gives us copyright ownership…"*) is never echoed as fact.

## J. Provenance / projection

**`HrrResearchAnswer`** (NEW type — **SHIPPED CAH-4G.4, `lib/hrr/types.ts`**). As-built shape (the earlier sketch's `per_topic[].what_lk_does_not_establish` single string became a richer, still-fixed-template hierarchy; `withheld` moved per-topic; `assessment_authority_note` + `reviewer_responsibility_note` added as the fixed-template refusal / responsibility lanes):
```ts
interface HrrResearchAnswer {
  research_mode: 'topic_pick' | 'question'          // = (question_text === null ? topic_pick : question)
  question_text: string | null                     // verbatim reviewer question; null for topic_pick. Echoed, NEVER a factual grounding source.
  authority_note: 'research' | 'assessment_judgment_redirected' | 'unsupported'
  assessment_authority_note: string | null          // Lane 1 — fixed refusal template; non-null iff authority_note === 'assessment_judgment_redirected'. Never a yes/no; never references the research.
  scope_note: string                               // fixed template — set only when the classifier flagged multiple_unrelated_topics (cap hit); names which topics were researched. '' otherwise. (T-4 hand-off)
  topics: HrrAnswerTopic[]                          // Lane 2 — one per researched clause, in authority-gate order (no governed materiality signal → input order)
  offered_research_paths: GoalCategory[] | null     // mirrors the gate; populated only when topics is empty and authority_note !== 'research'
  reviewer_responsibility_note: string              // fixed template — what stays the Human Reviewer's; always present
}

interface HrrAnswerTopic {                          // field order === consultative hierarchy A–G
  topic: GoalCategory
  topic_label: string                              // reviewerTopicLabel(topic) — fixed governed label (grounding D)
  intent_origin: 'topic_selection' | 'interpreted_question'
  bi_status: InterpretationStatus                   // verbatim BoundedInterpretation.status
  orientation: string                              // (A) one fixed sentence per bi_status
  bi_summary_blocks: string[]                       // (B) verbatim BoundedInterpretation.summary_blocks — [] for determination_declined
  governed_considerations: HrrGovernedConsideration[]  // (B) claim_id ∈ supporting_claim_ids, verbatim statement + applicability; [] for determination_declined / outside_current_coverage
  applicability: { established: ApplicabilityRequirement[]; unresolved: ApplicabilityRequirement[]; not_met: ApplicabilityRequirement[] }  // (C) mechanical dedup rollup
  unresolved_inputs: HrrUnresolvedInput[]           // (D) the specific governed requirement(s)/dependency(ies) to establish + a fixed note assigning each to the Human Reviewer
  does_not_apply: HrrGovernedConsideration[]        // (E) reviewer-eligible claims a requirement evaluates not_met — never a negative finding
  does_not_apply_note: string                      // (E) fixed template — '' unless does_not_apply is non-empty
  boundary_note: string                            // (F) one fixed sentence per bi_status — what LK here does NOT establish + the authority boundary
  withheld: ReviewerLkWithheld[]                    // (F) governed knowledge exists but not reviewer-eligible + reason (never content)
  governed_claim_refs: string[]                     // (G) deduped governed_claims_reference pointers
}

interface HrrGovernedConsideration {
  claim_id: string
  statement_verbatim: string | null                // verbatim ReviewerLkClaim.statement (A)
  applicability_established: boolean                // verbatim (B)
  applicability_outcomes: Array<{ requirement: ApplicabilityRequirement; status: ApplicabilityRequirementStatus }>  // verbatim (B + E)
  unresolved_project_dependencies: string[]         // verbatim (E)
  governed_claims_reference: string                 // verbatim pointer (E)
}

interface HrrUnresolvedInput {
  kind: 'applicability_requirement' | 'project_dependency'
  identifier: string                               // the governed requirement `fact` value, or the verbatim dependency id (E)
  requirement: ApplicabilityRequirement | null
  from_claim_ids: string[]                          // which claims this input blocks (E)
  note: string                                     // fixed template (D) — why it matters + it is the Human Reviewer's to establish
}
```

**Original reviewer action preserved:** `research_mode`, `intent_origin` per topic (`topic_selection` vs `interpreted_question`), `authority_note`. Explicit reviewer intent is never merged with system-expanded relevance — a future discovered-relevance block would be a *separate* `topics[]` entry with `intent_origin` marked accordingly (compatibility only, not built in V1). **Multi-topic:** each researched clause is its own `topics[]` entry; there is **no** top-level joint/summary field, so no synthetic cross-topic conclusion is structurally possible.

## K. Audit / privacy — SHIPPED CAH-4G.5 (Option A: existing contract reused, NO migration)

Current CAH-4E audit (re-verified against source at `2421749` — `route.ts`, `repository.ts`, migrations `20260909010000` + `20260910000000`, `authority-firewall.test.ts`, `route-and-audit.test.ts`): `crc_context_access_events`, `CHECK access_kind IN ('transcript', 'lk_research')`; **an `lk_research` row is `{access_kind, actor_user_id, submission_id, created_at}` and NOTHING else** — the deployed reviewer topic look-up records **no topic and no claim ids** (`recordReviewerLkAccess({ actorUserId, submissionId })`; `association_id`/`crc_session_id` left NULL). The row is a **bounded ACCESS FACT** ("this authorized reviewer used governed research on this submission at this time") — never that governed knowledge became evidence, was accepted, or affected an assessment (audit class A, never B). Append-only: "three look-ups → three audit calls" is the deliberate contract (no dedup, no idempotency key). Identity is server-resolved (`checkReviewerContextAccess` → Supabase `auth.getUser()` + `users.is_admin`), never client-supplied. `assessment_id` is not available in this path and is deliberately kept out (ADR-001 forbids reviewer-lk touching `assessments`).

**CAH-4G.5 decision — Option A: reuse the `lk_research` contract UNCHANGED. No migration.** The frozen recommendation below was **Option B** (four nullable structured columns). Slice 5's source inspection changed it:
1. Recording "which topics / which claims" is a **new** capability, not preservation of an existing one — the deployed `lk_research` audit records neither.
2. The frozen placement (`recordHrrResearchAccess()` + structured columns in `lib/reviewer-lk/repository.ts`) **conflicts with the frozen `authority-firewall.test.ts`**: its "the ONLY `.insert` in `lib/reviewer-lk` targets `crc_context_access_events`" test and its "the audit row shape is bounded — no `topic:` / `claim_id:` / …" test both fail if `repository.ts` gains a second, structured writer.
3. `access_kind = 'lk_research'` is **honest for HRR** in both entry modes — its own migration defines it as *"a Human Reviewer deliberately looks up governed SI8 Living Knowledge."* Free-form HRR is that same act with a different entry mechanism (the classifier only maps the question to governed topics; the research is the same `selectReviewerClaims` → BI path).
4. The minimal row has **no fields to overload or misread** — it trivially satisfies the raw-question firewall and the "audit ≠ evidence" rule.
5. Slice 5's mandate ("smallest honest option", "be conservative", "do not add fields merely because they might be useful later", migration = an explicit STOP gate) points to Option A.

**As-built (CAH-4G.5):**
- `projectHrrAuditRecord(identity, HrrResearchResult): ReviewerLkAccessAudit | null` (`lib/hrr/project-hrr-audit-record.ts`, **PURE**) — returns `{ actorUserId, submissionId }` when governed research occurred (`result.per_topic.length > 0`), else `null` (→ no event). Reads nothing from `attributed_question` / `HrrResearchAnswer`; names its two fields explicitly; no object spread.
- `runAuditedHrrResearch(input): Promise<HrrResearchAnswer>` (`lib/hrr-audit/run-audited-hrr-research.ts`, the **one impure orchestration boundary**) — `runHrrResearch` → `projectHrrResearchAnswer` → `projectHrrAuditRecord` → (if non-null) `await recordReviewerLkAccess(...)` **throws `HrrAuditNotRecordedError` on failure** → return answer only on success. Not a route; Slice 6 wraps it.
- **Authority-only / unsupported → NO audit event** (Phase 10: never record governed-knowledge access when no governed knowledge was accessed; never fabricate claim access). `outside_current_coverage` DOES record an event (the selector ran; nothing surfaced is still a governed research access).
- **Multi-topic → ONE row per reviewer action** (the reused contract records no per-topic detail; one row per resolved topic would falsely imply many separate look-ups).
- **Mixed authority + research → one `lk_research` row** for the governed research; the audit does not encode the declined assessment decision and implies no reliance.
- **Applicability / BI status / `does_not_apply` / unresolved identifiers are deliberately NOT persisted** — stable `claim_id`s already identify the governed material, and the audit must stay valid when presentation copy changes; it is not a duplicate `HrrResearchResult`.
- Any future structured enrichment (Option B) or verbatim-question retention remains a **separate explicit privacy/data-governance decision** with its own migration + firewall update.

### Audit-before-content execution order (FROZEN — extends, does not weaken, the CAH-4E guarantee)

CAH-4E's route order is: (1) authorize; (2) validate request; (3) select governed results **into memory** (no audit); (4) **persist the `lk_research` audit — throws on failure**; (5) **only then** return governed content. On audit-persistence failure → **503, zero governed content**.

HRR's frozen order is a **superset** of that — internal computation may occur before the audit write *only where it is needed to know what must be audited*, and **no governed content leaves the server before the audit row is durably persisted:**

```
POST /api/admin/submissions/[id]/reviewer-lk/research  (SHIPPED CAH-4G.6):
0. body { mode: 'topic_pick', topic } | { mode: 'question', question }  — messages[]/history/session_id → 400
1. authenticate / authorize reviewer               checkReviewerContextAccess()  — fail → 401/403, no audit
2. validate input shape + length                   parseBody()  — malformed / bad topic / blank / > HRR_QUESTION_MAX_LENGTH → 400, no classifier, no audit
3. resolve permitted research intent
     mode 'topic_pick'                              topicSelectionGateResult(topic)     — 0 model calls
     mode 'question'                                createAnthropicResearchIntentInterpreter()(question)  — 1 classify-only call, fails closed
                                                    → hrrAuthorityGate(classified, { sourceTextRef: null })
     (interpreter constructor throw → 503; classifier call never throws)
4. resolve submission retrieval context            getSubmissionFactsForReviewerLk() → buildReviewerLkContext()  — null → 404, no audit

runAuditedHrrResearch()  (SHIPPED CAH-4G.5 — steps 5–8):
5. pure pipeline, IN MEMORY                         runHrrResearch() → projectHrrResearchAnswer()   (nothing returned yet)
6. sanitized audit projection                      projectHrrAuditRecord(identity, result)
                                                    → null when no governed research → skip 7, return the (refusal/paths) answer
7. PERSIST the lk_research audit event              recordReviewerLkAccess({ actorUserId, submissionId })  — THROWS on failure
      audit persistence fails → FAIL CLOSED → HrrAuditNotRecordedError → route answers 503 { error: <fixed message> }, ZERO governed content
8. ONLY THEN                                        NextResponse.json(HrrResearchAnswer)
```

The pure pipeline at step 6 runs entirely in memory and returns nothing; a failure there (or in composition) throws before step 8, so a failed research action never produces a successful audit row. **The CAH-4E audit-before-content guarantee is preserved** — HRR does not weaken it. It does **not** record *which* governed claims were accessed (Option A — the deployed contract records no claim detail; adding it is a separate migration decision).

| Option | What | Migration? | Verdict |
|---|---|---|---|
| **A. reuse `lk_research` unchanged** | one `lk_research` row per free-form question, identical to a topic look-up | **no** | ✅ satisfies "actor + submission + explicit action". Loses "which topics / which governed claims / topic-pick vs question". Smallest possible. |
| **B. nullable structured enrichment of the existing row** | add nullable columns `research_mode text`, `resolved_topics text[]`, `question_intent text`, `governed_claim_ids text[]` to `crc_context_access_events` | **yes (1 migration, additive, nullable — no backfill)** | ✅ **RECOMMENDED direction.** Keeps one audit table + `access_kind='lk_research'`. Records the *structured resolution* (topics, intent, claim_ids) — full "research request provenance + governed content access" — **without storing raw question text**. Existing `authority-firewall` tests + the CHECK are unaffected. |
| **C. separate detail record linked to the access event** | `crc_context_access_events` row (unchanged) + a `hrr_research_query_details` row FK'd to it | **yes (1 migration, new table)** | ⚠️ more moving parts; only worth it if detail retention policy must differ from the access-fact retention policy. |
| **D. structured payload in an existing JSONB column** | if `crc_context_access_events` has an unconstrained JSONB `details`/`metadata` column (it does **not** today — verified), stash the structured resolution there | n/a | not available |

**SHIPPED (OQ-1, §T-1) — Option A supersedes the frozen Option B (see the numbered rationale under §K's heading).** `access_kind` stays `'lk_research'`; the row stays `{access_kind, actor_user_id, submission_id, created_at}`; **no migration.** The raw free-form question is never persisted — not by default, not for debugging, not as a transcript, and it is not hashed (there is no audit need for a hash). Option B (four nullable structured columns) remains a viable, unblocked future enrichment if a concrete governance need for topic/claim-level research audit arises — it would be its own migration + `authority-firewall.test.ts` update + a new writer placed OUTSIDE `lib/reviewer-lk/repository.ts`.

## L. Trust / prompt-injection boundaries

| Input | Trust | Control |
|---|---|---|
| **Governed Living Knowledge** (`TopicClaim` content, `crc_candidate_statement`) | **trusted authority source** — SI8-governed, human-reviewed ledger, subject to lifecycle / channel / applicability rules | verbatim passthrough only; never model-rewritten |
| Reviewer free-form question | **untrusted / non-authoritative** (authenticated admin, but still user text) | goes **only** into the §C structured classifier (strict enum-only schema; cannot carry an answer/instruction); echoed back **verbatim**; never interpreted as a directive |
| Submission structured facts (`tools_used`, `territory_preferences`) | **untrusted** (customer-authored) | already sanitized: `normalizeCandidate` (canonical-id-or-drop, fail-closed), `evaluateApplicabilityDetailed` (structured comparison). No free text reaches retrieval or the model. |
| Submission free text (title, descriptions, filenames, URLs, authorship statement) | **untrusted** | **not read by HRR at all** — `reviewer-lk/repository.ts` reads only the two structured columns; keep it that way |
| Linked CRC transcript / structured context | **untrusted** | **not read** (§M) |

**No untrusted text may override** system policy · governance · channel eligibility · applicability · BI constraints · Commercial Assurance authority boundaries. The only model call sees the reviewer question + a fixed enum-only schema; retrieval is pure structured comparison; composition carries no model prose in V1. Prefer structured context over raw text everywhere. This is the same "Extraction proposes, mutation decides" / canonicalize-or-drop protection the CRC structured-extraction architecture already provides.

## M. CRC context — excluded automatically in V1

HRR V1 retrieval reads **only** the submission's own authoritative structured facts. It does **not** read `crc_assurance_associations`, CRC structured project context, or CRC transcript — automatically or by default. UI adjacency (both tabs in the inspector) is not retrieval authority. The Reviewer LK ↔ Linked CRC Context separation stays authoritative and independently audited (`lk_research` vs `transcript`). Future explicit contextual inclusion = a separate architecture decision with its own provenance + evidence-boundary analysis.

## N. State — single-turn semantic model (FROZEN, OQ-6 — AMENDED by CAH-4G.9, 2026-09-10)

> **CAH-4G.9 amendment:** PM production UAT found the single-turn model *too visible*. The visible layer becomes an append-only **client-only** research thread (still non-semantic, still no persistence, refresh-clears — exactly this section's "history you can see"). The **one** semantic addition is a bounded **enum-only** referent for follow-up classification — `HrrThreadContext { prior_turn_id, prior_entry_mode, prior_resolved_topics: [{topic, scope, bi_status}] }` — carried client-side and sent to the classifier as a fixed-template `[Context:]` line. It **cannot** carry prior answers, prior prose, prior BI outputs, claim ids, applicability values, or project facts. Prior *answers* never become reasoning context. The one-model-call ceiling, the audit contract, and CRC are all unchanged. Full design: `HRR_CONVERSATIONAL_ARCHITECTURE.md`; decision: `ADR-003`. The rest of this section stands.

**Carried between questions: nothing (semantically) — except, post-CAH-4G.9, the bounded enum-only referent above.** Each question — topic or free-form — is independently interpreted against the *current* submission structured facts. No server session, no `crc_sessions`-style state, no question history in the model context, no "prior answer influences next retrieval", **no server-side semantic conversation state at all**.

**Not carried:** prior questions, prior answers, prior resolved topics, prior BI outputs, conversational corrections.

**May be retained (client-only, non-semantic):** the last N rendered answers, so the reviewer can scroll back — exactly like today's CAH-4E look-up result surviving inspector close/reopen (client React state, no persistence, no server round-trip). This is "history you can see", not "history that reasons".

**Future multi-turn compatibility:** `ExplicitResearchIntent` and `HrrResearchAnswer` are self-contained; a future session wrapper can be added without changing them. V1 does not implement it.

## O. Cost model

| Path | Anthropic calls | Notes |
|---|---|---|
| Topic pick | **0** | pure CAH-4E deterministic path — **verified in Slice 2**: `select-reviewer-claims.ts` / `project-reviewer-claims.ts` / `repository.ts` / the `reviewer-lk` route import no HRR classifier, no Anthropic adapter (`__tests__/reviewer-lk/hrr-classifier-firewall.test.ts` Phase 11). The classifier is invoked only from the (future) free-form path. |
| Free-form question | **exactly 1** (max 2 HTTP calls if the one recovery retry fires) | `ResearchIntentInterpreter` — `max_tokens` 1024/2048, enum-only schema, `thinking` disabled, 1 bounded recovery retry. No answer-generation call. |
| Retrieval / applicability / BI / composition | **0** | all deterministic in V1 |

**Cost/token claims:** none are measured yet — the figures above are **architectural expectations** (call count, schema size). Actual per-call token/latency measurement is the §V-7 offline eval, not run in Slice 2. (T-4) whether free-form may resolve >2 topics stays the one genuinely-open item — the cap is enforced (schema `maxItems` + deterministic re-cap).

## P. Failure semantics

Fail closed at every structured / model / governance boundary — see `PRD_CAH_4G_HRR §17`. Additionally: a partial failure (e.g. topic A resolves, topic B's `selectReviewerClaims` throws) → surface topic A's result + a bounded "could not complete research for <B>" note; never fabricate B's answer.

## Q. Observability

Measurable **without collecting raw reviewer text:**
- `hrr_intent` distribution (`research` / `assessment_judgment` / `unsupported`) and fail-closed rate (from the classifier telemetry sink).
- `resolved_topics` frequency (which governed topics reviewers research) — enum values only.
- `bi_status` distribution per topic (how often research lands `outside_current_coverage` / `relevant_applicability_unresolved` — signals governed-claims coverage gaps).
- `withheld` reason frequency (governed knowledge reviewers want but can't see).
- classifier structured-output failure classes (reuse `StructuredOutputTelemetryEvent`).
- topic-pick vs question ratio; questions-per-assessment.
- These feed the §20 learning loop and the governed-claims backlog — never a raw-question corpus.

## R. Future GRI reuse (do NOT change CRC now)

The smallest honest shared contracts, in likely order of extraction (each is a *separate future decision*, none is CAH-4G scope):

1. **`BiIntent`** (§H) — the minimal Bounded-Interpretation input. **SHIPPED (CAH-4G.1 Slice 1).** CRC adapts via a one-line `userGoalsToBiIntents` adapter with proven zero behavior change. This is the one shared contract CAH-4G actually touched.
2. **A `consultative-composition-core`** — extract the genuinely channel-neutral parts of `buildConsultativeAnswerPlan` (claim-ref sections, neutral unresolved-items, dedup) into `lib/consultative-composition/` once HRR's V1 composer and CRC's plan builder are both known real consumers. Not before.
3. **A `governed-research-selector` contract** — `select-reviewer-claims.ts` is already the reviewer-channel selector; a shared *interface* (channel-eligibility predicate + generic pre-filters + applicability) could later be factored so a third channel doesn't fork. Evidence-driven, post-HRR.
4. **Intent-entry contract** — `ExplicitResearchIntent` + `PermittedResearchIntent` could generalize to a channel-agnostic `ResearchIntent` if a non-reviewer non-CRC channel ever appears.

**CRC changes only when CRC's own usage evidence justifies it** — CRC's free-form pilot stays untouched so that evidence can be collected honestly.

---

## S. Architecture Freeze (2026-09-10) — the binding contract

| # | Frozen decision |
|---|---|
| S-1 | **Converged pipeline — SHIPPED CAH-4G.6, closed out CAH-4G.7.** Both entry modes produce `HrrResearchAnswer` via one internal `runHrrResearch()` → `projectHrrResearchAnswer()`, rendered by one `<HrrResearchAnswerView>`. The **one route** is `POST /api/admin/submissions/[id]/reviewer-lk/research` (`{ mode: 'topic_pick', topic }` \| `{ mode: 'question', question }` → `runAuditedHrrResearch(...)`). The CAH-4E `GET .../reviewer-lk?topic=` route + `ReviewerLkLookupResult` + `projectReviewerLkResult` + `route-and-audit.test.ts` are **RETIRED (CAH-4G.7)** — the fail-closed audit-before-content contract they proved is transferred to `hrr-research-route.test.ts`. |
| S-2 | **Topic path — unchanged authority spine** (see §A frozen contract): **0 model classification calls (SHIPPED CAH-4G.6 — the route calls `topicSelectionGateResult(topic)` and never constructs the classifier for `mode: 'topic_pick'`; proven by `hrr-research-route.test.ts`)**; `evaluateReviewerEligibility`; `selectReviewerClaims`; `evaluateApplicabilityDetailed`; no inferred facts; no assessment authority; audit-before-content (now via `runAuditedHrrResearch`); same `GoalCategory` identifiers (the chip's `data-topic` enum reaches the server verbatim in the POST body). **Evolves:** presentation only (BI + composition + `HrrResearchAnswerView`). |
| S-3 | **Free-form path — exactly one classify-only model call** (`ResearchIntentInterpreter`). **SHIPPED CAH-4G.2 Slice 2.** Structured enum-bounded output (`RESEARCH_INTENT_CLASSIFIER_SCHEMA`, `additionalProperties:false`, no prose field); `thinking` disabled; recovery retry via the shared `callWithOneRecoveryRetry('hrr_intent_classifier', …)`; deterministic `validateAndNormalizePermittedResearchIntent` after the call; **the adapter never throws — it fails closed to `unsupportedResearchIntent()`** (empty research, no decision) on any provider error / unrecoverable miss / normalizer rejection. |
| S-4 | **Trust / grounding** (§I frozen rule, `ADR-002`): reviewer text is untrusted; it grounds INTENT provenance only; every substantive factual proposition traces to grounding source A–E; a false premise is never echoed as fact. |
| S-5 | **BI adaptation** (§H — SHIPPED across CAH-4G.1/.2/.3/.3A): `buildBoundedInterpretations(BiIntent[], BiResult[], diagnostics?, humanContributionDescription?)`. **`BiIntent`** (Slice 1) — CRC adapts via `userGoalsToBiIntents` (proven zero behavior change); BI no longer applies a lifecycle filter itself. **`BiResult`** (Slice 3, + optional `applicability` field CAH-4G.3A) — `source_fact` nested + `applicability` optional so a CRC `RetrievalResult` structurally satisfies `BiResult[]` (**every CRC call site + BI test byte-unchanged, proven byte-for-byte behavior-neutral**); HRR builds it via `reviewerClaimToBiResult` (`lib/hrr/`) with **no synthetic field**, translating (never re-evaluating) `claim.applicability_outcomes` into `BiResult.applicability`. `RetrievalResult` removed from BI's public contract. HRR intents adapt via `researchIntentToBiIntent` (`lib/hrr/`) — `intent_text` = the fixed topic label, never raw reviewer text. No synthetic `UserGoal`; no HRR-local BI rule table; **no HRR-specific BI status**. For HRR: `diagnostics` always `[]`; a `BiResult.applicability.status === 'unresolved'` match → `relevant_applicability_unresolved` (never `directly_relevant`); `not_met` claims are excluded from the BI feed → `does_not_apply[]`. |
| S-6 | **Composition** (§I FROZEN, OQ-3): deterministic/template `projectHrrResearchAnswer()`; **no second model call**; grounding-test-enforced. The durable invariant is semantic ("only what BI permits, traceable to grounding A–E"), not "templates forever". **SHIPPED CAH-4G.4** — `lib/hrr/project-hrr-research-answer.ts`; authored prose is the single enumerable `HRR_ANSWER_TEMPLATES` constant; `HrrResearchAnswer` = two structurally-separate lanes (`assessment_authority_note` / `topics`) + a per-topic consultative hierarchy A–G; `relevant_applicability_unresolved` wording-locked away from established/resolved/satisfied/cleared/compliant/sufficient; ordering is deterministic input order (no governed materiality signal — documented limitation). CRC composition byte-unchanged (Phase 21 boundary held — no `rules.ts`/`consultative-answer-plan.ts` change). |
| S-7 | **Authority gate** (§D, §J FROZEN; mixed-intent rule corrected CAH-4G.1; **`hrrAuthorityGate` SHIPPED CAH-4G.2 Slice 2** — deterministic, synchronous, pure): **each semantic intent in the utterance is routed independently.** Every explicitly-named research clause runs the GRI pipeline **with its own `scope`** — informational → ordinary governed answer; `determination_request` → `determination_declined`, **only if that clause itself asked for a determination**. `assessment_decision_requested` is declined as its own block (authority note; + offered research paths when no research clause survives). **Never** a yes/no on approval/clearance/control/outcome. **Never** an invented "closest topic". **A prohibited intent never rewrites a permitted research clause's scope.** Mixed → decline the decision **and** answer the explicit research clause at its own (usually informational) scope, structurally separated. |
| S-8 | **Audit** (§K, OQ-1) — **SHIPPED CAH-4G.5 as Option A** (source inspection changed the frozen Option B): reuse `access_kind='lk_research'` **UNCHANGED — no migration**. The row stays `{access_kind, actor_user_id, submission_id, created_at}` (the deployed contract records no topic / claim detail). `projectHrrAuditRecord` (PURE, `lib/hrr/`) → `runAuditedHrrResearch` (the one impure boundary, `lib/hrr-audit/`) → `recordReviewerLkAccess` **before** any governed content; audit failure → `HrrAuditNotRecordedError` → the route's safe 503, zero content. Authority-only / unsupported → **no event**. Multi-topic / mixed → **one row per reviewer action**. **Raw question never persisted, never hashed.** Applicability / BI status / claim ids deliberately NOT persisted. Option B remains an unblocked future enrichment. |
| S-9 | **Single-turn** (§N FROZEN, OQ-6): nothing carried semantically between questions; no server-side conversation state; client-only scrollback is "history you can see", not "history that reasons". No raw-question / debug / transcript retention. |
| S-10 | **Linked CRC Context** (§M FROZEN, OQ-… / Task 9): **no automatic participation** — no transcript, no CRC conversation history, no silent CRC structured-context ingestion. UI adjacency ≠ retrieval authority. Future explicit inclusion = a separate architecture decision. |
| S-11 | **CRC boundary** (§R, Task 8 FROZEN): CAH-4G changes **no** CRC file — no CRC topic selectors, no CRC input redesign, no CRC composition change. CRC stays free-form during the pilot deliberately. GRI convergence with CRC is documented (§R) but **not implemented**; CRC changes only on CRC's own usage evidence. |
| S-12 | **Reviewer eligibility** (§F FROZEN): `evaluateReviewerEligibility` only (lifecycle + reviewer `publication_scope` + supersession). `crc_eligible` / `crc_publication_scope` never gate or render. |
| S-13 | **Likeness coverage** (OQ-7 FROZEN): 0 reviewer-eligible `TopicClaim`s for `likeness` does **not** block HRR V1. A `likeness` topic/question returns the bounded equivalent of "outside current governed coverage" (`bi_status: outside_current_coverage`). This is a governed-knowledge backlog item, not an orchestration patch. **No `likeness` claim added in this milestone.** |
| S-14 | **Classifier model/provider** (OQ-8 FROZEN; **SHIPPED CAH-4G.2**): inherits the interview-engine adapter pattern — `DEFAULT_MODEL = 'claude-sonnet-5'`, env override `HRR_INTENT_CLASSIFIER_MODEL`, `ANTHROPIC_API_KEY` (never silently mocked). `thinking: { type: 'disabled' }`, `max_tokens` 1024/2048. No new HRR-specific model *architecture*. Exact model choice is an implementation cost/quality-eval parameter (§V-7), not a blocker — no bounded eval has been run yet. |
| S-15 | **Authorization rollout** (OQ-9 FROZEN): `checkReviewerContextAccess()` (`is_admin`) is acceptable for **internal HRR V1 / pilot**. A dedicated reviewer role/grant is **required before broader reviewer rollout** — and per `auth.ts`'s own note, only that file changes then. CAH-4G is **not** a role/authorization redesign. |
| S-16 | **The GRI pipeline** is `ExplicitResearchIntent[] → governed retrieval → deterministic applicability → Bounded Interpretation → HRR consultative composition → HRR projection → audit`. No downstream layer expresses a conclusion stronger than Bounded Interpretation permits. |

## T. Resolved open questions

| OQ | Decision | Source-backed reason | Implementation implication |
|---|---|---|---|
| **T-1 Audit storage** — **DONE CAH-4G.5 as Option A (Option B superseded)** | **Reuse `access_kind='lk_research'` UNCHANGED. NO migration.** Raw question never persisted / hashed. | Source inspection (Slice 5): the deployed `lk_research` row is `{access_kind, actor, submission, created_at}` and records **no** topic/claim — so Option B's "which topics/claims" is a *new* capability, not preservation; and the frozen Option-B placement (structured writer in `lib/reviewer-lk/repository.ts`) breaks `authority-firewall.test.ts`'s "only `.insert`" + "bounded row shape" invariants. `access_kind='lk_research'` is honest for HRR (its migration defines it as "a Human Reviewer deliberately looks up governed SI8 Living Knowledge" — both entry modes). Slice 5's "smallest honest option" / migration-is-a-STOP-gate discipline → Option A. | `projectHrrAuditRecord()` (PURE, `lib/hrr/`) + `runAuditedHrrResearch()` (`lib/hrr-audit/`, reuses `recordReviewerLkAccess` unchanged). Option B stays an unblocked future enrichment (own migration + firewall update + writer outside `lib/reviewer-lk/repository.ts`). |
| **T-2 BI generic input** — **DONE (CAH-4G.1 + CAH-4G.3 + 3A)** | **`BiIntent` + `BiResult` (+ optional `BiResult.applicability`) minimal shared contracts.** `BiResult` keeps `source_fact` nested and `applicability` optional → a CRC `RetrievalResult` structurally satisfies it → **zero CRC call-site / test churn**. | Verified fields BI reads: intents → `{intent_id, intent_text, category, scope}`; results → `{matched_goal_category, unresolved_project_dependencies, claim_id, candidate_statement, match_origin, source_fact.kind, applicability?.status}`. Nothing more (`unresolved_requirements` is carried for a later composer, BI never reads it). | `lib/bounded-interpretation/{types.ts, build-bounded-interpretation.ts}`; NEW `lib/hrr/bi-adapters.ts`. CRC call sites unchanged. All three changes proven byte-for-byte behavior-neutral for CRC. |
| **T-3 V1 composition** | **Fully deterministic / template-based. No second LLM call.** Durable invariant stays semantic, not "templates forever". | `project-reviewer-claims.ts` (CAH-4E) is already a deterministic passthrough; `rules.ts` + `summary_blocks` already provide fixed, verbatim-quoting copy; a model composer adds a grounding-verification burden with no V1-required benefit. | `projectHrrResearchAnswer()` reads only already-built BI + claims + templates. `hrr-projection.test.ts` enforces grounding A–E. |
| **T-4 Free-form multi-topic maximum** — **cap SHIPPED CAH-4G.2; exact value still the one genuinely-open item** | **`HRR_MAX_RESOLVED_TOPICS = 2` (`reviewer-lk/types.ts`)** — recommended default; a bounded implementation experiment may raise it. | The governed topic universe has 5 topics; the only evidenced multi-topic reviewer question shape names exactly 2. 3+ topics produces an answer too large for the inspector rail and dilutes the direct response. Each extra topic is a cheap deterministic `selectReviewerClaims` pass, so the cost of a low cap is only UX, not correctness. | **As-built:** the classifier JSON schema caps `research_intents` via `maxItems: 2`, AND `validateAndNormalizePermittedResearchIntent` re-caps deterministically regardless of the model — dedup by topic, then if > 2 distinct topics survive, keep the first 2 by **governed enum order** (`REVIEWER_RESEARCH_TOPICS`) and add `'multiple_unrelated_topics'` to `unresolved_ambiguity`. The classifier **never invents** a topic. The reviewer-facing "your question spans several topics; researched: X, Y" note **SHIPPED CAH-4G.4** as `HrrResearchAnswer.scope_note` — a fixed template fired only when `multiple_unrelated_topics` is flagged and ≥1 topic was researched, naming the covered topic labels (grounding D + E). **Recommend a bounded HRR-internal experiment measuring how often reviewers hit the cap before changing the value.** |
| **T-5 Mixed judgment + research** (corrected CAH-4G.1, 2026-09-10) | **A mixed question carries multiple semantic intents; the authority gate separates them. The assessment-decision intent is declined. Every explicitly-supported research clause survives independently, keeping its OWN scope — usually `informational`, so it produces an ordinary governed answer, NOT `determination_declined`. A prohibited intent never contaminates the scope of a permitted one. A research clause becomes `determination_request` only when that clause itself asks for a determination. No surviving research clause → decline + offer paths.** Structurally separate the refusal from the research; never yes/no; never invent a topic. | `build-bounded-interpretation.ts` checks `scope === 'determination_request'` **before** any matching → `determination_declined` for a clause *only when the classifier set that clause's scope to `determination_request` on its own merits*. The classifier emits per-clause `research_intents[{topic, scope}]` + a separate `assessment_decision_requested` boolean (§C). | `hrrAuthorityGate()` routes each `research_intents[i]` to the pipeline at its own scope and, if `assessment_decision_requested`, emits `{ authority_note: 'assessment_judgment_redirected', offered_paths: <iff research_intents empty> }`. `HrrResearchAnswer` renders the refusal block and the per-clause research, visually separated. |
| **T-6 Raw-question persistence** | **None for V1** — no default, no debug retention, no hidden transcript, no history-for-convenience. Structured derived metadata per T-1 only. | Reviewer text may quote submission/customer PII; auditability is fully met by the structured resolution; there is no V1 requirement for verbatim capture. | Any future raw-question dataset = a separate explicit privacy/data-governance milestone. |
| **T-7 Likeness coverage** | **Does not block HRR V1.** Return the bounded "outside current governed coverage" equivalent. | `TOPIC_CLAIMS_FIXTURE` at `238670c` has 0 `likeness` claims; the one `likeness` claim is tool-scoped in `MATRIX_FIXTURE` and withheld under CRC Publication Policy Principle 3 (governance decision, not a code gap). | `bi_status: outside_current_coverage` for `likeness`; a governed-knowledge backlog ticket, not an HRR change. |
| **T-8 Classifier model/provider** — **DONE CAH-4G.2** | **Inherited the interview-engine adapter config pattern.** One classify-only call max per free-form action; `thinking` disabled; enum-bounded output; the shared `callWithOneRecoveryRetry` (1 recovery retry); fail closed, never throw. | `anthropic-decision.ts` (the closest analog — small enum schema, low `max_tokens`) uses `DEFAULT_MODEL='claude-sonnet-5'` + a per-job env override + `ANTHROPIC_API_KEY`; the extractor's "Thinking Disable" milestone (2026-08-26) established that a pure structured-output task is better off with `thinking` off. | `interpret-research-intent.anthropic.ts` (`createAnthropicResearchIntentInterpreter`); `HRR_INTENT_CLASSIFIER_MODEL` env; `interpret-research-intent.mock.ts` for tests. **Open:** a bounded offline cost/quality eval on held-out reviewer questions (§V-7) before any broader rollout — not run in Slice 2. |
| **T-9 Reviewer authorization** | **`is_admin` OK for internal V1 / pilot; dedicated grant required before broader rollout; only `auth.ts` changes then.** | `checkReviewerContextAccess()` is `is_admin` with an explicit "FUTURE: dedicated reviewer grant, ONLY this file changes" note; no dedicated grant exists in source today. | No auth change in CAH-4G. The rollout boundary is a documented gate, not a code task. |

**Genuinely still open:** only **T-4** (the exact `HRR_MAX_RESOLVED_TOPICS` value — kept at `2` through CAH-4G.7; a preview/production usage experiment, not an architecture blocker). **Pending, not open:** the authenticated visual UAT and the live classifier cost/quality eval — both need a deployed/preview environment with credentials, which the CAH-4G build slices did not have.

## U. Implementation contract — dependency-ordered slices (do NOT implement here)

Each slice is independently reviewable and independently revertible. **No slice ships CRC behavior change.**

| # | Slice | Files expected to change | Authority invariant | Tests required | Non-goals | CRC code touched? |
|---|---|---|---|---|---|---|
| **1 — DONE (CAH-4G.1, 2026-09-10)** | **BI input adaptation boundary + mixed-question doc correction** | `lib/bounded-interpretation/types.ts` (`BiIntent`), NEW `lib/bounded-interpretation/adapters.ts` (`userGoalsToBiIntents`), `build-bounded-interpretation.ts` (signature `UserGoal[]→BiIntent[]`; internal lifecycle filter removed → moved to the adapter), CRC call site in `run-crc-conversation.ts` + `synthetic-eligibility-canary.ts` + 3 scripts (wrap `goals`), 18 test files (per-file adapter shim), NEW `bi-intent-adapter.test.ts`. **Results stay `RetrievalResult[]` — `BiResult` deferred to slice 3.** | BI reads only `{intent_id,intent_text,category,scope}` + the verified result fields; no new inference; `determination_declined` still fires on `scope` before matching; adapter filter proven identical to the old inline filter | **DONE: full `__tests__/bounded-interpretation/**` + CRC + retrieval suites pass byte-for-byte before/after (identical 20-failing-suite / 77-failing-test / 3280-passing set, established via an isolated detached baseline worktree at the same parent); `tsc` clean; `next build` exit 0.** `bi-intent-adapter.test.ts` (21 tests: filter equivalence, field mapping, per-intent-scope preservation, firewall). | no new BI status; no HRR logic; no HRR type; `BiResult` deferred to Slice 3 (now DONE) | **YES** — `run-crc-conversation.ts` call site (1 line) + `build-bounded-interpretation.ts` (shared). **Regression proof completed.** |
| **2 — DONE (CAH-4G.2, 2026-09-10)** | **HRR structured free-form classifier + authority gate** | NEW `lib/reviewer-lk/interpret-research-intent.{ts,anthropic.ts,mock.ts}`, `lib/reviewer-lk/hrr-authority-gate.ts`; `ExplicitResearchIntent` / `PermittedResearchIntent` / `ReviewerResearchTopic` / `HrrAuthorityGateResult` + `REVIEWER_RESEARCH_TOPICS` / `HRR_MAX_RESOLVED_TOPICS` / `HRR_UNRESOLVED_AMBIGUITY_REASONS` in `lib/reviewer-lk/types.ts`; `StructuredOutputAdapterName` union += `'hrr_intent_classifier'` (telemetry label only). **HRR→`BiIntent` adapter deferred to Slice 3.** | classify-only; enum-only schema (`additionalProperties:false`, no prose field); adapter never throws, fails closed to `unsupportedResearchIntent()`; deterministic normalizer drops/never-coerces bad enums, dedups, re-caps at 2; gate is pure/sync, never invents a topic, never answers, never declines a `determination_request` clause (BI's job) | **DONE:** `hrr-intent-classifier.test.ts` (schema shape / prompt trust boundary / normalizer malformed-output + dedup + cap / mock / adapter fail-closed via mocked SDK), `hrr-authority-gate.test.ts` (Cases 1–6), `hrr-classifier-firewall.test.ts` (no LK retrieval / applicability / BI / composition / CRC-context / DB-write / raw-question persistence; topic path invokes no classifier; no route/migration/UI added). 3 new suites / 92 tests. `tsc` clean; `next build` exit 0; **full suite: identical 20-failing-suite / 77-failing-test set before/after** (baseline worktree at `973c626`). | no retrieval; no composition; no real Anthropic in tests; no HRR→BiIntent adapter yet | no |
| **3 — DONE (CAH-4G.3 + 3A, 2026-09-10)** | **Converged HRR research pipeline** | NEW **`lib/hrr/`** dir: `run-hrr-research.ts` (`runHrrResearch` + `topicSelectionGateResult`), `bi-adapters.ts` (`researchIntentToBiIntent`, `reviewerClaimToBiResult`), `types.ts` (`HrrResearchResult`, `HrrResearchTopicResult`). `lib/bounded-interpretation/types.ts` — `BiResult` (`+ BiApplicability`, `applicability?` field, CAH-4G.3A); `build-bounded-interpretation.ts` — `RetrievalResult`→`BiResult` + Case-3B trigger widened to `needsApplicabilityHedge` (project deps OR `applicability.status === 'unresolved'`). **No route, no UI, no audit** (`runHrrResearch` is PURE — takes an already-resolved `ReviewerLkContextBundle` + the gated `HrrAuthorityGateResult`; the route wires context + audit in Slice 5/6). | `selectReviewerClaims` / `evaluateReviewerEligibility` / `evaluateApplicabilityDetailed` **byte-identical calls, unchanged**; `diagnostics: []`; **applicability `unresolved` → BI `relevant_applicability_unresolved` (proposition still visible), never `directly_relevant` (CAH-4G.3A)**; `not_met` → `does_not_apply[]` (excluded from BI); `humanContributionDescription: {state:'unknown'}`; no `crc_eligible`; **no synthetic `UserGoal`, no synthetic `RetrievalResult` field, no applicability re-evaluation**; raw question never enters selection/applicability/BI (only `attributed_question`); BI stays the semantic ceiling (`determination_request` → `determination_declined`, precedence over unresolved-applicability, proven). | **DONE:** `run-hrr-research.test.ts` (31), `run-hrr-research-firewall.test.ts` (28), NEW `bi-result-applicability.test.ts` (16 — BI-core: `unresolved`→`relevant_applicability_unresolved`; `established`/absent→unchanged; CRC compat; `determination_request` precedence; mixed met+unresolved; no-composition-workaround firewall). `tsc` clean; `next build` exit 0; **full suite: identical 20-failing-suite / 77-failing-test set before/after** (baselines `ecba033` then `a1ebe9f` for 3A). | no composition prose; no `HrrResearchAnswer`; no route; no UI; no audit migration | no |
| **4 — DONE (CAH-4G.4, 2026-09-10)** | **Deterministic HRR composition / projection** | NEW `lib/hrr/project-hrr-research-answer.ts` (`projectHrrResearchAnswer(HrrResearchResult) → HrrResearchAnswer` + exported `HRR_ANSWER_TEMPLATES`); `HrrResearchAnswer` + `HrrAnswerTopic` + `HrrGovernedConsideration` + `HrrApplicabilityRollup` + `HrrUnresolvedInput` in `lib/hrr/types.ts`; `run-hrr-research-firewall.test.ts` extended (4th `lib/hrr` file; composer never a dependency of the pipeline core). **HRR-local fixed templates** (not a `rules.ts` change — `rules.ts` copy is CRC-channel-worded; Phase 21 boundary respected, CRC composition byte-unchanged). | grounding A–E only; **no second model call**; reviewer text = attributed quotation, never factual; `does_not_apply[]` → its own block; `relevant_applicability_unresolved` never rendered as established/resolved/satisfied/cleared/compliant/sufficient; `determination_declined` topic = refusal + boundary + refs only; two structurally-separate lanes (`assessment_authority_note` vs `topics`); no ranking (no governed materiality signal — documented) | **DONE:** `hrr-projection.test.ts` (14-case matrix + grounding sweep + wording lock + eligibility firewall + architecture firewall — every module-authored string reconstructs from `HRR_ANSWER_TEMPLATES`; `bi_summary_blocks`/`statement_verbatim` are byte-verbatim passthroughs; false-premise premise never reaches a substantive field). `tsc` clean; `next build` exit 0; **full suite: identical 20-failing-suite / 77-failing-test set before/after** (baseline `1eba7da`), +45 new passing / +1 new passing suite. | no model composition; no ranking; no route; no UI; no audit migration; no CRC composition change | no |
| **5 — DONE (CAH-4G.5, 2026-09-10)** | **Audit enrichment + audit-before-content** | **NO migration** (Option A — source inspection: the deployed `lk_research` row already can't record topic/claim detail, and the frozen Option-B placement conflicts with `authority-firewall.test.ts`). NEW `lib/hrr/project-hrr-audit-record.ts` (PURE — `projectHrrAuditRecord` / `hrrGovernedResearchOccurred`), NEW `lib/hrr-audit/run-audited-hrr-research.ts` (`runAuditedHrrResearch` + `HrrAuditNotRecordedError` — the one impure boundary, reuses `recordReviewerLkAccess` unchanged). `run-hrr-research-firewall.test.ts` extended (5th pure `lib/hrr` file). NO route, NO UI. | audit persists before any governed content; failure → `HrrAuditNotRecordedError` → route's safe 503, zero content; raw question never written / hashed; authority-only & unsupported → no event; multi-topic & mixed → one row per action; audit ≠ evidence (no reliance / finding / outcome) | **DONE:** `audited-hrr-research.test.ts` (projection purity + `null` on no-research; ordering audit-before-content; audit-throw → error, no content leak; timeout; append-only; authority-only/unsupported → no write; mixed → one row, no decision encoded; source firewall: one write, no BI/classifier/applicability re-run, no prose, no assessment state, `project-hrr-audit-record.ts` stays pure). `tsc` clean; `next build` exit 0; **full suite: identical 20-failing-suite / 77-failing-test set before/after** (baseline `2421749`). | no new `access_kind`; no `association_id`/`crc_session_id`; no route/UI; no CRC change | no |
| **6 — DONE (CAH-4G.6, 2026-09-10)** | **Reviewer Resources HRR interface + audited runtime integration** | NEW `app/api/admin/submissions/[id]/reviewer-lk/research/route.ts` (POST; both entry modes; wraps `runAuditedHrrResearch`), NEW `HrrResearchAnswerView.tsx` (the ONE `HrrResearchAnswer` renderer), REWRITTEN `ReviewerLkLookup.tsx` (topic shortcuts run research directly + Ask HRR `<textarea>`; one current response; race-guarded; question never persisted). `HRR_QUESTION_MAX_LENGTH` in `reviewer-lk/types.ts`. NEW `hrr-research-route.test.ts`; REWRITTEN `reviewer-resources-presentation.test.ts`; updated `reviewer-shell.test.ts` + both `authority-firewall.test.ts` + `hrr-classifier-firewall.test.ts` scope markers. **Legacy `GET .../reviewer-lk` retained** (not UI-reachable) pending Slice-7 retirement. | both modes → same `runHrrResearch` → same BI → same composer → same audited boundary → same renderer; topic path 0 model calls; free-form 1 classify-only call (fails closed); audit-before-content preserved; no conversation memory / no raw-question persistence; no Linked CRC grounding; no assessment mutation; client supplies only the question / topic enum; no shell rewrite (CAH-4F.1/4F.2 intact) | **DONE:** `hrr-research-route.test.ts` (auth · input contract incl. transcript-shape rejection + length · topic 0-model · free-form 1-model · audit-before-content ordering · audit-throw → 503 zero content · authority-only/unsupported → no audit · mixed → one audit, no decision encoded · actor never from body · append-only); `reviewer-resources-presentation.test.ts` (one shared renderer · hierarchy = render order · unresolved before provenance · two lanes distinguishable · neutral styling · no `crc_eligible`/`crc_publication_scope` · no promotion control). `tsc` clean; `next build` exit 0; **full suite: identical 20-failing / 77-failing set** (baseline `c39c85d`). | no chat history / sessions; no second LLM call; no web search / general knowledge; no Linked CRC; no CRC change; no migration | no |
| **7 — DONE (CAH-4G.7, 2026-09-10)** | **Visual UAT + composition hardening + integration closeout** | `HrrResearchAnswerView.tsx` (renderer-only consultative hardening — "what remains unresolved" leads; two per-topic provenance disclosures → one; per-claim requirement/ref re-lists dropped; "Not yet established" rollup group dropped). RETIRED `app/api/admin/submissions/[id]/reviewer-lk/route.ts` + `route-and-audit.test.ts` + `projectReviewerLkResult` + `ReviewerLkLookupResult`; `project-reviewer-claims.ts` → leaf `REVIEWER_LK_FRAMING` module. Firewall tests retargeted to the sole production path. `reviewer-resources-presentation.test.ts` updated. | no BI / composition / contract change; grounding preserved (`bi_summary_blocks` still verbatim); the retired route's fail-closed audit contract transferred to `hrr-research-route.test.ts`; `HRR_MAX_RESOLVED_TOPICS` stays 2 | **DONE:** server-rendered-markup review of the 7 §V cases (real components + real pipeline data — no auth browser session available); full suite: identical 20-failing / 77-failing set (baseline `0c33910`), −13 tests (route-and-audit); `tsc` clean; `next build` exit 0. **Pending:** authenticated visual UAT + live classifier cost/quality eval (preview/production). | not `CLOSED`/`PRODUCTION-PROVEN`; no CRC eval; no raw-question corpus | no |

**Slice ordering rationale (challenged against source):** slice 1 must precede everything (BI is the semantic ceiling and its input type is shared with CRC — get the regression proof out of the way first). Slices 2–4 are HRR-internal and independent of the UI/audit. Slice 5 (audit) can technically precede 3–4 but is placed after so the audit metadata (`governed_claim_ids`) has real producers. Slice 6 (UI) last of the build slices. Slice 7 gates broader rollout.

## V. Frozen UAT contract

The full scenario list is `PRD_CAH_4G_HRR §19` (14 scenarios). Binding for implementation acceptance, in addition:

- **V-1** Topic selection fires **zero** `hrr_intent` telemetry events; the topic path's governed selection is byte-identical to CAH-4E (assert the same `selectReviewerClaims` inputs); the *presentation* is the new `HrrResearchAnswer`.
- **V-2** Free-form single-topic and **V-3** bounded multi-topic (≤ `HRR_MAX_RESOLVED_TOPICS`) research.
- **V-4** Unsupported / over-general → fixed "try a topic".
- **V-5** "Should I approve this?" → decline, **no yes/no, no invented topic**, no retrieval.
- **V-6** "Should I approve this, and what does governed knowledge say about copyright ownership?" → **two independent intents.** The approval decision is declined (authority-refusal block). The `copyright_ownership` clause is `informational` → it produces an **ordinary governed research answer** (`directly_relevant` / `outside_current_coverage` / `relevant_applicability_unresolved` per the Matrix), **NOT `determination_declined`**. The two are structurally distinct in the answer. Assert the `copyright_ownership` `ExplicitResearchIntent` carries `scope: 'informational'` — the assessment-decision request must not have flipped it to `determination_request`.
- **V-6b** "Should I approve this, and should copyright ownership be treated as cleared?" → **both** intents declined: the approval decision, *and* the `copyright_ownership` clause — because that clause **itself** asks for a determination (`scope: 'determination_request'` → `determination_declined`), on its own merits, not by contagion.
- **V-7** "Since Veo gives us copyright ownership, is this cleared?" → the false premise is **not** repeated as factual authority; the decision is declined; only governed material (grounding A–E) substantiates any research response. (Also the classifier cost/quality eval parameter.)
- **V-8** Likeness question → honest "outside current governed coverage".
- **V-9** Applicability `unresolved` → not pass/fail, not silently assumed; `not_met` → "does not apply", in the separate block.
- **V-10** Audit persistence failure → **no governed claim content and no HRR substantive answer** returned.
- **V-11** Linked CRC present vs absent → identical HRR answer (no automatic participation).
- **V-12** Workbook (`workbook_data` + `assessments`) byte-unchanged; no evidence/finding/gap/control/outcome/sign-off mutation.
- **V-13** CRC: zero behavior/UI change (`/crc` runtime, input, composition, pilot questioning).
- **V-14** No `crc_eligible` / CRC-prose rendered; no promotion affordance anywhere.

## Module / type inventory

| Kind | Name | Location | Status |
|---|---|---|---|
| REUSED as-is | `checkReviewerContextAccess` | `lib/reviewer-context/auth.ts` | — |
| REUSED as-is | `selectReviewerClaims`, `evaluateReviewerEligibility`, `buildReviewerLkContext`, `submission-facts.ts` | `lib/reviewer-lk/` | — |
| REUSED as-is | `evaluateApplicabilityDetailed`, `providerScopeMatches`, `toolScopeMatches` | `lib/retrieval-engine/lookup-topic-claims.ts` | — |
| REUSED as-is | `normalizeCandidate` | `lib/interview-engine/extraction.ts` | — |
| REUSED as-is | `TOPIC_CLAIMS_FIXTURE`, `TopicClaim`, `REVIEWER_ELIGIBLE_PUBLICATION_SCOPES` | `lib/retrieval-engine/` | — |
| REUSED as-is | `GoalCategory`, `GoalScope`, `GOAL_CATEGORIES` | `types/interview-engine.ts` | — |
| REUSED as-is | `BoundedInterpretation`, `INTERPRETATION_STATUSES`, `rules.ts` templates, `DETERMINATION_DECLINED_TEMPLATE` | `lib/bounded-interpretation/` | — |
| REUSED (union widened) | Anthropic Structured Outputs adapter shape, `callWithOneRecoveryRetry`, telemetry sinks | `lib/interview-engine/anthropic-decision.ts` (template), `anthropic-structured-output-retry.ts` | **CAH-4G.2: `StructuredOutputAdapterName` += `'hrr_intent_classifier'` (label only, no runtime branch); module header notes the third consumer. Generic reliability infra; a future cleanup may relocate it.** |
| ADAPTED (additive) | `buildBoundedInterpretations`: `UserGoal[]` → `BiIntent[]` (Slice 1); `RetrievalResult[]` → `BiResult[]` (Slice 3); Case-3B trigger widened to also fire on `BiResult.applicability.status === 'unresolved'` (CAH-4G.3A). CRC call sites unchanged (a `RetrievalResult` structurally satisfies `BiResult`; it carries no `applicability` field so CRC never hits the new path). | `lib/bounded-interpretation/{types.ts, adapters.ts, build-bounded-interpretation.ts}` | **SHIPPED CAH-4G.1 + CAH-4G.3 + CAH-4G.3A — all proven byte-for-byte behavior-neutral for CRC.** |
| NEW type | `BiIntent`, `BiResult`, `BiApplicability` | `lib/bounded-interpretation/types.ts` | **SHIPPED — `BiIntent` CAH-4G.1, `BiResult` CAH-4G.3, `BiApplicability` + `BiResult.applicability?` CAH-4G.3A** |
| NEW type | `ExplicitResearchIntent`, `PermittedResearchIntent`, `ReviewerResearchTopic`, `HrrAuthorityGateResult`, `HrrUnresolvedAmbiguityReason` + consts `REVIEWER_RESEARCH_TOPICS` / `HRR_MAX_RESOLVED_TOPICS` / `HRR_UNRESOLVED_AMBIGUITY_REASONS` | `lib/reviewer-lk/types.ts` | **SHIPPED CAH-4G.2 Slice 2** |
| NEW type | `HrrResearchResult`, `HrrResearchTopicResult` (structured internal result) | `lib/hrr/types.ts` | **SHIPPED CAH-4G.3 Slice 3** |
| NEW type | `HrrResearchAnswer`, `HrrAnswerTopic`, `HrrGovernedConsideration`, `HrrApplicabilityRollup`, `HrrUnresolvedInput` (final composed answer) | `lib/hrr/types.ts` | **SHIPPED CAH-4G.4 Slice 4** |
| NEW module | `ResearchIntentInterpreter` contract + schema + prompt + `validateAndNormalizePermittedResearchIntent` + `unsupportedResearchIntent()` | `lib/reviewer-lk/interpret-research-intent.ts` (+ `.anthropic.ts` real adapter, `.mock.ts`) | **SHIPPED CAH-4G.2 Slice 2** |
| NEW module | `hrrAuthorityGate()` (deterministic, sync routing over `PermittedResearchIntent`) | `lib/reviewer-lk/hrr-authority-gate.ts` | **SHIPPED CAH-4G.2 Slice 2** |
| NEW module | `runHrrResearch()` + `topicSelectionGateResult()` (converged pipeline — PURE) | `lib/hrr/run-hrr-research.ts` | **SHIPPED CAH-4G.3 Slice 3** |
| NEW module | `researchIntentToBiIntent()`, `reviewerClaimToBiResult()` (HRR → BI adapters) | `lib/hrr/bi-adapters.ts` | **SHIPPED CAH-4G.3 Slice 3** |
| NEW module | `projectHrrResearchAnswer()` + `HRR_ANSWER_TEMPLATES` (deterministic composition — no model call) | `lib/hrr/project-hrr-research-answer.ts` | **SHIPPED CAH-4G.4 Slice 4** |
| NEW module | `projectHrrAuditRecord()` / `hrrGovernedResearchOccurred()` (PURE sanitized audit projection) | `lib/hrr/project-hrr-audit-record.ts` | **SHIPPED CAH-4G.5 Slice 5** |
| NEW module | `runAuditedHrrResearch()` + `HrrAuditNotRecordedError` (the one impure audit-before-content boundary) | `lib/hrr-audit/run-audited-hrr-research.ts` | **SHIPPED CAH-4G.5 Slice 5** |
| REUSED as-is | `recordReviewerLkAccess`, `crc_context_access_events` (`access_kind='lk_research'`) | `lib/reviewer-lk/repository.ts`, migrations `20260909010000` / `20260910000000` | **CAH-4G.5: reused UNCHANGED, no migration** |
| NEW route | `POST .../reviewer-lk/research` — both entry modes; wraps `runAuditedHrrResearch` (fail-closed audit-before-content); returns `HrrResearchAnswer` | `app/api/admin/submissions/[id]/reviewer-lk/research/route.ts` | **SHIPPED CAH-4G.6** |
| NEW UI | `HrrResearchAnswerView` (the ONE `HrrResearchAnswer` renderer) + rewritten `ReviewerLkLookup` (topic shortcuts run research directly + `<textarea>` Ask HRR; one current response; no conversation memory) | `app/admin/submissions/[id]/review/{HrrResearchAnswerView,ReviewerLkLookup}.tsx` | **SHIPPED CAH-4G.6** |
| RETIRED (CAH-4G.7) | `GET .../reviewer-lk?topic=` (CAH-4E topic look-up) + `route-and-audit.test.ts` + `projectReviewerLkResult` + `ReviewerLkLookupResult` — zero runtime consumers after CAH-4G.6; the fail-closed `lk_research` audit-before-content contract transferred to `hrr-research-route.test.ts` | — (deleted) | RETIRED |
| NEW tests | **SHIPPED:** CAH-4G.2 `hrr-intent-classifier` / `hrr-authority-gate` / `hrr-classifier-firewall`; CAH-4G.3 `run-hrr-research` / `run-hrr-research-firewall` / `bi-result-applicability`; CAH-4G.4 `hrr-projection`; CAH-4G.5 `audited-hrr-research`; **CAH-4G.6 `hrr-research-route` + rewritten `reviewer-resources-presentation`**. | `__tests__/reviewer-lk/`, `__tests__/hrr/` | current |
| AUDIT | reuse `access_kind='lk_research'` **UNCHANGED** (Option A — Option B superseded by CAH-4G.5 source inspection) | no migration | **SHIPPED CAH-4G.5 — `projectHrrAuditRecord` + `runAuditedHrrResearch` + reused `recordReviewerLkAccess`; §K / §S-8** |

**Unchanged, explicitly:** all of `lib/crc-engine/**` (except the `buildBoundedInterpretations` call site in `run-crc-conversation.ts` + `synthetic-eligibility-canary.ts` + 3 non-runtime scripts — wrapped in `userGoalsToBiIntents`, CAH-4G.1, proven zero behavior change; **CAH-4G.3 `RetrievalResult`→`BiResult` needed no CRC change at all — structural**), `lib/interview-engine/**` (except a one-line telemetry-label union widen in `anthropic-structured-output-retry.ts` + its header comment, CAH-4G.2 — no runtime branch, all existing interview-engine + CRC tests pass unchanged), all of `lib/reviewer-lk/**` selection/eligibility/applicability/projection/audit (CAH-4G.3 imports `selectReviewerClaims` + types from it, changes none of it; the reviewer-lk no-BI authority firewall is intact), `lib/crc-project-context/**`, `lib/crc-assurance-handoff/**`, `lib/assessments/**`, `WorkbookClient.tsx`, `page.tsx`, `ReviewerShell.tsx`, `workspace-layout-context.tsx`, every CRC route and the CRC UI, the reviewer-lk **topic** path (`select-reviewer-claims.ts` / `project-reviewer-claims.ts` / `repository.ts` / `submission-facts.ts` / `eligibility.ts` / the GET route — verified to invoke no classifier), `retrieve.ts` / `enumerateEligibleClaims` / `crc_eligible` / governed claims / `provider_scope` / `Lifecycle` / supersession / CRC eligibility.
