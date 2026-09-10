Title: CRC Publication Review #22 — Envato + Epidemic Reconsideration (post-provider-registration)

Reviewed objects:
- `CLAIM-MUSIC-ENVATO-SYNC-001-v1`
- `CLAIM-MUSIC-ENVATO-CANCELLATION-001-v1`
- `CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1`

Review date: 2026-09-10

Artifact type: CRC Publication Review / Decision Analysis (publication stage) — combined review of three related, individually-dispositioned claims, per `governance-reviews/README.md`'s own combined-review naming exception (mirrors `CPR_007`'s and `CPR_021`'s own precedent: joint review warranted because all three share one now-cleared runtime blocker, not because they share one acceptance-test question). Three independent CPR determinations follow — this is not a single collective approval.

PM decision: **CONCURRED (2026-09-10, PM: JD), individually, per claim — following this file's own recommendation exactly, with no override.** Envato Sync: APPROVE. Envato Cancellation: APPROVE. Epidemic Tier Advertising: APPROVE WITH BOUNDED WORDING CORRECTION. **Wording note (this wrapper only — the verbatim body below is never edited):** the PM's own supplied "approved" Epidemic wording differs cosmetically, not substantively, from this review's own §3 draft — "separately allows you to monetize" vs. the draft's "separately gives you the right to monetize," and "(including online pre/mid/post-roll placements)" vs. the draft's "(including things like online pre/mid/post-roll placements)." Same scope, same prohibited-conclusions boundary, no meaning change. `GOVERNED-CLAIMS.md` was persisted using the PM's own exact supplied text, not this review's own draft — see that claim's own entry. Recorded inline in `GOVERNED-CLAIMS.md`'s own three claim entries (`CRC Approver: JD (PM)`, `CRC Decision Date: 2026-09-10`, finalized `CRC Publication Scope`/`CRC Candidate Statement`). Real `TOPIC_CLAIMS_FIXTURE` entries added for all three approved claims in the same activation package.

