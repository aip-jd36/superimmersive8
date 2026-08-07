# Prototype Alpha Retrospective — CRC Interview Engine

**Type:** Engineering retrospective. Not a PRD, not an architecture document, not a plan. Formally closes Prototype Alpha and establishes the starting point for Prototype Beta. Nothing here is normative for Beta except the graduation decision itself; recommendations are recommendations, not commitments.

**Status:** Prototype Alpha complete through Phase 7 (mock dry run + live-model battery) and the Extraction Adapter Context design review. This document supersedes nothing — `PHASE_6A_RETROSPECTIVE.md` remains the authoritative record of Extraction's own acceptance; this document synthesizes across all phases plus the evidence Phase 6a's own retrospective predates.

**Date:** 2026-08-08

**Evidence base:** Phases 1–5 (`CRC_PROTOTYPE_ALPHA_ROADMAP.md`), Phase 6a (`PHASE_6A_RETROSPECTIVE.md` + 7 preserved eval reports), Phase 6b/6c (roadmap sections + preserved eval reports), Phase 7 planning (`PHASE_7_PLANNING.md`), Phase 7 mock dry run (3 preserved reports), Phase 7 live-model battery (1 preserved report + full raw transcript reviewed directly), and the Extraction Adapter Context Review (chat record, 2026-08-08). Every claim below is traceable to one of these; none are asserted from memory alone.

---

## 1. Executive Summary

**Did Prototype Alpha achieve its objective?** Yes. The roadmap's own definition of success was explicit and modest: *"prove the Interview Engine architecture survives contact with a real implementation... Success is a debuggable verdict — what worked, what broke, what needs to change before Retrieval connects — not a shipped feature."* That verdict now exists, with evidence: every subsystem was built deterministic-first and tested in isolation before integration (Phases 1–5), every LLM-adjacent subsystem was evaluated independently before being chained together (Phase 6a/6b/6c), and the full chain was then run against nine scripted scenarios twice — once fully deterministically (mock dry run) and once against real, live model calls (the battery) — with every material divergence traced to a specific, nameable cause, never a diffuse "something in the model layer."

**Was the Interview Engine architecture validated?** Yes, with one clearly-scoped exception. The deterministic core — Structured Understanding, mutation/supersession, Gate 1, Gate 2, Constraint B, signal lineage, handoff assembly — passed with **zero defects** across four independent evaluation waves (native phase tests, Phase 6b/6c real-model pressure, the Phase 7 mock dry run, and the Phase 7 live battery). The one substantive architectural finding — Extraction's turn-only input contract is insufficient to correctly interpret a reply to CRC's own clarifying question — is real, reproducible (3/3 live runs), and now formally analyzed (Extraction Adapter Context Review), but it degrades gracefully: it causes conversations to stall short of Gate 1, never to produce incorrect or fabricated handoff data. The contract that Retrieval will actually consume was never shown to be wrong.

**What confidence should we have before beginning Retrieval?** High for the deterministic core and the handoff contract specifically — this is what Retrieval integrates against, and it is the most heavily tested part of the whole prototype. Moderate-to-high for the LLM-adjacent subsystems — extensively evaluated, behavior is well-characterized (including its variance), one known gap is precisely scoped and does not corrupt data, only completion rate for a specific conversational pattern.

---

## 2. Architectural Findings

### Validated

Architectural ideas that survived implementation exactly as designed, with the evidence that supports each claim.

