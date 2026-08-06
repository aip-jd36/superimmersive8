# Interview Engine — Architecture v1 (DRAFT — not yet committed)

**Status:** Draft for review. Not committed to the repository history yet.
**Type:** Engineering architecture document, not a PRD. Answers *how* the Interview Engine is built; `PRD_CRC_v1.0.md` remains the sole normative source for *what* CRC does.
**Date:** 2026-08-06

**Labeling convention used throughout:** `[PRINCIPLE]` — a rule already normative in the frozen PRD, restated for implementation context, never redefined here. `[IMPLEMENTATION GUIDANCE]` — a concrete design decision this document is making to fill a gap the PRD left open. `[PROTOTYPE ASSUMPTION — TO VALIDATE]` — a first-pass mechanism adopted so code can be written, explicitly not proven. `[OPEN QUESTION]` — genuinely unresolved, not decided here.

---

## 1. Purpose and Scope

**Owns:** natural conversation; the runtime structured-understanding model; scoped-observation extraction and mutation; phase progression (Project Discovery → Workflow Discovery → Post-Production Discovery → Completion Check); conversation-boundary enforcement; Gate 1 and Gate 2; the handoff object supplied to Retrieval.

**Does not own:** Knowledge Card selection logic; Matrix or Publication Policy interpretation; commercial-readiness judgment; assessment conclusions; output-card rendering. Retrieval, Projection, and rendering are separate systems with their own architecture documents, not designed here.

`[PRINCIPLE]` The Interview Engine and Retrieval Engine are architecturally independent — a genuine boundary, not a prompt instruction (PRD §3). Every interface defined in this document exists to preserve that boundary in code, not just in intent.

---

## 2. Relationship to Existing Documents

