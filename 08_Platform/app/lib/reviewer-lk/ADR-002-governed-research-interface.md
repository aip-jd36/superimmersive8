# ADR-002: A natural-language research interface is an intent-entry mechanism into governed retrieval and Bounded Interpretation — not an independent answer authority

**Status:** Accepted (design) — `DESIGNED / NOT IMPLEMENTED`. Formalized with CAH-4G (`PRD_CAH_4G_HRR.md`, `HRR_GRI_TECHNICAL_DESIGN.md`). No runtime code exists yet; this ADR states the durable principle the eventual implementation and every future channel must be checked against.
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

3. **Explicit intent is never fabricated.** If the question names no governed research topic, the interface does not invent a "closest topic" to make retrieval run. If the question asks the interface to make a decision it is not authorized to make (e.g. a reviewer asking HRR whether to approve an assessment), the interface declines that decision, researches only any explicitly-named topic, and otherwise offers the available governed research paths — it does not answer the decision and does not fabricate a topic to appear responsive.

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
- The `BiIntent` generalization (`HRR_GRI_TECHNICAL_DESIGN.md §H`) is safe: CRC `UserGoal`s and HRR research questions both adapt into it without either becoming the other, and provenance survives.

**Costs / limits:**
- Some reviewer questions land honestly on "no governed coverage" (`likeness` today) rather than a synthesized answer. This is the correct behavior and a signal for the governed-claims backlog, not a defect to paper over.
- A deterministic/template composer is less fluent than free model prose. Acceptable for V1; a future bounded-model composer is permitted **only** if every substantive sentence still traces to a governed proposition / BI output and passes a grounding check.
- The principle constrains future "helpfulness" changes — intentionally.

**What this ADR does not decide** (see `HRR_GRI_TECHNICAL_DESIGN.md §T` open questions): the exact audit storage contract; whether the `BiIntent` generalization ships or an HRR-local rule application is used instead; whether V1 composition is fully deterministic; the cap on multi-topic free-form resolution; the classifier model id + cost assumptions.

## Enforcement (to be added with implementation)

- schema for the intent classifier: enum-only fields, no free-text field, no `summary`/`answer`/`statement` field;
- a source-scan test that the classifier module contains no answer-composition path and the classifier schema carries no prose field;
- a grounding test on the HRR composer: every rendered substantive sentence maps to a governed `statement`, a fixed template, the verbatim question, or a mechanical enumeration;
- an authority-gate test: `assessment_judgment` intent with no resolved topic → offered-paths, never a fabricated topic, never a yes/no;
- reuse of `reviewer-lk/authority-firewall.test.ts` for the new route (GET/POST research + append-only audit only; no assessment-state write; `evaluateReviewerEligibility`, never `crc_eligible`);
- fail-closed tests at each boundary in `HRR_GRI_TECHNICAL_DESIGN.md §P`.

---

**See also:** `PRD_CAH_4G_HRR.md`, `HRR_GRI_TECHNICAL_DESIGN.md`, `ADR-001-reviewer-resources-authority-boundary.md`, `lib/bounded-interpretation/types.ts` (the `determination_declined` status), `PRD_CRC_v1.0.md` (the frozen CRC spec this ADR does not govern).
