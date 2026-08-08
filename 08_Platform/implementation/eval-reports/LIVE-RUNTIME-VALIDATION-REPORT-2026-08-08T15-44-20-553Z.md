# Live Interview Runtime — Live-Model Validation Report

**Date:** 2026-08-08
**Scope:** Live-model validation of `runTurn()` — the full per-turn chain (Extraction → Mutation → Decline preprocessing → Gate 1 → `computePhase()` → Completion check → Candidate Generation → Constraint A → Constraint B → Pending Clarification → in-memory session persistence), exercised via the real, unmodified `runTurn()` against the real Anthropic adapters. No API routes, no Supabase, no UI. Retrieval/Projection exercised only as downstream validation on natural completion.
**Raw data:** `LIVE-RUNTIME-VALIDATION-RAW-2026-08-08T15-44-20-553Z.json` (20 scenario/trial runs, full per-turn structured-state log)
**Harness:** `08_Platform/app/lib/crc-engine/eval/run-live-turn-eval.ts`, `scenarios.ts`, `instrumented-live-deps.ts`, `diff.ts`
**Method:** 10 scenarios × 2 trials, `npm run eval:crc-runtime-live -- --trials=2`

This is an evaluation-only milestone. No findings below were fixed, no prompts were tuned, no runtime code was modified as part of producing this report.

---

## 1. Scenario Statistics

| Metric | Value |
|---|---|
| Scenarios × trials run | 10 × 2 = 20 |
| Reached a terminal state (`completed: true`) | 14 / 20 |
| Did not complete within scripted turn budget | 6 / 20 (by design — short probe scenarios; see §3 for one exception) |
| Harness-level exceptions / `outcome_kind: 'error'` | 0 / 20 |
| Completed runs with `projection_check.structurally_valid: true`, zero notes | 14 / 14 |

Completion reasons observed across the 14 completed runs:

| Reason | Count | Scenarios |
|---|---|---|
| `gate_1_gate_2_met` | 4 | rich_first_turn (×2), gate2_stabilization (×2) |
| `gate_1_unmet_exhausted` | 6 | gradual_discovery (×2), decline_mid_conversation (×2), phase_advances_within_bundled_turn (×2) |
| `declined` | 4 | conversation_ending_through_decline (×2), full_opt_out (×2) |

All 12 required-coverage behaviors were scripted; 11 were genuinely exercised against the live model. One (`decline mid-conversation`, specifically the `skip_question` UI action) was scripted but never reached in either trial — see Finding F6.

---

## 2. Architecture Findings

**A1 — Candidate B (Phase 2→3 same-turn advancement) confirmed live.** `phase_advances_within_bundled_turn` was purpose-built to test the `[PROTOTYPE ASSUMPTION — TO VALIDATE]` tag in `phase.ts`: a single turn ("We used ElevenLabs, and I'm the sound designer on it.") produced `phase: 3` in one shot, in both trials, from real-model extraction — not a hand-built fixture. `rich_first_turn` trial 1 independently reproduced the same same-turn jump from an unrelated, richer message. **This is direct live evidence that the adopted Candidate B rule behaves as designed.**

**A2 — The `phase !== 3` completion guard held under live timing pressure.** `gradual_discovery` (both trials) advanced `current_phase` 2→3 and fired `gate_1_unmet_exhausted` in the *same* turn, never a turn early and never delayed. This is the exact race the guard (`checkCompletion`, re-derived from §11 during design, before any test failure forced it) was written to prevent, and it resolved correctly against real model timing in both trials.

**A3 — Decline short-circuit ahead of the phase-3 guard confirmed live.** `conversation_ending_through_decline` (both trials) and `full_opt_out` (both trials) completed via `declined` at phase 1 or 2 — never forced to phase 3 first. Matches `checkCompletion`'s ordering: the decline check runs before the phase guard.

**A4 (design observation, not a defect) — Constraint B is carrying more of the anti-repetition burden than Constraint A.** In two independent findings (F1, F2 below), Constraint A approved a candidate question that either re-asked or referenced already-superseded information, and Constraint B correctly blocked it before it reached the user. Constraint B caught it every time in this battery — but the pattern recurred across consecutive turns in the same trial (`unresolved_ambiguity_across_turns`, turns 2 and 3 both blocked for the same underlying reason). Candidate generation does not appear to incorporate "this was proposed and blocked last turn" as context, relying entirely on Constraint B as a fresh per-turn filter rather than the conversation converging on its own. Not a defect — the backstop worked — but worth flagging as an architectural characteristic to watch if it recurs at higher live-model volume.

---

## 3. Implementation / Model Findings

**F1 — [extraction] CONFIRMED — Tool-mention correction produces no structural update.** In `correction_after_supersession`, turn 2 ("Actually, sorry — that was wrong, we used Runway for the visuals, not Midjourney."), the `su_diff` in **both trials** contains no `+tool_mention` entry and no `superseded_by` change — `diffStructuredUnderstanding()` is verified to track both (source-checked directly), so this is a genuine absence, not a diffing gap. The corrected tool (Runway) is never captured anywhere in structured understanding; the retracted tool (Midjourney) remains the system's only record. Consequence observed directly: in trial 2, turn 3's candidate question is "You mentioned using Midjourney for the visuals — do you know what plan or subscription tier..." — one full turn *after* the user explicitly disowned that tool. Trial 1 did not surface the same question but showed the identical underlying gap (no structural change on the correction turn either).
Reproducible in both trials. This is the single most significant finding in the battery.

