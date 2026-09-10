# HRR V1 / Governed Research Interface — Technical Design

**Status:** `ARCHITECTURE FROZEN / NOT IMPLEMENTED` (frozen 2026-09-10). Sections A–R are the design narrative; **§S (Architecture Freeze), §T (Resolved open questions), §U (Implementation contract), §V (Frozen UAT)** are the binding implementation contract — an implementation agent follows them and makes no architecture decisions while coding. No runtime code, tests, migrations, or audit fields exist. One genuinely-open item: `HRR_MAX_RESOLVED_TOPICS` (§T-4, recommended default 2) — a bounded implementation experiment, not an architecture blocker.
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
5. **Zero CRC change.** `lib/crc-engine/**`, `lib/interview-engine/**` (except the FROZEN additive `BiIntent`/`BiResult` generalization of `buildBoundedInterpretations` — §S-5/§U slice 1, requires CRC regression proof), CRC routes, CRC UI: untouched.

## A. Entry modes

```
TOPIC PATH  (research_mode = 'topic_pick')  — 0 model classification calls
  chip click → GoalCategory
            → ExplicitResearchIntent { source_kind:'topic_selection', topic, scope:'informational' }
            → GRI pipeline

FREE-FORM PATH  (research_mode = 'question')  — exactly 1 classify-only model call
  reviewer question (verbatim, UNTRUSTED — §L)
            → interpretResearchIntent()  [ONE bounded structured LLM call — classifies/maps, NEVER answers]
            → PermittedResearchIntent { intent, resolved_topics[], scope, unresolved_ambiguity[] }
            → authority gate (§D)
            → for each resolved topic (max HRR_MAX_RESOLVED_TOPICS, frozen default 2 — §T-4):
              ExplicitResearchIntent { source_kind:'interpreted_question', topic, scope, source_text_ref }
            → GRI pipeline
```

**Frozen topic-path contract (§S).** The topic path is **not** "byte-identical to CAH-4E" — it now also flows through Bounded Interpretation + HRR composition (intentional CAH-4G product evolution). What is **frozen unchanged** for the topic path: 0 model classification calls; `evaluateReviewerEligibility` authority; `selectReviewerClaims` selection authority (byte-identical calls); `evaluateApplicabilityDetailed` (`met`/`unresolved`/`not_met`, never collapsed); no inferred project facts; no assessment authority; audit-before-content; the same `GoalCategory` topic identifiers. What **evolves**: the presentation/interpretation layer only — BI status + consultative framing + navigation. Every governed proposition CAH-4E surfaced is still surfaced verbatim.

**GRI pipeline (identical for both modes):**
```
ExplicitResearchIntent[]
  → governed retrieval        selectReviewerClaims() per intent.topic       (lib/reviewer-lk/select-reviewer-claims.ts — REUSED)
  → deterministic applicability   evaluateApplicabilityDetailed()           (lib/retrieval-engine/lookup-topic-claims.ts — REUSED, already inside the selector)
  → Bounded Interpretation     buildBoundedInterpretations(BiIntent[], …)   (lib/bounded-interpretation/ — REUSED via §H adaptation)
  → consultative composition   projectHrrResearchAnswer()                   (NEW, thin, deterministic, no model call — §I)
  → provenance / projection    HrrResearchAnswer                            (NEW type — §J)
  → append-only access audit   recordHrrResearchAccess()                    (audit contract §K FROZEN — reuse lk_research + additive nullable enrichment)
```

**Convergence point:** both modes converge at `ExplicitResearchIntent[]` — *before* retrieval. Everything downstream is shared and model-free.

## B. Intent representation — NO synthetic UserGoals

**`ExplicitResearchIntent`** (NEW type, `lib/reviewer-lk/` — HRR-owned):
```ts
interface ExplicitResearchIntent {
  source_kind: 'topic_selection' | 'interpreted_question'
  topic: GoalCategory                     // GOAL_CATEGORIES \ 'unknown'
  scope: GoalScope                        // 'informational' | 'determination_request'  (reused enum from types/interview-engine)
  // provenance — survives the whole pipeline, rendered in the answer:
  source_text_ref: string | null          // for 'interpreted_question': a reference/id to the reviewer question (NOT stored raw by default — §K)
  interpreted: boolean                     // true iff source_kind === 'interpreted_question'
}
```

**Why not `UserGoal`:** a `UserGoal` (`types/interview-engine.ts:665`) carries CRC-conversation lifecycle (`state: ConfidenceState`, `superseded_by`, `source_turn`, `source_statement`, confirm/decline/supersede semantics via `mutations.ts`) that is meaningless for a single reviewer research action and would invite CRC-orchestration coupling. **CRC `UserGoal`s stay genuine CRC `UserGoal`s. HRR research questions stay genuine HRR research questions.** They adapt into a smaller shared BI input contract (§H), and explicit provenance survives that adaptation (`interpreted`, `source_kind`, `source_text_ref`).

## C. Free-form structured classification

**`interpretResearchIntent(question: string): Promise<PermittedResearchIntent>`** (NEW, `lib/reviewer-lk/`; the ONE model call in HRR).

Modeled exactly on `lib/interview-engine/anthropic-extractor.ts` (which already emits `goal_category_hint` + `goal_scope_hint` from free text via Anthropic GA Structured Outputs) and reuses `lib/interview-engine/anthropic-structured-output-retry.ts` verbatim.

```ts
interface PermittedResearchIntent {
  intent: 'research' | 'assessment_judgment' | 'unsupported'
  resolved_topics: GoalCategory[]         // topics the QUESTION names — [] allowed; never a fabricated "closest topic"
  scope: GoalScope                        // 'determination_request' iff the reviewer asked HRR to decide something
  unresolved_ambiguity: Array<'no_governed_topic_matched' | 'topic_without_governed_coverage' | 'question_too_general' | 'multiple_unrelated_topics'>
}
```

