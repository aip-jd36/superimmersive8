# SI8 Living Knowledge Expansion — Phase 1 Technical Design, Revision 2

**Status: DESIGN REVISION ONLY — not implemented. No code, no migration, no commit, no push, no deploy.**

This document incorporates the PM Decision Addendum (2026-08-16) into the Phase 1 design. It **supersedes** the corresponding sections of `LK_PHASE1_TECHNICAL_DESIGN.md` (v1) where noted below; sections not listed as changed remain governed by v1 unchanged (same preservation discipline already used for `SI8-Reviewer-Manual-v0.1.md` — the prior version stays intact, only what actually changed is restated here). v1's §2 (current-state map), §3 (fragmentation map), §4 (claim-layer location), §9 (publication model), §11 (provenance model), §16 (promotion workflow), §17–20 (automation/monitoring/conflict/security) are **unchanged** and not repeated in full here except where a PM decision touches them directly.

Every recommendation below that touches Interview Engine internals was re-verified against the actual current code in this session (`commercial-readiness-catalog.ts`, `commercial-readiness-indicators.ts`, `candidate-question.ts`, `run-turn.ts`, `types/interview-engine.ts`), not asserted from memory.

---

## 1. PM Decisions Incorporated

All 26 sections of the addendum are addressed below. Summary of what changed from v1:

| Area | v1 recommendation | v2 (this revision) |
|---|---|---|
| Jurisdiction capture | Defer; accept low fire rate | **Add minimal, user-attested jurisdiction capture** (§4) |
| Jurisdiction data model | Not designed | `ProjectFacts.jurisdiction: AttestedFact<string>` — reuses existing primitive exactly (§4) |
| Questioning mechanism | Not designed | Deterministic candidate at Model 4 attempt #1 — the exact extension point Commercial Readiness Discovery already proved live (§5) |
| Applicability enum scope | 5 predicate types proposed uniformly | Only `jurisdiction` and `tool_plan_tier` are Phase 1 *implemented*; the other 3 are *reserved future types*, explicitly labeled (§7) |
| `knowledge_snapshot_ref` migration | Phase 1, item 2 | **Reclassified Phase 1B** — not on the critical path (§10) |
| Fixture/markdown consistency check | Not specified | Minimal CI diff-check added (§9) |
| Wave 1 claim doctrine | Implicitly assumed research corpus is reusable | **Explicit guardrail: research corpus is leads, not governed knowledge** — every claim re-verified before Candidate (§11) |
| Implementation sequence | 8 phases | **Replaced with PM's 8-phase (A–H), 35-step sequence**, adopted as-is with clarifying detail (§14) |

---

## 2. Revised Architecture Diagram

```
                    SOURCES
                       │
                       ▼
              GOVERNED CLAIMS  (GOVERNED-CLAIMS.md — unchanged from v1 §4)
                       │
        ┌──────────────┴──────────────┐
        ▼                              ▼
  Publication scope:              Publication scope:
  Reviewer/internal                CRC eligible
        │                              │
        ▼                              ▼
  (Commercial Assurance,      TOPIC / LK RETRIEVAL  ◄── keyed by UserGoal.category
   manual read, Phase 1B)              │                (M1/M2, already exists)
                                        │
                                        ▼
   TOOL RETRIEVAL  ──────────►  GOVERNED APPLICABLE CLAIM SET
   (unchanged, Matrix-keyed)          │         ▲
                                       │         │
                                       │    APPLICABILITY EVALUATOR
                                       │    (jurisdiction fact, tool_plan_tier fact
                                       │     — deterministic predicate check, §7)
                                       │         ▲
                                       │         │
                                       │    StructuredUnderstanding.project_facts
                                       │    .jurisdiction  (AttestedFact<string>,
                                       │     NEW field, §4)
                                       │         ▲
                                       │         │
                                       │    JURISDICTION CLARIFICATION
                                       │    (deterministic candidate proposal,
                                       │     Model 4 attempt #1 — same slot
                                       │     Commercial Readiness Discovery
                                       │     already uses, §5)
                                       ▼
                              CRC M2 BOUNDED INTERPRETATION
                              (lib/bounded-interpretation/ —
                               ZERO changes, §13/§17 of PM addendum)
```

The only genuinely new runtime component relative to v1 is the **Applicability Evaluator** feeding the jurisdiction fact into Topic Retrieval, and the **Jurisdiction Clarification** candidate source feeding that fact. Everything downstream of "Governed Applicable Claim Set" is v1's design, unchanged.

