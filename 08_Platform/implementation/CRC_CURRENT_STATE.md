# CRC — Current Accepted State, Closed Milestones, Deferred Backlog, Next Workstream

**Status:** ACTIVE — the living cross-cutting status doc for CRC/Living Knowledge engineering. Supersedes nothing — the layer-specific architecture docs below remain the normative design references; this doc tracks *which milestones against them are closed*, *what's deliberately deferred*, and *what's next*.
**Last updated:** 2026-08-27
**Why this file exists:** no single doc previously tracked rolling CRC engineering status — `CRC_PROTOTYPE_ALPHA_ROADMAP.md` is a closed, point-in-time execution plan (Aug 8, 2026, "Prototype Alpha" only); the various `*_ARCHITECTURE.md`/`LK_PHASE1_TECHNICAL_DESIGN*.md` docs each normatively define one layer's internal design, not cross-cutting status; `implementation/eval-reports/` holds dated, historical diagnostic reports (preserved as-is, never rewritten). This file is the missing "what's accepted, what's deferred, what's next" index — created 2026-08-27 during a documentation-closeout pass, not to replace any of the above.
**Companion doc:** `CRC_IMPLEMENTATION_RISKS.md` — pre-prototype empirical risk list, narrower scope (kept separate deliberately, per its own header), not superseded by this file.
**Product spec (frozen, not reopened by this file):** `08_Platform/prds/PRD_CRC_v1.0.md`

---

## 1. CRC product boundary (unchanged, restated for clarity)

CRC **is**: a lightweight conversational educational workflow, intended to surface commercially relevant considerations, intentionally bounded (six-question ceiling — see §3E), allowed to finish with unresolved governed knowledge.

CRC **is not**: legal advice; a Commercial Assurance Assessment; certification of commercial clearance; an exhaustive evidence-gathering interview; required to resolve every applicable Living Knowledge dependency.

**Commercial Assurance** (the human-reviewed assessment product, `PRD_ASSESSMENT_SERVICE_v1.0.md`) remains the higher-assurance product CRC feeds into — CRC decomposes a described workflow into verified educational claims; SI8's human reviewers synthesize the actual commercial-readiness judgment. This distinction is normative per `PRD_CRC_v1.0.md` and is not reopened here.

## 2. Layering (unchanged, restated for clarity)

| Layer | Owns |
|---|---|
| **Living Knowledge** | Governed propositions, provider scope, applicability requirements, dependencies, Lifecycle, CRC eligibility, evidence limitations, supersession/governance state |
| **Retrieval** | Selects governed knowledge relevant to project state and user goals — no rendering, no interpretation |
| **Bounded Interpretation (BI)** | Controls what CRC may safely conclude about the project |
| **Projection/Composition** | Presents only conclusions BI permits |

**Invariant:** no downstream layer may create a stronger conclusion than BI permits. This has not been violated by any milestone below — every closed item is additive/observability or scoped strictly within one layer's own existing contract.

## 3. Track A / B / C (unchanged, restated for clarity)

- **Track A — Discovered relevance:** generic discovered relevance from structured project facts, without fabricating `UserGoal`s.
- **Track B — Knowledge readiness/dependency askability:** generic governed-knowledge readiness/dependency-askability mechanism (`lib/crc-engine/knowledge-readiness.ts`, `dependency-askability.ts`). Distinct from **selector askability** (`selector-askability.ts`) — a dependency exists on an *already-applicable* proposition; a selector determines *whether the proposition applies at all*. The two remain separate governance authorities with separate `BoundaryState` cap records, by design.
- **Track C — Discovered-topic goal provenance:** discovered-topic `RetrievalResult`s preserve the *originating explicit-goal* provenance, so relevant governed knowledge can contribute to the user's answer without fabricating another `UserGoal`.

Explicit goals and discovered relevance remain distinct throughout. Not simplified or collapsed by any closed milestone below.

## 4. Governance / fail-closed invariants (unchanged, restated for clarity)

- `provider_scope`, `applicability_requirements`, `Lifecycle`, `crc_eligible`, and supersession are each independently authoritative — none is inferred from another.
- Evidence boundaries are authoritative: a fact that is evidence-only (see below) cannot become askable by any mechanism.
- Fail-closed is the default everywhere in this stack: an unregistered selector fact, an unregistered dependency, and an unadopted/non-eligible claim are all structurally indistinguishable from "does not exist" to every downstream consumer.
- **Selector askability ≠ applicability.** Whether CRC may *ask about* a fact is a separate governance decision from whether that fact, once known, makes a claim *applicable* — enforced as two independent registries (`selector-askability.ts` vs. `applicability_requirements` in `retrieval-engine/types.ts`).
- **Materiality ≠ askability.** A fact being materially relevant to a claim does not by itself authorize CRC to ask about it — it must additionally be explicitly registered `askable_in_crc`.
- **Unresolved knowledge does not become resolved because CRC stops asking.** Reaching `questioning_exhausted` or the six-question ceiling leaves a fact exactly as unresolved as before — nothing infers a default value from silence.