- **Structured Understanding domain model.** All 8 original dialogue fixtures instantiated in Phase 1; Alpha 0 round-trip serialization (including `superseded_by` link integrity) confirmed the same phase. The type model required exactly two additions across the entire rest of the project — the `AttestedFact<T>` provenance wrapper on `ProjectFacts`, and moving `access_surface`/`plan_tier` from `ProjectFacts` to `ToolMention` — both made in Phase 1–3, both completions of gaps Phase 1's own post-completion review had already flagged, neither a response to a later failure. No type redesign was ever triggered by anything found in Phase 6 or 7.
- **Mutation/supersession model.** Supersede-and-mark (never destructive edit) held from Phase 2's original test suite through the Phase 7 live battery, five phases later — `signal-lineage.test.ts`'s explicit confirmation that "supersession never merges or removes the underlying records" is the same invariant Phase 2 established, re-verified live, not re-derived.
- **Gate 1.** Zero defects found in `evaluateGate1` itself across Phase 3's 14 cases or the entire Phase 7 live battery. The one Gate-1-shaped issue found (`current_vs_historical`/`ambiguous_uncertain` fixtures declaring `gate_1_state: 'met'` while `intended_use` was `unknown`) was traced to `fixtures.ts` predating `gates.ts` and never being checked against it — a stale-fixture bug, not a Gate 1 defect. `evaluateGate1` computed the (different, correct) answer every time it was actually run against real data.
- **Gate 2 (core mechanism).** Same story as Gate 1 — the stability/material-change logic itself was never wrong; see "Refined" below for what *was* an open question (the phase-vs-interview scope approximation), which is a different claim from the core diffing logic being unsound.
- **Boundaries / Constraint B.** Zero defects across Phase 4's 18 tests, Phase 6b's adversarial-injection track, and the live battery. `full_opt_out`'s decline handling (Gate 1 → `not_applicable_declined`, Gate 2 → `DECLINE_BLOCKS_STABILITY`, Constraint B → `end_interview`/`USER_DECLINED_INTERVIEW`) reproduced identically in every live run. Rule 5's once-per-interview cap fired correctly in 5/5 live probe runs — first disentangling question always allowed, second always suppressed, ambiguity never resolved by guessing.
- **Eligible signals (deterministic derivation feeding a live model).** 100% valid signal-reference rate across Phase 6b's real-model trials; zero hallucinated `target_signal_id` anywhere in the project, including the live battery. This is the pattern — "model selects from a derived, revalidated set; deterministic code rejects anything else" — that the Extraction Adapter Context Review recommends extending to Extraction itself, precisely *because* it has never once failed.
- **Signal lineage (the Phase 7 boundary-cap fix).** 11/11 dedicated tests pass, covering all 5 required cases plus multi-hop chains and project-fact ids. Not independently re-exercised by the live battery (no live run happened to produce a genuine same-lineage repeat case), but nothing in the battery contradicts it either.
- **Handoff contract.** Zero defects. Every one of the 23 completed live-battery runs produced a structurally valid handoff, including partial, declined, and Gate-1-unmet states — the contract's own design promise (sentinel values like `'unresolved'`/`'unclear'`/`'declined'` are complete, valid answers, never gaps requiring special-casing) held under real, uncontrolled model output, not just mocked states.
- **Deterministic/LLM separation ("Extraction proposes, Mutation decides," and its analogues at every later stage).** The single most validated principle in the project. Every failure found across Phases 6a–7 — without exception — traces cleanly to *either* the deterministic layer (which had zero confirmed defects in its own logic across the whole project) *or* the LLM-adjacent layer (extraction, generation, decision). No failure ever required attributing blame to both, and no fix ever required changing both. That clean separability is itself the architecture's central bet, and it held.

### Refined

Ideas that remain sound but are now better understood than when Prototype Alpha began.