---

## 3. Revised Jurisdiction Design (overview)

Per PM §6: inspected `AttestedFact`/`Attested<T>` first. **Reused exactly, no parallel model introduced.**

```ts
// types/interview-engine.ts — ProjectFacts, extended (additive, mirrors user_goals precedent)
export interface ProjectFacts {
  intended_use: AttestedFact<string>
  workflow_role: AttestedFact<string>
  jurisdiction: AttestedFact<string>   // NEW
}
```

This is the smallest possible addition: `jurisdiction` is project-wide (not per-tool, unlike `access_surface`/`plan_tier`), so it belongs in `ProjectFacts` alongside `intended_use`/`workflow_role` — same reasoning already documented in `types/interview-engine.ts`'s own `ProjectFacts` comment ("genuinely project-wide, not per-tool... don't fork per tool the way access surface and plan tier do"). Same `Attested<T>` five-state taxonomy (`confirmed`/`confirmed_absent`/`unresolved_no_visibility`/`unknown`/`declined`) — no new confidence model. `confirmed_absent` has no natural trigger for jurisdiction (no one states "I have no jurisdiction"); `declined` is real and expected (user skips the clarification); `unknown`/`unresolved_no_visibility` cover "I don't know" and vague/ambiguous answers respectively — all five states already exist and need no new semantics defined.

---

## 4. Exact Jurisdiction Data Model

**Answering PM §25.A–C explicitly:**

**A. Exact shape** — `AttestedFact<string>`, reusing the existing generic (§3 above), stored at `structured_understanding.project_facts.jurisdiction`. `value: T` is a free-text string in `Attested<T>`'s `confirmed` variant (e.g. `"United States"`, `"Taiwan"`), matching how `intended_use`/`workflow_role` already store free text rather than an enum — jurisdiction doesn't need a controlled vocabulary in Phase 1 (Wave 1 has exactly one jurisdiction it checks against: `"United States"`; string-equality is sufficient, an enum would be premature).

**B. How jurisdiction is extracted** — via the **existing `project_fact` candidate kind**, extended with a third `raw_fact_field` value:
```ts
// extraction.ts — CandidateObservation, additive
raw_fact_field?: 'intended_use' | 'workflow_role' | 'jurisdiction'
```
This requires **zero new candidate kind, zero new attestation logic**. `attestCandidate`'s existing `project_fact` branch already handles any `raw_fact_field` generically (`{kind: 'project_fact', field: candidate.raw_fact_field, value}`) — jurisdiction flows through the identical code path `intended_use`/`workflow_role` already use. A new `setJurisdiction()` mutation in `mutations.ts`, mirroring `setIntendedUse`/`setWorkflowRole` line-for-line (plain immutable replacement, no supersession chain — same as those two fields today), is the only new function. The Anthropic extractor's system prompt/schema gains one more `raw_fact_field` enum value and a short paragraph of guidance (same shape as the existing `intended_use`/`workflow_role` guidance) — this captures jurisdiction **passively**, whenever a user happens to state it unprompted (e.g., "I'm based in the US"), exactly like `intended_use` is captured today.

**C. How a correction is handled** — `setIntendedUse`/`setWorkflowRole` today are **"plain immutable replacement, not supersede-and-mark"** (confirmed in `mutations.ts`'s own header comment: "ProjectFacts fields were never modeled with history/supersession semantics... only to replace with a new AttestedFact"). `jurisdiction` should follow the identical discipline — a later statement ("actually, my client is in the EU, not the US") simply overwrites the `AttestedFact` via a new `setJurisdiction()` call, same as correcting `intended_use` today. **This is a deliberate, explicit choice to NOT give jurisdiction its own supersession/lineage chain** (unlike `UserGoal`, which does have one) — because `ProjectFacts` fields are singular current-state values by design (PRD's applicability model wants "is jurisdiction currently confirmed as X," not a history of what jurisdiction was claimed at different points in the conversation). PM §25.C and §9's acceptance test #8 ("existing mutation/supersession semantics preserve lineage correctly") are satisfied by this being the **same, already-proven, already-tested** mechanism `intended_use` correction already uses — no new lineage design needed.

---

## 5. Exact Questioning / Integration Point

**PM §8 required a comparison of options A/B/C and a recommendation, with an explicit STOP if Gate/completion semantics need to change. Verdict: no STOP required — the extension point already exists, live, in production.**

