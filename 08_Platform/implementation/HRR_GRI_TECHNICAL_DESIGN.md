# HRR V1 / Governed Research Interface — Technical Design

**Status:** `DESIGNED / NOT IMPLEMENTED` — source-backed design for CAH-4G. No runtime code, tests, migrations, or audit fields exist. PM review gates implementation.
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
5. **Zero CRC change.** `lib/crc-engine/**`, `lib/interview-engine/**` (except a possible *additive* generalization of one Bounded-Interpretation input type — §H), CRC routes, CRC UI: untouched.

## A. Entry modes

```
TOPIC PATH  (research_mode = 'topic_pick')  — unchanged CAH-4E, 0 model calls
  chip click → GoalCategory
            → ExplicitResearchIntent { source_kind:'topic_selection', topic, scope:'informational' }
            → GRI pipeline

FREE-FORM PATH  (research_mode = 'question')  — new, exactly 1 model call
  reviewer question (verbatim) 
            → interpretResearchIntent()  [ONE bounded structured LLM call]
            → PermittedResearchIntent { intent, resolved_topics[], scope, unresolved_ambiguity[] }
            → authority gate (§D)
            → for each resolved topic: ExplicitResearchIntent { source_kind:'interpreted_question', topic, scope, source_text_ref }
            → GRI pipeline
```

