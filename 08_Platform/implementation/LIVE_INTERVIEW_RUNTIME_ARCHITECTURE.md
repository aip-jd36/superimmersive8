# Live Interview Runtime — Architecture v1

**Status:** Architecture design accepted, 2026-08-08, subject to one final verification, which is now also complete. The blocking contradiction identified in the original draft (Retrieval/Projection invocation cadence, §8) is resolved by explicit JD decision. The Phase 3→4 gap is closed by direct citation of `PRD_CRC_v1.0.md` §7/§8, not inference. A dependency search across 8 areas (Interview Engine types/serialization, Discovery Data/T0–T5, fixtures/eval harnesses, gates/boundaries, `RetrievalHandoff`, both Prototype retrospectives, `PRD_CRC_v1.0.md`, persistence/analytics schemas) found no meaningful dependency on `current_phase === 4` as a distinct runtime/persisted value — every non-fixture "Phase 4" occurrence in the codebase is a naming collision with the *Prototype implementation roadmap's* own unrelated phase numbering. Adopted runtime model (§2): Phase 1 → 2 → 3 → Completion Check → Finalization; "Phase 4" remains a PRD conceptual label only. **This document is ready for implementation planning and is committed as final.** `RETRIEVAL_ENGINE_ARCHITECTURE.md` was narrowly updated (§1, §2) as part of the cadence resolution, per explicit instruction — no Retrieval implementation exists yet to change, and none was changed. No roadmap updated.
**Type:** Engineering architecture document, not a PRD, not a UI document, not an API document, not a persistence-implementation document. Answers exactly one question: *how does the real CRC interview actually run, from the first user message until `ProjectionOutput` is produced?* Sits between the already-completed Interview Engine and the not-yet-built product UI — the final architectural unknown before product implementation.
**Date:** 2026-08-08 (drafted); revised 2026-08-08 (contradiction resolved, Phase 3→4 gap closed)

**Normative inputs, re-read directly for this document, treated as authoritative and not restated:** `PROTOTYPE_ALPHA_RETROSPECTIVE.md`, `PROTOTYPE_BETA_RETROSPECTIVE.md`, `RETRIEVAL_ENGINE_ARCHITECTURE.md`, `PROJECTION_LAYER_ARCHITECTURE.md`, the Part 2 Product Integration Planning response (chat record, 2026-08-08). Also re-read directly (not in the original instructed list, load-bearing for §2 and §8 below, and not previously fully digested in this session): `INTERVIEW_ENGINE_ARCHITECTURE.md` §11 (Phase State and Transitions) and §6 (Two Coequal Constraints); `08_Platform/prds/PRD_CRC_v1.0.md` §6–§9 (Core Interview Structure, Phase 3 detail, Completion Logic) — the frozen source `INTERVIEW_ENGINE_ARCHITECTURE.md` itself is downstream of, consulted directly for this revision after the first draft's Phase 3→4 analysis proved incomplete.

**Labeling convention** (matches the three prior architecture documents, plus one addition this document needed): `[PRINCIPLE]` — already normative, restated for context. `[IMPLEMENTATION GUIDANCE]` — a concrete design decision filling a gap. `[PROTOTYPE ASSUMPTION — TO VALIDATE]` — a first-pass mechanism, not proven. `[OPEN QUESTION]` — genuinely unresolved. `[FINDING]` — something this document's own analysis discovered that revises a premise. `[CONTRADICTION — REQUIRES DECISION]` — a place where two already-authoritative documents gave conflicting guidance, presented for JD's decision rather than resolved unilaterally. **The one instance of this label in the original draft (Retrieval/Projection invocation cadence, §8) has been resolved by explicit JD decision, 2026-08-08** — see §8 and the corresponding narrow update to `RETRIEVAL_ENGINE_ARCHITECTURE.md` §1/§2. Retained in the convention list since the label itself may be needed again.

---

## 0. Scope

**Owns (this document only):** the turn-by-turn runtime loop that connects a user message to Interview Engine's existing pure functions, decides when the interview is complete, and hands off to the already-built `runCRCConversation()`.

**Does not own:** UI (component design, chat rendering), API surface (route shapes, HTTP), persistence technology (which database, which table engine — only *what* runtime data exists and its durable/derivable/transient classification), or anything already specified by the three prior architecture documents.

---

## 1. Runtime ownership

