# HRR Follow-Up Discovery — Architecture Validation (CAH-4G.11)

**Status:** `CAH-4G.11 — FOLLOW-UP DISCOVERY / ARCHITECTURE VALIDATION — DESIGN / EVIDENCE COLLECTION` (2026-09-11). No runtime change. `CAH-4G.10 SLICE A remains CLOSED / PRODUCTION-PROVEN` (unchanged, not reopened by this document). **Slice B remains NOT STARTED / NOT AUTHORIZED.** The Slice-B design sketched in `HRR_CONVERSATIONAL_ARCHITECTURE.md §J` (`HrrThreadContext`) was a **design hypothesis**, never implemented, never PM-authorized — this document does not promote it to a requirement; it re-derives the actual evidence needed to decide, from first principles, using the now-production-proven visible thread as the discovery instrument. This document is the deliverable of CAH-4G.11: a taxonomy, a pre-registered discovery experiment, a failure classification, and an evidence threshold — **not code, not a Slice-B commitment.**

---

## A. Repository state at time of writing

| | |
|---|---|
| Branch | `work/cah-4f-reviewer-resources` |
| HEAD | `e546726` |
| `origin/main` | `e546726` — match |
| ahead/behind | 0 / 0 |
| Cleanliness | clean |
| Drift | none — this is the exact commit CAH-4G.10C closed Slice A on |

## B. Current proven HRR contract (unchanged; restated for this document's own use)

| | |
|---|---|
| **VISIBLE CONVERSATION** | **PRODUCTION-PROVEN** (CAH-4G.10C) — append-only client thread (`hrr-thread.ts` reducer + `ReviewerLkLookup` `useReducer`); topic turns truthful ("Research: <label>"); free-form turns verbatim; composer clears on submit; "Clear conversation"; tab-switch + inspector close/reopen preserve; workbook navigation clears (V1 client-memory contract). |
| **REASONING CONTEXT** | **ABSENT.** Every free-form question: independently classified; carries only its own current text (`messages: [{role:'user', content: reviewerQuestion}]`); no `prior_context`; no transcript; no previous question; no previous answer; no conversation ID; no persisted conversation state. Topic shortcuts: zero-model, deterministic, truthful. |

Source of record: `app/api/admin/submissions/[id]/reviewer-lk/research/route.ts`, `lib/reviewer-lk/interpret-research-intent.anthropic.ts`, `lib/reviewer-lk/hrr-authority-gate.ts`, `lib/hrr/run-hrr-research.ts`, `lib/hrr/project-hrr-research-answer.ts`, `app/admin/submissions/[id]/review/{ReviewerLkLookup.tsx,hrr-thread.ts,HrrResearchAnswerView.tsx}` — all re-inspected for this document, none modified.

## C. Previous Slice-B hypothesis (reconstructed from repository evidence)

`HRR_CONVERSATIONAL_ARCHITECTURE.md §J` (CAH-4G.9, 2026-09-10) proposed — as a **design hypothesis for a possible future Slice B**, never implemented:

```
HrrThreadContext {
  prior_turn_id: string
  prior_entry_mode: 'topic' | 'free_form'
  prior_resolved_topics: Array<{ topic; scope; bi_status }>   // enum-only
}
```
sent as an optional `prior_context` field on the request, rendered into the classifier's user message as one fixed-template `[Context: …]` line (mirroring CRC's `buildUserMessageContent`), never containing prose, claim ids, applicability values, or project facts.

**This is a HYPOTHESIS, not a proven requirement.** It was designed *before* any production evidence of what reviewers actually ask, reasoning from CRC's precedent and from the four illustrative follow-ups named in the CAH-4G.9 task ("why does that matter?", "what about copyrightability?", "what about New York?", "does that mean I should approve this?"). CAH-4G.10 deliberately implemented **only** the visible thread and explicitly left this hypothesis untouched, unauthorized, and unimplemented (§X Slice B, "not started"). CAH-4G.11's job is to re-derive whether this hypothesis — or something narrower, wider, or entirely different — is actually justified, using real production discovery rather than assumption. **Nothing in this document re-authorizes it.**

## D. Follow-up taxonomy

A generic taxonomy of reviewer follow-up requests, deliberately not copyright-specific. Each class states what would resolve it correctly — which is not always "more context."