**Persistence note (repository convention genuinely ambiguous, per this task's own explicit instruction to report rather than guess): some prior recommendation-stage CPR artifacts in this folder (e.g. `CPR_020`) received their own standalone commit before PM concurrence; others (e.g. `CPR_021`) were left uncommitted until the same commit that recorded PM's eventual approval. This file is left UNCOMMITTED, matching the more conservative of the two observed patterns and this task's own explicit fallback instruction.**

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments belong in a new review artifact or in this wrapper's own metadata, never inserted into the verbatim body below.

Source: written directly to this file as the review was conducted this session, not reconstructed from a prior conversational report.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Envato + Epidemic — CRC Publication Reconsideration

## 0. Repository / governance state verified before review

Provider-registration commit under review: **`d1c8cc7baa50c2ef6abcbf6b0d397c207b2ff700`** — note, this task's own briefing cited `3ad15564fe9edab13af8e0eab61b5f38389eaf37`, which does not exist anywhere in this repository (confirmed: `git cat-file -t` fails with "not our ref" both locally and against origin). Treated as a transcription error in the briefing, not evidence of a different or tampered commit — `d1c8cc7`'s own content independently verified to match every other claimed property (parent `b0e067f`, zero `GOVERNED-CLAIMS.md`/`topic-claims-fixture.ts` diff, not pushed to any remote branch).

`origin/main` at review time: `e63ceda29484b5b1bbfe6efa58eee6ea56863caa` — one commit ahead of the provider-registration commit's own base (`b0e067f`); that one commit (`e63ceda`, docs-only CAH-4F status reconciliation) touches 4 files with zero overlap with anything in this review. Classified DISJOINT, not a blocker.

Confirmed directly (not assumed) against current code, built on top of `d1c8cc7`:
- `ASSET_PROVIDER_IDS` includes `'envato-elements'` and `'epidemic-sound'`.
- `KNOWN_ASSET_PROVIDERS` includes `'envato elements'` → `envato-elements`; `'epidemic sound'`/`'epidemicsound'` → `epidemic-sound`. Bare `'envato'` deliberately absent.
- `NEW_IDENTITY_CANONICALIZATION_READINESS` carries passing entries for both, confirmed via the live test suite.
- `topic-claims-fixture.ts` — zero entries for any of the three claims (confirmed via grep).
- `lib/candidates/` — no `CAND-MUSIC-ENVATO-*`/`CAND-MUSIC-EPIDEMIC-*` files exist.
- `PLATFORM-RIGHTS-MATRIX.md`/`matrix-fixture.ts` — no Envato/Epidemic rows (Matrix is AI-tool-scoped, not music-provider-scoped).

**Single-authority check: Case A for all three — one governed authority (`GOVERNED-CLAIMS.md`) plus zero competing representations anywhere else.** No STOP condition.

Authoritative material read directly this review: all three claim records in `GOVERNED-CLAIMS.md` (in full, this session), `CPR_007_MUSIC_SCENARIO_A_PACKAGE_2026-08-27.md` (in full — the only prior CPR treatment of these three), `CRC-PUBLICATION-POLICY.md` (all seven Principles, the Publication Test), `CPR_021_ARTLIST_REMAINING_CLAIMS_RECONSIDERATION_2026-09-10.md` (closest precedent — same reconsideration shape, same task author), and direct inspection of `lib/retrieval-engine/assemble-result.ts` / `lib/projection-layer/project-knowledge-items.ts` to independently confirm which field (`crc_candidate_statement`, not `crc_publication_scope`) production actually renders verbatim to the user — `crc_publication_scope`'s runtime role is exclusively the null-gate (`if (claim.crc_publication_scope === null) return null`) plus the durable governance-record boundary text, never shown to the CRC user directly. This corrects an imprecise recollection carried into this task from an earlier session's summary of `CPR_012` — verified fresh against the real code, not trusted.

## 1. Prior CPR blocker analysis (per claim, not assumed identical)

- **Envato Sync (`CPR_007`'s "A1")**: "WITHHOLD — product-completeness deferral (runtime-verification prerequisite), not a safety finding... Substantively CONDITIONALLY READY." **Category A only** (runtime/mechanical) — now resolved by `d1c8cc7`.
- **Envato Cancellation (`CPR_007`'s "A2")**: identical disposition — "WITHHOLD — product-completeness deferral... Substantively CONDITIONALLY READY, same as A1." **Category A only** — now resolved.
- **Epidemic Tier Advertising (`CPR_007`'s "EP1")**: "WITHHOLD — both for the shared runtime-verification prerequisite AND for an independent, confirmed substantive reason (bounded-copy drafting still needed)... the current draft statement... is safely hedged and abstract... vague enough that a user cannot actually tell from it which tier permits what." **Category A (resolved) AND Category B** (wording/publication-boundary issue — NOT resolved by provider registration, addressed independently below).

## 2. The CPR standard, re-applied (not re-derived from scratch — see `CPR_021` §2 for the full re-derivation; unchanged since)

Publication Test: **"Would I be comfortable having a prospect's legal team quote this exact sentence back to SI8?"** — applied to each claim's actual rendered text (`crc_candidate_statement`, confirmed above to be what the user actually sees), independently, per Principle 1.

## 3. Individual Publication Tests + three independent CPR determinations

### CLAIM-MUSIC-ENVATO-SYNC-001-v1

**Governed statement (unchanged):** Envato Elements' standard subscription ties music use to synchronization with other media, excludes standalone resale/redistribution, excludes "Broadcast" use specifically. Evidence: Class A, single-source, directly fetched (`elements.envato.com/learn/how-envato-licensing-works`). `provider_scope: ['envato-elements']`. Dependency: `which_music_provider` — evidence-only; structurally auto-satisfied by the time this provider-scoped claim is even a retrieval candidate at all (same observation `DAR_001` made for Getty's `asset_confirmed_getty`), but left in the governed dependency list unchanged — this review does not correct it, matching this document's own "never retroactively edit for convenience" discipline; it is harmless (Case 3B still fires, the claim never renders unhedged).

**Publication Test:** the existing draft ("Envato's standard license ties music use to synchronization with other media and excludes standalone resale and broadcast use, as a general framing") is accurate and complete — captures all three governed elements, drops no load-bearing qualifier (unlike Artlist's own A-1 defect). Minor polish applied below (spelling out "Envato Elements'" rather than "Envato's," matching the governed proposition's own precise subject) — not a substantive correction.

**DECISION: APPROVE.**
**RATIONALE:** Single-source Class A evidence, no dependency risk beyond a structurally-harmless auto-satisfied fact, no overclaim/underclaim risk identified. Directly mirrors the "CONDITIONALLY READY, no wording change" shape already used for Artlist's A-2/A-4/A-7a.
**CRC CANDIDATE STATEMENT:** "Envato Elements' standard license ties music use to synchronization with other media, and excludes standalone resale/redistribution and broadcast presentations specifically."
**CRC PUBLICATION SCOPE:** CRC may state that Envato Elements' standard license ties music use to synchronization with other media (such as being part of a video) and excludes standalone resale/redistribution and broadcast presentations specifically. CRC must not state whether the user's own specific use constitutes standalone resale or broadcast use, must not state that the user holds a valid Envato Elements subscription for the track, and must not state or imply the project is otherwise commercially cleared.
**APPLICABILITY:** none. **DEPENDENCIES:** `which_music_provider` — evidence-only; Case 3B fires.
**PROHIBITED CONCLUSIONS:** existing Adopted list, unchanged.
**REMAINING GATE:** PM/JD concurrence → mechanical `TOPIC_CLAIMS_FIXTURE` entry (not performed by this review).

---

### CLAIM-MUSIC-ENVATO-CANCELLATION-001-v1

**Governed statement (unchanged, already corrected at FGR stage to track the source exactly — "remains licensed even if the subscription later ends," not "permanently"):** a project completed and published while the subscription was active remains licensed after cancellation; new/incomplete projects after cancellation are not covered. Evidence: Class A, directly fetched, independently re-verified twice (FGR-prep + `FGR_006`), substance unchanged both times. `provider_scope: ['envato-elements']`. Dependency: `music_subscription_active_at_publication_confirmed`.

**Dependency scrutiny (Step 5's own explicit focus):** genuinely required (without it, continuity cannot be determined for any specific project) — not auto-satisfied like `which_music_provider`, structurally identical in kind to Artlist A-3's own `artlist_subscription_active_at_publication_confirmed` (already CRC-active, already in production, same evidence-only/Case-3B treatment). Correctly represented as evidence-only (a documentary/account-history fact — a user's own memory of exact historical subscription-active dates is not reliable self-report). Not registered `askable_in_crc` (confirmed: `dependency-askability.ts` unchanged, one live entry only, `human_contribution_description`). **This review does not convert it to askable** — no new evidence or reasoning distinguishes it from A-3's own already-settled precedent, and the task's own explicit instruction forbids converting a project-evidence fact into self-attestation merely to ease activation. Safely fail-closed: Case 3B fires, the claim never asserts continuity for the user's own project.

**Publication Test:** the existing draft ("Envato's stated policy is that already-completed, already-published work stays licensed after cancellation, while new use does not") is near-verbatim structurally identical to A-3's own already-approved, already-in-production statement — no new risk profile.

**DECISION: APPROVE.**
**RATIONALE:** Directly mirrors the already-approved, already-in-production A-3 precedent almost word-for-word; evidence tier and dependency handling both independently sound.
**CRC CANDIDATE STATEMENT:** "Envato's stated policy is that already-completed, already-published work stays licensed after cancellation, while new use does not."
**CRC PUBLICATION SCOPE:** CRC may state that Envato's stated policy is that music used in a project completed and published while the subscription was active remains licensed even after the subscription ends, while new or incomplete projects after cancellation are not covered. CRC must not state whether the user's own specific project was actually completed and published while their subscription was active, and must not state or imply the project is otherwise commercially cleared.
**APPLICABILITY:** none. **DEPENDENCIES:** `music_subscription_active_at_publication_confirmed` — evidence-only; Case 3B fires; left non-askable, per the analysis above.
**PROHIBITED CONCLUSIONS:** existing Adopted list, unchanged.
**REMAINING GATE:** PM/JD concurrence → mechanical fixture entry.

---

### CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1

**Governed statement (unchanged):** Epidemic Sound's Single-Track Private Tier license excludes advertisements/paid-media productions; the Commercial Tier license does not carry that exclusion (only a narrower TV/broadcast-type exclusion) and separately grants a third-party-ad monetization right. Evidence: Class A, independently re-verified twice via fresh document download + extraction, tier-section boundaries confirmed directly by text search. `provider_scope: ['epidemic-sound']`. Dependencies: `which_music_provider` (auto-satisfied, same as Envato's), `epidemic_license_tier_confirmed` (genuine account/subscription fact — structurally identical in kind to Artlist's own `artlist_license_type_confirmed`, already treated evidence-only for the already-approved A-1).

**Publication Test — full skeptical review per Step 6's explicit checklist, not treated as predetermined:**
- *"One tier universally permits commercial use"* — real risk in the ORIGINAL draft ("Epidemic Sound's own license documents distinguish tiers by advertising/paid-media permission, with materially different rules between Private and Commercial tiers") — too abstract to actually convey which tier permits what; `CPR_007`'s own flagged weakness, independently re-confirmed.
- *"Another tier universally prohibits commercial use"* — real risk: a naive tightening of the above draft could overcorrect into stating Private tier bars "commercial use" generally, when the governed proposition is narrower (advertising/paid-media specifically).
- *"Subscription tier alone establishes project readiness"* — addressed by the corrected wording's own closing sentence.
- *"Advertising coverage equals general commercial clearance"* — addressed by the Publication Scope's explicit prohibition.
- *"Absence of coverage equals legal prohibition"* — addressed: this is Epidemic's own contractual term, never framed as a legal conclusion.
- *"A known tier automatically resolves every dependency"* — the corrected statement's own final sentence ("depends on which tier you're actually subscribed to") signals tier-confirmation is necessary, and the Publication Scope explicitly does not claim tier-knowledge alone resolves placement-level questions (e.g. whether a specific ad type counts as excluded).

**Bounded correction applied** (same technique already proven for Artlist's Pro Royalties and Social vs Pro — explicit, tier-by-tier specificity plus bidirectional guardrails, not a narrowing of the underlying governed proposition):

**DECISION: APPROVE WITH BOUNDED WORDING CORRECTION.**
**RATIONALE:** The blocker was always wording-completeness (Category B), never evidence or applicability — `CPR_007` itself already isolated this precisely. The corrected statement below states both tiers' actual rules (resolving the vagueness that undermined educational value) while explicitly avoiding every one of the six risky-implication patterns Step 6 asked this review to check.
**CRC CANDIDATE STATEMENT:** "Epidemic Sound's Single-Track Private Tier license excludes use in advertisements and other paid-media productions -- but the separate Commercial Tier license doesn't carry that same exclusion; it only excludes broadcast-type content such as TV ads, and separately gives you the right to monetize your own published work through third-party ads. Which of these applies depends on which tier you're actually subscribed to."
**CRC PUBLICATION SCOPE:** CRC may state that Epidemic Sound's Single-Track Private Tier license excludes use in advertisements and other paid-media productions (including things like online pre/mid/post-roll placements), that the separate Commercial Tier license does not carry that same exclusion (it excludes only broadcast-type content such as TV ads), and that the Commercial Tier separately grants a right to monetize through third-party ads on the subscriber's own published work -- and that which of these applies depends on which tier the subscriber actually holds. CRC must not state which tier the user's account actually holds, must not state that the Private tier prohibits all commercial use (only advertising/paid-media use specifically), must not state that the Commercial tier's monetization right by itself clears a project commercially, and must not state or imply the project is otherwise commercially cleared.
**APPLICABILITY:** none. **DEPENDENCIES:** `which_music_provider` (auto-satisfied, harmless), `epidemic_license_tier_confirmed` (genuine, evidence-only, left non-askable for the same reason as Envato Cancellation's dependency and Artlist's `artlist_license_type_confirmed`). Case 3B fires.
**PROHIBITED CONCLUSIONS:** existing Adopted list, unchanged, plus the bidirectional exclusions above.
**REMAINING GATE:** PM/JD concurrence — specifically weighing whether the corrected wording adequately resolves the tier-vagueness risk `CPR_007` identified — → mechanical fixture entry.

## 4. Real pipeline verification (all three, proposed final wording)

Exercised via a throwaway, never-committed scratch test (deleted after capturing results) against the real, unmodified `runSyntheticEligibilityCanary`/`retrieve()`/`runCRCConversation` pipeline, using each claim's proposed final `crc_candidate_statement`/`crc_publication_scope` above: 29/29 assertions passed. Confirmed per claim: correct-provider retrieval; fail-closed on wrong/absent provider; dependencies preserved exactly; Case 3B fires for all three (every claim here carries ≥1 dependency); the rendered summary is the verbatim `crc_candidate_statement` with no project-specific determination or manufactured clearance; zero cross-provider bleed among Envato, Epidemic, and Artlist in every direction; the real governed claim objects are never mutated (`crc_eligible` remains `'Pending'` throughout); a direct `retrieve()` call using the claims' actual governed `crc_eligible: 'Pending'` value (no override) returns empty, confirming genuine current CRC-inactivity; explicit-goal and Track-A-discovered-topic provenance both function correctly and remain distinctly stamped (`match_origin`), with no fabricated `UserGoal` anywhere.

## 5. Publication-boundary audit (per approved claim)

**Envato Sync / Envato Cancellation / Epidemic Tier Advertising, all three:**
- **CRC MAY SAY:** exactly the governed proposition, in the bounded wording above.
- **CRC MUST NOT SAY:** anything about the user's own specific project, subscription-active history, license tier, or overall commercial-clearance status.
- **CRC STILL CANNOT DETERMINE:** whether the user's actual use constitutes standalone/broadcast (Envato Sync); whether the user's subscription was genuinely active at publication (Envato Cancellation); which tier the user holds, or whether a specific placement counts as excluded advertising (Epidemic).
- **COMMERCIAL ASSURANCE WOULD NEED TO VERIFY:** documentary/account evidence for every one of the above. CRC remains educational workflow guidance only — not legal advice, not a Commercial Assurance Assessment, and does not certify commercial clearance, for any of the three.

## 6. Benchmark policy

**Category A — routine onboarding.** All three claims exercise the identical provider-scope + evidence-only-dependency + Case-3B mechanism already empirically proven for Getty, Storyblocks, Pond5, Artlist, and (via this review's own pipeline verification) now Envato/Epidemic themselves. No LK benchmark trial is created or recommended.

--- END VERBATIM CRC PUBLICATION REVIEW ---
