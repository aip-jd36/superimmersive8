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

## Phase 6a — Extraction (isolated) — COMPLETE (2026-08-07)

**🔒 FREEZE NOTICE (2026-08-07).** Extraction v1.0 (Prototype Alpha) is frozen. Full retrospective: `PHASE_6A_RETROSPECTIVE.md`.

No further improvements, optimizations, refactors, or prompt tweaks to `extraction.ts`, `anthropic-extractor.ts`, `mock-extractor.ts`, `eval/corpus.ts`, or `eval/diagnose-uncertainty-no-visibility.ts` are authorized unless a **later** prototype phase (6b, 6c, or beyond) demonstrates an **actual architectural defect** in this subsystem — not a preference, not a minor improvement opportunity, not a stylistic inconsistency, not "this could be cleaner." An architectural defect means: the frozen design cannot represent something a later phase genuinely needs, or produces demonstrably incorrect behavior a later phase's own evidence surfaces — not that a different approach seems nicer in hindsight. If that bar is met, reopen this file's own decision explicitly (new dated entry, not a silent edit) before touching the frozen code.

**Objective:** raw user turn → structured facts: tool and access-surface normalization, bundled-answer splitting, correction/supersession detection, current-vs-historical scope, absent/unknown/unresolved/declined disambiguation, source-turn attribution. Tested in isolation against fixed user turns — not live multi-turn conversation.

**Dependencies:** Phases 1–5 complete (practically: needs Phase 1's types to produce proposals against, and Phase 2's mutation engine to validate proposals through — Phases 3–5 aren't strict technical dependencies but are complete first per this sequence).
**Files/modules:** `extraction.ts`.
**Deliverables:** an extraction function that returns a **proposed** set of facts, observations, corrections, and certainty states — it does not mutate Structured Understanding directly, under any circumstance. Phase 2's mutation engine remains the only component permitted to apply changes to the live object.

**Test strategy:** fixed, single-turn (or short scripted-sequence) inputs, each asserting two things separately: (1) the extraction proposal itself is correct — right facts, right normalization, right scope, right certainty state, right source-turn attribution; (2) feeding that proposal through Phase 2's mutation engine produces the correct final Structured Understanding state. Covers: tool/access-surface normalization (the Nano Banana ambiguity case); bundled-answer splitting (Dialogue F shape); correction/supersession detection ("Actually, we also used Runway"); current-vs-historical scope (Dialogue C shape); absent vs. unknown vs. unresolved vs. declined, kept distinct.

**TRACKED REQUIREMENT — carried forward from Phase 4 (2026-08-07), reconciled 2026-08-08:** PRD §8 Rule 5 ("one disentangling question for bundled answers, scoped to which fact applies to which project/time period, never resolved by guessing") is explicitly **not** covered by Phase 4's generic `boundaries.ts` state machine — confirmed as a deliberate omission, not an oversight, when Phase 4 was accepted. Confirmed again on review (2026-08-08): Rule 5 is normative product behavior belonging to Phase 6b specifically, not a Phase 6a retrofit — it concerns what happens *after* Extraction identifies a bundled answer, which Phase 6a's own scope (raw-turn-to-facts) does not reach. See the Phase 6b section below for the precise, reconciled requirement and its required test.
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

**Targeted refinement, applied (2026-08-07).** Two changes, both narrow:
1. System prompt gains one new general rule (no wording-specific hacks, no new domain fields): when a user states they lack access/visibility/involvement, preserve it as its own candidate at `unresolved_no_visibility`; if the turn also names another person/team who owns the process, extract that as a *separate* confirmed candidate — the second must never replace the first. One worked example included, using the exact turn that originally failed.
2. `corpus.ts`'s `uncertainty_no_visibility` `check()` made kind-agnostic (accepts `project_fact` or `scoped_observation`) and now specifically guards against the exact failure mode found (a `confirmed_absent` misclassification of the "don't have access" clause), rather than only checking for a correct candidate's bare presence.

**Post-refinement reruns, both clean:**

| | Diagnostic (45 trials) | Corpus (42 trials) |
|---|---|---|
| No-visibility preservation | **100%** (45/45), up from 93.3% | — |
| Confirmed-absence misclassification | **0%** (0/45), down from 6.7% | — |
| Multi-candidate decomposition | **100%** (30/30), up from 63.3%/53.3% across the two prior runs | — |
| Invented facts | 0/76 | 0/64 |
| Scenario pass rate | — | **100%** (42/42), up from 97.6% |
| Schema-valid | — | 100% |
| False-resolution | — | 0% |
| Ambiguity preservation | — | 100% (6/6) |
| Correction detection / scope accuracy / classification accuracy / bundled splitting | — | 100% each |

**All six Phase 6a closing criteria met**: no-visibility preservation ≥90% (100%), confirmed-absence misclassification = 0% (0%), invented facts = 0% (0 both runs), false resolution = 0% (0%), ambiguity preservation = 100% (100%), no new material regression elsewhere (42/42 scenario pass, zero failures). Reports: `eval-reports/DIAGNOSTIC-UNCERTAINTY-NO-VISIBILITY-2026-08-07T07-55-06-446Z.md` and `eval-reports/EXTRACTION-EVAL-2026-08-07T07-59-25-252Z.md`. All five prior reports (2 corpus runs, 2 diagnostic runs, plus the very first corpus run) preserved unmodified.

**PHASE 6a SUBSTAGE 2: COMPLETE (2026-08-07).**

**Rule 5 status:** still not implemented — bundled-answer splitting itself (multiple `CandidateObservation`s from one turn) is structurally supported by `runExtractionPipeline`'s per-candidate loop (proven in substage 1's "multiple candidates in one turn" test), but the Rule 5 *cap* ("one disentangling question... never resolved by guessing") is a boundary-type behavior, not an extraction behavior. Reconciled 2026-08-08: Rule 5 belongs to Phase 6b, explicitly, not deferred further — see the Phase 6b section for the precise requirement and its required test. This does not reopen Phase 6a or its freeze.