**Stock governance (evidence-only, unchanged):** editorial designation, separate authorization, release status, and rights-and-clearance status remain evidence-only — never converted into user self-attestation questions. This list is not broadened here; broadening it requires its own governance decision, not a documentation pass.

## 5. Closed / accepted milestones (as of commit `18a308d`)

| # | Milestone | What changed | Commit(s) |
|---|---|---|---|
| A | **ToolMention fact persistence** | Structured `ToolMention` facts CRC asked for and learned now persist correctly across ordinary later re-mentions of the same tool (previously at risk of being dropped across supersession). | `1af75b0` |
| B | **Selector opportunity before completion** | A live, eligible governed selector need is now given a dedicated attempt before natural completion, and before `questioning_exhausted` — governed selector opportunities are no longer silently lost to either completion path. | `704e156`, `27b4932` |
| C | **Candidate-generator structured-output reliability** | Candidate-generator output token budget increased, sized independently against evidence of truncation risk (not a guess). | `2ae4e82` |
| D | **Extractor structured-output reliability** | Extractor Anthropic calls now explicitly disable model "thinking," so thinking tokens cannot consume the structured-output budget. | `808a119` |
| E | **Global user-facing question budget** | `MAX_USER_FACING_QUESTIONS = 6` — a hard ceiling, not a target. Natural completion may still occur earlier; budget exhaustion is a distinct outcome from ordinary candidate exhaustion. | `a66a5fe` |
| F | **Organic jurisdiction follow-up boundedness** | Organic (LLM-generated) jurisdiction follow-up questions now route through the existing structured `follow_up_need` mechanism (`jurisdiction` added to `FOLLOW_UP_NEEDS`) and are deterministically capped, closing an organic duplicate-question gap. | `1ce6de5` |
| G | **Selector-attempt observability** | `TurnOutcome.selectorSignal` — selector eligibility/attempt/rejection is now observable (eligible / preempted / asked / rejected-by-A / rejected-by-B, via `CandidateRejectionReason`) without any behavior change. Structural identifiers only (e.g. `tool_account_status::kling`) — no transcript text, prompts, or free-text project content. | `18a308d` |
| H | **No-visibility continuation — investigated, no change** | See §8 below. |

*(Context, not separately itemized above: the underlying selector-questioning capability itself — dormant → generic Retrieval-owned readiness primitive → `tool_account_status` registered as its first live entry, following a bounded live-model UAT — landed across `b05c970`, `5a1c393`, `a8fbec1`, `41698ac`, `64f7eda`, `10dbdf1`, `278d957`, `7ef3a59`, `c373b30`, `2eb68dc`, prior to and underlying milestones A/B/G above.)*

## 6. No-visibility continuation — investigation closed, no change (item H)

**Investigated; existing architecture sufficient; no change recommended.** Not "solved by new code" — no code was written or accepted.

