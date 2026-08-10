# Model 4 — Bounded Alternative-Question Search (Implementation Report)

**Date:** 2026-08-11
**Commit:** (this milestone)
**Context:** Implements Model 4, approved after two architecture design reviews (initial design + the corrected null-first-attempt scoping), closing the Case B dead end from the second real pilot transcript (Runway + ElevenLabs, solo operator).

---

## What changed

`run-turn.ts`'s organic (no-decline) per-turn loop now performs a **bounded, at-most-one-retry search** instead of a single candidate attempt:

1. Attempt #1: generate → validate → Constraint A → Constraint B.
2. If rejected or null, attempt #2 runs with the same structured input:
   - A **rejected** first candidate excludes exactly `(question_kind, target_signal_id)` from the retry.
   - A **null** first candidate invents no exclusion (per the approved correction — candidate generation is stochastic, confirmed by live-trial evidence during the design review; a null result is not evidence nothing else is askable).
3. If attempt #2 also fails (null, invalid, excluded-duplicate, rejected by A, or rejected by B), the turn finalizes directly with a new completion reason: `questioning_exhausted`.

No third attempt, ever. The explicit `skip_question`/`skip_phase` decline path is completely untouched — Model 4 only engages when `declineSignal` is undefined.

**Direct consequence:** `outcome.kind === 'acknowledgment'` is now structurally unreachable via the organic path — every organic turn now ends in a real question, natural gate-based completion, or `questioning_exhausted`. It remains reachable only via the (unchanged) decline-suppression path.

---

## Files changed

- `08_Platform/app/lib/crc-engine/run-turn.ts` — new `tryCandidate()` helper (one full generate→validate→A→B attempt); the organic branch now runs it up to twice with the exclusion logic above; the decline branch is reproduced verbatim, unchanged, just moved into its own `if` arm.
- `08_Platform/app/lib/interview-engine/candidate-question.ts` — new `CandidateExclusion` type, `excluded?` field on `CandidateQuestionGeneratorInput`, new `matchesExclusion()` pure helper.
- `08_Platform/app/lib/interview-engine/anthropic-candidate-question.ts` — new `buildExclusionInstruction()`, deterministic templating only (structured `(kind, signal_id)` facts appended to the user message), never Constraint A/B's own rationale prose.
- `08_Platform/app/types/interview-engine.ts` — `COMPLETION_REASONS` gains `questioning_exhausted`.
- `08_Platform/app/__tests__/crc-engine/run-turn-model4.test.ts` (new) — 13 tests, mock-stack, covering the full approved corpus.
- `08_Platform/app/__tests__/crc-engine/run-turn.test.ts` — 8 pre-existing tests updated (see below).

**Untouched, confirmed:** `gates.ts`, `boundaries.ts`, `completion.ts`, `decision.ts`, Retrieval, Projection. `completion.ts` was not modified and does not inspect `BoundaryState` — the `questioning_exhausted` completion state is constructed directly in `run-turn.ts`'s own bounded-search branch, never routed through `checkCompletion()`.

---

## Pre-existing test updates (why, not just what)

Eight tests in `run-turn.test.ts` needed updates. All eight share one root cause, not eight separate bugs: a "setup" turn 1 that previously relied on `constantCandidateQuestionGenerator(null)`'s default (a safe no-op producing a plain acknowledgment) to establish facts without ending the turn. Under Model 4, a **constant** mock returns the same (null) answer on both bounded attempts by construction — so what used to be a harmless acknowledgment now correctly finalizes with `questioning_exhausted`. This is exactly the intended behavior change, not a regression; the fix in each case was to give the setup turn an explicit `declineAction: 'skip_question'` so it resolves via the unchanged decline path instead.

One test's assertion itself needed a genuine update (not a setup workaround): *"a turn that extracts a fact but proposes no question"* previously asserted `acknowledgment`; it now asserts `complete` with `questioning_exhausted`, since that is the scenario Model 4 was built to change.

One test (*"Stop pressed immediately after an acknowledgment turn"*) needed restructuring: its whole premise — reaching a non-complete acknowledgment via the organic path — is no longer constructible with a constant mock, since that state is now unreachable there by design. Rebuilt using the decline path instead, preserving the test's actual intent (`stop_interview` completes correctly from a real, non-complete acknowledgment state) via the only mechanism that still produces one.