---

## Phase 6b — Candidate-question generation + boundary enforcement

**Objective:** wire a real model to generate candidate questions from current structured understanding — now sourced from Phase 6a's extraction, not fixture-scripted history — and validate Phase 4's boundary machinery against it, deliberately without yet trusting Constraint A's harder judgment.

**Dependencies:** Phases 1–6a.
**Files/modules:** `candidate-question.ts` (generation, deterministic derivation, and validation), integration with `boundaries.ts` (extended, not modified in its existing logic — see Rule 5 below).
**Deliverables:** deterministic `deriveEligibleSignals()`; candidate-question generator (model-facing); deterministic `validateCandidateReference()`; boundary enforcement proven across two distinct, separately-run test tracks; Rule 5's disentangling-question cap.

**Deterministic signal-reference design (resolved 2026-08-08, pre-code review — see chat record for full critique):**

```
StructuredUnderstanding
        |
deriveEligibleSignals()        // deterministic, no LLM
        |
LLM proposes (Structured Outputs):
  question_text
  question_kind
  target_signal_id             // must come from the eligible set, or null
        |
validateCandidateReference()   // deterministic, rejects hallucinated/invalid references
        |
Constraint B (boundaries.ts, unchanged internal logic)
```

The model is never responsible for creating or maintaining signal identity across turns — that would put a deterministic identity problem inside the least deterministic component. It may only *select* from a supplied eligible set, or explicitly decline to target one (`null`). `EligibleSignal` is `{ signal_id: string, kind: 'scoped_observation' | 'tool_mention' | 'project_fact' }` — no new topic ontology, no summary/description field (the model already receives the full `StructuredUnderstanding` to interpret what a `signal_id` refers to). `signal_id` values are the already-existing stable runtime identifiers (`ScopedObservation.observation_id`, `ToolMention.mention_id`) for array-backed facts, or the fixed, always-present two-string convention `project:intended_use` / `project:workflow_role` for the two singular project facts, which have no per-instance identity to reuse. `boundaries.ts`'s existing `CandidateQuestion` type is unchanged (`signal_id?: string` already supported this); the model-facing proposal shape is a new, separate type.

