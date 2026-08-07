# CRC Prototype Alpha — Development Roadmap

**Status:** Final engineering execution plan for CRC Prototype Alpha.
**Type:** Engineering execution plan, not architecture or product spec. Answers *what gets built, in what order, tested how.* `PRD_CRC_v1.0.md` (product behavior) and `INTERVIEW_ENGINE_ARCHITECTURE.md` (internal design) are both normative inputs here and are not reopened by this document.
**Date:** 2026-08-08

**Milestone objective:** prove the Interview Engine architecture survives contact with a real implementation. Not a production launch. Success is a debuggable verdict — what worked, what broke, what needs to change before Retrieval connects — not a shipped feature.

---

## The pipeline this roadmap builds

```
Extraction → Structured Understanding → Candidate Question → Decision (Constraint A) → Boundary (Constraint B) → Output
                                              │
                                              └── on Gate 1 + Gate 2 completion → Handoff assembly (Phase 5)
```

Extraction and downstream decision-making are architecturally distinct stages, not just a post-hoc failure-debugging label. They fail differently and get fixed differently: extraction failures are prompt/parsing/schema/normalization problems; decision failures are Constraint A threshold/priority/candidate-generation problems. Separating them as real pipeline stages — not just a shared LLM call with two blurred concerns inside it — is what makes the rest of this pipeline testable without an LLM at all. Handoff assembly is a separate, deterministic branch off Structured Understanding, not a step in the per-turn conversation loop — it only runs once, on completion, and depends on nothing the LLM produced at the moment it's built.

**Testability by component:**

| Component | Deterministic (testable without an LLM)? |
|---|---|
| Types (Phase 1) | ✅ |
| Mutation / supersession (Phase 2) | ✅ |
| Gates 1 & 2 (Phase 3) | ✅ |
| Boundaries / Constraint B (Phase 4) | ✅ |
| Handoff assembly (Phase 5; schema per architecture doc §12) | ✅ |
| Extraction — raw text → structured facts (Phase 6a) | ❌ |
| Candidate Question generation (Phase 6b) | ❌ |
| Decision / Constraint A — would a plausible answer help? (Phase 6c) | ❌ |

Phases 1–5 — everything above the line — can be built and fully unit-tested before a single LLM call is made. Phase 6 — split into 6a/6b/6c — is where the architecture's real, unproven risk lives, and each sub-phase isolates one non-deterministic component so a failure is attributable to a specific mechanism, not a blurred "something in the model layer" bucket.

---

## Engineering discipline

- **Branch:** `prototype/interview-engine-alpha`, not `main`. First genuinely experimental subsystem in an otherwise clean repository — keep it that way until Phase 8 lands with a verdict.
- **Commits:** one per completion-criterion satisfied within a phase, not one per phase. Target ~25–40 commits total across the whole prototype for a clean, bisectable history.
- **Module structure** (verify against existing `08_Platform/app/` conventions before Phase 1 starts — not yet confirmed):
  ```
  08_Platform/app/lib/interview-engine/
    types.ts / mutations.ts / gates.ts / boundaries.ts / handoff.ts
    extraction.ts / candidate-question.ts / decision.ts
    __fixtures__/dialogues/
  ```
- **Tests:** co-located (`*.test.ts` beside `*.ts`) if that matches existing app convention — check, don't assume.
- **Fixtures:** each of the 8 dialogues as one structured object — `{ turns, expected: { phase_path, questions_asked, questions_suppressed, scoped_observations, gate_1_result, gate_2_result, termination_reason, handoff_object } }`. Converted once, up front, from the PRD's prose dialogues. **Not versioned into `v1/`/`v2/` folders yet** — deferred pending a real case where an old fixture needs to keep running alongside a corrected one.
- **Review:** structured actual-vs-expected diff per dialogue run, not pass/fail. Legibility of failure is a stated success criterion — a checkmark actively works against that.
- **Isolation:** a local CLI/test-harness entry point, not a feature flag on a real route. A flag implies production-reachability this milestone doesn't need.

---

## Phase 1 — Structured Understanding domain model

**Objective:** define and implement the core runtime types (project facts, workflow steps, canonical tools/unresolved aliases, access surface, plan tier, intended use, scoped observations, current-vs-historical, certainty states, absence/unresolved/declined, phase state, completion/termination reasons), including the runtime-only extensions from `INTERVIEW_ENGINE_ARCHITECTURE.md` §5 (identifiers, mutation status, source turn, supersession links).

**Dependencies:** none — first phase.
**Files/modules:** `types.ts`.
**Deliverables:** type definitions; instantiated representative states for all 8 dialogues.

**Phase 1a — Alpha 0 checkpoint (build and pass this before anything else in Phase 1 is considered done):**
```
Create a Structured Understanding object
        ↓
Mutate it
        ↓
Serialize it
        ↓
Deserialize it
        ↓
Mutate again
```
Tests serialization round-trip integrity specifically — including whether `superseded_by` links survive intact. Neither the original Phase 1 nor Phase 2 completion criteria test this; it's a distinct, foundational property worth catching before anything is built on top of a type model that doesn't round-trip cleanly.

