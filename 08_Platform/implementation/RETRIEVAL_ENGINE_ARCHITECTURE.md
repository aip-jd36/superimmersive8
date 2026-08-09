# Retrieval Engine — Architecture v1

**Status:** Architecture design accepted. The blocking dependency identified in the original draft (2026-08-08) — `CRC Publication Scope` was not machine-readable at claim granularity — is resolved: `PLATFORM-RIGHTS-MATRIX.md` and `PRD_LIVING_NOTEBOOK.md` were updated the same day to add a `CRC Claims` sub-table (`Claim ID` as the stable, deterministic key) to every Matrix row. This document is ready for implementation planning. Still not implemented — this remains an architecture document, not code.
**Type:** Engineering architecture document, not a PRD. Answers *how* the Retrieval Engine should be built; `PRD_CRC_v1.0.md` remains the sole normative source for *what* CRC does. Analogous in role to `INTERVIEW_ENGINE_ARCHITECTURE.md`, covering the second of CRC's two independent engines (PRD §3).
**Date:** 2026-08-08 (drafted); revised 2026-08-08 (blocker resolved)

**Normative inputs, treated as already-established and not reopened except where a genuine contradiction is flagged below:** `PRD_CRC_v1.0.md` (§3, §11–§14 especially), `INTERVIEW_ENGINE_ARCHITECTURE.md`, `PROTOTYPE_ALPHA_RETROSPECTIVE.md`, `06_Operations/institutional-knowledge/notebook/PLATFORM-RIGHTS-MATRIX.md`, `06_Operations/institutional-knowledge/notebook/CRC-PUBLICATION-POLICY.md`, `08_Platform/prds/PRD_LIVING_NOTEBOOK.md` (§ CRC-Eligible Governance — the closest existing thing to a Knowledge Card architecture), and the shipped `RetrievalHandoff`/`RetrievalHandoffTool` types in `08_Platform/app/types/interview-engine.ts`, which are treated as the current source of truth over `INTERVIEW_ENGINE_ARCHITECTURE.md` §12's now-superseded pseudocode (see §2 below for the discrepancy).

**Labeling convention** (matches `INTERVIEW_ENGINE_ARCHITECTURE.md`): `[PRINCIPLE]` — a rule already normative in the frozen PRD or an adjacent frozen document, restated for implementation context, never redefined here. `[IMPLEMENTATION GUIDANCE]` — a concrete design decision this document makes to fill a gap the PRD left open. `[PROTOTYPE ASSUMPTION — TO VALIDATE]` — a first-pass mechanism proposed so implementation planning can proceed, explicitly not proven. `[OPEN QUESTION]` — genuinely unresolved, not decided here.

---

## 1. Purpose

`[PRINCIPLE]` Retrieval's only job, per PRD §3/§12: given the current structured understanding, determine what SI8 knowledge is relevant, never influencing what the Interview Engine asks next. This is an architectural boundary, not a prompt instruction — genuinely independent systems or contexts, not a shared context window with a soft "don't let this leak" constraint.