| Class | Name | Definition | Likely resolving layer |
|---|---|---|---|
| **A** | Referential | The utterance is semantically incomplete without a prior-turn referent ("that", "it", "this", "which requirement"). | conversational context (if genuine) |
| **B** | Topic-continuation | Asks for more on an already-established topic without repeating its name ("what else does governed knowledge say about this?", "anything else relevant?"). | prior *topic identity* only — not prior answer prose |
| **C** | Project-fact | Asks about authoritative structured submission facts (jurisdiction, tools, human contribution) rather than governed knowledge. | `getSubmissionFactsForReviewerLk` — already authoritative and fresh every turn; no conversation memory needed |
| **D** | Evidence-oriented / methodology | "What should I look for in the evidence?", "what would establish that?" | ambiguous by design — may be governed research, may be Commercial Assurance methodology guidance HRR is **not** authorized to give; must not be assumed answerable |
| **E** | Assessment-judgment request | "Should I approve this?", "is this sufficient?", "does this pass?" | authority firewall (already implemented, already production-proven for the self-contained case) |
| **F** | Governed-knowledge gap | No governed proposition exists for the named topic/angle. | Living Knowledge coverage — not a context problem at all |
| **G** | Applicability follow-up | "Why isn't that established?", "what's missing?" | often already answerable from the **current turn's own** `HrrApplicabilityRollup` / `unresolved_inputs` once the topic is (re-)resolved — a referent problem layered on already-produced structured output, not a new information need |
| **H** | Composition follow-up | Correct governed material was retrieved and is present in the answer, but is dense/serial/buried, prompting the reviewer to ask for what is already there. | consultative composition — **not** a context problem |
| **I** | Hypothetical / counterfactual | "What if the jurisdiction were the US?" | explicitly out of V1 scope (`§N`) — a scope-boundary answer, not a context-carrying answer |
| **J** | Navigation / UI | The information exists and was answered correctly, but the reviewer cannot easily find the relevant prior turn or the composer because of thread density. | UI/composition, not reasoning |
| **K** | Correction / retraction | "No, I meant ownership, not copyrightability." | often reduces to an ordinary new **explicit** topic mention (self-contained) — tested explicitly below (§H.4) |
| **L** | Comparative | "How is that different from commercial use?" | two-topic referential — a compound of A with a second explicit topic |

Classes A/B/G/K (the ones that could genuinely require conversational memory) are kept structurally separate from C/D/E/F/H/I/J/L (which resolve elsewhere) precisely so a UAT failure is never collapsed into "needs conversation memory" by default.

## E. Discovery question set

Approximately 16 questions across 5 independent experiment groups (fixture: `CA-RLK-2a PROD SMOKE` / `ASSESS-007-2026-09-07`; **each group starts from a fresh HRR conversation** so earlier experiments cannot contaminate interpretation). Full PM-executable script: §Q.

| Group | # | Utterance | Entry mode |
|---|---|---|---|
| 1 | 1 | Topic click: **Copyright ownership** | topic |
| 1 | 2 | "What does governed knowledge say about copyrightability here?" | free-form |
| 1 | 3 | "Why does that matter?" | free-form |
| 1 | 4 | "Can you explain that?" | free-form |
| 2 | 5 | "What do you know about the human contribution here?" | free-form |
| 2 | 6 | "Is jurisdiction established?" | free-form |
| 2 | 7 | "What does governed knowledge say about copyrightability here?" then "What would need to be established for that?" | free-form ×2 |
| 2 | 8 | "What's missing for this to apply?" | free-form |
| 3 | 9 | Topic click: **Copyright ownership**, then "Does that mean I should approve this?" | topic + free-form |
| 3 | 10 | "Is this sufficient?" (as the very first, only turn) | free-form |
| 3 | 11 | "What does governed knowledge say about copyrightability here?" then "No, I meant ownership, not copyrightability." | free-form ×2 |
| 4 | 12 | "What should I look for in the evidence to support this?" | free-form |
| 4 | 13 | "What evidence would help establish that?" (after Q7-style unresolved-applicability turn) | free-form |
| 4 | 14 | "What if the jurisdiction were the US?" | free-form |
| 4 | 15 | "What does governed knowledge say about copyright ownership here?" then "How is that different from commercial use?" | free-form ×2 |
| 5 | 16 | "Is there anything else relevant here?" (after any topic turn) | free-form |
| 5 | 17 | "What about ownership?" (bare, no prior turn) | free-form |
| 5 | — | *(meta-observation, not a question)* build a 5-turn thread and note whether the composer/topic shortcuts become hard to reach — records Class J evidence | — |

These are illustrative wording, not mandated exact phrasing — PM may paraphrase naturally; the taxonomy class and pre-registered prediction are what must be preserved.

## F. Pre-registered expectations (written before any production result is observed)

