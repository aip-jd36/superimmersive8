# Phase 7 Planning — Eight-Dialogue Evaluation

**Status: PLANNING ONLY. No implementation code exists yet. This document is the design-review artifact requested before Phase 7 begins.** Grounded directly in the current codebase (fixtures.ts, gates.ts, boundaries.ts, candidate-question.ts, decision.ts, handoff.ts, extraction.ts, mutations.ts, run-real-model-integration-eval.ts) — every function/type name below is verified to exist as named, not invented.

Central question, restated: **can the assembled Interview Engine behave coherently over a complete conversation, not just pass component tests?**

---

## 0. Two grounding facts that shape everything below

**Fact 1 — no orchestrator exists yet.** Every phase through 6c built and tested one subsystem in isolation. The closest precedent to a multi-step chain is `run-real-model-integration-eval.ts` (Phase 6b step 9): extraction → `deriveEligibleSignals` → generation → `validateCandidateReference` → `evaluateBoundary`, for a 3-turn scenario. It has no Gate 1/2 evaluation, no Constraint A, no termination handling, no handoff assembly, and no multi-turn state threading beyond `StructuredUnderstanding` itself. Phase 7 is the first phase that needs a real per-turn driver loop. The roadmap's own Phase 7 entry already says `Files/modules: none new`, which I read as "no new *production* module" — the driver loop belongs in `eval/`, alongside the other harnesses, not in `lib/interview-engine/` proper.

