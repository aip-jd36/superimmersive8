# ADR-002: A natural-language research interface is an intent-entry mechanism into governed retrieval and Bounded Interpretation — not an independent answer authority

**Status:** Accepted (design) — `ARCHITECTURE FROZEN / IMPLEMENTATION IN PROGRESS` (frozen 2026-09-10; CAH-4G.1 Slice 1 + CAH-4G.2 Slice 2 complete, 2026-09-10). Formalized + frozen with CAH-4G (`PRD_CAH_4G_HRR.md`, `HRR_GRI_TECHNICAL_DESIGN.md §S–§V`). Slice 1 shipped the `BiIntent` generic Bounded-Interpretation input (with the mixed-intent authority contract corrected — see Decision point 3). Slice 2 shipped the **intent-entry classifier** (`interpret-research-intent.*` — one classify-only model call, enum-only schema, fails closed, never answers) and the **deterministic authority gate** (`hrr-authority-gate.ts`) — the concrete realization of Decision points 1, 3, and 6 for HRR. No governed retrieval from free-form questions, no HRR pipeline, no composition, no route, no UI exists yet. This ADR states the durable principle the eventual implementation and every future channel must be checked against.
**Date:** 2026-09-10
**Context:** CAH-4G — HRR V1 / Governed Research Interface. HRR (Human Reviewer Research) is the first deliberate product surface built on GRI (Governed Research Interface). GRI's shape — *structured or natural-language intent → governed retrieval → applicability → Bounded Interpretation → consultative composition → provenance/projection* — will recur (a future CRC topic path; possibly other channels). This ADR names the invariant so a future change to any such surface can be checked against the principle, not just against whatever tests happened to cover.
**Relationship to ADR-001:** `ADR-001-reviewer-resources-authority-boundary.md` establishes *"Reviewer Living Knowledge is a research authority surface, not an assessment authority surface"* (research ≠ the assessment). ADR-002 establishes a **different, broader axis**: *the interface for entering a research question is not itself an answer authority* (intent entry ≠ answer generation). Both apply to HRR. ADR-001's `Applies to` line already anticipates CAH-4G; ADR-002 extends the same design discipline to the shape of natural-language research interfaces generally.
**Applies to:** `lib/reviewer-lk/**`, any future GRI channel, any natural-language interface into governed SI8 Living Knowledge, and CAH-4G/HRR implementation. Does **not** apply to CRC's frozen conversational architecture (`PRD_CRC_v1.0.md`), which is a customer educational product, not a GRI channel — though CRC may later *consume* GRI primitives (`HRR_GRI_TECHNICAL_DESIGN.md §R`).

---

## Decision

**A natural-language research interface (a text box the user types a research question into) is an *intent-entry mechanism* into governed retrieval and Bounded Interpretation. It is not an independent answer authority.**

Concretely, for HRR and every future GRI channel:

1. **The model's only job is to determine *permitted research intent*** — which governed topic(s) the question concerns, and whether it is a research question or a request for a decision the interface is not authorized to make. The model classifies and maps. It **never** generates the substantive governed answer, a legal or commercial statement, a governed claim, a paraphrase of governed knowledge, a project conclusion, or advice. Its output is schema-constrained and structurally incapable of carrying an answer.

2. **The substantive answer is produced only by the deterministic governed pipeline** — governed retrieval (channel-eligibility-gated), deterministic applicability, Bounded Interpretation, and a composition step that may express **only** semantic content permitted by Bounded Interpretation and traceable to governed propositions or permitted structured outputs. No downstream layer may express a stronger conclusion than Bounded Interpretation permits.

   **User-authored text is UNTRUSTED / NON-AUTHORITATIVE INPUT.** It *may* be: displayed as an explicitly attributed question; used by the bounded classifier to determine permitted structured intent; referenced as provenance for *what the user asked*. It *may not*: substantiate a factual proposition in the answer; become governed truth through repetition; override governed knowledge, applicability, or Bounded Interpretation; create project facts, assessment facts, findings, or conclusions. **User text grounds INTENT provenance only — never factual authority.** Every substantive factual proposition in the answer must instead trace to: **(A)** governed knowledge permitted for the channel; **(B)** deterministic applicability / permitted structured context, accurately characterized; **(C)** a Bounded Interpretation output derived from permitted governed inputs; **(D)** a fixed authority / limitation / navigation template; **(E)** a mechanical provenance / status enumeration. A false premise embedded in the question (e.g. *"Since <tool> gives us copyright ownership…"*) is never repeated as fact.