Re-inspected `run-turn.ts`, `commercial-readiness-catalog.ts`, and `commercial-readiness-indicators.ts` directly (not from memory) to confirm this precisely, before recommending it.

**What Commercial Readiness Discovery actually is, confirmed by direct code inspection:** it is **not** a third parallel question-asking path outside Model 4. It is a **deterministic candidate proposal substituted into attempt #1 of Model 4's own existing bounded 2-attempt search** (`run-turn.ts`: `attempt1 = discoveryProposal ? tryCandidate(..., discoveryProposal) : <ordinary generator call>`). If that deterministic proposal is rejected by Constraint A/B (the same validation every LLM-generated candidate goes through — "identical either way; a discovery candidate gets no privileged pass"), attempt #2 always falls back to the ordinary generator, never a second deterministic proposal. Eligibility for *being* attempt #1 is itself fully deterministic — no LLM judgment call decides whether to inject Discovery; a pure function does (`evaluateCategoryEligibility`, confirmed exact formula: `eligible = gate1Met && phase === 3 && applicability === 'affirmative' && evidenceGapOpen`).

**Recommendation: Option B, but more precisely characterized than the addendum's own framing —** jurisdiction clarification is not a *new* pre-interpretation mechanism sitting outside Interview Engine; it is a **second deterministic-candidate source competing for the exact same attempt-#1 slot Discovery already occupies**, using the identical, already-proven extension point. Concretely:

```ts
// New, mirrors evaluateCategoryEligibility's exact shape and formula style
function evaluateJurisdictionClarificationEligibility(
  activeGoals: UserGoal[],
  topicClaims: TopicClaim[],           // from §12 of v1's design
  jurisdictionFact: Attested<string>,
  alreadyAskedThisConversation: boolean,
  gate1Met: boolean,
): { eligible: boolean; reason: string } {
  const needsJurisdiction = activeGoals.some(g =>
    g.state === 'confirmed' &&
    topicClaims.some(c => c.topic === g.category && c.applicability_requirements.some(r => r.fact === 'jurisdiction'))
  )
  const jurisdictionUnknown = jurisdictionFact.state !== 'confirmed'
  const eligible = gate1Met && needsJurisdiction && jurisdictionUnknown && !alreadyAskedThisConversation
  return { eligible, reason: /* diagnostic string, same discipline as discoverySignal */ '' }
}

// New, mirrors buildCommercialReadinessDiscoveryProposal exactly — trivial, deterministic, never LLM-generated
function buildJurisdictionClarificationProposal(phase: Phase): CandidateQuestionProposal {
  return {
    question_text: JURISDICTION_CLARIFICATION_QUESTION,  // fixed copy, PM to approve exact wording
    question_kind: 'jurisdiction_clarification',           // new CandidateQuestionKind enum value
    target_signal_id: null,
    phase,
  }
}
```

**Why this is narrowly scoped, item by item against PM §8's explicit "do NOT touch" list:**
- **Gate 1 / Gate 2 / phase logic** — untouched. `evaluateJurisdictionClarificationEligibility` reads `gate1.state`, never writes it or changes its evaluation logic.
- **Constraint A / Constraint B** — untouched. A jurisdiction-clarification proposal goes through `tryCandidate` exactly like any other candidate — same validation, "no privileged pass," confirmed as Discovery's own explicit discipline and reused verbatim.
- **Model 4** — untouched *structurally*. Its existing "attempt #1 may be a deterministic proposal, attempt #2 is always the ordinary generator" shape is reused, not modified — jurisdiction becomes a second possible *source* for what attempt #1 contains, not a change to the 2-attempt structure itself.
- **`questioning_exhausted`** — untouched; unaffected by which candidate occupied attempt #1.
- **Commercial Readiness Discovery** — untouched *mechanically*, but now has a same-turn precedence question against jurisdiction clarification (both compete for attempt #1). **Recommendation: jurisdiction clarification takes precedence over Discovery when both are eligible the same turn** — jurisdiction serves an already-stated user goal (higher value, directly answers what the user asked for); Discovery is proactive/exploratory value-add. This is a genuinely new precedence rule (Discovery previously had no competing deterministic source) — flagged explicitly as Open Decision item in §16, not silently assumed.

**One honest caveat, not glossed over:** Discovery's eligibility formula gates on `phase === 3` specifically because Discovery's content is semantically tied to being in the post-production phase. Jurisdiction clarification has no such phase-specific reason. I am recommending jurisdiction clarification gate on `gate1Met` alone (not additionally requiring `phase === 3`) since it's a general applicability fact, not phase-3-specific content — **but this interaction (a deterministic candidate proposal being eligible at phase 1/2, which Discovery's own code path has never been exercised at) has not been tested and should be explicitly verified during implementation**, not assumed safe by this design alone. If inspection during implementation reveals `tryCandidate`/Model 4 has an undocumented assumption that a deterministic proposal only ever arrives at phase 3, that would be the one place this design might need a real STOP-and-reconsider — flagged honestly rather than asserted as risk-free.