| Responsibility | Owner | Why (challenged) |
|---|---|---|
| Deterministic per-turn Extraction+Mutation | **Interview Engine** (existing) | Already built as one fused pipeline (`runExtractionPipeline`) — "propose vs. decide" is enforced *inside* it. Runtime must not re-decompose this into two separate calls; it already validated as one unit through Phase 7. |
| Gate 1 / Gate 2 evaluation | **Interview Engine** (existing) | `evaluateGate1`/`evaluateGate2` are already pure functions of `StructuredUnderstanding`. Runtime calls them; does not reimplement or approximate them. |
| Candidate generation, Constraint A, Constraint B | **Interview Engine** (existing) | Unchanged. Runtime supplies phase/decline as external parameters — exactly the contract these modules already have. |
| **Phase-transition logic** | **Interview Engine** (NEW function, not yet built) | Operates purely on `StructuredUnderstanding` (+ one cross-dependency found in §4/§10) — the same shape as every other Interview Engine gate/evaluator. Belongs beside `gates.ts`, not inside Runtime, even though it doesn't exist yet. |
| Invoking phase-transition once per turn | **Runtime** | Orchestration, not logic — same split as `runCRCConversation` calling `buildRetrievalHandoff`. |
| Decline **detection** (which button did the user press) | **UI** | See §4 — a UI affordance, not inference. |
| Decline **translation** into `DeclineSignal` and driving `evaluateBoundary` | **Runtime** | UI reports *what happened*; Runtime is what already knows how to feed Interview Engine's typed contracts. |
| `pending_clarification` state | **Runtime** (session state, sibling to `StructuredUnderstanding`) | See §3 — a property of interview *execution*, not of *understanding*. |
| Session persistence (read/write) | **Runtime** | Every Interview Engine module is a pure, I/O-free function. Runtime is the one place I/O belongs. |
| Retrieval / Projection logic itself | **Retrieval Engine / Projection Layer** (existing, unchanged) | Runtime never reimplements matching or rendering — it only calls `retrieve()`/`assembleProjectionOutput()`, or `runCRCConversation()` directly. |
| **Cadence** of Retrieval/Projection invocation | **Runtime** — resolved, §8: once, at Interview termination, in v1 | JD decision, 2026-08-08. Retrieval's own semantics remain snapshot-safe regardless of cadence; v1's runtime chooses finalization-only. |
| Fixed acknowledgment copy for non-`ASK` turns (see §5) | **Runtime** | NEW, small, previously ownerless — nothing in `AssistantAction`'s own enum specifies user-facing text; discovered by this document, not by any prior one. |
| Rendering `ProjectionOutput` into markup | **UI** | Runtime's job ends at handing over a `ProjectionOutput` object — matches Part 2's own renderer design being a UI-layer concern. |

**Challenged and rejected:** giving Runtime any fact-interpretation responsibility (e.g., "classify this reply as a decline") — this would quietly recreate an LLM-inference surface Interview Engine was never asked to build, and §4 shows it isn't necessary.

---

## 2. Phase progression

**What may influence phase:** only `StructuredUnderstanding` — specifically, whether workflow-relevant facts have been confirmed, per `INTERVIEW_ENGINE_ARCHITECTURE.md` §11's own transition rules ("Phase 1→2 on any workflow-relevant fact volunteered or asked for; Phase 2→3 is not gated on Gate 1"). One correction found while cross-checking against §4 below: phase transition also needs **`BoundaryState.phases_ended`** (a phase ended early by decline must still be treated as "over" for advancement purposes) — so the true input is `(StructuredUnderstanding, BoundaryState)`, not `StructuredUnderstanding` alone. This is a real, newly-discovered coupling, not assumed away (see §10).

**What may NOT influence phase:** raw conversation text directly (Extraction's job, not phase-transition's — keeps the same determinism boundary enforced everywhere else in this pipeline); turn count or wall-clock time (§11 is explicit: *"Phases are logical state labels, not rigid conversational blocks"* — a turn-count proxy would be exactly the rigid-block model this sentence rejects); any LLM judgment call about "does this feel like enough" (no precedent anywhere in this codebase for a non-deterministic gate, and no evidence one is needed here).

**Can phase always be computed deterministically from `StructuredUnderstanding` (+ `BoundaryState`)?**

