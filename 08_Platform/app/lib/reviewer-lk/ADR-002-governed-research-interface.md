# ADR-002: A natural-language research interface is an intent-entry mechanism into governed retrieval and Bounded Interpretation — not an independent answer authority

**Status:** Accepted (design) — `ARCHITECTURE FROZEN / IMPLEMENTATION IN PROGRESS` (frozen 2026-09-10; CAH-4G.1 Slice 1 + CAH-4G.2 Slice 2 + CAH-4G.3 Slice 3 **complete after the 3A semantic correction**, 2026-09-10). Formalized + frozen with CAH-4G (`PRD_CAH_4G_HRR.md`, `HRR_GRI_TECHNICAL_DESIGN.md §S–§V`). Slice 1 shipped the `BiIntent` generic Bounded-Interpretation input (mixed-intent authority contract corrected — Decision point 3). Slice 2 shipped the **intent-entry classifier** + **deterministic authority gate** — Decision points 1, 3, 6. Slice 3 shipped the **converged governed-research pipeline** (`lib/hrr/runHrrResearch` — reviewer-channel selection + deterministic applicability + Bounded Interpretation → a structured internal result; no composition, no route, no UI, no audit) — Decision points 2, 4, 5. **CAH-4G.3A** made deterministic applicability a generic upstream semantic input to BI (`BiResult.applicability`) so an applicability-`unresolved` governed proposition is interpreted as `relevant_applicability_unresolved`, not `directly_relevant` — see Decision point 2. `BiResult` was introduced; the raw reviewer question flows only as an attributed-display string, never into selection / applicability / BI. This ADR states the durable principle the eventual implementation and every future channel must be checked against.
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

   **Deterministic applicability is an upstream SEMANTIC INPUT to Bounded Interpretation (frozen CAH-4G.3A), not a channel detail.** A retrieved governed proposition whose applicability requirements are deterministically `unresolved` **must** be represented by Bounded Interpretation as `relevant_applicability_unresolved` — it must **not** be interpreted as `directly_relevant` merely because a channel lacks a CRC-oriented diagnostic. The governed proposition stays visible; "unresolved" means required structured information is not established — it is **not** withholding, **not** pass/fail, **not** a negative finding, **not** assessment evidence. The unresolved requirement(s) are preserved for a later composition step to explain. **Composition can never repair an overly strong BI result** — the correction lives at or before the BI boundary. The generic carrier is `BiResult.applicability` (`{ status: 'established' | 'unresolved'; unresolved_requirements? }`), an upstream fact — never `hrr_unresolved` / `reviewer_applicability_unresolved` / `crc_diagnostic_present`. Bounded Interpretation stays unaware of HRR, Reviewer Resources, CRC UI, reviewer-lk types, and the assessment workflow.

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
- The `BiIntent` + `BiResult` generalization (`HRR_GRI_TECHNICAL_DESIGN.md §H`) is safe and **shipped (CAH-4G.1 + CAH-4G.3)** with a proven byte-for-byte CRC regression: CRC (`UserGoal`s / `RetrievalResult`s) and HRR (research intents / `ReviewerLkClaim`s) each adapt into the two contracts via caller-owned adapters (`lib/bounded-interpretation/adapters.ts`, `lib/hrr/bi-adapters.ts`) without either channel's shape becoming the other, without a synthetic field, and provenance survives. For HRR, `BiIntent.intent_text` is the fixed governed topic label — the raw reviewer question never enters BI.

**Costs / limits:**
- Some reviewer questions land honestly on "no governed coverage" (`likeness` today) rather than a synthesized answer. This is the correct behavior and a signal for the governed-claims backlog, not a defect to paper over.
- A deterministic/template composer is less fluent than free model prose. Acceptable for V1; a future bounded-model composer is permitted **only** if every substantive sentence still traces to a governed proposition / BI output and passes a grounding check.
- The principle constrains future "helpfulness" changes — intentionally.

**Frozen by `HRR_GRI_TECHNICAL_DESIGN.md §S–§T` (2026-09-10; amended by CAH-4G.1, 2026-09-10), not re-decided here:** audit = reuse `access_kind='lk_research'` + additive nullable enrichment, raw question never persisted (§T-1); the `BiIntent` generalization **shipped (CAH-4G.1, proven zero CRC behavior change)** and the `BiResult` result-side contract **shipped (CAH-4G.3 + the optional `applicability` field CAH-4G.3A — `source_fact` nested + `applicability` optional so a CRC `RetrievalResult` structurally satisfies it → zero CRC churn; the HRR adapter builds it with no synthetic field, translating never re-evaluating applicability)**, HRR-local rule application rejected (§T-2); V1 composition fully deterministic (§T-3); **mixed judgment + research → decline the decision; each explicitly-supported research clause survives independently at its own scope (a prohibited intent never rewrites a permitted one's scope) (§T-5, corrected CAH-4G.1)**; likeness gap does not block V1 (§T-7); classifier inherits the interview-engine adapter config pattern (§T-8); `is_admin` OK for internal pilot, dedicated grant before broader rollout (§T-9).
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