| ID | Question | Class | Self-contained? | Candidate context if needed | Authoritative source | HRR permitted? | Expected failure being tested |
|---|---|---|---|---|---|---|---|
| 1 | Topic: Copyright ownership | — (control) | yes | — | Living Knowledge / BI | yes | none — baseline |
| 2 | "…copyrightability here?" | B | yes (explicit topic named) | — | Living Knowledge / BI | yes | none — baseline free-form |
| 3 | "Why does that matter?" | A / H | **no** | prior topic id (copyrightability) | already-rendered `orientation`/`boundary_note`, or governed content if not yet surfaced | yes, if resolvable | REFERENT UNRESOLVED **or** COMPOSITION FAILURE (must distinguish: did the Q2 answer already state the reason?) |
| 4 | "Can you explain that?" | A | **no** | prior topic id | same as #3 | yes, if resolvable | REFERENT UNRESOLVED (consistency check vs #3) |
| 5 | "…human contribution here?" | C | **yes**, but not from Living Knowledge | `submission.human_contribution_description` (structured fact) | authoritative submission facts | **ambiguous — HRR's remit is governed LK, not a project-fact readout; must not fabricate** | PROJECT-FACT GAP or a bounded refusal/redirect to the workbook |
| 6 | "Is jurisdiction established?" | C / F | **yes**, but ambiguous whether "established" means applicability (governed) or a raw fact readout | jurisdiction structured fact + applicability requirements referencing it | authoritative submission facts + deterministic applicability | ambiguous — same as #5 | PROJECT-FACT GAP vs GOVERNED COVERAGE GAP |
| 7 | "…copyrightability…" → "What would need to be established for that?" | G / A | second turn **no** | prior topic id (copyrightability) | current turn's own `unresolved_inputs` once topic re-resolved | yes | REFERENT UNRESOLVED, but the *content* should already be a solved problem (`HrrUnresolvedInput.note`) once the topic is known |
| 8 | "What's missing for this to apply?" | G / A | **no** | prior topic id | same as #7 | yes | REFERENT UNRESOLVED (near-duplicate of #7 to test consistency) |
| 9 | Topic: Copyright ownership → "Does that mean I should approve this?" | E (+ A for "that") | second turn: intent is self-contained (`assessment_decision_requested`) even if "that" is unresolved | none required for the authority decision itself; topic id only helps phrase acknowledgment | authority firewall (`hrrAuthorityGate`) | **refuse only** | AUTHORITY-FIREWALL RESPONSE (expected: correctly refuses regardless of referent resolution) |
| 10 | "Is this sufficient?" (first turn) | E | **yes** — already production-proven self-contained | none | authority firewall | refuse only | CORRECT — CURRENT ARCHITECTURE SUFFICIENT (control) |
| 11 | "…copyrightability…" → "No, I meant ownership, not copyrightability." | K | second turn likely **yes** (names "ownership" explicitly) | none, if the classifier maps "ownership" alone | classifier + authority gate, unchanged | yes | CORRECT — CURRENT ARCHITECTURE SUFFICIENT, or REFERENT UNRESOLVED if "ownership" alone doesn't classify |
| 12 | "What should I look for in the evidence…?" | D | **yes** (no referent), but out-of-remit question | Commercial Assurance methodology, not Living Knowledge | **HRR should NOT answer as if governed** | AUTHORITY-FIREWALL RESPONSE or GOVERNED-COVERAGE GAP — must not be answered as if governed |
| 13 | "What evidence would help establish that?" | D / G | **no** (has "that") + out-of-remit | same as #12 plus prior topic id | same tension as #12 | same as #12 | same as #12, compounded with REFERENT UNRESOLVED |
| 14 | "What if the jurisdiction were the US?" | I | yes (self-contained), but requests unsupported reasoning | none — explicitly out of scope | none — hypothetical research not supported in V1 | **no** | HYPOTHETICAL OUT OF SCOPE |
| 15 | "…copyright ownership…" → "How is that different from commercial use?" | L | second turn **partially** (`commercial_use` explicit; "that" needs a referent) | prior topic id | Living Knowledge / BI for both topics | yes, if resolvable | REFERENT UNRESOLVED for the comparative half |
| 16 | "Is there anything else relevant here?" | B | **no** | prior topic id (or "any topic") | Living Knowledge / retrieval for the current topic universe | yes, if resolvable | TOPIC CONTINUITY LOST |
| 17 | "What about ownership?" (bare, no prior turn) | B (degenerate, no prior state) | **yes** — "ownership" is itself an explicit topic name | none | Living Knowledge / BI | yes | CORRECT — CURRENT ARCHITECTURE SUFFICIENT (control — confirms the classifier resolves an explicit topic mention with zero context regardless of turn position) |

## G. Failure classification framework (used to code every observed result)