| Attribute | Contract |
|---|---|
| Schema | strict JSON (`output_config.format`, `type: json_schema`): the 4 fields above, all enum-constrained, `resolved_topics` = array of the `GoalCategory` enum minus `'unknown'`. **No free-text field.** Structurally cannot carry an answer, a claim, or prose. |
| System prompt (forbidden outputs) | "You may only classify and map. Never produce an answer, a legal or commercial statement, a governed claim, a paraphrase of governed knowledge, a project conclusion, or advice. Emit only the schema." |
| Retry | `callWithStructuredOutputRecoveryRetry` (existing) — 1 bounded recovery retry, raised `max_tokens`, `missing_output_max_tokens` / `sdk_parse_failure` classification, telemetry sink. No unbounded loop. |
| Fail-closed | schema-nonconforming after retry, provider/SDK error, `intent` absent, OR (`intent === 'research'` AND `resolved_topics.length === 0`) → **return `{ intent: 'unsupported', resolved_topics: [], scope: 'informational', unresolved_ambiguity: ['no_governed_topic_matched'] }`** → the caller shows fixed "try a topic" copy and runs **no retrieval**. |
| `scope` default | `'informational'` (mirrors CRC's proven default rationale — mis-assuming a determination request suppresses a real answerable claim; the reverse is worse only if it *answered*, which this stage cannot). |
| Model/provider | one small low-`max_tokens` call, no `thinking`, no sampling params — same shape as `anthropic-extractor.ts`. Model id: governed by the same mechanism as the interview-engine adapters (see §T-8 — not re-decided here). |
| Observability | reuse `StructuredOutputTelemetryEvent`/`StructuredOutputSuccessTelemetryEvent` sinks; add an `hrr_intent` analytics event carrying `intent` + `resolved_topics` (enum values only) + fail-closed flag — **never the raw question**. |

## D. Authority gate — research / assessment-judgment / unsupported

Deterministic routing over the structured `PermittedResearchIntent` (no second model call):

| `PermittedResearchIntent` | HRR behavior |
|---|---|
| `intent: 'research'`, `resolved_topics: [T…]`, `scope: 'informational'` | run GRI pipeline for each `T`; `scope` flows to BI as `'informational'` |
| `intent: 'assessment_judgment'` **and** `resolved_topics` non-empty | for each named `T`: build `ExplicitResearchIntent { scope: 'determination_request' }` → BI returns `determination_declined` for that topic (BI checks `scope` **before** any matching — `build-bounded-interpretation.ts:185`). Composition: (1) the §5 authority note ("HRR does not determine the assessment outcome; that is your judgment"), (2) the governed considerations relevant to the reviewer's own judgment on the named topic(s) + unresolved applicability. **No yes/no.** |
| `intent: 'assessment_judgment'` **and** `resolved_topics` empty | decline the determination + **offer the research paths** (the topic list). **Do not invent a "closest topic".** No retrieval, no BI. |
| `intent: 'unsupported'` | fixed copy: "Human Reviewer Research answers narrower governed questions about this submission. Try one of these topics:" + chips. No retrieval, no BI. |
| Mixed (research + judgment in one question) | classifier resolves `intent: 'assessment_judgment'` (the more consequential class) + `resolved_topics` for the research portion → the row-2 behavior: decline the decision **and** research the explicit portion, clearly separated in the answer. |

**The gate's output is a routing decision, never an answer.**

## E. Retrieval

**Reuse `selectReviewerClaims()` (`lib/reviewer-lk/select-reviewer-claims.ts`) per resolved topic — unchanged.** It already:
- pre-filters `TOPIC_CLAIMS_FIXTURE` by `topic` + `providerScopeMatches` + `toolScopeMatches` (generic pure primitives, fail-closed);
- gates each candidate through `evaluateReviewerEligibility` (lifecycle `Adopted` + `publication_scope ∈ REVIEWER_ELIGIBLE_PUBLICATION_SCOPES` + `superseded_by === null`) → ineligible → `withheld[{claim_id, reason}]`;
- runs `evaluateApplicabilityDetailed` per claim → per-requirement `met` / `unresolved` / `not_met`;
- passes through verbatim governed fields → `ReviewerLkClaim`;
- sorts by `claim_id` (never a rank).

**Submission facts** come from `buildReviewerLkContext()` (`lib/reviewer-lk/submission-facts.ts`) over `submissions.{tools_used, territory_preferences}` — unchanged. `assetProviderIds` stays `[]` in V1 (no structured provider field on `submissions`).

**Why not CRC `retrieve()`:** `retrieve()` → `enumerateEligibleClaims` → **`crc_eligible === 'Yes'`** gate (the *unsupervised-channel* filter). Using it for a reviewer would silently narrow reviewer knowledge to the CRC-channel subset, contradicting `eligibility.ts`'s explicit design (*"Reviewer access may legitimately expose knowledge that is Adopted but not CRC Eligible"*). Forking `retrieve()` is worse than reusing the small selector that already exists for exactly this reason. See §Q.

**Multiple resolved topics** → run `selectReviewerClaims` once per topic; union the `ReviewerLkClaim[]`; carry each claim's originating `ExplicitResearchIntent` for grouping in the answer.

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

## H. Bounded Interpretation — the smallest honest adaptation boundary

**Current:** `buildBoundedInterpretations(goals: UserGoal[], results: RetrievalResult[], diagnostics?, humanContributionDescription?)` (`build-bounded-interpretation.ts:172`). It reads only `goal.{superseded_by, state, scope, category, goal_id, raw_text}`.

**FROZEN (OQ-2, §T-2): additive generalization of the input type.** `buildBoundedInterpretations` takes `BiIntent[]`; CRC adapts through a one-line `userGoalsToBiIntents` adapter; HRR builds `BiIntent` directly. CRC `UserGoal`s stay genuine `UserGoal`s; HRR research intents stay genuine research intents. The alternative (HRR-local rule re-application) is **rejected** — it would create a second place the four-status rule table lives.
- Introduce `BiIntent` — the minimal shape BI needs:
  ```ts
  interface BiIntent { intent_id: string; intent_text: string; category: GoalCategory; scope: GoalScope }
  ```
- `buildBoundedInterpretations` accepts `BiIntent[]` instead of `UserGoal[]`. **CRC is unaffected**: add a one-line adapter `userGoalsToBiIntents(goals: UserGoal[]): BiIntent[]` that filters `superseded_by === null && state === 'confirmed'` (the exact filter BI already applies internally, line 178) and maps `{goal_id→intent_id, raw_text→intent_text, category, scope}`. CRC's call site changes from `buildBoundedInterpretations(goals, …)` to `buildBoundedInterpretations(userGoalsToBiIntents(goals), …)` — **zero behavior change, provable by the existing BI test suite** (`__tests__/bounded-interpretation/**`).
- HRR builds `BiIntent` directly from `ExplicitResearchIntent` (`intent_id` = a per-request id; `intent_text` = for a topic pick, the fixed topic label; for a question, the attributed quotation — **used only as `BoundedInterpretation.goal_text` which BI renders verbatim and never transforms**, per `build-bounded-interpretation.ts:391` + the PM revision-6 note; `category` = `intent.topic`; `scope` = `intent.scope`). **No synthetic `UserGoal`.**
- HRR provenance (`interpreted`, `source_kind`, `source_text_ref`) is carried alongside by the HRR caller, keyed by `intent_id` — it never enters `BiIntent` or BI.

**Second adaptation boundary — results (FROZEN).** `buildBoundedInterpretations` also reads a `RetrievalResult[]` and (verified at `238670c`) touches exactly these fields per result: `matched_goal_category` (the §198 filter), `unresolved_project_dependencies`, `claim_id`, `candidate_statement`, `match_origin` (checks `=== 'related_topic'`), `source_fact.kind` (checks `=== 'tool'`). HRR's selector emits `ReviewerLkClaim[]`, not `RetrievalResult[]`, so a pure adapter **`reviewerClaimToBiResult(claim, topic): BiResult`** is required. Frozen mapping: `matched_goal_category = topic`; `candidate_statement = claim.statement`; `claim_id`, `unresolved_project_dependencies` verbatim; `match_origin = 'exact_topic'` (HRR V1 has no related/discovered path); `source_fact = { kind: 'topic' }` (a topic-sourced claim — the tool-specific template clauses correctly do not fire). Freeze `BiResult` as the same minimal 6-field subset (not the full `RetrievalResult`) so BI's input is one small shared contract, mirroring `BiIntent`.

**Frozen BI-input semantics for HRR:**
- **`diagnostics` is always `[]`** for HRR. CAH-4E's `selectReviewerClaims` *surfaces* a topic-matched claim regardless of applicability status (it never produces an `applicability_unmet` diagnostic the way CRC's `retrieve()` does). So **Case 3A (formal-gate-unmet → claim withheld) never fires for HRR** — HRR does not withhold; it shows the claim with its `unresolved` requirement verbatim ("not a negative finding"). Case 3B (`relevant_applicability_unresolved` via `unresolved_project_dependencies.length > 0`) **does** apply and is wanted.
- **`not_met` claims.** A claim with any `not_met` requirement (fact confirmed-false → the claim provably does not apply) is **not** fed to BI as a responsive match. It is carried in `HrrResearchAnswer` in a separate "governed knowledge that does not apply to this submission" block — verbatim `statement` + the failing requirement — shown for transparency, never woven into the direct answer. Claims with only `met` and/or `unresolved` requirements feed BI normally.
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