**GRI pipeline (identical for both modes):**
```
ExplicitResearchIntent[]
  → governed retrieval        selectReviewerClaims() per intent.topic       (lib/reviewer-lk/select-reviewer-claims.ts — REUSED)
  → deterministic applicability   evaluateApplicabilityDetailed()           (lib/retrieval-engine/lookup-topic-claims.ts — REUSED, already inside the selector)
  → Bounded Interpretation     buildBoundedInterpretations(BiIntent[], …)   (lib/bounded-interpretation/ — REUSED via §H adaptation)
  → consultative composition   projectHrrResearchAnswer()                   (NEW, thin, deterministic, no model call — §I)
  → provenance / projection    HrrResearchAnswer                            (NEW type — §J)
  → append-only access audit   recordHrrResearchAccess()                    (audit contract §K — reuse lk_research, decision deferred)
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

**Recommended (RECOMMENDATION — decision deferred, §T-2): additive generalization of the input type.**
- Introduce `BiIntent` — the minimal shape BI needs:
  ```ts
  interface BiIntent { intent_id: string; intent_text: string; category: GoalCategory; scope: GoalScope }
  ```
- `buildBoundedInterpretations` accepts `BiIntent[]` instead of `UserGoal[]`. **CRC is unaffected**: add a one-line adapter `userGoalsToBiIntents(goals: UserGoal[]): BiIntent[]` that filters `superseded_by === null && state === 'confirmed'` (the exact filter BI already applies internally, line 178) and maps `{goal_id→intent_id, raw_text→intent_text, category, scope}`. CRC's call site changes from `buildBoundedInterpretations(goals, …)` to `buildBoundedInterpretations(userGoalsToBiIntents(goals), …)` — **zero behavior change, provable by the existing BI test suite** (`__tests__/bounded-interpretation/**`).
- HRR builds `BiIntent` directly from `ExplicitResearchIntent` (`intent_id` = a per-request id, `intent_text` = the reviewer's verbatim question or the topic label, `category` = `intent.topic`, `scope` = `intent.scope`). **No synthetic `UserGoal`.**
- HRR provenance (`interpreted`, `source_kind`, `source_text_ref`) is carried alongside by the HRR caller, keyed by `intent_id` — it never enters `BiIntent` or BI.

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

**V1 implementation: deterministic / template-based `projectHrrResearchAnswer()` (NEW, `lib/reviewer-lk/`, no model call).** It assembles the `HrrResearchAnswer` from: verbatim governed `statement`s + `BoundedInterpretation.summary_blocks` + fixed per-status templates + the reviewer's verbatim question + mechanical enumerations of `claim_id` / `status` / `requirement`.

**Shared-primitive opportunity (evaluate, do not force in V1):** `lib/crc-engine/consultative-answer-plan.ts` (`buildConsultativeAnswerPlan`) is already deterministic, no-LLM, carries **no governed prose** (only `claim_id` refs + verbatim `summary_blocks`), and produces per-goal sections + neutral `unresolved_items` + `MissingEvidenceClassification` + `RulesBoundaryId` refs + explicit-vs-discovered split. **Caveat:** it reads two `lib/crc-engine/` askability registries (`dependency-askability.ts`, `selector-askability.ts`) to classify missing evidence, pulling a (read-only, type-mostly) crc-engine dependency into the reviewer path. **V1 recommendation: write the smaller HRR-local composer** — HRR needs less than CRC's plan (no askability, no CRC bridge, no email projection) — and revisit extracting a genuinely shared `consultative-composition-core` **after** HRR ships and CRC's own needs are re-examined (§R). This avoids a speculative refactor.

**The durable composition invariant (`ADR-002`):** composition may express **only** semantic content permitted by Bounded Interpretation and traceable to governed propositions / permitted structured outputs. "Templates forever" is **not** the invariant — a future HRR composer could use a bounded model stage *if* every substantive sentence still traces to a governed proposition / BI output and passes a grounding check.

**Answer grounding rule (test-enforced):** every substantive sentence in a composed HRR answer is (a) a verbatim governed `statement`, (b) a fixed template string, (c) the reviewer's own verbatim question, or (d) a mechanical enumeration of `claim_id` / `status` / `requirement` values.

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

## K. Audit / privacy — compare, recommend, do NOT implement

Current: `crc_context_access_events`, `CHECK access_kind IN ('transcript', 'lk_research')` (migrations `20260909010000`, `20260910000000`); row = access fact only (actor, submission, time); `lk_research` rows leave `association_id` / `crc_session_id` NULL. The `access_kind` vocabulary is *"explicitly designed to be"* extended.

| Option | What | Migration? | Verdict |
|---|---|---|---|
| **A. reuse `lk_research` unchanged** | one `lk_research` row per free-form question, identical to a topic look-up | **no** | ✅ satisfies "actor + submission + explicit action". Loses "which topics / which governed claims / topic-pick vs question". Smallest possible. |
| **B. nullable structured enrichment of the existing row** | add nullable columns `research_mode text`, `resolved_topics text[]`, `question_intent text`, `governed_claim_ids text[]` to `crc_context_access_events` | **yes (1 migration, additive, nullable — no backfill)** | ✅ **RECOMMENDED direction.** Keeps one audit table + `access_kind='lk_research'`. Records the *structured resolution* (topics, intent, claim_ids) — full "research request provenance + governed content access" — **without storing raw question text**. Existing `authority-firewall` tests + the CHECK are unaffected. |
| **C. separate detail record linked to the access event** | `crc_context_access_events` row (unchanged) + a `hrr_research_query_details` row FK'd to it | **yes (1 migration, new table)** | ⚠️ more moving parts; only worth it if detail retention policy must differ from the access-fact retention policy. |
| **D. structured payload in an existing JSONB column** | if `crc_context_access_events` has an unconstrained JSONB `details`/`metadata` column (it does **not** today — verified), stash the structured resolution there | n/a | not available |

**Recommendation:** **B**, with a hard rule: **the raw free-form question is not persisted by default.** Store `resolved_topics` (governed enum values — safe), `question_intent` (`research` / `assessment_judgment` / `unsupported`), `research_mode`, and `governed_claim_ids` (the "governed content access" fact). The reviewer question is reviewer-authored (lower risk than customer text) but may still quote submission/customer detail or PII; the structured resolution fully satisfies auditability without retaining free text. If a future audit/legal requirement for verbatim questions emerges, add it behind an **explicit retention decision** (hashed, or a separately-access-controlled column) — a new milestone, not CAH-4G. **Audit-before-content** is preserved: the access record persists before any composed answer is returned; failure → 503, zero content. **This decision is not implemented in this task.**

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

## N. State — single-turn semantic model

**Carried between questions: nothing (semantically).** Each question — topic or free-form — is independently interpreted against the *current* submission structured facts. No server session, no `crc_sessions`-style state, no question history in the model context, no "prior answer influences next retrieval".

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
| ADAPTED (additive) | `buildBoundedInterpretations` input: `UserGoal[]` → `BiIntent[]` + `userGoalsToBiIntents` adapter (CRC call site: 1-line change, 0 behavior change) | `lib/bounded-interpretation/` | **proposed — decision deferred §T-2** |
| NEW type | `ExplicitResearchIntent`, `PermittedResearchIntent`, `HrrResearchAnswer`, `BiIntent` | `lib/reviewer-lk/types.ts` (+ `BiIntent` in `lib/bounded-interpretation/types.ts` if §H adopted) | designed |
| NEW module | `interpretResearchIntent()` (the one model call) | `lib/reviewer-lk/interpret-research-intent.ts` (+ anthropic adapter, mock adapter) | designed |
| NEW module | `hrrAuthorityGate()` (deterministic routing over `PermittedResearchIntent`) | `lib/reviewer-lk/hrr-authority-gate.ts` | designed |
| NEW module | `projectHrrResearchAnswer()` (deterministic composition) | `lib/reviewer-lk/project-hrr-research-answer.ts` | designed |
| NEW route | `POST /api/admin/submissions/[id]/reviewer-lk/question` (free-form; audited; audit-before-content) | `app/api/admin/submissions/[id]/reviewer-lk/question/route.ts` | designed |
| NEW UI | free-form input inside `ReviewerLkLookup.tsx` (peer to the existing topic chips; no shell change) | `app/admin/submissions/[id]/review/ReviewerLkLookup.tsx` | designed |
| NEW tests | `hrr-authority-gate.test.ts`, `interpret-research-intent.test.ts` (schema/fail-closed, source-scan), `hrr-projection.test.ts` (grounding rule), route firewall/audit, `ReviewerLkLookup` presentation — all source-scan, no render harness | `__tests__/reviewer-lk/`, `__tests__/reviewer-shell/` | designed |
| AUDIT | reuse `access_kind='lk_research'`; **recommended** additive nullable columns (Option B §K) | migration `2026…_hrr_research_audit_enrichment.sql` | **not implemented — decision deferred §T-1** |

**Unchanged, explicitly:** all of `lib/crc-engine/**`, `lib/interview-engine/**` (except the `BiIntent` generalization if adopted — additive), `lib/crc-project-context/**`, `lib/crc-assurance-handoff/**`, `lib/assessments/**`, `WorkbookClient.tsx`, `page.tsx`, `ReviewerShell.tsx`, `workspace-layout-context.tsx`, every CRC route and the CRC UI, `retrieve.ts` / `enumerateEligibleClaims` / `crc_eligible` / governed claims / `provider_scope` / `Lifecycle` / supersession / CRC eligibility.