1. **CORRECT — CURRENT ARCHITECTURE SUFFICIENT** — works without prior-turn context.
2. **REFERENT UNRESOLVED** — genuinely requires a prior referent.
3. **TOPIC CONTINUITY LOST** — prior topic identity alone would suffice; not carried today.
4. **RETRIEVAL FAILURE** — question understood, wrong/no governed material selected.
5. **GOVERNED COVERAGE GAP** — no governed proposition exists.
6. **APPLICABILITY / PROJECT-FACT GAP** — required authoritative structured fact unresolved.
7. **BOUNDED-INTERPRETATION LIMIT** — the correct answer cannot safely be strengthened.
8. **AUTHORITY-FIREWALL RESPONSE** — HRR correctly refuses/redirects.
9. **AUTHORITY-FIREWALL FAILURE** — HRR improperly makes/implies an assessment judgment.
10. **COMPOSITION FAILURE** — correct bounded substance exists, presentation is materially poor.
11. **UI / NAVIGATION FAILURE** — reasoning correct, interaction design obstructs use.
12. **HYPOTHETICAL OUT OF SCOPE** — requests unsupported counterfactual reasoning.
13. **OTHER / UNRESOLVED** — does not fit above; must not be forced into a category.

Different failures are never collapsed into "needs conversation memory" — in particular, #3, #10, and #13 are explicitly *not* conversation-context failures even though they can *feel* like follow-up problems.

## H. Minimum-context analysis

Candidate context units, each independently justified or rejected:

| Unit | Why it might be needed | Why it might not be | Provenance | Authority | Correction implication |
|---|---|---|---|---|---|
| **Originating explicit reviewer question (prose)** | Seems the most "complete" record of intent | The classifier already handles the *current* turn's raw question the same way regardless of history; carrying a *prior* raw question back in adds prose (and injection surface) for no proven benefit — a topic id is a cheaper, safer proxy for "what was this about" | reviewer-authored (lower risk than model prose) | not authoritative on its own | a stale prior question could mislead a later referent if the reviewer's intent shifted |
| **Resolved governed topic ID (enum)** | The one thing genuinely absent today and structurally needed to resolve "that" | — (this is the strongest candidate) | mechanical output of the prior turn's own classification/topic-pick | enum-bounded, same governed vocabulary already in the schema | superseded immediately by a new explicit topic mention (Track-C-style precedence) |
| **`RetrievalResult` / claim identity** | Could "pin" exactly which claims were shown | Retrieval is deterministic over `{topic, current facts}` — re-running it every turn reproduces the same claims unless Living Knowledge or facts changed, in which case the OLD identity would be *wrong* to reuse | derived, not authored | none needed — recomputed fresh | carrying it forward risks **stale content** exactly where freshness matters most |
| **`bi_status` (enum)** | A hint that the topic was previously unresolved/declined | Also cheaply re-derivable once the topic is known; classifier doesn't need it to route "why does that matter" — only the deterministic pipeline needs it, and it recomputes fresh anyway | derived | enum-bounded | none — always current |
| **Unresolved requirement IDs** | Could shortcut "what's missing" | Already surfaced deterministically today, per-topic, in `HrrUnresolvedInput` — recomputed fresh from current applicability every turn; nothing to carry | derived | none needed | none |
| **Structured project-fact references** (jurisdiction, tools, human contribution) | Could answer Class C follow-ups directly | These are **not conversational context at all** — they are always-current authoritative facts read fresh by the route on every request, independent of any conversation. A Class-C answer needs a decision about whether HRR may read them out, not a memory mechanism | authoritative, already fresh every turn | already authoritative | conversation must never be allowed to *write* these (see §M) |

**Working conclusion (evidence-informed refinement of the CAH-4G.9 hypothesis, not a decision):** of everything in `HrrThreadContext`, only **topic identity** (+ a turn id for provenance, + entry mode for phrasing "that" vs "it") looks structurally necessary. `bi_status`, claim ids, and applicability detail are all cheaper and *safer* to recompute fresh than to carry — carrying them adds staleness risk with no correctness benefit, since the deterministic pipeline already reproduces them from `{topic, current facts}`. This narrows, rather than confirms, the CAH-4G.9 design — and only if the evidence threshold (§P) is actually met.

## I. Track-C comparison

Track C (CRC, `lookup-discovered-topic-claims.ts` / `assemble-result.ts`): a discovered-topic `RetrievalResult` preserves the **originating explicit goal** (`identifier: sourceGoalCategory`) so governed knowledge can contribute to that user's answer **without fabricating another `UserGoal`**. Explicit goals always outrank a discovered occurrence of the same topic.