`[IMPLEMENTATION GUIDANCE]` **Semantics vs. invocation timing (JD decision, 2026-08-08 — see `LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md` §8):** Retrieval is a pure, snapshot-safe function that may be run against any handoff state, including sparse and partial snapshots — this is a semantic property of Retrieval itself and does not change. CRC v1's live runtime invokes it at finalization only (`buildRetrievalHandoff` → Retrieval → Projection, once, when the Interview terminates); future products may invoke it earlier, including per-turn, without changing Retrieval's own semantics or requiring any change to this document. "Updates silently after every turn" (PRD §8's own internal flow for Phase 3) describes what Retrieval is *safe* to be run against, not a scheduling requirement this document imposes on every consumer.

**Owns:** matching the current `RetrievalHandoff` against SI8's knowledge sources (Platform Rights Matrix in the near term; Living Notebook / Platform Intelligence / reviewer-approved content per PRD §13 as those become indexable); filtering matches to only what is currently publication-eligible; producing a traceable, structured reference to each eligible match; remaining safe to re-run against any handoff snapshot a runtime chooses to invoke it against — see §1's implementation-guidance note on invocation timing, which is a runtime decision, not a property this document specifies.

**Does not own** (explicitly delegated elsewhere):

- **Interview.** Retrieval consumes `RetrievalHandoff`; it never mutates `StructuredUnderstanding`, never proposes a question, and has no path back into the Interview Engine's own decision-making (Constraint A, candidate-question generation). `INTERVIEW_ENGINE_ARCHITECTURE.md` §3 already states the handoff is "a derived snapshot... never a live reference," specifically so Retrieval's own processing can never implicitly influence the next turn's candidate-question evaluation. This document does not reopen that — it is the consumer-side enforcement of the same boundary.
- **Projection Layer.** PRD_LIVING_NOTEBOOK.md is explicit: *"The Knowledge Projection Layer (CRC's Matrix → Knowledge Card transform) reads [CRC-Eligible]; it does not decide eligibility."* Retrieval determines **which** matched, eligible knowledge exists and why; Projection decides **how** it gets rendered — including the choice between PRD §14's two output categories (a stated "knowledge item" vs. a "topic that often comes up" presence-triggered question), voice/tone application, and final template assembly. Retrieval's output is deliberately not yet a Knowledge Card (§5).
- **Publication Policy.** Retrieval never makes a publication-suitability judgment. `CRC-PUBLICATION-POLICY.md` governs how a Matrix row's `CRC-Eligible`/`CRC Publication Scope` values get *decided*, by a human, in advance. Retrieval only *reads* that already-recorded decision, exactly as Interview's Constraint A/B never re-derive gate logic mid-conversation — the judgment happened upstream, at data-authoring time, not at retrieval time.
- **SI8 Assessment.** Entirely separate product (the paid, human-reviewed SI8 Certified path). Shares the Matrix as a knowledge source, nothing else. `PRD_LIVING_NOTEBOOK.md` notes explicitly that reviewer-facing paths don't need their own eligibility field because a human is already the gate at time of use — Retrieval exists specifically *because* CRC's channel has no human in the loop at time of use, which is the entire reason `CRC-Eligible` exists as a separate field from `Status` in the first place.

`[IMPLEMENTATION GUIDANCE]` PRD §12's phrase *"surface knowledge and follow-up questions"* could be misread as Retrieval proposing questions back into the live interview. Reading §14's output template resolves this: the "follow-up questions" are **presence-triggered topics rendered once, at end-of-conversation**, in the same output pass as knowledge cards — not questions injected mid-conversation. Retrieval's own output (§5) doesn't need to distinguish these two rendering categories at all; that distinction belongs to Projection.

---

## 2. Inputs

Retrieval receives exactly one thing: the current `RetrievalHandoff`, as currently shipped in `08_Platform/app/types/interview-engine.ts` (Phase 5, corrected 2026-08-07) —

```typescript
interface RetrievalHandoffTool {
  identifier: string
  access_surface: string | 'unresolved'
  plan_tier: string | 'unknown'
}

interface RetrievalHandoff {
  tools: RetrievalHandoffTool[]
  unresolved_aliases: string[]
  workflow_role: string
  intended_use: string | 'unclear'
  scoped_observations: ScopedObservation[]
  certainty_state: 'gate_1_met' | 'gate_1_unmet' | 'declined'
  exclusions: string[]
}
```

**Note on grounding:** `INTERVIEW_ENGINE_ARCHITECTURE.md` §12's own pseudocode (flat `canonical_tool_identifiers: string[]` plus singular top-level `access_surface`/`plan_tier`) predates a documented Phase 5 correction and no longer matches the shipped type. This document is grounded in the `.ts` file, not the architecture doc's stale field list — its *prose principles* (facts only, never a fabricated resolution, "unresolved" is a valid complete answer) remain fully intact and are what this document actually relies on.

`[PRINCIPLE]` (inherited, not reopened) — Retrieval must treat `RetrievalHandoff` exactly as documented: facts only, never publication conclusions; `'unresolved'`/`'unknown'`/`'unclear'` are valid, complete answers, never gaps to fill.

**Sparse handoffs.** Retrieval must be well-defined and safe against a `RetrievalHandoff` snapshot from *any* point in a conversation — including near-empty ones early on (`tools: []`, `scoped_observations: []`) — always producing a valid (possibly empty) result, never an error and never a placeholder result invented to avoid returning nothing. This is a property of Retrieval's own correctness, independent of how often any given runtime chooses to invoke it (see §1's implementation-guidance note): CRC v1 invokes Retrieval once, at Interview finalization, not per-turn — but the algorithm below makes no assumption about invocation frequency, and nothing in this document would need to change if a future runtime invoked it more often.