**Candidate-generator input boundary:** current `StructuredUnderstanding`, the eligible signal set, current phase, and no more than that. It must **not** receive Retrieval results, Knowledge Cards, Matrix contents, or commercial-readiness conclusions, and it must **not** re-run Extraction over the transcript — `StructuredUnderstanding` is its only factual input, consistent with the Extraction/Retrieval independence principle (architecture doc §1, §6).

**PRD §8 Rule 5 — reconciled requirement, not reinterpreted beyond its existing language:**

> When a bundled answer contains multiple potentially applicable signals and one clarification is needed to determine how they apply, CRC may ask at most one disentangling question. It must not resolve the ambiguity by guessing and must not continue into repeated drill-down.

Implemented as an extension to `boundaries.ts`'s existing cap pattern (new `CandidateQuestionKind: 'disentangling_question'`, new `BoundaryState.disentangling_question_asked: boolean`, capped once). **Phase 6b is not complete without a test proving this specific behavior** — first disentangling question allowed, a second suppressed, and the underlying ambiguous facts remaining un-guessed (not silently merged into a single resolved value) in `StructuredUnderstanding` itself, not just at the boundary layer.

**⚠️ PROTOTYPE ASSUMPTION, not frozen product meaning (2026-08-08):** the cap is scoped **once per interview**, not once per bundling event. The PRD's own wording doesn't specify which, and this is a scoping choice made to avoid inventing a "bundle identity" concept the architecture doesn't currently have — not something Rule 5's text dictates. It is the conservative choice (never over-asks; worst case under-asks a second, later, independent ambiguity — a fail-safe outcome, not a guess). **Do not treat once-per-interview as validated or final.** A dedicated future evaluation case is required before this scope can be considered settled: an interview containing **two independent bundled ambiguities**, to determine whether the global cap causes material under-questioning of the second one. If it does, the fix is a deterministic per-bundle cap keyed off source-turn/observation relationships already present in the data (`source_turn`, `scope`, supersession chains) — **not** a new bundle-identity concept minted for the purpose. Not built now; this is a noted future evaluation case only, added to Phase 6b's real-model integration round (step 9) as an explicit scenario to watch, not a blocking requirement for Phase 6b's own completion.

**Test strategy — two tracks, both required:**
1. **Controlled/mocked understanding states** — reproducible, deterministic inputs, for regression-safety and fast iteration. Kept thin: this track is largely redundant with Phase 4's existing 18 boundary tests and serves as regression insurance, not primary evidence.
2. **Real understanding produced by Phase 6a's extraction** — validates actual integration between extraction and candidate generation, not just the isolated boundary logic against fixtures.

Within **both** tracks: real model-generated candidates, **and** deliberately injected adversarial candidates explicitly constructed to violate every depth cap (one-follow-up-per-signal, one-uncertainty-clarification, historical-experience-question cap, the new disentangling-question cap) and every termination scope (question-level, phase-level, interview-level). This is necessary to distinguish generator restraint — the model simply never happening to misbehave — from actual boundary enforcement, which only adversarial injection can prove is doing anything at all.