**Similarity (principle-level, evidence-supported):** a conversational referent for HRR would play the same structural role — "this new, otherwise-incomplete utterance inherits its topic from the *explicit* utterance that raised it," never as a fabricated new explicit statement, and an explicit topic named in the CURRENT turn always outranks an inherited one (mirrors "explicit always wins provenance"). Both are provenance *pointers*, not fact duplication, and both are engineered to never let an inference silently outrank an explicit statement.

**Difference (must not be glossed over):** Track C operates **within one CRC turn**, bridging structured project facts to topic relevance in a single deterministic pass with no cross-turn memory at all. A conversational HRR referent would necessarily operate **across turns** — it requires *some* form of turn-to-turn state (even if only client-side and ephemeral), which Track C's architecture never needed. Track C's mechanism is CRC/Interview-Engine-specific code (`discovered-relevance.ts`) operating on `StructuredUnderstanding`, which is explicitly on the "DO NOT SHARE" list (`HRR_CONVERSATIONAL_ARCHITECTURE.md §Q`) — nothing here is reusable *code*; only the *principle* ("provenance-preserving, non-fabricating, explicit-wins") transfers, and only if a cross-turn state layer is separately justified.

**Conclusion:** the Track C principle **supports the shape** a bounded referent should take (an enum-scale, non-fabricating pointer to an explicit prior utterance) but does **not by itself establish that HRR needs one** — that is exactly the discovery this document sets up (§P).

## J. Authority-firewall analysis

For "Should I approve this?" (self-contained, already production-proven) and its follow-up form "Does that mean I should approve this?" (Q9):

The authority gate (`hrrAuthorityGate`) fires on `classified.assessment_decision_requested` — a boolean produced by the **classifier's semantic judgment of the current utterance alone**. It does not read, and structurally cannot read, any referent, topic identity, or prior turn state. **This means the authority firewall requires zero changes to compose correctly with any future context layer:** a bounded topic referent may help the classifier understand what "that" grammatically refers to, but it cannot influence whether `assessment_decision_requested` fires, because that determination is orthogonal to referent resolution.

**Correct generic bounded behavior for a follow-up authority request:**
- **(A) refuse the judgment and explain the Human Reviewer owns it** — this is what happens today (`ASSESSMENT_AUTHORITY_NOTE`, a fixed template, never composed from research content) and remains correct even when "that" is ambiguous.
- **(B) surface relevant governed knowledge while explicitly withholding the conclusion** — already implemented for the **mixed** case (a research clause surviving alongside a declined decision clause); a follow-up authority question with no surviving research clause should NOT retroactively re-surface prior research as if it were being offered as evidence for approval — that would blend Lane 1 and Lane 2, which the existing composition contract and its tests (`not.toMatch(/looks fine|although|however,? (this|it)/i)`) already forbid.
- **(C) point to evidence/methodology the reviewer must independently establish** — only if HRR's authority is separately extended to methodology guidance (see §D class D / Phase 8 in the task) — **not assumed granted here.**
- HRR must never render or imply *"Based on this, you should approve/reject."* This is enforced by the fixed-template design (no template concatenates research content into a conclusion sentence) and must remain a hard invariant of any future composition change.

**No new authority-firewall logic is required for Slice B** — the firewall already composes safely with a bounded referent, *if and only if* the referent stays enum-only and never carries a conclusion.

## K. Consultative Composition interaction

Some apparently context-dependent failures are actually composition failures, and the discovery script is explicitly designed to tell them apart (§F, Q3/Q4 vs Q7/Q8):

- If a Q2-style answer's `orientation` / `boundary_note` **already states** the reason a claim matters, and the reviewer still asks "why does that matter?", that is evidence the answer's *reason* exists but is not landing — a **COMPOSITION FAILURE** (candidate remedy: make orientation more prominent, not add context to a model call).
- If the answer's rendered content contains **no statement of why it matters at all** (e.g., the topic's `boundary_note` is generic and the specific mattering-reason genuinely isn't anywhere in the current render), and only the *topic identity* was missing to re-derive/re-render it, that is a **REFERENT UNRESOLVED** case, and composition cannot fix it because the model never even attempted to answer the right question.
- Distinguishing the two requires reading the rendered Q2 answer text alongside the Q3 follow-up outcome — which is exactly why the PM script (§Q) asks for verbatim copy/paste of every governed answer, not just pass/fail.

**Do not solve either case by reflexively adding model context.** A composition failure is fixed in `projectHrrResearchAnswer` / `HrrResearchAnswerView` (a separate, already-tracked backlog item — the density/duplication observations from CAH-4G.10C are exactly this class); only a genuine REFERENT UNRESOLVED case is evidence for Slice B.

## L. Model-cost analysis