**F2 — [extraction] PLAUSIBLE — A directly-stated fact does not register in time to prevent a stale follow-up.** In `unresolved_ambiguity_across_turns`, turn 2 ("Oh, through the API — I have a developer key, it's not the app on my phone."), Constraint A's own rationale in both trials still describes `access_surface` as unknown, and the generated candidate re-asks how the tool was accessed — despite the user answering that exact question in the same turn. The pattern repeats at turn 3 in both trials. Constraint B blocked the question every time (see F3), so no user ever saw it. Diff-level evidence can't conclusively isolate whether this is an extraction miss or a stale-state read at candidate-generation/Constraint-A time — flagged as PLAUSIBLE, not CONFIRMED, and left open rather than guessed at.

**F3 — [Constraint B] CONFIRMED positive.** In both F1's and F2's underlying turns, `constraint_b_verdict: "blocked"` and `outcome_kind: "acknowledgment"` — Constraint A approved a redundant or stale candidate, and Constraint B independently stopped it from reaching the user. This is the deterministic backstop functioning exactly as designed against real, live upstream imperfection, not a hypothetical.

**F4 — [model variance] Identical first-turn input produced different phase/completion timing across trials.** `decline_mid_conversation`'s scripted first message ("We used ElevenLabs for the voiceover, team plan.") produced `phase: 3` and immediate completion in trial 1 (1 turn total) vs. `phase: 2`, no completion, requiring a second turn in trial 2. Expected LLM sampling variance in isolation — but it has a direct downstream consequence: see F6.

**F5 — [candidate generation] PLAUSIBLE, low severity.** In `bundled_answer_requiring_rule5`, the turn-2 candidate question is near-verbatim identical in wording to turn 1's already-asked, unanswered question, in both trials, with no acknowledgment that the user's turn-2 answer addressed a different (historical) project than the one being asked about. Neither trial reached completion, so whether intended_use for the *current* project is correctly scoped separately from the "last year" project (Rule 5's actual purpose) could not be verified either way this cycle.

**F6 — [fixture ambiguity / evaluation harness] Confirmed coverage gap — `skip_question` never exercised live.** `decline_mid_conversation` was scripted specifically to test a question-scope decline (`skip_question` at turn 3), but per F4, both trials reached `is_complete: true` via `gate_1_unmet_exhausted` before turn 3 was ever offered — the harness's own (correct, documented) "a completed session never re-enters the loop" behavior stopped the script early. **Net effect: no scenario in this 20-run battery actually exercised the `skip_question` (question-scope) decline path against the live model.** Only `stop_interview` (interview-scope) was validated, via `conversation_ending_through_decline` and `full_opt_out`. This should be tracked as an open item, not folded into the "6 non-completions are expected" bucket — it's the one non-completion that defeats its scenario's specific purpose rather than being a merely-short probe.

**No findings** in: normalization, mutation (could not be distinguished from F1's extraction-layer explanation using diff-level evidence — not double-counted as a separate confirmed defect), gate logic, pending clarification (positive — see A-series equivalent below), runtime orchestration, Constraint A (internally consistent with the state it was given in every case, including the mistaken ones), architecture (beyond A4's observation).

**Pending clarification — CONFIRMED positive, both required behaviors.** Creation and clearing observed live and correct: `rich_first_turn` trial 1 creates a `pending_clarification` after turn 1's question and clears it by turn 2; `unresolved_ambiguity_across_turns` shows the same pattern. The `buildUserMessageContent()` context-injection wiring from the pending-clarification work is functioning as intended in a live loop, not just in isolation.

---

## 4. Downstream Validation (Retrieval / Projection)

Per instruction, not re-evaluated for independent correctness — only checked as a consequence of runtime completion. All 14 completed runs: Retrieval and Projection were invoked, `ProjectionOutput` had exactly the expected key shape (`closing_cta`, `knowledge_items`, `opening_line`, `understood_summary`), `knowledge_items` was always an array, no forbidden governance-field strings (`publication_scope`, `CRC-Eligible`, `CRC Decision Date`, `CRC Approver`, `SI8 Interpretation`) leaked into any output, and `diagnostics.retrieval`/`diagnostics.projection` were always arrays. Zero notes across all 14. No malformed state entered Retrieval/Projection in any run, including the two declined-completion scenarios (partial state).

---

## 5. Recommendation

**Runtime validated with minor follow-up work.**

Orchestration, gate logic, phase computation (including both the Candidate B same-turn rule and the phase-3 completion guard), decline handling (interview-scope), pending-clarification lifecycle, and the Retrieval/Projection binding all held correctly under real-model conditions across 20 runs with zero harness-level exceptions and zero malformed downstream state. Nothing found here challenges a structural assumption in the architecture — Constraint B's backstop role in particular was validated exactly as designed, catching two independent live extraction gaps before either reached a user.

The reason this isn't "ready for production integration" outright: F1 is a confirmed, reproducible defect with real product consequence for a compliance-relevant record — a user's explicit correction to a previously-stated tool is silently dropped rather than superseding the old value. F6 means one of the twelve required-coverage behaviors (question-scope decline) was not actually validated live this cycle, despite being scripted for it. Neither finding indicates the runtime needs architectural revision; both are scoped to the live-model extraction layer's handling of corrections and already-answered facts, and to fixture calibration — not to `phase.ts`, `completion.ts`, `decline.ts`, or `run-turn.ts` themselves.

Suggested follow-up (not undertaken as part of this milestone):
- Strengthen extraction handling of explicit correction/supersession language ("actually, that was wrong... X not Y") so it reliably produces a `superseded_by` update or new canonical `tool_mention` (addresses F1).
- Re-run `unresolved_ambiguity_across_turns` with raw extractor-output capture (not diff-only) to conclusively isolate F2's root layer.
- Recalibrate `decline_mid_conversation`'s scripted turns (or add a second variant) so the `skip_question` path is actually reached before completion fires, closing the F6 coverage gap.
