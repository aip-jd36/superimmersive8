# Prototype Beta Retrospective — CRC Core Engine (Retrieval + Projection + Integration)

**Type:** Milestone-closing document, not another architecture exercise. Closes Prototype Beta (Retrieval Engine, Projection Layer, and their end-to-end integration) and establishes the starting point for product-integration planning. `PROTOTYPE_ALPHA_RETROSPECTIVE.md` remains the authoritative record for the Interview Engine; this document does not restate it.

**Status:** Prototype Beta complete through Retrieval Phases 1–7, Projection Slices 1–3, and CRC end-to-end orchestration.

**Date:** 2026-08-08

**Branch/commit evidence:** `prototype/crc-retrieval-beta`, HEAD `77a6c86`. Full commit sequence: `1476dec` (Retrieval Phases 1–7) → `9be7435`/`a2ea562`/`7e155ea` (Matrix schema + Projection architecture, incl. the `candidate_statement` contract revision) → `9da12cc`/`c407da1`/`8d04041`/`c6d209c`/`a905809` (Projection Slices 1–3 + fixes) → `77a6c86` (end-to-end orchestrator).

---

## 1. Objective

Prototype Beta set out to prove four things Prototype Alpha explicitly could not: that Retrieval can deterministically consume `RetrievalHandoff`; that claim-level publication governance (`CRC-Eligible`) can be enforced machine-readably, not just as human-readable Matrix prose; that Projection can deterministically convert that governed knowledge into `ProjectionOutput` without an LLM; and that all three subsystems compose without hidden interpretation leaking across their boundaries.

## 2. What was validated

- **Deterministic Retrieval.** Zero LLM anywhere in the matching path — confirmed structurally (import-boundary tests), not just by absence of a model call. `retrieve()` is a pure function over `RetrievalHandoff` + `MatrixRow[]`.
- **Claim-level `CRC-Eligible` filtering.** The Matrix's migration to a per-row `CRC Claims` sub-table made this possible at all; `enumerate-eligible-claims.ts` filters `Yes`-only, and the compound ElevenLabs row (one `Yes` claim, one `No` claim) is the standing proof this works at claim granularity, not just row granularity.
- **`CRC Candidate Statement` opaque passthrough.** `RetrievalResult.candidate_statement` is copied verbatim by Retrieval, never interpreted; proven by a byte-for-byte passthrough test, and re-proven after the parenthetical-formatting fix touched a value carrying the same text.
- **Projection's isolation from Matrix/Living Notebook.** A filesystem-scanning test (not a hand-picked file check) confirms no file under `lib/projection-layer/` imports any Matrix-representing module, at any point in the chain, including through the orchestrator.
- **Deterministic "What we understood" generation.** `understood-summary.ts` renders from `RetrievalHandoff` alone via fixed templating — no LLM, validated against a 14-case fixture gallery of actual rendered text, not just pass/fail assertions.
- **Empty/sparse-state behavior.** Sparse input produces sparse output at every layer by construction (each clause function returns null on nothing-confirmed) — never padding, never a fabricated statement, never an error.
- **Full Interview → Retrieval → Projection integration.** `runCRCConversation()` chains `buildRetrievalHandoff` → `retrieve` → `assembleProjectionOutput`; validated end-to-end against 6 of the 8 canonical `DIALOGUE_FIXTURES` plus 2 synthetic edge cases, asserting on the final `ProjectionOutput`, not intermediate modules.
- **Orchestrator: sequencing only.** `run-crc-conversation.ts` contains zero conditionals on value content — the one branch that exists (all-empty output) lives inside `assembleProjectionOutput`, not duplicated in the orchestrator.
- **Subsystem import boundaries remain intact.** A single filesystem-scanning test suite (`subsystem-boundaries.test.ts`) covers all three subsystems plus the orchestrator; re-run after every change in this milestone, always clean.

**Current test count: 292/292 passing** (267 pre-integration + 25 orchestrator/boundary tests), `tsc --noEmit` clean, at `77a6c86`.

## 3. Important implementation findings

