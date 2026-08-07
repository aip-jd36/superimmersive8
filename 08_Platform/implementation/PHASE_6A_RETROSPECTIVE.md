# Phase 6a Retrospective — Extraction (Isolated)

**Type:** Engineering retrospective. Not a PRD, not an architecture document, not a plan. Records what Phase 6a set out to prove, what actually happened, and what the evidence supports — nothing here is normative for future phases except the acceptance decision itself.

**Status:** Phase 6a complete. Extraction v1.0 (Prototype Alpha) frozen.

**Date:** 2026-08-07

---

## 1. Objective

**What Phase 6a set out to prove:** that natural-language extraction — turning a raw user turn into structured facts — could be built as a strictly bounded *proposal* stage sitting in front of the already-proven deterministic pipeline (Phases 1–5: types, mutation, gates, boundaries, handoff), without requiring any of those deterministic layers to change their own internal logic, and without the model ever touching `StructuredUnderstanding` directly. "Extraction proposes. Mutation decides." was the governing principle for the entire phase, not a slogan applied after the fact.

**Why Extraction was isolated from the rest of the Interview Engine:** it is the first and, by the roadmap's own design, the *only* subsystem in Phases 1–6a that requires live LLM interpretation. Isolating it — rather than testing extraction and the rest of the pipeline as one entangled system — makes it possible to attribute a failure precisely: is this a normalization bug, a mutation bug, a gate/boundary bug, or a model/prompt behavior issue? Every one of those questions has a different owner and a different fix. Conflating them would have made this phase's evidence much weaker than it turned out to be.

---

## 2. Architecture assumptions validated

**Deterministic state architecture worked as intended.** Phases 1–5 required zero changes to their own internal logic to accommodate live extraction. The only additions during Phase 6a were the `AttestedFact<T>` provenance wrapper on `ProjectFacts` and the `setIntendedUse`/`setWorkflowRole` mutation functions — both evidence-driven completions of gaps Phase 1 and Phase 2 had left open (nothing had ever needed to *write* to `project_facts` programmatically before), not redesigns of anything already built.

**Extraction can be isolated from normalization, mutation, gates, boundaries, and handoff.** Confirmed two ways, not just asserted: structurally, by import graph (`anthropic-extractor.ts` is the only file in `lib/interview-engine/` that imports `@anthropic-ai/sdk`; `extraction.ts` never imports `gates.ts` or `boundaries.ts`; `handoff.ts` reads `gate_1_state` directly off the object rather than calling `evaluateGate1`, deliberately avoiding that import); and behaviorally, by the fact that all 104 deterministic Phase 1–5 tests stayed green through every single change made across the whole phase, including three rounds of live-model evaluation and two rounds of prompt refinement.

**Ambiguity preservation worked.** The Nano Banana case and its three variants (ambiguous / explicitly-consumer / explicitly-API / contradictory-signals) resolved correctly and conservatively across every corpus run. `normalizeCandidate`'s "resolve only on exactly one matching access-method phrase, otherwise stay unresolved" design held throughout — the model was never observed inventing a resolution when the turn's own wording didn't support one.

**Normalization never guessed.** Confirmed by the false-resolution-rate metric across every corrected evaluation run: 0%. The one nonzero reading recorded during the phase (8.8% in the very first corpus run) traced back to a bug in the evaluation harness itself — a heuristic that flagged `kling`/`elevenlabs` as illegal canonicalizations because those tool names happen to equal their own canonical slug lowercased — not to any model or normalization misbehavior. See §4 and §5.

**Prompt refinements improved behavior without architectural changes.** Both real corrections made during this phase (`raw_tool_name` field-scoping; the visibility-preservation rule) were pure prompt/schema-description edits. Neither touched `normalizeCandidate`, `mutations.ts`, `gates.ts`, `boundaries.ts`, `handoff.ts`, or the shape of `CandidateObservation`/the pipeline stages. The two type additions noted above predate and are independent of this refinement cycle — they completed a gap, they didn't redesign anything in response to model behavior.

---

## 3. Implementation chronology