- **Phase 1→2 and 2→3: yes.** §11 already states operationalizable rules — these can become pure boolean checks, the same style as `evaluateGate1`.
- **Phase 3→4: resolved, from `PRD_CRC_v1.0.md` directly — not the inference this document's prior draft offered.** §11's silence on 3→4 sent the first pass of this document looking in the wrong place. `PRD_CRC_v1.0.md` §8's own internal flow diagram for Phase 3 states the loop continues *"only if Gate 2 (Section 9) has not yet stabilized."* The Phase 3→4 transition is: **Gate 2 stabilizes**, or Phase 3's own one-shot caps (one follow-up, one historical-experience question, one uncertainty clarification, one disentangling question) exhaust, or a decline ends Phase 3 early. Normative, not inferred.
- **Phase 4 ("Completion Check") is fully specified, and specified as almost entirely non-conversational.** `PRD_CRC_v1.0.md` §7, verbatim, is the entire normative content on Phase 4: *"governed entirely by Section 9's two gates and the user-override rule. If met: stop. If not: ask only the missing question(s)."* It has no topic of its own the way Phases 1–3 each do — any question it produces is a narrow Gate-1 gap-filler (Gate 1 is itself defined, §9, as "a completion check on Phase 1–2 output, not a new interrogation step"), and it exits via: both gates met → stop; Gate 1 still unmet after asking what's missing → stop anyway via the "insufficient input" fallback (§9 is explicit: *"Do not keep probing past the normal Phase 1–2 flow"* — not an unbounded loop); or a decline → stop immediately regardless of gate status.

**`[FINDING]`** Since Phase 4 carries no topic of its own and is defined entirely in terms of the two gates plus user override — and the phase structure is explicitly hidden from the user throughout (`PRD_CRC_v1.0.md` §6, §11) — **the cleaner runtime model is Phase 1 → Phase 2 → Phase 3 → a terminal completion-check state, not four peer phases.**

**Dependency search performed (JD instruction, 2026-08-08), not left as an open question:** searched actual consumers and normative text — not naming — across Interview Engine types/serialization, Discovery Data/T0–T5 structures, fixtures/eval harnesses, gates/boundaries, `RetrievalHandoff`, both Prototype retrospectives, `PRD_CRC_v1.0.md`, and persistence/analytics schemas (none exist yet for CRC). **No meaningful dependency on `current_phase === 4` as a distinct runtime/persisted value exists anywhere.** Every "Phase 4" occurrence outside fixture data is a naming collision with the *Prototype implementation roadmap's own* phase numbering (`CRC_PROTOTYPE_ALPHA_ROADMAP.md` Phase 4 = the `boundaries.ts` build phase) — unrelated to the interview's own `current_phase`. `gates.ts`'s own comments confirm Discovery Data's T0–T5 taxonomy (`ScopedObservation.workflow_stage`) is explicitly a separate axis from interview phase. No gate, boundary, or handoff function branches on `phase === 4` anywhere; `RetrievalHandoff` carries no phase field at all.

**Adopted runtime model, per this finding:**

```
Phase 1 → Phase 2 → Phase 3 → Completion Check → Finalization
```

"Phase 4" remains `PRD_CRC_v1.0.md` §7's conceptual label for completion semantics (the two gates + user-override rule) — Runtime implements exactly that behavior as a terminal completion-check step, not as a fourth ordinary conversational phase with its own stored `current_phase: 4` value to traverse into or out of. `computePhase(SU, BoundaryState)` (this section, above) returns `1 | 2 | 3` only, plus a separate `is_complete: boolean` (or equivalent) signal — it does not need to return a `4` for anything to work correctly, and should not, since nothing downstream requires or reads that specific value. This is the smallest representation that preserves everything the PRD actually requires (Phase 4's own gate-check behavior, unchanged) without treating it as topic-bearing.

**Challenge: is phase progression a state machine or a derived property?** **A derived property**, not a state machine with independent memory or transition-specific side effects. Evidence: §11's own words — *"Phase state tracks what's been understood, not what's been asked in sequence."* This describes a classification of *current* understanding, recomputed fresh, not a machine that can carry history-dependent behavior beyond the current snapshot. **`[IMPLEMENTATION GUIDANCE]`** Recommend `computePhase(structured_understanding, boundary_state): Phase` as a pure function, recomputed every turn — the same pattern `evaluateGate1`/`evaluateGate2` already are.

**`[FINDING]`** `StructuredUnderstanding.current_phase` is currently a *stored* field. If phase becomes a pure derived function, this field becomes redundant and risks silent drift between the stored value and the recomputed one. This document does **not** propose changing Interview Engine's frozen type (out of scope, per instruction not to modify existing architecture documents) — but recommends Runtime treat the stored value as an advisory cache only, always re-verified via the pure function before use, never trusted blindly on load. See §6.

