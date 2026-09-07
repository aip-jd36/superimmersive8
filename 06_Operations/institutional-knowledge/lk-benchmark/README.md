# Living Knowledge onboarding benchmark ledger

**Status: prospective infrastructure, effective LK-68 (2026-08-31); measurement semantics corrected LK-82 (2026-09-01).** Use this for Trial 4 onward. Trials 1-3's own historical records (including `LK-4-SYNTHESIA-BENCHMARK-LOG.md` in this directory) are not rewritten or backfilled into this format — they remain evidence with their own existing limitations, as recorded in the LK-67 closeout.

## What this is

A small, append-only, repository-local event ledger for measuring Living Knowledge onboarding trials as they actually happen — not reconstructing them afterward from conversation memory. It is pure measurement infrastructure: it has no import relationship with, and no influence over, Living Knowledge, Retrieval, Bounded Interpretation, Composition, questioning, or Track A/B/C. See `08_Platform/app/__tests__/lk-benchmark/architecture-isolation.test.ts`.

Code: `08_Platform/app/lib/lk-benchmark/` (`types.ts`, `ledger.ts`, `summary.ts`, `cli.ts`).
Data: one `<TRIAL_ID>.jsonl` file per trial, in this directory — one JSON event object per line, append-only.

## Event taxonomy

`TRIAL_START`, `MACHINE_STAGE` (start/end, bracketed elapsed, `completed`|`failed`), `MACHINE_EXECUTION` (LK-82, measured), `HUMAN_REVIEW_TURN` (60s modelled), `MANUAL_ORCHESTRATION_HANDOFF` (15s modelled), `ARCHITECTURE_DISCOVERY`, `PROCESS_FRICTION`, `PROCESS_WAIT` (LK-82, no duration), `OPERATOR_UNAVAILABLE` (LK-82, no duration), `UNMEASURED_WORK` (LK-82, no duration), `TRIAL_END`.

## Trial lifecycle — read before calling `trial-end`

One `<TRIAL_ID>.jsonl` ledger corresponds to **one provider Living Knowledge onboarding cycle, start to true finish** — never one milestone, task, or CLI session within that cycle.

- `trial-start` is called exactly once, at the beginning of a provider's onboarding.
- Every intermediate milestone — evidence research, FGR, CPR, Matrix work, publication, integration, production-effectiveness checks, closeout analysis — records its own events into the **same open trial** (`stage-start`/`stage-end`/`stage-fail`, `hrt`, `handoff`, `friction`, `discovery`, `process-wait`, `operator-unavailable`, `unmeasured-work`, `machine-execution`), but **never calls `trial-end`.**
- `trial-end` is called **exactly once**, only when the provider onboarding cycle reaches its true terminal outcome — normally confirmed production effectiveness, or an explicit terminal abandonment/NO-GO decision. It is **never** called merely because one milestone, task, or CLI invocation has finished.
- `trial-end` is structurally irreversible: `ledger.ts`'s `requireTrialOpen()` fail-closes on every subsequent write to a trial that already has a `TRIAL_END` event, and there is no reopen mechanism anywhere in this module. Calling it too early does not corrupt or invalidate the ledger — it permanently and correctly turns that trial into the historical record of a shorter-than-intended segment.
- **Recovery from a premature `trial-end`:** do not edit, delete, or attempt to work around the closed trial. Start the next sequential `LK-TRIAL-<N>` and reference the prematurely-closed trial's ID and reason directly in the new trial's `TRIAL_START` `provenance` field — there is no dedicated schema field for this relationship, and `provenance` (free text, uncapped) is the only honest channel available without a schema change. The original trial stays untouched and immutable; report it and its continuation as two distinct segments with an explicit gap between them, never silently summed into one combined duration.
- **Cautionary precedent:** `LK-TRIAL-7` (2026-09-07) was closed by `trial-end` at the end of what was actually only a first readiness-review milestone, not the onboarding's true end. The ledger correctly fail-closed on every further write. Recovery was `LK-TRIAL-8`, opened as an explicit continuation referencing `LK-TRIAL-7` in its own `TRIAL_START` provenance, which later reached the cycle's real terminal outcome and was closed correctly. `LK-TRIAL-7` remains preserved, unedited, as the record of the mistake.

## Governance boundary — read before using