**V1 implementation: deterministic / template-based `projectHrrResearchAnswer()` (NEW, `lib/reviewer-lk/`, no model call).** It assembles the `HrrResearchAnswer` from: verbatim governed `statement`s + `BoundedInterpretation.summary_blocks` + fixed per-status templates + mechanical enumerations of `claim_id` / `status` / `requirement`. The reviewer's question is carried **only** as an attributed quotation string (`HrrResearchAnswer.question_text`) — it is displayed, never a factual grounding source (§L, `ADR-002`).

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

**`HrrResearchAnswer`** (NEW type, `lib/reviewer-lk/types.ts`):
```ts
interface HrrResearchAnswer {
  research_mode: 'topic_pick' | 'question'
  question_text: string | null                 // verbatim, echoed in the answer; null for topic_pick
  authority_note: 'research' | 'assessment_judgment_redirected' | 'unsupported'
  per_topic: Array<{
    topic: GoalCategory
    intent_origin: 'topic_selection' | 'interpreted_question'
    bi_status: InterpretationStatus
    summary_blocks: string[]                    // from BoundedInterpretation — verbatim, no new prose
    governed_propositions: Array<{
      claim_id: string
      statement_verbatim: string | null
      applicability_established: boolean
      applicability_outcomes: Array<{ requirement: ApplicabilityRequirement; status: ApplicabilityRequirementStatus }>
      unresolved_project_dependencies: string[]
      governed_claims_reference: string          // pointer into GOVERNED-CLAIMS.md
    }>
    what_lk_does_not_establish: string           // fixed template per bi_status — NOT model prose
  }>
  withheld: ReviewerLkWithheld[]                 // governed knowledge exists but not reviewer-eligible + reason (not content)
  offered_research_paths: GoalCategory[] | null  // populated only for assessment_judgment-without-topic / unsupported
}
```