---

## 3. Pending clarification

Per `PROTOTYPE_ALPHA_RETROSPECTIVE.md`'s own D3 recommendation: `pending_clarification: { signal_id, kind, unresolved_summary }`, `unresolved_summary` a deterministic templated rendering, never raw model prose.

**Only two of the six `CandidateQuestionKind` values ever carry a `signal_id`** (confirmed by reading `boundaries.ts` directly — it throws if `signal_id` is missing for these two): `follow_up_on_signal` and `uncertainty_clarification`. `pending_clarification` is only ever meaningfully set for these; for the other four kinds (`historical_experience`, `incident_investigation`, `disentangling_question`, `other`), there is no specific signal to clarify, and the field should stay `null`.

**What runtime state is required?** The `pending_clarification` object itself, set the moment a question of one of the two eligible kinds is asked, and passed into the *next* turn's Extraction call as context.

**Belongs inside `StructuredUnderstanding`, or outside it?** **Outside.** `StructuredUnderstanding` is Interview Engine's frozen model of *knowledge*; `pending_clarification` records *what was just asked, awaiting a reply* — a fact about the conversation's own execution state, not about what's understood. This mirrors how `phase` itself is already passed as an external parameter to `decision.ts`/`candidate-question.ts`, never sourced from inside `StructuredUnderstanding` as primary truth. **`[IMPLEMENTATION GUIDANCE]`** `pending_clarification` lives in Runtime's own session state, sibling to `StructuredUnderstanding`.

**Does it survive refresh / interruption?** Only if persisted as part of session state (§6/§7) — and it must be, since an abandoned-then-resumed conversation needs to correctly interpret the user's next reply as answering the *same* pending question, not lose that context. Unlike `current_phase`/gate states (§2, §6 — cheaply recomputable), `pending_clarification` is **not** cheaply re-derivable from `StructuredUnderstanding` alone (reconstructing it would mean replaying the full turn history's ask/answer alternation) — a case where direct storage genuinely beats derivation.