Recording a `HUMAN_REVIEW_TURN`, `ARCHITECTURE_DISCOVERY`, `PROCESS_FRICTION`, `PROCESS_WAIT`, `OPERATOR_UNAVAILABLE`, or `UNMEASURED_WORK` event — including its `note` field — **never constitutes, infers, or records a governance decision.** The actual decision (FGR ADOPT/REVISE/REJECT, CPR APPROVE/WITHHOLD/REVISE/STOP) lives only in its own governance artifact under `../notebook/governance-reviews/` (or, for the Matrix-native light path, inline in `../notebook/PLATFORM-RIGHTS-MATRIX.md`). This ledger only ever appends already-decided facts supplied by its caller; it never advances a Candidate lifecycle, never sets CRC eligibility, and never touches CRC runtime state.

## Usage (starting with Trial 4)

```
cd 08_Platform/app
npm run lk-benchmark -- trial-start          <TRIAL_ID> --provenance "..."
npm run lk-benchmark -- stage-start          <TRIAL_ID> <label> --provenance "..."
npm run lk-benchmark -- stage-end            <TRIAL_ID> <label> --provenance "..."
npm run lk-benchmark -- stage-fail           <TRIAL_ID> <label> --provenance "..."
npm run lk-benchmark -- machine-execution    <TRIAL_ID> <label> --provenance "..." -- <command> [args...]
npm run lk-benchmark -- hrt                  <TRIAL_ID> --provenance "..." [--note "..."]
npm run lk-benchmark -- handoff              <TRIAL_ID> --provenance "..." [--note "..."]
npm run lk-benchmark -- friction             <TRIAL_ID> --provenance "..." --note "..."
npm run lk-benchmark -- discovery            <TRIAL_ID> --provenance "..." --note "..."
npm run lk-benchmark -- process-wait         <TRIAL_ID> --provenance "..." --note "..."
npm run lk-benchmark -- operator-unavailable <TRIAL_ID> --provenance "..." --note "..."
npm run lk-benchmark -- unmeasured-work      <TRIAL_ID> --provenance "..." --note "..."
npm run lk-benchmark -- trial-end            <TRIAL_ID> --provenance "..."   # see Trial lifecycle above first
npm run lk-benchmark -- summary              <TRIAL_ID>
```

Timestamps are always captured as real "now" at the moment each command runs — never caller-suppliable, so nothing can be backdated or reconstructed from memory. `note` fields are capped at 200 characters (`MAX_NOTE_LENGTH`); `provenance` is free text and uncapped, but should stay a short descriptive label, not a narrative — full reasoning belongs in the milestone's own report or governance artifact, never forced into a benchmark field. A `MACHINE_STAGE` end/fail with no matching open start fails closed rather than fabricating a duration; a stage started but never ended/failed is reported as dangling and excluded from every total, never silently treated as complete.

## Terminology discipline

Three timing categories are structurally separate in `summary.ts` and are never blended:

- **MEASURED** — `MACHINE_EXECUTION` only: a single CLI invocation that spawns and owns a real subprocess from immediately before spawn to immediately after exit. The only event type whose duration may honestly be called measured execution.
- **MODELLED** — `HUMAN_REVIEW_TURN` (60s) / `MANUAL_ORCHESTRATION_HANDOFF` (15s): fixed planning-assumption constants, not observed human latency.
- **BRACKETED** — legacy `MACHINE_STAGE` elapsed intervals: the wall-clock gap between two *separate*, operator-issued CLI invocations (`stage-start`, then later `stage-end`/`stage-fail`). Nothing owns or observes what happens in between — the interval may contain real work, human review, model/network waiting, or the operator simply being away. **Never call this "measured" or "active engineering time."**

`summary`'s combined measured+modelled subtotal = `MACHINE_EXECUTION` measured seconds + modelled human seconds **only** — it deliberately excludes bracketed-stage seconds, is not total onboarding time, and is not labor. `PROCESS_WAIT` / `OPERATOR_UNAVAILABLE` / `UNMEASURED_WORK` carry no duration by design and are reported only as counts when the operator explicitly records them — never inferred from an unexplained timestamp gap. An interval nothing explicitly marks simply stays unexplained. `TRIAL_START` → `TRIAL_END` wall-clock time is reported completely separately from every category above and is never decomposed from it. See `summary.ts`'s own `COMBINED_SUBTOTAL_DISCLAIMER` and `BRACKETED_DISCLAIMER`.

## Example

`LK-68-INSTRUMENTATION-VALIDATION.jsonl` in this directory is a real, genuinely-dogfooded validation trial from LK-68 itself (a bracketed typecheck + full test-suite run) — not a Living Knowledge onboarding trial. It is retained as a working example of the format, clearly distinguished by its trial ID from any real trial.