**Normative** (this document may not contradict, and reopens only on genuine contradiction or implementation impossibility, both reported in this draft's cover notes):
- `PRD_CRC_v1.0.md`

**Implementation-risk input** (informs design choices, not itself normative):
- `CRC_IMPLEMENTATION_RISKS.md`

**Referenced institutional constraints** (this document must not conflict with these, but does not implement or interpret them):
- `06_Operations/institutional-knowledge/notebook/CRC-PUBLICATION-POLICY.md`
- `08_Platform/prds/PRD_LIVING_NOTEBOOK.md`
- `06_Operations/institutional-knowledge/notebook/PLATFORM-RIGHTS-MATRIX.md`, `MATRIX-LEARNINGS.md` (referenced specifically for the multi-surface-tool precedent in §8)

**This document defines:** Interview Engine internal architecture only. It does not define Retrieval internals, Projection Layer behavior, Knowledge Card schema, or output rendering.

---

## 3. Engine Inputs, Outputs, and Interfaces

**Input, each turn:**
```
{
  conversation_history: Message[],
  current_phase: 1 | 2 | 3 | 4,
  structured_understanding: StructuredUnderstanding,  // see §4
  conversation_boundary_state: BoundaryState           // see §6
}
```

**Output, each turn:**
```
{
  assistant_response: string,
  structured_understanding: StructuredUnderstanding,   // updated
  observations_delta: { added: [], modified: [], superseded: [] },
  phase_state: PhaseState,                              // see §11
  gate_1_state: "met" | "not_met" | "not_applicable_declined",
  gate_2_state: "stable" | "not_yet_stable",
  completion_reason: null | "gate_1_gate_2_met" | "declined" | "gate_1_unmet_exhausted",
  retrieval_handoff: RetrievalHandoff | null             // see §12, populated only at completion
}
```

`[IMPLEMENTATION GUIDANCE]` The Interview→Retrieval contract is one-directional and read-only: `retrieval_handoff` is a derived snapshot computed *after* a turn's Gate 2 evaluation completes, never a live reference into `structured_understanding`. This is the concrete enforcement of the architectural boundary in §1 — without this constraint, a shared mutable object would let Retrieval's processing implicitly influence the next turn's candidate-question evaluation, quietly reintroducing the coupling PRD §3 exists to prevent. Retrieval's own internals are out of scope here.

---

## 4. Structured Understanding

The runtime model of what CRC currently understands about the project. Distinguishes:

- **Direct user facts** — stated verbatim or near-verbatim ("we used Kling").
- **Normalized facts** — a direct fact resolved to a canonical form (Interview Engine's own reading of "Kling AI" as `Kling`, prior to Retrieval's alias table ever running).
- **Inferred interpretations** — the Interview Engine's own reading of ambiguous input, held distinctly from what the user actually said.
- **Unresolved ambiguity** — the engine knows a fact exists but not its specific value (which Gemini surface).
- **Explicit absence** — confirmed the fact doesn't exist ("no one reviewed it").
- **User-declined information** — the user was asked and chose not to answer.

`[PRINCIPLE]` Scoped observations must be mutable, not append-only (PRD §10).

`[IMPLEMENTATION GUIDANCE]` Mutation on correction is **supersede-and-mark**, not destructive in-place edit. When a user says *"Actually, we also used Runway,"* the engine adds a new observation and, if it contradicts an existing one, marks the prior observation `superseded_by: <new_observation_id>` rather than deleting it. Reasoning: this preserves the correction itself as information (useful for Discovery Data / institutional learning, PRD §18), and it's the same discipline the Living Notebook already uses for its own Position supersession (never delete, mark and point forward) — reusing an established, working pattern rather than inventing a new one.

---

## 5. Scoped Observations

Normative schema, unchanged from PRD §10:

```json
{
  "scope": "current_project | historical_project | general_practice",
  "workflow_stage": "T0 | T1 | T2 | T3 | T4 | T5 | null",
  "confidence": "confirmed | confirmed_absent | unresolved_no_visibility | unknown | declined",
  "status": "in_progress | completed | null",
  "note": "factual, non-evaluative free text"
}
```

**Runtime-only extensions** (not part of the normative schema — implementation additions):

```json
{
  "observation_id": "string",              // runtime identifier
  "superseded_by": "observation_id | null", // mutation history (§4)
  "source_turn": "integer",                // which turn produced this
  "source_statement": "string"             // the user statement it derives from, for auditability
}
```

`[IMPLEMENTATION GUIDANCE]` These four fields are additive and never appear outside the runtime layer — they do not get exposed to Retrieval, Discovery Data, or any consumer that expects the normative schema. This keeps the frozen schema's own consumers unaffected by implementation detail.

`[PRINCIPLE]` The fourth scope type (forward-looking/anticipated signal) remains deliberately deferred, not added — PRD §10 explicitly logs this as a v1.1 candidate pending real conversation evidence. Not revisited here.

---

## 6. Two Coequal Constraints

**Constraint A — Understanding value.** A candidate question may be asked only when its answer is expected to materially improve structured understanding. Meaning differs by phase: Phases 1–2, project/workflow understanding; Phase 3, commercial-journey understanding for Discovery Data. Retrieval is a downstream consumer of this understanding, never the justification for a question.

**Constraint B — Conversation boundaries.** A question that passes Constraint A may still be prohibited: one follow-up per signal, one uncertainty clarification, no incident investigation, user opt-out, and the other frozen Phase 3 boundaries (PRD §8). **Both constraints must pass before a question is asked** — neither subsumes the other. A user's decline is not evidence that no more understanding is available; it's a consent boundary orthogonal to the understanding-value question, so it can never be reformulated as a special case of Constraint A.

`[PRINCIPLE]` "Don't ask" is not a uniform terminal action. Most Constraint B hits suppress only the current candidate question — the interview continues normally. User decline specifically may end the current question, phase, or the entire interview, per the scope the user actually expressed (PRD §8 Rule 6). Implementations must not collapse these into one suppression behavior.

---

## 7. Candidate-Question Evaluation

Two distinct mechanisms, operating at different times with different information available. They must not be conflated — one is a prediction made before an answer exists, the other is a measurement made after one does.

**Pre-question estimation — the actual question-selection mechanism.** Before asking, estimate whether a *plausible* answer would materially fill, resolve, correct, or refine structured understanding. This is necessarily prospective: the real answer isn't known yet, only the space of likely answers.

`[PROTOTYPE ASSUMPTION — TO VALIDATE]` First-pass mechanism: simulate the candidate question's plausible answer space and check whether any plausible answer would add a new scoped observation or change an existing one's `confidence`/`workflow_stage` relative to current `structured_understanding`. If no plausible answer would change the object, suppress. A diff-against-a-hypothetical, not a numerical score — deliberately, per the instruction not to build scoring machinery unless proven necessary. This is the single most load-bearing unproven mechanism in this document (see cover notes, risk #1).

**Post-answer diff — an evaluation and learning signal, not a selection mechanism.** After the user actually answers, diff the updated `structured_understanding` against its pre-answer state to measure whether the question *actually* produced material understanding. This is retrospective and was never available at the moment the question was chosen — it cannot be the thing that decided whether to ask. Its role is to supply ground truth for calibrating the pre-question estimator over time, and it is the mechanism Gate 2 itself uses (§9), since Gate 2 only ever looks backward at turns that already happened.

```
Generate candidate question
        ↓
Constraint A — pre-question estimation: would a plausible answer
materially improve structured understanding?
        ├─ No  → suppress, continue conversation
        └─ Yes
             ↓
Constraint B: does it violate a conversation boundary?
        ├─ Yes → apply the boundary's actual scope (§6) — suppress this
        │        question only, or end phase/interview per Rule 6
        └─ No  → ask
                  ↓
             [user answers]
                  ↓
             Post-answer diff (§9, estimator calibration) — not used to
             decide whether this question got asked; it already was.
```

---

## 8. Gate 1 — Minimum Understanding

`[PRINCIPLE]` Two criteria (PRD §9): intended-use signal present (an `unclear`/mixed value is acceptable), AND at least one of a named tool/platform or a production step specific enough to retrieve against. In the normal case this requires zero additional questions — Phases 1–2 elicit both facts through ordinary conversation.

`[IMPLEMENTATION GUIDANCE — resolves a real interpretive gap, see cover notes]` A tool mention satisfies Gate 1 only when the Interview Engine has enough specificity to identify the access surface the user actually used — this is a requirement of the Interview Engine's own understanding, not a lookup against the Matrix. The Matrix and Retrieval system consume this structured understanding downstream; they do not define the question or the Gate 1 requirement. "Nano Banana" alone is insufficient not because two Matrix rows happen to exist for it, but because the Interview Engine cannot yet distinguish which of two materially different things the user actually did — used a free consumer chat app, or called a paid API. The Gemini Consumer/API split is the canonical illustration of why this distinction is real, confirmed after the fact by the Matrix's own row split (`MATRIX-LEARNINGS.md`), not the source of the requirement. This is not exhaustive intake: it's one additional disambiguating question, asked as ordinary workflow discovery ("which did you use, the website or the API?"), not a database-driven fishing expedition. It resolves under the same natural-conversation framing PRD §11 already requires — it does not relax it.

`[OPEN QUESTION]` How does the engine know a given tool name is ambiguous (multi-surface) versus single-surface, without querying the Matrix directly? A hardcoded list of known-ambiguous tool names is the obvious first answer but doesn't scale as the Matrix grows. Not resolved here.

---

## 9. Gate 2 — Understanding Stability

`[PRINCIPLE]` Gate 2 is an Interview Engine test, entirely independent of Retrieval — it answers "has the last turn or two materially changed my own model of the situation," with zero visibility into what Retrieval is doing (PRD §9, §3).

`[IMPLEMENTATION GUIDANCE]` Gate 2 and Constraint A (§7) ask the same underlying question — has understanding materially changed — but they are not the same mechanism, and §7's correction applies here directly. Constraint A's pre-question estimation is prospective (predicting a plausible answer's effect before it exists); Gate 2 is retrospective (measuring the last N turns' actual effect, using the post-answer diff, since those turns already happened). Gate 2 can use the post-answer diff mechanism directly because it never needs to predict anything — implementation should reuse that diff logic for Gate 2, not the estimator. `[OPEN QUESTION]` "No new facts added" and "the facts we have are confidently interpreted" are not the same condition — a stalled conversation could plateau on genuinely ambiguous information without being *stable* in any meaningful sense (see §10). Whether Gate 2 needs to check both, or whether "no new facts" is an adequate proxy for v1, is unresolved.

---

## 10. Confidence vs. Completeness

`[OPEN QUESTION — explicit, not resolved by the existing schema]` The normative `confidence` enum (§5) states confidence in a specific observation's truth value. It does not address a different axis: do we have *enough* observations (completeness), versus are the observations we have *correctly interpreted* (interpretive confidence). Canonical example: the engine could record `tool: Nano Banana` with `confidence: confirmed` while having silently misresolved which surface the user meant — Gate 1 would read as satisfied while the underlying fact is wrong, not just uncertain.

`[PROTOTYPE ASSUMPTION — TO VALIDATE]` Do not build a separate interpretation-confidence score for v1. Instead, push genuine ambiguity into the existing `confidence` taxonomy at the observation level — if the engine isn't sure which surface was meant, that observation should be recorded as `unresolved_no_visibility` or `unknown`, not confidently recorded wrong. Combined with the §8 Gate 1 interpretation (ambiguous multi-surface mentions don't satisfy Gate 1 until disambiguated), this is meant to prevent the failure case without new machinery — but it does not fully solve misinterpretation risk for cases the engine doesn't recognize as ambiguous in the first place. Flagged, not solved.

---

## 11. Phase State and Transitions

`[PRINCIPLE]` Four phases, sequential in normal operation, governed by Gate 1 + Gate 2 + User Override (PRD §7, §9).

`[IMPLEMENTATION GUIDANCE]`
- **Entry/exit:** Phase 1→2 on any workflow-relevant fact volunteered or asked for; Phase 2→3 is not gated on Gate 1 being met — Gate 1 can be satisfied as early as end of Phase 2, and Phase 3 proceeds regardless, since it gathers a different kind of understanding (commercial journey, not retrieval specificity).
- **Return to an earlier subject after correction:** a correction ("actually, we also used Runway") does not force a phase transition backward. It's handled as a mutation (§4) to the relevant observation in-place in whatever phase the conversation currently occupies.
- **Partial completion:** if Gate 1 remains unmet after Phases 1–2's natural conversational flow runs its course, the engine does not loop back to force it (PRD §9 fallback: "insufficient input," not infinite probing).
- **Opt-out effect on phase state:** per §6, a decline can end the current question, the current phase, or the interview — phase state must record which occurred, since it changes what `completion_reason` and `retrieval_handoff` (§12) can honestly contain.
- **Phases are logical state labels, not rigid conversational blocks.** A single user turn can supply Phase 1, 2, and 3-relevant information simultaneously (see PRD §8 Dialogue F). Phase state tracks what's been *understood*, not what's been *asked in sequence*.

---

## 12. Interview → Retrieval Handoff

```
{
  canonical_tool_identifiers: string[],
  unresolved_aliases: string[],            // named but not yet resolved to a canonical Matrix row
  access_surface: string | "unresolved",
  plan_tier: string | "unknown",
  workflow_role: string,
  intended_use: string | "unclear",
  scoped_observations: ScopedObservation[], // §5, current (non-superseded) state only
  certainty_state: "gate_1_met" | "gate_1_unmet" | "declined",
  exclusions: string[]                      // fields the user declined, named explicitly
}
```

`[PRINCIPLE]` This object contains facts, never publication conclusions. It must never contain risk scores, clearance conclusions, SI8 opinions, or a fabricated answer to something unresolved (PRD §11, §12 — Retrieval and Interview never generate content the user didn't establish). An `unresolved` or `unknown` value is a valid, complete answer — not a gap to be filled before handoff.

---

## 13. Prototype Test Plan

### 13a. Deterministic test plan (data model + gates, no LLM)

Per §"what to implement first" — the structured-understanding model, mutation logic, and gate evaluation are testable against fixed input/output pairs before any live conversation exists. This layer must explicitly cover, each as its own test case, not folded into general coverage:

- **Correction and supersession** — apply a correcting statement against an existing observation; assert a new observation is added and the prior one is marked `superseded_by`, never deleted (§4).
- **Multiple observations from one answer** — a single bundled/multi-signal input (the shape of PRD Dialogue F) must produce multiple distinct scoped observations, correctly separated, not merged into one.
- **Current vs. historical scope** — an answer distinguishing "this project" from "a past project" (the shape of PRD Dialogue C) must tag observations `current_project` vs. `historical_project` respectively, never collapsed together.
- **Absent vs. unknown vs. declined** — three distinct inputs (a clean "no," a genuine "I don't know," an explicit refusal to answer) must each resolve to the correct, distinct `confidence` value (`confirmed_absent`, `unknown`/`unresolved_no_visibility`, `declined`) — not collapsed into one bucket.
- **Question-level suppression vs. phase/interview termination** — two separate cases: a depth-cap hit (e.g. one-follow-up-per-signal already used) must suppress only the current candidate question and let the conversation continue; a user decline must apply the correct broader scope (question, phase, or interview) per Rule 6. Both must be tested, since collapsing them into one suppression behavior is exactly the failure mode §6 warns against.

### 13b. Dialogue-based test plan (LLM-driven)

`[PRINCIPLE]` Test against the six normative PRD §8 dialogues first (rich signal, no signal, current-vs-historical, ambiguous/uncertain, full opt-out, mixed/multi-signal) before any open-ended conversation testing.

For each: expected phase path, questions asked vs. suppressed (and which constraint suppressed them), resulting scoped observations, confidence/uncertainty state, Gate 1 result, Gate 2 result, termination reason, retrieval handoff.

`[IMPLEMENTATION GUIDANCE — answers the sufficiency question directly, see cover notes]` The six dialogues are **necessary but not sufficient**. All six are Phase 3 scenarios — none test Phase 1–2 behavior, and specifically none test multi-surface tool disambiguation (§8), which this document just identified as a real, previously-untested risk area. Recommend adding, before calling the prototype validated:
1. A Phase 1–2 dialogue where the user names an ambiguous multi-surface tool ("we used Nano Banana") and the engine must recognize the ambiguity and disambiguate naturally.
2. One full end-to-end trace exercising Phase 1→2→3→4 in sequence with a clean Gate 1 met → Gate 2 stable → handoff assembled path, since the six dialogues each start mid-Phase-3 and never individually prove the whole pipeline connects.

---

## 14. Open Questions

- How to operationalize "materially improves structured understanding" beyond the §7 first-pass diff test — genuinely unproven (see cover notes, risk #1).
- Whether confidence needs categorical states (current) or numerical scores — no evidence yet that categorical is insufficient; don't add scoring without a concrete failure case.
- How phase-level stability should be measured when Gate 2 and Constraint A share logic but operate at different scopes (§9).
- How much state should be persisted during the prototype vs. held in-memory per session — not addressed in this document at all, deliberately (implementation/infra detail, not architecture).
- How corrections should be detected as corrections (vs. new, additive facts) reliably enough to trigger the supersede-and-mark mutation (§4) rather than just appending — flagged but not resolved; a secondary risk behind the top three in the cover notes.
- How the engine recognizes a tool name as multi-surface-ambiguous without hardcoding a list (§8).
