# Living Knowledge onboarding benchmark ledger

**Status: prospective infrastructure, effective LK-68 (2026-08-31).** Use this for Trial 4 onward. Trials 1-3's own historical records (including `LK-4-SYNTHESIA-BENCHMARK-LOG.md` in this directory) are not rewritten or backfilled into this format — they remain evidence with their own existing limitations, as recorded in the LK-67 closeout.

## What this is

A small, append-only, repository-local event ledger for measuring Living Knowledge onboarding trials as they actually happen — not reconstructing them afterward from conversation memory. It is pure measurement infrastructure: it has no import relationship with, and no influence over, Living Knowledge, Retrieval, Bounded Interpretation, Composition, questioning, or Track A/B/C. See `08_Platform/app/__tests__/lk-benchmark/architecture-isolation.test.ts`.

Code: `08_Platform/app/lib/lk-benchmark/` (`types.ts`, `ledger.ts`, `summary.ts`, `cli.ts`).
Data: one `<TRIAL_ID>.jsonl` file per trial, in this directory — one JSON event object per line, append-only.

## Event taxonomy

`TRIAL_START`, `MACHINE_STAGE` (start/end, `completed`|`failed`), `HUMAN_REVIEW_TURN` (60s modelled), `MANUAL_ORCHESTRATION_HANDOFF` (15s modelled), `ARCHITECTURE_DISCOVERY`, `PROCESS_FRICTION`, `TRIAL_END`.

## Governance boundary — read before using

Recording a `HUMAN_REVIEW_TURN`, `ARCHITECTURE_DISCOVERY`, or `PROCESS_FRICTION` event — including its `note` field — **never constitutes, infers, or records a governance decision.** The actual decision (FGR ADOPT/REVISE/REJECT, CPR APPROVE/WITHHOLD/REVISE/STOP) lives only in its own governance artifact under `../notebook/governance-reviews/`. This ledger only ever appends already-decided facts supplied by its caller; it never advances a Candidate lifecycle, never sets CRC eligibility, and never touches CRC runtime state.

## Usage (starting with Trial 4)

```
cd 08_Platform/app
npm run lk-benchmark -- trial-start <TRIAL_ID> --provenance "..."
npm run lk-benchmark -- stage-start <TRIAL_ID> <label> --provenance "..."
npm run lk-benchmark -- stage-end   <TRIAL_ID> <label> --provenance "..."
npm run lk-benchmark -- stage-fail  <TRIAL_ID> <label> --provenance "..."
npm run lk-benchmark -- hrt         <TRIAL_ID> --provenance "..." [--note "..."]
npm run lk-benchmark -- handoff     <TRIAL_ID> --provenance "..." [--note "..."]
npm run lk-benchmark -- friction    <TRIAL_ID> --provenance "..." --note "..."
npm run lk-benchmark -- discovery   <TRIAL_ID> --provenance "..." --note "..."
npm run lk-benchmark -- trial-end   <TRIAL_ID> --provenance "..."
npm run lk-benchmark -- summary     <TRIAL_ID>
```

Timestamps are always captured as real "now" at the moment each command runs — never caller-suppliable. `MACHINE_STAGE` durations are always a real measured `end - start`; an end/fail with no matching open start fails closed rather than fabricating a duration. A stage started but never ended/failed is reported as dangling and excluded from every total, never silently treated as complete.

## Terminology discipline

The `summary` command's output always computes:

```
modelled human seconds = HRT_count * 60 + handoff_count * 15
attended-processing lower bound = measured completed MACHINE_STAGE seconds + modelled human seconds
```

and always states, verbatim, that this lower bound is **not** total onboarding time — unmeasured human source-reading, unmeasured external-model processing, failed/dangling stage time, and operator-unavailable intervals are excluded. See `08_Platform/app/lib/lk-benchmark/summary.ts`'s `LOWER_BOUND_DISCLAIMER`.

## Example

`LK-68-INSTRUMENTATION-VALIDATION.jsonl` in this directory is a real, genuinely-dogfooded validation trial from LK-68 itself (a bracketed typecheck + full test-suite run) — not a Living Knowledge onboarding trial. It is retained as a working example of the format, clearly distinguished by its trial ID from any real trial.
