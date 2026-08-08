# Projection Layer — Architecture v1

**Status:** Architecture design approved (2026-08-08). Design exercise only — no implementation authorized by this document. Not yet committed to any branch as code; this document itself is committed as the accepted architecture, per instruction, alongside the Retrieval contract changes it depends on.
**Type:** Engineering architecture document, not a PRD. Answers *how* the Projection Layer should be built; `PRD_CRC_v1.0.md` remains the sole normative source for *what* CRC does. Third and (per instruction) last major architecture document before end-to-end implementation, following `INTERVIEW_ENGINE_ARCHITECTURE.md` and `RETRIEVAL_ENGINE_ARCHITECTURE.md`.
**Date:** 2026-08-08

**Normative inputs, treated as already-established and not reopened:** `PRD_CRC_v1.0.md` (§12, §14 especially), `INTERVIEW_ENGINE_ARCHITECTURE.md`, `RETRIEVAL_ENGINE_ARCHITECTURE.md` (including its `candidate_statement` field on `RetrievalResult`), `PROTOTYPE_ALPHA_RETROSPECTIVE.md`, `PRD_LIVING_NOTEBOOK.md` § CRC-Eligible Governance § CRC Claims sub-table, and the shipped `RetrievalHandoff` (`08_Platform/app/types/interview-engine.ts`) and `RetrievalResult`/`MatrixClaim` (`08_Platform/app/lib/retrieval-engine/types.ts`) types from the `prototype/crc-retrieval-beta` implementation.

**Labeling convention** (matches the two prior architecture documents): `[PRINCIPLE]` — a rule already normative in the frozen PRD or an adjacent frozen document, restated for implementation context. `[IMPLEMENTATION GUIDANCE]` — a concrete design decision this document makes to fill a gap the PRD left open. `[PROTOTYPE ASSUMPTION — TO VALIDATE]` — a first-pass mechanism, explicitly not proven. `[OPEN QUESTION]` — genuinely unresolved, not decided here. `[FINDING]` — something the critique-before-designing pass discovered that revises a premise this task started with.

---

## Design History / Rejected Alternative