Evidence (real-model eval, isolated fixtures, 2026-08-27):
- A fixed selector re-ask is correctly suppressed by Constraint A once the user has already supplied a no-visibility answer (confirmed, zero variance across the observability milestone's own findings).
- The organic candidate generator can already, unprompted, produce a genuinely *different* and materially useful continuation question when the direct re-ask is foreclosed (observed once in a 4-rep sample — e.g. pivoting from "which account tier?" to "what was this tool's functional role in production?").
- Constraint A can and does reject low-value/redundant continuation attempts (both a foreclosed direct re-ask and unrelated tangents), using its own existing semantic judgment — not a new structured rule.
- Per the applicable decision standard: the distinction between a useful bounded continuation and low-value chasing is **not representable in current structured state** (checkability is only ever free text, never a structured field) — building dedicated new architecture here would either duplicate judgment the model already performs correctly, or require inventing the exact fuzzy semantic signal the standard says should block implementation.

**GO/NO-GO: NO-GO for new architecture.** See item 8A below for the closely related, still-deferred "Class-B uncertainty chaining" question.

## 7. Consultative Composition — status

Consultative Composition remains an important product workstream but is **not** the immediate next implementation milestone. Current composition goal remains generic: CRC should explain what appears resolved, what the material unresolved issue is, why it matters, what evidence is missing, what CRC can and cannot conclude, and what Commercial Assurance would separately verify. No domain-specific composers exist or are planned. Not implemented or reopened by this documentation pass.

## 8. Deferred / observe (not active milestones)

| # | Item | Status |
|---|---|---|
| A | **Class-B uncertainty chaining** | The architecture *can* create fresh, independent signals from successive uncertainty/no-visibility answers. The six-question ceiling (§5E) bounds user-facing impact. No new cross-record lineage or uncertainty-saturation architecture is currently approved. Re-open only on repeated real production evidence of material harm. Related to, but broader than, the no-visibility continuation question closed in §6. |
| B | **`workflow_role` follow_up_need** | Not approved. Evidence currently insufficient. |
| C | **`human_contribution` follow_up_need** | Not approved. Evidence currently insufficient. |
| D | **Candidate precedence / prioritization redesign** | No generalized scheduler, scoring system, weighting system, or precedence rewrite is currently justified. The investigated Kling production case (§6) was confirmed **not** a precedence defect. |
| E | **Selector wording / Constraint A correction** | Not approved. Constraint A correctly suppresses redundant selector re-asks after a no-visibility answer (§6). |
| F | **Semantic duplicate detection** | Not approved. No fuzzy/text-similarity duplicate-question system should be introduced without substantially stronger evidence than currently exists. |
| G | **Duplicate POST / session-state concurrency** | Existing duplicate-POST / unconditional-update persistence race — recorded here as technical debt. Not investigated or solved in this pass. |
| H | **Gate-2 stability-diff coverage** | If incomplete stability tracking for fields such as `asset_provider_mentions`, `ToolMention.account_status`, or `user_goals` is already recorded elsewhere as debt, it remains outstanding — not reopened, not re-litigated, and not newly asserted from memory here (no repository evidence was reviewed for this specific item during this documentation pass; if a prior record of it exists, treat that record as authoritative, not this line). |

## 9. Next active workstream: Living Knowledge Domain Portability / Extensibility

**Question:** not "can we add more claims?" but *how much of the generic Living Knowledge → Retrieval → Bounded Interpretation → questioning → Composition architecture carries over without domain-specific orchestration* when a genuinely new governed LK target domain is introduced?

**No target domain is formally approved as of this writing.** Candidate-selection is the next PM decision, not made or presupposed by this documentation pass.

### Portability success standard

**Good portability** — a new domain should primarily require: governed LK entries, applicability requirements, evidence boundaries, and possibly generic registry/config additions — while Retrieval, BI, Track A/B/C, the selector/readiness machinery, questioning caps, and Projection/Composition all continue working **without domain-specific branching**.

**Architecture warning signs** — if a new domain instead requires: provider-specific `run-turn.ts` orchestration, domain-specific Retrieval logic, domain-specific BI logic, domain-specific completion rules, domain-specific composers, a duplicated selector system, fabricated `UserGoal`s, or weaker evidence boundaries — **stop** and determine whether the generic architecture is missing an abstraction, rather than patching the new domain in locally.

The new-domain diagnostic should explicitly measure whether each of the following generalizes: `provider_scope`; `applicability_requirements`; Lifecycle/CRC-eligibility; explicit vs. discovered relevance; Track A/B/C; selector askability; evidence-only boundaries (representable generically, not just for AI-tool facts); Retrieval (any domain-specific logic needed?); BI (any domain-specific logic needed?); Projection/Composition (stays generic?); new provider/domain normalization; new extraction signal kinds; and whether the new domain exposes hidden assumptions baked into the current stock/AI-tool-only knowledge.

### Handoff — next task

**NEXT: Living Knowledge New-Domain Portability Diagnostic**

**Objective:** select one genuinely new governed LK domain and trace what is required to add it end-to-end, *before* implementation.

**Questions to answer:**
1. What new governed proposition types/facts are required?
2. Can the existing LK schema express them?
3. What new extraction facts, if any, are genuinely required?
4. Can existing Retrieval discover them?
5. Can existing applicability-readiness machinery determine what is missing?
6. Can existing selector/readiness mechanisms ask permissible questions?
7. Which facts must remain evidence-only?
8. Can BI bound conclusions without domain-specific branches?
9. Can Composition present them generically?
10. What code changes would actually be necessary?

**Expected first milestone: DIAGNOSTIC ONLY.** Do not implement the domain before that diagnostic runs and reports back.

---

## Document index — where the rest of the detail lives

- **Product spec (frozen):** `08_Platform/prds/PRD_CRC_v1.0.md`
- **Pre-prototype empirical risk list:** `08_Platform/implementation/CRC_IMPLEMENTATION_RISKS.md`
- **Layer architecture (normative internal design, not reopened by this file):** `INTERVIEW_ENGINE_ARCHITECTURE.md`, `RETRIEVAL_ENGINE_ARCHITECTURE.md`, `LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md`, `LK_PHASE1_TECHNICAL_DESIGN.md` / `_v2.md`, `PROJECTION_LAYER_ARCHITECTURE.md`, `THIRD_PARTY_SOURCE_ASSETS_ROUTING_ARCHITECTURE.md`, `THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md`
- **Historical, point-in-time execution plans/retrospectives (preserved as-is, not rolling status):** `CRC_PROTOTYPE_ALPHA_ROADMAP.md`, `PROTOTYPE_ALPHA_RETROSPECTIVE.md`, `PROTOTYPE_BETA_RETROSPECTIVE.md`, `PHASE_6A_RETROSPECTIVE.md`, `PHASE_7_PLANNING.md`
- **Dated diagnostic/eval reports (historical, never rewritten):** `implementation/eval-reports/`