**Does this consume the ordinary interview follow-up budget? (PM §25.E)** — **No, its own separate budget.** New `BoundaryState` field, `jurisdiction_clarification_asked: boolean`, mirroring `commercial_readiness_discovery_asked` exactly (one new boolean, additive, defaulted `false` for historical sessions — same backward-compat discipline already used for `user_goals`/`category`/`scope` this session). Sharing Discovery's own cap would incorrectly block jurisdiction clarification if Discovery already fired this conversation, which is a real product bug (jurisdiction serves a stated goal; Discovery doesn't) — they must be independent caps.

**Does jurisdiction become part of `RetrievalHandoff`, or passed separately? (PM §25.F)** — **Passed separately, mirroring exactly how `UserGoal` itself is handled.** M1's own design principle — "`RetrievalHandoff` enumerates specific fields explicitly rather than spreading `StructuredUnderstanding`, so `user_goals` cannot leak downstream by construction" — applies identically here. `run-crc-conversation.ts` already reads `understanding.user_goals` directly (not via the handoff) to build M2's input; it should read `understanding.project_facts.jurisdiction` directly the same way, passing it straight into the Applicability Evaluator (§7) alongside the topic-claim lookup, never through `RetrievalHandoff`. This keeps `RetrievalHandoff`'s existing contract (and every test asserting its exact shape) completely unchanged.

---

## 6. Correction / Supersession Behavior

Already specified precisely in §4.C above: plain overwrite via `setJurisdiction()`, no supersession chain, identical to `intended_use`/`workflow_role` today. Nothing further to design — this deliberately reuses an existing, already-tested mechanism rather than introducing a new one.

---

## 7. Revised Applicability Model

**PM §10 asked for exact wiring from `StructuredUnderstanding.jurisdiction` → Retrieval input → applicability evaluator, and asked me to distinguish implemented-Phase-1 predicate types from reserved-future types.**

```ts
export const APPLICABILITY_FACTS = ['jurisdiction', 'tool_plan_tier'] as const           // Phase 1 IMPLEMENTED
export const RESERVED_FUTURE_APPLICABILITY_FACTS = ['client_supplied_asset', 'creator_relationship', 'distribution_context'] as const  // NOT wired in Phase 1

export type ApplicabilityFact = (typeof APPLICABILITY_FACTS)[number]

interface ApplicabilityRequirement {
  fact: ApplicabilityFact | (typeof RESERVED_FUTURE_APPLICABILITY_FACTS)[number]
  tool?: string
  operator: 'equals' | 'not_equals'
  value: string
}
```

**Why only 2 of 5 are implemented (PM §10 explicit review request):**
- `jurisdiction` — implemented. New `ProjectFacts.jurisdiction` field (§3–4), directly wired.
- `tool_plan_tier` — implemented. Already exists as `ToolMention.plan_tier` (confirmed live in production this session: `{state:'confirmed', value:'paid'}`), a real, already-attested, already-tested fact — wiring an applicability check against it is trivial and adds zero new capture logic.
- `client_supplied_asset` — **reserved, not implemented.** As found in v1 §8: the Commercial Readiness Discovery catalog already asks about this (confirmed live: "Did the client give you any images/logos...") but the answer lands as a `ScopedObservation`'s free-text `note`, not a structured, keyed boolean fact an applicability predicate can check with `.equals()`. Wiring this would mean either (a) a new structured extraction path for this one fact, or (b) a fragile text-matching heuristic against `note` — the second is exactly the kind of "pretending a predicate is supported when the underlying fact isn't" PM explicitly warned against. Deferred.
- `creator_relationship` — **reserved, not implemented.** No StructuredUnderstanding field captures this today (relevant to work-for-hire/employee/contractor distinctions — v1 §22 already flagged this as a genuine research gap with zero existing capture mechanism).
- `distribution_context` — **reserved, not implemented.** No structured field; `intended_use` free text sometimes contains this information incidentally (e.g. "paid ad campaign") but not in a form `.equals('paid_advertising')` could check reliably.