**Test strategy:** pure unit tests, no LLM, no I/O beyond in-memory serialize/deserialize.
**Completion criteria:** types compile; representative states instantiate for all 8 dialogues; Alpha 0 checkpoint passes; no LLM dependency exists anywhere in this phase.
**Explicitly deferred:** persistence beyond in-memory serialize/deserialize round-trip; any real database.
**Main risks:** low — this is the deterministic foundation. Risk is mostly schema-completeness (missing a field some dialogue needs), caught early by requiring all 8 dialogues to instantiate now, not discovered in Phase 7.

**Status: complete (2026-08-06).** 4 commits on `prototype/interview-engine-alpha`. 17/17 tests passing (`__tests__/interview-engine/`), clean `tsc --noEmit`.

**Post-completion review findings (2026-08-06), not yet acted on — flagged for Phase 2:**
- `access_surface` and `plan_tier` live on `ProjectFacts` as single project-wide `Attested<string>` values, not per-`ToolMention`. This repo's own domain model treats access surface as per-tool (Platform Rights Matrix splits Gemini into separate API/Consumer App rows), so a project using two tools with different plans can't be represented structurally — `mixed_multi_signal` papers over this with one free-text sentence covering both tools. Open question for Phase 2: should `ToolMention` carry its own access-surface/plan fact, or should `ProjectFacts` become per-tool-keyed?
- The `ambiguous_multi_surface_tool` fixture is internally inconsistent: `tool_mentions` resolves to `gemini-api` confirmed at turn 2, but `project_facts.access_surface` is left at `unresolved_no_visibility` — nothing propagates a tool-level resolution up to the project-level fact. Not a failed Phase 1 criterion (the state itself is validly represented), but exposes an undecided design question for Phase 2's mutation engine: should tool resolution ever auto-update related `ProjectFacts`, or should these remain two independently-tracked facts by design? Recommend deciding this explicitly in Phase 2 rather than inheriting the current fixture's inconsistency by accident.
- Non-destructive supersession and `superseded_by` link integrity are round-trip tested (Alpha 0) for `ScopedObservation` only. `ToolMention` has the identical `superseded_by: string | null` shape and is demonstrated (non-round-trip) in `ambiguous_multi_surface_tool`, but no test exercises a `ToolMention` supersession chain through serialize/deserialize the way `ScopedObservation` gets in Alpha 0.
- "Multiple observations from one turn" is demonstrated (`mixed_multi_signal`: three observations share `source_turn: 1`) but not independently asserted by any test — existing tests check confidence validity and scope distinctness, not per-turn multiplicity.
- `ScopedObservation.note` is unconstrained free text on every confidence state, including `declined`/`unknown`. The type system stops an inferred *value* leaking through `Attested<T>` (no `value` field exists on non-`confirmed` variants), but nothing stops prose in `note` from narrating an inferred conclusion regardless of confidence. Content discipline, not enforceable at the type level.

**Known unrelated test failure:** `__tests__/assessments/mock-provider.test.ts` has 2 pre-existing failures (`provenanceAssetId` mock returning empty). Confirmed via `git stash` that these reproduce identically on the base branch with all Phase 1 changes removed — unrelated to this work, not investigated further here.

---

## Phase 2 — Mutation and supersession engine

**Objective:** deterministic operations for adding, correcting, superseding, retracting, splitting one answer into multiple observations, and preserving current-vs-historical scope — including late corrections ("Actually, we also used Runway," "I said API earlier, but it was the Gemini website").

**Dependencies:** Phase 1.
**Files/modules:** `mutations.ts`.
**Deliverables:** mutation operations; supersede-and-mark implementation (per architecture doc §4 — never destructive in-place edit).

**Test strategy:** unit tests covering every mutation case explicitly, not folded into general coverage:
- correction and supersession (new observation added, prior marked `superseded_by`, not deleted)
- multiple observations extracted from one bundled answer (Dialogue F shape)
- current-project vs. historical-project scope preserved separately, never merged (Dialogue C shape)
- absent vs. unknown vs. declined resolve to distinct, correct `confidence` values, not collapsed into one bucket

**Completion criteria:** all cases above pass; earlier facts are never silently overwritten without traceability; both current active state and superseded history are recoverable from the object.
**Explicitly deferred:** correction *detection* from natural language (that's Extraction's job, Phase 6a) — Phase 2 tests mutation *given* an already-identified correction, not whether the engine correctly recognized one. This engine is also the **only** component permitted to apply a mutation — Phase 6a produces proposals, never mutates directly (see Phase 6a).
**Main risks:** low, deterministic. Main risk is under-specifying an edge case (e.g. a correction that only partially supersedes a prior observation) — mitigated by the explicit test list above.