**Original reviewer action preserved:** `research_mode`, `intent_origin` per topic (`topic_selection` vs `interpreted_question`), `authority_note`. Explicit reviewer intent is never merged with system-expanded relevance — a future discovered-relevance block would be a *separate* `per_topic` entry with `intent_origin` marked accordingly (§ compatibility only, not built in V1).

## K. Audit / privacy — FROZEN contract (migration is an implementation requirement, not created here)

Current CAH-4E audit (verified at `238670c` — `route.ts` §12 comment + `repository.ts`): `crc_context_access_events`, `CHECK access_kind IN ('transcript', 'lk_research')` (migrations `20260909010000`, `20260910000000`); row = access fact only (actor, submission, time); `lk_research` rows leave `association_id` / `crc_session_id` NULL. The `access_kind` vocabulary is *"explicitly designed to be"* extended.

### Audit-before-content execution order (FROZEN — extends, does not weaken, the CAH-4E guarantee)

CAH-4E's route order is: (1) authorize; (2) validate request; (3) select governed results **into memory** (no audit); (4) **persist the `lk_research` audit — throws on failure**; (5) **only then** return governed content. On audit-persistence failure → **503, zero governed content**.

HRR's frozen order is a **superset** of that — internal computation may occur before the audit write *only where it is needed to know what must be audited*, and **no governed content leaves the server before the audit row is durably persisted:**

```
1. authenticate / authorize reviewer               checkReviewerContextAccess()  — fail → 401/403, no audit
2. receive the explicit reviewer action            topic pick  OR  free-form question
3. classify intent (free-form only)                interpretResearchIntent()  — 1 model call; fail-closed → 'unsupported'
                                                    (the classifier returns NOTHING to the reviewer; its result is audit metadata)
4. authority gate + resolve permitted topic(s)     hrrAuthorityGate()  — assessment_judgment/unsupported → offered-paths only, skip 5–8
5. governed selection + applicability + BI          selectReviewerClaims() per topic → reviewerClaimToBiResult → buildBoundedInterpretations
                                                    — all IN MEMORY, nothing returned yet
6. determine structured audit metadata             { research_mode, resolved_topics, question_intent, governed_claim_ids }
7. PERSIST the lk_research audit event              recordHrrResearchAccess()  — THROWS on failure
      audit persistence fails  →  FAIL CLOSED  →  return NO governed claim content, NO HRR substantive answer (503 / bounded error)
8. ONLY THEN                                        projectHrrResearchAnswer()  →  return HrrResearchAnswer to the reviewer
```

The classifier call at step 3 is not governed content and returns nothing to the reviewer; incurring its cost before the audit persists is acceptable (a failed audit discards the classification and exposes nothing). **The CAH-4E audit-before-content guarantee is preserved and strengthened** (HRR additionally audits *which governed claims* were accessed).

| Option | What | Migration? | Verdict |
|---|---|---|---|
| **A. reuse `lk_research` unchanged** | one `lk_research` row per free-form question, identical to a topic look-up | **no** | ✅ satisfies "actor + submission + explicit action". Loses "which topics / which governed claims / topic-pick vs question". Smallest possible. |
| **B. nullable structured enrichment of the existing row** | add nullable columns `research_mode text`, `resolved_topics text[]`, `question_intent text`, `governed_claim_ids text[]` to `crc_context_access_events` | **yes (1 migration, additive, nullable — no backfill)** | ✅ **RECOMMENDED direction.** Keeps one audit table + `access_kind='lk_research'`. Records the *structured resolution* (topics, intent, claim_ids) — full "research request provenance + governed content access" — **without storing raw question text**. Existing `authority-firewall` tests + the CHECK are unaffected. |
| **C. separate detail record linked to the access event** | `crc_context_access_events` row (unchanged) + a `hrr_research_query_details` row FK'd to it | **yes (1 migration, new table)** | ⚠️ more moving parts; only worth it if detail retention policy must differ from the access-fact retention policy. |
| **D. structured payload in an existing JSONB column** | if `crc_context_access_events` has an unconstrained JSONB `details`/`metadata` column (it does **not** today — verified), stash the structured resolution there | n/a | not available |

**FROZEN (OQ-1, §T-1): Option B.** `access_kind` stays `'lk_research'` (no new value, no CHECK change). One **additive, nullable, no-backfill** migration adds four columns to `crc_context_access_events`: `research_mode text` (`'topic_pick'` \| `'question'`), `resolved_topics text[]` (governed `GoalCategory` enum values), `question_intent text` (`'research'` \| `'assessment_judgment'` \| `'unsupported'`), `governed_claim_ids text[]`. **The raw free-form question is never persisted** — not by default, not for debugging, not as a transcript. The structured resolution fully satisfies "actor + submission + explicit action + research-request provenance + governed content access". Any future verbatim-question retention (eval dataset, legal hold) is a **separate explicit privacy/data-governance decision**, not CAH-4G. The existing `crc_context_access_events` CHECK, RLS, and `authority-firewall` tests are unaffected (additive nullable columns). **This migration is an implementation requirement, not created in this task.**

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

## N. State — single-turn semantic model (FROZEN, OQ-6)

**Carried between questions: nothing (semantically).** Each question — topic or free-form — is independently interpreted against the *current* submission structured facts. No server session, no `crc_sessions`-style state, no question history in the model context, no "prior answer influences next retrieval", **no server-side semantic conversation state at all**.

**Not carried:** prior questions, prior answers, prior resolved topics, prior BI outputs, conversational corrections.

**May be retained (client-only, non-semantic):** the last N rendered answers, so the reviewer can scroll back — exactly like today's CAH-4E look-up result surviving inspector close/reopen (client React state, no persistence, no server round-trip). This is "history you can see", not "history that reasons".

**Future multi-turn compatibility:** `ExplicitResearchIntent` and `HrrResearchAnswer` are self-contained; a future session wrapper can be added without changing them. V1 does not implement it.

## O. Cost model

