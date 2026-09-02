# CRC — Current Accepted State, Closed Milestones, Deferred Backlog, Next Workstream

**Status:** ACTIVE — the living cross-cutting status doc for CRC/Living Knowledge engineering. Supersedes nothing — the layer-specific architecture docs below remain the normative design references; this doc tracks *which milestones against them are closed*, *what's deliberately deferred*, and *what's next*.
**Last updated:** 2026-09-02 (Consultative Composition milestone closeout: §5 gains row I, §7 rewritten from "not the next milestone" to the accepted-and-complete disposition, §8 gains the CC product-quality observations and one operational-reliability observation — documentation-only, no runtime/code/config/test change. Earlier passes, both documentation-only: 2026-08-27 created this file — §5's original anchor was commit `18a308d` — and later that date recorded the Music/Artlist A-3 Living Knowledge domain-portability result in §9.)
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

## 5. Closed / accepted milestones (as of commit `02dd13d`)

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
| I | **Consultative Composition — deterministic answer plan + surface realization** | A deterministic, downstream-of-BI plan builder (`consultative-answer-plan.ts`) turns BI's own output into a structured answer plan (neutral `unresolved_items`, no independently-inferred materiality); the results-delivery email then renders goal interpretations first and de-duplicates governed statements by structural `(matrix_identifier, claim_id)` identity so each renders once. No LLM, no `ProjectionOutput` change, no BI/Retrieval/LK/Track A-B-C change; the grandfathered in-browser projection and the teaser `consideration_count` are untouched. Production UAT Cases 1–5 PASS (see §7). | `1ab0bcd` (CC-3A), `a0bbb62` (CC-3B), `02dd13d` (CC-3B.1) |

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

**CONSULTATIVE COMPOSITION UAT — PASS; NO NEW MILESTONE REQUIRED.** CC-3A / CC-3B / CC-3B.1 (§5 row I): **ACCEPTED.** Current Consultative Composition engineering milestone: **COMPLETE.** **CC-3C: not started, not proposed.**

Production UAT Cases 1–5 (PM / Architecture disposition, 2026-09-02):

- **Case 1 — PASS.** Straightforward governed guidance.
- **Case 2 — PASS.** Unresolved applicability preserved without a fabricated project-specific determination or evidence-only self-attestation.
- **Case 3 — diagnostic disposition accepted.** No LK, Retrieval, BI, Track B / question-selection correctness, or Composition defect demonstrated. The Kling Member selector was unresolved, askable and generated, but lost the final question slot to higher-precedence Commercial Readiness Discovery before the six-question ceiling was reached — current bounded behavior (see §5E, §8D), not an architecture defect.
- **Case 4 — PASS.** An explicit commercial-clearance / determination request was appropriately bounded: CRC did not certify clearance or give a legal determination, and stayed useful by presenting governed guidance and the higher-assurance Commercial Assurance path. A prior Case 4 attempt had an isolated structured-output / max-token event, a retry, and a subsequent 300-second production runtime timeout; the logs establish those events but do **not** establish causal attribution from the max-token event to the timeout. The successful rerun supplies the semantic UAT result. The failed attempt is preserved as an isolated operational reliability observation (§8L) — not a Consultative Composition semantic defect.
- **Case 5 — PASS. CORRECTION SEMANTICS — STRONG POSITIVE EVIDENCE; NO DEFECT DEMONSTRATED.** One valid correction test demonstrated Kling → Runway supersession: the correction was incorporated, Runway became the authoritative current tool state, the final authoritative workflow and the final governed guidance each contained Runway only, stale Kling guidance / dependency was not visible, and the explicit commercial-use `UserGoal` was unchanged. This is one valid correction test — not "repeatedly safe."

Cross-UAT conclusions accepted: consultative rhetorical organization — repeated positive production evidence; deduplication / render ownership — repeated pass, no current evidence of a generic render-ownership defect; explicit vs discovered — no defect demonstrated; Commercial Assurance positioning — repeated pass.

**Architecture disposition: P0 none demonstrated; P1 none demonstrated.** P2 product-quality evidence exists (§8 rows I–L) but does not justify another Consultative Composition engineering milestone from current evidence. The P2 items are evidence / backlog inputs, not authorization to implement.

Composition goal is unchanged and remains generic: CRC should explain what appears resolved, what remains unresolved, why that limits the answer, what evidence is missing where bounded upstream representations support that explanation, what CRC can and cannot conclude, and what Commercial Assurance would separately verify. **No domain-specific composers exist or are planned.** Any future improvement of the P2 items must consume bounded upstream representations — Composition must not independently infer missing evidence.

## 8. Deferred / observe (not active milestones)

| # | Item | Status |
|---|---|---|
| A | **Class-B uncertainty chaining** | The architecture *can* create fresh, independent signals from successive uncertainty/no-visibility answers. The six-question ceiling (§5E) bounds user-facing impact. No new cross-record lineage or uncertainty-saturation architecture is currently approved. Re-open only on repeated real production evidence of material harm. Related to, but broader than, the no-visibility continuation question closed in §6. |
| B | **`workflow_role` follow_up_need** | Not approved. Evidence currently insufficient. |
| C | **`human_contribution` follow_up_need** | Not approved. Evidence currently insufficient. |
| D | **Candidate precedence / prioritization redesign** | No generalized scheduler, scoring system, weighting system, or precedence rewrite is currently justified. The investigated Kling production case (§6) was confirmed **not** a precedence defect. Consultative Composition UAT Case 3 (§7) re-confirmed this independently: opportunistic Commercial Readiness Discovery outranked an askable governed applicability selector under the six-question budget — current evidence does **not** justify changing Discovery / selector precedence or the six-question ceiling (§5E). Product-quality observation only. |
| E | **Selector wording / Constraint A correction** | Not approved. Constraint A correctly suppresses redundant selector re-asks after a no-visibility answer (§6). |
| F | **Semantic duplicate detection** | Not approved. No fuzzy/text-similarity duplicate-question system should be introduced without substantially stronger evidence than currently exists. |
| G | **Duplicate POST / session-state concurrency** | Existing duplicate-POST / unconditional-update persistence race — recorded here as technical debt. Not investigated or solved in this pass. |
| H | **Gate-2 stability-diff coverage** | If incomplete stability tracking for fields such as `asset_provider_mentions`, `ToolMention.account_status`, or `user_goals` is already recorded elsewhere as debt, it remains outstanding — not reopened, not re-litigated, and not newly asserted from memory here (no repository evidence was reviewed for this specific item during this documentation pass; if a prior record of it exists, treat that record as authoritative, not this line). |
| I | **Missing-evidence specificity** (Consultative Composition, P2) | Repeated product-quality pattern across UAT. CRC safely preserves unresolved applicability, but its explanation of *what* evidence or category remains unresolved can be too generic or opaque. No P0/P1 — no evidence of corrupted project state, Retrieval, BI, or final conclusions. Any future improvement must consume bounded upstream representations; Composition must not independently infer missing evidence. Evidence / backlog input, not an approved milestone. |
| J | **Generic unresolved-guidance explanation** (Consultative Composition, P2) | Repeated product-quality pattern. The unresolved-guidance hedge is safe but sometimes opaque or appended rather than fully consultative. Same constraint as row I (bounded upstream representations only). Evidence / backlog input, not an approved milestone. |
| K | **Negative-state client-assets presentation** (Consultative Composition, P2) | Repeated product-quality pattern. CRC can present generic client-assets education immediately after the user has established that no client assets were supplied. No evidence of corrupted project state, Retrieval, BI, or final conclusions. Do not change client-assets behavior on current evidence. Evidence / backlog input, not an approved milestone. |
| L | **Structured-output / runtime reliability — isolated Case 4 incident** | One isolated operational incident from the first Consultative Composition UAT Case 4 attempt: a structured-output / max-token event, a retry, and a subsequent 300-second production runtime timeout. Logs establish the events; they do **not** establish causal attribution from the max-token event to the timeout. Operational reliability observation only — **not** a Consultative Composition semantic defect, and not authorization to change structured-output configuration. Occasional mechanical prose / double-punctuation may also remain, cosmetic only. |

## 9. Living Knowledge Domain Portability / Extensibility — Music / Artlist A-3 (first result, 2026-08-27)

**Status: FIRST PORTABILITY EXPERIMENT COMPLETE.** The diagnostic this section originally called for (below, §9.9-§9.10, preserved) ran, selected Music/Audio Licensing & Rights as the target domain, and was carried all the way through implementation, integration, and production UAT for one claim — not left at the diagnostic-only stage originally planned.

**The supported conclusion is narrow, stated exactly:** `CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1` ("A-3") demonstrated end-to-end production portability through the existing generic CRC architecture. **This is not evidence that "Music is portable" as a domain**, and it does not change the governance status of the other 9 Music Scenario A claims, which remain exactly as before: `Lifecycle: Adopted`, `CRC Approver: PENDING` (`CPR_007`: WITHHOLD for all 10; PM decision on that combined review itself remains PENDING — A-3's own separate, later, narrower approval is recorded via an addendum on `CPR_007`'s index row in `governance-reviews/README.md`, never inside `CPR_007`'s own historical body).

Commits: FGR_006 adoption package `058c359`; Adoption `7367866`; CPR_007 (WITHHOLD) `f368612`; stock cross-domain-bleed correction (FGR_007 diagnosis `eabdd8f`, human approval + v1→v2 supersession `64fa6d1`); Artlist provider registration `76ad4be`; A-3 CRC publication + runtime fixture `054c625`; LK cross-domain bleed preflight tool `56e028f`. Production UAT: `crc_sessions` id `c0083c19-e206-4c5f-9fec-892a11fddfbd`, `runtime_commit: 054c625122c7`.

### 9.1 Governance portability (established via the full Music Scenario A candidate set)

Existing generic mechanisms carried the entire 10-claim Music candidate set with zero schema changes: evidence authority/provenance classification (`EVIDENCE-CAPTURE-SOP.md`), durable evidence preservation + checksum (`evidence-captures/artlist/`), governed-proposition structure, `provider_scope`, `applicability_requirements`, unresolved/evidence-only dependencies, `Lifecycle`, the FGR→CPR staging discipline, and — for the first time ever exercised in this repository — the `superseded_by` correction/supersession mechanism (used to fix the stock cross-domain-bleed defect Artlist's own onboarding surfaced, §9.3).

### 9.2 Runtime portability (established specifically via A-3)

A-3 alone additionally demonstrated the existing generic **runtime** mechanisms carry a governed claim through: provider resolution (`ASSET_PROVIDER_IDS`/`KNOWN_ASSET_PROVIDERS`, a pure registry-append), explicit Retrieval (`providerScopeMatches`/`lookupTopicClaims`, unmodified), Track A discovered relevance (`deriveDiscoveredTopicOccurrences`, unmodified — the topic-level gate opened because the corrected stock claims already satisfied it, not because of any A-3-specific code), Track C provenance (originating-goal category preserved on the discovered result), Bounded Interpretation (the existing `relevant_applicability_unresolved`/Case 3B hedge fired unmodified), and Projection (`candidate_statement` rendered verbatim, opaque pass-through). Zero Music-specific code exists anywhere in Retrieval, discovered relevance, Bounded Interpretation, or Projection — confirmed by `git diff --stat` scope audits at every integration step of this workstream.

**Governance portability and runtime portability are deliberately not collapsed into one claim.** The 9 non-A-3 Music claims proved governance portability but have never been runtime-verified in production; only A-3 has both.

### 9.3 Cross-domain bleed lesson + preflight tool

Registering a new provider can alter the reachability of **existing, unrelated** governed knowledge — confirmed the hard way: Artlist's own onboarding surfaced that two pre-existing stock-media claims (`CLAIM-STOCK-EDITORIAL-001/002-v1`, `provider_scope: null`) would have become newly, unintentionally reachable once Artlist was recognized, discovered by a diagnostic before registration and corrected via the existing `superseded_by` mechanism (v1→v2), not new architecture (`FGR_007`).

A generic, deterministic **provider-registration bleed preflight** is now available: `08_Platform/app/lib/crc-engine/cross-domain-bleed-preflight.ts` (commit `56e028f`). It checks, for a candidate provider ID + aliases, **before registration**: null-provider-scope claim exposure (mirroring Retrieval's own candidate filter); explicit provider-scope match/non-match effects; discovered-topic exposure (probed via the real, unmodified `deriveDiscoveredTopicOccurrences`, since Track A's topic-level gate is independent of provider_scope — the exact mechanism the original bleed depended on); provider/alias canonicalization collisions (via the real, unmodified `normalizeCandidate`); and a narrow, best-effort scan for the exact hardcoded-full-provider-list-duplication defect class already found once (`VALID_PROVIDER_IDS`). It reuses `providerScopeMatches`/`deriveDiscoveredTopicOccurrences`/`normalizeCandidate` directly — never reimplements their semantics — and lives in `lib/crc-engine/` specifically because `lib/retrieval-engine/`'s own subsystem boundary (`__tests__/crc-engine/subsystem-boundaries.test.ts`) correctly forbids importing Interview Engine logic; that boundary was not weakened to accommodate this tool.

**What it does NOT do, stated explicitly:** it does not decide whether a reported match is substantively/governance-correct; it does not mutate `provider_scope`, any fixture, or any governed claim; it does not register providers; it does not replace FGR/CPR; it is a **provider-registration / provider-shaped LK preflight, not a universal LK-domain preflight** — its checks are all keyed on `AssetProviderMention`/`provider_scope`/`ASSET_PROVIDER_IDS`, concepts specific to asset-provider-shaped domains (stock media, music providers). A structurally different future domain not organized around provider identity would need an analogous, not identical, tool.

### 9.4 Synthetic publication canary precedent

A-3's own path established (following the pattern CPR_001/CPR_003 already used for stock claims) that a **synthetic-eligible clone/canary** may be used to obtain deterministic pipeline verification evidence *before* the real governed claim is granted CRC publication, when runtime verification is part of what a CPR decision needs. Bounded precedent, not new policy: such a canary must never mutate the authoritative governed claim's real `CRC Eligible` state; must never silently enter any committed/production fixture (confirmed at every step via `git status --porcelain` returning empty after each canary's own scratch files were deleted); must preserve the real governed proposition/candidate statement/applicability/dependencies/provider scope exactly (no paraphrase, no strengthening); must remain visibly synthetic (every scratch artifact and commit message in this workstream labels it as such); produces verification evidence only; and never substitutes for the separate, explicit, human CRC-publication decision (which for A-3 arrived only in a later, distinct task carrying its own explicit PM instruction). This is a documented methodological precedent, not automation — no canary-construction tooling has been built.

### 9.5 Refresh — status and an explicitly unresolved policy question

Refresh is part of the intended Living Knowledge lifecycle (`PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §14-16, directional). Existing fields already sufficient to support a future refresh pass without any schema change: `last_verified`, evidence provenance/checksum (`EVIDENCE-CAPTURE-SOP.md` §12), `Lifecycle`, `superseded_by`, and free-text evidence-limitation prose. `EVIDENCE-CAPTURE-SOP.md` §7 already distinguishes SOURCE CHANGED from GOVERNED PROPOSITION CHANGED for a refresh pass re-applying the same evidence-capture discipline (§1-§6 of that SOP, including the human-capture fallback, unchanged and domain-generic).

**Explicitly unresolved, requiring a real PM/governance decision before any refresh scheduling or automation is implemented:** what CRC should do when governed knowledge passes its expected refresh point but successful re-verification has not yet occurred. Candidate treatments were discussed diagnostically (visible staleness metadata while still usable; CRC eligibility temporarily withheld; Reviewer-only fallback; fail closed from CRC entirely) — **none has been approved as policy.** This is recorded here as an open question, not resolved.

### 9.6 Automation/tooling status

The one accepted, implemented, integrated automation result from this workstream is the cross-domain bleed preflight (§9.3). Everything else discussed remains a **proposal**, not a commitment: evidence-manifest/checksum helper scripting, synthetic-canary construction scaffolding, deterministic Retrieval/Track-A/BI/Projection regression-test generation, an onboarding runbook (documentation, not a state machine or orchestrator — no onboarding engine exists or is authorized), refresh reacquisition/diffing tooling, and refresh scheduling. None of these has an implementation commitment attached.

### 9.7 Deferred backlog — unaffected by this milestone, restated for clarity

Unchanged by A-3's success: the other 9 Music Scenario A claims' own CRC-publication status (§9 above); Music Scenario B (not begun, not selected); the two production-UAT questioning/Composition observations from A-3's own real conversation (a candidate-generation wording overlap between a generic `asset_provider_license` follow-up and provider-general knowledge the model was never given visibility into — architecturally confirmed NOT a governed-knowledge leak; and a Consultative-Composition repetition pattern across multiple goals resolving to the same claim, already named and scoped as a deferred future capability in `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §27, predating Music by ten days — confirmed not Music-specific) — neither investigated nor fixed here. Every item in §8 above remains exactly as stated, untouched by this milestone.

### 9.8 Next portability experiment — recommended, not begun

Stock media and Music are both organized substantially around asset providers and `provider_scope` — strong evidence for *provider-shaped* LK portability specifically, not yet evidence that the generic architecture carries over when `AssetProviderMention`/`provider_scope` are **not** the principal organizing concept of the domain. **Recommended next portability experiment:** a structurally different target domain, tested the same way (diagnostic first, per §9.9's success standard and §9.10's own original questions, still valid), rather than treating a second asset provider (Envato, Epidemic Sound) as proof of anything beyond provider-shaped portability, which is already well-evidenced. **No domain has been selected. No research has begun.** This is a recommendation for a future PM decision, not a commitment made here.

### 9.9 Portability success standard / architecture warning signs (preserved, still the applicable criteria)

Retained from the original diagnostic charter, domain-agnostic, not superseded by the Music/A-3 result — the next portability experiment (§9.8) should be judged against these same two definitions, not new ones:

**Good portability** — a new domain should primarily require: governed LK entries, applicability requirements, evidence boundaries, and possibly generic registry/config additions — while Retrieval, BI, Track A/B/C, the selector/readiness machinery, questioning caps, and Projection/Composition all continue working **without domain-specific branching**. Music/A-3 met this standard (§9.1, §9.2).

**Architecture warning signs** — if a new domain instead requires: provider-specific `run-turn.ts` orchestration, domain-specific Retrieval logic, domain-specific BI logic, domain-specific completion rules, domain-specific composers, a duplicated selector system, fabricated `UserGoal`s, or weaker evidence boundaries — **stop** and determine whether the generic architecture is missing an abstraction, rather than patching the new domain in locally. None of these were triggered by Music/A-3 (§9.2, §9.3's own "not new architecture" resolution of the one real defect found).

### 9.10 Original diagnostic questions (preserved) — status against this experiment

The diagnostic this section originally called for asked 10 questions before any implementation. Retained here, with each marked against what Music/A-3 actually answered:

1. What new governed proposition types/facts are required? — **None; existing `TopicClaim` schema, unmodified.**
2. Can the existing LK schema express them? — **Yes, confirmed by 10 real claims drafted with zero schema changes.**
3. What new extraction facts, if any, are genuinely required? — **None; `AssetProviderMention` already existed from the stock-media milestone.**
4. Can existing Retrieval discover them? — **Yes, for A-3 specifically, confirmed by real pipeline execution in production.**
5. Can existing applicability-readiness machinery determine what is missing? — **Yes; A-3's evidence-only dependency correctly stayed non-askable throughout, unmodified.**
6. Can existing selector/readiness mechanisms ask permissible questions? — **Yes; the generic `asset_provider_license` follow-up (pre-existing, used for iStock/Getty/Shutterstock) fired for Artlist unmodified.**
7. Which facts must remain evidence-only? — **`artlist_subscription_active_at_publication_confirmed`, by the same fail-closed default every other evidence-only dependency uses — no registry entry required or added.**
8. Can BI bound conclusions without domain-specific branches? — **Yes, confirmed live in production (§9.2); zero Music-specific BI code exists.**
9. Can Composition present them generically? — **Yes, mechanically (opaque pass-through confirmed); the repetition pattern observed is a pre-existing, already-named generic characteristic (§9.7), not a Music-specific gap.**
10. What code changes would actually be necessary? — **A provider-registry append + aliases (one commit, `76ad4be`) and one fixture entry (one commit, `054c625`). Nothing else in Retrieval/BI/Projection/Composition/questioning.**

Not answered by this experiment, carried forward as the actual open question for the next one (§9.8): whether these same answers hold for a domain that is **not** provider-shaped.

---

## Document index — where the rest of the detail lives

- **Product spec (frozen):** `08_Platform/prds/PRD_CRC_v1.0.md`
- **Pre-prototype empirical risk list:** `08_Platform/implementation/CRC_IMPLEMENTATION_RISKS.md`
- **Layer architecture (normative internal design, not reopened by this file):** `INTERVIEW_ENGINE_ARCHITECTURE.md`, `RETRIEVAL_ENGINE_ARCHITECTURE.md`, `LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md`, `LK_PHASE1_TECHNICAL_DESIGN.md` / `_v2.md`, `PROJECTION_LAYER_ARCHITECTURE.md`, `THIRD_PARTY_SOURCE_ASSETS_ROUTING_ARCHITECTURE.md`, `THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md`
- **Historical, point-in-time execution plans/retrospectives (preserved as-is, not rolling status):** `CRC_PROTOTYPE_ALPHA_ROADMAP.md`, `PROTOTYPE_ALPHA_RETROSPECTIVE.md`, `PROTOTYPE_BETA_RETROSPECTIVE.md`, `PHASE_6A_RETROSPECTIVE.md`, `PHASE_7_PLANNING.md`
- **Dated diagnostic/eval reports (historical, never rewritten):** `implementation/eval-reports/`
- **Living Knowledge governance ledger, evidence process, publication policy, directional architecture (§9's own sources):** `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md`, `EVIDENCE-CAPTURE-SOP.md`, `CRC-PUBLICATION-POLICY.md`, `governance-reviews/README.md` (FGR/CPR/DAR index; carries the CPR_007 → A-3 subsequent-decision addendum), `08_Platform/prds/PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` (directional/future, not authorized by this file)
- **Cross-domain bleed preflight tool:** `08_Platform/app/lib/crc-engine/cross-domain-bleed-preflight.ts`