- **Gate 2 phase/interview scope.** Started as an acknowledged approximation (Phase 3: "is my Gate-1-relevant understanding stable" standing in for a true phase partition, because `ScopedObservation` has no phase tag). Phase 7 didn't resolve the approximation — it *measured* it: 3/54 live turns disagreed between scopes, and 0 of those disagreements changed a run's actual `completion_reason`. The approximation is now empirically characterized, not just architecturally justified, and the original "revisit only if evidence shows a behavioral problem" condition has been tested twice (mock dry run + live battery) without tripping.
- **Rule 5's disentangling cap.** Started as an explicitly-flagged prototype assumption (once-per-interview, not dictated by the PRD's own wording). Phase 7's dedicated probe confirmed the *current* scope behaves correctly and safely (never guesses, correctly caps). The deeper question — whether once-per-interview or once-per-bundle is the right product semantics — remains open (see below); what's refined is that the *mechanism itself* is now proven, not assumed.
- **Candidate-question generation.** Phase 6b validated the mechanism (100% valid references). The Phase 7 live battery validated it operates sensibly across 9 real scenario shapes, but also surfaced real run-to-run variance — the same underlying tool-mention state produced different Constraint A verdicts on different runs about whether "team API plan" needed a follow-up. Refined from "works" to "works, with characterized variance," and — importantly — partially *explained*: much of that variance traces to Finding 1's incomplete wiring (below), not pure model noise.
- **Evaluation methodology itself.** The live battery revealed that automated `diff.passed` scoring, which worked cleanly for the mock dry run (both sides used the same hand-picked ids), is structurally meaningless against live-model output — the live extractor mints its own ids, which will essentially never match a hand-authored expectation's ids. This is a genuine methodological lesson: future live evaluations need semantic comparison (was the right fact captured, correctly scoped, correctly resolved), not id-based diffing, as the primary signal.
- **Extraction's input contract.** Phase 6a explicitly deferred any question of conversational context ("Extraction only turns existing user turns into facts; it does not decide what to ask next" — true, but silent on whether it needs to know what was just asked). What was an *unexamined* assumption is now an *empirically tested and found-wanting* one, formally scoped in the Extraction Adapter Context Review.

### Open

Genuine open architectural questions, not implementation work.

- **Should Extraction receive any state/context beyond the current turn's raw text, and if so, what shape?** The subject of the Extraction Adapter Context Review and this document's final section. Not decided.
- **Rule 5's cap scope** — once-per-interview vs. once-per-bundle — is still genuinely untested. Phase 6b's own Scenario B (two independent bundled ambiguities) was inconclusive; Phase 7's probe tested the *current* scope's correctness, not whether the *alternative* scope would behave differently. No scenario has ever cleanly exercised two independent bundled ambiguities in the same interview.
- **Confidence vs. completeness** (architecture doc §10) — flagged unresolved since Phase 3, never revisited, still open.
- **Whether Gate 2's phase-vs-interview approximation needs an eventual type-level fix** (a phase tag on `ScopedObservation`). Explicitly deferred again — two full evaluation cycles have now run without evidence forcing it, but "not yet forced" is not the same as "resolved."
- **What accuracy/consistency bar is actually required of Constraint A and candidate generation for a real product.** Phase 6c's 91–93% direction accuracy and imperfect reason-code consistency were accepted as evidence the categorical approach *works*, not benchmarked against a required threshold — because no such threshold has ever been set. This is a product/evaluation-philosophy question, not an engineering one, and it's still open.

---

## 3. Prototype Alpha Findings

Every meaningful finding from the whole prototype, classified. "Blocks Beta" means: must be resolved before Beta work can proceed at all — not "should be fixed early in Beta."