| Path | Anthropic calls | Notes |
|---|---|---|
| Topic pick | **0** | pure CAH-4E deterministic path |
| Free-form question | **exactly 1** | `interpretResearchIntent()` — small, low-`max_tokens`, enum-only schema, 1 bounded recovery retry |
| Retrieval / applicability / BI / composition | **0** | all deterministic in V1 |

**Unproven assumptions:** (T-8) model id + per-call cost/latency for the classifier are not governed by a CAH-4G-specific decision — they inherit the interview-engine adapter's mechanism; a bounded eval is needed before freeze. (T-4) whether free-form may resolve >2 topics (each adds a `selectReviewerClaims` pass — cheap, deterministic — but widens the answer).

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

1. **`BiIntent`** (§H) — the minimal Bounded-Interpretation input. Already needed for HRR V1; CRC adapts via a one-line `userGoalsToBiIntents` adapter with zero behavior change. This is the one shared contract CAH-4G actually touches.
2. **A `consultative-composition-core`** — extract the genuinely channel-neutral parts of `buildConsultativeAnswerPlan` (claim-ref sections, neutral unresolved-items, dedup) into `lib/consultative-composition/` once HRR's V1 composer and CRC's plan builder are both known real consumers. Not before.
3. **A `governed-research-selector` contract** — `select-reviewer-claims.ts` is already the reviewer-channel selector; a shared *interface* (channel-eligibility predicate + generic pre-filters + applicability) could later be factored so a third channel doesn't fork. Evidence-driven, post-HRR.
4. **Intent-entry contract** — `ExplicitResearchIntent` + `PermittedResearchIntent` could generalize to a channel-agnostic `ResearchIntent` if a non-reviewer non-CRC channel ever appears.

**CRC changes only when CRC's own usage evidence justifies it** — CRC's free-form pilot stays untouched so that evidence can be collected honestly.

---

## S. Architecture Freeze (2026-09-10) — the binding contract

| # | Frozen decision |
|---|---|
| S-1 | **Converged pipeline.** Both entry modes produce `HrrResearchAnswer` via one internal `runHrrResearch()`. Topic mode = the converged pipeline minus the classifier. `GET /api/admin/submissions/[id]/reviewer-lk?topic=<GoalCategory>` is superseded by `runHrrResearch({ mode:'topic', topic })`; the free-form route is `POST /api/admin/submissions/[id]/reviewer-lk/research` calling `runHrrResearch({ mode:'question', question })`. The CAH-4E `ReviewerLkLookupResult` response shape is retired in favor of `HrrResearchAnswer`; the CAH-4E `route-and-audit` / `projection` / `presentation` tests are updated (a new milestone may change them). |
| S-2 | **Topic path — unchanged authority spine** (see §A frozen contract): 0 model classification calls; `evaluateReviewerEligibility`; `selectReviewerClaims`; `evaluateApplicabilityDetailed`; no inferred facts; no assessment authority; audit-before-content; same `GoalCategory` identifiers. **Evolves:** presentation only (BI + composition). |
| S-3 | **Free-form path — exactly one classify-only model call** (`interpretResearchIntent`). Structured enum-bounded output; no answer prose; recovery retry only per the existing structured-output reliability policy (`callWithStructuredOutputRecoveryRetry`); **fail closed to `intent:'unsupported'`** if a valid permitted structured interpretation cannot be obtained. |
| S-4 | **Trust / grounding** (§I frozen rule, `ADR-002`): reviewer text is untrusted; it grounds INTENT provenance only; every substantive factual proposition traces to grounding source A–E; a false premise is never echoed as fact. |
| S-5 | **BI adaptation** (§H FROZEN): `buildBoundedInterpretations` takes `BiIntent[]` (`{intent_id, intent_text, category, scope}`) + a `BiResult[]` (`{matched_goal_category, unresolved_project_dependencies, claim_id, candidate_statement, match_origin, source_fact_kind}`). CRC adapts via `userGoalsToBiIntents` (1-line call-site change, zero behavior change). HRR adapts via `reviewerClaimToBiResult`. No synthetic `UserGoal`; no HRR-local BI rule table. `diagnostics` always `[]` for HRR. `not_met` claims are excluded from BI matches and shown in a separate "does not apply" block. |
| S-6 | **Composition** (§I FROZEN, OQ-3): deterministic/template `projectHrrResearchAnswer()`; **no second model call**; grounding-test-enforced. The durable invariant is semantic ("only what BI permits, traceable to grounding A–E"), not "templates forever". |
| S-7 | **Authority gate** (§D, §J FROZEN): `research` → pipeline; `assessment_judgment` + explicit topic → decline the decision + research the named topic(s) with `scope:'determination_request'` (→ `determination_declined`); `assessment_judgment` + no topic → decline + offer research paths; `unsupported` → fixed "try a topic". **Never** a yes/no on approval/clearance/control/outcome. **Never** an invented "closest topic". Mixed → decline **and** research the explicit portion, structurally separated. |
| S-8 | **Audit** (§K FROZEN, OQ-1): reuse `access_kind='lk_research'` + one additive nullable migration (`research_mode`, `resolved_topics`, `question_intent`, `governed_claim_ids`). **Raw question never persisted.** Audit-before-content order per §K; audit failure → 503, zero content. |
| S-9 | **Single-turn** (§N FROZEN, OQ-6): nothing carried semantically between questions; no server-side conversation state; client-only scrollback is "history you can see", not "history that reasons". No raw-question / debug / transcript retention. |
| S-10 | **Linked CRC Context** (§M FROZEN, OQ-… / Task 9): **no automatic participation** — no transcript, no CRC conversation history, no silent CRC structured-context ingestion. UI adjacency ≠ retrieval authority. Future explicit inclusion = a separate architecture decision. |
| S-11 | **CRC boundary** (§R, Task 8 FROZEN): CAH-4G changes **no** CRC file — no CRC topic selectors, no CRC input redesign, no CRC composition change. CRC stays free-form during the pilot deliberately. GRI convergence with CRC is documented (§R) but **not implemented**; CRC changes only on CRC's own usage evidence. |
| S-12 | **Reviewer eligibility** (§F FROZEN): `evaluateReviewerEligibility` only (lifecycle + reviewer `publication_scope` + supersession). `crc_eligible` / `crc_publication_scope` never gate or render. |
| S-13 | **Likeness coverage** (OQ-7 FROZEN): 0 reviewer-eligible `TopicClaim`s for `likeness` does **not** block HRR V1. A `likeness` topic/question returns the bounded equivalent of "outside current governed coverage" (`bi_status: outside_current_coverage`). This is a governed-knowledge backlog item, not an orchestration patch. **No `likeness` claim added in this milestone.** |
| S-14 | **Classifier model/provider** (OQ-8 FROZEN): inherits the interview-engine adapter pattern — `DEFAULT_MODEL = 'claude-sonnet-5'`, env override `HRR_INTENT_CLASSIFIER_MODEL`, `ANTHROPIC_API_KEY`. No new HRR-specific model *architecture*. Exact model choice is an implementation cost/quality-eval parameter (§V-7), not a blocker. |
| S-15 | **Authorization rollout** (OQ-9 FROZEN): `checkReviewerContextAccess()` (`is_admin`) is acceptable for **internal HRR V1 / pilot**. A dedicated reviewer role/grant is **required before broader reviewer rollout** — and per `auth.ts`'s own note, only that file changes then. CAH-4G is **not** a role/authorization redesign. |
| S-16 | **The GRI pipeline** is `ExplicitResearchIntent[] → governed retrieval → deterministic applicability → Bounded Interpretation → HRR consultative composition → HRR projection → audit`. No downstream layer expresses a conclusion stronger than Bounded Interpretation permits. |

