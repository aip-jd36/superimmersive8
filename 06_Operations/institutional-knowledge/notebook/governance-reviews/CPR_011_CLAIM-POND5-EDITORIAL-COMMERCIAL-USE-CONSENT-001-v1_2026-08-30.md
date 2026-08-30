Title: CRC Publication Review #11 — Pond5 Editorial Content Commercial-Use Restriction / Written-Consent Exception

Reviewed object: CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1

Review date: 2026-08-30

Artifact type: CRC Publication Review / Decision Analysis (publication stage — asks whether the already-Adopted claim may additionally become `CRC Eligible: Yes`; distinct from Formal Governance Review #11, which reviewed this same object for Adoption only — see `FGR_011_CAND-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001_2026-08-30.md`). Second CRC Publication Review of a real `provider_scope`-narrowed `TopicClaim` since the original Stock/Music build-out (after Storyblocks, `CPR_010`), and the first CPR of the Pond5 domain. Trial 3 of the Living Knowledge onboarding benchmark (LK-42 protocol).

Review recommendation: A — APPROVE

PM decision: APPROVED — publish CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1 to CRC as reviewed

Final CRC publication state: Yes

PM decision date: 2026-08-30

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as the review was conducted this session (not reconstructed from a prior conversational report).

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Pond5 Editorial Content Commercial-Use Restriction — CRC Publication Review

## 0. Repository / governance state verified before review

`HEAD` = `main` = `origin/main` + 6 local unpushed commits, most recent `ec9c80136d5fe0d8d21ece8a76a97b870d924a54` (the Adoption-recording commit). Confirmed directly: claim `Lifecycle: Adopted`, `CRC Approver: PENDING`, `CRC Decision Date: PENDING`, `CRC Publication Scope:` empty, `CRC Candidate Statement:` empty — no prior draft exists (unlike Synthesia's CPR_009, which reviewed a pre-existing draft). Candidate provenance (`08_Platform/app/lib/candidates/CAND-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001.ts @ 8b8eef8c6401f8f84b4951db73927b59489a0ae7`) confirmed unchanged. No `TOPIC_CLAIMS_FIXTURE` entry exists (confirmed via direct grep, zero matches); the claim is correctly registered in `CLAIMS_WITHOUT_FIXTURE_REPRESENTATION`. Zero `KNOWN_ASSET_PROVIDERS` alias for `pond5` (confirmed via direct grep, zero matches in `extraction.ts`). Zero Matrix coverage (confirmed via direct grep against both `PLATFORM-RIGHTS-MATRIX.md` and `matrix-fixture.ts`). `editorial_designation_confirmed`/`separate_authorization_obtained` confirmed absent from `dependency-askability.ts`'s registry (present only in that file's own documentary header, unchanged). Authoritative material read directly this review: the Adopted claim in `GOVERNED-CLAIMS.md`, `FGR_011` in full, the immutable Candidate artifact, `CRC-PUBLICATION-POLICY.md`, and — as CPR precedent — `CPR_003` (Getty Editorial) and `CPR_010` (Storyblocks) in full.

## 1. Governed proposition, restated (not reinterpreted)

Pond5 Content identified on its Item Page as Editorial, or for editorial use only, is intended for use only in connection with events or topics that are newsworthy or of general public interest. Absent Pond5's express and specific written consent, Pond5's Content License Agreement restricts this Editorial Content from use in merchandise, advertisement (other than in-context advertising of a Production in which the Editorial Content has been incorporated), endorsement, promotion, advertorial, or other commercial Production. `Claim character: established`. `Jurisdiction`: not a legal jurisdiction — a platform contractual restriction, represented as `'Global'` under the same bounded transitional convention used throughout this corpus.

## 2. Evidence-tier re-verification / capture-provenance vs. source-authority distinction

Not independently re-fetched by this review — evaluates the existing evidentiary record for publication-readiness only. **Source authority vs. capture/verification provenance kept explicitly separate, per this task's own §7 instruction:** the **source authority** is Pond5's own Content License Agreement, Section 7 — a Tier 1, primary legal/official authority document *by type*, unaffected by how it was transported. The **capture/verification provenance** is Class B under `EVIDENCE-CAPTURE-SOP.md` (human-captured browser Print→PDF, human-verified by direct rendered-page reading — LK-59 — because this environment's PDF tooling could not extract or render the raster capture, a disclosed tooling limitation, not a defect). `EVIDENCE-CAPTURE-SOP.md`'s own explicit discipline governs this exactly: "a human reading the actual authoritative page satisfies 'a primary source was checked' exactly as well as an automated fetch does." **Class B does not downgrade source authority.** Nothing in `CRC-PUBLICATION-POLICY.md` or `EVIDENCE-CAPTURE-SOP.md` conditions CRC publication on capture class — this review does not invent such a rule, and finds none exists. This governed record's evidence tier is therefore assessed as sound: Tier 1 primary source, human-verified, corroborated by two Tier 2/3 first-party current sources (Help Center article, Editorial page).

## 3. Freshness finding

The governing Agreement's own visible revision date (2024-01-03) is approximately 20 months old as of this review (2026-08-30) — real, but the corroborating Help Center article (2026-03-19, ~5.4 months old) and current Editorial/Pricing pages (captured 2026-08-30) are consistent with, and do not contradict, the Agreement's own Section 7 structure. Unlike Synthesia's CPR_009 (a single >2.5-year-stale source with no independent corroboration), this row has multiple, temporally-staggered, mutually-consistent first-party sources. **Classification: A — no freshness-driven human judgment required at Publication.**

## 4. Proposed CRC Candidate Statement — fidelity assessment

Reviewed exactly:

> "Pond5's Content License Agreement states that content Pond5 identifies as Editorial is intended for newsworthy or general-public-interest use, and — absent Pond5's express and specific written consent — restricts that content from use in merchandise, advertising, endorsements, promotions, advertorials, or other commercial productions."

Checked against every item this review was asked to check for:
- **Unsupported strengthening:** none — does not say Editorial content can *never* be used commercially (the consent exception is preserved), does not assert any user's asset is Editorial, does not assert consent was or was not obtained.
- **Unsupported narrowing:** none — all five named restricted-use categories are preserved (merchandise, advertising, endorsement, promotion, advertorial, other commercial production — "other commercial productions" preserves the catch-all).
- **Accidental legal framing:** none — attributed to "Pond5's Content License Agreement" throughout, never "the law."
- **Overstatement of currentness:** none in the sentence itself; the freshness point (§3) is carried at the Publication Scope layer instead, per the established Getty/Synthesia precedent (short statement stays plain; the longer scope paragraph carries the evidentiary caveat).
- **Project-specific inference:** none — no "your asset," "your project," or first/second-person language.
- **Dependency leakage:** none — neither `editorial_designation_confirmed` nor `separate_authorization_obtained` is asked, implied, or referenced.
- **"Contact = authorization" framing:** correctly absent — the statement does not mention Pond5's contact/clearance route at all (consistent with the LK-60 REVISE decision that removed this from the governed proposition itself).
- **Converse/carve-out fidelity:** preserved — "absent Pond5's express and specific written consent" mirrors the governed proposition's own conditional framing exactly, never rewritten as an absolute prohibition.

**Finding: the proposed statement is faithful to the Adopted proposition.**

## 5. Evidence limitations (disclosed, carried into Publication Scope)

Single-provider, Tier-1-primary + two-source Tier 2/3 corroboration; Class B capture/human-verified reading (not a downgrade, §2); the ~20-month Agreement-revision-to-review gap (§3, not blocking); the Section 7 clearance/PII/privacy-publicity disclaimer is excluded from both the proposition and this Candidate Statement, correctly preserved only as separate evidence-limitation context in the governed record (`GOVERNED-CLAIMS.md`'s own "SI8 interpretation" text) — this review does not fold it into the Publication Scope's own MAY-state content, matching LK-59/60/61's own scope discipline.

## 6. Prohibited conclusions — re-confirmed applicable

Re-read directly from the governed record and independently re-verified against this Candidate Statement (§4): does not establish a specific project's Pond5 Content is Editorial-designated; does not establish Pond5 granted written consent for any specific case; does not establish Editorial Content can never receive authorization (contingent, not absolute); does not establish that contacting Pond5 constitutes authorization or that authorization will be granted; does not establish releases/clearances exist; does not establish anything about jurisdiction-specific law; does not establish that the same Agreement provisions govern the Digital License, license tiers, or indemnification. All structurally unreachable by the proposed Candidate Statement and by the mechanical architecture (§7-§13 below).

## 7. Dependency 1 — `editorial_designation_confirmed`

Confirmed directly from `dependency-askability.ts`: absent from the registry (present only in that file's own documentary header, listing it by name among the real stock dependencies never registered `askable_in_crc`). `getAskabilityEntry()` returns `undefined`. **Evidence-only, non-askable, by construction — unchanged, this review proposes no change.** Reused, not newly minted — the identical identifier already governs the structurally identical Getty/iStock/Shutterstock Editorial claims.

## 8. Dependency 2 — `separate_authorization_obtained`

Identical finding and evidence to §7 — also reused, not newly minted, from the same Getty-class precedent.

## 9. No license-tier dependency

Confirmed: no `pond5_license_tier_confirmed`-style dependency exists on this claim, and none is warranted — the Adopted proposition, as revised (LK-60), does not turn on which Pond5 license tier was purchased. This review does not add one.

## 10. Permanence of the Case 3B boundary

Confirmed via direct code inspection (`build-bounded-interpretation.ts`, unchanged) and empirically (§14 below, Case A): `hasGovernedProjectDependencies()` reads only the static `unresolved_project_dependencies.length > 0` check; nothing in this codebase ever removes a string from that list at runtime, for any claim, in any domain. **Publication does not create, and cannot create, any path around this boundary.**

## 11. Provider scope

`provider_scope: ['pond5']`. Confirmed: `'pond5'` is a registered `AssetProviderId` (`types/interview-engine.ts`, added LK-59, 2026-08-30). `providerScopeMatches()` confirmed structurally identical to the already-CPR-tested mechanism — narrows an already topic-matched claim only, never creates topic relevance itself. `tool_scope: null` — correctly independent, unaffected. No extraction alias added or required by this review.

## 12. Explicit-goal reachability

This claim's own `topic` is `third_party_source_rights` — unlike Synthesia/Storyblocks (`commercial_use`, reached only via Track A discovery from a provider mention), this claim is directly reachable via an **explicit** `third_party_source_rights` UserGoal, the same reachability shape as the Getty/iStock/Shutterstock Editorial claims it structurally mirrors. Confirmed empirically (§14 Case A below).

## 13. Conversational reachability

Confirmed via direct grep: zero occurrences of `"pond5"` in `extraction.ts` — no `KNOWN_ASSET_PROVIDERS` alias exists. No ordinary user utterance produces a confirmed, canonical `pond5` `AssetProviderMention` today. Recorded as a real, disclosed limitation, not fixed by this review, and not treated as a publication blocker — matches the established, already-accepted precedent (Storyblocks carries the identical gap today; `CPR_007`'s own ratified finding that publication eligibility and conversational extraction coverage are independent concerns).

## 14. Matrix coexistence inspection

Performed fresh. Searched both `PLATFORM-RIGHTS-MATRIX.md` and its runtime fixture for any case-insensitive occurrence of "pond5": **zero matches in either.** No material overlap exists to identify — vacuous-but-performed, per the established practice. **NO MATRIX COVERAGE FOUND.**

## 15. Synthetic representation and synthetic eligibility canary

The existing, unmodified, generic `runSyntheticEligibilityCanary()` harness was run against a test-only clone of the real governed claim (with this review's own proposed Candidate Statement supplied as the harness's required `crc_candidate_statement` derivation input — `crc_eligible: 'Yes'` applied only inside the harness's own isolated copy, never to governed state). Five scenarios, ephemeral probe, deleted after use:

- **Case A** (explicit `third_party_source_rights` goal + `pond5` provider): retrieved, `matched_goal_categories: ['third_party_source_rights']`, Bounded Interpretation status `relevant_applicability_unresolved` (Case 3B, never `directly_relevant`). Composition rendered the proposed Candidate Statement verbatim, the fixed category-relevance clause ("relevant to whether you have the rights to use third-party source material"), the fixed unresolved-applicability hedge, and the unconditional Commercial Assurance bridge — zero Pond5-specific text.
- **Case B** (goal, no provider): zero retrieved.
- **Case C** (goal + different provider, `getty`): zero retrieved — fails closed.
- **Case D** (provider present, no goal): zero retrieval, zero Bounded Interpretations.
- **Case E**: `unresolved_project_dependencies_by_claim` returns exactly `['editorial_designation_confirmed', 'separate_authorization_obtained']`, unmodified passthrough.

Representation readiness re-confirmed fresh: `{ready: true, issues: []}`.

## 16. Layer-strengthening check

Confirmed across §15: Retrieval passes the dependency list through unmodified; Bounded Interpretation gates on it unconditionally (Case 3B, never bypassed); Composition renders the same fixed, domain-blind hedge/bridge template every other dependency-bearing claim in this corpus uses. No layer independently or cumulatively strengthens the claim's own conclusion beyond what the governed proposition itself states.

## 17. Proposed CRC Publication Scope (recommendation only — not entered into `GOVERNED-CLAIMS.md` by this review)

> APPROVED FOR CRC PUBLICATION (pending PM decision — see CRC Approver/CRC Decision Date below). CRC may state that Pond5's Content License Agreement identifies content Pond5 marks Editorial as intended for newsworthy or general-public-interest use, and that — absent Pond5's own express and specific written consent — that Agreement restricts Editorial Content from use in merchandise, advertisement (other than in-context advertising of a Production in which it has been incorporated), endorsement, promotion, advertorial, or other commercial Production. This is Pond5's own provider/platform licensing policy, not law. CRC must not state whether the user's own specific Pond5 asset is Item-Page-designated Editorial, must not state whether Pond5 granted express and specific written consent for any specific case, must not state that every Editorial-designated Pond5 asset is permanently barred from commercial use (the exclusion is contingent on Pond5's own consent, not absolute), must not treat a user's statement that they contacted Pond5 as evidence that authorization was obtained, and must not state or imply that all rights, releases, or authorizations necessary for the project have been obtained or that the project is otherwise commercially cleared. The evidence-only dependencies (`editorial_designation_confirmed`, `separate_authorization_obtained`) remain permanently unresolved through Bounded Interpretation's Case 3B boundary, exactly as for every other dependency-bearing claim in this corpus. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project's own Pond5 Editorial-content status.

## 18. CLI recommendation

**APPROVE.** Every publication-safety, evidence, dependency, provider-scope, Matrix-coexistence, and layer-strengthening check came back clean, several confirmed empirically via the existing generic canary harness. No freshness-driven open question exists (§3), and the Class B capture/human-verification provenance does not, and per existing governance cannot, downgrade the underlying Tier 1 source authority (§2).

## 19. What this review does NOT establish

Not a Commercial Assurance Assessment. Not legal advice. Not project clearance or certification. Not proof any particular project satisfies or violates the provider restriction. Not conversational reachability (unchanged: no extraction alias exists). Not a Matrix conflict-resolution — no Matrix content exists to conflict with.

--- END VERBATIM CRC PUBLICATION REVIEW ---