**Unresolved fields.** `'unresolved'` access_surface, `'unknown'` plan_tier, `'unclear'` intended_use, and every entry in `unresolved_aliases[]` must never be matched against anything. This is not a filtering step bolted on afterward — it falls out structurally from §3's Step 1, which only ever extracts *resolved* facts into the matchable set. `unresolved_aliases` specifically can never map to a single Matrix row by construction: the Matrix's own multi-surface rows are split by resolved identifier (Gemini API vs. Gemini Consumer App are separate rows precisely so nothing downstream has to guess between them) — an unresolved alias is exactly the case that split exists to keep unmatched, not a case for Retrieval to guess across candidates.

**Declined fields.** `exclusions[]` already names which fields were declined; `certainty_state: 'declined'` marks the extreme case. Retrieval must never attempt to retrieve or infer knowledge for an excluded topic — this is the retrieval-side enforcement of the same boundary Interview's own Constraint B already enforces on the ask side.

**Partial interviews (`gate_1_unmet`).** Retrieval has no minimum-completeness gate. A partial interview is not a reason to suppress matching on whatever *was* confirmed — it naturally produces a smaller (possibly empty) result set, which is a normal, not a degraded, outcome.

`[OPEN QUESTION]` Does Retrieval need any signal beyond the handoff itself — e.g., how far into the conversation this snapshot represents — to decide anything, or is "run the same deterministic match against whatever is in this snapshot" always sufficient regardless of timing? Nothing in the evidence base requires timing awareness; flagged rather than assumed away (see Critique).

---

## 3. Retrieval Algorithm

Emphasis, per instruction: correctness and determinism, not ranking quality. No step below scores, ranks, or selects a "best" match — every eligible match is returned; ordering/selection for display is Projection's problem, not Retrieval's.

**Step 1 — Extract the matchable-fact set.** Deterministically enumerate only what the handoff states as *resolved and non-excluded*:
- each `tools[]` entry's `identifier` (never `unresolved_aliases`);
- each `scoped_observations[]` entry whose `confidence` is `'confirmed'` or `'confirmed_absent'` **and** whose field is not in `exclusions[]`. `[IMPLEMENTATION GUIDANCE]` A `confirmed_absent` observation ("no one reviewed this") is exactly as much "something the user did say" as a `confirmed` one — PRD §12's presence-not-absence rule guards against inventing content from *silence*, not against a user's explicit negative statement. Both confidence states enter the matchable set; `unresolved_no_visibility`, `unknown`, and `declined` never do.
- `intended_use` if not `'unclear'`; `workflow_role` if not `'unresolved'`.

This step is where "preserve uncertainty" (below) actually happens — as a property of what gets *excluded* here, not as a separate later pass.

**Step 2 — Identify candidate Matrix rows.** For each resolved tool identifier, an exact key lookup against the Matrix (canonical identifiers *are* the Matrix's row keys — Interview's own normalization already resolved any surface ambiguity before this identifier ever reached Retrieval). No fuzzy matching, no candidate ranking — a tool identifier either has a row or it doesn't (§6). For non-tool-keyed facts (workflow stage, intended use, scoped observations against SI8 Positions/Platform Intelligence), the equivalent lookup requires those sources to carry their own applicability tags — `[OPEN QUESTION]`, not designed by this document (see Critique).