## T. Resolved open questions

| OQ | Decision | Source-backed reason | Implementation implication |
|---|---|---|---|
| **T-1 Audit storage** | **Reuse `access_kind='lk_research'` + 1 additive nullable migration** (Option B). Raw question never persisted. | `crc_context_access_events` has no JSONB column (Option D unavailable); the `access_kind` vocabulary is designed to extend but a *new value* is unnecessary — the same "governed content access" fact is being recorded; a separate detail table (Option C) adds moving parts with no retention-policy difference. | One migration file (implementation requirement). `recordHrrResearchAccess()` writes the 4 columns. `authority-firewall` tests extend to assert no raw-question column. |
| **T-2 BI generic input** | **`BiIntent` + `BiResult` minimal shared contracts.** `buildBoundedInterpretations(BiIntent[], BiResult[], diagnostics?, humanContributionDescription?)`. | Verified fields BI reads: goals → `{superseded_by, state, scope, category, goal_id, raw_text}`; results → `{matched_goal_category, unresolved_project_dependencies, claim_id, candidate_statement, match_origin, source_fact.kind}`. Nothing more. | `lib/bounded-interpretation/build-bounded-interpretation.ts` signature change (CRC-shared — regression proof required, §U slice 1). `userGoalsToBiIntents` + `reviewerClaimToBiResult` adapters. |
| **T-3 V1 composition** | **Fully deterministic / template-based. No second LLM call.** Durable invariant stays semantic, not "templates forever". | `project-reviewer-claims.ts` (CAH-4E) is already a deterministic passthrough; `rules.ts` + `summary_blocks` already provide fixed, verbatim-quoting copy; a model composer adds a grounding-verification burden with no V1-required benefit. | `projectHrrResearchAnswer()` reads only already-built BI + claims + templates. `hrr-projection.test.ts` enforces grounding A–E. |
| **T-4 Free-form multi-topic maximum** | **`HRR_MAX_RESOLVED_TOPICS = 2` (recommended default — the one genuinely-open item; a bounded implementation experiment may raise it).** | The governed topic universe has 5 topics; the only evidenced multi-topic reviewer question shape names exactly 2 ("does commercial-use permission tell me anything about copyright ownership?"). 3+ topics produces an answer too large for the inspector rail (280–420px) and dilutes the direct response. Each extra topic is a cheap deterministic `selectReviewerClaims` pass, so the cost of a low cap is only UX, not correctness. | Classifier schema caps `resolved_topics` at `MAX`. If `intent:'research'` resolves >MAX distinct topics → keep the first MAX (by governed enum order) + a bounded "your question spans several topics; researched: X, Y" note. The classifier **never invents** a topic absent from permitted interpretation. **Recommend a bounded 2-week HRR-internal experiment measuring how often reviewers hit the cap before changing it.** |
| **T-5 Mixed judgment + research** | **Decline the decision; preserve reviewer authority; research only the explicitly-supported permitted topic(s); structurally separate the refusal from the research; never yes/no; never invent a topic. No surviving explicit topic → decline + offer paths.** | `build-bounded-interpretation.ts:185` checks `scope === 'determination_request'` **before** any matching → `determination_declined` for that topic regardless of whether a claim exists; a topic explicitly named in a mixed question survives the gate as an `ExplicitResearchIntent`. | `hrrAuthorityGate()` returns `{ authority_note:'assessment_judgment_redirected', researched_intents: [<explicit topics>] , offered_paths: <if none> }`. `HrrResearchAnswer` renders the refusal block first, then the per-topic research, visually separated. |
| **T-6 Raw-question persistence** | **None for V1** — no default, no debug retention, no hidden transcript, no history-for-convenience. Structured derived metadata per T-1 only. | Reviewer text may quote submission/customer PII; auditability is fully met by the structured resolution; there is no V1 requirement for verbatim capture. | Any future raw-question dataset = a separate explicit privacy/data-governance milestone. |
| **T-7 Likeness coverage** | **Does not block HRR V1.** Return the bounded "outside current governed coverage" equivalent. | `TOPIC_CLAIMS_FIXTURE` at `238670c` has 0 `likeness` claims; the one `likeness` claim is tool-scoped in `MATRIX_FIXTURE` and withheld under CRC Publication Policy Principle 3 (governance decision, not a code gap). | `bi_status: outside_current_coverage` for `likeness`; a governed-knowledge backlog ticket, not an HRR change. |
| **T-8 Classifier model/provider** | **Inherit the interview-engine adapter config pattern.** One classify-only call max per free-form action; enum-bounded output; existing retry policy; fail closed. | `anthropic-extractor.ts` / `anthropic-candidate-question.ts` / `anthropic-decision.ts` all use `DEFAULT_MODEL='claude-sonnet-5'` + a per-job env override + `ANTHROPIC_API_KEY`. | New adapter `interpret-research-intent.anthropic.ts` mirroring `anthropic-extractor.ts`; `HRR_INTENT_CLASSIFIER_MODEL` env var; a mock adapter for tests. Model choice = a V-7 cost/quality eval parameter. |
| **T-9 Reviewer authorization** | **`is_admin` OK for internal V1 / pilot; dedicated grant required before broader rollout; only `auth.ts` changes then.** | `checkReviewerContextAccess()` is `is_admin` with an explicit "FUTURE: dedicated reviewer grant, ONLY this file changes" note; no dedicated grant exists in source today. | No auth change in CAH-4G. The rollout boundary is a documented gate, not a code task. |

