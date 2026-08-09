# Live Interview Runtime — Proposal-ID Collision Class Elimination

**Date:** 2026-08-09
**Scope:** The one remaining implementation follow-up from `LIVE-RUNTIME-FOLLOWUP-REPORT-2026-08-08.md` — the general (non-correction-flagged) `MUTATION_DUPLICATE_ID` collision pattern surfaced by the `workflow_switch` corpus case. No runtime redesign, no Extraction redesign, no prompt/schema changes.

---

## Identity mapping (produced before any code was written)

| Identifier | Lifecycle | Defined by | Trusted by |
|---|---|---|---|
| `CandidateObservation.proposal_id` | **turn-local** — the model restarts numbering ("c1", "c2"...) on every extractor call | The model, fresh per turn | Nothing should trust it past the turn — but did (below) |
| `ToolMention.mention_id` / `ScopedObservation.observation_id` | **intended persistent** | Before this fix: minted directly from `proposal_id`, bare or with an ad hoc `-resolved`/`-corrected` suffix — turn-locality silently promoted to persistence, no cross-turn collision check | `mutations.ts`, `candidate-question.ts`, `boundaries.ts` (via `signal_id`), `pending-clarification.ts`, `signal-lineage.ts`, `gates.ts`, `handoff.ts` |
| `EligibleSignal.signal_id` / `CandidateQuestionProposal.target_signal_id` | **runtime-local, derived** — a live snapshot of current active mention_id/observation_id, or a fixed literal | `deriveEligibleSignals()`, fresh every turn | The LLM candidate-question generator (read-only; forbidden from minting its own) |
| `BoundaryState` map keys | **persistent for the whole interview**, only as reliable as the `signal_id` it's handed | Caller (`run-turn.ts`, via `resolveLineageRoot`) | `boundaries.ts` itself, blindly — zero knowledge of mention_id/proposal_id |
| `PendingClarification.signal_id` | **single-turn-lookahead persistent** | `buildPendingClarification`, copied from `proposal.target_signal_id` | Its own next-turn lookup |
| `PROJECT_FACT_SIGNAL_IDS.*` | **truly persistent, semantic, hardcoded** | Fixed constants | Everyone, safely — unrelated to this problem class |