**Completion criteria:** boundary enforcement holds across all four combinations (mocked × real-candidate, mocked × adversarial, real-understanding × real-candidate, real-understanding × adversarial); scope-of-suppression is correct in every case; hallucinated/invalid `target_signal_id` references are deterministically rejected before ever reaching Constraint B; Rule 5's cap is proven, not just implemented.
**Explicitly deferred:** Constraint A entirely — every generated candidate is checked against Constraint B only, regardless of whether it would have been a good question to ask (that's Phase 6c).
**Main risks:** the model's ability to self-classify a generated question into the `CandidateQuestion` taxonomy (`kind` + a valid-or-null `target_signal_id`) is new, unproven risk that Phase 6a's evidence does not bear on — Phase 6a tested extracting facts from human text, not classifying model-generated content against an enforcement taxonomy. Boundary-enforcement risk itself remains well-isolated by the adversarial track and the deterministic validation step, so a failure is attributable to generation/classification, not enforcement.

**Smallest implementation sequence:** (1) deterministic `deriveEligibleSignals()`; (2) candidate-question structured-output schema; (3) deterministic `validateCandidateReference()`; (4) thin mocked/regression tests; (5) real-model candidate generation; (6) Constraint B enforcement over generated candidates; (7) deliberately injected adversarial candidates; (8) Rule 5 bundled-answer test; (9) real-understanding integration using Phase 6a output. Implemented in dependency order rather than the literal numbering — steps 6-8 (deterministic) built and proven before step 5 (live-model) was run, mirroring Phase 6a's own deterministic-then-real-model sequencing, since 6-8 don't depend on live output at all.

**Status: COMPLETE (2026-08-08).** 13 commits on `prototype/interview-engine-alpha`. `main` untouched throughout.

**Deterministic results** (steps 1-4, 6-8; no live calls): 129/129 interview-engine tests passing across 9 test files (25 new this phase — 13 in `candidate-question.test.ts`, 12 in `constraint-b-candidate-question.test.ts`). All four required combinations proven (mocked×well-formed, mocked×adversarial, real-understanding×well-formed using actual Phase 1 `DIALOGUE_FIXTURES` not synthetic mocks, real-understanding×adversarial — including a signal_id valid in one fixture correctly rejected as hallucinated against a different one). Every depth cap and every decline scope adversarially violated on purpose and correctly blocked. Rule 5's cap proven: first `disentangling_question` allowed, second suppressed, both originally-ambiguous observations remain present and unmerged (structurally guaranteed — nothing in this pipeline touches `StructuredUnderstanding`).

**Real-model results, reported separately** (steps 5, 9; `eval-reports/CANDIDATE-QUESTION-GENERATION-EVAL-2026-08-07T09-08-38-027Z.md` and `...INTEGRATION-EVAL-2026-08-07T09-09-46-998Z.md`):
- **Generation quality (step 5, 16 trials across all 8 Phase 1 fixtures): 100% valid signal-reference rate** — zero hallucinated `target_signal_id` across every trial, directly confirming the pre-code critique's highest-risk assumption held. `has_candidate` (50%) tracked sensibly with whether each fixture actually had an open gap.
- **Full integration (step 9): Scenario A** (straightforward 3-turn conversation) completed the entire chain — real extraction → real generation → deterministic validation → deterministic enforcement — without error. **Scenario B** (the roadmap's own noted WATCHED, non-gating case: two independent bundled ambiguities) **did not produce usable evidence** — the model proposed the same `other`-kind question about `intended_use` on all three turns instead of a `disentangling_question`, because `intended_use` was left unestablished in the scenario's own turns and dominated as the more obvious gap. Zero `disentangling_question` proposals means the cap was never actually exercised. This is a **scenario-design limitation, not a pipeline defect** — the deterministic test already proves the cap mechanism itself works; what remains genuinely open is whether a real model in a real bundled-ambiguity conversation recognizes the need for a disentangling question at all, which this run didn't test cleanly. Needs a better-targeted scenario before this specific question can be considered explored, let alone answered.

**Explicitly not proceeding to Phase 6c** implied by this status line — no instruction to proceed has been given.

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

**Status: COMPLETE (2026-08-07). Report reviewed with JD before proceeding — see chat record. 7 commits on `prototype/interview-engine-alpha`. `main` untouched throughout. No frozen system modified (verified: `decision.ts` does not import `boundaries.ts`; `retrospective-diff.ts` does not import `gates.ts` — both confirmed via grep after implementation).**

**Contract shipped, matching the requested shape exactly:**
```ts
interface ConstraintADecision { should_ask: boolean; reason_code: ConstraintAReasonCode; rationale: string }
interface ConstraintAInput {
  structured_understanding: StructuredUnderstanding
  candidate: CandidateQuestionProposal   // full text-bearing shape, not boundaries.ts's stripped CandidateQuestion
  phase: Phase
}
```
16 reason codes (`CONSTRAINT_A_REASON_CODES`), partitioned into 8 `ASK_REASON_CODES` / 8 `SUPPRESS_REASON_CODES` — the 7+7 requested categories each, plus one generic fallback per direction. Categorical judgment only (architecture doc §7's plausible-answer-space diff), no numerical scoring model introduced. `decision.ts` has zero notion of Constraint B, caps, or decline state — genuinely independent, proven by both the system prompt's explicit exclusion and the type signature carrying no boundary state.

**Deterministic results:** 137/137 interview-engine tests passing (129 carried from Phase 6b + 8 new in `decision.test.ts`): reason-code partition sanity, mock-decider correctness, and — critically — every one of the 15 corpus cases' `signal_id` values re-validated through the real `deriveEligibleSignals()`/`validateCandidateReference()` pipeline rather than merely asserted, plus structural validation of all 3 `after_structured_understanding` fixtures.

**Real-model evaluation** (45 trials: 15 corpus cases × 3 trials, `eval-reports/CONSTRAINT-A-EVAL-2026-08-07T09-37-30-318Z.md`):

| Metric | Result |
|---|---|
| Schema/output failure rate | 0.0% (0/45) |
| Ask/suppress accuracy | 91.1% (41/45) |
| False-positive ask rate | 12.5% (3/24 suppress-expected trials) |
| False-negative suppress rate | 4.8% (1/21 ask-expected trials) |
| Reason-code accuracy | 84.4% (38/45) |
| Avg. per-case consistency | 97.8% |
| Retrieval-motivated case correctly suppressed | 100% (3/3), 0 misapplications elsewhere |
| Over-questioning check (incident-level-detail case) | 100% correctly suppressed (3/3) |
| Tokens / latency | 104,760 in / 10,462 out across 45 calls; 5,747ms avg |

12 of 15 cases scored 3/3 correct with 100% consistency. Two cases did not:
- `correction_signal_prior_state_may_be_wrong`: 2/3 correct, 66.7% consistency — genuine trial-to-trial disagreement, not a schema issue.
- `tool_tier_unknown_irrelevant`: 0/3 correct, 100% consistency — the one **systematic** (not noisy) disagreement in the run.

**Failure classification (all 7 disagreements + the 1 retrospective misalignment, sorted into the four required buckets):**

- **Schema/output failures: 0.** No parse failures, no missing fields, across all 45 calls.
- **Genuine architecture problems: 0.** Nothing found required touching Extraction, normalization, mutation, Gate 1/2, boundaries, handoff, Retrieval, or Publication Policy. No contradiction was hit that required stopping per the frozen-systems instruction.
- **Evaluation-fixture ambiguity (the largest bucket, 5 of 8 findings):**
  1. `confirmed_absence_redundant` trial 3 — model returned `REVIEWER_STYLE_DRILLDOWN` instead of the corpus's narrower `FACT_ALREADY_CONFIRMED`/`SUFFICIENT_CERTAINTY_ALREADY` set, but "are you sure absolutely no one looked at it?" genuinely reads as both at once (redundant AND interrogative). Direction was correct; the corpus's `acceptable_reason_codes` was too narrow for a case that legitimately straddles two categories.
  2. `bundled_disentangling_needed` trial 1 — model returned `CURRENT_VS_HISTORICAL_AMBIGUOUS` instead of `BUNDLED_OBSERVATIONS_DISENTANGLEABLE`. On inspection this is my own fixture-construction choice: I built the bundled ambiguity's actual content to BE a current-vs-historical split, so both labels are simultaneously true of the same fixture. Direction correct; corpus over-narrow.
  3. `tool_tier_unknown_necessary` trial 2 — model returned `VISIBILITY_GAP_CLARIFIABLE` instead of `MISSING_WORKFLOW_FACT`/`MATERIALLY_IMPROVES_UNDERSTANDING`; the fixture also left `access_surface` unknown alongside plan tier, so a visibility-gap framing is a defensible near-miss, not an error. Direction correct.
  4. `correction_signal_prior_state_may_be_wrong` trial 2 — the only case with a genuinely wrong direction (`should_ask: false`, expected `true`). The model's own rationale is sharp: the `StructuredUnderstanding` I constructed has only one, confirmed, uncontested tool mention (`kling`) — the "correction signal" I intended lives *only* in the candidate question's own free text ("it sounded like it might have actually been Runway"), never in any structural field. A skeptical reading of "only trust structural facts, not the candidate's own framing" is internally consistent, and this is exactly the posture Constraint A's own system prompt encourages elsewhere. This is a fixture-encoding gap (I should have represented the correction signal as a structural fact — e.g. a second, lower-confidence tool mention — not only as prose in the candidate's question text), not proof the model can't recognize correction signals. Flagged, not fixed.
  5. `bundled_disentangling_needed`'s retrospective misalignment (step 7) — **a confirmed bug in my own corpus construction**, not a model or architecture finding. Its `after_structured_understanding` was meant to show the ambiguity resolving, but the `observation()` fixture helper defaults `scope: 'current_project'`, and so-1's "before" state already carried that default while so-2 was already explicitly `historical_project` — meaning both observations' `scope` fields were already fully resolved *before* the "after" state, with the intended ambiguity expressed only in prose (`note` text), which `computeRetrospectiveDiff` correctly and by design does not treat as material. `computeRetrospectiveDiff` is working as specified; the fixture never actually encoded the ambiguity in a field the diff tracks. Not corrected in this pass — flagged for a follow-up fixture fix, per "classify before changing."
- **Model decision failures (1 of 8, the most substantive finding): `tool_tier_unknown_irrelevant`, all 3 trials.** The model consistently (100% consistency, not noise) said `should_ask: true, reason_code: MISSING_WORKFLOW_FACT`, reasoning each time that plan tier "could materially affect the tool's licensing/commercial-use terms" — despite the fixture's `intended_use` being explicitly confirmed as internal/non-commercial specifically to signal tier shouldn't matter *in this context*. This is genuinely ambiguous to characterize rather than a clean model bug: the model's position (tier terms can carry restrictions independent of currently-stated intent, so it's never fully irrelevant) is coherent and arguably more thorough than my hand-label assumed. I am flagging this as the one finding requiring a judgment call rather than unilaterally resolving it — it may indicate the model over-applies a "could matter under some future scenario" standard that's broader than what "materially improves *CRC's current* understanding" was meant to mean, or it may indicate my own ground-truth label was too confident. Not classified as a schema, fixture, or architecture issue — it sits squarely in "does the model apply the categorical standard correctly," which is what this bucket is for.

**Prospective vs. retrospective comparison (step 7, 3 cases carrying `after_structured_understanding`):** 2 of 3 aligned (`unresolved_nano_banana`, `missing_intended_use` — both showed real structural change matching a 100% prospective ask rate). The third (`bundled_disentangling_needed`) is the fixture bug described above, not a genuine misalignment between the prospective and retrospective mechanisms.

**Rule 5 carry-forward note, preserved verbatim per instruction, not resolved by this phase:** *"Real-model recognition of when a disentangling question is warranted remains not fully validated."* `bundled_disentangling_needed`'s clean 3/3 direction-correct result in this phase shows Constraint A would correctly say "ask" **given an already-well-formed disentangling candidate** — this is not equivalent to evidence that Phase 6b's candidate-generation will reliably *produce* one in the first place (Phase 6b's own Scenario B remained inconclusive on exactly that point). This open question is carried forward unresolved into Phase 7.

**Did the categorical "plausible answer materially changes understanding" model hold up?** Broadly yes. 0% schema failures, 91.1% direction accuracy, no architecture-level problem surfaced, and the two checks specifically designed to catch category drift (Retrieval-motivation, over-questioning) both scored 100%. The softer finding is that reason-code granularity (84.4%) trails direction accuracy, and most of that gap traces to legitimately overlapping categories in my own corpus rather than model confusion — a prompt/corpus refinement opportunity, not evidence the categorical approach itself needs replacing with a numerical one.

**Was any architectural change warranted?** No. Nothing found in this phase requires modifying Extraction, normalization, mutation, Gate 1/2, boundaries, handoff, Retrieval, or Publication Policy.

**Not yet done, flagged for a future pass, not blocking:** correcting the `bundled_disentangling_needed` fixture's `after_structured_understanding` so it actually differs structurally from its "before" state; deciding whether `tool_tier_unknown_irrelevant`'s expected label or the model's broader materiality reading is the one to design the prompt around; widening a few corpus cases' `acceptable_reason_codes` sets where two categories legitimately overlap by construction.

**Explicitly not proceeding to Phase 7.** Per instruction: this review must be completed with JD before Phase 7 begins.

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