**Genuinely still open:** only **T-4** (the exact `HRR_MAX_RESOLVED_TOPICS` value) — and the recommendation is to ship with `2` and run a bounded internal experiment. Nothing else is open; the remaining choices are ordinary implementation choices, not architecture.

## U. Implementation contract — dependency-ordered slices (do NOT implement here)

Each slice is independently reviewable and independently revertible. **No slice ships CRC behavior change.**

| # | Slice | Files expected to change | Authority invariant | Tests required | Non-goals | CRC code touched? |
|---|---|---|---|---|---|---|
| **1** | **BI input adaptation boundary** | `lib/bounded-interpretation/types.ts` (`BiIntent`, `BiResult`), `build-bounded-interpretation.ts` (signature `UserGoal[]→BiIntent[]`, `RetrievalResult[]→BiResult[]`), a new `lib/bounded-interpretation/adapters.ts` (`userGoalsToBiIntents`), CRC call site in `lib/crc-engine/run-crc-conversation.ts` (1-line: wrap `goals` / map results) | BI reads only the frozen minimal fields; no new inference; `determination_declined` still fires on `scope` before matching | **CRC regression proof: the full `__tests__/bounded-interpretation/**` + `__tests__/crc-engine/run-crc-conversation*.test.ts` pass byte-for-byte before/after (established via an isolated baseline worktree at the same parent).** New adapter unit tests. | no new BI status; no HRR logic yet; no HRR type | **YES** — `run-crc-conversation.ts` call site (1 line) + `build-bounded-interpretation.ts` (shared). **Regression proof mandatory.** |
| **2** | **HRR structured free-form classifier + authority gate** | NEW `lib/reviewer-lk/interpret-research-intent.ts` (+ `.anthropic.ts` + `.mock.ts`), `lib/reviewer-lk/hrr-authority-gate.ts`, types in `lib/reviewer-lk/types.ts` (`ExplicitResearchIntent`, `PermittedResearchIntent`) | classify-only; enum-only schema (no prose field); fail closed → `unsupported`; gate never invents a topic, never answers | source-scan: schema has no `answer`/`summary`/prose field; `interpret-research-intent.test.ts` (mock adapter: fail-closed paths, cap enforcement); `hrr-authority-gate.test.ts` (research/judgment/mixed/unsupported routing) | no retrieval yet; no composition; no real Anthropic in tests | no |
| **3** | **Converged HRR research pipeline** | NEW `lib/reviewer-lk/run-hrr-research.ts` (`ExplicitResearchIntent[] → selectReviewerClaims → reviewerClaimToBiResult → buildBoundedInterpretations`), `reviewerClaimToBiResult` adapter, refactor `app/api/admin/submissions/[id]/reviewer-lk/route.ts` topic path to call it + NEW `…/research/route.ts` for free-form | `selectReviewerClaims` / `evaluateReviewerEligibility` / `evaluateApplicabilityDetailed` **byte-identical calls**; `diagnostics: []`; `not_met` excluded from matches; no `crc_eligible` | `run-hrr-research.test.ts` (single/multi-topic, `outside_current_coverage`, `not_met` separation); reuse `reviewer-lk/authority-firewall.test.ts` for both routes; `select-reviewer-claims` unchanged (its tests still pass) | no composition prose yet (return the structured `HrrResearchAnswer` skeleton); no UI | no |
| **4** | **Deterministic HRR composition / projection** | NEW `lib/reviewer-lk/project-hrr-research-answer.ts`, `HrrResearchAnswer` type, per-status fixed templates (a `lib/reviewer-lk/hrr-rules.ts` OR reuse `bounded-interpretation/rules.ts` outputs) | grounding A–E only; no second model call; reviewer text = attributed quotation, never factual | `hrr-projection.test.ts` — **grounding test**: every rendered substantive string maps to a governed `statement` / fixed template / mechanical enumeration; false-premise question → premise not echoed as fact | no model composition; no ranking | no |
| **5** | **Audit enrichment + audit-before-content** | NEW migration `2026…_hrr_research_audit_enrichment.sql` (additive nullable), `recordHrrResearchAccess()` in `lib/reviewer-lk/repository.ts`, wire step 6→7→8 in both routes | audit persists before any governed content; failure → 503 zero content; raw question never written | `route-and-audit` extended: audit row before response; audit-failure → 503; no raw-question column; zero rows from re-render | no new `access_kind`; no `association_id`/`crc_session_id` | no |
| **6** | **Reviewer Resources free-form UI** | `app/admin/submissions/[id]/review/ReviewerLkLookup.tsx` (add the input peer to the chips; render `HrrResearchAnswer`) | no shell/page-tree change; no copy-to-evidence/apply/approve control; chatbot-avoidant layout; assessment-authority answers lead with the refusal | source-scan (`reviewer-resources-presentation.test.ts` extended): input present; no promotion affordance; no `crc_eligible` render; answer-priority order 1–6 | no `ReviewerShell` / `workspace-layout-context` / `page.tsx` change; no multi-turn UI | no |
| **7** | **Tests / UAT / cost-quality eval** | `__tests__/reviewer-lk/**` completion; a manual UAT run of §V; a bounded classifier cost/quality eval (offline, real model, held-out reviewer questions) + the `HRR_MAX_RESOLVED_TOPICS` experiment | — | full §V UAT; classifier accuracy on adversarial paired questions (research vs judgment vs false-premise); fail-closed rate | not a CRC eval; not a raw-question corpus | no |