**Fact 2 — two inputs to the pipeline have never been derived by any code, only supplied by hand in tests.**
- `phase: Phase` — every module that needs it (`anthropic-decision.ts`, `anthropic-candidate-question.ts`, `boundaries.ts`'s `CandidateQuestion.phase`) takes it as an external input. Nothing computes it. The architecture doc (§ "Entry/exit") gives qualitative guidance ("Phase 1→2 on any workflow-relevant fact volunteered...") but explicitly frames phases as "logical state labels... not asked in sequence," not a simple counter — and never specifies an inference function. Grepped the entire `lib/interview-engine/` tree for any transition/derivation logic: none exists.
- Decline scope (`DeclineSignal` for `evaluateBoundary`) — nothing in `extraction.ts` detects a user's turn as a decline. `boundaries.test.ts` constructs `DeclineSignal` by hand; that's the only place it's ever produced.

Neither of these is a defect — `gates.ts`, `boundaries.ts`, `decision.ts` were all deliberately built as pure functions over externally-supplied state, and that was the right call at the time (isolation was the point). But it means **Phase 7 cannot just "run the existing pipeline end to end" — something has to decide, per turn, what phase it is and whether a decline occurred.** Building a real inference engine for either would be new architecture no prior phase scoped or evidence-tested. My recommendation (detailed in §1 and flagged again in §9): **both are script-supplied by the dialogue fixture, not inferred.** This is not a shortcut invented for convenience — it's consistent with how every existing module already treats these two fields, and fixtures.ts's own header comment already anticipates this exact gap: *"This is Phase 1 only... not the full dialogue-turn conversion (that's the Phase 6b/7 fixture work — `{ turns, expected }` objects driving the LLM-based pipeline)."* Phase 7 is where that promissory note comes due.

---

## 1. Proposed test-harness architecture

Two new files, both under `lib/interview-engine/eval/`, neither touching any frozen module:

**`run-dialogue.ts`** — the per-turn driver, `runDialogueTurn(state, script) => nextState`, called in a loop by the harness. Per turn:

```
1.  runExtractionPipeline(su, turn, extractor)              -> updated SU        [real: anthropic-extractor]
2.  evaluateGate1(updated SU)                                -> Gate1Result
3.  evaluateGate2(previous SU, updated SU, 'phase')          -> Gate2Result (phase-scoped)
    evaluateGate2(previous SU, updated SU, 'interview')      -> Gate2Result (interview-scoped)
    [both computed every turn -- cheap, pure, no extra API call; see §7 item 5]
4.  deriveEligibleSignals(updated SU)                        -> EligibleSignal[]
5.  generator({ updated SU, eligible signals, phase: script.phase })
                                                               -> CandidateQuestionProposal | null   [real: anthropic-candidate-question]
6.  if proposal: validateCandidateReference(proposal, eligible)
                                                               -> accepted | rejected
7.  if accepted: constraintADecider({ updated SU, candidate: proposal, phase: script.phase })
                                                               -> ConstraintADecision                 [real: anthropic-decision]
8.  if should_ask: evaluateBoundary(boundaryState, strippedCandidate, script.decline)
                                                               -> BoundaryResult
9.  assistant_action = derive from steps 6-8 (ASK / SUPPRESSED_BY_GENERATION_REJECTION /
                        SUPPRESSED_BY_CONSTRAINT_A / SUPPRESSED_BY_CONSTRAINT_B / NONE_PROPOSED)
10. if script is the dialogue's last turn (or boundary result is end_interview/end_current_phase
    covering all remaining phases): buildRetrievalHandoff(updated SU) -> RetrievalHandoff
```

Note step 8 runs `evaluateBoundary` even when there's a `script.decline` with no live candidate this turn — Constraint B's decline handling (`user_declined_question/phase/interview`) needs to fire independent of whether a candidate question happened to be pending, per `boundaries.ts`'s own persistent-state design (`interview_ended`, `phases_ended`). The driver calls `evaluateBoundary` once per turn regardless, with a null/`other`-kind placeholder candidate when nothing was proposed, purely to let a decline register into `BoundaryState` for future turns.

**`run-real-model-dialogue-eval.ts`** — the harness proper: loads all dialogue scripts, runs each N times (§3), captures every intermediate result, writes the legible actual-vs-expected trace (§ "Evaluation methodology" below) plus the aggregate scorecard (§6) to a timestamped report in `eval-reports/`, following the exact convention every prior harness already uses (fails hard without `ANTHROPIC_API_KEY`, never mocks silently, never overwrites a prior report).

A **third, cheap, zero-cost step is inserted before any live call**: run the same orchestrator with `mock-extractor.ts` + `mock-candidate-question.ts` + `mock-decision.ts` wired in, as a real Jest test. This proves the orchestrator's own wiring (state threading, gate scope handling, boundary-decline integration, handoff assembly timing) is correct independent of model variance — isolating "the harness is wired wrong" from "the model behaved unexpectedly" before any API budget is spent. This directly serves the architecture-change threshold's requirement to rule out "deterministic implementation" as an explanation before anything else.

---

## 2. Expected-result schema per dialogue

Two new types, design-only below (not yet in code):

```ts
interface DialogueTurnScript {
  turn: number
  user_text: string
  phase: Phase                 // script-supplied — see §0 Fact 2
  decline?: DeclineSignal       // script-supplied, only on turns meant to trigger one
}

interface DialogueExpectedTrace {
  dialogue_id: DialogueFixtureId | 'rule5_disentangling_probe'   // see §7 item 4 / §9
  turns: DialogueTurnScript[]
  expected: {
    phase_path: Phase[]
    assistant_questions_asked: { turn: number; question_kind: CandidateQuestionKind; target_signal_id: string | null }[]
    candidate_questions_generated: { turn: number; generated: boolean }[]
    suppressed_by_constraint_a: { turn: number; reason_code: ConstraintAReasonCode }[]
    suppressed_by_constraint_b: { turn: number; reason_code: BoundaryReasonCode }[]
    mutations_by_turn: { turn: number; description: string }[]        // human-legible, e.g. "so-1 added", "tm-1 superseded by tm-2"
    final_active_observations: string[]                                // observation_ids expected still active
    final_superseded_observations: { id: string; superseded_by: string }[]
    scope_assignments: { observation_id: string; scope: ObservationScope }[]
    gate_1_transitions: { turn: number; state: Gate1Result['state']; reason_code: Gate1ReasonCode }[]
    gate_2_transitions: { turn: number; phase_scope: Gate2Result; interview_scope: Gate2Result }[]
    termination: { turn: number; event: 'user_decline' | 'natural_completion' | 'gate_1_gate_2_met'; action_scope?: BoundaryActionScope }
    completion_reason: StructuredUnderstanding['completion_reason']
    final_handoff: RetrievalHandoff | null
    unresolved_ambiguity_preserved: string[]                          // e.g. "so-1/so-2 current-vs-historical distinction retained, not merged"
  }
}
```

Deliberately **no expected assistant wording anywhere in this schema** — matches your instruction directly. Everything is measured as structured state (kind, reason code, id, scope), never prose. Nothing here requires a new production type; `Gate1Result`, `Gate2Result`, `ConstraintAReasonCode`, `BoundaryReasonCode`, `ObservationScope`, `RetrievalHandoff` all already exist and are reused as-is.

---

## 3. Recommended runs per dialogue

Not uniform. Two things drive live-model variance: how many ask/suppress decision points a dialogue contains, and how much extraction ambiguity its turns carry. Dialogues that are mostly deterministic once the script is fixed don't need the same repeat budget as ones with real judgment calls.

| Dialogue | Decision-point density | Recommended runs | Why |
|---|---|---|---|
| `rich_signal` | Low (clean case, should suppress almost everything) | 2 | Base case — mainly checks the system doesn't over-ask when it shouldn't. False positives here are the most damaging kind of finding, but the case itself has little ambiguity to be unstable about. |
| `no_signal` | Medium | 3 | Tests natural-flow exhaustion (PRD §9 fallback) — genuine judgment about when to stop probing. |
| `current_vs_historical` | High | 3 | Direct test of scope-tagging discipline under live extraction variance. |
| `ambiguous_uncertain` | High | 3 | Direct test of the 5-state confidence taxonomy holding up live — the single highest-value dialogue for catching Extraction/Constraint-A drift. |
| `full_opt_out` | Low (once decline is scripted, the mechanics are boundary/gate pure functions) | 2 | Minimal live-model surface; the decline itself is script-supplied, not model-detected (§0). |
| `mixed_multi_signal` | Medium | 3 | Tests whether one bundled turn stays cleanly split across multiple observations under live extraction, not merged. |
| `ambiguous_multi_surface_tool` | High | 3 | The architecture doc's own previously-identified risk area (multi-surface disambiguation) — worth the same repeat budget as the highest-value PRD dialogues. |
| `full_phase_1_to_4_trace` | Low-medium (plumbing check, not judgment check) | 2 | Main risk is wiring/assembly correctness, not model variance. |
| `rule5_disentangling_probe` (if approved, §9) | Highest — this is specifically measuring *whether* a live behavior occurs at all | 5 | This is the one dialogue whose entire purpose is a frequency question ("does the generator recognize this at all"), not a direction-correctness question — needs more trials than the others to say anything about consistency. |

Total: ~23 dialogue-runs across ~3-5 turns each, roughly 2-3 live calls per turn (extraction, +generation/decision when a candidate exists) → **rough estimate 250-300 live API calls for the full battery**, noticeably larger than any single Phase 6 evaluation (Phase 6c's was 45). Flagging this cost explicitly per your "balance cost" ask — worth a go-ahead before I burn the budget, not just an FYI after.

Whatever the counts, every consistency number Phase 7 reports should be treated as directional (n=2-5 tells you "probably not wildly unstable," not a real confidence interval) — same caveat Phase 6a-c results carried, restated here so it isn't silently dropped now that dialogues are more complex to read.

---

## 4. Interview-level success criteria

Your ten questions, each given an explicit pass/fail definition rather than left as prose:

| # | Question | Pass condition |
|---|---|---|
| 1 | Did CRC understand the project correctly? | Final active `scoped_observations`/`tool_mentions`/`project_facts` match `final_active_observations` + `scope_assignments` in the expected trace, semantically (ids and structured values, not note text). |
| 2 | Did Structured Understanding evolve correctly over time? | Every turn's `mutations_by_turn` entry is observed at the correct turn, not just present somewhere by the end. |
| 3 | Did it ask the right questions? | Every `assistant_questions_asked` entry occurs, matching `question_kind` + `target_signal_id`; reason-code exactness is NOT required for a pass (§6, §7 item 2). |
| 4 | Did it suppress questions it should not ask? | Every `suppressed_by_constraint_a`/`suppressed_by_constraint_b` entry occurs with the correct **direction** (asked vs. suppressed); reason-code exactness not required for a pass. |
| 5 | Did Gate 1 become satisfied at the correct point? | `gate_1_transitions` turn-for-turn match. Attribution note: a mistimed Gate 1 is a pure function of `StructuredUnderstanding` content at that turn — a mismatch here should almost always be filed as an **extraction/mutation** failure, not a gate failure, since `evaluateGate1` itself has no live-model surface. |
| 6 | Did Gate 2 stop the interview at an appropriate point? | Same attribution logic, evaluated under **both** scopes (§0, §7 item 5); a scope-divergence that doesn't change the pass/fail verdict is logged, not treated as a failure. |
| 7 | Did user boundaries behave correctly? | Every scripted `decline` produces the correct `action_scope` (`suppress_current_question`/`end_current_phase`/`end_interview`) and persists correctly into subsequent turns (`phases_ended`, `interview_ended`). Zero tolerance — `boundaries.ts` is a consent mechanism, not a judgment call. |
| 8 | Did corrections and ambiguity propagate correctly? | Supersession chains match `final_superseded_observations`; `unresolved_ambiguity_preserved` entries remain genuinely unresolved (not silently merged/guessed) at end of run. |
| 9 | Did the final handoff accurately represent what CRC learned? | `buildRetrievalHandoff` output structurally matches `final_handoff` — this module is a pure projection, so a mismatch here is almost always inherited from an upstream SU mismatch, not a handoff-assembly bug; the taxonomy should reflect that (see §5). |
| 10 | Did the conversation stay in CRC's educational scope, not drift toward reviewer intake/assessment? | No `incident_investigation`-kind candidate is ever accepted (Constraint B already absolutely prohibits this — a violation here would be severe); no candidate's rationale (logged, inspected qualitatively) reads as demanding forensic detail beyond what the dialogue's own script calls for. This one is inherently more qualitative than the other nine and should be reported as an observation, not a strict pass/fail. |

**Composite framing:** each dialogue gets its own pass/fail per question above, rolled into a per-dialogue scorecard row — never a single number across all 8-9 dialogues (matches your explicit "do not collapse into one composite score").

---

## 5. Failure taxonomy

Adopting your eleven categories as authoritative for Phase 7, which is a genuine refinement of the roadmap's current (coarser) Phase 7 list — the roadmap will be updated to match once this plan is approved. Two splits from your list are directly grounded in existing code structure, not arbitrary: `extraction` vs. `normalization` mirrors `extraction.ts`'s own two distinct steps (`normalizeCandidate` vs. `attestCandidate`); `candidate-generation` vs. `Constraint A decision` mirrors two structurally separate modules (`candidate-question.ts` vs. `decision.ts`) with independently-measured accuracy in Phase 6b (100% valid signal-reference rate) vs. 6c (91-93% direction accuracy) — collapsing them would hide which one produced a given Phase 7 divergence.

1. **domain-model failure** — the type model itself cannot represent a state the dialogue needs.
2. **extraction failure** — wrong facts pulled from correct text.
3. **normalization failure** — right raw fact, wrong canonicalization (e.g. a valid tool name incorrectly rejected/altered).
4. **mutation failure** — correct extracted fact, wrong supersession/add/retract applied to SU.
5. **gate failure** — `evaluateGate1`/`evaluateGate2` themselves compute wrong output from correct SU input (rare, given both are pure functions already unit-tested — a real hit here would be notable).
6. **candidate-generation failure** — generator proposes a hallucinated/invalid reference, or fails to propose when a clear gap exists, or proposes when nothing is missing.
7. **Constraint A decision failure** — correct candidate, wrong should_ask/reason_code.
8. **Constraint B / boundary failure** — correct candidate + correct A decision, wrong permission outcome.
9. **handoff failure** — correct final SU, wrong `RetrievalHandoff` projection.
10. **fixture ambiguity** — the *expected* trace itself was under-specified or wrong (this bucket absorbed most of Phase 6c's disagreements — expect it to again).
11. **transient provider/schema failure** — malformed/parse-failed structured output, isolated, not reproduced.

**No twelfth category proposed at planning time**, per your instruction. If the phase/decline script-supply design (§0) itself produces a failure mode during implementation — e.g., a script's declared phase turns out inconsistent with what live extraction actually produces by that point — I'd file that under **fixture ambiguity** (the script's own assumption was wrong) or **domain-model failure** (if it reveals SU genuinely can't represent what's needed), not a new bucket. Both already cover it.

---

## 6. Mandatory vs. nice-to-have metrics

| Mandatory | Nice-to-have |
|---|---|
| Dialogues completed without runtime failure | Latency per turn |
| Final Structured Understanding correctness | API calls per conversation |
| Final handoff correctness | Token usage per conversation |
| Required questions asked (false-negative suppression) | Estimated API cost per conversation |
| Unnecessary questions asked (false-positive asking) | |
| Boundary violations (zero-tolerance) | |
| Gate 1 timing accuracy (attributed correctly, §4) | |
| Gate 2 timing accuracy, both scopes (attributed correctly, §4) | |
| Unresolved ambiguity preservation | |
| Correction propagation accuracy | |
| Overall dialogue behavioral pass rate (per-dialogue rows, not one number) | |

Reason-code exactness is deliberately **absent from the mandatory column** — logged and reported per your instruction, but never gates a pass/fail, consistent with the Phase 6c finding that direction is more stable than exact category selection.

---

## 7. How the five open Phase 6 findings are observed, not pre-fixed

1. **`tool_tier_unknown_irrelevant` pattern** — only observed if it arises *naturally* from one of the 8-9 dialogues' own scripted content (e.g. if `full_phase_1_to_4_trace` or another dialogue happens to leave a tool tier unknown against a confirmed-internal-use project). Not engineered into a new turn purely to re-trigger the already-known finding — that would just relabel existing evidence, not add any.
2. **Reason-code overlap** — every reason code is still logged in full per turn, but scoring explicitly weights ask/suppress direction over reason-code exactness (§4 item 3/4, §6), matching your instruction directly.
3. **Transient malformed structured output** — the driver retries exactly once on a schema/parse failure (so one bad turn doesn't kill an entire multi-turn dialogue run), but both the original failure and the retry outcome are logged explicitly as their own events, never silently swallowed — same "report the raw event" discipline as every prior phase's harness.
4. **Rule 5** — see §9 for the recommendation (a 9th, separately-labeled targeted probe, not folded into `mixed_multi_signal`). Also: if any dialogue's live run spontaneously proposes a `disentangling_question` where the script's own expected trace didn't call for one, that's logged as an observation, not scored as a failure — itself informative either way.
5. **Gate 2 phase-scope approximation** — both scopes computed and logged at every transition, for every dialogue, at zero extra API cost (pure function, called twice). Only escalated to "this needs redesign" if a dialogue's actual pass/fail verdict would flip depending on which scope is used — reported as an agreement-rate metric otherwise, exactly as instructed ("do not redesign unless... an actual behavioral failure").

---

## 8. The strongest reason Phase 7 could still expose a genuine architecture flaw

Not a generic "emergent behavior might surprise us" — a specific, concrete mechanism: **every prior phase tested each subsystem against a `StructuredUnderstanding` that was static for the duration of that test.** `BoundaryState`'s caps (`follow_ups_used`, `uncertainty_clarifications_used`) are keyed by `signal_id` and persist across turns by design. But nothing has ever tested what happens when a signal that already has a boundary cap recorded against it gets **superseded** mid-conversation (a tool mention resolved in turn 2, followed-up on in turn 3, then *corrected* in turn 5 into a new `tool_mention` with a new `mention_id`). Does the old cap silently become meaningless (the new id has a fresh, empty cap — arguably correct, since it's now a "new" signal) or does it let the system re-ask about something functionally the same fact under a technicality? Nothing in `boundaries.ts`, `candidate-question.ts`, or `mutations.ts`'s docstrings addresses this interaction directly, and no test (deterministic or real-model, through Phase 6c) has ever run a boundary cap and a supersession against the *same* signal in the *same* run. This is the one class of finding that is structurally impossible for a unit-level test to surface, because unit tests by construction hold everything but their own module's input fixed. If Phase 7 finds this behaves badly, it's a real candidate for the "fixing it locally would violate or distort another frozen principle" bar in your architecture-change threshold — worth watching for specifically, not just generically.

---

## 9. Fixture clarification needed before implementation starts

Two are scope decisions genuinely yours to make, not something I should decide unilaterally and then present as done:

1. **Script-supplied phase and decline (§0).** Confirm this is acceptable, or direct that Phase 7 instead build a minimal phase/decline inference layer first. My recommendation is script-supplied — it matches every existing module's own design, avoids inventing new untested inference logic, and is exactly what `fixtures.ts`'s own header comment already anticipated as Phase 7's job. But it's a real design choice, not a formality.
2. **Rule 5's 9th probe.** None of the current 8 dialogues, as fixture-defined, actually exercises a live disentangling-question decision — `mixed_multi_signal`'s bundled turn resolves cleanly via extraction alone (three distinct facts, not an unresolved ambiguity), which is a different thing from a genuine "can't tell these apart" case. I recommend one additional, clearly-labeled **targeted integration probe** (not a "dialogue" in the 8-fixture sense — no full end-state fixture needed, just a short scripted bundled-ambiguity exchange run through the live generator + Constraint A + Constraint B chain) specifically to close the Phase 6b open question. This is the one case where I think a 9th test **does** "genuinely improve evidence" per your own conditional, because it's the only way to observe the one specific thing Phase 6b's own Scenario B failed to produce usable evidence on. Flagging for your explicit go/no-go rather than adding it unilaterally.

Two more, lower-stakes, worth a quick confirm rather than a full question:

3. **Per-turn expected-SU granularity doesn't exist yet.** `fixtures.ts` only has end-state snapshots (proven in §0/§9 item 1's citation) — Phase 7 needs a full per-turn script + per-turn expected mutation for all 8 (9) dialogues, authored from scratch. This is the single largest authoring effort in the plan, not a wiring task, and worth naming explicitly as the bulk of Phase 7's real work.
4. I intend to author these expected traces **before** running any live model against them (never post-hoc adjusted to match an unexpected result), and would like to send you the 8-9 authored scripts+expectations for a quick sanity read before spending API budget on real-model runs — inserted as an explicit checkpoint in §10 below.

---

## 10. Smallest implementation sequence

1. Record your answers to §9 items 1-2 (script-supplied phase/decline; Rule 5 9th-probe go/no-go) — decision only, no code.
2. Author `DialogueTurnScript[]` + full `DialogueExpectedTrace` for all 8 dialogues (+ the 9th probe if approved) — the bulk of the real work, fixture data not logic.
3. **Checkpoint: send authored scripts+expectations for your sanity read before any live call.**
4. Build `run-dialogue.ts` (the per-turn orchestrator) — new eval-only file, no frozen module touched.
5. Build the trace/diff reporter (the legible per-turn actual-vs-expected format).
6. Deterministic dry run: full mock stack (`mock-extractor`/`mock-candidate-question`/`mock-decision`) through the real orchestrator, as a Jest test — proves the harness itself is wired correctly at zero API cost, before any live variance is introduced.
7. Real-model smoke pass: 1 run per dialogue — catches gross integration issues cheaply before the full repeat budget.
8. Real-model full battery: repeat counts per §3.
9. Aggregate scorecard + full per-dialogue trace report, written to `eval-reports/`, prior reports untouched.
10. Deliver findings classified per §5's eleven categories; no architecture change proposed without meeting all four bars in your restated threshold (reproducible; not explainable by extraction/prompting/fixture/variance/determinism; appears across >1 dialogue or is a direct impossibility; a local fix would violate another frozen principle).

---

## Where this plan could produce false confidence — direct answer to "challenge the plan"

Three real risks, not hedging:

1. **The six PRD dialogues are the spec the components were already built against.** Every prior phase's design was directly informed by exactly these six shapes. Passing them confirms internal consistency (implementation matches spec) — it is close to the least surprising possible outcome, not strong evidence of robustness to conversation shapes the PRD didn't anticipate. I'm not proposing to expand Phase 7's scope to cover this (that would violate the "no new dialogues merely for completeness" instruction and the explicit defer-list), but Phase 8's go/no-go framing should say this plainly rather than treating "8/8 passed" as sufficient on its own. A cheap, high-value complement for Phase 8 (not Phase 7): a short, genuinely unscripted conversation — you talking to the assembled pipeline with no pre-written script — as one input to the go/no-go call.
2. **I author both the script and the expected result, with no independent ground truth.** Any misunderstanding on my part of the architecture shows up as a fixture that's wrong in both the implementation *and* the expectation at once, which looks like a clean pass. This is exactly the failure mode that recurred as "evaluation-fixture ambiguity" throughout Phase 6a-c. The §9 item 4 checkpoint (sending you the authored expectations before spending API budget) is the direct mitigation — worth treating as a hard gate, not optional.
3. **Repeat counts (2-5 per dialogue) will produce consistency percentages that look more precise than they are.** n=3 tells you "probably not wildly unstable," not a real confidence interval. Every Phase 7 consistency figure should be reported with that caveat attached, the same way Phase 6a-c's were — easy to let slip once there are 9 dialogues' worth of numbers to report instead of 1 case's.

None of these are reasons not to run Phase 7 — they're reasons the "all 8 dialogues passed" outcome, if that's what happens, should be reported as "the implementation is internally consistent with its own specification across the anticipated shapes," not "the system is validated for real conversations."