| # | Finding | Category | Why this category | Blocks Beta? |
|---|---|---|---|---|
| 1 | `ProjectFacts.access_surface`/`plan_tier` modeled project-wide, not per-tool (Phase 1) | Interface-contract issue | Type didn't match domain reality (Matrix already splits tools by surface) | No — fixed in Phase 3, before it ever shipped anywhere |
| 2 | Gate 2 phase-vs-interview scope has no true partition in the type model | Architecture issue | A genuine, acknowledged gap in what the type model can represent, not a bug in the code that reads it | No — empirically shown not to matter across two evaluation cycles; explicitly deferred by design |
| 3 | Extraction eval harness: token usage always reported 0/0 | Evaluation harness issue | Diagnostics function built but never wired in | No — fixed same-day |
| 4 | Extraction eval harness: `kling`/`elevenlabs` false-resolution heuristic bug | Evaluation harness issue | Scorer flagged tool names as illegal because they equal their own canonical slug | No — fixed same-day |
| 5 | `raw_tool_name` over-capture (whole clause instead of tool name) | Prompt/schema issue | Fixed by one field description + examples, no code/architecture change | No — fixed, held through every later phase |
| 6 | Extraction diagnostic scorer: duplicate-candidate `.find()` bug | Evaluation harness issue | Picked the wrong candidate when two shared identical `raw_text` | No — fixed same-day |
| 7 | Uncertainty/no-visibility conflated with confirmed-absence | Prompt/schema issue | Fixed by one new system-prompt rule + worked example | No — fixed, held through every later phase |
| 8 | Phase 6b Scenario B (two independent bundled ambiguities) produced no usable evidence | Fixture issue | Scenario design left `intended_use` unestablished, letting the model fixate elsewhere | No, but genuinely unresolved — carried forward as an Open question |
| 9 | `tool_tier_unknown_irrelevant`: Constraint A consistently over-asks | Expected model variance | JD's own explicit classification: one persistent, well-reasoned miss, not evidence of a systemic problem | No |
| 10 | Constraint A reason-code accuracy trails direction accuracy | Fixture issue + expected model variance | Corpus's `acceptable_reason_codes` sets were narrower than legitimately-overlapping categories in several cases | No |
| 11 | One malformed-JSON schema failure (Phase 6c) | Adapter implementation issue | Transient provider output failure, not reproduced, no retry logic existed to absorb it | No |
| 12 | `run-dialogue.ts`: `opt_out_scope` only assembled after the full turn loop, not per-turn | Architecture issue (orchestrator-level, not a frozen module) | Both `evaluateGate1`'s decline branch and `evaluateGate2`'s decline check needed to see it mid-run | No — found and fixed before any scenario ran against it |
| 13 | Two fixture-authoring id-suffix bugs (`tm-2-resolved`, `so-1c-corrected`) | Fixture issue | My own assumption didn't account for `attestCandidate`'s auto-suffixing; the deterministic modules were correct | No — fixed same-day |
| 14 | `CandidateObservation` had no field for direct-statement `access_surface`/`plan_tier` | Interface-contract issue | The extraction-candidate *type* was missing fields Extraction's own output type (`ToolMention`) already had | No — fixed |
| 15 | `ambiguous_multi_surface_tool`'s original turn-2 fixture wording didn't disambiguate against the real normalizer | Fixture issue | Verified by direct execution: the negation tripped a pattern with no negation awareness — `normalizeCandidate` behaved correctly against what it was given | No — fixed by rewording, normalizer untouched |
| 16 | Boundary caps reset across supersession (a follow-up on a corrected signal gets a fresh cap) | Architecture issue | A real gap in how Constraint B's per-signal caps interacted with Phase 2's own supersession mechanism | No — fixed via a new orchestration-layer module that doesn't modify `boundaries.ts` |
| 17 | Finding 1's direct-statement hint channel never reaches the live extractor | Adapter implementation issue | `anthropic-extractor.ts`'s own schema/prompt were never extended to expose the new hint fields — the type-level fix (#14) was necessary but not sufficient | No, but a real, material Beta priority — directly causes avoidable Constraint A follow-ups (see #21) |
| 18 | `ambiguous_multi_surface_tool` failed to disambiguate in 3/3 live runs | Architecture issue | Extraction has no way to know a reply is answering a specific pending clarification — not fixable by prompting the current input, because the needed information isn't present in it at any level | No — degrades to "conversation doesn't complete," never to incorrect handoff data; see Extraction Adapter Context Review |
| 19 | 3 live-battery runs lost entirely to transient schema failures, no retry logic | Production engineering concern | A real gap for any future production harness, not a Prototype Alpha architecture question | No |
| 20 | `diff.passed` is structurally meaningless against live-model output (id-mismatch artifact) | Evaluation harness issue | My own reporting design compared hand-picked ids against model-minted ids — a methodology limitation, not an Interview Engine finding | No, but should inform Beta's evaluation harness design |
| 21 | Constraint A run-to-run inconsistency on already-stated-but-unextracted facts | Expected model variance, compounded by #17 | Partially explained by a real deterministic cause (missing extraction data), not pure sampling noise | No |

---

## 4. Prototype Beta Recommendations

### Required before Retrieval

This list is short, and that is itself a finding, not an omission. Retrieval integrates against the **handoff contract** — and every open issue above degrades into either "the conversation doesn't reach handoff assembly" or "the handoff is sparser than it could be," never into "the handoff contains incorrect or fabricated data." The contract's own design already treats sparse fields as valid, complete answers (§5's Validated findings). Given that, nothing found in Prototype Alpha demonstrates a genuine blocking prerequisite:

- **None.** The one candidate — closing Finding 1's channel 1 (#17) so handoffs are richer — is a data-*quality* improvement, not a data-*integrity* requirement; a sparse-but-honest handoff is exactly what the contract already promises and Retrieval must already be designed to accept. Stating this explicitly as a hard design constraint for whoever builds Retrieval is worth doing, but it is a restatement of an already-tested guarantee, not new engineering work.

### Recommended during Beta

- **The Extraction Adapter context change** (Option D-family — see final section for the specific variant recommended). Directly addresses finding #18, the most severe open item.
- **Close Finding 1's channel 1** — extend `anthropic-extractor.ts`'s own schema/prompt to actually emit the hint fields `CandidateObservation`'s type already supports. Directly reduces the avoidable-follow-up pattern observed in #21.
- **Add retry-on-transient-schema-failure** to any future live-model evaluation harness (#19) — a production-engineering gap, cheap to close, currently absorbs an entire run's evidence on one bad parse.
- **Resolve Rule 5's cap-scope open question** with a properly-designed two-independent-ambiguities scenario — Phase 6b's own attempt didn't produce usable evidence; a second attempt, informed by that failure, is warranted before treating once-per-interview as settled product behavior.
- **Revisit Constraint A's reason-code granularity** — a known, minor, already-diagnosed refinement opportunity (#10), not urgent.
- **Redesign the live-model evaluation harness's comparison logic** around semantic correctness rather than id-matching (#20), informed directly by this battery's own experience.
- **Decide the confidence-vs-completeness open question** (architecture doc §10) if and when it starts to matter practically — no evidence yet that it does.

### Future ideas (explicitly out of scope)

- **A phase tag on `ScopedObservation`** to close the Gate 2 approximation precisely — only if a future evaluation cycle demonstrates an actual behavioral problem the approximation causes. None found across two full cycles.
- **Broader, Option-C-style structured extraction context** (unresolved project facts, phase-awareness, not just the single pending-clarification concept) — only if Beta usage demonstrates the same clarification-failure pattern in non-tool-mention contexts. Not yet demonstrated.
- **A general conversational-memory layer for Extraction** beyond a single, narrowly-scoped pending-clarification concept — explicitly considered and rejected in the Extraction Adapter Context Review as unjustified complexity. Recorded here so it isn't quietly reconsidered later without the same rigor applied to reject it once already.

---

## 5. Graduation Decision

**Recommendation: Prototype Alpha successfully validates the Interview Engine and should be considered complete.**

Evidence supporting this over the alternatives:

- The one substantive architectural finding (Extraction's input contract) is precisely scoped, does not corrupt the handoff contract Retrieval will actually consume, and has a specific, low-risk, already-precedented design direction waiting for Beta rather than an open-ended unknown.
- The deterministic core — the majority of the Interview Engine by both line count and by how much of the architecture's own risk the roadmap assigned to it — passed with zero defects across four independent evaluation waves using genuinely different evidence each time (native tests, real-model pressure in Phase 6, a fully mocked integration run, and a fully live integration run). That is a substantially more thorough validation than the roadmap's own minimum bar required.
- Every failure found, across the entire prototype, was attributable to a specific, nameable cause and resolved (or precisely scoped, in Extraction's case) without ever requiring an architectural principle to be abandoned or a frozen module's core logic to change. "Propose vs. decide," Extraction/Retrieval independence, supersede-and-mark, and the deterministic/LLM separation itself all held under real, adversarial, and live pressure.
- The roadmap's own definition of success — a debuggable verdict, not a shipped feature — has been fully delivered, with this document as its record.

I considered and rejected "requires one additional engineering milestone before graduation." The case for that position rests on closing the Extraction context gap first; I don't find it decisive, because the gap's failure mode is conversation non-completion, not data corruption, and Retrieval's own design already has to treat sparse handoffs as valid. Gating graduation on it would be requiring a Beta-track fix to happen before Beta starts, which is a scheduling distinction without an architectural justification.

---

## One additional design review: is `question_text` required?

The Extraction Adapter Context Review recommended Option D:

```
pending_clarification { signal_id, kind, question_text }
```

Re-examining whether `question_text` earns its place, against three variants:

**D1 — `{ signal_id, kind }` alone.** Under-specified as stated: a bare id and kind ("tm-1, tool_mention") tells the extractor nothing about *what* is unresolved unless it can also look up the record — which means D1 either requires full `StructuredUnderstanding` access (reopening exactly the scope question the original review deliberately narrowed) or is simply not actionable on its own. D1 as literally specified doesn't survive scrutiny; the real comparison is between D2 and a corrected version of D1.

**D2 — `{ signal_id, kind, question_text }`, the original proposal.** Works, but `question_text` is *raw output from the candidate-question generator's own live model call* — an LLM's prose, generated fresh each run, threaded directly into a *different* LLM's input on the next turn. Every other cross-subsystem contract in this codebase is deterministic state (`StructuredUnderstanding`, eligible signals, boundary state) — nothing else in the entire pipeline passes one subsystem's raw natural-language output directly into another subsystem's prompt. This is a materially different, and new, kind of coupling. It also isn't hypothetical: the live battery *just* demonstrated real run-to-run variance in how CRC phrases its own follow-up questions for the identical underlying state (rich_signal run 2's Constraint A flip-flop is one instance of this same variance). Tying Extraction's future behavior to that variable phrasing means the fix's reliability partially inherits the candidate-question generator's own inconsistency — measured, in this project, not assumed.

**D3 (recommended) — `{ signal_id, kind, unresolved_summary }`**, where `unresolved_summary` is a small, deterministic, templated rendering of the record itself (e.g. `"tool mention 'Nano Banana', candidates: gemini-api, gemini-consumer-app"` for a tool mention; `"project fact intended_use, currently unknown"` for a project fact) — computed by a pure function of `StructuredUnderstanding`, the same shape of function `deriveEligibleSignals` already is, not by copying anything a live model said.

| Criterion | D1 (as stated) | D2 | D3 (recommended) |
|---|---|---|---|
| Minimal coupling | Under-specified — not actually usable alone | Couples Extraction to another subsystem's live, non-deterministic output | Couples Extraction only to SU-derived state — same class as every other subsystem |
| Auditability | N/A | Depends on which exact question a specific run happened to generate | Fully reproducible — re-run the same pure function against the same SU, get the same answer |
| Deterministic architecture | N/A | Breaks it partially — live output feeding live input | Fully preserved — matches the `deriveEligibleSignals` precedent exactly |
| Implementation complexity | Lowest, but incomplete | Low | Low — one small templated-formatting function, no prompt-engineering risk in the derivation itself |
| Expected extraction quality | Unusable as specified | Good when the question happens to be clear; inherits the generator's own observed variance | Comparable or better — stable, consistent framing every time, not dependent on a specific run's phrasing |

**Recommendation: D3.** It solves the same problem D2 was designed for, with less coupling, full determinism, and — directly supported by this battery's own evidence of candidate-question phrasing variance — a more reliable input than parroting back a live model's prose. Not implemented in this pass, per instruction.