**Evaluator wiring (concrete):**
```
StructuredUnderstanding.project_facts.jurisdiction  ──┐
StructuredUnderstanding.tool_mentions[].plan_tier   ──┼──►  evaluateApplicability(requirements, facts) : boolean
                                                       ┘         │
                                                                 ▼
                                       (pure, deterministic .every() over requirements —
                                        same "no scoring, no LLM judgment" discipline
                                        already used everywhere else in this pipeline)
```
Called from the new `lookup-topic-claims.ts` (v1 §12), immediately after the topic-match filter, before a claim can become a `RetrievalResult`. An unmet requirement — including one referencing a *reserved* fact type, since no claim should be authored with one in Phase 1 (§16 below) — produces the exact same safe outcome as today's `outside_current_coverage`: no guess, no fabricated applicability.

---

## 8. Revised Topic Retrieval Contract

v1 §12's file-level design (`types.ts` topic source-fact kind, `topic-claims-fixture.ts`, `lookup-topic-claims.ts`, `retrieve.ts` merge) is **unchanged**. The one addition: `lookup-topic-claims.ts` now also receives the two Phase-1-implemented applicability facts (jurisdiction, tool plan tiers) as inputs, applying §7's evaluator before returning matches. `retrieve()`'s new parameter set:

```ts
export function retrieve(
  handoff: RetrievalHandoff,
  matrix: MatrixRow[],
  topicClaims: TopicClaim[] = [],
  applicabilityFacts: { jurisdiction: Attested<string> } = { jurisdiction: { state: 'unknown' } },
): RetrieveOutput
```