An earlier draft of this document gave Projection its own narrow, `claim_id`-keyed lookup against the Platform Rights Matrix to obtain `CRC Candidate Statement` directly, reasoning that a single-field fetch scoped to an already-eligible claim carried no governance risk of its own. That design was rejected on review: regardless of scope, it constituted a **third canonical data dependency** for a layer otherwise defined as having exactly two, and gave Projection **direct access to a governance source** (the Matrix) that this architecture is specifically meant to keep it away from. The accepted replacement — reflected throughout this document — is an **opaque `candidate_statement` passthrough field on `RetrievalResult`**: Retrieval copies the already-approved statement verbatim from the claim it already matched, and Projection simply reads it off the result it already has. No lookup, no join, no Matrix access, anywhere in Projection. The full prior reasoning is preserved in git history (this document's earlier revision) and is not repeated here.

---

## Critique the problem before designing anything

### 1. Where does Projection begin? The precise boundary.

**`[FINDING]` The evidence does not support one canonical interface — it supports exactly two, and forcing a single interface would either duplicate data or misattribute ownership.** `PRD_CRC_v1.0.md` §14's output template has three sourced sections, not one:

1. *"You're working on [project], built with [tools]. It's been through internal review..."* — a plain-language restatement of **Interview's own captured facts**. Nothing in `RetrievalResult` carries project/tool/workflow-observation content; this can only come from `RetrievalHandoff`.
2. *"[Tool]'s commercial permissions vary by account type... (content last updated [date])"* — Matrix-sourced knowledge, delivered via `RetrievalResult[]`.
3. *"Topics that often come up"* — intended to be Retrieval-sourced per PRD §12, but see the Output Contract below: Retrieval, as actually shipped, cannot produce this content yet.

Projection's two canonical inputs are therefore:
- **`RetrievalHandoff`** (`08_Platform/app/types/interview-engine.ts`) — already Retrieval's own input; nothing prevents a second reader, and `INTERVIEW_ENGINE_ARCHITECTURE.md` never claims exclusivity over it.
- **`RetrievalResult[]`** (`08_Platform/app/lib/retrieval-engine/types.ts`) — Retrieval's terminal output, including `candidate_statement`.

Both are already frozen, already typed, already tested. Wrapping them in a new combined object for Projection to consume instead would be pure indirection with nothing of its own to validate — see Q3.

**Boundary statement:** Projection begins exactly where Retrieval's own architecture document says its contract ends — *"here is what matched, why, and what SI8 is permitted to say about it — never how it's said to the user"* — plus the one thing Retrieval was never asked to carry: Interview's own summary facts, read directly from the same handoff Retrieval itself consumes.

### 2. What crosses the boundary, and in which direction is reinterpretation forbidden?

**Projection-only knowledge, Retrieval must never know it:** output voice/tone rules (§14's phrasing constraints), the template structure and section ordering, the closing CTA copy, and — per the Finding in Q6/Q7 below — which specific text field is safe to render as user-facing prose versus which is retained for audit only.

**Retrieval-only knowledge, Projection must never reinterpret it:** *why* a claim is eligible (the `CRC-Eligible` decision itself and its Publication Policy reasoning) — Projection treats "this claim was returned by Retrieval" as sufficient warrant, full stop, never re-derives or second-guesses it. Every Matrix research field Retrieval itself never carries forward (`SI8 Interpretation`, `Source`, `Status`, `Known Restrictions`, `CRC Decision Date`, `CRC Approver`) is enforced structurally — `RetrievalResult`'s type has no field for any of them, so there is nothing *to* reinterpret, the same "structurally impossible, not just avoided by discipline" pattern `RETRIEVAL_ENGINE_ARCHITECTURE.md` uses for `Status`. This structural guarantee extends to Projection's own relationship with the Matrix: Projection has no field, import, or code path that reaches the Matrix at all — the same "impossible, not just avoided" pattern, one layer further downstream.

### 3. Intermediate object — challenged and rejected.

**No intermediate object.** Both `RetrievalHandoff` and `RetrievalResult[]` are already canonical, already typed, already covered by a passing deterministic test suite. An intermediate "ProjectionInput" object combining them would either (a) copy their fields, creating a second representation that can silently drift from the originals the moment either upstream type changes, or (b) just be a thin pass-through with no validation of its own — in either case, exactly the "layer capable of drifting" this question's own framing warns against, with no offsetting benefit. Projection's internal data flow (below) reads both inputs directly.

### 4. PRD §14 artifact mapping

| Artifact | Source subsystem | Transformed? | Rendered? | Authored? | Deterministic? | Generated? |
|---|---|---|---|---|---|---|
| Opening line | Projection | No | Yes, literal | Yes (fixed copy) | Yes | No |
| "What we understood" restatement | `RetrievalHandoff` (Interview) | Yes — structured facts → templated prose | Yes | No (data-driven) | Yes (templated, not NLG) `[PROTOTYPE ASSUMPTION — TO VALIDATE]` | No |
| Knowledge items (statement + source + date) | `RetrievalResult[]` — `candidate_statement` + `last_verified`, both already present on the result Projection consumes | Minimal — verbatim text wrapped in a fixed template | Yes | No (JD-authored upstream, not by Projection) | Yes | No |
| "Topics that often come up" | Intended: Retrieval | N/A this milestone | **No — no governed content source currently exists. Do not invent one; see Output Contract.** | No | Yes, once a source exists | No |
| Closing CTA | Projection | No | Yes, literal | Yes (fixed copy) | Yes | No |

### 5. Every `RetrievalResult` field, accounted for

| Field | Rendered directly? | Transformed? | Hidden? | Discarded? |
|---|---|---|---|---|
| `source_fact.kind` | No | No | Yes — internal traceability only | No |
| `source_fact.identifier` | No (may appear inside candidate-statement prose, already baked in by the human author) | No | Yes as a standalone field | No |
| `claim_id` | No | No | Yes | No — retained for traceability logging only |
| `matrix_identifier` | No | No | Yes | No — retained for traceability logging |
| `publication_scope` | No — governance-boundary prose, audit-only (Q6/Q7) | No | Yes from user output | No — retained for audit/traceability only, never discarded |
| `candidate_statement` | **Yes — rendered verbatim, wrapped in the fixed knowledge-item template (Q6/Q7)** | No | No when present | No — a null value produces a skip + diagnostic (§8), not a discard |
| `last_verified` | Yes | Yes — wrapped into the "content last updated [date]" phrase | No | No |

Nothing is silently dropped: every field is either rendered or explicitly retained for audit. `RetrievalDiagnostic[]` (Retrieval's non-match reasons) is **not** a Projection input at all — an empty `RetrievalResult[]` is sufficient signal to omit the knowledge section; *why* nothing matched is engineering/coverage-gap signal, per `RETRIEVAL_ENGINE_ARCHITECTURE.md` §6, never a rendering input.

### 6 & 7. How Projection consumes the CRC Claims structure without becoming a governance engine — and whether Candidate Statement is really Projection's job

**`[FINDING]`** Re-reading the actual text of `CRC Publication Scope` against `CRC Candidate Statement` side by side (both from the committed Matrix) exposes a real distinction between the two:

- `CRC Publication Scope` (Runway): *"CRC may state only that Runway's current Terms permit commercial use across subscription tiers when the Terms of Service are followed... This publication scope does not extend to ownership analysis, enterprise training provisions..."* — this is a **governance-boundary description**: permission-scoped, hedged, written for audit, explicitly enumerating exclusions. It is not phrased as a sentence meant to be spoken to a user, and Projection never renders it.
- `CRC Candidate Statement` (Runway): *"Runway's current Terms allow commercial use across all subscription tiers, provided you comply with the Terms of Service. The Free plan mainly differs by watermarking rather than commercial-use permissions."* — a **direct, natural, standalone statement** — exactly the register PRD §14's own template shows (*"[Tool]'s commercial permissions vary by account type"*) and exactly what §14's own rule requires (*"neutral **statement**"*, not a scope description).

**Resolution:** `RetrievalResult` carries `candidate_statement: string | null`, copied verbatim by Retrieval from the same already-matched, already-eligible claim that supplies `publication_scope` (`RETRIEVAL_ENGINE_ARCHITECTURE.md` §5, implemented in `assemble-result.ts`). Retrieval performs zero interpretation of this field — it is a pure passthrough, not a new judgment. Projection therefore:
- Reads `candidate_statement` directly off each `RetrievalResult` it already has. No lookup, no join, no second data source (see Design History above).
- Retains `publication_scope` on the traceability record but **never renders it** — audit-only.
- Renders `candidate_statement` **verbatim** when present, wrapped in the fixed template — never edited, never summarized, never validated against `publication_scope`'s own text.
- Skips the item (with a diagnostic, never a fabrication) when `candidate_statement` is null.

**`[IMPLEMENTATION GUIDANCE]` Candidate Statement is governed, publication-ready source text, not raw material for Projection to work with.** It was authored, reviewed, and approved under `CRC-PUBLICATION-POLICY.md` specifically so that it would already be in its final user-facing form by the time it reaches this layer. Projection may place it into a template — wrap it with a source label, a last-updated date, bullet formatting — but must not substantively paraphrase, summarize, reorder its clauses, or otherwise reinterpret its content in v1. The verbatim-render rule in §4 below is not a convenience default; it is the whole reason this field exists as a separate, human-finalized value distinct from `publication_scope`.

**Why this doesn't make Projection a second governance engine:** Projection performs *zero* eligibility logic and *zero* data-fetching of any kind beyond its two typed inputs. It never re-runs `enumerate-eligible-claims`, never reads `CRC-Eligible`, never touches a row Retrieval didn't already return, and has no code path capable of reaching the Matrix at all. This is not a discipline Projection has to maintain; it is a property of what Projection's inputs even contain.

**Why Projection doesn't cross-check `candidate_statement` against `publication_scope`:** doing so would require Projection to *semantically compare two pieces of prose* — exactly the reinterpretation this whole architecture forbids. That alignment is a human-authoring discipline (JD writing both fields together, under `CRC-PUBLICATION-POLICY.md`), verified at write-time, not something Projection re-litigates at render-time — and Projection has no independent access to `publication_scope`'s authoring context to compare against even if it wanted to.

### 8. Should Projection contain an LLM? Answered from architecture, not preference.

**No — for the Matrix-sourced knowledge-item path, with high confidence.** `candidate_statement` is already natural, human-authored prose. Rendering it requires zero generation: wrap it in a fixed template (`— {statement} (SI8 Platform Intelligence, content last updated {date}.)`). There is no natural-language-understanding problem left to solve at this stage, for exactly the same architectural reason `RETRIEVAL_ENGINE_ARCHITECTURE.md` §7 gives for Retrieval itself: the hard interpretation work already happened upstream (there, Interview's Extraction; here, JD's own authoring of Candidate Statement).

**`[PROTOTYPE ASSUMPTION — TO VALIDATE]` For "what we understood" (Interview-sourced summary): still no LLM, but for a more qualified reason.** Turning `RetrievalHandoff`'s structured facts (tool identifiers, scoped observations, `intended_use`) into a fluent paragraph is a genuine natural-language-*generation* problem, not pure pass-through — a harder case than the knowledge-item path. But: (a) PRD §14's own rule (*"never paraphrases a T-stage"*) already signals this section is meant to stay close to literal restatement, not open generation; (b) a fixed per-fact-type sentence template, concatenated in a stable order, can produce this section fully deterministically, at the cost of reading somewhat more mechanically than free generation might; (c) this project's own established discipline (Interview, then Retrieval) has been to default to deterministic-first and only introduce a model where evidence — not assumption — demands it, and no evidence yet exists that templating is visibly too rigid for this specific section. This deterministic-templating mechanism is explicitly a first-pass assumption, not a proven design. Do not introduce an LLM here before empirical rendering tests show a concrete need; treat upgrading it to a narrowly-scoped, independently-evaluated generation component (never a general "Projection has an LLM" grant) as a future possibility requiring its own evidence, exactly as `RETRIEVAL_ENGINE_ARCHITECTURE.md` §7 treats a hypothetical future semantic-matching component.

**Exact boundary if this is ever revisited:** any future generative component would own *only* the "what we understood" paragraph's phrasing — never eligibility, never claim selection, never the knowledge-item or CTA sections, and never a decision about *which* facts to include (that stays a deterministic function of `RetrievalHandoff`).

---

## 1. Purpose

`[PRINCIPLE]` Projection transforms deterministic Retrieval output (plus Interview's own summary facts) into the structured CRC output PRD §14 defines. It performs no retrieval, no interviewing, no policy interpretation, no governance decision, no fact inference, no new-knowledge generation.

**Relationship to Interview:** read-only consumer of `RetrievalHandoff`, the same terminal object Retrieval consumes — never reaches back into `StructuredUnderstanding`, never triggers a new turn, never influences the conversation (the same one-directional boundary `INTERVIEW_ENGINE_ARCHITECTURE.md` §3 establishes for Retrieval, extended to a second downstream consumer).

**Relationship to Retrieval:** read-only consumer of `RetrievalResult[]` — nothing more. Never re-runs matching, never re-derives eligibility, never touches a row or claim Retrieval didn't already surface.

**Relationship to itself:** the final assembly step. Everything upstream produces facts; Projection is the one place those facts become the actual message PRD §14 specifies — and the last place before it. Nothing downstream of Projection performs further transformation of substance (only literal delivery — email, UI, etc. — which is out of scope here, same as PRD §14 treats it).

**Relationship to the final rendered CRC output:** Projection's output *is* the final rendered CRC output, per PRD §14's template, exactly as specified — not an intermediate representation something else still has to finish.

**Relationship to governance sources:** Projection has **no direct access to the Platform Rights Matrix, the CRC Claims registry, the Living Notebook, or any other governance source** — not read access, not a lookup, not an import. Everything it needs about a claim's eligibility and publication-ready text arrives pre-resolved on `RetrievalResult`. This is the single most important structural fact about this document's design.

## 2. Inputs

Exactly two canonical runtime inputs. No third, no duplication, no exception:

```typescript
// Already shipped, unmodified — 08_Platform/app/types/interview-engine.ts
RetrievalHandoff

// Already shipped — 08_Platform/app/lib/retrieval-engine/types.ts
// RetrievalResult.candidate_statement carries the already-approved statement
// text directly; no separate fetch required.
RetrievalResult[]
```

Projection imports nothing from `lib/retrieval-engine/matrix-fixture.ts` or any Matrix-representing module — its only imports are the two types above and its own rendering/template code. This is a hard boundary, not a soft one: a future implementation that adds a Matrix import to Projection's module for any reason would be violating this document, not extending it.

## 3. Internal Data Flow

```
RetrievalHandoff  +  RetrievalResult[]
        |
   [A] render "what we understood" from RetrievalHandoff
        |            (deterministic templating over tools/intended_use/workflow_role/scoped_observations)
        |            [PROTOTYPE ASSUMPTION -- TO VALIDATE]
        |
   [B] for each RetrievalResult:
        |     read candidate_statement directly off the result
        |     if null -> skip this item, record a diagnostic (never fabricate, never fall back to publication_scope)
        |     else -> wrap verbatim statement + last_verified into the fixed knowledge-item template
        |
   [C] "topics that often come up" section: omitted this milestone
        |            (no governed content source currently exists -- see Output Contract. Do not invent one.)
        |
   [D] assemble: opening line + [A] + knowledge items from [B] (or omit section if empty) + [C] (omitted) + closing CTA
        |
   Final CRC output (PRD §14 structure)
```

Every step is a pure function. No step reads anything beyond the two canonical inputs.

## 4. Transformation Rules

**Allowed to transform:**
- `RetrievalHandoff` facts (tools, `intended_use`, `workflow_role`, `scoped_observations`) into templated prose sentences for the "what we understood" section — literal restatement per PRD §14's own rule (never paraphrase a T-stage, never invent a claim the facts don't support). `[PROTOTYPE ASSUMPTION — TO VALIDATE]` — see Q8.
- `RetrievalResult.last_verified` into the "content last updated [date]" phrase.
- Assembly formatting: bullet prefixes, section headers, whitespace, ordering.

**Must preserve verbatim, never edited:**
- `RetrievalResult.candidate_statement` text, when present — rendered exactly as authored. This is governed, publication-ready source text (Q6/Q7): Projection may place it into a template but must not substantively paraphrase, reorder, or otherwise reinterpret its content in v1.
- Nothing else is rendered verbatim from Retrieval's own output, because nothing else is rendered from it at all (`publication_scope` is retained for audit, never rendered — Q6/Q7).

**Must never invent:**
- A knowledge item for a claim with a null `candidate_statement` (skip + diagnostic, never paraphrase `publication_scope` into a makeshift statement — that would be exactly the reinterpretation Q6/Q7 rules out).
- A "topics that often come up" entry from nothing (this milestone: the section is empty, not populated with invented content, because no governed content source currently exists for it — see §5).
- Any T-stage name, risk conclusion, readiness score, or commercial-acceptability judgment anywhere in the output — none of these exist anywhere in either input, so there is nothing to accidentally carry forward, but stated explicitly per PRD §14's own explicit ban.

## 5. Output Contract

| Artifact | Fields | Originating subsystem |
|---|---|---|
| Opening line | (fixed copy) | Projection |
| "What we understood" | project/tool/workflow restatement | `RetrievalHandoff` (Interview) — `[PROTOTYPE ASSUMPTION — TO VALIDATE]` templating mechanism |
| Knowledge item (0 or more) | statement, source label, last-updated date | `RetrievalResult.candidate_statement` + `RetrievalResult.last_verified` — both fields already present on Projection's own input, no external fetch |
| "Topics that often come up" | — | **Not populated in Projection v1, by design, not by omission.** No governed content source exists for this section anywhere in the currently-shipped system: Retrieval, as actually shipped, only matches against the tool-row-keyed Platform Rights Matrix, which produces knowledge-item-shaped content only. Nothing in `RetrievalResult` distinguishes a "presence-triggered question" from a "knowledge item." This was already an explicitly open question in `RETRIEVAL_ENGINE_ARCHITECTURE.md` §6 ("how does non-tool-keyed knowledge get indexed at all?"), and it is treated the same way here: **this section renders as absent, and no substitute content source is invented to fill it.** Populating it is out of scope for this document and for Projection v1 entirely — it requires a governance and indexing decision made elsewhere first. |
| Closing CTA | (fixed copy) | Projection |

## 6. Deterministic Guarantees

- Same `(RetrievalHandoff, RetrievalResult[])` pair always produces the identical output, byte for byte.
- Every rendered knowledge-item statement is traceable to a specific `claim_id` Retrieval already validated as eligible (via `RetrievalResult.claim_id`, retained for logging, never rendered).
- No field ever appears in output that isn't named in this document's Output Contract.
- No claim is ever rendered without a non-null `candidate_statement` to render verbatim — partial/missing data produces omission, never invention.
- Section absence (empty knowledge items, empty "topics") is itself deterministic and traceable to specific, loggable reasons.
- Projection performs zero fetches beyond its two typed inputs — there is no additional data-freshness or staleness concern to reason about for Projection itself (that concern lives entirely in Retrieval, per `RETRIEVAL_ENGINE_ARCHITECTURE.md` §8).

## 7. Forbidden Behavior

Projection must never: retrieve; infer; rank; reinterpret; guess; summarize policy; synthesize legal conclusions; generate new governance decisions.

**Additions this critique surfaced, not in PRD §14's own list:**
- **Cross-validate `candidate_statement` against `publication_scope`.** Named explicitly in Q6/Q7 — the temptation to "double-check" the two agree is exactly a reinterpretation risk hiding inside what looks like a safety check.
- **Paraphrase or truncate `publication_scope` into a makeshift statement** when `candidate_statement` is null. This is the single most likely accidental violation of "never invent," because skipping the item can feel like a worse user experience than a rough paraphrase — it is not; a rough paraphrase is fabrication.
- **Decide which of two eligible claims "wins"** if their rendered statements ever appear to conflict (Failure Behavior, below) — adjudicating between them is a governance judgment.
- **Infer a T-stage or workflow phase name into user-facing text**, even indirectly (e.g., via an observation's `workflow_stage` field) — PRD §14 already forbids this explicitly; restated here because it's the kind of rule that's easy to violate through a well-meaning "helpful summary" template rather than a deliberate act.
- **Add any import, call, or code path that reaches the Matrix, the CRC Claims registry, or the Living Notebook, for any reason** — including a "fallback" for a missing `candidate_statement`. See Design History above for why this door is closed rather than merely discouraged.

## 8. Failure Behavior

Fail closed. Never fabricate. Specifically:

- **Retrieval returns nothing** (`RetrievalResult[] === []`): omit the knowledge-items section entirely — not an empty header, no section at all. Not a failure; the modal early-conversation case.
- **`candidate_statement` is null for an eligible `RetrievalResult`:** skip that item, record a diagnostic (`claim_id`, reason: missing candidate statement). Never fall back to `publication_scope`.
- **`publication_scope` itself missing** (shouldn't reach Projection at all — Retrieval's own `assemble-result.ts` already refuses to emit a result for a `Yes` claim with no scope text, diagnosed as `yes_claim_missing_scope`): Projection never sees this case in practice; if it somehow did (a future Retrieval change relaxing that guarantee), the correct behavior is identical to the missing-candidate-statement case — skip, diagnose, never invent.
- **"Conflicting" claims** (two eligible claims whose rendered statements appear to contradict each other): render both, unmodified, as separate items. Projection has no arbitration logic and must not grow one — an apparent conflict is a Matrix-authoring quality question for whoever owns claim authoring, not something to silently resolve at render time. Not currently reachable given the committed Matrix's actual content (no tool's claims currently conflict), but the rule holds regardless.
- **Sparse handoff** (`certainty_state: 'gate_1_unmet'`, few or no confirmed facts): render whatever the "what we understood" template produces from what *is* confirmed — no minimum-completeness gate, matching Retrieval's own documented behavior for the same input shape.
- **All claims ineligible** (every candidate row returns `no_eligible_claims`): identical to "Retrieval returns nothing" from Projection's point of view — `RetrievalResult[]` is empty either way, and Projection has no visibility into *why* (diagnostics aren't a Projection input, Q5) and doesn't need it.

## 9. Test Strategy

**Projection can graduate on deterministic tests and fixtures alone. No live-model battery is required**, for the same reason Retrieval's own graduated without one: every transformation in this document is a pure function over already-structured data, with zero natural-language interpretation happening inside Projection itself.

**Unit-testable components:**
- "What we understood" templating, across sparse/rich/mixed-scope `RetrievalHandoff` fixtures.
- Knowledge-item assembly: eligible result with a non-null `candidate_statement` (renders); eligible result with a null `candidate_statement` (skipped + diagnosed); empty `RetrievalResult[]` (section omitted).
- **A structural/import test:** assert that Projection's module has no import of `lib/retrieval-engine/matrix-fixture.ts` or any other Matrix-representing module — the same "structurally impossible, not just avoided by discipline" verification pattern used elsewhere in this pipeline (`RETRIEVAL_ENGINE_ARCHITECTURE.md` §9's own negative-assertion suite, `MatrixRow` having no `Status` field at all). This is the test that actually proves the no-governance-access boundary, not just documents it.
- Full negative-assertion suite: output must never contain `publication_scope` text, `CRC-Eligible`, `SI8 Interpretation`, `CRC Decision Date`, `CRC Approver`, any T-stage token, any risk/readiness/score term — mirroring `RETRIEVAL_ENGINE_ARCHITECTURE.md` §9's own negative-assertion pattern exactly, extended one layer down the pipeline.
- End-to-end fixture traces (`RetrievalHandoff` + `RetrievalResult[]` in, final rendered text out) for a small representative set: empty conversation, single-tool/single-claim, multi-tool, compound-row (ElevenLabs — one eligible item rendered, the `No` claim never appears), null-candidate-statement, full opt-out.

## 10. Open Questions

Only genuine architecture questions, not implementation TODOs:

- **How will "topics that often come up" ever get a real content source?** This document cannot resolve it — it requires either extending the Matrix beyond tool rows or defining an entirely separate non-tool-keyed knowledge source (SI8 Positions is the most likely candidate, per PRD §13, but nothing about how it would feed Retrieval or Projection has been designed anywhere yet). Explicitly not invented here; Projection v1 ships without it.
- **Is deterministic templating for "what we understood" actually sufficient in practice**, or will real conversation variety expose phrasing that reads awkwardly? Genuinely unknown without real usage data — flagged, not assumed either way, matching the same discipline `RETRIEVAL_ENGINE_ARCHITECTURE.md` applied to its own open questions. Marked `[PROTOTYPE ASSUMPTION — TO VALIDATE]` throughout this document rather than treated as settled.
- **Where does delivery (rendering this into an actual email/UI surface) belong?** Out of scope for this document by the same logic that put UI/rendering out of scope for the two prior architecture documents — noted so it isn't silently assumed to be part of Projection just because Projection is "the last step before output."

---

## Critique Your Own Design

**Contradictions with existing CRC architecture:** none found. The Retrieval-side contract this document depends on (`candidate_statement` on `RetrievalResult`) is itself already committed to `RETRIEVAL_ENGINE_ARCHITECTURE.md` and implemented/tested — this document is downstream of an already-settled contract, not proposing a conflicting one.

**Places Projection accidentally became a second Retrieval Engine:** none by construction. Projection has zero data-fetching capability beyond its two typed inputs — not a discipline being followed, a property of what the inputs contain. The residual risk is a future implementer adding *any* new data dependency to Projection (Matrix access or otherwise) "just this once" for a seemingly reasonable feature — guarded against by §7's explicit prohibition and §9's structural/import test, which is a stronger guardrail than discipline alone because it fails a build rather than relying on a reviewer noticing.

**Places Projection accidentally became a second governance system:** none by design. The strongest temptation identified (§7) is cross-validating `candidate_statement` against `publication_scope` — flagged and explicitly forbidden precisely because it would be exactly this.

**Places Projection could accidentally synthesize conclusions:** the "what we understood" templating path (§4, Q8) is the highest-risk area, because natural-language assembly from multiple facts is inherently more prone to accidentally implying a conclusion (e.g., a template that says "this project looks ready" when it's only restating confirmed facts) than verbatim pass-through is. Mitigated by keeping that path restricted to literal restatement per PRD §14's own rule, and explicitly labeled `[PROTOTYPE ASSUMPTION — TO VALIDATE]` rather than presented as a settled recommendation — worth a dedicated negative-assertion test category of its own (§9) specifically checking for accidentally-evaluative language in that one section, since it's the one section built by assembly rather than pass-through.

**Places Projection could accidentally become presentation/UI instead of architecture:** the line drawn in §1 (Projection produces the final rendered *text*, per PRD §14's own template; anything about *delivery* — email formatting, UI chrome, markdown vs. HTML — is out of scope) holds cleanly as long as implementation respects it. The risk is not in this document's own scope statement but in a future implementer quietly absorbing delivery concerns into the same module because it's convenient — worth flagging as an implementation-discipline risk, not an architectural gap.

**Is Projection now sufficiently specified to begin implementation planning?** **Yes, for the knowledge-item and "what we understood" paths — the two paths that actually have a real data source today.** The "topics that often come up" section remains honestly not implementable yet, for a reason outside this document's own power to resolve (no content source exists), and is explicitly scoped as absent-by-design rather than blocked-on, exactly as `RETRIEVAL_ENGINE_ARCHITECTURE.md` itself shipped with its own non-tool-keyed-indexing gap left open rather than gating the whole milestone on it.

---

## Return

**Architecture summary:** Projection has exactly two canonical inputs — `RetrievalHandoff` and `RetrievalResult[]` — and no access, direct or indirect, to the Matrix, CRC Claims registry, Living Notebook, or any other governance source. There is no intermediate object and no side-lookup of any kind. Projection is fully deterministic — no LLM anywhere, including the "what we understood" summary path, which uses fixed templating rather than generation and is explicitly labeled a `[PROTOTYPE ASSUMPTION — TO VALIDATE]`, not a proven mechanism. Output has three sourced sections (Interview-sourced summary, Matrix-sourced-but-Retrieval-delivered knowledge items, and a currently-unpopulated "topics that often come up" section with no governed content source to draw from) plus fixed opening/closing copy. Candidate Statement is treated throughout as governed, publication-ready source text that Projection may place into templates but must not substantively paraphrase or reinterpret.

**Contradictions found:** none with existing frozen architecture. The Retrieval-side contract extension this document depends on is itself already committed and tested, not a proposal still in flight.

**Blockers:** none for the two implementable sections. One real, named gap — "topics that often come up" has no content source anywhere in the currently-shipped system — is explicitly *not* a blocker for starting implementation, since PRD §14's own template already treats the knowledge-items section as optional/presence-triggered, and the same discipline extends cleanly to this section.

**Highest-risk assumption:** that deterministic templating for "what we understood" will read naturally enough across real conversation variety without needing generation. Not verifiable without real usage data — flagged as the one open question most likely to require revisiting after implementation, not assumed to be fine by default.

**Recommendation:** Projection is ready for implementation planning for the knowledge-item and "what we understood" paths. The "topics that often come up" section should be explicitly scoped out of the first implementation pass, not designed around speculatively — consistent with this whole project's standing discipline against building structure ahead of a demonstrated need. **Per explicit instruction: do not begin Projection implementation until directed to.**