**Can there ever be more than one simultaneously?** **No**, by construction of the existing turn discipline (confirmed by re-reading `run-dialogue.ts`'s own loop): one turn produces at most one candidate proposal, and Constraint B lets through at most one question before the loop waits for a reply. Model as `PendingClarification | null`, a singular optional value, not an array — matching the one-question-per-turn discipline the rest of the system already enforces, not introducing new multiplicity.

**Challenge: property of understanding, or of interview execution?** **Of execution.** It says nothing about *what is known* (`StructuredUnderstanding`'s job); it says *where the conversation currently stands in its own turn-taking protocol*. This is precisely why it does not belong inside `StructuredUnderstanding`.

---

## 4. Declines

Confirmed shape (`boundaries.ts`): `DeclineSignal = { scope: 'question' | 'phase' | 'interview' | 'ambiguous' }`.

**Evaluating the Part 2 proposal (UI affordances, not LLM interpretation): confirmed.** `evaluateBoundary` already accepts `decline?: DeclineSignal` as a clean, minimal, already-typed external input with no requirement that it originate from free-text classification. Three distinct UI actions ("Skip this question" → `question`, "Skip this section" → `phase`, "Stop" → `interview`) map 1:1 onto the real scope values with zero new inference surface — avoiding an entire new decline-classifier subsystem that would need its own evaluation rigor, matching Extraction's, for something a button solves for free.

**`[FINDING]`** Under a UI-affordance-only design, `scope: 'ambiguous'` becomes structurally unreachable — a button always cleanly maps to one of the three real scopes. Per Alpha's own finding, `'ambiguous'` declines were already transient/never-persisted, so this is likely an acceptable consequence, not a defect — but it is a real, observable effect of the affordance-only design worth stating plainly rather than leaving silently implied.

**How each scope moves through the runtime:**
- **Question-scope:** transient (Alpha: "not persisted anywhere"). Runtime feeds it into `evaluateBoundary` for this turn only, applies the returned `boundary_action_scope`, and persists nothing beyond the `BoundaryState` update the turn loop already needed to persist regardless.
- **Phase-scope:** ends the current phase early. Per §11, phase state "must record which occurred" — `boundaries.ts` already tracks this internally (`phases_ended: Phase[]`, per `run-dialogue.ts`'s own header comment, itself flagging this as "a real, narrower modeling gap" from Alpha). **This is the exact input §2's phase-transition function needs from `BoundaryState`** — a phase ended by decline must count as "over" for advancement purposes, same as one ended naturally.
- **Interview-scope:** ends the whole interview. Sets `opt_out_scope: 'interview'`, `completion_reason: 'declined'`, and (per existing semantics) `gate_1_state: 'not_applicable_declined'` if Gate 1 wasn't already met. Runtime recognizes this as terminal, stops calling Extraction/candidate-generation, and proceeds to completion using whatever `StructuredUnderstanding` exists — exactly what `full_opt_out`'s own fixture and the Beta E2E tests already validated (all-empty `ProjectionOutput`).

**State that changes:** `BoundaryState` (always, on every decline); `StructuredUnderstanding.opt_out_scope` (interview-scope only); phase-ended tracking (phase-scope only).
**State that never changes:** any already-confirmed scoped observation or tool mention — a decline never retroactively un-confirms anything, matching supersede-and-mark's own "never destructive" discipline for a different kind of state.

---

## 5. Turn loop

**JD's proposed ordering, challenged directly, with citations:**

1. **"Extraction" and "Mutation" are not two separate steps.** They are already one fused pipeline (`runExtractionPipeline`) — "propose vs. decide" is enforced *inside* it, per Alpha's own retrospective calling this "the single most validated principle in the project." Listing them separately in the loop risks re-decomposing something already proven as one unit.
2. **Decline pre-processing is missing from the proposed sequence entirely**, and it must happen *before* gate evaluation, not after Constraint B. This isn't a stylistic preference — it's a previously-shipped bugfix: Phase 7 found and fixed exactly this ordering bug (`opt_out_scope` must be current before gate evaluation, since `evaluateGate1`'s decline branch and `evaluateGate2`'s decline check both read it mid-turn). The loop must reflect this fix, not silently reintroduce the bug by drawing the diagram in the order that caused it.
3. **Phase transition belongs *before* candidate generation, not after Constraint A/B, contradicting the proposed order.** §11: *"A single user turn can supply Phase 1, 2, and 3-relevant information simultaneously... Phase state tracks what's been understood, not what's been asked in sequence."* If a turn's own mutation completes Phase 1 criteria, the *same* turn's candidate generation should already reflect Phase 2 — not ask one more stale Phase-1 question because phase was recomputed too late. Placing phase transition after Constraint A/B (JD's original order) would ask this turn's question using last turn's phase.
4. **A natural-completion check is missing from the proposed sequence.** Nothing in the proposal decides "gates are now satisfied — stop asking, move to completion" as a live, per-turn trigger. This is addressed at length in §8, including a genuine unresolved contradiction; the loop below inserts the check but does not resolve what it should trigger.

**Revised loop (conceptual, not code):**

```
receive user turn
        |
Extraction + Mutation  (ALREADY ONE FUSED STEP -- runExtractionPipeline; do not split)
        |
Decline pre-processing  (opt_out_scope resolved BEFORE gate evaluation -- Phase 7's own bugfix)
        |
Gate 1 + Gate 2 evaluation  (both scopes; unchanged)
        |
Phase transition  (recomputed fresh from updated SU + BoundaryState.phases_ended --
        |          reordered relative to JD's proposal; see challenge #3 above)
        |
Natural-completion check  (NEW -- gate_1 met AND gate_2 stable, i.e. Phase 3's
        |                  own "Continue only if Gate 2 has not yet stabilized"
        |                  loop condition no longer holds, per PRD Section 8 --
        |                  nothing currently does this live)
        |
        +-- complete --> persist final state --> runCRCConversation()
        |                (Retrieval + Projection, once, resolved Section 8) --> done
        |
        +-- not yet complete
                |
        Candidate generation  (uses this turn's freshly-computed phase)
                |
        Constraint A
                |
        Constraint B  (applies decline scope, if this turn was a decline)
                |
        Set/clear pending_clarification  (NEW -- set if a follow_up_on_signal /
                |                          uncertainty_clarification question was
                |                          just asked; cleared once consumed by
                |                          the NEXT turn's Extraction call)
                |
        Persist state  (SU + BoundaryState + pending_clarification + computed
                |        phase/gate states, as a cache -- see Section 6)
                |
        Assistant response  (proposal.question_text verbatim if ASK; fixed,
                |             Runtime-owned acknowledgment copy otherwise -- see
                |             Section 1 -- never a new generation layer)
                |
        repeat (wait for next user turn)
```

**Why Persist happens before Assistant response (unchanged from JD's proposal, confirmed correct):** durability should not depend on the response actually reaching the client. If persistence happened after sending the response, a crash between "send" and "save" would leave a `pending_clarification` the client thinks exists but the server never recorded — the next turn's Extraction would then be missing exactly the context it needs.

---

## 6. Session state

Preferring derivation over storage, per instruction — every field challenged:

| Field | Classification | Reasoning |
|---|---|---|
| `structured_understanding` | **Durable** | The actual accumulated knowledge; not derivable from anything else. |
| `boundary_state` | **Durable** | Tracks per-signal follow-up counts, caps, `phases_ended` — none of this is reconstructable from `StructuredUnderstanding` alone. |
| `pending_clarification` | **Durable** | Per §3 — not cheaply re-derivable without replaying full turn history. |
| `current_phase` | **Recomputable** | Per §2's finding — treat any stored value as an advisory cache only, always re-verified via `computePhase()` before use, never trusted blindly on load. |
| `gate_1_state`, `gate_2_state` | **Recomputable** | `evaluateGate1`/`evaluateGate2` are already pure functions of `StructuredUnderstanding`; storing them is a legitimate performance cache, not a source of truth. |
| `completion_reason`, `opt_out_scope` | **Transient during the live loop; durable only once truly complete** | Meaningful only at actual completion — computed once, matching how `run-dialogue.ts` already computes them once, after the loop ends, never per-turn. |
| Full raw `conversation_history: Message[]` | **Not required by the core loop at all — recommend omitting from v1 session state** | Nothing in `gates.ts`/`boundaries.ts`/`decision.ts`/`candidate-question.ts` ever re-reads raw past turn text; everything they need is already captured structurally in `StructuredUnderstanding`'s own embedded `source_turn`/`source_statement` provenance fields. A literal chat-scrollback transcript, if the product wants one, is a separate, UI-only, append-only concern — deferred (§10), not designed here. |
| `RetrievalResult[]` / `ProjectionOutput` | **Transient / on-demand, pending §8's resolution** | Not running state updated every turn under the "once at completion" default; the final, one-time output of `runCRCConversation()`, persisted (if at all) only as part of the completed record. |

---

## 7. Recovery

- **Refresh:** reload session by token (Part 2's recommended Supabase-backed approach). Full `StructuredUnderstanding` + `BoundaryState` + `pending_clarification` restored; phase/gate states recomputed fresh per §2/§6, never trusted from a stale stored value.
- **Browser close:** identical to refresh, later — no new semantics needed as long as the client can reobtain its session token.
- **Retry (e.g. a failed Extraction call):** the failed turn was never persisted (§5's ordering guarantees persistence only happens after a turn fully resolves) — retry simply resubmits the same text against the same unchanged baseline. No new interview semantics invented; this falls directly out of the loop's own ordering.
- **Abandoned interview:** no special handling. The session sits in whatever state it was left in — not auto-completed, not auto-expired. An expiry/cleanup *policy* is a deferred product decision (Part 2), not a runtime semantics question.
- **Completed interview:** the record becomes read-only from Runtime's point of view. **`[IMPLEMENTATION GUIDANCE]`, newly stated here, not previously specified anywhere:** Runtime should check `completion_reason !== null` on session load and, if set, skip the turn loop entirely and return the already-computed `ProjectionOutput` — a completed session must never re-enter the live loop and accept a new turn.

---

## 8. Completion

### Retrieval/Projection invocation cadence — resolved (JD decision, 2026-08-08)

**Decision: Retrieval is snapshot-safe, not turn-scheduled.** Retrieval remains valid against any current `RetrievalHandoff`, including sparse and partial snapshots — this is unchanged and does not depend on how often it's invoked. CRC v1's live runtime invokes `buildRetrievalHandoff → Retrieval → Projection` **only when the Interview terminates and a final result is being produced.** Projection is likewise finalization-only in v1.

**Reasoning (JD's own, recorded here in full since it governs §5/§9 below):** Retrieval cannot influence Interview, so nothing is gained by running it earlier; no current subsystem consumes an intermediate Retrieval result; no user-facing intermediate knowledge output exists in v1; Prototype Beta validated exactly the completion-time path (292/292 tests, all end-to-end fixtures); and continuously computing output nothing consumes adds coupling without product value.

**This is a deliberate v1 scoping-down from `PRD_CRC_v1.0.md` §8's own literal words, not an oversight — worth recording plainly, not silently smoothing over.** §8's internal flow diagram for Phase 3 includes *"Update retrieval (Retrieval Engine, silently)"* as a step inside the per-turn loop itself — the actual normative source of `RETRIEVAL_ENGINE_ARCHITECTURE.md`'s "every turn" language, confirmed by direct citation, not inference. JD's decision knowingly narrows this for CRC v1's actual invocation pattern, for the product reasons above; `RETRIEVAL_ENGINE_ARCHITECTURE.md` has been updated (§1, §2) to state this as an invocation-timing choice layered on top of an unchanged semantic guarantee, not a change to what Retrieval itself is or does.

### Answering the rest of §8 directly

- **When does Interview stop?** Three cases, per existing `completion_reason` semantics: (a) `gate_1_unmet_exhausted` — Phases 1–2's natural flow exhausts without meeting Gate 1, no forced looping (§11); (b) declined at interview scope (§4); (c) `gate_1_gate_2_met`, reached once both gates are satisfied — **no longer an open gap**: per §2's corrected finding, this happens once Phase 3's own loop condition (`"Continue only if Gate 2 has not yet stabilized"`, `PRD_CRC_v1.0.md` §8) stops holding, moving into the Completion Check, which stops the interview the moment both gates read as met.
- **When is Retrieval called?** Once, at Interview termination — resolved above.
- **When is Projection called?** Once, at Interview termination, immediately after Retrieval, within the same `runCRCConversation()` call — resolved above.
- **Can Projection ever run before Gate 2?** Structurally, yes — `assembleProjectionOutput` is a pure function with no gate-state check anywhere in its own contract. **Should it, in v1?** No — the decision above makes this moot for v1 by construction (Projection only ever runs once, at termination, when gates have already been evaluated as part of reaching that terminal state). A live preview remains a legitimate *future* product feature, requiring its own explicit review, not something v1's runtime builds.

---

## 9. Failure taxonomy

| Failure | Category | Runtime behavior |
|---|---|---|
| Anthropic call fails (Extraction / Candidate generation / Constraint A), timeout, malformed JSON | **Technical retry** | Turn was never persisted (§5's ordering) — safe to retry against the unchanged prior baseline. |
| User declines (any scope) | **User decline** | Not a failure — a valid conversational outcome, per §4. |
| Gate 1 unmet, or simply mid-conversation | **Incomplete interview** | Valid, ongoing state. Retrieval/Projection not yet invoked under the proposed §8 default. |
| `completion_reason` set | **Completed interview** | Terminal, read-only per §7 — `ProjectionOutput` exists and is final. |
| Session untouched for a long period | **Abandoned interview** | Indistinguishable at the runtime level from "incomplete, hasn't received its next turn yet" — only a product-level policy (deferred) would ever need to distinguish these. |
| Stored session fails structural validation on load | **Corrupted session** | Detected by validating shape on every load, never trusting stored JSON blindly. Response: start a fresh session and say so plainly — never attempt to "repair" or guess at a corrupted structure, since that risks fabricating understanding the user never actually established. |

These stay visibly distinct — never collapsed into one generic error, per instruction.

---

## 10. Challenge the architecture

**Highest-risk remaining architectural assumption:** with the invocation-cadence question resolved (§8), the highest-risk remaining assumption is the Phase 3→4/completion-check timing itself — specifically, that Gate 2's stability check, running live turn-by-turn against real (not scripted) conversations, correctly identifies "the last one or two turns haven't materially changed my model" without either ending too early (a thin, premature handoff) or too late (an unnecessarily long interview). This was never exercised under live, real-time conditions in Prototype Alpha or Beta — both operated on scripted or pre-built `StructuredUnderstanding` snapshots, never a genuinely live turn-by-turn stability judgment.

**Hidden coupling introduced by the runtime:** phase transition now needs *both* `StructuredUnderstanding` and `BoundaryState` (§2/§4 cross-check) — a new coupling between two pieces of state that were previously fairly independent (`StructuredUnderstanding` = knowledge, `BoundaryState` = conversation-boundary bookkeeping). Not a defect, but a real, newly-discovered dependency that didn't exist before this document's own analysis.

**Any subsystem whose responsibility is becoming blurred?** None across Interview/Retrieval/Projection — those stay cleanly separated. Within Runtime itself: the "fixed acknowledgment copy for non-`ASK` turns" responsibility (§1, §5) carries a discipline risk — if it ever grows beyond a small set of fixed strings, it would start looking like a second, parallel Projection-shaped rendering layer inside Runtime. Worth watching, not yet a problem.

**State duplicated unnecessarily?** `current_phase`, `gate_1_state`, `gate_2_state` stored redundantly alongside their own pure recomputation functions (§2, §6) — acceptable *only* as a cache, never as sole source of truth.

**Anywhere an LLM is asked to solve a deterministic problem?** None found. Phase transition, decline handling, and completion-detection are all designed to stay fully deterministic. The only LLM surfaces remain the three already-validated ones (Extraction, Candidate generation, Constraint A) plus the still-unbuilt `pending_clarification` enhancement, which itself stays deterministic (templated `unresolved_summary`, per Alpha's own D3 recommendation, reaffirmed here unchanged).

**Anywhere deterministic logic is becoming overly stateful?** The natural-completion check (§5, §8) is new logic depending on more state at once (`StructuredUnderstanding` + `BoundaryState` + freshly-computed phase and gate states) than any single existing Interview Engine function did before. Not excessive yet, but a strong candidate for its own dedicated, isolated test suite once built — the same rigor every other gate/boundary function already received, not folded into general coverage.

**Anything that should be deferred instead of designed now?**
- Live-updating Projection cadence (explicitly deferred pending §8's confirmation).
- Chat-scrollback `conversation_history` persistence (§6) — a UI-only concern, not core-loop state.
- Phase 4 ("Completion Check") semantics beyond "it's the terminal phase" (§2) — genuinely underspecified in the source architecture; not invented here.
- Any session expiry/cleanup policy (§7, §9) — a product policy, not a runtime-semantics question.

---

## Return

**Runtime ownership:** cleanly separable from Interview/Retrieval/Projection, with two new, small, previously-ownerless responsibilities identified — phase-transition logic (belongs in Interview Engine, not designed there yet) and fixed non-`ASK` acknowledgment copy (belongs in Runtime).

**Phase progression:** a derived property, not a state machine — a pure `computePhase(SU, BoundaryState)` function mirroring Gate 1/2, returning `1 | 2 | 3` only. All transitions are grounded in normative text, not inference: 1→2 and 2→3 from `INTERVIEW_ENGINE_ARCHITECTURE.md` §11, 3→Completion from `PRD_CRC_v1.0.md` §8's own Phase 3 flow diagram ("Continue only if Gate 2 has not yet stabilized"). **Adopted runtime model, confirmed by dependency search across 8 areas (no meaningful dependency on `current_phase === 4` found anywhere): Phase 1 → Phase 2 → Phase 3 → Completion Check → Finalization** — "Phase 4" stays a PRD conceptual label for the gate-check behavior, never stored or traversed as an ordinary phase.

**Pending clarification:** belongs in Runtime session state, not `StructuredUnderstanding` — a property of execution, not understanding. Singular, not plural. Requires direct persistence (not cheaply derivable).

**Declines:** UI-affordance design confirmed as sound and sufficient — no new LLM classifier needed. One real, disclosed consequence: `scope: 'ambiguous'` becomes unreachable under this design.

**Turn loop:** JD's proposed ordering was challenged on three points (Extraction/Mutation are one fused step, not two; decline pre-processing was missing and must precede gate evaluation, per a previously-shipped bugfix; phase transition must precede candidate generation, not follow Constraint A/B, per §11's own words) and a fourth gap was found (no natural-completion check existed in the proposal at all) — that check's trigger condition is now precisely defined (§8).

**The Retrieval/Projection invocation-cadence contradiction is resolved (JD decision, 2026-08-08):** Retrieval remains snapshot-safe and semantically unchanged; CRC v1's runtime invokes `buildRetrievalHandoff → Retrieval → Projection` once, only at Interview termination. `RETRIEVAL_ENGINE_ARCHITECTURE.md` §1/§2 updated narrowly to state this as an invocation-timing choice layered over an unchanged semantic guarantee — no Retrieval implementation changed, none exists yet to change. Recorded plainly: this is a deliberate v1 narrowing of `PRD_CRC_v1.0.md` §8's own literal per-turn flow-diagram language, not an oversight.

**Recommendation:** this document is ready for implementation planning. The one contradiction blocking it has been resolved by explicit decision; the Phase 3→4 gap has been closed by direct citation rather than inference. The remaining open items (Discovery Data's `current_phase` dependency, if any; live Gate 2 stability behavior under real conversations, §10's highest-risk item) are genuine but not blocking — the same standard `RETRIEVAL_ENGINE_ARCHITECTURE.md` and `PROJECTION_LAYER_ARCHITECTURE.md` were each held to before their own implementation-planning verdicts.