**Step 3 — Resolve applicable publication scopes.** For each candidate row, enumerate its `CRC Claims` sub-table (`PLATFORM-RIGHTS-MATRIX.md`, schema documented in `PRD_LIVING_NOTEBOOK.md` § CRC-Eligible Governance § CRC Claims sub-table) — one entry per claim, each carrying a stable `Claim ID`, `CRC-Eligible`, and `CRC Publication Scope`. Keep only claims where `CRC-Eligible` is exactly `Yes`; `No` and `Pending` are both excluded, identically — the Matrix's own governing text is explicit that nothing is grandfathered in, "including rows with a Verified Status." A single-claim row (the common case) has exactly one claim in its sub-table, keyed by the row's own canonical tool identifier — Step 2's row match and Step 3's claim match collapse to the same lookup. A compound row (ElevenLabs' `elevenlabs-commercial-tiering`/`elevenlabs-voice-consent` split is the current worked example) fans out to every claim under that row; each is filtered independently, so a `Yes` on one claim never licenses surfacing a different, unapproved claim of the same row. This is an exact-key lookup against `Claim ID`, not a parse of `CRC Publication Scope`'s own text — that text is read only after a claim already passed this filter, and then only to be passed forward verbatim (§5), never interpreted.

`[PROTOTYPE ASSUMPTION — TO VALIDATE]` For the current Matrix, a matched platform row makes *all* of its `CRC-Eligible: Yes` claims eligible for retrieval — Step 3's fan-out has no further filter beyond eligibility itself. This holds today because nothing in the Matrix yet has more than one `Yes` claim whose relevance depends on some *additional* structured fact (ElevenLabs' two claims are eligibility-differentiated, `Yes` vs. `No`, not both-`Yes`-but-situationally-relevant). If a future row ever has multiple `Yes` claims where only some apply depending on, say, `workflow_stage` or `intended_use`, this assumption would need its own deterministic applicability schema — not designed here, and explicitly not to be designed speculatively ahead of a real row that needs it (§8's own "smallest structured addition" discipline, and the Critique's stance against building structure ahead of demonstrated need).

**Step 4 — Determine eligible knowledge references.** The output of Steps 1–3: a set of `(source_fact, claim_id, CRC_Publication_Scope_text)` tuples — nothing here is yet Card content.

**Step 5 — Preserve uncertainty.** Not a distinct step; a property that already holds given Step 1's exclusion discipline. Stated as its own line in this outline only because JD's brief calls it out explicitly — worth being honest that there is no additional mechanism here beyond "never entered the matchable set in the first place."

**Step 6 — Produce retrieval output.** Assemble the final result set: every `(source_fact, claim_id, CRC_Publication_Scope_text, source_metadata)` tuple that survived Steps 1–3, deduplicated by row/claim, unordered. See §5 for the exact shape.

---

## 4. Matching Philosophy