Fully additive/backward-compatible — every existing call site continues to work unmodified (matches the exact discipline already used for `assembleProjectionOutput`'s own `interpretations` parameter this session). `lib/bounded-interpretation/*` still receives only `RetrievalResult[]` — **zero changes**, per PM §17, confirmed again here.

---

## 9. Fixture-Consistency Plan (PM §12, Open Decision J)

**Minimal, not a parser platform.** A small deterministic test (Jest, same suite the rest of the retrieval engine already lives in) that:
1. Extracts every `### CLAIM-*` heading + its `Lifecycle`/`Publication scope` line from `GOVERNED-CLAIMS.md` via a simple regex line-scan (not a real markdown parser — matches the exact "no markdown-parsing precedent in this repo" reasoning `matrix-fixture.ts`'s own header already gives for staying manual).
2. Compares the extracted claim-ID set against `topic-claims-fixture.ts`'s own exported claim IDs.
3. Fails if: a claim ID exists in the markdown but not the fixture (missing), exists in the fixture but not the markdown (stale/orphaned), or a claim's markdown `Lifecycle`/`Publication scope` disagrees with the fixture's `crc_eligible` value for the same ID (drifted).

This is the same class of change as the existing `subsystem-boundaries.test.ts` (a structural, file-scanning consistency test, not a real parser) — reuses a pattern already proven in this exact codebase rather than building new tooling. Runs in the ordinary `npx jest` suite, so drift is caught by CI the same way any other regression is, with zero new infrastructure.

---

## 10. Historical Reproducibility — Reclassified (PM §13)

`knowledge_snapshot_ref` (v1 §10/§14) moves to **Phase 1B**, per PM's explicit reclassification. Critical path is now: Governed Claim → Topic Retrieval → Applicability → M2 → useful CRC result (PM §13's own framing, adopted verbatim). The migration itself remains exactly as designed in v1 (one nullable `TEXT` column, additive, zero risk) — only its *sequencing* changes, not its design. See §14 Phase G below for where it now lands.

---

## 11. Copyright Research Guardrail (PM §15) — Revised Wave 1 Plan

**v1's candidate claim list stands, but is explicitly relabeled: these are leads, not pre-approved doctrine.** Before any Wave 1 claim reaches `Lifecycle: Candidate`, it must independently go through:

1. **Identify primary authority** — trace the claim back to an actual primary source (statute, case, official guidance), not a secondary summary. (v1 §22 already flagged which existing research is primary-sourced vs. not — that audit is the starting point, not the finish line.)
2. **Verify wording** — re-check the primary source directly; do not trust a repo document's paraphrase or quote without independent confirmation. (v1 §22 already found one likely-fabricated citation this way — "Allen v. Perlmutter" — proving this step is not theoretical.)
3. **Define jurisdiction** — explicit, per §4/§7 of this revision.
4. **Define applicability** — explicit predicate list, using only Phase-1-implemented fact types (§7).
5. **Define prohibited conclusions** — explicit, per v1 §5's schema.
6. **Define CRC publication scope** — explicit, following the existing Publication Policy's 6-question checklist (v1 §9, unchanged), same bar the Matrix already applies.
7. **Define the exact human-approved CRC candidate statement** — pre-drafted prose, never model-generated at retrieval time, same discipline the Matrix already uses.

**Candidate claim topics for Phase 1** (per PM §16 — identified, not finalized, doctrine to be separately approved before Adoption):
- **A. Copyrightability / human authorship** — v1's `CLAIM-COPY-001`/`CLAIM-COPY-002` candidates (AI output without human authorship isn't copyrightable; prompts alone don't establish sufficient authorship). Strongest existing evidentiary backing (v1 §3/§22).
- **B. Commercial-use permission vs. copyright/ownership distinction** — a *new* candidate not in v1's original ranked list, added per PM §16.B: the proposition that "a platform's Terms permitting commercial USE of generated output is a separate question from whether that output is COPYRIGHTABLE or who OWNS it" — this is exactly the distinction CRC users are already conflating in real conversations (confirmed live this session: a real user asked both "Can I use this commercially, AND do I own the copyright?" in the same breath). This claim's evidentiary backing is SI8's own existing analytical framework (v1 §3: "ownership vs. clearance distinction... well-articulated across multiple docs") rather than a single external primary source — it should be labeled `Source authority/type: SI8 judgment`, not primary legal authority, and reviewed accordingly.

No legal proposition in either candidate is being adopted by this design document — per PM's explicit instruction, this section identifies candidates and source requirements only.

---

## 12. Revised Automation Loop

**Unchanged from v1 §17–20** except one addition per PM §19 (human-visible provenance): every candidate-review package and every Adopted/CRC-eligible transition must record the approving human's identity in the claim's own `CRC Approver` field (already in v1's schema, §5) — **no automated "legal reviewer" role is created**, and the design contains no code path that could populate `CRC Approver` with anything other than a real person's name, mirroring the Matrix's own existing field (currently always "JD," confirmed in v1's research).

---

## 13. Revised Acceptance Test

v1 §23's 14 items remain, **plus PM §24's 10 jurisdiction-specific tests, plus §9's fixture-consistency test above:**

1. Copyright goal + confirmed U.S. jurisdiction → eligible claim may surface.
2. Copyright goal + Taiwan jurisdiction → U.S. claim does not surface (applicability requirement unmet).
3. Copyright goal + unknown jurisdiction → no guess, bounded no-applicable-coverage behavior.
4. Copyright goal + declined jurisdiction → same as unknown, claim inapplicable.
5. Copyright goal + ambiguous multi-country statement ("client is American but we're making it in Taiwan") → no invented governing jurisdiction; CRC states its confirmed facts are insufficient to apply the claim.
6. IP resolves to U.S., user states Taiwan → user-attested value wins; confirm via code inspection that no function in the jurisdiction-capture or applicability-evaluation path ever reads `resolveClientIp`/`normalizeIp` (same class of structural-guarantee test already used to prove "browser never gets `projection`" this session).
7. IP resolves to Taiwan, user states U.S. is relevant → same, inverse direction.
8. User changes jurisdiction mid-conversation → plain-overwrite semantics (§6) correctly reflect only the latest value; no orphaned/duplicate state.
9. No jurisdiction-sensitive goal stated at all → jurisdiction clarification is never asked, purely because governed jurisdictional claims exist — confirms `evaluateJurisdictionClarificationEligibility`'s `needsJurisdiction` check (§5) is goal-driven, not claim-existence-driven alone.
10. A historical session predating the `jurisdiction` field loads normally — same backward-compat defaulting pattern already proven this session for `user_goals`/`category`/`scope` (`deserializeStructuredUnderstanding` defaults `jurisdiction: {state:'unknown'}` for any session missing the field).
11. **Fixture consistency test** (§9) — deliberately introduce a mismatch (add a claim to the markdown, not the fixture) and confirm the test fails; remove the mismatch and confirm it passes.

---

## 14. Revised Implementation Sequence

**PM's own §23 8-phase, 35-step sequence is adopted as the implementation plan, with §10's reclassification reflected** (Phase G now explicitly follows Phase D/E rather than sitting earlier):

**PHASE A — Structural Skeleton**
1. `GOVERNED-CLAIMS.md` template/canonical structure (empty/skeleton).
2. `TopicClaim` runtime type (§8).
3. Topic lookup code path (`lookup-topic-claims.ts`), zero claims wired.
4. `retrieve()` accepts the new parameters, defaulted to empty/unknown — zero behavior change.
5. Confirm existing CRC behavior byte-identical (full existing suite green, no new claims exist yet).

**PHASE B — Minimal Jurisdiction Capture**
6. Add `ProjectFacts.jurisdiction: AttestedFact<string>` (§3), `setJurisdiction()` mutation, extraction wiring (§4).
7. Add the narrow applicability-clarification candidate mechanism (§5): `evaluateJurisdictionClarificationEligibility`, `buildJurisdictionClarificationProposal`, new `BoundaryState.jurisdiction_clarification_asked` field, new `CandidateQuestionKind`/`MessageKind` enum values.
8. Verify no IP inference anywhere in the new code path (acceptance tests #6–7).
9. Verify no Gate/Gate2/completion regression — full existing suite green; specifically re-run every Gate/boundaries/candidate-question test unmodified.

**PHASE C — First Governed Copyright Claims**
10. Re-verify primary sources for candidates A and B (§11) — human research pass, not automated.
11. Draft `Lifecycle: Candidate` entries.
12. Human review (`Under Review`).
13. Adopt.
14. Separately approve CRC eligibility (distinct decision, per Publication Policy).
15. Mirror approved claim(s) into `topic-claims-fixture.ts`.

**PHASE D — CRC Wiring**
16. Enable Topic Retrieval end-to-end (wire §8's contract into `run-crc-conversation.ts`).
17–23. Run acceptance tests #1–9 (§13) against a real or scripted conversation.
24. Verify M2 unchanged — no diff in `lib/bounded-interpretation/` at all across this entire phase.

**PHASE E — Automation Proof**
25–31. Source monitoring, diff detection, archive, AI candidate proposal, challenge/impact package, human approval boundary, prove no auto-publication — unchanged from v1 §17–20.

**PHASE F — Analytics**
32. Extend `goal-analytics-report.ts` per v1 §21, adding jurisdiction-missing-rate reporting.

**PHASE G — Commercial Assurance Snapshot Proof (Phase 1B — after D, not before)**
33. Add `knowledge_snapshot_ref` migration, if still approved at that point.
34. Prove the historical-snapshot mechanism against one real test assessment.

**PHASE H — Full Acceptance**
35. Run the complete revised vertical-slice test suite (§13, all items).

Each phase remains independently testable/revertable, per the original design's own discipline.

---

## 15. Updated Migrations / Dependencies

**Unchanged from v1 §24 in kind, changed in sequencing:** the one `assessments.knowledge_snapshot_ref` migration now lands in Phase G (step 33), not Phase A/B — it has zero dependency on anything in Phases A–F and can be deferred or dropped entirely without affecting the critical CRC path, exactly matching PM §13's instruction. No other new migration, env var, cron target, or external service beyond what v1 already specified (the GitHub Actions source-monitor workflow, reusing existing secrets).

---

## 16. Updated Risks

All of v1 §26's risks stand. **New/changed risks from this revision:**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Jurisdiction-clarification / Discovery same-turn precedence untested in combination | Medium | Low-medium — worst case is one mechanism's question gets delayed a turn, not a correctness bug | Explicit precedence rule recommended (§5); add a dedicated test exercising both being eligible the same turn during Phase B |
| Deterministic candidate eligible outside phase 3 (untested interaction with Model 4/Gate logic at phases 1/2) | Low-medium (honest uncertainty, not dismissed) | Medium if it surfaces | Explicitly flagged in §5 as needing verification during implementation, not assumed safe; if it surfaces, escalate to PM per the original "STOP if Gate/completion semantics must change" instruction rather than silently patching |
| A Wave 1 claim ends up authored referencing a *reserved* (not-yet-implemented) applicability fact type | Low | High if it happened — claim would silently never be applicable, appearing "adopted" but permanently inert | §7's `APPLICABILITY_FACTS` vs. `RESERVED_FUTURE_APPLICABILITY_FACTS` type-level split makes this a compile-time-catchable mistake, not a runtime surprise, if the schema is actually typed this way at implementation time |
| Fixture-consistency test itself drifts from the real markdown format (regex-based, not a real parser) | Low | Low — same accepted risk `matrix-fixture.ts` already carries | Keep the check minimal (claim ID + Lifecycle + Publication scope only, §9) rather than attempting full-fidelity parsing |

---

## 17. Every Remaining Open PM Decision

Per PM §25, with recommendations:

**A. Exact `StructuredUnderstanding` jurisdiction shape** — `ProjectFacts.jurisdiction: AttestedFact<string>` (§3). *Recommended, not open.*

**B. How jurisdiction is extracted** — third `raw_fact_field` value on the existing `project_fact` candidate kind (§4.B). *Recommended, not open.*

**C. How a correction is handled** — plain overwrite, no supersession chain, same as `intended_use` (§4.C/§6). *Recommended, not open.*

**D. Where/when the applicability question is generated** — deterministic candidate at Model 4 attempt #1, same slot as Discovery (§5). *Recommended, not open — but see the phase-3-gating caveat below, which genuinely is open.*

**E. Does jurisdiction clarification consume the ordinary interview follow-up budget?** — No, its own independent `BoundaryState` cap field (§5). *Recommended, not open.*

**F. `RetrievalHandoff` vs. separate?** — Separate, mirroring `UserGoal`'s own precedent (§5). *Recommended, not open.*

**G. Single jurisdiction value vs. bounded list?** — **Genuinely open.** Recommendation: single value for Phase 1 (matches PM §9's multi-jurisdiction examples, which describe *ambiguity/insufficiency* behavior, not a need to store multiple confirmed jurisdictions simultaneously). A user stating "US and EU" should, per §9's own example C, produce "insufficient confirmed facts to apply a single jurisdiction-specific claim" — representable as `jurisdiction: {state: 'unknown'}` or a special captured-but-ambiguous state, *without* needing the field itself to hold a list. **Open because:** if Wave 5 (jurisdictional overlays, per v1 §22) eventually needs multi-jurisdiction workflows to be a first-class supported case rather than an edge case, a list becomes necessary later — Phase 1 doesn't need to decide the eventual shape now, only confirm a single value doesn't block Phase 1's own acceptance tests (it doesn't, per test #5 above).

**H. Exact user-facing question wording** — **Explicitly not decided here**, per PM's own instruction ("do not treat that exact wording as approved copy"). Placeholder: something in the spirit of "Which country's laws are most relevant to how you plan to use this?" — phrased to avoid presupposing a single-jurisdiction answer exists, and to avoid the word "jurisdiction" itself (jargon a real user may not parse cleanly). **Needs PM/copy sign-off before Phase B, item 7.**

**I. Do `client_supplied_asset`/`creator_relationship`/`distribution_context` remain Phase 1 types or defer?** — **Defer**, per §7's explicit reasoning. *Recommended, not open.*

**J. Minimum fixture-consistency mechanism** — regex-based claim-ID/Lifecycle/Publication-scope diff check, reusing the `subsystem-boundaries.test.ts` structural-scan pattern (§9). *Recommended, not open.*

**K. Does `knowledge_snapshot_ref` stay Phase 1 or move to 1B?** — **Moves to Phase 1B** (§10/§14 Phase G), per PM's own explicit instruction. *Resolved by PM, not open.*

**One additional open item this revision surfaced that wasn't in PM's original list:** the jurisdiction-clarification-vs-Discovery same-turn precedence rule (§5) — recommended (jurisdiction wins), but genuinely a product-tone decision PM hasn't explicitly ruled on, since it didn't exist as a question before this revision (Discovery previously had no competing deterministic candidate source).

---

## 18. Final Recommendation

**GO WITH CHANGES — proceed to implementation planning**, using the revised 8-phase (A–H) / 35-step sequence in §14, once the following are confirmed:

1. Open Decision G (single vs. list jurisdiction value) — recommend single value, low-risk to confirm.
2. Open Decision H (exact question wording) — needs real copy sign-off before Phase B ships.
3. The new Discovery-vs-jurisdiction-clarification precedence rule (end of §17) — recommend jurisdiction wins, needs explicit PM confirmation since it's a new product-tone decision this revision surfaced.
4. The one honest technical caveat in §5 (phase-3-gating interaction) — not a blocker, but should be explicitly verified against the real `run-turn.ts`/Model 4 code during Phase B implementation, with instructions to escalate rather than silently work around if it reveals a real Gate/completion interaction.

Nothing in this revision requires reopening v1's core architecture (§1–2 of v1, unchanged), and nothing here required a STOP-and-flag on Gate/completion semantics — the jurisdiction-clarification mechanism fits inside an extension point that already exists and is already proven in production, not a new one.

**No code, no migration, no commit, no push, no deploy performed in this revision.**