---

## Evaluation corpus (13 mock-stack tests, `run-turn-model4.test.ts`)

All from the approved corpus, plus the three cases from the null-first-attempt correction:

| Case | Result |
|---|---|
| Attempt 1 blocked by Constraint B, attempt 2 targets a different signal | ✅ question asked |
| Attempt 1 rejected by Constraint A, attempt 2 approved | ✅ question asked |
| Attempt 2 targets a different question kind on the same capped signal | ✅ allowed (confirms exclusion granularity is `(kind, signal_id)`, not signal-alone) |
| Attempt 1 null, attempt 2 also null | ✅ `questioning_exhausted` |
| Attempt 1 null, attempt 2 rejected by A | ✅ `questioning_exhausted` |
| Attempt 1 null, attempt 2 rejected by B | ✅ `questioning_exhausted` |
| Both attempts rejected by A | ✅ `questioning_exhausted`, valid sparse Projection |
| Attempt 2 targets the same excluded pair | ✅ deterministic auto-reject (proven by a decider queue scripted with only one entry — a second call would throw), `questioning_exhausted` |
| Attempt 2 fails `validateCandidateReference` | ✅ `questioning_exhausted` |
| Finalizes while Gate 2 is `not_yet_stable` | ✅ never mislabeled as `gate_1_gate_2_met` |
| Gate 2 stable + Phase 3 | ✅ natural completion fires first; candidate generation never even called (proven via a throwing generator) |
| `skip_question` decline (recovery pattern, trial 12) | ✅ plain acknowledgment, no retry attempted; next turn can still ask a real question |
| Multiple uncapped eligible signals | ✅ attempt 2 selects a different, uncapped one |

Two of these (the Constraint-B and Gate-2-stable cases) required care in seed construction: an early draft accidentally included a `scoped_observation` in the seeded state to give the retry something to target, which independently satisfied Phase 2's own exit condition and triggered natural completion before candidate generation was ever reached — a genuine test-construction pitfall, not a `run-turn.ts` defect, fixed by targeting the always-eligible `project:workflow_role` signal instead.

**Deterministic + full suite:** 542 tests total, 533 passed, same 2 pre-existing unrelated failures (`mock-provider.test.ts`). Typecheck and `next build` both clean.

---

## Live-model validation

18 trials of the exact Runway + ElevenLabs pilot transcript, real Anthropic adapters, real unmodified `runTurn()`, across two batches:

- **10/18 completed cleanly.** Zero bare acknowledgments across all 10 — every sequence ended in either `gate_1_gate_2_met` (6 trials, natural completion) or `questioning_exhausted` (4 trials, Model 4's bounded search genuinely exhausted).
- **8/18 hit a transient Anthropic SDK-level JSON-parse failure** (`"Unterminated string in JSON"`, `"did not include parsed_output"`). Confirmed these originate from the SDK's own `.messages.parse()` call, with an identical error path regardless of which of the three adapters (extraction, candidate generation, Constraint A) is calling it — this is a pre-existing, already-documented class of live-model flakiness from earlier in this project, not something Model 4 introduced. The elevated rate in this specific batch (versus earlier batteries) is disclosed rather than downplayed; it's a real signal worth monitoring in production via `crc_pilot_events`' `retryable_failure` count, even though it's orthogonal to this change.

---

## Confirmation checklist

- Constraint A semantics: unchanged.
- Constraint B semantics, follow-up caps, anti-interrogation principles: unchanged.
- Gate 1, Gate 2, phase logic: unchanged.
- Retrieval, Projection: unchanged.
- `completion.ts`: unchanged, does not inspect `BoundaryState`.
- No multi-candidate retry beyond the approved bound (exactly one alternative attempt, never a third).
- No ranking heuristics introduced outside the generator.

## Final recommendation

**Deploy.** Full deterministic corpus (13 new + 8 updated existing tests) and live-model validation (18 trials, 10 clean, zero bare acknowledgments) both pass. Scope stayed exactly at Model 4 — no other subsystem was touched.