- **Exact matches.** The only kind Retrieval performs on tool identity: canonical identifier → Matrix row key, 1:1, deterministic.
- **Ambiguous matches.** Structurally impossible by the time Retrieval sees a resolved `tools[]` entry — ambiguity, by the handoff contract's own design, has already been fully pushed upstream into `unresolved_aliases`, which never enters matching (§2). Retrieval needs no ambiguity-resolution logic of its own; it inherits a contract that has already resolved this.
- **Unresolved aliases.** Zero matches, by design (§2). `[IMPLEMENTATION GUIDANCE]` Retrieval should not surface even a generic acknowledgment ("we weren't able to identify that tool precisely") — that would be Retrieval reacting to a *gap*, the exact failure mode PRD §12 names as "the single rule most likely to be silently violated." Prompting for more specificity is Interview's job, not Retrieval's, and Interview already owns exactly this mechanism (Phase 7's `ambiguous_multi_surface_tool` follow-up).
- **Multi-tool projects.** `tools[]` is already an array; each entry is matched independently and never combined into one statement — the same principle that drove the Phase 5 `RetrievalHandoffTool[]` correction ("a summarized value for multiple disagreeing tools would itself be an invented fact") applies identically on the Retrieval side, and Retrieval's own output must preserve that separation through to its result.
- **Multi-workflow-stage / current-vs-historical projects.** Each `scoped_observations[]` entry carries its own `workflow_stage` and `scope` (`current_project`/`historical_project`/`general_practice`); each is matched independently, and the current-vs-historical distinction must never collapse — this is a direct carry-forward of a principle Prototype Alpha validated at 100% accuracy across its own dedicated dialogue and the live battery. A historical-project fact must never surface as knowledge about the current project's situation, or vice versa.

---

## 5. Retrieval Output

**What Retrieval returns:** a list of matched-and-eligible knowledge references — not rendered Knowledge Cards. Each entry:

```
{
  source_fact: <the specific handoff field/observation that triggered this match>,
  claim_id: <the matched Claim ID from the Matrix's CRC Claims sub-table>,
  publication_scope: <the CRC Publication Scope text, verbatim — governance-boundary
                       prose written for audit, not directly renderable to a user>,
  candidate_statement: <the CRC Candidate Statement text, verbatim, or null — the
                        already publication-ready render source Projection needs;
                        see the contract-extension note below>,
  source_confidence: <the underlying fact's own existing ConfidenceState — passed
                      through, never invented>,
  source_metadata: <last-verified/updated date, needed for the "content last
                    updated" output requirement (PRD §14)>
}
```

`[IMPLEMENTATION GUIDANCE]` No invented confidence or relevance score. `source_confidence` passes through state that already exists on the handoff (e.g. `'confirmed'` vs. `'confirmed_absent'`) — it is traceability, not a new judgment Retrieval is manufacturing. This is deliberate: PRD §14 explicitly bans "worth verifying" labels and scores in the *final* output, and inventing a Retrieval-level score now would just relocate that violation one layer upstream rather than avoid it.

`[IMPLEMENTATION GUIDANCE]` **`candidate_statement` — contract extension, 2026-08-08 (JD review of the Projection Layer design).** Projection's architecture was originally going to give Projection its own narrow, claim-ID-keyed side-lookup against the Matrix to obtain `CRC Candidate Statement` directly — rejected on review as a third data dependency for a layer meant to have exactly two canonical inputs (`RetrievalHandoff`, `RetrievalResult[]`) and no direct access to the Matrix, CRC Claims registry, Living Notebook, or any other governance source. The resolution: extend `RetrievalResult` itself with `candidate_statement`, copied verbatim from the same already-matched, already-eligible claim that supplies `publication_scope`. This is a narrow, consumer-driven, additive extension — it does not reopen §3 Step 3's matching logic or §5's own eligibility-filtering behavior. Two properties distinguish this field's handling from `publication_scope`'s: (1) Retrieval performs zero interpretation, rewriting, or rendering of this text — it is a pure passthrough of governed, publication-ready source prose, never parsed for meaning any more than `publication_scope` is; (2) unlike `publication_scope` (whose absence on a `Yes` claim blocks the result entirely — the `yes_claim_missing_scope` diagnostic in §6), a null `candidate_statement` does **not** gate or skip a result. Whether to render, omit, or otherwise handle a missing Candidate Statement is a Projection-time decision, not a Retrieval-time eligibility one — Retrieval's only obligation is to carry forward whatever value the claim actually has, including null.

**What belongs to Projection instead:** rendering voice/tone (§14's rules), choosing between the "knowledge item" and "presence-triggered question" output categories, ordering/selection for display, and final template assembly (the "Thanks — here's what I picked up..." structure). Retrieval's contract ends at "here is what matched, why, and what SI8 is permitted to say about it" — never at how it's said to the user.

**Auditability, by construction:** every entry's `source_fact` and `claim_id` together make every piece of retrieved content traceable to a specific handoff fact and a specific governance decision — satisfying PRD §12's "must be traceable to something the user actually said" as a structural type-level property, not merely a design intention, mirroring exactly how Prototype Alpha made "no fabricated resolution" a property `handoff.ts`'s own tests assert directly rather than assume by omission.

---

## 6. Failure Modes

- **Nothing matches.** Expected and common, especially early in a conversation or for a tool the Matrix doesn't cover. Returns an empty result — never an error. PRD §14's own template treats the knowledge section as optional ("a few pieces... that might be useful"), consistent with this.
- **Multiple rows match.** Expected and normal for multi-tool projects. All are returned, deduplicated, unranked (§3, §4).
- **Handoff is incomplete/sparse.** Already covered (§2) — degrades to fewer or zero matches, never an error.
- **Matrix lacks coverage.** Distinct from "unresolved alias": this is "we know exactly which tool it is, and SI8 has no row for it at all." `[IMPLEMENTATION GUIDANCE]` Keep this internally distinguishable from "row exists but ineligible" and "alias never resolved," even though all three collapse to the same (empty) user-facing outcome — the distinction is valuable engineering/product signal (which tools are users naming that the Matrix doesn't cover yet), not something the user needs to see.
- **Interview ended early (decline, Gate 1 unmet).** No special handling required. Retrieval simply processed whatever handoff snapshots existed up to that point; the last one is the last one. An interview that declined before any fact was established naturally produces zero matches throughout — expected, not a failure.
- **A claim's `CRC-Eligible` was reset to `Pending` mid-project** — either claim-scoped (only that claim's own content changed) or row-wide (e.g., `Status` moved off `Verified`, which resets every claim on the row), per the Living Notebook's claim-level Reset principle. Not a Retrieval failure either way — a normal filtering outcome each time Retrieval runs. Implies Retrieval must always read eligibility fresh, per claim, never cache it across a stale window (§8).

---

## 7. Deterministic vs. LLM

**Recommendation: Retrieval, as scoped by the current Matrix (tool-row-keyed) and the current `RetrievalHandoff` (fully structured), should be entirely deterministic. No LLM reasoning anywhere in the core retrieval algorithm.**

Why this holds, not just as a preference: every step in §3 is an exact-key lookup or an array filter over data that is *already structured* — Retrieval's whole premise is that Interview already did the hard natural-language-interpretation work (that's what Extraction was for). Retrieval's input is never raw text; there is no natural-language-understanding problem left to solve at this stage for the tool-matching path. This is the same lesson Prototype Alpha's retrospective states directly: isolate the one genuinely non-deterministic problem (interpreting language) and keep everything downstream of it deterministic, auditable, and cheap to test.

The PRD's own framing reinforces this rather than merely permitting it: "genuinely independent systems or contexts... a single model instructed 'don't let retrieval influence your questions' is a soft constraint that can leak." Adding an LLM component to Retrieval increases the surface area for exactly that kind of leak — not because a second model would literally share Interview's context, but because two LLM-driven subsystems sitting adjacent in the same pipeline are a categorically easier thing to accidentally couple (shared prompts, shared eval harnesses, a future engineer's shortcut) than one deterministic and one LLM-driven subsystem with a hard type boundary between them.

**Where this could break down:** non-tool-keyed knowledge (SI8 Positions, Platform Intelligence, general practice content, per PRD §13) doesn't obviously reduce to an exact-key lookup the way tool identifiers do. `[IMPLEMENTATION GUIDANCE]` The right response, if and when this becomes a real need, is to give those sources their own deterministic applicability tags (an indexing/schema design problem, solvable without a model) — not to reach for an LLM to judge relevance at retrieval time. If deterministic tagging genuinely proves insufficient (not yet demonstrated), that would justify a **separate, narrowly-scoped semantic-matching component**, evaluated with the same isolation discipline Extraction received (its own contract, its own real-model evaluation corpus, never folded into the same module as the deterministic tool-matching path) — not built speculatively now.

---

## 8. Performance

Architectural level only — no production infrastructure decisions made here, no request-volume data exists yet to size anything against.

- **Indexing.** The Matrix is already effectively keyed by canonical tool identifier; an in-memory or simple key-value index over that gives O(1) tool lookup. A future applicability-tag index (by workflow stage, by scope) would be the natural analogous structure for non-tool-keyed sources.
- **Lookup.** Given a handoff with N resolved tools and M scoped observations, retrieval is O(N+M) against an indexed Matrix. No search or ranking algorithm is needed at this stage, consistent with the explicit determinism-over-ranking emphasis.
- **Caching.** Two different things must not be conflated: the Matrix's *content* changes rarely (the Living Notebook's own ~6-month staleness cadence) and is a reasonable caching candidate (reload on deploy, or poll on a coarse interval); *eligibility decisions* must never be cached across a window long enough to go stale relative to a real Matrix edit (§6) — if caching is used at all, it should cache the Matrix snapshot, not a derived "this row is eligible" verdict held independently of that snapshot's freshness.
- **Future scalability.** "Cheap deterministic lookup against an indexed reference dataset" scales to a much larger Matrix without new infrastructure. If a semantic-matching component is later justified (§7), *that* component might need embeddings/vector search — explicitly a future-conditional concern, not a Beta-start decision, and consistent with the roadmap's own exclusion of "semantic/vector retrieval" from Prototype Alpha's scope extending naturally into early Beta absent new evidence.