**Slice ordering rationale (challenged against source):** slice 1 must precede everything (BI is the semantic ceiling and its input type is shared with CRC — get the regression proof out of the way first). Slices 2–4 are HRR-internal and independent of the UI/audit. Slice 5 (audit) can technically precede 3–4 but is placed after so the audit metadata (`governed_claim_ids`) has real producers. Slice 6 (UI) last of the build slices. Slice 7 gates broader rollout.

## V. Frozen UAT contract

The full scenario list is `PRD_CAH_4G_HRR §19` (14 scenarios). Binding for implementation acceptance, in addition:

- **V-1** Topic selection fires **zero** `hrr_intent` telemetry events; the topic path's governed selection is byte-identical to CAH-4E (assert the same `selectReviewerClaims` inputs); the *presentation* is the new `HrrResearchAnswer`.
- **V-2** Free-form single-topic and **V-3** bounded multi-topic (≤ `HRR_MAX_RESOLVED_TOPICS`) research.
- **V-4** Unsupported / over-general → fixed "try a topic".
- **V-5** "Should I approve this?" → decline, **no yes/no, no invented topic**, no retrieval.
- **V-6** "Should I approve this, and what does governed knowledge say about copyright ownership?" → decline the approval decision **and** answer the `copyright_ownership` research separately, structurally distinct.
- **V-7** "Since Veo gives us copyright ownership, is this cleared?" → the false premise is **not** repeated as factual authority; the decision is declined; only governed material (grounding A–E) substantiates the research response. (Also the classifier cost/quality eval parameter.)
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
| REUSED as-is | Anthropic Structured Outputs adapter shape, `callWithStructuredOutputRecoveryRetry`, telemetry sinks | `lib/interview-engine/anthropic-extractor.ts`, `anthropic-structured-output-retry.ts` | — |
| ADAPTED (additive) | `buildBoundedInterpretations` input: `UserGoal[]` → `BiIntent[]` + `userGoalsToBiIntents` adapter (CRC call site: 1-line change, 0 behavior change) | `lib/bounded-interpretation/` | **FROZEN §S-5/§T-2 — signature also takes BiResult[]; regression proof required (§U slice 1)** |
| NEW type | `ExplicitResearchIntent`, `PermittedResearchIntent`, `HrrResearchAnswer`, `BiIntent` | `lib/reviewer-lk/types.ts` (+ `BiIntent` in `lib/bounded-interpretation/types.ts` if §H adopted) | designed |
| NEW module | `interpretResearchIntent()` (the one model call) | `lib/reviewer-lk/interpret-research-intent.ts` (+ anthropic adapter, mock adapter) | designed |
| NEW module | `hrrAuthorityGate()` (deterministic routing over `PermittedResearchIntent`) | `lib/reviewer-lk/hrr-authority-gate.ts` | designed |
| NEW module | `projectHrrResearchAnswer()` (deterministic composition) | `lib/reviewer-lk/project-hrr-research-answer.ts` | designed |
| NEW route | `POST /api/admin/submissions/[id]/reviewer-lk/question` (free-form; audited; audit-before-content) | `app/api/admin/submissions/[id]/reviewer-lk/question/route.ts` | designed |
| NEW UI | free-form input inside `ReviewerLkLookup.tsx` (peer to the existing topic chips; no shell change) | `app/admin/submissions/[id]/review/ReviewerLkLookup.tsx` | designed |
| NEW tests | `hrr-authority-gate.test.ts`, `interpret-research-intent.test.ts` (schema/fail-closed, source-scan), `hrr-projection.test.ts` (grounding rule), route firewall/audit, `ReviewerLkLookup` presentation — all source-scan, no render harness | `__tests__/reviewer-lk/`, `__tests__/reviewer-shell/` | designed |
| AUDIT | reuse `access_kind='lk_research'`; **recommended** additive nullable columns (Option B §K) | migration `2026…_hrr_research_audit_enrichment.sql` | **FROZEN §S-8/§T-1 — additive nullable; migration = §U slice 5** |

**Unchanged, explicitly:** all of `lib/crc-engine/**`, `lib/interview-engine/**` (except the `BiIntent` generalization if adopted — additive), `lib/crc-project-context/**`, `lib/crc-assurance-handoff/**`, `lib/assessments/**`, `WorkbookClient.tsx`, `page.tsx`, `ReviewerShell.tsx`, `workspace-layout-context.tsx`, every CRC route and the CRC UI, `retrieve.ts` / `enumerateEligibleClaims` / `crc_eligible` / governed claims / `provider_scope` / `Lifecycle` / supersession / CRC eligibility.