- **The claim-level Matrix schema was necessary, not optional.** Retrieval's original design assumed `CRC Publication Scope` was machine-readable at claim granularity; it wasn't until the Matrix migrated to a `CRC Claims` sub-table with a stable `Claim ID`. Retrieval Engine work was genuinely blocked on this for one design-review cycle before the schema migration unblocked it.
- **`candidate_statement` belongs on `RetrievalResult`, not behind a Projection-side lookup.** The original Projection design gave Projection its own `claim_id`-keyed lookup against the Matrix — rejected on review as a third data dependency and direct governance-source access. The fix was a narrow, additive extension to `RetrievalResult` itself, so Projection never touches the Matrix at all. This is the single most consequential design correction of Beta — it's the difference between Projection having zero governance-source access (what shipped) and Projection needing its own partial reimplementation of Retrieval's own data path (what was originally proposed).
- **Projection stayed fully deterministic.** No LLM was introduced anywhere in Projection, including the hardest case ("what we understood" prose generation) — templating proved sufficient for a first pass, though this remains a validated-against-fixtures assumption, not validated against real user reaction (see Open Items).
- **"Topics that often come up" has no governed content source and remains structurally unsupported.** Not an oversight — `ProjectionOutput` has no field for it at all, matching the Matrix's own current tool-row-only shape. Populating it requires a governance/indexing decision made elsewhere first.
- **Non-affirmative tool metadata is omitted from "What we understood" in v1.** A tool whose `access_surface`/`plan_tier` was never asked about, confirmed absent, or declined all render identically — as if never mentioned. Explicitly labeled `[PROTOTYPE ASSUMPTION — TO VALIDATE]` in code, per JD review — a deliberate v1 presentation choice, not a data-integrity defect (the underlying distinction is still recoverable from the raw handoff).
- **Gate 2 affects Interview completion but does not act as a downstream Retrieval/Projection gate.** Confirmed by inspection and by a dedicated end-to-end test: `RetrievalHandoff.certainty_state` is derived from `gate_1_state` alone (`handoff.ts`'s `CERTAINTY_STATE_BY_GATE_1` map); nothing downstream ever reads `gate_2_state`. A conversation mid-interview with `gate_2_state: 'not_yet_stable'` still produces a fully valid `ProjectionOutput` from whatever facts are currently confirmed. **Assessment: current evidence does not suggest this is harmful.** Gate 2's job — deciding whether Interview's own understanding has stabilized enough to stop asking questions — is orthogonal to what Retrieval/Projection do with whatever facts exist at any given snapshot; a mid-interview snapshot is not an invalid one, and the handoff contract was already designed to treat partial state as legitimate. This is recorded as an observed system property, not fixed.

## 4. Known open items

Genuine carried-forward work, separated from anything blocking:

- **Extraction `pending_clarification` / minimal conversational-context enhancement**, carried forward unchanged from the Alpha retrospective (Option D3, `{signal_id, kind, unresolved_summary}`) — still not implemented. **Does not block product integration on its own**, but see §Part 2 below: it becomes a much higher-priority gap once a live product needs multi-turn Interview conversations, for reasons beyond the original Alpha finding.
- **"Topics that often come up" lacks a governed source.** Does not block product integration — the section renders as absent, which is correct, documented behavior, not a defect to route around.
- **Deterministic "What we understood" remains a Prototype assumption to validate against real user-facing output.** Does not block a first product slice, but should be watched closely once real users see it — the fixture gallery proved internal consistency, not user-facing naturalness.
- **Gate 2 downstream non-effect**, per §3. Does not block product integration; recorded for visibility, not action.
- **Product-integration concerns the core-engine testing could not exercise, by design:** anything involving live conversation turns, session/state persistence, phase inference, or decline-scope inference. Prototype Beta's own tests deliberately took a finished `StructuredUnderstanding` as input (see the orchestrator's own architecture decision) — none of this was ever in scope for core-engine testing to cover, and none of it is validated yet. This is the largest genuine gap between what Beta proved and what a live product needs; addressed at length in the Part 2 planning response.

## 5. Graduation decision

**Prototype Beta core engine is complete and ready for product integration**, with the explicit caveat — not a blocker on the engine itself — that phase/decline inference (currently script-supplied everywhere, including in Beta's own tests) is a real, unbuilt product-integration prerequisite, addressed as its own first-class question in the accompanying Part 2 planning response, not silently absorbed into "ready."

Evidence: 292/292 tests passing across a from-scratch Retrieval Engine, a from-scratch Projection Layer, and their end-to-end composition; every claim-level governance rule enforced deterministically; zero LLM anywhere in Retrieval or Projection; two real design corrections made and re-verified (the Matrix schema migration, the `candidate_statement` contract revision) rather than deferred or patched around; subsystem boundaries verified structurally, not by discipline alone, at every stage including the new orchestrator. No architectural contradiction was found during integration, and boundary guarantees are stronger after integration than before it (one comprehensive filesystem scan replacing several narrower per-module checks).