---

## 9. Testing Strategy

If Retrieval is genuinely 100% deterministic (per §7), its validation path is structurally simpler than the Interview Engine's — closer to Phases 1–5 of Prototype Alpha than to 6a–7. This is worth stating as a real finding, not an assumption: a purely deterministic Retrieval could in principle graduate on unit tests alone, with no live-model battery required at all.

**Deterministic components to unit test:**
- Matchable-fact extraction (§3 Step 1) against every case in §2: sparse, unresolved, declined, partial.
- Matrix-row lookup by canonical identifier (found / not-found).
- Eligibility filtering — `Yes`/`No`/`Pending`, including the compound-row, claim-level case.
- Multi-tool and multi-observation array preservation (never merged).
- Current-vs-historical scope preservation through to output.
- **A full negative-assertion suite**, mirroring Phase 5's handoff tests exactly: Retrieval's output must never contain `CRC-Eligible`, `CRC Decision Date`, `CRC Approver`, `SI8 Interpretation`, or any other internal Matrix field — tested as explicit assertions that fail loudly, not assumed correct by omission. (`CRC Publication Scope` and `CRC Candidate Statement` are the two fields Retrieval *does* carry forward, verbatim, per §5 — deliberately not in this negative list, since excluding either would contradict §5's own output contract. `CRC Candidate Statement` moved out of this list 2026-08-08 when the `candidate_statement` contract extension was added — see §5's implementation-guidance note.)
- **A passthrough-integrity assertion for `candidate_statement`**, distinct in kind from the negative-assertion suite above: not "this field must be absent," but "this field, when present, must be byte-for-byte identical to the source claim's `CRC Candidate Statement` text" — proving Retrieval copies without interpreting, rewriting, or rendering it.

