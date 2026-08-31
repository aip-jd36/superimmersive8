/**
 * Typed topic-claims fixture (CRC Living Knowledge Phase 1, 2026-08-16).
 * Same discipline as matrix-fixture.ts: NOT a live parser of
 * GOVERNED-CLAIMS.md -- no markdown-parsing precedent exists anywhere in
 * this repository, so a live parser would be new, unjustified
 * infrastructure. Hand-synced mirror; a small CI consistency check
 * (__tests__/retrieval-engine/topic-claims-fixture-consistency.test.ts)
 * catches claim-ID/Lifecycle/Publication-scope drift between this file
 * and the real markdown.
 *
 * Wave 1 claims (2026-08-16): four U.S. copyright/human-authorship claims,
 * mirrored verbatim from GOVERNED-CLAIMS.md. Primary sources independently
 * re-verified via live web search on 2026-08-16 (USCO Part 2 Report,
 * Thaler v. Perlmutter, Zarya of the Dawn), not reused from existing repo
 * research without re-checking, per the explicit PM governance guardrail
 * ("existing repo research is candidate source material only").
 *
 * ADOPTED 2026-08-16 (first formal Living Knowledge governance decision,
 * Adoption Approver: JD/PM) as SI8 institutional/reviewer knowledge --
 * `lifecycle: 'Adopted'` on all four. Originally `crc_eligible: 'Pending'`
 * on all four, deliberately: CRC-eligible publication is an explicitly
 * SEPARATE decision from Adoption (per this document's own governance
 * discipline). `lookupTopicClaims()` requires BOTH `lifecycle === 'Adopted'
 * && crc_eligible === 'Yes'` before a claim can ever reach `matches[]` --
 * `crc_eligible: 'Pending'` alone was sufficient to keep all four
 * completely excluded from CRC Topic Retrieval at adoption time, unchanged
 * from their pre-adoption behavior. This was the concrete Phase 1
 * acceptance-test proof that lookupTopicClaims() correctly excludes
 * non-CRC-eligible claims (reviewer-only, not merely un-adopted) from
 * ever reaching CRC output, using REAL Wave 1 content rather than a
 * synthetic test fixture -- see
 * __tests__/retrieval-engine/lookup-topic-claims.test.ts and the
 * dedicated Wave-1-specific exclusion test in
 * __tests__/retrieval-engine/wave1-candidate-claims-excluded.test.ts.
 * UPDATE (2026-08-17/2026-08-19): all four Wave 1 claims are now
 * `crc_eligible: 'Yes'` -- CLAIM-COPY-004-v1 published 2026-08-17
 * (independent decision, see its own inline comment below);
 * CLAIM-COPY-001-v1/-002-v1/-003-v1 published together 2026-08-19 as one
 * atomic decision alongside REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 -- see
 * `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`.
 * The Wave-1-exclusion tests above now assert the CURRENT `crc_eligible`
 * values are read correctly, not that Wave 1 is universally excluded --
 * see that test file's own updated assertions.
 *
 * UPDATE (Living Knowledge -- Third-Party Source Rights, M3, 2026-08-18):
 * all five Adopted stock-media claims (CLAIM-STOCK-EDITORIAL-001-v1/-002-v1,
 * CLAIM-STOCK-GETTY-EDITORIAL-001-v1, CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-
 * 001-v1, CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1) NOW HAVE real entries below,
 * `topic: 'third_party_source_rights'`. M1 (GoalCategory) closed the
 * category gap; M2 (AssetProviderMention) closed the provider-recognition
 * gap; M3 (this milestone -- `provider_scope` on TopicClaim, a silent
 * pre-filter in `lookupTopicClaims()`, per THIRD_PARTY_SOURCE_RIGHTS_PATH_A_
 * PROVIDER_NARROWING.md §7-§11) closes the provider-narrowing gap that
 * previously made the three provider-specific claims unsafe to represent at
 * all (adding them without a narrowing mechanism would have surfaced
 * Getty/Shutterstock/iStock-specific content to any user who asked a
 * generic question, regardless of which provider they named).
 *
 * UPDATE (2026-08-18, M4 -- CRC-publication decisions in this domain):
 * `CLAIM-STOCK-EDITORIAL-001-v1` is now `crc_eligible: 'Yes'`, following
 * Formal CRC-Publication Review #1 (recommendation A -- PASS/GO AS-IS) and
 * PM approval -- see `governance-reviews/CPR_001_CLAIM-STOCK-EDITORIAL-001
 * -v1_2026-08-18.md`. `CLAIM-STOCK-EDITORIAL-002-v1` is ALSO now
 * `crc_eligible: 'Yes'`, following Formal CRC-Publication Review #2
 * (recommendation B -- PASS/GO WITH BOUNDED CRC COPY ADJUSTMENT: the
 * governed Claim proposition was left byte-identical, but the derived
 * `crc_publication_scope`/`crc_candidate_statement` text below was
 * corrected to restore a provider-evidence caveat -- Getty/iStock/
 * Shutterstock confirmed, Adobe Stock explicitly not -- that the
 * pre-correction CRC-facing text had omitted) and PM approval -- see
 * `governance-reviews/CPR_002_CLAIM-STOCK-EDITORIAL-002-v1_2026-08-18.md`.
 * `CLAIM-STOCK-GETTY-EDITORIAL-001-v1` is ALSO now `crc_eligible: 'Yes'`,
 * following a bounded CRC-Publication Review #3 (recommendation A --
 * PASS/GO AS-IS, no text change) and PM approval -- see
 * `governance-reviews/CPR_003_CLAIM-STOCK-GETTY-EDITORIAL-001-v1_2026-08-18
 * .md`. This was the first live proof that `provider_scope` (M3) correctly
 * gates a provider-specific claim under real pipeline execution, not just
 * architecturally. `CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1` is ALSO now
 * `crc_eligible: 'Yes'`, following a bounded CRC-Publication Review #4
 * (recommendation A -- PASS/GO AS-IS, no text change) and PM approval --
 * see `governance-reviews/CPR_004_CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1
 * _2026-08-18.md`. That review's load-bearing test confirmed the claim's
 * "no evidence found, not a confirmed absence" negative-finding framing
 * survives real pipeline execution, including two targeted adversarial
 * pressure-test scenarios. `CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1` is
 * ALSO now `crc_eligible: 'Yes'`, following a bounded CRC-Publication
 * Review #5 (recommendation A -- PASS/GO AS-IS, no text change) and PM
 * approval -- see `governance-reviews/CPR_005_CLAIM-STOCK-SHUTTERSTOCK
 * -EDITORIAL-001-v1_2026-08-18.md`. That review's load-bearing test
 * confirmed the claim's intentionally mixed evidence-tier disclosure
 * (Tier 1 functional distinction, Official Secondary Rights and Clearance
 * description) survives real pipeline execution without being flattened
 * into Getty-level certainty. All five stock claims researched to date are
 * now `crc_eligible: 'Yes'` -- M3 is retrieval infrastructure only and
 * does not itself authorize CRC
 * publication for any claim; each claim's CRC eligibility is its own
 * separate, individually-made governance decision (M4). Until a given
 * claim's own decision is made, `lookupTopicClaims()`'s own existing
 * `lifecycle === 'Adopted' && crc_eligible === 'Yes'` gate excludes it from
 * `matches[]` -- confirmed structurally, not by convention: provider
 * narrowing is evaluated as a candidate PRE-filter (before this gate is
 * ever reached), so a real, unmodified `crc_eligible: 'Pending'` claim is
 * excluded REGARDLESS of whether its provider_scope would otherwise match.
 *
 * UPDATE (2026-08-19, atomic copyright publication package):
 * `CLAIM-COPY-001-v1`/`-002-v1`/`-003-v1` are now ALSO `crc_eligible:
 * 'Yes'`, published together with `REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1`
 * (see `topic-relationships-fixture.ts`) in a single atomic governance
 * decision -- not sequentially -- following a bounded Copyright CRC
 * Publication-Readiness Review (recommendation A -- PASS/GO AS-IS for all
 * four, no text change to any of them) and PM approval. See
 * `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`.
 * These three claims' own `topic: 'copyrightability'` means they are
 * unreachable by a `copyright_ownership` goal (e.g. "do I own the
 * copyright?") except via that now-also-live relationship -- confirmed
 * empirically during the review that the relationship is a genuine
 * prerequisite, not a redundant safeguard, for that goal category. All
 * three retain `applicability_requirements: [{jurisdiction: 'United
 * States'}]` unchanged -- they will not surface for any conversation where
 * U.S. jurisdiction is not confirmed, a known, disclosed, non-blocking
 * operational characteristic (not a routing defect), explicitly not
 * addressed by this publication decision.
 *
 * `CLAIM-STOCK-EDITORIAL-001-v1`/`-002-v1`: generic (`provider_scope:
 * null`) -- a topic candidate for ANY third_party_source_rights goal,
 * independent of which (if any) provider was named.
 * `CLAIM-STOCK-GETTY-EDITORIAL-001-v1`: `provider_scope: ['getty']`.
 * `CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1`: `provider_scope:
 * ['shutterstock']`. `CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1`: `provider_scope:
 * ['istock']`. No Adobe Stock provider-specific entry exists -- no Adobe
 * claim has been adopted (M2's `AssetProviderMention` recognizes
 * `adobe-stock` as a canonical identifier, but recognition and governed
 * knowledge are deliberately separate concepts; recognizing a provider
 * never implies a claim exists for it).
 *
 * `crc_publication_scope`/`crc_candidate_statement` below are copied
 * verbatim from each claim's own "CRC Candidate Statement"/scoping
 * sentence in GOVERNED-CLAIMS.md -- the field always holds the real
 * governed text regardless of `crc_eligible` state; `crc_eligible` alone
 * controls whether it can ever reach a result. `applicability_requirements`/
 * `unresolved_project_dependencies` are copied unmodified from the
 * markdown, not broadened or narrowed by this milestone.
 *
 * See `__tests__/retrieval-engine/topic-claims-fixture-consistency.test.ts`
 * for the drift-detection guard between this file and the markdown (now
 * exercised for all nine claims, not four), and
 * `06_Operations/institutional-knowledge/notebook/GOVERNED-CLAIMS.md`'s own
 * updated GOVERNANCE TREATMENT notes on each of the five stock entries for
 * the parallel current-state documentation update.
 */

