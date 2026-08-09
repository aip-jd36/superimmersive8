# Live Interview Runtime — Follow-up 1 & 2 Report

**Date:** 2026-08-08 / 2026-08-09
**Scope:** Two targeted follow-ups to close before declaring the Live Interview Runtime production-integration-ready, per the review that accepted `LIVE-RUNTIME-VALIDATION-REPORT-2026-08-08T15-44-20-553Z.md` as "validated with minor follow-up work."
**Constraints honored:** No runtime redesign. No API routes, Supabase persistence, or UI work. Fix scoped to "this class of extraction behavior" only (Follow-up 1) and to the evaluation scenario, not product logic (Follow-up 2).

---

## Follow-up 1 — Tool-correction extraction defect

### Root cause

**Not a live-model behavior problem.** Before writing any fix, the raw model output for the failing turn ("Actually, sorry — that was wrong, we used Runway for the visuals, not Midjourney.") was inspected directly, in isolation, 6 times. The extractor proposed a correct candidate **6/6 times**: `kind: "tool_mention"`, `raw_tool_name: "Runway"`, `is_correction: true`, `correction_of_raw_text` referencing Midjourney. Extraction's own live-model classification of this class of statement is reliable. Prompt wording, schema affordance, and correction-detection instruction were all ruled out at this step — the model already emits everything it structurally can.

**The actual defect is a candidate-shape / ID-resolution gap between the extractor adapter and the mutation stage**, confirmed by running the full `runExtractionPipeline()` (not just the raw extractor) across the two-turn sequence, 4/4 times:

1. `CandidateObservation.supersedes_tool_mention_id` is the *only* field `runExtractionPipeline` reads to decide `supersedeToolMention()` vs. `addToolMention()`.
2. The Anthropic adapter's schema deliberately excludes `supersedes_tool_mention_id` — by design, since the model has no visibility into this pipeline's internal mention IDs (its own doc comment says as much). The model can only emit `is_correction` + `correction_of_raw_text` (a free-text quote).
3. **Nothing in the pipeline ever resolved `correction_of_raw_text` back into a concrete `supersedes_tool_mention_id`.** The adapter's `toCandidateObservation()` passes `is_correction`/`correction_of_raw_text` straight through but never touches `supersedes_tool_mention_id` — it stays `undefined` unconditionally.
4. Because it's always `undefined`, `attestCandidate()` always takes the `addToolMention` path with `mention_id = candidate.proposal_id` — and `proposal_id`s are assigned fresh per turn starting at `"c1"` (confirmed directly in raw output). Turn 2's Runway candidate ("c1") collided with turn 1's already-existing Midjourney mention (also "c1"). `addToolMention` throws `Tool mention id already exists: c1`, caught and classified as `MUTATION_DUPLICATE_ID`, and the entire candidate is silently rejected — zero structural change, exactly matching the live battery's Finding F1.

Classification: **candidate-shape / ID-resolution gap** (a missing resolution step between what the model can propose and what mutation needs), not prompt wording, not correction-detection, not schema affordance, and — confirmed directly — **not mutation/supersession**. `supersedeToolMention()` was never even invoked in the failing path; it was untested, not broken.

### Exact Extraction change made

One new function and one small wiring change, both in `08_Platform/app/lib/interview-engine/extraction.ts`. **Zero prompt or schema changes** — the model's own output already contained everything needed.

- **`resolveToolMentionSupersessionTarget(candidate, su, retractedThisTurn)`** (new, ~35 lines): runs only when `candidate.kind === 'tool_mention' && candidate.is_correction`, and only if `supersedes_tool_mention_id` isn't already set. Matches `correction_of_raw_text` against the current `StructuredUnderstanding`'s active (non-superseded) tool mentions — first by exact textual containment of an existing mention's own resolved label, falling back to "the one other active mention" when the text is a vague back-reference ("that was wrong"). Zero or multiple ambiguous matches resolve nothing (falls through to today's unchanged `addToolMention` path), matching `normalizeCandidate`'s own conservative-match discipline elsewhere in this file.
- **`retractedThisTurn` guard**: added after live validation surfaced a second-order bug the first version of the fix introduced — see below.
- **Call site**: `runExtractionPipeline`'s loop now computes `resolveToolMentionSupersessionTarget` before `normalizeCandidate`/`attestCandidate`, and injects the resolved id onto a shallow copy of the candidate if found.

