Title: CRC Publication Review #10 — Storyblocks Business License Broadcast/OTT Scope

Reviewed object: CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1

Review date: 2026-08-30

Artifact type: CRC Publication Review / Decision Analysis (publication stage — asks whether the already-Adopted claim may additionally become `CRC Eligible: Yes`; distinct from Formal Governance Review #10, which reviewed this same object for Adoption only — see `FGR_010_CAND-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001_2026-08-30.md`). First CRC Publication Review of the Third-Party Source Assets / Stock Media Licensing domain's Storyblocks provider, and the first CPR of a real `provider_scope`-narrowed `TopicClaim` since the original Stock/Music domain build-out. Trial 2 of the Living Knowledge onboarding benchmark (LK-42 protocol).

Review recommendation: A — APPROVE (no CRC-copy adjustment beyond the non-substantive pronoun correction noted below)

PM decision: **APPROVE (PM: JD, Decision Date: 2026-08-30).**

Final CRC publication state: Yes

PM decision date: 2026-08-30

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as part of the LK-51 task that recorded the human CRC APPROVE decision — synthesizes the LK-50 CRC Publication Review analysis (conducted the same day, conversationally, ahead of a durable artifact existing for it) for durable, single-artifact preservation, per this folder's own governance-artifact-preservation requirement.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Storyblocks Business License Broadcast/OTT Scope — CRC Publication Review

## 0. Repository / governance state verified before review

Claim `Lifecycle: Adopted` (`FGR_010`, Adoption Approver: JD (PM), Adoption Decision Date: 2026-08-30). `CRC Approver`/`CRC Decision Date`: `PENDING` before this review. `CRC Publication Scope`/`CRC Candidate Statement`: empty before this review (unlike the Synthesia precedent, no prior draft existed — this review proposes the first draft). Candidate provenance (`08_Platform/app/lib/candidates/CAND-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001.ts @ efee49ded250488b9819ae31ae4c4b8234ad9ae2`) confirmed. No `TOPIC_CLAIMS_FIXTURE` entry exists; the claim is registered in `CLAIMS_WITHOUT_FIXTURE_REPRESENTATION`.

## 1. Governed proposition, restated (not reinterpreted)

Storyblocks' Individual and Small Business License Agreements state that their licenses do not include the right to use Stock Files in Broadcast, Television, or OTT platforms unless that right is explicitly set forth in the subscription plan selected. Storyblocks' licensing materials identify its Business License as covering broadcast, TV, streaming/OTT, and feature-film distribution. `Claim character: established`. `Jurisdiction`: not a legal jurisdiction — a platform contractual license-scope restriction, represented as `'Global'` under the same bounded transitional compatibility convention used for Synthesia and the Stock domain.

## 2. Evidence-tier re-verification

Not independently re-fetched by this review — evaluates the existing evidentiary record for publication-readiness only. `FGR_010` already recorded the primary basis: human-verified direct reading of preserved, hashed capture artifacts (Class B transport of Tier-1-by-document-type License Agreement text), corroborated by two independent Tier 2 Help Center sources and a License Comparison capture. This review accepts that record as sound.

## 3. Freshness finding

As of this review's own date (2026-08-30): the Individual License Agreement (Last updated June 18, 2026) is 73 days old — current by any standard applied elsewhere in this corpus. The Small Business License Agreement (Last updated October 20, 2025) is approximately 10.3 months old; the corroborating Help Center source is dated 2026-03-09 (approximately 5.7 months old). None approaches the staleness that drove Synthesia's CPR_009 to an intervening DEFER (a single >2.5-year-old source). **Classification: A — no freshness-driven human judgment required at Publication**, unlike Synthesia's Classification C.

## 4. Proposed CRC Candidate Statement — fidelity assessment

Reviewed exactly:

> "Storyblocks' Individual and Small Business License Agreements state that their license does not include the right to use Stock Files in Broadcast, Television, or OTT platforms unless that use is explicitly included in the subscription plan you selected. Storyblocks' own licensing materials identify the Business License specifically as covering broadcast, TV, streaming/OTT, and feature-film distribution."

Checked against the same criteria applied at every prior CPR in this corpus:
- **Unsupported strengthening:** none found — does not assert a user's actual tier, does not assert a specific project uses Storyblocks assets, does not extend the exclusion beyond Broadcast/Television/OTT.
- **Unsupported narrowing:** none found — both Agreements and the Business License's own stated scope are preserved.
- **Accidental legal framing:** none found — attributed throughout to "Storyblocks' ... License Agreements" and "Storyblocks' own licensing materials," never "the law."
- **Overstatement of currentness:** no explicit "as of [date]" qualifier in the plain sentence itself — consistent with this corpus's own established practice (Synthesia/Getty precedent) of carrying that qualifier in the longer Publication Scope paragraph, not duplicating it into the short user-facing sentence (see §19 below).
- **Provider-policy vs. law confusion:** none found.
- **Project-specific inference:** none found — no "your project," "this video," or first/second-person project-state language.
- **Dependency leakage:** none found — `storyblocks_license_tier_confirmed` is neither asked, implied, nor referenced.
- **Converse/carve-out fidelity:** preserved — "unless that use is explicitly included in the subscription plan you selected" mirrors the governed proposition's own plan-contingent (not tier-name-absolute) framing exactly.

**Finding: the proposed statement is faithful to the Adopted proposition.**

## 5. Evidence limitations (disclosed, carried into Publication Scope)

Two-document primary evidence (Class B/human-transported, Tier-1-by-document-type), corroborated by Tier 2 Help Center and License Comparison sources; the two Agreements carry different visible dates (§3); the PDF-title-vs-visible-date discrepancy noted in `FGR_010` §2 (Individual License `/Title` metadata "Individual License - 2023" vs. visibly stated "Last updated: June 18, 2026") is preserved as a disclosed, unresolved-by-inference fact, not restated in the Publication Scope itself (it does not bear on the proposition's own substance).

## 6. Prohibited conclusions — confirmed applicable

Re-read directly from the governed record: does not establish a specific project's Storyblocks assets are actually broadcast/OTT-cleared; does not establish that every non-Business subscription prohibits broadcast/OTT use in every case (plan-contingent, not tier-name-absolute); does not establish that holding a Business License by itself clears a project; does not establish anything about a jurisdiction's own broadcast/media law; does not establish that the same provisions govern Editorial, AI/ML, releases, or any other Storyblocks license term. All structurally unreachable by the proposed Candidate Statement and by the mechanical architecture (§7-§14 below).

## 7. Dependency — `storyblocks_license_tier_confirmed`

Confirmed directly from `dependency-askability.ts`: absent from the registry. `getAskabilityEntry()` returns `undefined` — evidence-only, non-askable, by construction. This review proposes no change.

## 8. Permanence of the Case 3B boundary

Confirmed via direct code inspection (`build-bounded-interpretation.ts`, unchanged since the Synthesia/Music CPRs): `hasGovernedProjectDependencies()` reads only the static `unresolved_project_dependencies.length > 0` check; nothing in this codebase ever removes a string from that list at runtime. Publication does not create, and cannot create, any path around this boundary.

## 9. Provider scope

`provider_scope: ['storyblocks']`. Confirmed: `'storyblocks'` is a registered `AssetProviderId` (`types/interview-engine.ts`, added LK-49, 2026-08-30). `providerScopeMatches()` (`lookup-topic-claims.ts`) confirmed structurally identical to the already-CPR-tested `toolScopeMatches()` (null-is-generic, non-empty-array-requires-membership) — narrows an already topic-matched claim only, never creates topic relevance itself. `tool_scope: null` — correctly independent, unaffected. No extraction alias added or required by this review.

## 10. Explicit-goal vs. discovered relevance

Confirmed via direct inspection of `discovered-relevance.ts`: the sole existing Track A trigger discovers `third_party_source_rights` only (from an `asset_provider_mention`, provider-agnostic), with `commercial_use` as an allowed *parent* goal, never a discoverable target. No trigger discovers `commercial_use` — this claim's own topic — from any provider mention. **This claim is reachable only under an explicit, confirmed `commercial_use` UserGoal today.** No Track A change proposed or required.

## 11. Conversational reachability

Confirmed via direct grep: zero occurrences of `"storyblocks"` in `extraction.ts` — no `KNOWN_ASSET_PROVIDERS` alias exists. No ordinary user utterance produces a confirmed, canonical `storyblocks` `AssetProviderMention` today. Recorded as a real, disclosed limitation, not fixed by this review, and not treated as a publication blocker — matches this corpus's own established precedent (Synthesia carries the identical gap; `CPR_007` §3's own ratified finding that publication eligibility and conversational extraction coverage are independent concerns).

## 12. Matrix coexistence inspection (LK-22 / `CRC-PUBLICATION-POLICY.md` practice)

Performed fresh. Searched both `PLATFORM-RIGHTS-MATRIX.md` and its runtime fixture for any case-insensitive occurrence of "storyblocks": **zero matches in either.** No material overlap exists to identify — vacuous-but-performed, per the established practice; this check governs `tool_scope`-carrying claims by the policy's own text, and is performed here as well for provider-scope consistency and completeness, reaching the same NO MATRIX COVERAGE FOUND conclusion.

## 13. Synthetic representation and synthetic eligibility canary

The existing, unmodified, generic `runSyntheticEligibilityCanary()` harness (built earlier the same day, 2026-08-30, generalizing the Music/Likeness precedent) was run against a test-only clone of the real governed claim (with this review's own proposed Candidate Statement supplied as the harness's required `crc_candidate_statement` derivation input — `crc_eligible: 'Yes'` applied only inside the harness's own isolated copy, never to governed state). Five scenarios, ephemeral probe, deleted after use:

- **Case A** (explicit `commercial_use` goal + `storyblocks` provider): retrieved, `matched_goal_categories: ['commercial_use']`, Bounded Interpretation status `relevant_applicability_unresolved` (Case 3B, never `directly_relevant`). Composition rendered the proposed Candidate Statement verbatim, the fixed category-relevance clause, the fixed unresolved-applicability hedge, and the unconditional Commercial Assurance bridge sentence — zero Storyblocks-specific text.
- **Case B** (goal, no provider): zero retrieved, `no_topic_claim` diagnostic.
- **Case C** (goal + different provider, `getty`): zero retrieved — fails closed.
- **Case D** (provider present, no goal): zero retrieval, zero Bounded Interpretations, zero knowledge/goal items.
- **Case E**: `unresolved_project_dependencies_by_claim` returns exactly `['storyblocks_license_tier_confirmed']`, unmodified passthrough.

Representation readiness re-confirmed fresh: `{ready: true, issues: []}`.

## 14. Layer-strengthening check

Confirmed across §13: Retrieval passes the dependency list through unmodified; Bounded Interpretation gates on it unconditionally (Case 3B, never bypassed); Composition renders the same fixed, domain-blind hedge/bridge template every other dependency-bearing claim in this corpus uses. No layer independently or cumulatively strengthens the claim's own conclusion beyond what the governed proposition itself states.

## 15. Proposed CRC Publication Scope (recommendation only — not entered into `GOVERNED-CLAIMS.md` by this review)

> APPROVED FOR CRC PUBLICATION (pending PM decision — see CRC Approver/CRC Decision Date below). CRC may state that Storyblocks' Individual and Small Business License Agreements (captured 2026-08-30; Individual Agreement Last updated June 18, 2026, Small Business Agreement Last updated October 20, 2025) exclude the right to use Stock Files in Broadcast, Television, or OTT platforms unless that use is explicitly included in the user's selected subscription plan, and that Storyblocks' own licensing materials identify the Business License as covering broadcast, TV, streaming/OTT, and feature-film distribution. This is Storyblocks' own provider/platform licensing policy, not law. CRC must not state that every non-Business Storyblocks subscription categorically prohibits Broadcast/Television/OTT use — the exclusion is plan-contingent, not tier-name-absolute. CRC must not state which specific Storyblocks license or plan a user actually holds, must not state whether a specific project's Storyblocks-sourced assets are actually broadcast/OTT-cleared, must not state that holding a Business License by itself commercially clears a project, and must not state or imply that all rights, releases, or authorizations necessary for the project have been obtained or that the project is otherwise commercially cleared. The evidence-only dependency (`storyblocks_license_tier_confirmed`) remains permanently unresolved through Bounded Interpretation's Case 3B boundary, exactly as for every other dependency-bearing claim in this corpus. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project's own Storyblocks license status.

## 16. CLI recommendation

**APPROVE.** Every publication-safety, evidence, dependency, provider-scope, Matrix-coexistence, and layer-strengthening check came back clean, several confirmed empirically via the existing generic canary harness. Unlike Synthesia, no freshness-driven open question exists (§3) requiring a PM judgment this review lacks standing to make on its own authority.

## 17. What this review does NOT establish

Not a Commercial Assurance Assessment. Not legal advice. Not project clearance or certification. Not proof any particular project satisfies or violates the provider restriction. Not conversational reachability (unchanged: no extraction alias exists). Not a Matrix conflict-resolution — no Matrix content exists to conflict with.

--- END VERBATIM CRC PUBLICATION REVIEW ---