import type { TopicClaim } from './types'

export const TOPIC_CLAIMS_FIXTURE: TopicClaim[] = [
  {
    claim_id: 'CLAIM-COPY-001-v1',
    topic: 'copyrightability',
    claim_character: 'established',
    jurisdiction: 'United States (federal)',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      "CRC may state that, under current U.S. law, AI-generated video with no meaningful human creative contribution generally does not qualify for copyright protection, and that this is a distinct question from whether the video is safe to use commercially (see CLAIM-COPY-004). CRC must not state whether the user's own specific video qualifies.",
    crc_candidate_statement:
      "Under current U.S. copyright law, AI-generated video without meaningful human creative contribution generally isn't eligible for copyright protection. This is a different question from whether you're clear to use the video commercially.",
    applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    unresolved_project_dependencies: ['human_contribution_description'],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-08-16',
    superseded_by: null,
  },
  {
    claim_id: 'CLAIM-COPY-002-v1',
    topic: 'copyrightability',
    claim_character: 'established',
    jurisdiction: 'United States (federal)',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      "CRC may state that, under current U.S. law, writing prompts alone -- even detailed or iterative ones -- generally does not establish sufficient human authorship for copyright purposes. CRC must not state a conclusion about whether the user's own workflow, specifically, meets or fails this bar.",
    crc_candidate_statement:
      "Under current U.S. copyright law, writing prompts alone -- even detailed or iterative ones -- generally doesn't establish sufficient human authorship on its own. Additional human creative involvement, such as selecting, arranging, or editing the output, is generally what supports a copyright claim.",
    applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    unresolved_project_dependencies: ['human_contribution_description'],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-08-16',
    superseded_by: null,
  },
  {
    claim_id: 'CLAIM-COPY-003-v1',
    topic: 'copyrightability',
    claim_character: 'established',
    jurisdiction: 'United States (federal)',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      "CRC may state that, under current U.S. law, human selection, arrangement, or creative editing of AI-generated material can independently support a copyright claim even when the underlying AI-generated elements do not, while being explicit that this is evaluated case by case and CRC cannot determine whether it applies to the user's own project.",
    crc_candidate_statement:
      "Under current U.S. copyright law, meaningfully selecting, arranging, or editing AI-generated material can support a copyright claim on its own, separate from whether the underlying AI-generated footage itself is protected. Whether this applies to a specific project is evaluated case by case.",
    applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    unresolved_project_dependencies: ['human_contribution_description'],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-08-16',
    superseded_by: null,
  },
  {
    claim_id: 'CLAIM-COPY-004-v1',
    topic: 'copyright_ownership',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    // CRC publication approved 2026-08-17 (CRC Approver: JD/PM), after
    // source-hardening research (U.S. + comparative Global-scope pass
    // across UK/EU/Taiwan/Japan) -- see GOVERNED-CLAIMS.md's own Source
    // references for this claim and
    // 01_Business/research/COPY-004-SOURCE-HARDENING-RESEARCH-2026.md.
    // The first non-platform copyright claim published to CRC. COPY-001/
    // 002/003 and REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 remain Pending --
    // deliberately not changed by this same decision.
    crc_eligible: 'Yes',
    crc_publication_scope:
      "CRC may state that a platform's commercial-use permission and copyright ownership/copyrightability are two separate questions, without conflating one for the other.",
    crc_candidate_statement:
      "Whether a platform's terms allow commercial use of the output, and whether that output is copyrighted (and who owns it), are two separate questions -- a platform granting commercial-use permission doesn't by itself answer either.",
    applicability_requirements: [],
    // Unconditionally true regardless of case facts -- a framing/conceptual
    // claim, not one whose application depends on the specific project.
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-08-16',
    superseded_by: null,
  },

  // ── Third-Party Source Assets / Stock Media Licensing (M3, 2026-08-18) ──

  {
    claim_id: 'CLAIM-STOCK-EDITORIAL-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    // SUPERSEDED 2026-08-27 (Governance Correction Review,
    // governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_
    // 2026-08-27.md): provider_scope: null was broader than this claim's own
    // evidenced, disclosed scope (its own comment below already named
    // "four independently-researched providers" -- never an open-ended
    // "any provider" set). `superseded_by` now points to
    // CLAIM-STOCK-EDITORIAL-001-v2, which lookupTopicClaims()'s own
    // `c.superseded_by === null` filter excludes this entry via before
    // Lifecycle/crc_eligible are ever evaluated -- this entry can no longer
    // become a Retrieval candidate regardless of the fields below. `lifecycle`
    // updated to 'Deprecated' to match the now-corrected GOVERNED-CLAIMS.md
    // record. `crc_eligible`/crc_publication_scope/crc_candidate_statement
    // deliberately left UNCHANGED below -- they are preserved as the
    // historical record of what was actually reviewed and CRC-approved on
    // 2026-08-18, exactly mirroring GOVERNED-CLAIMS.md's own "CRC Approver:
    // JD (PM)" line, which was likewise left untouched as historical fact,
    // not retroactively edited.
    lifecycle: 'Deprecated',
    // CRC publication approved 2026-08-18 (CRC Approver: JD/PM), following
    // Formal CRC-Publication Review #1 (recommendation A -- PASS/GO AS-IS;
    // see governance-reviews/CPR_001_CLAIM-STOCK-EDITORIAL-001-v1_2026-08-18.md).
    // The first Third-Party Source Assets claim, and the second claim
    // overall (after CLAIM-COPY-004-v1), to reach CRC. The other four stock
    // claims (-002 and the three provider-specific claims) were separately
    // reviewed and approved for CRC eligibility later the same day (CPR_002-
    // CPR_005) -- this comment previously read "remain Pending," which had
    // gone stale; corrected 2026-08-21 (governance-recording milestone,
    // documentation-only -- no field value below changed).
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state that stock-media content a provider designates "Editorial" is generally licensed for descriptive/newsworthy use rather than advertising, promotional, endorsement, or merchandising use, and that some providers offer a separate authorization path CRC cannot confirm was used for the user\'s specific asset. CRC must not state whether the user\'s own specific asset is Editorial-designated, whether their use violates any license, or whether separate authorization exists for it.',
    crc_candidate_statement:
      'A stock-media provider\'s standard license for content marked "Editorial" generally covers descriptive, newsworthy, or public-interest use -- not advertising, promotional, endorsement, or merchandising use. Some providers offer a separate process to authorize commercial use of Editorial content for a specific asset, though this doesn\'t confirm whether that was obtained for yours.',
    applicability_requirements: [],
    unresolved_project_dependencies: ['which_provider', 'editorial_designation_confirmed', 'separate_authorization_obtained'],
    // Generic (provider-agnostic) claim -- a topic candidate regardless of
    // which provider (if any) the user named. See module header.
    // HISTORICAL VALUE, preserved unchanged -- see the SUPERSEDED comment
    // above. The corrected scope lives on CLAIM-STOCK-EDITORIAL-001-v2 below.
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-08-17',
    superseded_by: 'CLAIM-STOCK-EDITORIAL-001-v2',
  },
  {
    claim_id: 'CLAIM-STOCK-EDITORIAL-001-v2',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    // Supersedes CLAIM-STOCK-EDITORIAL-001-v1 (2026-08-27, Governance
    // Correction Review, governance-reviews/FGR_007_STOCK_EDITORIAL_
    // PROVIDER_SCOPE_CORRECTION_2026-08-27.md). Sole substantive change from
    // v1: provider_scope corrected from null to the four evidence-supported
    // providers below (see provider_scope comment). crc_eligible: 'Yes' here
    // is a BOUNDED REAFFIRMATION per FGR_007 §6, not a new substantive CRC
    // Publication Review -- the original CPR_001 text-safety/routing
    // analysis remains valid unchanged; narrowing provider_scope strictly
    // reduces reachability and introduces no new overclaiming risk.
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state that stock-media content a provider designates "Editorial" is generally licensed for descriptive/newsworthy use rather than advertising, promotional, endorsement, or merchandising use, and that some providers offer a separate authorization path CRC cannot confirm was used for the user\'s specific asset. CRC must not state whether the user\'s own specific asset is Editorial-designated, whether their use violates any license, or whether separate authorization exists for it.',
    crc_candidate_statement:
      'A stock-media provider\'s standard license for content marked "Editorial" generally covers descriptive, newsworthy, or public-interest use -- not advertising, promotional, endorsement, or merchandising use. Some providers offer a separate process to authorize commercial use of Editorial content for a specific asset, though this doesn\'t confirm whether that was obtained for yours.',
    applicability_requirements: [],
    unresolved_project_dependencies: ['which_provider', 'editorial_designation_confirmed', 'separate_authorization_obtained'],
    // CORRECTED (2026-08-27): the four providers v1's own evidence already
    // named as "independently-researched" (Getty/iStock Tier 1, Adobe
    // Stock/Shutterstock disclosed-weaker tiers) -- a narrower, evidence-
    // accurate replacement for v1's unconditional null match, not an
    // expansion. Real, individually-evidenced provider identities only --
    // never a media-domain filter; a future fifth stock provider does not
    // inherit this claim without its own governance review.
    provider_scope: ['getty', 'istock', 'shutterstock', 'adobe-stock'],
    tool_scope: null,
    last_verified: '2026-08-27',
    superseded_by: null,
  },
  {
    claim_id: 'CLAIM-STOCK-EDITORIAL-002-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    // SUPERSEDED 2026-08-27 -- same defect/correction philosophy as
    // CLAIM-STOCK-EDITORIAL-001-v1 above (see that entry's own SUPERSEDED
    // comment). superseded_by now points to CLAIM-STOCK-EDITORIAL-002-v2.
    // crc_eligible/crc_publication_scope/crc_candidate_statement below
    // deliberately left UNCHANGED as the historical record.
    lifecycle: 'Deprecated',
    // CRC publication approved 2026-08-18 (CRC Approver: JD/PM), following
    // Formal CRC-Publication Review #2 (recommendation B -- PASS/GO WITH
    // BOUNDED CRC COPY ADJUSTMENT; see governance-reviews/CPR_002_CLAIM-
    // STOCK-EDITORIAL-002-v1_2026-08-18.md) and the bounded text correction
    // below (restores the provider-evidence caveat already present in the
    // governed Claim proposition -- Getty/iStock/Shutterstock confirmed,
    // Adobe Stock explicitly not -- which the pre-correction CRC-facing
    // text had omitted). The third claim overall, and second Third-Party
    // Source Assets claim, to reach CRC (after CLAIM-COPY-004-v1 and
    // CLAIM-STOCK-EDITORIAL-001-v1). Getty/iStock/Shutterstock provider-
    // specific claims remain Pending -- deliberately not changed by this
    // same decision.
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state that content Getty, iStock, or Shutterstock designate "Editorial" is typically supplied without the model or property releases that would otherwise support broader commercial use, as a separate consideration from whether the applicable license permits a given use, and that this hasn\'t been independently confirmed for every stock-media provider, including Adobe Stock. CRC must not state whether the user\'s own specific asset has or lacks a release, or draw any conclusion from that about whether their use is permitted.',
    crc_candidate_statement:
      'Content that Getty, iStock, or Shutterstock mark "Editorial" is typically supplied without the model or property releases that would otherwise support broader commercial use -- a separate question from whether the applicable license itself permits your intended use. This hasn\'t been independently confirmed for every stock-media provider, including Adobe Stock.',
    applicability_requirements: [],
    unresolved_project_dependencies: ['which_provider', 'editorial_designation_confirmed', 'release_status_confirmed'],
    // HISTORICAL VALUE, preserved unchanged -- see the SUPERSEDED comment
    // above. The corrected scope lives on CLAIM-STOCK-EDITORIAL-002-v2 below.
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-08-17',
    superseded_by: 'CLAIM-STOCK-EDITORIAL-002-v2',
  },
  {
    claim_id: 'CLAIM-STOCK-EDITORIAL-002-v2',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    // Supersedes CLAIM-STOCK-EDITORIAL-002-v1 (2026-08-27, Governance
    // Correction Review, governance-reviews/FGR_007_STOCK_EDITORIAL_
    // PROVIDER_SCOPE_CORRECTION_2026-08-27.md). Sole substantive change from
    // v1: provider_scope corrected from null to ['getty','istock',
    // 'shutterstock'] -- Adobe Stock DELIBERATELY EXCLUDED, matching this
    // claim's own crc_candidate_statement below, which already names only
    // these three providers by name. This claim's corrected scope is
    // narrower than CLAIM-STOCK-EDITORIAL-001-v2's -- a deliberate,
    // evidence-driven difference, not a shared blanket correction.
    // crc_eligible: 'Yes' here is a BOUNDED REAFFIRMATION per FGR_007 §6,
    // not a new substantive CRC Publication Review -- the original CPR_002
    // analysis remains valid unchanged.
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state that content Getty, iStock, or Shutterstock designate "Editorial" is typically supplied without the model or property releases that would otherwise support broader commercial use, as a separate consideration from whether the applicable license permits a given use, and that this hasn\'t been independently confirmed for every stock-media provider, including Adobe Stock. CRC must not state whether the user\'s own specific asset has or lacks a release, or draw any conclusion from that about whether their use is permitted.',
    crc_candidate_statement:
      'Content that Getty, iStock, or Shutterstock mark "Editorial" is typically supplied without the model or property releases that would otherwise support broader commercial use -- a separate question from whether the applicable license itself permits your intended use. This hasn\'t been independently confirmed for every stock-media provider, including Adobe Stock.',
    applicability_requirements: [],
    unresolved_project_dependencies: ['which_provider', 'editorial_designation_confirmed', 'release_status_confirmed'],
    // CORRECTED (2026-08-27): Adobe Stock deliberately excluded -- this
    // claim's own evidence explicitly and repeatedly excludes it (see the
    // governed markdown entry's own Source references). Real,
    // individually-evidenced provider identities only.
    provider_scope: ['getty', 'istock', 'shutterstock'],
    tool_scope: null,
    last_verified: '2026-08-27',
    superseded_by: null,
  },
  {
    claim_id: 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state that Getty\'s standard Editorial-content license excludes commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, and marketing use absent express written authorization, and that Getty separately offers a Rights and Clearance function through which such authorization may be sought. CRC must not state whether the user\'s own specific Getty asset is Editorial-designated, whether authorization was obtained for it, or whether their use is therefore permitted.',
    crc_candidate_statement:
      'Getty\'s standard Editorial Content license doesn\'t cover commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, or marketing use unless Getty has expressly authorized it in writing -- Getty offers a separate "Rights and Clearance" process for seeking that authorization, including for advertising and promotional use specifically.',
    applicability_requirements: [],
    unresolved_project_dependencies: ['asset_confirmed_getty', 'editorial_designation_confirmed', 'separate_authorization_obtained'],
    // Provider-specific -- a topic candidate ONLY when 'getty' is among the
    // conversation's active, canonically-resolved asset providers.
    provider_scope: ['getty'],
    tool_scope: null,
    last_verified: '2026-08-17',
    superseded_by: null,
  },
  {
    claim_id: 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state that Shutterstock distinguishes Commercial content (usable to commercialize, monetize, sell, promote, or advertise) from Editorial content (which cannot be used for those purposes), and that Shutterstock has publicly described a Rights and Clearance service for seeking third-party permissions for promotional use of Editorial assets, whose exact mechanics CRC has not independently verified. CRC must not state whether the user\'s own specific Shutterstock asset is Editorial-designated, whether Rights and Clearance was engaged for it, or whether their use is therefore permitted.',
    crc_candidate_statement:
      'Shutterstock treats content as Commercial if it can be used to commercialize, monetize, sell, promote, or advertise a product, business, or service, and as Editorial if it can\'t be used for those purposes. Shutterstock has publicly described a "Rights and Clearance" service for seeking permission to use Editorial content this way, though the exact details of that process haven\'t been independently confirmed.',
    applicability_requirements: [],
    unresolved_project_dependencies: ['asset_confirmed_shutterstock', 'editorial_designation_confirmed', 'rights_and_clearance_status'],
    provider_scope: ['shutterstock'],
    tool_scope: null,
    last_verified: '2026-08-17',
    superseded_by: null,
  },
  {
    claim_id: 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state that iStock\'s standard license excludes commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, and merchandising use of content marked "editorial use only," and that no provider-run authorization mechanism for such use was found during CRC\'s underlying research -- stated as an absence of evidence, never as a confirmed fact that none exists. CRC must not state whether the user\'s own specific iStock asset is Editorial-designated, or whether their use is therefore permitted.',
    crc_candidate_statement:
      'iStock\'s standard license doesn\'t cover commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, or merchandising use of content marked "editorial use only." No provider-run process for authorizing that kind of use was found during this research -- that means none was found, not that none exists.',
    applicability_requirements: [],
    unresolved_project_dependencies: ['asset_confirmed_istock', 'editorial_designation_confirmed'],
    provider_scope: ['istock'],
    tool_scope: null,
    last_verified: '2026-08-17',
    superseded_by: null,
  },
  {
    // Music Scenario A -- Artlist A-3 (CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-
    // DURATION-001-v1). First real Music-domain fixture entry (2026-08-27,
    // A-3 CRC Publication Recording task). Adopted 2026-08-27 (FGR_006).
    // CPR_007 recommended WITHHOLD for all 10 Music Scenario A claims,
    // citing a shared runtime-verification prerequisite; A-3's own
    // disposition within that combined review was "runtime prerequisite
    // only... Substantively CONDITIONALLY READY, the strongest-evidenced
    // candidate in the whole set" (CPR_007 §4). That prerequisite was
    // cleared by the Artlist A-3 Synthetic Runtime Canary (throwaway,
    // never-committed synthetic-eligible clone, CPR_001/CPR_003 precedent)
    // and the Artlist Provider Registration Canary Integration Review
    // (independently re-proved zero unintended reachability against the
    // real fixture). CRC Publication approved 2026-08-27 (CRC Approver:
    // JD (PM)) -- see GOVERNED-CLAIMS.md's own CRC PUBLICATION APPROVED
    // note for the full evidence chain. This approval covers A-3 ONLY --
    // the other 9 Music Scenario A claims remain unrepresented here (see
    // CLAIMS_WITHOUT_FIXTURE_REPRESENTATION in
    // topic-claims-fixture-consistency.test.ts) and CRC Approver: PENDING
    // in GOVERNED-CLAIMS.md, unchanged.
    claim_id: 'CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state that Artlist\'s own stated policy is that a Project created and published while a subscription was active remains licensed indefinitely after cancellation (including for continued monetization), while new use of downloaded Assets after cancellation is not covered, and that this claim does not itself confirm whether the user\'s own specific project was actually completed and published while their subscription was active. CRC must not state that the user\'s own project IS validly licensed, that their subscription was active at the relevant time, or that their project is commercially cleared.',
    crc_candidate_statement:
      'Artlist\'s stated policy is that already-completed, already-published work stays licensed after cancellation, while new use does not.',
    applicability_requirements: [],
    // Evidence-only: account-history/documentary fact, not registered in
    // dependency-askability.ts -- fail-closed by default. No DAR
    // performed or proposed by this milestone. Real CRC publication of
    // A-3 must not, and does not, create any new user-facing question.
    unresolved_project_dependencies: ['artlist_subscription_active_at_publication_confirmed'],
    provider_scope: ['artlist'],
    tool_scope: null,
    last_verified: '2026-08-27',
    superseded_by: null,
  },
  {
    // First real tool_scope-narrowed TopicClaim runtime entry (LK-7 tool
    // scope primitive; LK-9/LK-10 canonical tool identity registry, 2026-
    // 08-29; CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1 Adopted 2026-08-29,
    // FGR_009). CRC Publication approved 2026-08-30 (CRC Approver: JD (PM))
    // following CPR_009 -- initial recommendation DEFER pending a targeted
    // Synthesia AUP/Help Center evidence refresh (LK-37, Classification A --
    // SUBSTANTIVELY CONFIRMED), then human APPROVE (LK-38) -- see
    // GOVERNED-CLAIMS.md's own CRC Publication Scope and
    // governance-reviews/CPR_009_CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1
    // _2026-08-30.md for the full decision sequence and publication-safety
    // analysis. tool_scope narrows this claim to conversations with a
    // confirmed, canonical 'synthesia' ToolMention -- no PLATFORM-RIGHTS-
    // MATRIX.md coverage exists for Synthesia (NO MATRIX COVERAGE FOUND,
    // confirmed at CPR), so no legacy-coexistence conflict applies. Both
    // unresolved_project_dependencies are evidence-only, non-askable, and
    // permanently gate Bounded Interpretation to
    // relevant_applicability_unresolved (Case 3B) -- CRC publication does
    // not resolve, and cannot resolve, either one. No extraction alias for
    // 'synthesia' exists in extraction.ts -- this entry proves canonical
    // runtime retrieval given a confirmed synthesia ToolMention; it does not
    // establish ordinary conversational reachability, a separate,
    // independently-timed concern (CPR_007's own established finding).
    claim_id: 'CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state that Synthesia\'s Acceptable Use Policy restricts using a Stock Avatar in paid advertising or promotion -- including paid social ads, paid TV ads, and broadcast -- absent Synthesia\'s own written express consent, and that non-paid use (e.g. organic posts, internal/training videos) is not restricted by this specific clause. This is Synthesia\'s own provider/platform policy, not law. CRC must not state whether a specific project used a Stock or Custom Avatar, whether Synthesia has granted written consent for any specific case, or whether the restriction therefore applies to the user\'s own project. CRC must not represent the project as commercially or legally cleared, and must not treat either evidence-only dependency (synthesia_stock_avatar_used_confirmed, synthesia_written_consent_obtained) as a self-attestation question -- both remain permanently unresolved through Bounded Interpretation\'s Case 3B boundary, exactly as for every other dependency-bearing claim in this corpus.',
    crc_candidate_statement:
      'Synthesia\'s Acceptable Use Policy restricts using a Stock Avatar in paid advertising or promotion -- including paid social media ads, paid TV ads, and broadcast -- unless Synthesia has given written express consent; use that isn\'t paid promotion, such as organic posts or internal/training videos, isn\'t restricted by this specific clause.',
    applicability_requirements: [],
    // Evidence-only: neither dependency is registered in
    // dependency-askability.ts -- fail-closed by default. No DAR performed
    // or proposed by this milestone. Real CRC publication does not, and
    // cannot, create any new user-facing question about either.
    unresolved_project_dependencies: ['synthesia_stock_avatar_used_confirmed', 'synthesia_written_consent_obtained'],
    provider_scope: null,
    tool_scope: ['synthesia'],
    last_verified: '2026-08-30',
    superseded_by: null,
  },
  {
    // First real provider_scope-narrowed TopicClaim runtime entry since the
    // original Stock/Music domain build-out (CLAIM-MUSIC-ARTLIST-PROJECT-
    // LICENSE-DURATION-001-v1 / A-3 was the first of any kind). Trial 2 of
    // the Living Knowledge onboarding benchmark (LK-42 protocol);
    // CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1 Adopted
    // 2026-08-30 (FGR_010). CRC Publication approved 2026-08-30 (CRC
    // Approver: JD (PM)) following CPR_010 -- unlike the Synthesia
    // precedent, no intervening DEFER (evidence freshness well within
    // tolerance: Individual Agreement 73 days old, Small Business Agreement
    // ~10.3 months old, at review) -- see GOVERNED-CLAIMS.md's own CRC
    // Publication Scope and governance-reviews/CPR_010_CLAIM-STORYBLOCKS-
    // BUSINESS-LICENSE-BROADCAST-001-v1_2026-08-30.md for the full
    // publication-safety analysis. provider_scope narrows this claim to
    // conversations with a confirmed, canonical 'storyblocks'
    // AssetProviderMention -- no PLATFORM-RIGHTS-MATRIX.md coverage exists
    // for Storyblocks (NO MATRIX COVERAGE FOUND, confirmed at CPR), so no
    // legacy-coexistence conflict applies. The unresolved_project_
    // dependency is evidence-only, non-askable, and permanently gates
    // Bounded Interpretation to relevant_applicability_unresolved (Case
    // 3B) -- CRC publication does not resolve, and cannot resolve, it. No
    // extraction alias for 'storyblocks' exists in extraction.ts -- this
    // entry proves canonical runtime retrieval given a confirmed
    // storyblocks AssetProviderMention; it does not establish ordinary
    // conversational reachability, a separate, independently-timed concern
    // (CPR_007's own established finding).
    claim_id: 'CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'APPROVED FOR CRC PUBLICATION (2026-08-30, CRC Approver: JD (PM) -- see CRC Publication Review #10, CPR_010, governance-reviews/CPR_010_CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1_2026-08-30.md). CRC may state that Storyblocks\' Individual and Small Business License Agreements (captured 2026-08-30; Individual Agreement Last updated June 18, 2026, Small Business Agreement Last updated October 20, 2025) exclude the right to use Stock Files in Broadcast, Television, or OTT platforms unless that use is explicitly included in the user\'s selected subscription plan, and that Storyblocks\' own licensing materials identify the Business License as covering broadcast, TV, streaming/OTT, and feature-film distribution. This is Storyblocks\' own provider/platform licensing policy, not law. CRC must not state that every non-Business Storyblocks subscription categorically prohibits Broadcast/Television/OTT use -- the exclusion is plan-contingent, not tier-name-absolute. CRC must not state which specific Storyblocks license or plan a user actually holds, must not state whether a specific project\'s Storyblocks-sourced assets are actually broadcast/OTT-cleared, must not state that holding a Business License by itself commercially clears a project, and must not state or imply that all rights, releases, or authorizations necessary for the project have been obtained or that the project is otherwise commercially cleared. The evidence-only dependency (storyblocks_license_tier_confirmed) remains permanently unresolved through Bounded Interpretation\'s Case 3B boundary, exactly as for every other dependency-bearing claim in this corpus. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project\'s own Storyblocks license status.',
    crc_candidate_statement:
      'Storyblocks\' Individual and Small Business License Agreements state that their license does not include the right to use Stock Files in Broadcast, Television, or OTT platforms unless that use is explicitly included in the subscription plan you selected. Storyblocks\' own licensing materials identify the Business License specifically as covering broadcast, TV, streaming/OTT, and feature-film distribution.',
    applicability_requirements: [],
    // Evidence-only: absent from dependency-askability.ts -- fail-closed by
    // default. No DAR performed or proposed by this milestone. Real CRC
    // publication does not, and cannot, create any new user-facing
    // question about it.
    unresolved_project_dependencies: ['storyblocks_license_tier_confirmed'],
    provider_scope: ['storyblocks'],
    tool_scope: null,
    last_verified: '2026-08-30',
    superseded_by: null,
  },
  {
    // Third real provider_scope-narrowed TopicClaim runtime entry (after
    // A-3/Artlist and Storyblocks). Trial 3 of the Living Knowledge
    // onboarding benchmark (LK-42 protocol); CLAIM-POND5-EDITORIAL-
    // COMMERCIAL-USE-CONSENT-001-v1 Adopted 2026-08-30 (FGR_011, following
    // an intervening REVISE -- LK-60 -- that removed a Tier 2
    // contact-process sentence from the original Candidate Statement). CRC
    // Publication approved 2026-08-30 (CRC Approver: JD (PM)) following
    // CPR_011, no intervening DEFER -- see GOVERNED-CLAIMS.md's own CRC
    // Publication Scope and governance-reviews/CPR_011_CLAIM-POND5-
    // EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1_2026-08-30.md for the full
    // publication-safety analysis, including the explicit reconciliation
    // that Class B human-verified-rendered-page capture provenance does
    // not, and per EVIDENCE-CAPTURE-SOP.md's own discipline cannot,
    // downgrade the governing Content License Agreement's own Tier 1
    // source authority. Unlike Synthesia/Storyblocks (topic:
    // 'commercial_use', reached only via Track A discovery from a
    // provider mention), this claim's own topic is 'third_party_source_
    // rights' -- the same reachability shape as the Getty/iStock/
    // Shutterstock Editorial claims it structurally mirrors, reachable via
    // an explicit third_party_source_rights UserGoal directly.
    // provider_scope narrows this claim to conversations with a
    // confirmed, canonical 'pond5' AssetProviderMention -- no
    // PLATFORM-RIGHTS-MATRIX.md coverage exists for Pond5 (NO MATRIX
    // COVERAGE FOUND, confirmed at CPR), so no legacy-coexistence
    // conflict applies. Both unresolved_project_dependencies are
    // evidence-only, non-askable, reused (not newly minted) from the
    // identical Getty/iStock/Shutterstock Editorial claims, and
    // permanently gate Bounded Interpretation to relevant_applicability_
    // unresolved (Case 3B) -- CRC publication does not resolve, and
    // cannot resolve, either one. No pond5_license_tier_confirmed
    // dependency exists -- this proposition does not turn on license
    // tier. No extraction alias for 'pond5' exists in extraction.ts --
    // this entry proves canonical runtime retrieval given a confirmed
    // pond5 AssetProviderMention; it does not establish ordinary
    // conversational reachability, a separate, independently-timed
    // concern (CPR_007's own established finding).
    claim_id: 'CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'APPROVED FOR CRC PUBLICATION (2026-08-30, CRC Approver: JD (PM) -- see CRC Publication Review #11, CPR_011, governance-reviews/CPR_011_CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1_2026-08-30.md). CRC may state that Pond5\'s Content License Agreement identifies content Pond5 marks Editorial as intended for newsworthy or general-public-interest use, and that -- absent Pond5\'s own express and specific written consent -- that Agreement restricts Editorial Content from use in merchandise, advertisement (other than in-context advertising of a Production in which it has been incorporated), endorsement, promotion, advertorial, or other commercial Production. This is Pond5\'s own provider/platform licensing policy, not law. CRC must not state whether the user\'s own specific Pond5 asset is Item-Page-designated Editorial, must not state whether Pond5 granted express and specific written consent for any specific case, must not state that every Editorial-designated Pond5 asset is permanently barred from commercial use (the exclusion is contingent on Pond5\'s own consent, not absolute), must not treat a user\'s statement that they contacted Pond5 as evidence that authorization was obtained, and must not state or imply that all rights, releases, or authorizations necessary for the project have been obtained or that the project is otherwise commercially cleared. The evidence-only dependencies (editorial_designation_confirmed, separate_authorization_obtained) remain permanently unresolved through Bounded Interpretation\'s Case 3B boundary, exactly as for every other dependency-bearing claim in this corpus. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project\'s own Pond5 Editorial-content status.',
    crc_candidate_statement:
      'Pond5\'s Content License Agreement states that content Pond5 identifies as Editorial is intended for newsworthy or general-public-interest use, and -- absent Pond5\'s express and specific written consent -- restricts that content from use in merchandise, advertising, endorsements, promotions, advertorials, or other commercial productions.',
    applicability_requirements: [],
    // Evidence-only: both absent from dependency-askability.ts -- fail-
    // closed by default. No DAR performed or proposed by this milestone.
    // Real CRC publication does not, and cannot, create any new
    // user-facing question about either.
    unresolved_project_dependencies: ['editorial_designation_confirmed', 'separate_authorization_obtained'],
    provider_scope: ['pond5'],
    tool_scope: null,
    last_verified: '2026-08-30',
    superseded_by: null,
  },
  {
    // Fourth real provider_scope-narrowed TopicClaim runtime entry (after
    // A-3/Artlist, Storyblocks, Pond5). Trial 4 of the Living Knowledge
    // onboarding benchmark -- the first trial run under the LK-68/LK-68A
    // prospective benchmark instrumentation. CLAIM-ADOBESTOCK-AI-STUDIO-
    // COMMERCIALLY-SAFE-LABEL-001-v1 Adopted 2026-08-31 (FGR_012, following
    // an intervening REVISE -- LK-73 -- that removed an "Adobe provides
    // IP indemnification protection" clause from the original Candidate
    // Statement, since no directly-read source establishes that "Commercially
    // safe" is equivalent to the separately-defined, conditioned, capped
    // "Indemnified Firefly Output" contractual term). CRC Publication
    // approved 2026-08-31 (CRC Approver: JD (PM)) following CPR_012, no
    // intervening DEFER -- see GOVERNED-CLAIMS.md's own CRC Publication
    // Scope and governance-reviews/CPR_012_CLAIM-ADOBESTOCK-AI-STUDIO-
    // COMMERCIALLY-SAFE-LABEL-001-v1_2026-08-31.md for the full
    // publication-safety analysis. `provider_scope: ['adobe-stock']`
    // required zero registry work -- already canonically registered before
    // this trial, unlike Pond5/Storyblocks. `topic: 'commercial_use'` was
    // reverified at FGR against the real GoalCategory enum rather than
    // reflexively copied from the Getty/Pond5 `third_party_source_rights`
    // shape -- reachable via an explicit `commercial_use` UserGoal, the
    // same shape as Synthesia/Storyblocks. THE FIRST CLAIM IN THIS CORPUS
    // WITH `unresolved_project_dependencies: []` FROM ADOPTION -- a
    // deliberate FGR-stage design (LK-73/74), not an oversight: the
    // proposition presents its Adobe/Firefly and partner-model branches
    // conditionally and does not select either branch for the user's
    // project, so Bounded Interpretation does not require gating a
    // project-specific fact to stay safe. CPR_012 empirically confirmed
    // (via the existing generic synthetic-eligibility-canary.ts harness,
    // no domain-specific harness created) that this resolves Bounded
    // Interpretation to `directly_relevant` -- NOT Case 3B, correctly,
    // since there is nothing to gate on -- while Composition still renders
    // only the claim's own self-hedged attributed text plus the fixed,
    // universal, domain-blind hedge every `directly_relevant`
    // interpretation carries, never overstating the conclusion for any
    // specific project. No PLATFORM-RIGHTS-MATRIX.md coverage exists for
    // Adobe Stock as a provider (NO MATRIX COVERAGE FOUND, confirmed at
    // CPR; the unrelated `adobe-firefly` Matrix row is tool-scoped, not
    // provider-scoped, and is never read by this claim since
    // `tool_scope: null`). No extraction alias for 'adobe-stock' exists in
    // extraction.ts -- this entry proves canonical runtime retrieval given
    // a confirmed adobe-stock AssetProviderMention; it does not establish
    // ordinary conversational reachability, a separate,
    // independently-timed concern (CPR_007's own established finding).
    // The separate contractual "Indemnified Firefly Output" claim family
    // remains completely unresearched and, per CPR_012 §16, structurally
    // absent from this claim's own runtime representation -- not part of
    // this entry, not authorized for CRC by it.
    claim_id: 'CLAIM-ADOBESTOCK-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'APPROVED FOR CRC PUBLICATION (2026-08-31, CRC Approver: JD (PM) -- see CRC Publication Review #12, CPR_012, governance-reviews/CPR_012_CLAIM-ADOBESTOCK-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001-v1_2026-08-31.md). CRC may state that Adobe\'s official AI Studio help material describes content labeled "Commercially safe" as generated with Adobe\'s own Firefly model, trained on content Adobe has permission or rights to use, and says this content may be used in commercial projects, and that for content generated using a partner (non-Adobe) AI model, Adobe says it cannot verify the training data or whether the output may contain third-party intellectual property, directing users to review that model\'s own terms before commercial use. This is Adobe\'s own product/help representation, not a legal or contractual conclusion. CRC must not state that "Commercially safe" is equivalent to, or triggers, Adobe\'s separate Tier 1 "Indemnified Firefly Output" contractual indemnification regime or its conditions/liability cap, must not state which AI model was used for any specific project\'s generation, must not state that a "Commercially safe" designation was actually displayed or applies to any specific asset, must not state that reviewing a partner model\'s own terms itself grants or confirms commercial permission, and must not state or imply that all rights, releases, or authorizations necessary for the project have been obtained or that the project is otherwise commercially cleared. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project\'s own Adobe Stock AI Studio model/label status.',
    crc_candidate_statement:
      'Adobe\'s official AI Studio help material describes content labeled "Commercially safe" as generated with Adobe\'s own Firefly model, trained on content Adobe has permission or rights to use, and says this content may be used in commercial projects. For content generated using a partner (non-Adobe) AI model, Adobe says it cannot verify the training data or whether the output may contain third-party intellectual property, and directs users to review that model\'s own terms before commercial use.',
    applicability_requirements: [],
    // Deliberately empty -- see this entry's own header comment above and
    // CPR_012 §7/§15. Not a data-completeness gap; a reviewed, empirically
    // stress-tested design decision.
    unresolved_project_dependencies: [],
    provider_scope: ['adobe-stock'],
    tool_scope: null,
    last_verified: '2026-08-31',
    superseded_by: null,
  },
]