**What requires live evaluation:** nothing, under the §7 recommendation. If a semantic-matching component is ever added for non-tool-keyed knowledge, that component graduates using the exact methodology already validated for Extraction/candidate-generation/Constraint A — isolated contract, real-model evaluation corpus, preserved reports, never folded into the deterministic path's own test suite.

**Fixtures needed:**
- A small, dedicated test-double Matrix (never the live, editable production Matrix file) with rows covering: a clean `Yes`-eligible row; a `No`-eligible row; a `Pending` row; a compound row with mixed claim-level eligibility (the ElevenLabs shape); a `Verified`-but-`Pending` row (to prove "Verified ≠ CRC-Eligible" is actually enforced, not just documented); a tool with no row at all.
- A set of representative `RetrievalHandoff` fixtures: empty/near-empty; single tool; multiple tools; unresolved-aliases-only (zero matches expected); mixed current/historical observations; various exclusions; `gate_1_unmet` partial state.

**Graduation criteria:** (a) the full deterministic suite passes against the fixture set, including every negative assertion; (b) a small number of complete handoff→output traces are reviewed end-to-end against the fixture Matrix — feasible as a one-time review, not a repeated battery, because there is no live-model variance to average over; (c) no live-model evaluation is required unless a semantic-matching component exists, in which case it graduates independently, on its own evidence.

---

## Critique

**What assumptions inherited from Prototype Alpha become risky inside Retrieval?**

