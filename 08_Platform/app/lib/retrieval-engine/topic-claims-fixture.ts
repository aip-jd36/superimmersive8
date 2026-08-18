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
 * `lifecycle: 'Adopted'` on all four. Still `crc_eligible: 'Pending'` on
 * all four, deliberately: CRC-eligible publication is an explicitly
 * SEPARATE decision from Adoption (per this document's own governance
 * discipline, and PM's explicit NO-GO on CRC publication for all four at
 * this time). `lookupTopicClaims()` requires BOTH `lifecycle === 'Adopted'
 * && crc_eligible === 'Yes'` before a claim can ever reach `matches[]` --
 * `crc_eligible: 'Pending'` alone is sufficient to keep all four
 * completely excluded from CRC Topic Retrieval, unchanged from their
 * pre-adoption behavior. This is the concrete Phase 1 acceptance-test
 * proof that lookupTopicClaims() correctly excludes non-CRC-eligible
 * claims (now specifically reviewer-only, not merely un-adopted) from
 * ever reaching CRC output, using REAL Wave 1 content rather than a
 * synthetic test fixture -- see
 * __tests__/retrieval-engine/lookup-topic-claims.test.ts and the
 * dedicated Wave-1-specific exclusion test in
 * __tests__/retrieval-engine/wave1-candidate-claims-excluded.test.ts.
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
 * pressure-test scenarios. `CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1`
 * remains `crc_eligible: 'Pending'` -- M3 is retrieval infrastructure only
 * and does not itself authorize CRC
 * publication for any claim; each claim's CRC eligibility is its own
 * separate, individually-made governance decision (M4). Until a given
 * claim's own decision is made, `lookupTopicClaims()`'s own existing
 * `lifecycle === 'Adopted' && crc_eligible === 'Yes'` gate excludes it from
 * `matches[]` exactly as it already does for COPY-001/002/003 below --
 * confirmed structurally, not by convention: provider narrowing is
 * evaluated as a candidate PRE-filter (before this gate is ever reached),
 * so a real, unmodified `crc_eligible: 'Pending'` claim is excluded
 * REGARDLESS of whether its provider_scope would otherwise match.
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
 * sentence in GOVERNED-CLAIMS.md, exactly mirroring how COPY-001/002/003
 * already store this text while still `Pending` -- the field always holds
 * the real governed text; `crc_eligible` alone controls whether it can
 * ever reach a result. `applicability_requirements`/`unresolved_project_
 * dependencies` are copied unmodified from the markdown, not broadened or
 * narrowed by this milestone.
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
    crc_eligible: 'Pending',
    crc_publication_scope:
      "CRC may state that, under current U.S. law, AI-generated video with no meaningful human creative contribution generally does not qualify for copyright protection, and that this is a distinct question from whether the video is safe to use commercially (see CLAIM-COPY-004). CRC must not state whether the user's own specific video qualifies.",
    crc_candidate_statement:
      "Under current U.S. copyright law, AI-generated video without meaningful human creative contribution generally isn't eligible for copyright protection. This is a different question from whether you're clear to use the video commercially.",
    applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    unresolved_project_dependencies: ['human_creative_contribution_level'],
    provider_scope: null,
    last_verified: '2026-08-16',
    superseded_by: null,
  },
  {
    claim_id: 'CLAIM-COPY-002-v1',
    topic: 'copyrightability',
    claim_character: 'established',
    jurisdiction: 'United States (federal)',
    lifecycle: 'Adopted',
    crc_eligible: 'Pending',
    crc_publication_scope:
      "CRC may state that, under current U.S. law, writing prompts alone -- even detailed or iterative ones -- generally does not establish sufficient human authorship for copyright purposes. CRC must not state a conclusion about whether the user's own workflow, specifically, meets or fails this bar.",
    crc_candidate_statement:
      "Under current U.S. copyright law, writing prompts alone -- even detailed or iterative ones -- generally doesn't establish sufficient human authorship on its own. Additional human creative involvement, such as selecting, arranging, or editing the output, is generally what supports a copyright claim.",
    applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    unresolved_project_dependencies: ['human_creative_contribution_level'],
    provider_scope: null,
    last_verified: '2026-08-16',
    superseded_by: null,
  },
  {
    claim_id: 'CLAIM-COPY-003-v1',
    topic: 'copyrightability',
    claim_character: 'established',
    jurisdiction: 'United States (federal)',
    lifecycle: 'Adopted',
    crc_eligible: 'Pending',
    crc_publication_scope:
      "CRC may state that, under current U.S. law, human selection, arrangement, or creative editing of AI-generated material can independently support a copyright claim even when the underlying AI-generated elements do not, while being explicit that this is evaluated case by case and CRC cannot determine whether it applies to the user's own project.",
    crc_candidate_statement:
      "Under current U.S. copyright law, meaningfully selecting, arranging, or editing AI-generated material can support a copyright claim on its own, separate from whether the underlying AI-generated footage itself is protected. Whether this applies to a specific project is evaluated case by case.",
    applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    unresolved_project_dependencies: ['human_creative_contribution_level'],
    provider_scope: null,
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
    last_verified: '2026-08-16',
    superseded_by: null,
  },

  // ── Third-Party Source Assets / Stock Media Licensing (M3, 2026-08-18) ──

  {
    claim_id: 'CLAIM-STOCK-EDITORIAL-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    // CRC publication approved 2026-08-18 (CRC Approver: JD/PM), following
    // Formal CRC-Publication Review #1 (recommendation A -- PASS/GO AS-IS;
    // see governance-reviews/CPR_001_CLAIM-STOCK-EDITORIAL-001-v1_2026-08-18.md).
    // The first Third-Party Source Assets claim, and the second claim
    // overall (after CLAIM-COPY-004-v1), to reach CRC. The other four stock
    // claims (-002 and the three provider-specific claims) remain Pending --
    // deliberately not changed by this same decision.
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state that stock-media content a provider designates "Editorial" is generally licensed for descriptive/newsworthy use rather than advertising, promotional, endorsement, or merchandising use, and that some providers offer a separate authorization path CRC cannot confirm was used for the user\'s specific asset. CRC must not state whether the user\'s own specific asset is Editorial-designated, whether their use violates any license, or whether separate authorization exists for it.',
    crc_candidate_statement:
      'A stock-media provider\'s standard license for content marked "Editorial" generally covers descriptive, newsworthy, or public-interest use -- not advertising, promotional, endorsement, or merchandising use. Some providers offer a separate process to authorize commercial use of Editorial content for a specific asset, though this doesn\'t confirm whether that was obtained for yours.',
    applicability_requirements: [],
    unresolved_project_dependencies: ['which_provider', 'editorial_designation_confirmed', 'separate_authorization_obtained'],
    // Generic (provider-agnostic) claim -- a topic candidate regardless of
    // which provider (if any) the user named. See module header.
    provider_scope: null,
    last_verified: '2026-08-17',
    superseded_by: null,
  },
  {
    claim_id: 'CLAIM-STOCK-EDITORIAL-002-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
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
    provider_scope: null,
    last_verified: '2026-08-17',
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
    last_verified: '2026-08-17',
    superseded_by: null,
  },
  {
    claim_id: 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Pending',
    crc_publication_scope:
      'CRC may state that Shutterstock distinguishes Commercial content (usable to commercialize, monetize, sell, promote, or advertise) from Editorial content (which cannot be used for those purposes), and that Shutterstock has publicly described a Rights and Clearance service for seeking third-party permissions for promotional use of Editorial assets, whose exact mechanics CRC has not independently verified. CRC must not state whether the user\'s own specific Shutterstock asset is Editorial-designated, whether Rights and Clearance was engaged for it, or whether their use is therefore permitted.',
    crc_candidate_statement:
      'Shutterstock treats content as Commercial if it can be used to commercialize, monetize, sell, promote, or advertise a product, business, or service, and as Editorial if it can\'t be used for those purposes. Shutterstock has publicly described a "Rights and Clearance" service for seeking permission to use Editorial content this way, though the exact details of that process haven\'t been independently confirmed.',
    applicability_requirements: [],
    unresolved_project_dependencies: ['asset_confirmed_shutterstock', 'editorial_designation_confirmed', 'rights_and_clearance_status'],
    provider_scope: ['shutterstock'],
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
    last_verified: '2026-08-17',
    superseded_by: null,
  },
]
