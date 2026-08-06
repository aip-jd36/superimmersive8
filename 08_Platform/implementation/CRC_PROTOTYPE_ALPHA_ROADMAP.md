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

---

## Phase 6a — Extraction (isolated)

**Objective:** raw user turn → structured facts: tool and access-surface normalization, bundled-answer splitting, correction/supersession detection, current-vs-historical scope, absent/unknown/unresolved/declined disambiguation, source-turn attribution. Tested in isolation against fixed user turns — not live multi-turn conversation.

**Dependencies:** Phases 1–5 complete (practically: needs Phase 1's types to produce proposals against, and Phase 2's mutation engine to validate proposals through — Phases 3–5 aren't strict technical dependencies but are complete first per this sequence).
**Files/modules:** `extraction.ts`.
**Deliverables:** an extraction function that returns a **proposed** set of facts, observations, corrections, and certainty states — it does not mutate Structured Understanding directly, under any circumstance. Phase 2's mutation engine remains the only component permitted to apply changes to the live object.

**Test strategy:** fixed, single-turn (or short scripted-sequence) inputs, each asserting two things separately: (1) the extraction proposal itself is correct — right facts, right normalization, right scope, right certainty state, right source-turn attribution; (2) feeding that proposal through Phase 2's mutation engine produces the correct final Structured Understanding state. Covers: tool/access-surface normalization (the Nano Banana ambiguity case); bundled-answer splitting (Dialogue F shape); correction/supersession detection ("Actually, we also used Runway"); current-vs-historical scope (Dialogue C shape); absent vs. unknown vs. unresolved vs. declined, kept distinct.
**Completion criteria:** extraction proposals are correct for all fixed test turns; extraction never writes to Structured Understanding directly (verified, not assumed); routing a correct proposal through Phase 2 produces the correct mutated state.
**Explicitly deferred:** live multi-turn conversation (Phase 6b/6c/7 territory); resolving whether an extracted fact was *correctly interpreted* versus merely *present* — that's the confidence-vs-completeness open question from Phase 3/architecture doc §10, not closed here.
**Main risks:** first LLM contact point in the roadmap. Highest uncertainty alongside Phase 6c.

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