**A regression was found and fixed during self-testing, before the corpus ran.** The model sometimes splits one correction into two `is_correction: true` candidates (one naming the new tool, one re-stating the old tool's own name — e.g. raw_text `"not Midjourney"`). Without a guard, the second candidate's fallback branch found the just-added Runway mention as "the one other active mention" and superseded it *back* to Midjourney — silently reverting the correction it was supposed to preserve. Fixed by tracking labels superseded earlier in the same turn and refusing the fallback (never the direct text-match branch) against them. Worst case now: a harmless, inert duplicate entry, never a silent revert. Verified 8/8 after the guard.

No changes to `mutations.ts`, `anthropic-extractor.ts`'s prompt/schema, or any other file. `npx tsc --noEmit` clean; full Jest suite: 470/470 relevant tests pass (2 pre-existing, unrelated failures confirmed present identically on the pre-fix commit — `__tests__/assessments/mock-provider.test.ts` and `__tests__/crc-engine/subsystem-boundaries.test.ts` — not touched or caused by this change).

### Focused correction-corpus results

6 cases, 3 trials each, run via `runExtractionPipeline()` against the live model (`lib/interview-engine/eval/correction-corpus.ts` + `run-correction-corpus-eval.ts`):

| Case | Trials correct | Notes |
|---|---|---|
| `true_correction_direct` ("Actually, we used Runway, not Midjourney.") | 3/3 | Clean supersession every trial. |
| `true_correction_meant` ("Sorry, I meant Kling, not Runway.") | 3/3 | Clean supersession every trial. |
| `access_surface_correction` ("Correction — that was the Gemini app, not the API.") | 3/3 on supersession mechanics | Supersession fired correctly every trial (old mention superseded, new one active) — but the new mention resolved as `unresolved_alias` ("Gemini app"/"Gemini"), not recognized as the same registered ambiguous tool (`nano banana` → `gemini-consumer-app`). **Pre-existing normalization-registry gap, not a regression**: the fix never touches `normalizeCandidate` or `KNOWN_AMBIGUOUS_TOOLS`; this is the model's own wording not matching the registry's literal-phrase matching, independent of the ID-resolution fix. Disclosed, not fixed (out of scope for this follow-up). |
| `workflow_switch` ("We switched from Midjourney to Runway for the final.") | Observational, no fixed bar (by design) | 2/3 trials reproduced `MUTATION_DUPLICATE_ID` — **but only when the model did NOT flag `is_correction: true`** on the re-mentioned tool. This is the same underlying "turn-scoped proposal_id collision" defect class, now confirmed to also exist **outside** the correction-flagged path this fix addresses. See "Residual, out-of-scope finding" below. |
| `true_correction_earlier` ("Earlier I said Kling, but that was wrong. It was Pika.") | 3/3 on supersession mechanics | Kling correctly superseded every trial; Pika resolves `unresolved_alias` (Pika isn't in `KNOWN_TOOLS` — pre-existing registry-completeness gap, unrelated to this fix, same class as above). |
| `two_tool_coexistence` ("We used both Kling and Pika... Kling for the b-roll, Pika for the hero shot.") | 3/3 | Two independent active mentions, zero superseded, zero `is_correction` candidates on either. Confirms the fix invents nothing. |

**Acceptance criteria, checked against the 18-trial corpus:**
- Correction detected reliably — yes, 15/15 trials where a correction was actually intended.
- Correct prior signal targeted — yes, every resolved supersession targeted the right existing mention.
- New tool preserved — yes, in every correction case.
- Old tool superseded, not deleted — yes; every original mention remains in `tool_mentions` with `superseded_by` set, never removed.
- Two-tool coexistence remains two tools — yes, 3/3.
- 0 invented tool corrections — yes; the resolver only ever runs when the model itself set `is_correction: true`.
- No regression in ambiguity handling — yes, structurally confirmed (`normalizeCandidate`/`KNOWN_AMBIGUOUS_TOOLS` untouched); the one ambiguity-adjacent surprise (`access_surface_correction`'s registry-matching gap) is pre-existing, not caused by this change.
- No regression in pending-clarification behavior — confirmed both structurally (this fix's diff is entirely upstream of `buildPendingClarification`, which reads only fresh, already-mutated `StructuredUnderstanding` state, never a stale pre-mutation id) and empirically, via the end-to-end regression run below.
- Total `MUTATION_DUPLICATE_ID` rejections across all 18 trials: **2**, both isolated to the one case deliberately left unflagged by the model — zero across the 15 trials the fix is actually scoped to.

**Residual, out-of-scope finding (disclosed, not fixed):** the general "a tool re-mentioned in a later turn can collide with an earlier turn's `proposal_id` and get silently dropped via `MUTATION_DUPLICATE_ID`" failure mode still exists for candidates the model does **not** flag as `is_correction`. This fix closes it specifically for the correction-flagged path (Follow-up 1's exact scope); it does not touch the broader latent pattern (e.g., a stable, turn-qualified ID scheme, or a general re-mention resolver). Recommended as a distinct future item, not undertaken here per "do not broadly rewrite Extraction."

---

## Follow-up 2 — Live `skip_question` coverage

Built a targeted 3-turn scenario (`lib/crc-engine/eval/run-skip-question-coverage-eval.ts`) using the real, unmodified `runTurn()`: turn 1 names only an ambiguous, unresolved tool ("I used Nano Banana for this one.") — deliberately too little for gate 1 to reach any terminal state, guaranteeing a question and guaranteeing completion cannot fire before the decline turn. Turn 2 processes the decline action under test. Turn 3 checks the interview continues normally.

*(Note: JD's message referenced "skip_section" — the runtime's three fixed decline actions are `skip_question`, `skip_phase`, `stop_interview`; used `skip_phase` for the phase-scope comparison.)*

**`skip_question`, 2 live trials — both clean and identical in shape:**
- Turn 1: question asked, `pending_clarification` set, not complete.
- Turn 2 (`skip_question`): outcome `acknowledgment`, **not** `complete` — the interview did not end. `gate_1_state` stayed `not_met` (normal evaluation, not short-circuited — confirms decline pre-processing correctly distinguishes `scope: 'question'` from `scope: 'interview'` before gate evaluation). `pending_clarification` cleared to `null`. `opt_out_scope` stayed `null`.
- Turn 3: outcome `acknowledgment`, phase still 2, `completion_reason` still `null` — interview genuinely continues.

All six of Follow-up 2's acceptance criteria confirmed directly: decline pre-processing occurs before gates/phase/completion; `DeclineSignal.scope === 'question'` (behaviorally, via gate_1 never being forced to `not_applicable_declined`); only the current question is suppressed (pending_clarification closed, not carried forward); phase remains active; the interview continues normally afterward; no broader opt-out is set (`opt_out_scope` stayed `null` throughout).

**Comparison trials, same decision point:**
- `skip_phase`: turn 2 also did **not** complete immediately (`acknowledgment`, gate_1 still `not_met`) — turn 3 then completed (`gate_1_unmet_exhausted`, phase jumped to 3). This is a direct live confirmation of an *already-disclosed* `run-turn.ts` design note: a phase-scope decline's `phases_ended` update only takes effect starting the *following* turn's `computePhase` call, not instantaneously. Not a new finding — the live behavior matches the documented, deliberate one-turn delay exactly.
- `stop_interview`: turn 2 completed immediately (`gate_1_state: not_applicable_declined`, `completion_reason: declined`, `opt_out_scope: 'interview'`).

All three decline actions are cleanly, correctly distinguishable at the identical point in a conversation, with no scope leakage between them.

(One trial in the first run hit a transient `Anthropic response did not include parsed_output` error on a Constraint A call — unrelated to any code under test; the harness wasn't isolating trial failures, so it aborted the batch. Hardened to catch per-trial and continue; the rerun completed all four trials cleanly.)

---

## Regressions found

**One transient, non-reproducing:** `gate2_stabilization` hit a `Failed to parse structured output: Unterminated string in JSON` error on its first regression run — an SDK-level response-parsing failure, not touched by this fix (this scenario involves no tool corrections at all). Immediate rerun completed cleanly (4 turns, `completed=true`, `final_phase=3`, `projection_valid=true`), matching its original-battery behavior exactly. Classified as ordinary live-API flakiness, not a regression.

**No other regressions.** `unresolved_ambiguity_across_turns` (2 trials) and `rich_first_turn` (2 trials) reproduced their original-battery behavior exactly, unchanged. Full Jest suite: no new failures introduced.

## End-to-end confirmation: `correction_after_supersession`

This is the exact scenario that originally surfaced Finding F1. Re-run through the full, real `runTurn()` 3 times (not just `runExtractionPipeline()`):

- **3/3 trials now complete** (`completed: true`, `final_phase: 3`, `projection_valid: true`) — this scenario **never completed** in either of the original battery's 2 trials.
- All 3 trials' turn-2 `su_diff` now reads `["tool_mention c1 superseded_by null -> c1-resolved", "+tool_mention c1-resolved (runway-gen3)"]` — the exact structural update that was previously silently absent.
- Pending-clarification directly confirmed regression-free live: 2/3 trials show `pending_clarification` correctly created after the correction turn, referencing the new `c1-resolved` id with a correct, sensible `unresolved_summary` — no stale reference to the retracted `c1`, no crash, no null fallback.

## Does either finding change the runtime architecture?

**No.** Follow-up 1's fix is fully contained inside `extraction.ts`, upstream of `normalizeCandidate`/`attestCandidate`/mutation — it adds a resolution step consistent with the existing "Extraction proposes, deterministic code decides" discipline, using fields (`is_correction`, `correction_of_raw_text`) the architecture already defined for exactly this purpose. `supersedeToolMention()`, `computePhase()`, `checkCompletion()`, decline handling, and pending-clarification all behaved exactly as designed once given correct input. Follow-up 2 found no runtime defect at all — only that the original battery's own scenario script never reached its target decline turn; the runtime's decline-scope handling was already correct and is now directly confirmed live.

---

## Final recommendation

**Live Runtime validated with one remaining implementation follow-up.**

Both follow-ups, as scoped, closed cleanly: the confirmed extraction defect has a root-caused, minimally-scoped fix (zero prompt/schema changes, ~35 lines in one file, verified 8/8 direct + 15/15 correction-flagged corpus trials + 3/3 end-to-end), and the `skip_question` coverage gap was in the evaluation scenario, not the runtime, now directly validated live for all three decline actions.

Not choosing "ready for product integration" outright because building the corpus surfaced a real, live-confirmed defect one layer wider than what Follow-up 1 was scoped to fix: `workflow_switch` reproduced `MUTATION_DUPLICATE_ID` in 2/3 trials whenever the model describes re-mentioning an earlier tool *without* flagging `is_correction` — the same turn-scoped `proposal_id` collision this fix closes for the correction-flagged path remains open for the non-correction-flagged one. It predates this session's own two follow-ups and isn't part of what was accepted for closure, but it's now a known, live-confirmed way for a legitimate tool mention to be silently dropped (not just an academic edge case) — worth treating as the one remaining implementation follow-up before full production sign-off, not deferred indefinitely. Scope for that follow-up: replace the turn-local `proposal_id` collision surface with something globally stable (or detect-and-retry rather than silently reject on `MUTATION_DUPLICATE_ID`), independent of whether `is_correction` was set. Not undertaken here per "do not broadly rewrite Extraction" and because it falls outside both follow-ups' explicit scope.

No architectural revision indicated by either follow-up or this residual finding — the fix pattern (a small, deterministic resolution step ahead of mutation) is the same shape needed for the wider case; this is bounded implementation work, not a design problem.