---

## Phase 3 — Gate evaluation

**Objective:** implement Gate 1 and Gate 2 against mocked Structured Understanding states — no live conversation, no Extraction dependency.

**Dependencies:** Phase 1, Phase 2.
**Files/modules:** `gates.ts`.
**Deliverables:** Gate 1 and Gate 2 evaluators, each returning a result plus a debug-legible reason code.

**Test strategy — Gate 1:** clear named tool; ambiguous multi-surface tool (per architecture doc §8 — insufficient until access surface resolved); intended use present/missing/unclear; insufficient facts; partial project information; user opt-out before minimum understanding.
**Test strategy — Gate 2:** material understanding change; minor wording change with no material state change; repeated uncertainty; correction after apparent stability; phase-level vs. interview-level stability. Explicitly test the distinction between completeness, confidence, and stability (architecture doc §10's open question) rather than assuming "no new facts" alone is sufficient.

**Completion criteria:** gate results are fully deterministic for all mocked cases; every result includes a reason code; no Retrieval dependency exists anywhere in this phase.

**Status: complete (2026-08-06).** 6 commits on `prototype/interview-engine-alpha`. 44/44 interview-engine tests passing (18 new in `gates.test.ts`), clean `tsc --noEmit`.

**Type correction made at Phase 3 kickoff, not a Phase 3 deliverable per se:** `access_surface`/`plan_tier` moved from `ProjectFacts` to `ToolMention` (own commit, before `gates.ts`). This resolves the two inconsistencies the Phase 1 post-completion review flagged — `mixed_multi_signal` no longer has to mash two tools' plans into one prose sentence, and `ambiguous_multi_surface_tool` no longer leaves a project-level field stuck unresolved after the tool itself resolves, since both facts now live on the same object.

**Reported architecture gap (Phase 3 instruction: report any case where the frozen architecture doesn't support a deterministic gate decision):** the "phase-level vs. whole-interview" Gate 2 stability distinction is **not cleanly computable from the current type model**. `ScopedObservation` carries `workflow_stage` (T0-T5, a video *production* step) and `source_turn` — neither indicates which CRC *interview* phase (1-4) produced the observation, and architecture doc §11 states explicitly that "a single user turn can supply Phase 1, 2, and 3-relevant information simultaneously." There is no field to restrict a scoped-observations diff to "only Phase 1-2 facts" vs. "only Phase 3 facts." `evaluateGate2`'s `'phase'` scope is implemented as an approximation — "is my Gate-1-relevant understanding stable" (tool resolution + intended_use only) — rather than a true partition of observations by interview phase. Closing this properly would require a type change (a phase tag on `ScopedObservation`), not made in Phase 3. Two smaller judgment calls, also flagged inline in `gates.ts`: (1) §7's post-answer diff materiality criteria literally name only `confidence`/`workflow_stage` — `scope` (current-vs-historical) changes were added to the materiality check as a defensible extension, since excluding them would let a real reclassification read as "stable"; (2) when both a decline and a specific gap (e.g. an unresolved alias) are present simultaneously, Gate 1 reports the decline as the operative reason rather than the specific gap — a judgment call, not dictated by the frozen text.

No case was found where the frozen architecture made a Gate 1 or Gate 2 decision genuinely impossible to compute deterministically — only the one phase/interview-scope gap above, which was implemented as a documented approximation rather than blocking the phase.

**OPEN IMPLEMENTATION ISSUE — accepted as-is for Prototype Alpha, deliberately not fixed (2026-08-06):** the phase-vs-interview Gate 2 approximation above is confirmed acceptable for Prototype Alpha. **Do not add a phase field to `ScopedObservation`** to close it — a type change now would risk false precision, since one turn can span multiple interview phases at once (architecture doc §11) and a per-observation phase tag would imply a cleaner partition than the conversation actually produces. **Revisit only if the eight-dialogue evaluation (Phase 7) shows the current phase-specific fact-slice approximation (Gate-1-relevant fact set standing in for "phase") produces incorrect behavior** — not preemptively.

**Also confirmed (2026-08-06), no changes needed:** the `scope` (current-vs-historical) reclassification counting as material for Gate 2, and Gate 1's decline branch taking precedence over a co-occurring specific gap when both are present, are both correct as implemented. The decline branch was found to be discarding the specific blocking field (e.g. which tool mention is ambiguous) in favor of a generic placeholder when a decline coexisted with a specific gap — fixed same-day: `unresolved_fields` is now computed once and shared across every branch, decline included, so the reason_code (why) and unresolved_fields (what) never trade off against each other.
**Explicitly deferred:** resolving the confidence-vs-completeness open question definitively — this phase's tests inform it, don't close it.
**Main risks:** low, deterministic — same caveat as Phase 2, risk is in edge-case completeness of the mocked states, not the evaluators themselves.

---

## Phase 4 — Conversation-boundary state machine

**Objective:** implement the independent Constraint B boundary rules (one follow-up per signal, one uncertainty clarification, no incident investigation, historical-experience question cap, user decline) as a standalone state machine.

**Dependencies:** Phase 1 (types only — does not depend on Phase 2/3).
**Files/modules:** `boundaries.ts`.
**Deliverables:** boundary state tracker; suppression/termination decision function.

**Test strategy:** a valuable (Constraint-A-passing) candidate question can still be blocked; boundary scope is correctly non-uniform — most violations suppress one question only, user decline may terminate a question, phase, or interview per the boundary the user actually expressed (architecture doc §6 Rule 6); decline is never conflated with `unknown` or `confirmed_absent` in the resulting state.

**Completion criteria:** all cases above pass; scope-of-suppression is correct in every case, not defaulted to "suppress one question" uniformly.
**Explicitly deferred:** integration with real candidate questions — this phase tests the state machine against scripted/fixture inputs, not live generation (that's Phase 6b, which also adds adversarial candidate testing).
**Main risks:** low, deterministic. Note: this phase has no dependency on Phase 3 — can be built in parallel with it if useful.

**Status: complete (2026-08-07).** 2 commits (implementation + tests) on `prototype/interview-engine-alpha`. 63/63 interview-engine tests passing (18 new in `boundaries.test.ts`), clean `tsc --noEmit`. No new type migrations — `boundaries.ts` reuses `OptOutScope`/`Phase` from Phase 1's types; `BoundaryState` is a new but entirely self-contained type, never nested into `StructuredUnderstanding`.

**Deliberate, flagged omission:** PRD §8 Rule 5 (one disentangling question for bundled answers) exists in the frozen PRD but was not part of the Phase 4 kickoff's requested rule set (follow-up cap, uncertainty clarification, historical-experience cap, incident-investigation prohibition, decline scoping) and is **not implemented**. Not an oversight — noted in `boundaries.ts`'s own module comment so it isn't mistaken for full §8 coverage later.

**No frozen-PRD rule was found that couldn't be represented deterministically.** The phase-vs-interview Gate 2 approximation from Phase 3 did not affect Phase 4 — `boundaries.ts` never imports `gates.ts` or references Gate 1/Gate 2 results at all, by design (the independence invariant is enforced at the import level, not just by convention).

---

## Phase 5 — Interview → Retrieval handoff assembly

**Objective:** build and unit-test the handoff object (architecture doc §12) against mocked Structured Understanding states, entirely deterministically, before any LLM phase exists to produce real ones.

**Dependencies:** Phase 1 (types) only.
**Files/modules:** `handoff.ts`.
**Deliverables:** handoff assembly function; explicit inclusion/exclusion assertions.

**Test strategy:** assembled handoff object contains the required structured facts (canonical tool identifiers, unresolved aliases, access surface, plan tier, workflow role, intended use, scoped observations, certainty state, exclusions) given a variety of mocked Structured Understanding states, including partial/declined/gate-1-unmet states. Separately and explicitly test that the object **never** contains risk scores, clearance conclusions, SI8 institutional opinions, or an invented resolution to something that was actually left unresolved or declined — these are negative assertions, not just absence-by-omission, and should fail loudly if a future change accidentally introduces one.
**Completion criteria:** handoff assembly is correct for all mocked states; every exclusion is actively tested, not assumed.
**Explicitly deferred:** consumption by a real Retrieval system — this phase only proves the object is assembled correctly, never that anything downstream can use it.
**Main risks:** low, deterministic. Main risk is an incomplete exclusion list — mitigated by treating each exclusion as its own explicit test rather than a single generic "no bad fields" check.

**Status: complete (2026-08-07).** 3 commits (type correction + implementation + tests) on `prototype/interview-engine-alpha`. 80/80 interview-engine tests passing (17 new in `handoff.test.ts`), clean `tsc --noEmit`.

**Type adjustment made (pre-check confirmed a real mismatch):** `RetrievalHandoff` still matched the pre-Phase-3 shape — `canonical_tool_identifiers: string[]` paired with singular top-level `access_surface`/`plan_tier`, written before those facts moved onto `ToolMention`. Replaced with `tools: RetrievalHandoffTool[]`, each carrying its own `identifier`/`access_surface`/`plan_tier`. The singular top-level fields were removed rather than kept as a "summary" — a summarized value across two disagreeing tools would itself be an invented fact, which this object must never contain. `unresolved_aliases` was unchanged.

**Independence confirmed by import graph, not just convention:** `handoff.ts` imports only `@/types/interview-engine`. No `gates.ts`, `boundaries.ts`, Matrix, or Retrieval reference anywhere. `certainty_state` is read directly from `understanding.gate_1_state` (already stored on the object per architecture doc §3) rather than recomputed via `evaluateGate1` — avoids both a forbidden import and a second, driftable reimplementation of Gate 1's logic.

**No frozen-PRD/architecture rule was found undeterminable.** Partial and opt-out states produced no ambiguity: both are handled by the same field-mapping logic as any other state (no special-casing), since "unresolved"/"unclear"/"declined" are already valid, complete sentinel values in the handoff schema, not gaps requiring extra logic to paper over.

---

## Phase 6a — Extraction (isolated)

**Objective:** raw user turn → structured facts: tool and access-surface normalization, bundled-answer splitting, correction/supersession detection, current-vs-historical scope, absent/unknown/unresolved/declined disambiguation, source-turn attribution. Tested in isolation against fixed user turns — not live multi-turn conversation.

**Dependencies:** Phases 1–5 complete (practically: needs Phase 1's types to produce proposals against, and Phase 2's mutation engine to validate proposals through — Phases 3–5 aren't strict technical dependencies but are complete first per this sequence).
**Files/modules:** `extraction.ts`.
**Deliverables:** an extraction function that returns a **proposed** set of facts, observations, corrections, and certainty states — it does not mutate Structured Understanding directly, under any circumstance. Phase 2's mutation engine remains the only component permitted to apply changes to the live object.

**Test strategy:** fixed, single-turn (or short scripted-sequence) inputs, each asserting two things separately: (1) the extraction proposal itself is correct — right facts, right normalization, right scope, right certainty state, right source-turn attribution; (2) feeding that proposal through Phase 2's mutation engine produces the correct final Structured Understanding state. Covers: tool/access-surface normalization (the Nano Banana ambiguity case); bundled-answer splitting (Dialogue F shape); correction/supersession detection ("Actually, we also used Runway"); current-vs-historical scope (Dialogue C shape); absent vs. unknown vs. unresolved vs. declined, kept distinct.

**TRACKED REQUIREMENT — carried forward from Phase 4 (2026-08-07), not yet implemented:** PRD §8 Rule 5 ("one disentangling question for bundled answers, scoped to which fact applies to which project/time period, never resolved by guessing") is explicitly **not** covered by Phase 4's generic `boundaries.ts` state machine — confirmed as a deliberate omission, not an oversight, when Phase 4 was accepted. Bundled-answer disentangling belongs here, in Extraction/candidate-question integration (bundled-answer splitting is already this phase's own scope, per the test strategy above) — implement Rule 5 as part of that work, not as a Phase 4 retrofit. Do not consider Phase 6a/6b complete without it.
**Completion criteria:** extraction proposals are correct for all fixed test turns; extraction never writes to Structured Understanding directly (verified, not assumed); routing a correct proposal through Phase 2 produces the correct mutated state.
**Explicitly deferred:** live multi-turn conversation (Phase 6b/6c/7 territory); resolving whether an extracted fact was *correctly interpreted* versus merely *present* — that's the confidence-vs-completeness open question from Phase 3/architecture doc §10, not closed here.
**Main risks:** first LLM contact point in the roadmap. Highest uncertainty alongside Phase 6c.

**Substage 1 (deterministic extraction-contract) status: complete (2026-08-07).** 5 commits (ProjectFacts provenance wrapper + mutation functions + pipeline + mock extractor + tests) on `prototype/interview-engine-alpha`. 104/104 interview-engine tests passing (18 new in `extraction.test.ts`), clean `tsc --noEmit`. `extraction.ts` implements the full four-stage pipeline (candidates → normalize → attest → mutate) behind a pluggable `CandidateExtractor` interface; `mock-extractor.ts` supplies a deliberately non-NLU constant extractor for these tests only. The mock proves the architecture and plumbing — it is explicitly not evidence that natural-language extraction works.

**Type additions made during substage 1:** `AttestedFact<T>` wrapper added to `ProjectFacts.intended_use`/`workflow_role` (source_turn/source_statement provenance, the same discipline `ScopedObservation`/`ToolMention` already had) — a real ripple across `gates.ts`, `handoff.ts`, `fixtures.ts` (all 8 fixtures), and 4 existing test files, all still passing after. `mutations.ts` gained `setIntendedUse`/`setWorkflowRole` — plain immutable replacements, not supersede-and-mark, since ProjectFacts fields were never modeled with history semantics.

**Substage 2 (real-model extraction evaluation): provider adapter + harness complete (2026-08-07); the actual live evaluation run is still blocked on credentials.** 5 commits: async `CandidateExtractor` interface, `anthropic-extractor.ts` (the only file importing `@anthropic-ai/sdk`), 14-scenario `eval/corpus.ts`, `eval/run-real-model-eval.ts`. Uses GA Structured Outputs (`output_config.format`, `jsonSchemaOutputFormat`) against `claude-sonnet-5` (configurable via `INTERVIEW_EXTRACTOR_MODEL`), no `thinking`, no non-default sampling params. Verified working end-to-end for the failure path: running `npm run eval:extraction` with no `ANTHROPIC_API_KEY` set exits 1 with the exact local remediation steps, never substitutes the mock extractor. Confirmed invisible to `npx jest` (104/104 unaffected). `ANTHROPIC_API_KEY`/`INTERVIEW_EXTRACTOR_MODEL` placeholders added to `.env.local.example` only; no real key committed anywhere.

**Live evaluation run: complete (2026-08-07).** JD supplied `ANTHROPIC_API_KEY` locally; verified present (non-empty, correct `sk-ant-...` prefix) without ever reading or transmitting the value through chat. Ran twice, 42 live calls each (14 scenarios × 3 trials), against `claude-sonnet-5`:

- **Run 1** surfaced two harness bugs, not model bugs: token usage always reported 0/0 (`extractWithDiagnostics` built but never wired into the harness — it was calling the plain extractor); false-resolution rate inflated to 8.8% by a heuristic bug (`kling`/`elevenlabs` are natural spoken names that happen to equal their own canonical slug lowercased, so correctly reporting them was being counted as illegal canonicalization). Both fixed same-day; see `eval-reports/EXTRACTION-EVAL-2026-08-07T03-19-36-820Z.md` for the pre-fix run, kept as the evidence that motivated the fix, not deleted.
- **Run 2 (authoritative)**, `eval-reports/EXTRACTION-EVAL-2026-08-07T03-27-09-657Z.md`: 100% schema-valid (42/42), 97.6% scenario pass rate (41/42), 0% false-resolution, 0% invented-fact, 100% ambiguity-preservation/correction-detection/current-vs-historical-scope-accuracy/absent-unknown-unresolved-declined-classification-accuracy/bundled-splitting-accuracy. 107,904 input / 19,815 output tokens across 42 trials; ~6.8s average latency per call.
- **One material failure**, classified per the "prompting vs. schema vs. normalization vs. architecture" instruction: `nano_banana_consumer` trial 3 — the model's `raw_tool_name` captured the entire clause ("Nano Banana -- just the app on my phone, not anything technical") instead of isolating just the tool name, which broke `normalizeCandidate`'s exact-match registry lookup and produced `unrecognized` instead of `resolved: gemini-consumer-app`. **Classified as prompting/schema** — the `raw_tool_name` field description said "the tool name exactly as the user said it" without explicitly scoping it to *only* the tool name, not the surrounding sentence. Normalization itself behaved correctly (conservatively rejected an unrecognized string rather than guessing) — not a normalization or architecture defect. **Not fixed here** — flagged for review, per the explicit instruction not to change architecture (or, by the same logic, the prompt) to chase one result without review first.

**Targeted refinement + rerun (2026-08-07).** Single-field change to `raw_tool_name`'s schema description only (exact diff in commit `6f9ea62`): explicitly "return ONLY the tool or platform name itself... do not include surrounding explanation, access-method phrases, punctuation, plan details, or qualifiers," plus 3 valid / 3 invalid examples. No change to the alias registry, `normalizeCandidate`, the system prompt's other instructions, or any deterministic pipeline file.

Reran the full 14-scenario corpus, 3 trials each (42 live calls), `eval-reports/EXTRACTION-EVAL-2026-08-07T03-57-04-657Z.md`:

| Metric | Run 2 (before) | Run 3 (after) |
|---|---|---|
| Schema-valid | 100% (42/42) | 100% (42/42) |
| Scenario pass rate | 97.6% (41/42) | 97.6% (41/42) |
| False-resolution | 0% (0/66) | 0% (0/63) |
| Invented-fact | 0% (0/66) | 0% (0/63) |
| Ambiguity preservation | 100% (6/6) | 100% (6/6) |
| Correction detection | 100% (3/3) | 100% (3/3) |
| Current-vs-historical scope | 100% (3/3) | 100% (3/3) |
| Absent/unknown/unresolved/declined classification | 100% (9/9) | **88.9% (8/9)** |
| Bundled-answer splitting | 100% (3/3) | 100% (3/3) |
| Tokens | 107,904 in / 19,815 out | 116,409 in / 18,526 out |
| Avg latency | ~6.8s | ~5.2s |

**The targeted fix worked as intended**: `nano_banana_consumer`, the scenario that failed on this exact issue in run 2, passed 3/3 in run 3 — the original failure mode did not recur.

**But a new, unrelated failure appeared**: `uncertainty_no_visibility` trial 2. The model split "I don't have access to that -- someone else on the team manages billing and approvals" into a `project_fact`/`workflow_role` candidate (`confirmed_absent`) plus a `scoped_observation` candidate (`confirmed`) — neither candidate carried the expected `unresolved_no_visibility` confidence hint. This is in a completely different field (confidence-hint classification, not `raw_tool_name`) and a completely different scenario than the change touched, which points to natural sampling variance rather than a regression caused by the edit — but it was not present in run 2's three clean trials of this same scenario.

**Per the stated completion criteria, "no new material failures" is not literally satisfied** — scenario pass rate held steady only because one failure was traded for a different one. **Phase 6a is NOT marked complete.** No further prompt/schema changes made — not chasing this single trial without review, consistent with the standing instruction. Latency and token usage continue to be recorded, not optimized. **Not proceeding to Phase 6b** pending review of this comparison.

**Targeted diagnostic of `uncertainty_no_visibility` (2026-08-07).** No prompt/schema changes; `corpus.ts` untouched. Standalone script (`diagnose-uncertainty-no-visibility.ts`), semantic scoring (any candidate matching the visibility-clause trigger phrase, regardless of `kind`, counted correct if its confidence is acceptable) rather than exact-shape matching. Original scenario × 20 + 5 semantically-equivalent paraphrases × 5 each = 45 trials, run twice (90 total).

**Run 1 exposed a bug in the diagnostic's own scoring, not the model**: when the model emitted two candidates with identical `raw_text` (one `project_fact` framing, one `scoped_observation` framing), the `.find()`-based scorer picked whichever came first — which could be the less-informative duplicate even when a correct `unresolved_no_visibility` candidate sat right beside it (confirmed by manually re-reading `paraphrase_1` trial 4's raw JSON). Fixed to check all matching candidates, not just the first; reran clean.

**Run 2 (fixed scorer), against the provisional acceptance standard:**
| Standard | Result |
|---|---|
| ≥90% no-visibility preservation | **MET** — 93.3% (42/45) |
| 0% conversion into confirmed absence | **NOT MET** — 6.7% (3/45) |
| 0 invented facts | **MET** — 0/71 |

**Combined across both correctly-scored runs (90 trials, the statistically meaningful view): failures are concentrated, not uniform.** The `original` phrasing: 3/40 (7.5%). One ambiguously-worded paraphrase (no named alternate knower — "I'm not involved... so I don't know"): 1/10 (10%), explicitly flagged in the diagnostic as lenient-scored for this reason. **The other 4 paraphrases: a clean 0% across 20 total trials each.**

**Classification: prompt/schema weakness, not sampling variance.** 3 of the 4 genuine failures share an identical two-candidate shape: `project_fact`/`workflow_role` at `confirmed_absent` for "I don't have access to that," paired with a correctly-`confirmed` `scoped_observation` for the secondary "someone else manages it" fact — the respondent's own lack-of-visibility never appears anywhere in the output. This is the exact repeated pattern the review instructions named as the trigger for a prompt/schema-weakness classification, not a one-off. It is narrowly scoped, though: specific to phrasing that pairs "I don't have access to X" with an explicit named alternate owner, not a general breakdown of the confidence taxonomy — 4 of 6 tested phrasings never produce it.

**Fixture-rigidity finding, confirmed but not acted on**: the original `corpus.ts` `check()` for this scenario required `kind === 'scoped_observation'` exclusively. The semantic-scoring data shows correct preservation legitimately occurs via `project_fact` framing too, not just `scoped_observation` — the rigid kind-lock would have false-failed some semantically-correct outputs. Not modified — flagged for review, per "do not modify the fixture until after showing whether alternative outputs are semantically valid," which this diagnostic now does.

Full reports: `eval-reports/DIAGNOSTIC-UNCERTAINTY-NO-VISIBILITY-2026-08-07T06-40-21-160Z.md` (run 1, scoring-bug-affected) and `...T07-29-11-765Z.md` (run 2, authoritative). **No further prompt changes made. Not proceeding to Phase 6b** pending review.

**Rule 5 status:** still not implemented — bundled-answer splitting itself (multiple `CandidateObservation`s from one turn) is structurally supported by `runExtractionPipeline`'s per-candidate loop (proven in substage 1's "multiple candidates in one turn" test), but the Rule 5 *cap* ("one disentangling question... never resolved by guessing") is a boundary-type behavior, not an extraction behavior — remains tracked for Phase 6b, not implemented here.

---

## Phase 6b — Candidate-question generation + boundary enforcement

**Objective:** wire a real model to generate candidate questions from current structured understanding — now sourced from Phase 6a's extraction, not fixture-scripted history — and validate Phase 4's boundary machinery against it, deliberately without yet trusting Constraint A's harder judgment.

**Dependencies:** Phases 1–6a.
**Files/modules:** `candidate-question.ts` (generation only), integration with `boundaries.ts`.
**Deliverables:** candidate-question generator; boundary enforcement proven across two distinct, separately-run test tracks.

**Test strategy — two tracks, both required:**
1. **Controlled/mocked understanding states** — reproducible, deterministic inputs, for regression-safety and fast iteration.
2. **Real understanding produced by Phase 6a's extraction** — validates actual integration between extraction and candidate generation, not just the isolated boundary logic against fixtures.

Within **both** tracks: real model-generated candidates, **and** deliberately injected adversarial candidates explicitly constructed to violate every depth cap (one-follow-up-per-signal, one-uncertainty-clarification, historical-experience-question cap) and every termination scope (question-level, phase-level, interview-level). This is necessary to distinguish generator restraint — the model simply never happening to misbehave — from actual boundary enforcement, which only adversarial injection can prove is doing anything at all.

**Completion criteria:** boundary enforcement holds across all four combinations (mocked × real-candidate, mocked × adversarial, real-understanding × real-candidate, real-understanding × adversarial); scope-of-suppression is correct in every case.
**Explicitly deferred:** Constraint A entirely — every generated candidate is checked against Constraint B only, regardless of whether it would have been a good question to ask (that's Phase 6c).
**Main risks:** first point of real model unpredictability for candidate generation itself. Boundary-enforcement risk specifically is now well-isolated by the adversarial track, so a failure here is attributable to generation, not enforcement.

---

## Phase 6c — Decision (Constraint A)

**Objective:** add the harder, unproven mechanism — estimating whether a candidate question's plausible answer would materially improve structured understanding — on top of the now-proven Phase 6b foundation.

**Dependencies:** Phase 6b.
**Files/modules:** `decision.ts`.
**Deliverables:** Constraint A evaluator (architecture doc §7's `[PROTOTYPE ASSUMPTION]` — diff against plausible-answer-space, not a numerical score).

**Test strategy:** both mechanisms kept explicit and never conflated (architecture doc §7's own correction): pre-question estimation (prospective, this is the actual selection mechanism) vs. post-answer diff (retrospective, logged as an evaluation/calibration signal, never used to justify the original ask/suppress decision).
**Completion criteria:** every asked question carries the reason it was proposed; every suppressed question carries the reason it was blocked; the system never asks a question because a Knowledge Card exists (architecture doc §11 — Retrieval remains a downstream consumer, never a justification).
**Explicitly deferred:** Retrieval connection of any kind — the handoff object was already assembled and unit-tested in Phase 5; Phase 7 re-checks its shape in an integrated context, but nothing here or there feeds a real Retrieval system.
**Main risks:** the highest-risk phase in the whole roadmap, alongside Phase 6a. This is where the central architectural bet either holds or doesn't.

---

## Phase 7 — Eight-dialogue evaluation suite

**Objective:** run the six normative PRD dialogues plus two implementation fixtures (ambiguous multi-surface tool — "I used Nano Banana," must disambiguate Consumer App vs. API naturally; full Phase 1→4 end-to-end trace) through the complete, now fully-assembled pipeline.

**Dependencies:** Phases 1–6c.
**Files/modules:** none new — integration test suite over everything above.
**Deliverables:** per-dialogue actual-vs-expected comparison (phase path, questions asked/suppressed, mutations, scoped observations, confidence state, Gate 1/2 results, termination reason, handoff object).

**Test strategy:** every deviation documented and categorized, not silently patched:
- domain-model failure
- mutation failure
- gate failure
- boundary failure
- handoff-assembly failure
- **extraction failure** (wrong facts pulled from correct text)
- **decision failure** (correct facts, wrong ask/suppress choice) — split from a single "model-behavior failure" bucket, since these have different fixes (prompt tuning vs. Constraint A logic/threshold)
- test-fixture ambiguity (the expected value itself was wrong, not the implementation)

**Completion criteria:** all 8 dialogues run to completion; every deviation is categorized under one of the buckets above; no architecture change is made merely to force a test to pass without understanding which bucket the failure belongs to.
**Explicitly deferred:** everything on the global defer list below.
**Main risks:** inherits Phase 6a/6c's risk directly — this is where it becomes visible and diagnosable, not where it's introduced.

---

## Phase 8 — Prototype Alpha review

**Objective:** produce a concise verdict, not another document-length retrospective.

**Deliverables — a short review covering:**
- what worked as designed
- what failed, by category (Phase 7's taxonomy)
- which prototype assumptions were disproven (Phase 6c's Constraint A mechanism is the most likely candidate)
- which failures need prompt iteration vs. code changes vs. reveal a real architectural issue
- whether the Interview Engine is ready to connect to deterministic Retrieval

**Completion criteria:** an explicit go/no-go read, not an open-ended list of concerns.

---

## Explicitly deferred from Prototype Alpha

Unless required to test the Interview Engine itself: production UI; authentication; database persistence; CRM integration; analytics dashboards; semantic/vector retrieval; Projection Layer; final Knowledge Card rendering; production prompt tuning; public deployment; automatic Matrix updates; commercial-readiness assessment logic. In-memory/local fixture data throughout.

---

## Definition of done

All 8 dialogues run end-to-end with every deviation documented and categorized, not silently patched. Zero Retrieval/Projection/rendering code exists. Phase 8 delivers an explicit go/no-go verdict on connecting Retrieval next, naming specifically which prototype assumptions held and which broke.