**Finding:** everything downstream of `mention_id`/`observation_id` already treats it correctly as stable, persistent, lineage-rooted identity (`signal-lineage.ts`'s `resolveLineageRoot` is existing precedent that this codebase already models "persistent identity" as a chain via `superseded_by`, not a single id value). The entire defect lived at one seam — `attestCandidate()`'s minting of `mention_id` — which silently promoted a turn-local value to persistent identity with no cross-turn collision check, and (for non-`is_correction` candidates) no attempt to recognize when a new candidate was actually *about* an existing active tool.

---

## Design: the generalized resolver

`resolveToolMentionTarget()` (renamed from `resolveToolMentionSupersessionTarget`, `extraction.ts`) now runs on **every** tool_mention candidate, not just `is_correction`-flagged ones, in two ordered steps — both working from fields the schema already carries, no new model reasoning:

- **Step 1 — same-tool identity match** (new): a later candidate names the same real-world tool as an existing active mention when either (a) both resolve to the same canonical identifier via `normalizeCandidate`'s existing deterministic registry lookup, or (b) the candidate's own `raw_tool_name` text matches an existing *unresolved* mention's own raw alias name — the latter is what lets an ambiguous alias, re-mentioned later with disambiguating text, correctly consolidate onto its own prior record instead of spawning a parallel duplicate. Zero or multiple matches resolve nothing (never guessed) and fall through to Step 2.
- **Step 2 — `is_correction`-flagged retraction of a different tool** (unchanged from the 2026-08-08 fix, now positioned second): exact text match of `correction_of_raw_text`, falling back to "the one other active mention," guarded by the same `retractedThisTurn` anti-revert protection.

Both steps return either a `mention_id` to supersede (**attach**/**correct**) or `undefined` (**create**, or **remain unresolved** — the latter already `normalizeCandidate`'s own decision, unchanged).

**ID minting** (the other half of the fix): `mentionId` is now uniformly `t${turn}-${proposal_id}` for every newly-minted tool mention, whether or not it also supersedes something — one rule, not the old two (bare / `-resolved` / `-corrected`). Turn numbers are monotonic and never repeat within a conversation; proposal_ids are unique within one turn; the pair is therefore unconditionally collision-free, eliminating **reliance on proposal_id uniqueness entirely** — the stated goal — independent of any identity-matching heuristic succeeding or failing.

**Untouched, by design:** `mutations.ts` (semantics unchanged — `supersedeToolMention`/`addToolMention` invoked exactly as before, just with correct arguments more often), gate logic, runtime ordering, Retrieval (`buildRetrievalHandoff` only ever reads *active* mentions' canonical identifiers/raw names, never `mention_id` itself, structurally insulated from any id-format change), Projection, the Anthropic schema, and the system prompt. `scoped_observation`'s analogous `proposal_id`-minting path was deliberately left as-is — out of scope (the corpus, acceptance criteria, and this whole task were scoped to "tool mention" throughout) — see the disclosed residual below.

---

## Focused corpus results

6 cases × 3 trials, run via `runExtractionPipeline()` against the live model (`lib/interview-engine/eval/identity-resolution-corpus.ts` + `run-identity-resolution-corpus-eval.ts`):

| Case | Result |
|---|---|
| `repeated_tool_mention` | 3/3 — one active mention, cleanly attached/updated with new plan-tier detail, never duplicated |
| `workflow_switch` | 3/3, zero duplicate-ID rejections — 2 trials fully consolidated onto Runway (the model itself treated it as correction-like); 1 trial left both tools independently active (treated as genuine sequential two-tool use). Both are legitimate, non-buggy interpretations — the acceptance bar (no crash, no silent drop) was about eliminating the *collision*, not mandating one semantic reading over the other |
| `same_tool_mentioned_again_later` | 3/3 — single active Kling mention survives two unrelated intervening turns, correctly re-attaches and updates at turn 4 |
| `correction` | 3/3 — Runway active, Midjourney superseded; **the original correction fix remains green** under the generalized resolver |
| `coexistence` | 3/3 — Kling and Pika both stay independently active, zero merges, zero invented corrections |
| `ambiguous_re_mention` | 3/3 — consolidates into one resolved `gemini-api` mention; the original ambiguous entry is superseded, not left as a stray duplicate (this is the same mechanism that would also close Finding F2 from `LIVE-RUNTIME-VALIDATION-REPORT-2026-08-08`, though that specific scenario wasn't re-run today) |

**Total `MUTATION_DUPLICATE_ID` rejections across 18 trials: 0.**

Acceptance criteria: zero silent drops ✓; zero duplicate-ID rejection for legitimate re-mentions ✓ (18/18); zero invented supersessions ✓ (`coexistence` never merged, 3/3); correction corpus remains green ✓ (3/3); no runtime regressions — see below.

## End-to-end regression sample

5 scenarios × 2 trials, full `runTurn()`, via the existing crc-engine battery harness (`--scenario=` filter, no new harness code): `correction_after_supersession`, `unresolved_ambiguity_across_turns`, `rich_first_turn`, `gate2_stabilization`, `phase_advances_within_bundled_turn`. All 10 runs matched their expected/original-battery behavior exactly — no new completions, no lost completions, no new errors. Full Jest suite: 470/470 relevant tests pass (same 2 pre-existing, unrelated failures as both prior reports, confirmed unchanged).

---

## Report

**Are proposal IDs now purely transport identifiers?** Yes, for tool mentions. `proposal_id` is used only as an input component when computing the turn-qualified `mention_id` string and as a within-turn dedup key (`retractedThisTurn`); nothing treats a bare `proposal_id` as persistent identity anymore.

**Is persistent identity fully deterministic?** Yes, for tool mentions — both minting (`t{turn}-{proposal_id}`, no randomness) and resolution (Step 1/Step 2, both pure functions over already-deterministic fields: `normalizeCandidate`'s existing registry lookup, exact-text matching) involve zero LLM decision-making about identity. **Not verified for `scoped_observation`** — that class's own analogous `proposal_id`-minting path (bare or `-corrected`) was deliberately left untouched, out of this task's explicit tool-mention scope. This is a disclosed, *unconfirmed* structural parallel, not an observed defect (no scoped_observation collision has ever surfaced live across either round of this work) — flagged for awareness, not treated as blocking.

**Can the Extraction→Mutation contract now be considered stable?** Yes, for tool mentions. The contract is now: the model proposes `raw_tool_name` and, optionally, `is_correction`/`correction_of_raw_text` — nothing else, nothing new; deterministic code (`normalizeCandidate` + `resolveToolMentionTarget`) resolves identity; `mutations.ts` applies it, semantics unchanged. Zero known collision paths remain for tool mentions.

---

## Final recommendation

**Live Runtime ready for production integration.**

Every acceptance criterion for this follow-up was met with zero exceptions across 18 focused-corpus trials and 10 end-to-end regression trials. The prior round's blocking finding (the `workflow_switch` collision) is now closed, and the fix that closed it is the same small, deterministic-resolution-ahead-of-mutation pattern the correction fix established — no architectural change, no broadened schema, no new model reasoning. The one remaining item (`scoped_observation`'s untouched, structurally-analogous, but never-observed-broken minting path) is noted for awareness and future scoping, not treated as a blocker — it wasn't part of what this task or the prior report scoped for closure, and nothing in either round's live testing has ever shown it failing.