1. Presence-not-absence was rigorously *enforced* inside Interview (Constraint A, boundaries, tested repeatedly). That doesn't transfer automatically — it's a principle Retrieval has to independently re-implement and re-test in its own codebase. Prototype Alpha getting it right is not evidence that Retrieval will; it's a design target Retrieval needs its own dedicated coverage for (§9), not inherited confidence.
2. Prototype Alpha's deterministic core reached zero defects only after seven phases of dedicated, isolated unit testing *before* touching live data. The temptation is to assume Retrieval — also mostly deterministic — will be similarly low-risk by default. The *lesson* transfers (deterministic-first, isolate the one non-deterministic piece); the *confidence* does not. Retrieval needs its own full evaluation cycle, not a discount because a different codebase behaved well.
3. `RetrievalHandoff` has been validated exhaustively from the *producer* side (Phase 5's tests, the Phase 7 live battery) — never once from the *consumer* side, because nothing has ever actually tried to retrieve against it. It is entirely possible the contract, while internally consistent, turns out to be awkward or insufficient for Retrieval's actual needs in ways only a real implementation attempt would surface. This document assumes the contract is sufficient; that assumption is untested.
4. Prototype Alpha found that Extraction needed *less* context than assumed to be sufficient (turn-only, mostly correct) with one narrow, well-scoped exception. That result is specific to the interpret-natural-language problem; it should not become a reflexive habit of assuming every new subsystem should default to minimal input. §7's conclusion that Retrieval should stay narrow happens to also be correct here, but the reasoning had to be redone from scratch — and it should be redone again for whatever comes after Retrieval, not assumed by pattern-matching to this document.

**What architectural questions remain unanswered?**

1. ~~Is `CRC Publication Scope` machine-readable, or only human-readable prose?~~ **Resolved 2026-08-08.** `PLATFORM-RIGHTS-MATRIX.md` and `PRD_LIVING_NOTEBOOK.md` now define a `CRC Claims` sub-table per row, keyed by a stable `Claim ID` — §3 Step 3 matches on that key, and `CRC Publication Scope` itself remains exactly the human-readable prose it always was, passed through verbatim, never parsed. No LLM dependency was introduced to close this; see the design review that preceded the migration (chat record, 2026-08-08) for the full evaluation of alternatives.
2. **How does non-tool-keyed knowledge get indexed at all?** PRD §13's sources extend well beyond the Matrix's tool rows. This document designs the tool-matching path in detail and explicitly defers the rest — that design doesn't exist anywhere yet.
3. **What actually decides "knowledge item" vs. "presence-triggered question"** (PRD §14's two output categories)? Assigned to Projection Layer here, but the selection rule itself isn't defined in any document reviewed for this one. A real gap for whichever document designs Projection next, not invented here.
4. **Does Retrieval need any cross-turn memory** (e.g., "already surfaced, don't repeat")? Probably moot if only the final snapshot's result is ever rendered — but genuinely unknown, since no consumer of Retrieval's *intermediate*, per-turn output has been shown to exist. Flagged, not assumed either way.
5. **Integration mechanics** — push vs. pull, sync vs. async, how Retrieval actually receives each turn's fresh handoff snapshot. Appropriately an implementation-planning question, not an architecture one, but worth naming so it isn't silently assumed away by whoever picks this up next.

**What should not be designed yet, for lack of evidence?**

1. Any ranking/relevance-scoring mechanism — explicitly out of scope per instruction, and premature without real data on what "too many matches" actually looks like in practice.
2. The semantic-matching LLM component for non-tool-keyed sources (§7) — no evidence yet that deterministic tagging is insufficient. Building it speculatively would repeat the exact "invent complexity without evidence" failure mode this whole project has been careful to avoid everywhere else.
3. Caching/production infrastructure specifics (§8 stays architectural on purpose) — no request-volume data exists.
4. The Projection Layer and the actual Knowledge Card schema — explicitly out of this document's scope, matching how `INTERVIEW_ENGINE_ARCHITECTURE.md` excluded Retrieval from its own scope.
5. ~~Any Platform Rights Matrix schema migration to resolve open question 1 above~~ — **done, 2026-08-08**, scoped to exactly the minimum needed (a `Claim ID` sub-table), nothing more. See `PLATFORM-RIGHTS-MATRIX.md` and `PRD_LIVING_NOTEBOOK.md` § CRC-Eligible Governance § CRC Claims sub-table.
6. A deterministic applicability schema for a `Yes`-claim that's only sometimes relevant within a matched row — flagged as a `[PROTOTYPE ASSUMPTION — TO VALIDATE]` in §3, not designed here. No row in the current Matrix demonstrates the need.

---

## Verdict

**This document establishes a sound architectural foundation and is now ready for implementation planning.**

The one blocking dependency identified in the original draft — §3 Step 3 assumed claim-level publication eligibility could be looked up programmatically, while `CRC Publication Scope` was actually recorded as prose interleaved across claims within a single Matrix cell — is resolved. `PLATFORM-RIGHTS-MATRIX.md` and `PRD_LIVING_NOTEBOOK.md` now define a `CRC Claims` sub-table per row, keyed by a stable `Claim ID`, migrated mechanically from existing values with no publication decision re-reviewed or rewritten. `CRC Publication Scope` itself was deliberately left exactly as it was — human-authored governance prose, read verbatim, never parsed — closing the gap without introducing the LLM dependency §7 argued against. Step 3, §5's output contract, and the Critique's open question 1 have all been updated to reflect this directly, not just noted as resolved in passing.

Everything else in this document was already independent of that blocker (§§1–2, §4–6, §8–9, and the tool-matching path of §3) and remains so. The remaining open questions (§ Critique — non-tool-keyed indexing, the knowledge-item/presence-triggered-question selection rule, cross-turn memory, integration mechanics) are genuinely unresolved but were never gating: none of them prevent starting implementation planning for the tool-matching path this document actually specifies in detail.

This is the same discipline Prototype Alpha modeled throughout: stop on a real, precisely-named dependency rather than build past it or silently route around it — and once it's actually resolved, say so plainly and move forward, rather than leaving a document in permanent-draft limbo out of caution alone. Recommended next step is implementation planning for the deterministic tool-matching path this document specifies — not further architecture work.