1. **Initial mock implementation (substage 1).** `CandidateExtractor` interface, `normalizeCandidate` / `attestCandidate` / `runExtractionPipeline`, `constantExtractor` mock (deliberately non-NLU — returns whatever it's constructed with, proves plumbing, not language understanding), 18 deterministic contract tests. No live model anywhere in this substage.
2. **Live-model integration.** `CandidateExtractor` widened to async. `CandidateObservation` extended with `is_correction`/`correction_of_raw_text`. `anthropic-extractor.ts` built: GA Structured Outputs (`output_config.format`, `jsonSchemaOutputFormat`), `claude-sonnet-5` (configurable via `INTERVIEW_EXTRACTOR_MODEL`), no `thinking`, no non-default sampling parameters. 14-scenario evaluation corpus and harness built. Fail-fast-without-key behavior verified by actually running it with no key present.
3. **First evaluation.** 42 live calls. Surfaced two bugs in the harness itself, not the model: token usage always reported 0/0 (`extractWithDiagnostics` built but never wired in); false-resolution rate inflated to 8.8% by the `kling`/`elevenlabs` heuristic bug described above. Both fixed same-day. Corrected rerun: 97.6% scenario pass rate (41/42), one genuine failure — `nano_banana_consumer`, where `raw_tool_name` captured an entire clause instead of isolating the tool name, breaking the registry's exact-match lookup.
4. **`raw_tool_name` refinement.** Single schema-field description change: explicit "return ONLY the tool or platform name... do not include surrounding explanation, access-method phrases, punctuation, plan details, or qualifiers," plus three valid and three invalid examples. Rerun confirmed the original failure mode did not recur — but surfaced a new, unrelated failure (`uncertainty_no_visibility`) in the same run, holding scenario pass rate at 97.6%. Per the stated completion criteria ("no new material failures"), Phase 6a was explicitly **not** marked complete at this point.
5. **Visibility/knowledge-state diagnostic.** A dedicated 45-trial targeted diagnostic (the original failing scenario × 20, plus five semantically-equivalent paraphrases × 5 each), scored semantically rather than by exact candidate shape. The first diagnostic run surfaced a *second* tooling bug — this time in the diagnostic's own scorer, not the model: when the model emitted two candidates with identical `raw_text`, the `.find()`-based check picked whichever came first, which could be the less-informative duplicate even when a correct one sat right beside it. Fixed; reran. The corrected result (93.3% preservation, 6.7% confirmed-absence misclassification) still missed the 0%-confirmed-absence bar. Combining both correctly-scored diagnostic runs (90 trials) showed the failure was concentrated, not uniform — present only in the original phrasing and one deliberately-ambiguous paraphrase, absent across the other four — and that three of the four genuine failures shared an identical two-candidate shape. That repetition, per the review instructions' own stated trigger condition, was classified as a **prompt/schema weakness**, not sampling variance.
6. **Final targeted refinement.** One new general system-prompt rule (no wording-specific hacks, no new domain fields): when a user states they lack access/visibility/involvement, preserve it as its own candidate at `unresolved_no_visibility`; if the turn also names another owner, extract that as a *separate* confirmed candidate that must never replace the first. One worked example included, using the exact turn that had originally failed. The evaluation corpus's own scorer for this scenario was also corrected to be kind-agnostic (`project_fact` or `scoped_observation` both valid), since the diagnostic had shown the original kind-locked check was measurably too rigid against real, correct model output.
7. **Final acceptance.** Diagnostic rerun (45 trials): 100% preservation, 0% confirmed-absence misclassification, 100% multi-candidate decomposition. Corpus rerun (42 trials): 100% scenario pass rate, 100% schema-valid, 0% false-resolution, 0% invented-fact, 100% across every other tracked metric. All six explicitly stated closing criteria met. Phase 6a marked complete.

---

## 4. Final accepted metrics

Recorded exactly as they stood at acceptance (final corpus run, `eval-reports/EXTRACTION-EVAL-2026-08-07T07-59-25-252Z.md`, and final diagnostic run, `eval-reports/DIAGNOSTIC-UNCERTAINTY-NO-VISIBILITY-2026-08-07T07-55-06-446Z.md`):

| Metric | Result |
|---|---|
| Schema validity | 100% (42/42) |
| Invented facts | 0 (0/64 candidates, corpus; 0/76, diagnostic) |
| False resolutions | 0% (0/64) |
| Ambiguity preservation | 100% (6/6) |
| Correction detection | 100% (3/3) |
| No-visibility preservation | 100% (45/45) |
| Confirmed-absence misclassification | 0% (0/45) |
| Scenario passes | 42/42 |
| Current-vs-historical scope accuracy | 100% (3/3) |
| Absent/unknown/unresolved/declined classification accuracy | 100% (9/9) |
| Bundled-answer splitting accuracy | 100% (3/3) |
| Valid multi-candidate decomposition | 100% (30/30) |

**Latency and token statistics** (final runs):
- Corpus (42 trials): 127,704 input / 17,632 output tokens; ~5,960ms average latency per call.
- Diagnostic (45 trials): 127,630 input / 19,173 output tokens; ~6,013ms average latency per call.

**Reports preserved:** 7 — none overwritten or deleted across the entire phase, including the runs that exposed bugs.
- `EXTRACTION-EVAL-2026-08-07T03-19-36-820Z.md` (first corpus run, harness-bug-affected)
- `EXTRACTION-EVAL-2026-08-07T03-27-09-657Z.md` (first corrected corpus run)
- `EXTRACTION-EVAL-2026-08-07T03-57-04-657Z.md` (post `raw_tool_name` fix)
- `EXTRACTION-EVAL-2026-08-07T07-59-25-252Z.md` (final, authoritative)
- `DIAGNOSTIC-UNCERTAINTY-NO-VISIBILITY-2026-08-07T06-40-21-160Z.md` (first diagnostic run, scorer-bug-affected)
- `DIAGNOSTIC-UNCERTAINTY-NO-VISIBILITY-2026-08-07T07-29-11-765Z.md` (first corrected diagnostic run)
- `DIAGNOSTIC-UNCERTAINTY-NO-VISIBILITY-2026-08-07T07-55-06-446Z.md` (final, authoritative)

---

## 5. Lessons learned

**Every successful correction during Phase 6a was evidence-driven, narrowly scoped, prompt/schema level, and never an architectural redesign.** Concretely, the two corrections that actually changed model behavior were: (1) a single field description in the Structured Outputs schema, with worked examples; (2) a single new general rule in the system prompt, with one worked example, plus a matching evaluation-scorer fix. Neither touched `normalizeCandidate`, any deterministic pipeline file, or the shape of any type beyond the two evidence-driven completions noted in §2. No case arose across the whole phase where a genuine model-behavior problem required anything more than a targeted prompt or schema change to resolve.

**A majority of the "failures" surfaced during this phase were in the evaluation tooling, not the model.** Of the distinct issues found across the whole phase, two were bugs in the harness/scorer (the `kling`/`elevenlabs` false-positive heuristic; the duplicate-candidate `.find()` scoring bug) against two that were genuine model-behavior issues (`raw_tool_name` over-capture; the visibility/confirmed-absence conflation). This is a real finding, not incidental: the discipline of re-reading raw output rather than trusting an aggregate metric, and of re-running after every fix rather than assuming a fix worked, is what caught this. Both categories only surfaced by actually executing the harness against a live key — neither was visible from code review alone.

**Repeated trials, not single runs, are what separates a systematic pattern from noise.** The `uncertainty_no_visibility` failure looked like sampling variance from a single 3-trial corpus run. It only resolved into a clear, repeating, identically-shaped pattern once a dedicated 45-trial diagnostic was run twice (90 trials total) and the results were broken down by phrasing rather than aggregated. A single evaluation round would not have distinguished "rare but real" from "one unlucky sample."

**Cost was never a material constraint, but it was worth confirming rather than assuming.** All seven evaluation rounds combined stayed under a few dollars at `claude-sonnet-5`'s introductory pricing. Confirmed via Anthropic's own published pricing rather than estimated from memory before the first live call was made.

---

## 6. Open questions intentionally deferred

Explicitly out of Phase 6a's scope, not resolved here:

- **Candidate-question generation** (Phase 6b) — Extraction only turns existing user turns into facts; it does not decide what to ask next.
- **Constraint A** ("would a plausible answer materially improve understanding") — deferred to Phase 6c per the roadmap; Phase 6a never evaluates whether a fact was worth eliciting, only whether a stated fact was correctly captured.
- **PRD §8 Rule 5** (one disentangling question for bundled answers, "never resolved by guessing") — bundled-answer *splitting* (multiple candidates from one turn) is proven by this phase (`multiple candidates in one turn` test, and the `bundled_multi_signal` corpus scenario at 100%); the Rule 5 *cap* on asking a clarifying question is boundary-type behavior and remains tracked for later integration work, not implemented here.
- **True precision/recall scoring** — the evaluation corpus uses each scenario's own targeted `check()` as a practical stand-in, explicitly flagged in every report as not equivalent to a hand-labeled reference-set precision/recall measurement.
- **The phase-vs-interview Gate 2 scope approximation** (Phase 3) — unrelated to and unaffected by Phase 6a; still open, still deliberately not addressed.
- **Confidence vs. completeness** (architecture doc §10) — the distinction between "we have enough observations" and "the observations we have are correctly interpreted" remains an open question the architecture doc itself flags as unresolved; Phase 6a's evaluation results don't resolve it, though the clean final metrics are consistent with it not yet being a practical problem at this scale.

---

## 7. Acceptance decision

**Phase 6a is complete. Extraction v1.0 (Prototype Alpha) is frozen, pending evidence from later phases.**

No further improvements, optimizations, refactors, or prompt tweaks to the Extraction subsystem (`extraction.ts`, `anthropic-extractor.ts`, `mock-extractor.ts`, or the `eval/` scorers) are authorized unless a later prototype phase demonstrates an actual architectural defect — not a preference, not a minor improvement opportunity, not a stylistic inconsistency. See the freeze notice in `CRC_PROTOTYPE_ALPHA_ROADMAP.md`.
