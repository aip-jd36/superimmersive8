# Third-Party Source Rights — Path A + Provider Narrowing

## Engineering Architecture / Specification

**Status: PROPOSED / PM REVIEW REQUIRED.** Architecture and engineering design only. No `GoalCategory` value, `AssetProviderMention` type, `ApplicabilityFact`, `TopicRelationship`, runtime fixture entry, or CRC-eligibility state was created or changed while producing this document. Nothing here is authorized for implementation merely by appearing in this file.

**Related:** `THIRD_PARTY_SOURCE_ASSETS_ROUTING_ARCHITECTURE.md` (Phase 0.5 — the PM-approved-but-unimplemented direction this document specifies in engineering detail; not edited here, referenced one-directionally). `01_Business/research/LIVING-KNOWLEDGE-THIRD-PARTY-STOCK-MEDIA-DOMAIN-DISCOVERY-2026.md` (Phase 0). `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Phase 1A/1B). `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md` (the five adopted claims this design routes). `06_Operations/institutional-knowledge/notebook/governance-reviews/FGR_001` through `FGR_005` (the governance record each claim's provider-scope/dependency metadata below is drawn from). `PRD_LIVING_KNOWLEDGE_SOURCE_INPUTS_v0.1.md` §27 (Project-Fact-Aware Bounded Composition — see §15 below for why this design is distinct from it, not an instance of it).

---

## 1. Executive summary

Five claims are Adopted, Reviewer-only, and structurally unreachable by CRC because (a) `third_party_source_rights` doesn't exist as a `GoalCategory`, and (b) three of the five are provider-specific and have no mechanism to avoid surfacing to the wrong provider's users. This document specifies both gaps precisely enough to implement, and reaches three findings that materially change the shape of the work from what the task brief anticipated:

1. **Provider narrowing does not need a new `ApplicabilityFact`.** A dedicated, governed `provider_scope` field on `TopicClaim`, joined against confirmed `AssetProviderMention`s in a new Retrieval step, achieves "provider mismatch = NOT A CANDIDATE" more precisely than reusing the applicability mechanism — and does so without reopening the "unknown vs. false" diagnostic-leak finding that blocked the ApplicabilityFact approach under the old, broad `commercial_use` category. (§7)
2. **The Editorial-designation boundary is already solved.** All five claims already carry `editorial_designation_confirmed` in `unresolved_project_dependencies`. The existing Case 3B mechanism in `build-bounded-interpretation.ts` already renders exactly the right hedge ("here's the rule, we can't confirm it applies to your asset") the moment these claims become CRC-eligible. No new fact, gate, or mechanism is required. (§13)
3. **No database migration is required.** `structured_understanding` is a single JSONB column, round-tripped through one JSON-serialization funnel that already has two precedents (`user_goals`, `project_facts.jurisdiction`) for adding a new field with a one-line backward-compatible default. A third follows the identical pattern. (§16)

Two generic claims (`-001`, `-002`) need only Milestone 1 (GoalCategory) to become runtime-representable. Three provider-specific claims additionally need Milestone 2+3 (AssetProviderMention + provider-scoped retrieval). None of this is implemented here — see §24 for the recommended slicing.

## 2. Current architecture trace

Traced against the real implementation, not type declarations alone, per instruction.

| # | Subsystem | File(s) | Finding |
|---|---|---|---|
| 1 | `GoalCategory` / `GOAL_CATEGORIES` | `types/interview-engine.ts:238` | `['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'unknown']` — a closed union, not an open string type. |
| 2 | `StructuredUnderstanding` | `types/interview-engine.ts:333` | `{project_facts, tool_mentions, scoped_observations, user_goals, current_phase, gate_1_state, gate_2_state, completion_reason, opt_out_scope}` — plain JSON-safe data, no classes/Dates/Maps. |
| 3 | `ToolMention` | `types/interview-engine.ts:124` | `{mention_id, resolution: {kind:'canonical', identifier} \| {kind:'unresolved_alias', raw_name}, access_surface, plan_tier, confidence, source_turn, source_statement, superseded_by}` — the exact shape `AssetProviderMention` was already approved to reuse as a pattern. |
| 4 | Extraction candidate generation | `lib/interview-engine/extraction.ts` (`CandidateObservation`, `CandidateExtractor`) | LLM-proposed candidates only; deterministic code (normalize → attest → mutate) decides everything downstream. `user_goal` candidates require `goal_confidence_hint` to be set — never inferred, only ever proposed when the extractor observed an explicit statement. |
| 5 | Normalization | `extraction.ts` `normalizeCandidate()`, `KNOWN_TOOLS`/`KNOWN_AMBIGUOUS_TOOLS` | A flat, hardcoded `Record<string, string>` alias registry, lowercase-trimmed lookup, `not_applicable \| resolved \| known_ambiguous \| unrecognized`. Zero fuzzy matching. |
| 6 | Attestation | `extraction.ts` `attestCandidate()` | Turns a normalized candidate into a fully-formed `ProposedFact`, or returns `null` (deferred, never applied) for low-confidence/unclassifiable candidates. |
| 7 | Mutation | `lib/interview-engine/mutations.ts` (`addToolMention`, `addUserGoal`, `supersedeUserGoal`, `setJurisdiction`, etc.) | Each field/list has its own `add`/`supersede` pair; `runExtractionPipeline` (`extraction.ts`) is the only caller. |
| 8 | Handoff | `lib/interview-engine/handoff.ts` `buildRetrievalHandoff()` | Pure projection: `tool_mentions` → `{tools: RetrievalHandoffTool[], unresolved_aliases: string[]}`. `RetrievalHandoff` is the one typed, cross-subsystem contract Retrieval and Projection both read — confirmed by `subsystem-boundaries.test.ts` (§2.18 below). |
| 9 | `lookupTopicClaims()` | `lib/retrieval-engine/lookup-topic-claims.ts` | Keyed purely on `UserGoal.category === TopicClaim.topic`. Applicability (`isApplicable`) is a **second-stage, within-topic** filter; an unconfirmed fact and a confirmed-wrong fact both simply fail (`evaluateRequirement`'s own comment: "never guessed"). Diagnostics (`no_topic_claim` / `not_adopted_or_eligible` / `applicability_unmet`) are emitted **once per goal category**, not per claim. |
| 10 | `retrieve()` | `lib/retrieval-engine/retrieve.ts` | Orchestrates Tool Retrieval + Topic Retrieval + Related-Topic Retrieval into one `RetrievalResult[]`. Six params today (`handoff, matrix, goals, topicClaims, applicabilityFacts, relationships`), each added additively over time with a default that preserves every prior call site's behavior unchanged. |
| 11 | `TopicClaim` | `lib/retrieval-engine/types.ts:190` | `{claim_id, topic, claim_character, jurisdiction, lifecycle, crc_eligible, crc_publication_scope, crc_candidate_statement, applicability_requirements, unresolved_project_dependencies, last_verified, superseded_by}` — no provider-scope field exists today. |
| 12 | Applicability evaluation | `lookup-topic-claims.ts` `evaluateRequirement()`/`isApplicable()` | `APPLICABILITY_FACTS = ['jurisdiction', 'tool_plan_tier']` only. Empty `applicability_requirements` is vacuously applicable. |
| 13 | `unresolved_project_dependencies` | `lib/retrieval-engine/types.ts:190`, read by `build-bounded-interpretation.ts` | Informational only — never gates inclusion in `matches[]`; read *after* a claim already passed every formal gate, to decide `directly_relevant` vs. `relevant_applicability_unresolved` (Case 3B) at the Bounded Interpretation stage. |
| 14 | `build-bounded-interpretation.ts` | `lib/bounded-interpretation/build-bounded-interpretation.ts` | Matches `RetrievalResult.matched_goal_category === goal.category`. Case 3A (`applicability_unmet` diagnostic → content-free nudge) and Case 3B (non-empty `unresolved_project_dependencies` on a matched claim → content-*including* hedge) are structurally distinct code paths. |
| 15 | Projection | `lib/projection-layer/understood-summary.ts`, `assemble-projection-output.ts` | `understood-summary.ts` renders `unresolvedMentionsClause()` for `handoff.unresolved_aliases` — the exact source of the literal "wasn't able to match to a specific platform yet" sentence. `assembleProjectionOutput(handoff, results, interpretations)` — three params, no direct Interview Engine logic import (confirmed by boundary test). |
| 16 | Results/email recomputation path | `lib/crc-engine/run-crc-conversation.ts`, `run-turn.ts`, `results-email-delivery.ts` | `runCRCConversation()` is the **single orchestrator** that calls all three subsystems (documented in its own header as the *only* module permitted to). Exactly **4 real call sites**: `run-turn.ts` (×3) and `results-email-delivery.ts` (×1, explicitly documented as recomputing "via the same `runCRCConversation()`" the live turn used — not a separate code path). |
| 17 | Persistence/serialization | `lib/interview-engine/serialization.ts`, `lib/crc-engine/supabase-session-store.ts` | `structured_understanding` is stored as **one JSONB column** (confirmed directly: `.select('structured_understanding, ...')`, `JSON.stringify(data.structured_understanding)` round-tripped through `deserializeStructuredUnderstanding`). Two precedents already exist for additive, backward-compatible fields: `user_goals` (defaults to `[]`) and `project_facts.jurisdiction` (defaults to `{state:'unknown'}`), both in `deserializeStructuredUnderstanding()` itself. |
| 18 | Subsystem-boundary tests | `__tests__/crc-engine/subsystem-boundaries.test.ts` | Scans real file trees (not a hand-picked list) under `lib/interview-engine/`, `lib/retrieval-engine/`, `lib/projection-layer/`, `lib/crc-engine/`, `lib/bounded-interpretation/`. Forbids Retrieval/Projection from importing Interview Engine's *logic* modules (types-only imports from `@/types/interview-engine` are the one explicit, deliberate exception). Any new provider-narrowing code must respect this — confirmed as a structural, not aspirational, constraint. |

**Assumptions/switches/maps keyed on `GoalCategory`, found by repo-wide search (14 files matched `GoalCategory`):**

| File | What it is | Requires a new-category entry? |
|---|---|---|
| `lib/bounded-interpretation/rules.ts` | `CATEGORY_LABELS: Record<GoalCategory, string>` (line 49) and `OUTSIDE_COVERAGE_BY_CATEGORY: Record<GoalCategory, string>` (line 71) | **Yes — TypeScript will not compile without a new entry in both.** This is the concrete proof that "Retrieval is generic" does not mean the whole pipeline is; Bounded Interpretation's rendering layer is exhaustively keyed. |
| `lib/crc-engine/scripts/goal-analytics-report.ts` | `categoryCounts: Record<GoalCategory, number>` (line 98), hardcoded literal | Yes, same reason — a reporting script, not production code, but would fail to typecheck. |
| `lib/retrieval-engine/{types.ts, lookup-topic-claims.ts, lookup-topic-relationships.ts, retrieve.ts, matrix-fixture.ts}` | Generic `GoalCategory` usage (comparison, filtering) | No — confirmed genuinely generic; no exhaustive `Record<GoalCategory, ...>` anywhere in Retrieval itself. |
| `lib/retrieval-engine/topic-claims-fixture.ts`, `__tests__/retrieval-engine/topic-claims-fixture-consistency.test.ts` | The five adopted stock claims' own governance-treatment comments and `CLAIMS_WITHOUT_FIXTURE_REPRESENTATION` set | No compile requirement, but these are exactly the artifacts that get *edited* once the category exists (see §17 mapping table). |
| `lib/interview-engine/extraction.ts` | `goal_category_hint?: GoalCategory` on `CandidateObservation` | No compile requirement — already a generic field; a new union member is automatically accepted. |
| `__tests__/retrieval-engine/lookup-topic-relationships.test.ts` | Test fixtures using specific category values | No compile requirement; would need new test cases added deliberately, not automatically. |

## 3. Existing PM decisions (preserved, not reopened)

A–I as stated in the task brief, reproduced here only to anchor the design against them, not to relitigate any of them: `third_party_source_rights` is approved *direction*, not implemented; explicit questions may create the goal, incidental disclosure must not (Path B, deferred); `AssetProviderMention`'s semantic meaning is fixed as quoted; Matrix, `ProjectFacts`, `ApplicabilityFacts` remain unchanged; no `TopicRelationship` is approved; Path B may eventually overlap with PRD §27 but is not solved here (see §15).

## 4. Problem definition

Two independent, compounding gaps:

**Gap 1 (Path A):** No `GoalCategory` value represents "does the user have rights to third-party source material" — so even a perfectly-worded explicit question can never produce a matching `UserGoal`, and `-001`/`-002` (which need nothing else) remain permanently unreachable.

**Gap 2 (provider narrowing):** Even once Gap 1 is closed, three of the five claims are provider-specific. `TopicClaim.topic` alone cannot distinguish "relevant to any `third_party_source_rights` goal" from "relevant only when the user meant Getty specifically" — surfacing all three provider claims to every user regardless of which provider they named would be wrong, and reusing the existing `ApplicabilityFact` mechanism for provider identity was previously rejected (Phase 0.5) because of a diagnostic-leak risk under the old, broad `commercial_use` category.

## 5. Design invariants (carried forward, restated precisely)

1. Path A is explicit-question-gated only; extraction's existing "never infer a goal the user didn't state" discipline is the enforcement mechanism, unchanged.
2. Provider mismatch must produce **NOT A CANDIDATE**, never a soft "relevant, need more info" nudge — confirmed as the single most important behavioral requirement in this design (§7, §11).
3. No claim's application to a specific project may ever be asserted as confirmed — Editorial-designation, provider identity, and every other project-specific fact remain hedged via `unresolved_project_dependencies`, never silently assumed true.
4. `AssetProviderMention` recognition must be able to occur independently of goal creation, and must never itself trigger retrieval (Path B remains deferred by construction, not by policy alone).
5. Reuse existing patterns wherever a genuine precedent exists (`ToolMention`'s resolution shape, the additive-parameter discipline already used on `retrieve()`/`runCRCConversation()` three times, the additive-field-with-default discipline already used twice in `serialization.ts`); introduce a genuinely new mechanism only where no precedent fits (§7).

## 6. Options considered (provider narrowing)

Evaluated against: correctness, false-positive safety, false-negative risk, architectural cleanliness, generalization, governance clarity, source maintenance, provider aliases, multi-provider projects, unresolved provider names, persistence, testability, future domains, implementation size.

**Option A — Extend `TopicClaim` with `provider_scope`, Retrieval performs a provider join after topic matching.** Explicit governed metadata (not claim-ID convention). Correctness: high — a claim's scope is authored once, visible in `GOVERNED-CLAIMS.md` itself. False-positive safety: high — a mismatch is excluded *before* reaching applicability evaluation, never producing a diagnostic at all. Cleanliness: keeps one unified topic-claim lookup path with two orthogonal join keys (topic, provider) rather than two lookup mechanisms a caller must remember to combine. **Recommended — see §7.**

**Option B — General `retrieval_constraints`/`entity_scope` concept.** Appealing for future generalization (§20), but premature: `AssetProviderMention` is *already* the generalized entity (any future music/footage/font provider is the same type with a different canonical identifier) — the field doesn't need its own extra genericity layer on top. Rejected as over-engineering relative to what's actually needed today, consistent with this domain's own repeated discipline against premature generalization (Phase 0's "too narrow vs. too broad" test; Phase 0.5 §14).

**Option C — Provider identity as a new `ApplicabilityFact`.** Pressure-tested rigorously, not dismissed reflexively (§7). Demonstrated safe *in the narrow, already-gated `third_party_source_rights` category specifically* — the diagnostic-leak risk was a property of the old, broad `commercial_use` category, not an inherent property of applicability-as-a-mechanism. However, even where safe, it produces a *softer* signal (a Case 3A "need more info" nudge) than Option A's *harder* exclusion for genuine provider mismatches, and the task's own explicit requirement is the harder exclusion. Rejected in favor of A on precision grounds, not safety grounds — see §7 for the full proof either way.

**Option D — Separate provider-specific lookup stage.** Shares Option A's core idea (provider as a first-class filter) but as a wholly separate function/stage a caller must remember to invoke and merge correctly. Rejected in favor of folding the same logic into the existing `lookupTopicClaims` flow (Option A) — fewer places for a future caller to forget the check.

**Option E — Encode provider in topic/category (e.g. `getty_source_rights`).** Pressure-tested, not rejected without analysis: this would multiply `GoalCategory` by every provider (contradicting the single, narrow `third_party_source_rights` category PM already approved), would require `bounded-interpretation/rules.ts`'s exhaustive `Record<GoalCategory,...>` maps to grow per provider indefinitely, and — decisively — could never represent the *generic* claims (`-001`/`-002`), which are correctly provider-agnostic. Confirmed undesirable, for concrete reasons beyond the task's own presumption.

**Option F — none found beyond A–E that isn't a variant of one of them.**

## 7. Recommended architecture

**Option A**, in this specific form: a new, explicit, governed field on `TopicClaim` — `provider_scope: string[] | null` — plus a new, dedicated pre-filter step inside `lookupTopicClaims()`, evaluated *before* the existing `isApplicable()` call, that excludes a claim from candidacy (silently — no diagnostic reaches Bounded Interpretation) unless at least one of its `provider_scope` values matches a confirmed, canonical `AssetProviderMention`.

### Why this is safer than ApplicabilityFact reuse, proven not assumed

The original Phase 0.5 rejection was specific to the broad `commercial_use` category: most `commercial_use` users have nothing to do with stock media, so any fact-shaped gate risked leaking a nudge to users who never expressed interest in the topic at all. Re-examined rigorously in *this* narrower context (a dedicated `third_party_source_rights` category that, by Path A's own design, only ever contains users who explicitly asked an on-topic question):

- **Traced through `lookupTopicClaims`'s actual per-claim loop** (not the per-category diagnostic alone): even under an ApplicabilityFact scheme, a provider-mismatched claim would correctly be excluded from `matches[]` — the individual `if (!isApplicable(...)) continue` line already works per-claim.
- **But the diagnostic behavior differs.** If the *only* claims under the topic are provider-specific and none matches, `anyApplicable` goes false for the whole category → Case 3A fires → a content-free "relevant, need more info" nudge. If a generic, unscoped claim (`-001`/`-002`) coexists in the same category (as it does today, always), `anyApplicable` is `true` regardless of provider fit, so no nudge fires — meaning ApplicabilityFact reuse would, in the *current concrete data*, likely be silently safe against the original diagnostic-leak concern.
- **This is a genuinely different, weaker risk than the original one** — closer to "jurisdiction," which already safely uses this exact mechanism for a narrow, already-gated category — and the earlier rejection should not be read as permanently foreclosing it in this different context.
- **Option A is still recommended over a rehabilitated Option C**, not because C is unsafe, but because A produces the *precise* behavior the task explicitly requires ("provider mismatch should normally mean NOT A CANDIDATE — not relevant but we need more information") in every case, including a hypothetical future where the generic claims are ever deprecated or superseded and no longer coexist in the topic to act as an accidental safety net. A's exclusion is structural and independent of what else happens to exist in the category at the time; C's safety was demonstrated but is contingent on that coexistence.

## 8. `AssetProviderMention` — final proposed shape

```
interface AssetProviderMention {
  mention_id: string
  resolution:
    | { kind: 'canonical'; identifier: string }
    | { kind: 'unresolved_alias'; raw_name: string }
  confidence: ConfidenceState
  source_turn: number
  source_statement: string
  superseded_by: string | null
}
```

Confirmed sufficient — no additional fields needed. Answers to the validation questions:

1. **Canonical identifier lives on `resolution.identifier`** — exactly where `ToolMention.resolution.identifier` lives, for the same reason (a resolved value has no meaning outside the fact that it resolved).
2. **`resolution` must be a discriminated union**, not a simple enum — reusing `ToolMention`'s exact shape, deliberately as a *duplicated pattern*, not a shared TS type (the two concepts are only coincidentally shape-identical; sharing the literal type would create an unwarranted coupling — consistent with this repo's own established discipline of duplicating small shapes to keep subsystems decoupled).
3. **Canonical form: lowercase-hyphenated, mirroring `KNOWN_TOOLS`'s own convention** (`'runway-gen3'`, `'kling'`) and the four adopted claims' own claim-ID naming: `'getty'`, `'istock'`, `'shutterstock'`, `'adobe-stock'`. Not `'Getty Images'` (display casing belongs to Projection, never to the canonical identifier).

## 9. Provider canonicalization / alias model

```
const KNOWN_ASSET_PROVIDERS: Record<string, string> = {
  'getty': 'getty', 'getty images': 'getty', 'gettyimages': 'getty',
  'istock': 'istock', 'istockphoto': 'istock', 'istock by getty images': 'istock',
  'shutterstock': 'shutterstock',
  'adobe stock': 'adobe-stock', 'adobestock': 'adobe-stock',
}
```

Simpler than the tool registry: **no ambiguous-alias sub-registry is needed**, because none of these provider names are textually confusable with each other the way "Nano Banana" is confusable across two Gemini access surfaces. A flat lookup, case-insensitive/trimmed, mirrors `normalizeCandidate()` exactly.

**Getty vs. iStock: confirmed distinct canonical providers, proven from the governed-claim model itself, not merely presumed.** `CLAIM-STOCK-GETTY-EDITORIAL-001-v1` and `CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1` are separately adopted with materially different content — Getty has a real, evidenced Rights and Clearance mechanism and a 7-item list including "marketing"; iStock has no evidenced mechanism at all and a 7-item list including "merchandising" instead, not "marketing." Collapsing them into one canonical identifier would make it *architecturally impossible* to route to the correct claim — direct, concrete proof, not an assumption.

**"Getty or iStock, I don't remember which":** should not resolve to either canonical identifier. Recommend the extractor flag this `low_confidence: true`, causing `attestCandidate` to defer the candidate entirely (its existing, already-proven behavior) — neither provider's `provider_scope` matches, the generic claims still surface correctly, and no incorrect canonical assignment is ever made.

**"Three from Getty, two from Shutterstock":** produces exactly **two** `AssetProviderMention` records (Getty, Shutterstock), never five. Per-asset counts are explicitly out of scope (task instruction, and consistent with Phase 0's own "CRC stops at provider recognition" conclusion) — not designed here.

**Provider recognized, no `third_party_source_rights` goal ever asked (Path B):** the mention is captured and persisted; nothing else happens. No goal is created, no retrieval occurs, no claim surfaces. This is the explicit, load-bearing preservation of Path B's deferral — restated here because it is the single most important non-goal this entire design must not violate.

## 10. Explicit-goal extraction design

New `CandidateObservation.kind: 'asset_provider_mention'`, structurally parallel to `'tool_mention'` (`raw_provider_name?: string`, `supersedes_asset_provider_mention_id?: string`). New `normalizeAssetProviderCandidate()` using `KNOWN_ASSET_PROVIDERS` — returns `not_applicable | resolved | unrecognized` (no `known_ambiguous` case needed, per §9). New `attestCandidate()` branch mirroring the `tool_mention` branch exactly. New `mutations.ts` functions `addAssetProviderMention`/`supersedeAssetProviderMention`, writing to a new `StructuredUnderstanding.asset_provider_mentions: AssetProviderMention[]` field.

**Interaction with existing explicit-question discipline:** none required beyond what already exists. `user_goal` candidates already require `goal_confidence_hint` to be set only when the extractor observed an explicit statement — this is the *existing* enforcement of the Path A/Path B boundary, not a new mechanism. The only genuinely new work is extractor-prompt engineering: teaching the extractor to recognize explicit third-party-source-rights questions and propose `goal_category_hint: 'third_party_source_rights'` — a prompt-engineering task, not an architecture change.

**Provider extraction on the same turn as a goal, and independently of one:** `asset_provider_mention` candidates should be proposed on **any** turn mentioning a provider name, regardless of whether that turn also contains an explicit question. This is what correctly fixes the original production bug (Getty captured while the user's actual goal was `commercial_use`) *and* correctly serves Path A's own worked example (a single turn containing both the provider name and the explicit question). Provider recognition producing a `CandidateObservation` is not itself "triggering retrieval" — retrieval is triggered only by a `UserGoal`, an entirely separate candidate kind with its own separate confidence gate (§5, invariant 4).

## 11. Retrieval / provider-narrowing algorithm

Derived from the real `lookupTopicClaims()` implementation, not assumed:

```
lookupTopicClaims(goals, topicClaims, applicabilityFacts, assetProviderIdentifiers):
  for each active, confirmed goal:
    category = goal.category
    candidates = topicClaims.filter(c => c.topic === category && c.superseded_by === null)
    if candidates.length === 0: diagnostic('no_topic_claim'); continue

    anyEligible = false; anyApplicable = false
    for each claim in candidates:
      if not (claim.lifecycle === 'Adopted' && claim.crc_eligible === 'Yes'): continue
      anyEligible = true

      # NEW STEP — provider pre-filter, before the existing applicability call
      if claim.provider_scope is non-null and non-empty:
        if not claim.provider_scope.some(p => assetProviderIdentifiers.includes(p)):
          diagnostic('provider_scope_unmet')   # internal/telemetry only -- see below
          continue   # NOT A CANDIDATE -- no effect on anyApplicable

      if not isApplicable(claim.applicability_requirements, applicabilityFacts): continue
      anyApplicable = true
      matches.push(claim)   # unresolved_project_dependencies travels through unchanged

    if not anyEligible: diagnostic('not_adopted_or_eligible')
    else if not anyApplicable: diagnostic('applicability_unmet')
```

**`assetProviderIdentifiers: string[]`** — canonical identifiers only, pre-extracted by the caller from confirmed (`resolution.kind === 'canonical'`) `AssetProviderMention`s, mirroring exactly how `applicabilityFacts.toolMentions` is already pre-extracted and passed as a side-channel parameter in `run-crc-conversation.ts` today (not a new pattern).

**New diagnostic reason: `provider_scope_unmet`**, added to `NON_MATCH_REASONS`, following that enum's own existing philosophy exactly (`unresolved_alias`, `no_matrix_row` are already "diagnostic only, never surfaced to a user"). **Never read by `build-bounded-interpretation.ts`** — unlike `applicability_unmet` (which Case 3A explicitly checks for), `provider_scope_unmet` has no corresponding Bounded Interpretation branch, by design. This is what makes "provider mismatch = NOT A CANDIDATE, never a soft nudge" a structural guarantee rather than a hoped-for behavior.

**Does Retrieval require modification?** Yes — `lookupTopicClaims()` gains the pre-filter step and a new parameter; `retrieve()` gains a new, additive, defaulted 7th parameter (`assetProviderIdentifiers: string[] = []`), mirroring the exact discipline already used three times for `topicClaims`/`applicabilityFacts`/`relationships`. `lookupRelatedTopicClaims()` is untouched (no `TopicRelationship` is approved for this domain — §3.H — so this path is not currently exercised; if a relationship is ever approved later, the identical provider pre-filter should apply there too, noted for whoever revisits that decision, not designed further here).

**Does Bounded Interpretation require modification?** No new logic. It already correctly reads `unresolved_project_dependencies` for Case 3B (§13) and does not need to know anything about `provider_scope` — a provider-mismatched claim never reaches it at all.

**Does Projection require modification?** Yes, but narrowly — `understood-summary.ts` needs one new rendering branch for recognized `AssetProviderMention`s (§14), independent of the retrieval changes above.

## 12. Generic vs. provider-specific claim representation

**Explicit governed metadata, never claim-ID convention**, per instruction. `TopicClaim.provider_scope: string[] | null`.

| Value | Meaning | Example |
|---|---|---|
| `null` (or field absent) | Generic — not provider-gated at all; always passes the provider pre-filter | `CLAIM-STOCK-EDITORIAL-001-v1`, `CLAIM-STOCK-EDITORIAL-002-v1` |
| Non-empty array | Provider-specific — requires at least one listed canonical identifier among confirmed `AssetProviderMention`s | `CLAIM-STOCK-GETTY-EDITORIAL-001-v1` → `['getty']` |
| Empty array `[]` | **Not a meaningful state — must be rejected at claim-authoring time**, not given runtime behavior (would mean "provider-specific but scoped to nothing," an authoring error, not a real case) | — |

**Unresolved providers** (an `unresolved_alias`-resolved mention, or no mention at all) never satisfy any `provider_scope` — confirmed structurally, since only `resolution.kind === 'canonical'` identifiers are extracted into `assetProviderIdentifiers` in the first place (mirrors exactly how `extract-matchable-facts.ts` already excludes unresolved tool aliases from `matchable.tools` — "unresolved_aliases never enter this set").

## 13. Editorial-designation boundary — already solved, not a new blocker

**This is the most important finding in this document.** All five adopted claims already carry `editorial_designation_confirmed` in `unresolved_project_dependencies` (recorded at adoption time, independent of this design). The existing Case 3B mechanism in `build-bounded-interpretation.ts` (`if (matches.some(m => m.unresolved_project_dependencies.length > 0)) return buildInterpretation(..., 'relevant_applicability_unresolved', relevantApplicabilityUnresolvedWithContentSummary(...))`) already renders exactly the correct epistemic posture the moment any of these claims becomes CRC-eligible: the claim's own governed text is quoted, *and* the closing sentence makes clear this doesn't determine the answer for the user's specific project — never a flat "your asset is Editorial" assertion.

**No new fact, gate, `ApplicabilityFact`, or asset-classification structure is required.** The task brief's own framing ("this question is potentially load-bearing for whether Path A can really be implemented with only `GoalCategory` + `AssetProviderMention`... if the architecture previously understated this requirement, say so clearly") is answered directly: **the architecture did not understate it.** It is already fully modeled by a mechanism that predates this design entirely (Case 3B, built during the copyright milestone) and requires zero new engineering to correctly cover the Editorial-designation case. This is confirmed, not assumed — traced against the real code in §2, item 13/14.

## 14. Multi-provider stress tests

Per the task's own scenarios A–I, using the recommended architecture:

| Scenario | Provider identifiers confirmed | Generic claims (`-001`/`-002`) | Getty claim | iStock claim | Shutterstock claim |
|---|---|---|---|---|---|
| A. Goal + Getty | `['getty']` | Candidates | Candidate | Excluded (`provider_scope_unmet`) | Excluded |
| B. Goal + iStock | `['istock']` | Candidates | Excluded | Candidate | Excluded |
| C. Goal + Getty + Shutterstock | `['getty', 'shutterstock']` | Candidates | Candidate | Excluded | Candidate |
| D. Goal + unresolved "PhotoMega" | `[]` (unresolved alias never enters the identifier list) | Candidates | Excluded | Excluded | Excluded |
| E. Goal, no provider mentioned | `[]` | Candidates | Excluded | Excluded | Excluded |
| F. Provider = Getty, no goal | N/A — `lookupTopicClaims` never runs (no active goal in this category) | — | — | — | — |
| G. Goal = `commercial_use`, provider = Getty, no `third_party_source_rights` goal | N/A — `commercial_use` is a different topic; none of these five claims are tagged under it | — | — | — | — |
| H. Goal + Getty, Editorial classification unknown | `['getty']` | Candidates, rendered via Case 3B (hedged) | Candidate, rendered via Case 3B (hedged) | Excluded | Excluded |
| I. "Getty Editorial and Shutterstock Editorial" | `['getty', 'shutterstock']` | Candidates | Candidate | Excluded | Candidate |

Scenario I is deliberately identical in outcome to C — the word "Editorial" in the user's own statement does not change retrieval at all (§13); it would, if anything, be the kind of user-supplied context a *future* reviewer or an eventually-approved `editorial_designation_confirmed` capture might use, not something this design routes on. No asset-level inventory is modeled anywhere in this table, per instruction.

## 15. Path B non-goals, and relationship to PRD §27

**Path B remains fully deferred** by this design, not merely by policy. An `AssetProviderMention` recognized without an accompanying `third_party_source_rights` goal produces zero retrieval effect — confirmed structurally in §9/§11, not merely stated as an intention.

**This design is not an instance of PRD §27's "Project-Fact-Aware Bounded Composition," and should not be treated as a partial implementation of it.** §27 describes a *downstream*, *composition-time* problem: given several already-retrieved, already-eligible governed principles, how should they be selected/presented differently based on what the user described. The provider-narrowing mechanism specified here operates *upstream*, at retrieval-matching time, using an explicit, governed field (`provider_scope`) and an explicit, extraction-captured fact (`AssetProviderMention`) — it decides *whether a claim becomes a candidate at all*, not how to compose several already-candidate claims. §27 remains reserved for the genuinely harder, still-unscoped problem: using an *incidental* disclosure (no accompanying goal) to affect what's shown for an *already-existing, differently-categorized* goal — Path B, untouched here.

## 16. Persistence / backward compatibility

**No database migration required — confirmed, not merely likely.** `structured_understanding` is stored as a single JSONB column (verified directly in `supabase-session-store.ts`: one `.select('structured_understanding, ...')`, round-tripped whole through `JSON.stringify`/`deserializeStructuredUnderstanding`). Adding `asset_provider_mentions: AssetProviderMention[]` to `StructuredUnderstanding` requires exactly:

1. The new field on the TS type.
2. One line in `deserializeStructuredUnderstanding()`: `const asset_provider_mentions = parsed.asset_provider_mentions ?? []` — the identical pattern already used twice (`user_goals`, `project_facts.jurisdiction`), both in this same function, both for the same reason (a session persisted before the field existed must not crash on read).

**Historical sessions:** round-trip correctly with an empty `asset_provider_mentions: []`, indistinguishable from a session where no provider was ever mentioned — the same "historical and genuinely-absent are indistinguishable, and that's correct" reasoning `serialization.ts`'s own comments already state for the two existing precedents.

**`RetrievalHandoff` gains two new fields**, mirroring `tools`/`unresolved_aliases` exactly: `asset_providers: string[]` (canonical identifiers) and `unresolved_asset_provider_mentions: string[]` (raw names) — built in `handoff.ts`'s `buildRetrievalHandoff()` by a new block structurally identical to the existing tool-mention block.

**Privacy:** confirmed within bounds. `AssetProviderMention` carries only a resolved identifier or raw alias text and the same `source_statement`/`source_turn` provenance every other mention type already persists — no asset ID, license number, account identifier, or per-asset inventory of any kind, consistent with the semantic definition PM already fixed (§3.D) and with Phase 0.5's own explicit "CRC stops at provider recognition" boundary.

## 17. Governance / runtime representation mapping

| Claim ID | Topic (proposed, once implemented) | Generic / provider-specific | `provider_scope` (proposed) | CRC eligibility today | Runtime-representable after Path A alone? | Additional blocker |
|---|---|---|---|---|---|---|
| `CLAIM-STOCK-EDITORIAL-001-v1` | `third_party_source_rights` | Generic | `null` | Pending | **Yes** | None — Editorial-uncertainty already handled via existing `unresolved_project_dependencies`/Case 3B (§13) |
| `CLAIM-STOCK-EDITORIAL-002-v1` | `third_party_source_rights` | Generic | `null` | Pending | **Yes** | Same as `-001` |
| `CLAIM-STOCK-GETTY-EDITORIAL-001-v1` | `third_party_source_rights` | Provider-specific | `['getty']` | Pending | No — needs Path A **and** provider narrowing | Same Editorial handling as above (not an additional blocker); provider narrowing is the real gap |
| `CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1` | `third_party_source_rights` | Provider-specific | `['shutterstock']` | Pending | No — same as Getty | Same, **plus** its own disclosed mixed-evidence-tier (Official Secondary for Rights and Clearance) is a separate, CRC-*publication*-layer consideration for whoever makes that eligibility decision — not a routing blocker this design addresses or needs to |
| `CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1` | `third_party_source_rights` | Provider-specific | `['istock']` | Pending | No — same as Getty | Same |

No CRC-publication decision is made or implied by this table — it exists solely to show which routing/architecture blockers are closed by which milestone, distinct from the separate governance decision each claim's own `crc_eligible` field still requires.

## 18. Generalization test

Pressure-tested against licensed music, stock footage, font marketplaces, template marketplaces, 3D-asset marketplaces — architecture only, no legal research performed, per instruction.

`AssetProviderMention` + `third_party_source_rights` + provider-scoped `TopicClaim` generalizes cleanly: a licensed-music provider or a font foundry is exactly the same *kind* of thing as Getty in this model — an external source of material, recognized by name, with its own canonical identifier and its own `provider_scope`-tagged claims. Nothing in this design assumes "stock photo/video" specifically. The one thing that would **not** generalize automatically is the *content* of the five adopted claims themselves (Editorial-vs-Commercial classification is a stock-media-specific concept) — but that is exactly what already lives in `Claim proposition` text, never in this routing mechanism, so no architecture change would be needed to onboard a new provider family, only new governed claims with their own `provider_scope`.

## 19. Implementation slicing

| Milestone | Scope | Dependency kind | Size | Likely files |
|---|---|---|---|---|
| **M1 — `GoalCategory` + extraction** | Add `third_party_source_rights`; extractor-prompt work to recognize explicit questions; fill the two exhaustive `Record<GoalCategory,...>` maps | Architecture: none (independently coherent). Engineering: self-contained. Governance: none required to *ship* M1 itself | **Small–Medium** | `types/interview-engine.ts`, `lib/interview-engine/anthropic-extractor.ts` (prompt), `lib/bounded-interpretation/rules.ts` (two new map entries — required, not optional), `lib/crc-engine/scripts/goal-analytics-report.ts`, associated tests |
| **M2 — `AssetProviderMention` + alias resolution** | New type/field, extraction pipeline branch, persistence default, handoff fields, Projection's recognized-provider rendering | Architecture: none (independently coherent — Phase 0.5 already concluded this "doesn't unlock retrieval by itself... but sets up the data"). Engineering: self-contained | **Medium** | `types/interview-engine.ts`, `lib/interview-engine/extraction.ts` (+`KNOWN_ASSET_PROVIDERS`), `mutations.ts`, `serialization.ts`, `handoff.ts`, `lib/projection-layer/understood-summary.ts`, `lib/interview-engine/fixtures.ts`, associated tests |
| **M3 — Provider-scoped `TopicClaim` retrieval** | `provider_scope` field, new `lookupTopicClaims` pre-filter, `provider_scope_unmet` diagnostic, `retrieve()`/`runCRCConversation()` new parameter threaded through all 4 real call sites | Architecture: **depends on M1 (needs the category to route on) and M2 (needs mention data to join against)**. Cannot ship before both | **Medium** — architecturally the most delicate slice (touches Retrieval's core matching logic, boundary-test-sensitive) | `lib/retrieval-engine/{types.ts, lookup-topic-claims.ts, retrieve.ts}`, `lib/crc-engine/run-crc-conversation.ts`, `run-turn.ts` (×3 call sites), `results-email-delivery.ts`, associated tests |
| **M4 — Runtime fixture representation / CRC-publication review** | Update the five claims' own `Topic`/`provider_scope` governance metadata in `GOVERNED-CLAIMS.md`, add real `topic-claims-fixture.ts` entries, then — as an entirely separate decision — evaluate each claim's `CRC Eligible` field | **Governance dependency, not an engineering one** — requires M1–M3 live, plus a distinct PM decision per claim | N/A (not an engineering size) | `GOVERNED-CLAIMS.md`, `topic-claims-fixture.ts`, `topic-claims-fixture-consistency.test.ts` |

**Must ship atomically:** M1 and M2 are independently shippable, in either order or in parallel — no hard dependency between them, confirmed by tracing their actual file sets above (disjoint except for shared test infrastructure). M3 has a hard dependency on both M1 and M2 being complete; shipping any part of M3 before either would produce dead code (a provider-scope join with no category to route through, or no mention data to join against). M4 is not engineering work at all — a governance follow-on, gated on M1–M3 plus a separate CRC-eligibility decision.

## 20. Test strategy

- **M1:** extraction tests for explicit third-party-source-rights questions (mirroring existing goal-category extraction test patterns); `bounded-interpretation/rules.ts` compile-time exhaustiveness is self-enforcing (TypeScript itself fails without the new map entries — no separate test needed for that specific guarantee, though a rendering test for the new category's `outside_current_coverage` copy is still warranted).
- **M2:** extraction/normalization/attestation tests mirroring the existing `ToolMention` test suite's structure closely (alias resolution, low-confidence deferral, correction/supersession); serialization backward-compatibility test (an old session JSON without `asset_provider_mentions` deserializes to `[]`); a Projection test proving a recognized provider renders distinctly from `unresolved_tool_mentions`.
- **M3:** unit tests on the new `lookupTopicClaims` pre-filter directly (every row of §14's stress-test table as a distinct test case); a `provider_scope_unmet` diagnostic test confirming it is **never** read by `build-bounded-interpretation.ts` (a negative assertion, mirroring the existing test discipline already used for `relationship_id`/`rationale` never leaking to user-facing output); end-to-end tests through `runCRCConversation()` for at least scenarios A, D, E, G from §14, since G (wrong-category isolation) is the one most likely to silently regress if a future change conflates `commercial_use` and `third_party_source_rights` routing.
- **Regression:** the existing `wave1-candidate-claims-excluded.test.ts` and `topic-claims-fixture-consistency.test.ts` patterns should be extended (not replaced) for the five stock claims once M4 begins, following the exact `CLAIMS_WITHOUT_FIXTURE_REPRESENTATION` → real-fixture-entry transition already anticipated in those files' own comments.

## 21. Risks / open questions

1. Exact extractor-prompt wording for recognizing explicit third-party-source-rights questions is unscoped here — a real risk of false negatives (a genuine question phrased unusually not recognized) or false positives (an incidental disclosure misclassified as a question) that only real-conversation testing can surface, mirroring the same class of risk already accepted and iterated on for `copyright_ownership`/`copyrightability` extraction.
2. Whether `provider_scope_unmet` should ever surface in future analytics (distinct from user-facing rendering) is unresolved — PRD §19's own "feedback from product usage" future-direction section would be the natural home for this, not decided here.
3. Shutterstock's disclosed mixed-evidence-tier (§17) is a CRC-publication-layer question, not a routing one — but whoever makes that eligibility decision should be aware this design does not add any additional confidence to that claim's underlying sourcing.
4. Whether `lookupRelatedTopicClaims()` will ever need the same provider pre-filter is genuinely open, contingent entirely on whether a `TopicRelationship` for this domain is ever separately approved (currently NOT approved, §3.H) — noted, not designed.

## 22. PM decisions required before implementation

1. Approve `provider_scope: string[] | null` on `TopicClaim` as the provider-narrowing mechanism (§7), superseding no prior decision — this is new ground, not a reversal of the standing zero-new-`ApplicabilityFact`s policy, since it is explicitly *not* an `ApplicabilityFact`.
2. Approve the `AssetProviderMention` final shape (§8) and canonical identifier set (§9) as implementation-ready.
3. Approve the implementation slicing (§19) and sequence, or specify a different one.
4. Decide whether M1+M2 should be authorized to begin before M3's design is fully locked, given they're independently shippable — an efficiency question, not an architecture one.
5. Separately and later: the M4 governance decisions per claim (§17), explicitly out of scope for this document.

## 23. GO/NO-GO recommendation

**GO for PM review of this design. NO-GO for implementation** until PM decisions in §22 are made — consistent with this task's own explicit scope (design only).

---

**Design conducted:** 2026-08-17. **Status:** Proposed, PM review required. **Next step:** PM decision on §22 before any implementation milestone begins.