3. **Explicit intent is never fabricated — and one intent never contaminates another.** If the question names no governed research topic, the interface does not invent a "closest topic" to make retrieval run. If the question asks the interface to make a decision it is not authorized to make (e.g. a reviewer asking HRR whether to approve an assessment), the interface declines that decision. **A single utterance may carry multiple semantic intents. The authority gate separates them and routes each independently: the assessment-decision intent is declined; every explicitly-supported research intent survives on its own, keeping its own correct scope.** A research clause is not converted to a determination request merely because the same utterance also asked the interface to make a decision — it becomes a determination request only when that clause itself asks for one, judged on its own words. If no research intent survives, the interface offers the available governed research paths. It does not answer the decision and does not fabricate a topic to appear responsive.

4. **Explicit provenance survives every adaptation.** A research question adapted into a smaller generic Bounded-Interpretation input contract must carry, alongside, the record that the topic(s) were *interpreted from a natural-language question* rather than *explicitly selected*, and a reference to the originating action. The interface never silently merges explicit user intent with system-expanded ("discovered") relevance; where both appear, provenance makes the distinction visible.

5. **Channel authority policy is per-channel and independent.** Which governed records a channel may retrieve is governed by that channel's own eligibility rule. Reviewer availability is **never** inferred from CRC eligibility or CRC publication scope. Distinct channels sharing GRI primitives keep distinct authority policies and distinct final projections.

6. **Fail closed at every structured / model / governance boundary.** A non-conforming model output, an unresolvable intent, an ambiguous or over-general question, a governance uncertainty, or an audit-persistence failure resolves to the safe outcome (no retrieval, or no content), never to a guessed answer or a strengthened conclusion.

## Why (the problem this prevents)

Without this stated principle, a future change to a natural-language research surface could plausibly:

- let the model that interprets the question also *answer* it ("the schema was getting complicated; we let it return a `summary` field");
- invent a "closest topic" so every question produces a retrieval result, turning "no governed coverage" into a fabricated answer;
- answer a reviewer's *"should I approve this?"* with a yes/no because a matching governed claim existed;
- fabricate a `UserGoal` (or the HRR equivalent) purely to reuse downstream code, losing the provenance that the intent came from a question and not an explicit selection;
- derive reviewer availability from `crc_eligible` because "it was already computed";
- carry a prior question's answer into the next question's model context, expanding the prompt-injection and hidden-inference surface;
- compose prose that synthesizes beyond the governed propositions ("this generally means the project is fine").

Each of these collapses the boundary GRI exists to hold: **the interface accepts intent; the governed pipeline — bounded by Bounded Interpretation — produces the answer; and research is separated from decision authority.**

## Consequences

**Positive:**
- HRR V1 and every future GRI channel have one stated architectural boundary to design against.
- "Put an LLM behind a text box" is explicitly *not* the pattern; the governed interaction architecture is.
- The `determination_declined` Bounded-Interpretation status becomes the load-bearing, reusable assessment-authority refusal for any channel — no per-channel refusal logic.
- Extraction/classification adapters can evolve (model, schema, retry) without any risk of becoming answer generators, because the schema and this ADR forbid it structurally.
- The `BiIntent` generalization (`HRR_GRI_TECHNICAL_DESIGN.md §H`) is safe and **shipped in CAH-4G.1 Slice 1** with a proven byte-for-byte CRC regression: CRC `UserGoal`s and (later) HRR research questions both adapt into it via caller-owned adapters without either becoming the other, and provenance survives.