| Design | Model calls (topic / self-contained free-form / follow-up) | Growth with thread length |
|---|---|---|
| **Option 0 — independent questions** (current) | 0 / ≤1 / ≤1 (each still self-contained) | **O(1)** — no change |
| **Option 1 — deterministic prior-topic reference** | 0 / ≤1 / ≤1 (same call, one fixed-template context line) | **O(1)** — the line only ever describes the single most recent turn, never accumulates |
| **Option 2 — bounded structured research context** | 0 / ≤1 / ≤1 (same call, a slightly larger but still fixed-size context line) | **O(1)** — same reasoning; the object's size is fixed regardless of turn count |
| **Option 3 — model-assisted bounded referent resolution** | 0 / ≤1 / **≤1 if merged into the existing classify call** (candidate-referent enum list included in the same prompt); **O(2) if implemented as a separate resolution call** | **O(1) if merged; a real, must-be-justified cost increase if not** — merging into the single existing call must be the default design target |
| **Option 4 — transcript-based chat** | 0 / ≤1 / **grows without bound** (every accumulated turn's text re-sent) | **O(n)** — token cost, latency, and injection surface all grow with conversation length; rejected outright, matches the CRC-proven anti-pattern this architecture was designed to avoid |

No pricing figures are asserted (none are available from repository configuration); this is a call-count and growth-shape analysis only, consistent with `HRR_GRI_TECHNICAL_DESIGN.md §O`'s existing discipline of stating call counts, not invented costs.

## M. Governance / correction analysis

| Concern | Analysis |
|---|---|
| **Prompt injection** | The current turn's own text is already reviewer-authored and already treated as untrusted DATA for classification only (unchanged, existing invariant). A bounded enum-only referent (topic/scope/turn-id) has near-zero injection surface because it carries no reviewer-authored *or* model-authored prose. Any design that reintroduces prior raw prose (question or, especially, answer) reopens injection/false-premise-repetition surface and is rejected by §H. |
| **Stale context** | Because retrieval/applicability/BI are always re-run fresh from `{topic, current facts}` regardless of what referent resolution decided, staleness can only ever affect *which topic* a referent resolves to — never the *content* of the answer. Worst case: a referent resolves to a topic whose governed content has since changed, and the fresh re-run honestly reflects the new state. |
| **Correction semantics** | "No, I meant ownership" (§F, Q11) is hypothesized to reduce to an ordinary new **explicit** topic mention the existing classifier already handles with zero special-casing — this is itself a discovery target, not assumed. If evidence shows otherwise, correction handling would need its own bounded design (append-only, referent advances, never rewrites history — per `HRR_CONVERSATIONAL_ARCHITECTURE.md §L`), never a silent mutation of prior turns. |
| **Project facts** | A conversational referent (topic/scope/turn id) can never carry or express a project fact. Class-C answers (§D/§F) must be resolved by a **separate, explicit decision** about whether/how HRR may read out authoritative structured facts — never by conversation memory quietly becoming a fact source. A reviewer asserting a fact in conversation ("this ran in New York") must not mutate `submission.jurisdiction` or any assessment field, per the existing project-fact firewall (`HRR_CONVERSATIONAL_ARCHITECTURE.md §M`), unaffected by this discovery. |
| **Evidence authority** | Class D (evidence-oriented) follow-ups must not be silently treated as governed research; if HRR answers them at all it must be through a separately authorized methodology-guidance capability, not by stretching Living Knowledge retrieval to cover assessment methodology. |
| **Fail-closed behavior** | An ambiguous or unresolvable referent must fail exactly as today's unsupported/ambiguous case does — `no_governed_topic_matched` / offered research paths — never an invented "closest topic." |
| **Structured-output reliability / bounded questioning / audit** | Unaffected by any option under consideration; no schema change, no audit change is implied by Options 0–3. |

## N. Persistence remains separate

CAH-4G.11 is exclusively about **reasoning context**, not conversation persistence. The V1 persistence contract proven in CAH-4G.10C (client React memory only; inspector close/reopen preserves; workbook navigation clears) is unchanged and is **not** a prerequisite for, or blocker of, any future bounded-context mechanism — a future Option 1/2/3 referent would live and die with the same ephemeral client thread that already exists; it requires no DB, no session, no new persistence tier. These are two independent decisions and this document does not conflate them.

## O. Architecture options

| # | Option | Description |
|---|---|---|
| **0** | **Keep questions independent** | No conversational reasoning context at all. Any UX friction is addressed only through better composition/UI if evidence warrants (§K, §HH backlog). |
| **1** | **Deterministic prior-topic reference** | Carry only a bounded structured topic/research identity (topic enum + scope + turn id) — no prior answer prose, no claim ids, no applicability detail. |
| **2** | **Bounded structured research context** | A small structured object derived from prior research provenance — topic id(s), scope, `bi_status`, maybe unresolved-requirement *keys* (not content). Every field must be independently justified (§H shows most of these are unnecessary once retrieval/BI/applicability are re-run fresh). |
| **3** | **Model-assisted bounded referent resolution** | Use the LLM only to resolve the current utterance against a small enumerated set of candidate referents (e.g., the 1–2 most recent topics) — never a transcript, never free prose from prior turns. |
| **4** | **Transcript-based chat** (control/comparison only) | Include prior turns' raw text in the model context. Analyzed to be rejected: unbounded prompt growth, reintroduced injection surface, prior-answer-as-fact risk, correction-semantics ambiguity, staleness risk, and it is the exact anti-pattern CRC's own `buildUserMessageContent` was designed to avoid. **Not recommended under any circumstance found in this discovery.** |

## P. Option comparison matrix

Qualitative scoring against the Phase-14 criteria (✓ strong / △ acceptable-with-care / ✗ fails):

| Criterion | 0 Independent | 1 Prior-topic | 2 Structured context | 3 Model-assisted | 4 Transcript |
|---|---|---|---|---|---|
| Genericity | ✓ (trivially) | ✓ | △ (more fields = more surface) | △ | ✓ (naturally general, wrongly so) |
| Governed provenance | ✓ | ✓ | ✓ | ✓ | ✗ (prose, not provenance) |
| Fail-closed behavior | ✓ | ✓ | ✓ | △ (resolution step must itself fail closed) | ✗ |
| Authority safety | ✓ | ✓ | ✓ | ✓ (per §J, orthogonal) | △ (harder to audit conclusion-leakage) |
| Correction semantics | ✓ (no state to correct) | ✓ (append-only advance) | ✓ | △ (candidate-set logic adds complexity) | ✗ (ambiguous what "history" means after a correction) |
| Project-fact authority | ✓ | ✓ | ✓ | ✓ | △ (temptation to let chat "remember" facts) |
| Retrieval compatibility | ✓ | ✓ | ✓ | ✓ | ✓ |
| BI compatibility | ✓ | ✓ | ✓ | ✓ | ✓ |
| Composition compatibility | ✓ | ✓ | ✓ | ✓ | ✓ |
| Model cost | ✓ (0/≤1) | ✓ (O(1)) | ✓ (O(1)) | △ (O(1) only if merged) | ✗ (O(n)) |
| Bounded prompt size | ✓ | ✓ | ✓ | △ | ✗ |
| Structured-output reliability | ✓ (unchanged) | ✓ (unchanged) | ✓ (unchanged) | ✓ (same schema family) | △ (larger, less predictable input) |
| Implementation complexity | lowest | low | medium | medium-high | — (rejected regardless) |
| Future LK scalability | ✓ (nothing to scale) | ✓ | △ (more fields to keep in sync with LK changes) | △ | ✗ |
| Audit implications | none | none | none | none, if merged | risk of transcript-shaped data near audit boundary |
| UX quality (naturalness) | lowest (current friction) | improved for A/B/G/L classes | improved further | improved further, at complexity cost | highest *naturalness*, but explicitly not the optimization target |

**Reading:** Options 1 and 2 dominate on every governance/safety/cost axis; the difference between them is scope (1 is the minimal defensible version of 2, per §H's finding that most of Option 2's extra fields are unnecessary). Option 3 is viable only if its resolution step is provably mergeable into the existing single classify call. Option 4 is dominated on every axis that matters for a governed research interface and is retained in this document only as the explicit control case Phase 13 asked for.

## Q. Evidence threshold for authorizing Slice B

Slice B must **not** be authorized on the strength of any single example (including "why does that matter?" failing once). Authorization requires observing, from the PM discovery script (§R) or equivalent real production use, **all** of the following:

1. **Multiple, independently-worded** natural reviewer questions (not paraphrases of one wording) are classified as **REFERENT UNRESOLVED** (§G-2) or **TOPIC CONTINUITY LOST** (§G-3) — spanning **at least two distinct taxonomy classes** (e.g., both a class-A "why does that matter" case *and* a class-B "anything else relevant" case, or a class-L comparative case), not repeated instances of the same class.
2. For each such failure, a **composition-only remediation was considered and found insufficient** (§K) — i.e., the missing information is not present anywhere in the current rendered answer even in principle, not merely poorly placed.
3. The prior-turn state genuinely needed to resolve the failure is expressible as a **small bounded enum/id set** (topic, scope, turn id at most) — **not** prose, **not** claim content, **not** project facts (§H).
4. A concrete design keeps the **authority firewall enforceable without modification** (§J shows this holds structurally for Options 1–3).
5. Model cost stays **O(1) per turn** under the chosen design (§L) — no design that grows with thread length is authorized.
6. **No correction-semantics or project-fact-authority violation** is required by the design (§M).

If evidence instead shows the observed friction is concentrated in Classes C, D, F, H, I, or J (project facts, evidence/methodology, coverage gaps, composition, hypotheticals, or navigation), the correct response is a **different, narrower** milestone (methodology-authority decision, Living Knowledge expansion, composition hardening, or UI polish) — **not Slice B.**

## R. PM production discovery script

**Fixture: internal synthetic only — `CA-RLK-2a PROD SMOKE - internal synthetic, delete after` / `ASSESS-007-2026-09-07`. No customer evidence.**

For each experiment group below: open a **fresh** HRR conversation (refresh the page, or click "Clear conversation," before starting the group) so results from one group never contaminate the next. For every turn, **copy/paste the exact visible text** (the reviewer turn as shown, and the full rendered HRR answer, including orientation/boundary_note/unresolved section) rather than summarizing it. Take a screenshot only where layout/interaction itself is being judged (the meta-observation in Group 5). Do not inspect network requests or payloads — that is proven separately by engineering tests, not by this script.

**Group 1 — referential + composition baseline**
1. Click topic shortcut **Copyright ownership**. Copy the rendered answer.
2. Ask: *"What does governed knowledge say about copyrightability here?"* Copy the rendered answer in full.
3. Ask: *"Why does that matter?"* Copy the exact result (governed answer, refusal, or "couldn't resolve" message).
4. Ask: *"Can you explain that?"* Copy the exact result.

**Group 2 — project facts + applicability (fresh conversation)**
5. Ask: *"What do you know about the human contribution here?"* Copy the result.
6. Ask: *"Is jurisdiction established?"* Copy the result.
7. Ask: *"What does governed knowledge say about copyrightability here?"*, then ask *"What would need to be established for that?"* Copy both results.
8. Ask: *"What's missing for this to apply?"* Copy the result.

**Group 3 — authority firewall + correction (fresh conversation)**
9. Click topic shortcut **Copyright ownership**, then ask *"Does that mean I should approve this?"* Copy both.
10. As the very first and only turn in a brand-new conversation, ask *"Is this sufficient?"* Copy the result.
11. Ask *"What does governed knowledge say about copyrightability here?"*, then ask *"No, I meant ownership, not copyrightability."* Copy both.

**Group 4 — evidence/methodology, hypothetical, comparative (fresh conversation)**
12. Ask: *"What should I look for in the evidence to support this?"* Copy the result.
13. Ask a question likely to surface unresolved applicability (e.g., copyrightability), then ask *"What evidence would help establish that?"* Copy both.
14. Ask: *"What if the jurisdiction were the US?"* Copy the result.
15. Ask *"What does governed knowledge say about copyright ownership here?"*, then ask *"How is that different from commercial use?"* Copy both.

**Group 5 — topic continuity + navigation (fresh conversation)**
16. After any topic turn, ask *"Is there anything else relevant here?"* Copy the result.
17. As a bare first turn, ask *"What about ownership?"* Copy the result.
18. Build a 4–5 turn thread (any combination above) and take **one screenshot** showing the current scroll position — note whether the topic shortcuts / Ask HRR composer are still easy to find without scrolling up.

**For every numbered turn, also note:** did the response feel complete on its own, or did it prompt an immediate "but why/what about" reaction? This single subjective note is valuable corroborating signal alongside the verbatim text.

## S. Documentation

| File | Change |
|---|---|
| **NEW** `08_Platform/implementation/HRR_FOLLOWUP_DISCOVERY.md` | this document |
| `HRR_CONVERSATIONAL_ARCHITECTURE.md` | one-line pointer added under its status line to this document; §J's `HrrThreadContext` re-labelled explicitly as a hypothesis under validation, not superseded |
| `ADR-003-hrr-conversation-context.md` | one-line pointer: CAH-4G.11 is validating whether/what bounded referent is justified; decisions 2–4 remain design-only |
| `PRD_CAH_4G_HRR.md`, `COMMERCIAL_ASSURANCE_ARCHITECTURE_INDEX.md`, `claude.md` | status line addition: `CAH-4G.11 — FOLLOW-UP DISCOVERY / ARCHITECTURE VALIDATION — DESIGN / EVIDENCE COLLECTION`; Slice A restated CLOSED/PRODUCTION-PROVEN (unchanged); Slice B restated NOT STARTED / NOT AUTHORIZED |

**Runtime changes: NONE.**