**Costs / limits:**
- Some reviewer questions land honestly on "no governed coverage" (`likeness` today) rather than a synthesized answer. This is the correct behavior and a signal for the governed-claims backlog, not a defect to paper over.
- A deterministic/template composer is less fluent than free model prose. Acceptable for V1; a future bounded-model composer is permitted **only** if every substantive sentence still traces to a governed proposition / BI output and passes a grounding check.
- The principle constrains future "helpfulness" changes — intentionally.

**Frozen by `HRR_GRI_TECHNICAL_DESIGN.md §S–§T` (2026-09-10; amended by CAH-4G.1, 2026-09-10), not re-decided here:** audit = reuse `access_kind='lk_research'` + additive nullable enrichment, raw question never persisted (§T-1); the `BiIntent` generalization **shipped (CAH-4G.1 Slice 1, proven zero CRC behavior change)**, HRR-local rule application rejected, the `BiResult` result-side adapter deferred to the HRR-runtime slice (§T-2); V1 composition fully deterministic (§T-3); **mixed judgment + research → decline the decision; each explicitly-supported research clause survives independently at its own scope (a prohibited intent never rewrites a permitted one's scope) (§T-5, corrected CAH-4G.1)**; likeness gap does not block V1 (§T-7); classifier inherits the interview-engine adapter config pattern (§T-8); `is_admin` OK for internal pilot, dedicated grant before broader rollout (§T-9).
**Genuinely still open:** only the exact value of `HRR_MAX_RESOLVED_TOPICS` (§T-4, recommended `2` + a bounded internal experiment) — an implementation-tuning parameter, not an architecture decision.

## Enforcement

**In place (CAH-4G.2 Slice 2 — `__tests__/reviewer-lk/hrr-intent-classifier.test.ts`, `hrr-authority-gate.test.ts`, `hrr-classifier-firewall.test.ts`):**
- schema for the intent classifier asserted enum-only, `additionalProperties: false`, no `answer`/`summary`/`statement`/`explanation`/`conclusion`/`applicability`/`rationale`/`finding`/`verdict`/`cleared` field anywhere;
- source-scan: the classifier + gate modules contain no answer-composition path, no `select-reviewer-claims` / `retrieve` / `applicability` / `bounded-interpretation` / consultative-composition import, no `UserGoal`, no DB write, no raw-question persistence, no Linked-CRC read;
- deterministic normalizer tests: a non-enum topic/scope is dropped (never coerced/guessed/added), prose in an extra key is dropped, an unrecoverable shape → `null` → fail closed;
- the adapter never throws — provider error / unrecoverable miss / normalizer rejection → `unsupportedResearchIntent()`;
- authority-gate tests: `assessment_decision_requested` with no research clause → offered-paths, never a fabricated topic, never a yes/no; the gate is pure and never declines a `determination_request` research clause itself (that is BI's ceiling);
- the topic-button path invokes no classifier / model call (Phase 11).

**To be added with later slices:**
- a grounding test on the HRR composer (Slice 4): every rendered substantive **factual proposition** maps to grounding source A–E — **the reviewer's question text is not a grounding source**; a false premise within it must not be echoed as fact;
- reuse of `reviewer-lk/authority-firewall.test.ts` for the new free-form route (Slice 3/5): research + append-only audit only; no assessment-state write; `evaluateReviewerEligibility`, never `crc_eligible`;
- audit-before-content + fail-closed tests at each boundary in `HRR_GRI_TECHNICAL_DESIGN.md §P` (Slice 5).

---

**See also:** `PRD_CAH_4G_HRR.md`, `HRR_GRI_TECHNICAL_DESIGN.md`, `ADR-001-reviewer-resources-authority-boundary.md`, `lib/bounded-interpretation/types.ts` (the `determination_declined` status), `PRD_CRC_v1.0.md` (the frozen CRC spec this ADR does not govern).
