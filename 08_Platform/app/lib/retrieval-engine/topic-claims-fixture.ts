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
 *
 * CAH-4E (Human Reviewer Living Knowledge V1, 2026-09-09): every entry now
 * carries `publication_scope`, hand-synced verbatim from its GOVERNED-CLAIMS.md
 * `Publication scope:` line (all 24 are `'Reviewer/Commercial Assurance'` as
 * of this date). Read ONLY by `lib/reviewer-lk/`; the CRC retrieval path
 * (`retrieve.ts`, `lookupTopicClaims`, etc.) is byte-unchanged and never
 * references it. The consistency test now also asserts every fixture claim's
 * `publication_scope` matches the markdown -- it cannot silently diverge.
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-08-27',
    superseded_by: null,
  },
  {
    // Music Scenario A -- Artlist Remaining Claims activation (CPR_021,
    // 2026-09-10). Five of the six claims CPR_007 originally withheld
    // (2026-08-27) for the same shared runtime-verification prerequisite
    // A-3's own entry above describes -- that prerequisite is cleared for
    // every Artlist claim generically (provider registration is not
    // claim-specific). CPR_021 independently re-confirmed publication
    // safety for all six, five APPROVE (this one and its four siblings
    // below) and one WITHHOLD (CLAIM-MUSIC-ARTLIST-AI-TRAINING-EXCLUSION-
    // 001-v1 -- Publication Policy Principle 6 volatility concern, PM
    // concurred not to override; deliberately has NO fixture entry here or
    // anywhere in this file). PM concurrence 2026-09-10 (CRC Approver: JD
    // (PM)) -- see GOVERNED-CLAIMS.md's own CRC PUBLICATION APPROVED note
    // and governance-reviews/CPR_021_ARTLIST_REMAINING_CLAIMS_
    // RECONSIDERATION_2026-09-10.md for the full decision record. This
    // entry's own crc_candidate_statement below is CORRECTED from the
    // original FGR_006 draft (CPR_021 found the draft omitted the
    // Enterprise-threshold qualifier the governed Claim proposition itself
    // already carries) -- restored here, verified end-to-end through the
    // real, unmodified pipeline before this entry was added.
    claim_id: 'CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      "CRC may state that Artlist's Social license is exclusively for personal content creators and doesn't cover work made for clients or brands, paid or promoted videos, or broadcast use, and that the Pro/Business license covers client and brand work, paid or promoted videos, and commercials -- including broadcasting -- but that Pro/Business broadcasting is itself subject to Artlist's separate Enterprise or Max Business plan requirement for agencies, broadcasters, and larger companies. CRC must not state which license type the user's account actually holds, must not state whether the user's entity triggers the Enterprise/Max Business threshold, and must not state or imply that a Pro/Business license unconditionally covers broadcasting without that qualifier.",
    crc_candidate_statement:
      "Artlist's Social license is exclusively for personal content creators and doesn't cover work made for clients or brands, paid or promoted videos, or broadcast use. The Pro/Business license covers client and brand work, paid or promoted videos, and commercials -- including broadcasting -- but Pro/Business broadcasting is itself subject to Artlist's separate Enterprise or Max Business plan requirement for agencies, broadcasters, and larger companies.",
    applicability_requirements: [],
    // Both evidence-only: account/license-type facts, not registered in
    // dependency-askability.ts -- fail-closed by default, unchanged by
    // this activation. Permanently gates Bounded Interpretation to
    // relevant_applicability_unresolved (Case 3B), confirmed via the
    // real, unmodified pipeline before this entry was added.
    unresolved_project_dependencies: ['which_music_provider', 'artlist_license_type_confirmed'],
    provider_scope: ['artlist'],
    tool_scope: null,
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-10',
    superseded_by: null,
  },
  {
    // Music Scenario A -- Artlist Remaining Claims activation (CPR_021,
    // 2026-09-10). See CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1's own entry
    // immediately above for the shared activation context. Approved as
    // originally drafted -- no wording change (CPR_021 found this claim
    // "CONDITIONALLY READY... runtime prerequisite only," re-confirming
    // CPR_007's own prior finding).
    claim_id: 'CLAIM-MUSIC-ARTLIST-CLIENT-LICENSE-RETENTION-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      "CRC may state this exact structural fact: under Artlist's Pro/Business license, delivering a finished Project to a client does not transfer the underlying music license to that client -- the subscriber remains the license holder and remains responsible for the client's compliant use. CRC must not state that a specific client or collaborator is or is not complying with the license, must not state that the user currently holds any particular Artlist license type, and must not state or imply the project is otherwise commercially cleared.",
    crc_candidate_statement:
      "Under Artlist's Pro/Business license, delivering a finished Project to a client does not transfer the underlying music license to that client -- the subscriber remains the license holder and remains responsible for the client's compliant use.",
    applicability_requirements: [],
    // Genuinely empty -- confirmed universal across Artlist license types
    // at Adoption time. Resolves directly_relevant (no Case 3B hedge),
    // confirmed via the real, unmodified pipeline before this entry was
    // added.
    unresolved_project_dependencies: [],
    provider_scope: ['artlist'],
    tool_scope: null,
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-10',
    superseded_by: null,
  },
  {
    // Music Scenario A -- Artlist Remaining Claims activation (CPR_021,
    // 2026-09-10). See CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1's own entry
    // above for the shared activation context. Approved as originally
    // drafted -- no wording change. Its sibling,
    // CLAIM-MUSIC-ARTLIST-AI-TRAINING-EXCLUSION-001-v1 (same source
    // paragraph, distinct restriction category), remains WITHHELD and has
    // no fixture entry.
    claim_id: 'CLAIM-MUSIC-ARTLIST-STANDALONE-EXPLOITATION-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state this restriction plainly: Artlist Assets may only be used as part of an integrated Project, not distributed or exploited on their own. CRC must not state whether the user\'s own specific output configuration constitutes "standalone" use under Artlist\'s own terms.',
    crc_candidate_statement: 'Artlist Assets may only be used as part of an integrated Project, not distributed or exploited on their own.',
    applicability_requirements: [],
    // Genuinely empty -- confirmed universal, unconditional on tier.
    // Resolves directly_relevant (no Case 3B hedge), confirmed via the
    // real, unmodified pipeline before this entry was added.
    unresolved_project_dependencies: [],
    provider_scope: ['artlist'],
    tool_scope: null,
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-10',
    superseded_by: null,
  },
  {
    // Music Scenario A -- Artlist Remaining Claims activation (CPR_021,
    // 2026-09-10). See CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1's own entry
    // above for the shared activation context. This entry's own
    // crc_candidate_statement/crc_publication_scope below are CORRECTED
    // from the original FGR_006 draft -- CPR_021 flagged this as "the
    // closest call among the five APPROVE recommendations" (technical-
    // nuance/no-hedge overclaim-or-underclaim risk, Publication Policy
    // Principle 2) and resolved it via explicit bidirectional guardrail
    // language rather than narrowing the underlying Claim proposition; the
    // real, unmodified pipeline was exercised specifically to confirm both
    // guardrail sentences render intact before this entry was added.
    claim_id: 'CLAIM-MUSIC-ARTLIST-PRO-ROYALTIES-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'CRC may state that Artlist\'s license permission for broadcast or public-performance use doesn\'t include paying royalties to Performance Rights Organizations (PROs) or other collecting societies -- those are handled separately from the Artlist license itself -- and that if a project is broadcast or publicly performed, the subscriber (or their client) may still need to arrange or pay PRO/collecting-society royalties, separately from what the Artlist license already covers. This is a general point about how Artlist\'s license and PRO royalties relate to each other -- it doesn\'t mean a royalty is currently owed for the user\'s project, and it doesn\'t mean the user has no exposure just because it isn\'t covered by the Artlist license. CRC must not state or imply that a specific royalty payment is currently owed for the user\'s project, must not state or imply that the user has no PRO/collecting-society exposure because it "isn\'t covered" by the Artlist license, must not identify which PRO or which jurisdiction\'s collecting society would be involved, and must not state or imply the project is otherwise commercially cleared.',
    crc_candidate_statement:
      'Artlist\'s license permission for broadcast or public-performance use doesn\'t include paying royalties to Performance Rights Organizations (PROs) or other collecting societies -- those are handled separately from the Artlist license itself. If a project is broadcast or publicly performed, you (or your client) may still need to arrange or pay PRO/collecting-society royalties, separately from what the Artlist license already covers. This is a general point about how Artlist\'s license and PRO royalties relate to each other -- it doesn\'t mean a royalty is currently owed for your project, and it doesn\'t mean you have no exposure just because it isn\'t covered by the Artlist license.',
    applicability_requirements: [],
    // Genuinely empty -- confirmed universal, unconditional on tier.
    // Resolves directly_relevant (no Case 3B hedge) -- the corrected
    // wording above is the sole safeguard for this claim, confirmed
    // present in rendered output via the real, unmodified pipeline before
    // this entry was added.
    unresolved_project_dependencies: [],
    provider_scope: ['artlist'],
    tool_scope: null,
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-10',
    superseded_by: null,
  },
  {
    // Music Scenario A -- Artlist Remaining Claims activation (CPR_021,
    // 2026-09-10). See CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1's own entry
    // above for the shared activation context. Approved as originally
    // drafted -- no wording change. CPR_021 re-confirmed CPR_007 §8's own
    // prior finding: the two evidence-only employer-fact dependencies
    // below do not block eligibility -- this claim always renders via the
    // Case 3B hedge, structurally identical to Getty's own multi-week
    // pre-DAR history (asset_confirmed_getty et al.).
    claim_id: 'CLAIM-MUSIC-ARTLIST-ENTERPRISE-THRESHOLD-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      "CRC may state Artlist's stated agency/broadcaster/>50-employee threshold and the Max Business/Enterprise requirement, including the AI-Services-only carve-out: Artlist's standard Pro/Business plans may not be sufficient for agencies, broadcasters, or larger companies, who may need a Max Business or Enterprise agreement instead. CRC must not state the user's actual employer classification or size, must not state which plan the user currently holds, and must not state whether a standard Pro/Business plan is or is not sufficient for the user's specific case.",
    crc_candidate_statement:
      "Artlist's standard Pro/Business plans may not be sufficient for agencies, broadcasters, or larger companies, who may need a Max Business or Enterprise agreement instead.",
    applicability_requirements: [],
    // Both evidence-only: self-known employer-type/size facts, not
    // registered in dependency-askability.ts -- fail-closed by default,
    // unchanged by this activation (flagged by FGR_006 as a plausible
    // future DAR candidate, not performed here). Permanently gates
    // Bounded Interpretation to relevant_applicability_unresolved (Case
    // 3B), confirmed via the real, unmodified pipeline before this entry
    // was added.
    unresolved_project_dependencies: ['artlist_licensee_employer_type_confirmed', 'artlist_licensee_employer_size_confirmed'],
    provider_scope: ['artlist'],
    tool_scope: null,
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-10',
    superseded_by: null,
  },
  {
    // Music Scenario A -- Envato + Epidemic activation (CPR_022,
    // 2026-09-10). Runtime prerequisite cleared by the Envato + Epidemic
    // Provider Registration / CPR-Readiness Remediation (envato-elements
    // now a registered AssetProviderId, with a matching extraction alias)
    // -- mirroring exactly the Artlist runtime-clearance precedent above.
    // PM concurrence 2026-09-10 (CRC Approver: JD (PM)) -- see
    // GOVERNED-CLAIMS.md's own CRC PUBLICATION APPROVED note and
    // governance-reviews/CPR_022_ENVATO_EPIDEMIC_RECONSIDERATION_
    // 2026-09-10.md for the full decision record. Approved as originally
    // drafted, no wording change.
    claim_id: 'CLAIM-MUSIC-ENVATO-SYNC-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      "CRC may state that Envato Elements' standard license ties music use to synchronization with other media (such as being part of a video) and excludes standalone resale/redistribution and broadcast presentations specifically. CRC must not state whether the user's own specific use constitutes standalone resale or broadcast use, must not state that the user holds a valid Envato Elements subscription for the track, and must not state or imply the project is otherwise commercially cleared.",
    crc_candidate_statement:
      "Envato Elements' standard license ties music use to synchronization with other media, and excludes standalone resale/redistribution and broadcast presentations specifically.",
    applicability_requirements: [],
    // Evidence-only: structurally auto-satisfied by the time this
    // provider-scoped claim is even a retrieval candidate at all (the same
    // observation DAR_001 made for Getty's own asset_confirmed_getty), but
    // left in the governed dependency list unchanged, per this document's
    // own "never retroactively edit for convenience" discipline -- Case 3B
    // still fires; the claim never renders unhedged. Confirmed via the
    // real, unmodified pipeline before this entry was added.
    unresolved_project_dependencies: ['which_music_provider'],
    provider_scope: ['envato-elements'],
    tool_scope: null,
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-10',
    superseded_by: null,
  },
  {
    // Music Scenario A -- Envato + Epidemic activation (CPR_022,
    // 2026-09-10). See CLAIM-MUSIC-ENVATO-SYNC-001-v1's own entry
    // immediately above for the shared activation context. Approved as
    // originally drafted, no wording change -- near-identical in shape to
    // Artlist A-3's own already-approved, already-in-production
    // post-cancellation continuity claim.
    claim_id: 'CLAIM-MUSIC-ENVATO-CANCELLATION-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      "CRC may state that Envato's stated policy is that music used in a project completed and published while the subscription was active remains licensed even after the subscription ends, while new or incomplete projects after cancellation are not covered. CRC must not state whether the user's own specific project was actually completed and published while their subscription was active, and must not state or imply the project is otherwise commercially cleared.",
    crc_candidate_statement:
      "Envato's stated policy is that already-completed, already-published work stays licensed after cancellation, while new use does not.",
    applicability_requirements: [],
    // Genuine, evidence-only, non-auto-satisfied documentary/account-
    // history fact -- structurally identical to Artlist A-3's own
    // artlist_subscription_active_at_publication_confirmed, already
    // CRC-active and in production with the identical evidence-only
    // treatment. Not converted to a self-attestation question by this
    // activation. Permanently gates Bounded Interpretation to
    // relevant_applicability_unresolved (Case 3B), confirmed via the
    // real, unmodified pipeline before this entry was added.
    unresolved_project_dependencies: ['music_subscription_active_at_publication_confirmed'],
    provider_scope: ['envato-elements'],
    tool_scope: null,
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-10',
    superseded_by: null,
  },
  {
    // Music Scenario A -- Envato + Epidemic activation (CPR_022,
    // 2026-09-10). See CLAIM-MUSIC-ENVATO-SYNC-001-v1's own entry above for
    // the shared activation context. This entry's own
    // crc_candidate_statement/crc_publication_scope below are CORRECTED
    // from the original FGR_006 draft -- CPR_022 resolved the tier-
    // vagueness risk FGR_006 originally flagged (the draft was too
    // abstract to tell a user which tier permits what) by stating both
    // tiers' actual rules explicitly, with bidirectional guardrails
    // against either tier being read as a universal commercial-use
    // permission or prohibition. PM supplied this exact final wording
    // directly (cosmetically, not substantively, different from CPR_022's
    // own draft -- see that review's own wrapper metadata); persisted here
    // verbatim as supplied, not CPR_022's own draft text.
    claim_id: 'CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      "CRC may state that Epidemic Sound's Single-Track Private Tier license excludes use in advertisements and other paid-media productions (including online pre/mid/post-roll placements), that the separate Commercial Tier license does not carry that same exclusion (it excludes only broadcast-type content such as TV ads), and that the Commercial Tier separately grants a right to monetize through third-party ads on the subscriber's own published work -- and that which of these applies depends on which tier the subscriber actually holds. CRC must not state which tier the user's account actually holds, must not state that the Private tier prohibits all commercial use (only advertising/paid-media use specifically), must not state that the Commercial tier's monetization right by itself clears a project commercially, and must not state or imply the project is otherwise commercially cleared.",
    crc_candidate_statement:
      "Epidemic Sound's Single-Track Private Tier license excludes use in advertisements and other paid-media productions -- but the separate Commercial Tier license doesn't carry that same exclusion; it only excludes broadcast-type content such as TV ads, and separately allows you to monetize your own published work through third-party ads. Which of these applies depends on which tier you're actually subscribed to.",
    applicability_requirements: [],
    // which_music_provider: evidence-only, structurally auto-satisfied
    // (same as Envato's own). epidemic_license_tier_confirmed: genuine
    // account/subscription fact, evidence-only, structurally identical in
    // kind to Artlist's own artlist_license_type_confirmed (already
    // CRC-active). Neither converted to a self-attestation question.
    // Permanently gates Bounded Interpretation to
    // relevant_applicability_unresolved (Case 3B) regardless of which
    // tier the user actually holds -- confirmed via the real, unmodified
    // pipeline (Private-tier-known, Commercial-tier-known, and
    // tier-unresolved scenarios) before this entry was added.
    unresolved_project_dependencies: ['which_music_provider', 'epidemic_license_tier_confirmed'],
    provider_scope: ['epidemic-sound'],
    tool_scope: null,
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-10',
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
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
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-08-31',
    superseded_by: null,
  },
  {
    // Second tool_scope-narrowed TopicClaim runtime entry (after Synthesia
    // above). CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1 Adopted 2026-09-02
    // (FGR_013). Initially WITHHELD from CRC by CPR_013 -- not for evidence,
    // applicability, or isolated Bounded Interpretation/Composition
    // reasons, but because the legacy PLATFORM-RIGHTS-MATRIX.md row
    // `kling-commercial-use-baseline` was simultaneously Yes-eligible, and
    // a combined synthetic canary showed publishing both would duplicate
    // the same governed content verbatim in a single CRC response
    // (CPR_013 §14). FGR_014 authorized Matrix retirement as representation
    // supersession (never substantive reversal); that retirement was
    // executed (both Kling Matrix rows flipped crc_eligible: 'No', with a
    // dated provenance annotation) and confirmed live in Production via
    // direct Vercel dashboard evidence. CPR_015 then independently
    // reconsidered CRC eligibility against that real, executed state (not
    // a staged/candidate one) and APPROVED both Kling claims; the
    // CPR_015 addendum empirically re-confirmed, via a live executed
    // canary against the real pipeline, zero Matrix-origin Kling results
    // in all three tested account-status scenarios -- the coexistence
    // blocker is not merely avoided but structurally eliminated, since
    // the retired Matrix row now contributes zero results at Retrieval.
    // See GOVERNED-CLAIMS.md's own CRC Publication Scope and
    // governance-reviews/CPR_015_KLING_COMMERCIAL_USE_POST-RETIREMENT_
    // RECONSIDERATION_2026-09-02.md (plus its empirical-confirmation
    // addendum) for the full decision sequence and publication-safety
    // analysis. No extraction alias question applies here -- 'kling' is
    // an existing CANONICAL_TOOL_ID with existing conversational aliases
    // ('kling', 'kling ai') in extraction.ts, already conversationally
    // reachable.
    claim_id: 'CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'APPROVED FOR CRC PUBLICATION (2026-09-02, CRC Approver: JD (PM) -- see CRC Publication Review #15, CPR_015, governance-reviews/CPR_015_KLING_COMMERCIAL_USE_POST-RETIREMENT_RECONSIDERATION_2026-09-02.md, superseding CPR_013\'s and CPR_014\'s prior WITHHOLD dispositions following executed, production-confirmed Matrix retirement of the corresponding legacy `kling-commercial-use-baseline` Matrix row -- now crc_eligible: \'No\'; empirically confirmed by governance-reviews/CPR_015_ADDENDUM_EMPIRICAL_CONFIRMATION_2026-09-02.md, which found zero Matrix-origin Kling results across all three tested account-status scenarios). CRC may state that, under Kling\'s current Terms of Service, using generated Output for commercial purposes without Kling\'s written permission is not permitted by default. This default applies regardless of the account\'s current membership status. This is Kling\'s own provider/platform policy, not law. CRC must not state branding requirements, training-data provisions, downstream IP clearance, ownership analysis, the account\'s current membership status, or any broader commercial-readiness conclusion. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project\'s own Kling account status or broader commercial readiness.',
    crc_candidate_statement:
      'Under Kling\'s current Terms of Service, you may not use, reproduce, distribute, modify, or create derivative works from generated Output for commercial purposes without Kling\'s written permission.',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: ['kling'],
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-02',
    superseded_by: null,
  },
  {
    // Companion entry to CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1 above
    // -- same provider, same governance sequence (FGR_013 -> CPR_013
    // WITHHOLD -> FGR_014 Matrix retirement authorization -> retirement
    // executed and Production-confirmed -> CPR_015 APPROVE, empirically
    // confirmed). This is the first published applicability-gated
    // tool_scope claim: `applicability_requirements` narrows it to
    // conversations where the generic, first-class `tool_account_status`
    // fact (retrieval-engine/types.ts, already registered askable_in_crc
    // in selector-askability.ts) is confirmed 'Member Account' for
    // 'kling' -- an unknown or non-matching value leaves this claim
    // unresolved / not_met, never guessed. CPR_015 §5 (unchanged from
    // CPR_013 §14/§16) empirically confirmed this fail-closed behavior
    // across all three states; the addendum's live canary re-confirmed
    // zero Matrix-origin duplication specifically in the maximal-overlap
    // confirmed-Member-Account state. claim_character: 'conditional' --
    // the first use of this character in this corpus (FGR_013 §9),
    // confirmed by CPR_015 §3 to remain read by zero production
    // Retrieval/Bounded Interpretation/Composition code, so its
    // publication introduces no architecture risk.
    claim_id: 'CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1',
    topic: 'commercial_use',
    claim_character: 'conditional',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'APPROVED FOR CRC PUBLICATION (2026-09-02, CRC Approver: JD (PM) -- see CRC Publication Review #15, CPR_015, governance-reviews/CPR_015_KLING_COMMERCIAL_USE_POST-RETIREMENT_RECONSIDERATION_2026-09-02.md, superseding CPR_013\'s and CPR_014\'s prior WITHHOLD dispositions following executed, production-confirmed Matrix retirement of the corresponding legacy `kling-commercial-use-member` Matrix row -- now crc_eligible: \'No\'; empirically confirmed by governance-reviews/CPR_015_ADDENDUM_EMPIRICAL_CONFIRMATION_2026-09-02.md, which found zero Matrix-origin Kling results across all three tested account-status scenarios, including the maximal-overlap confirmed-Member-Account state). CRC may state that, if the account currently holds a Kling Member Account (i.e. is subscribed to Kling\'s Membership Service), Kling\'s current Terms of Paid Service permit commercial use of generated Output without additional written permission, except for developing or offering products or services that compete with Kling AI. This is Kling\'s own provider/platform policy, not law. CRC must not state branding requirements, training-data provisions, downstream IP clearance, ownership analysis, membership status at any time other than currently, or whether a specific use falls within the "competing products or services" carve-out. CRC must not state or imply that Member Account status must persist beyond the moment it is confirmed (temporal semantics not established by the source). A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project\'s own Kling account status or broader commercial readiness.',
    crc_candidate_statement:
      'If you currently hold a Kling Member Account (i.e. you\'re subscribed to Kling\'s Membership Service), Kling\'s current Terms of Paid Service permit commercial use of generated Output without additional written permission, except for developing or offering products or services that compete with Kling AI.',
    applicability_requirements: [{ fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' }],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: ['kling'],
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-02',
    superseded_by: null,
  },
  {
    // Third tool_scope-narrowed TopicClaim runtime entry (after Synthesia
    // and the two Kling claims above). CLAIM-RUNWAY-COMMERCIAL-USE-001-v1
    // Adopted 2026-09-03 (FGR_015). Initially WITHHELD from CRC by CPR_016
    // -- not for evidence, applicability, or isolated Bounded
    // Interpretation/Composition reasons, but because the legacy
    // PLATFORM-RIGHTS-MATRIX.md row `runway-gen3` was simultaneously
    // Yes-eligible, and a combined synthetic canary showed publishing both
    // would produce not merely duplication but a scope *contradiction* on
    // Enterprise (the legacy Matrix row's prose implied Enterprise
    // coverage; this claim, per FGR_015's own independent primary-source
    // re-verification, explicitly excludes it) (CPR_016 §5). An explicit
    // JD/PM decision authorized Matrix retirement as representation
    // supersession (never substantive reversal); that retirement was
    // executed (`runway-gen3` flipped crc_eligible: 'No', with a dated
    // provenance annotation, historical proposition/evidence/provenance
    // preserved verbatim). CPR_017 then independently reconsidered CRC
    // eligibility against that real, executed state (not a staged/
    // candidate one) and APPROVED the claim; the CPR_017 addendum records
    // the required explicit PM/JD concurrence and an empirically-executed
    // canary against the real pipeline finding zero Matrix-origin Runway
    // results and no scope contradiction -- the coexistence blocker is
    // not merely avoided but structurally eliminated, since the retired
    // Matrix row now contributes zero results at Retrieval. See
    // GOVERNED-CLAIMS.md's own CRC Publication Scope and
    // governance-reviews/CPR_017_RUNWAY_COMMERCIAL_USE_POST-RETIREMENT_
    // RECONSIDERATION_2026-09-03.md (plus its PM-concurrence addendum) for
    // the full decision sequence and publication-safety analysis. No
    // extraction alias question applies here -- 'runway-gen3' is an
    // existing CANONICAL_TOOL_ID, already conversationally reachable.
    claim_id: 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'APPROVED FOR CRC PUBLICATION (2026-09-03, CRC Approver: JD (PM) -- see CRC Publication Review #17, CPR_017, governance-reviews/CPR_017_RUNWAY_COMMERCIAL_USE_POST-RETIREMENT_RECONSIDERATION_2026-09-03.md, superseding CPR_016\'s prior WITHHOLD disposition following executed, empirically-confirmed Matrix retirement of the corresponding legacy `runway-gen3` Matrix row -- now crc_eligible: \'No\'; explicit PM/JD concurrence recorded at governance-reviews/CPR_017_ADDENDUM_PM_CONCURRENCE_2026-09-03.md, which found zero Matrix-origin Runway results and no scope contradiction in the empirically-executed post-retirement canary). CRC may state that, under Runway\'s current Terms of Use, commercial use of generated Output is permitted across Runway\'s Free, Standard, Pro, and Max tiers, subject to a restriction against using the Services or Outputs to create, train, develop, or improve similar or competitive products or services, and that this does not extend to Runway\'s Enterprise tier. This is Runway\'s own provider/platform policy, not law. CRC must not state ownership analysis beyond the quoted non-claim-of-ownership language, whether a specific project falls within the "similar or competitive products or services" restriction, downstream IP clearance, Enterprise-tier commercial-use status of any kind, or any broader commercial-readiness conclusion. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project\'s own Runway tier status or broader commercial readiness.',
    crc_candidate_statement:
      'Under Runway\'s current Terms of Use, you may use generated Output commercially across Runway\'s Free, Standard, Pro, and Max tiers, subject to a restriction against using the Services or Outputs to create, train, develop, or improve similar or competitive products or services. This does not apply to Runway\'s Enterprise tier.',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: ['runway-gen3'],
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-03',
    superseded_by: null,
  },
  {
    // Fourth tool_scope-narrowed provider (after Synthesia, Kling, Runway).
    // CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1 Adopted 2026-09-05 (FGR_016)
    // -- unconditional baseline half of a baseline-plus-exception pair,
    // structurally like Kling's, not Runway's single-uniform-grant shape.
    // Companion claim CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-001-v1 (the
    // original open-world `not_equals 'Free'` exception) was found unsafe
    // post-adoption (FGR_016 addenda, 2026-09-05/06) and superseded --
    // never published here, remains Deprecated in GOVERNED-CLAIMS.md --
    // by three closed-world `equals` successor claims (Standard/Pro/Fancy,
    // immediately below). CPR_018 initially WITHHELD all four pending
    // Matrix coexistence resolution, mirroring Runway's CPR_016; the
    // legacy PLATFORM-RIGHTS-MATRIX.md `pika` row was then retired
    // (`crc_eligible: 'No'`, historical proposition/evidence preserved) by
    // explicit JD/PM authorization, and CPR_019 independently reconsidered
    // CRC eligibility against that real, executed state and APPROVED all
    // four claims; the CPR_019 addendum records explicit PM/JD concurrence
    // and an empirically-executed canary against the real pipeline finding
    // zero Matrix-origin Pika results across all 8 tested scenarios. See
    // GOVERNED-CLAIMS.md's own CRC Publication Scope and
    // governance-reviews/CPR_019_PIKA_COMMERCIAL_USE_POST-RETIREMENT_
    // RECONSIDERATION_2026-09-06.md (plus its PM-concurrence addendum) for
    // the full decision sequence. CORRECTION (CRC-Active Tool Extraction
    // Reachability Backstop + Gap Remediation): this comment previously
    // stated "No extraction alias question applies -- 'pika' is an
    // existing CANONICAL_TOOL_ID, already conversationally reachable."
    // That was factually wrong -- 'pika' had zero KNOWN_TOOLS coverage and
    // was empirically unreachable via ordinary conversation until this
    // remediation added it. Retained here only as a source-comment
    // correction (this is live code commentary, not a historical
    // governance artifact); CPR_019's own governance-reviews/ file is left
    // unmodified as the historical record of the original, mistaken
    // assertion.
    claim_id: 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'APPROVED FOR CRC PUBLICATION (2026-09-06, CRC Approver: JD (PM) -- see CRC Approver/CRC Decision Date below; CRC Publication Review #19 complete at governance-reviews/CPR_019_PIKA_COMMERCIAL_USE_POST-RETIREMENT_RECONSIDERATION_2026-09-06.md, superseding CPR_018\'s prior WITHHOLD disposition following executed, empirically-confirmed Matrix retirement of the corresponding legacy `pika` Matrix row (now `crc_eligible: No`); explicit PM/JD concurrence recorded at governance-reviews/CPR_019_ADDENDUM_PM_CONCURRENCE_2026-09-06.md, which found zero Matrix-origin Pika results and no duplication or contradiction in the empirically-executed post-retirement canary, across all 8 tested scenarios). CRC may state that, under Pika\'s current Terms of Service, use of generated Output is restricted to personal, non-commercial purposes by default, except for paid subscription plans (Standard, Pro, or Fancy), which include commercial-use rights -- this baseline default applies unconditionally regardless of plan tier; the paid-plan commercial-use exception is governed separately by CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1 / -PRO-001-v1 / -FANCY-001-v1. This is Pika\'s own provider/platform policy, not law. CRC must not state the full text or complete scope of Pika\'s Terms of Service beyond the quoted excerpt, feature-level licensing detail beyond the "Commercial use" bullet itself, any project-specific commercial-readiness conclusion, or downstream IP clearance. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project\'s own Pika plan status or broader commercial readiness.',
    crc_candidate_statement:
      'Under Pika\'s current Terms of Service, use of generated Output is restricted to personal, non-commercial purposes by default, except for paid subscription plans, which include commercial-use rights.',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: ['pika'],
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-06',
    superseded_by: null,
  },
  {
    // CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1 -- one of three
    // closed-world successor claims to the deprecated, never-published
    // CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-001-v1 (`not_equals 'Free'`,
    // found unsafe -- open-world). `tool_plan_tier` is single-valued per
    // tool mention, so at most one of this claim and its two siblings
    // (Pro/Fancy, immediately below) can ever resolve `met` for a given
    // project -- no duplicate-authority risk among the three. See
    // GOVERNED-CLAIMS.md entry and CPR_019 for full decision sequence.
    claim_id: 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1',
    topic: 'commercial_use',
    claim_character: 'conditional',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'APPROVED FOR CRC PUBLICATION (2026-09-06, CRC Approver: JD (PM) -- see CRC Approver/CRC Decision Date below; CRC Publication Review #19 complete at governance-reviews/CPR_019_PIKA_COMMERCIAL_USE_POST-RETIREMENT_RECONSIDERATION_2026-09-06.md, superseding CPR_018\'s prior WITHHOLD disposition following executed, empirically-confirmed Matrix retirement of the corresponding legacy `pika` Matrix row (now `crc_eligible: No`); explicit PM/JD concurrence recorded at governance-reviews/CPR_019_ADDENDUM_PM_CONCURRENCE_2026-09-06.md, which found zero Matrix-origin Pika results and no duplication or contradiction in the empirically-executed post-retirement canary, across all 8 tested scenarios). CRC may state that if the user\'s current Pika subscription plan is specifically the Standard tier, that plan includes commercial-use rights for generated Output. This is Pika\'s own provider/platform policy, not law. CRC must not state the full text or complete scope of Pika\'s Terms of Service beyond the quoted excerpt, feature-level licensing detail beyond the "Commercial use" bullet itself, any project-specific commercial-readiness conclusion, or downstream IP clearance. Applicability remains gated on `tool_plan_tier equals \'Standard\'` exactly as adopted -- CRC must not infer this claim applies from generic "paid" wording. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project\'s own Pika plan status or broader commercial readiness.',
    crc_candidate_statement:
      'If you are on Pika\'s Standard plan, your plan includes commercial-use rights for generated Output.',
    applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'pika', operator: 'equals', value: 'Standard' }],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: ['pika'],
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-06',
    superseded_by: null,
  },
  {
    // CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1 -- sibling of the
    // Standard claim above; see that entry's comment for the shared
    // supersession/coexistence rationale.
    claim_id: 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1',
    topic: 'commercial_use',
    claim_character: 'conditional',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'APPROVED FOR CRC PUBLICATION (2026-09-06, CRC Approver: JD (PM) -- see CRC Approver/CRC Decision Date below; CRC Publication Review #19 complete at governance-reviews/CPR_019_PIKA_COMMERCIAL_USE_POST-RETIREMENT_RECONSIDERATION_2026-09-06.md, superseding CPR_018\'s prior WITHHOLD disposition following executed, empirically-confirmed Matrix retirement of the corresponding legacy `pika` Matrix row (now `crc_eligible: No`); explicit PM/JD concurrence recorded at governance-reviews/CPR_019_ADDENDUM_PM_CONCURRENCE_2026-09-06.md, which found zero Matrix-origin Pika results and no duplication or contradiction in the empirically-executed post-retirement canary, across all 8 tested scenarios). CRC may state that if the user\'s current Pika subscription plan is specifically the Pro tier, that plan includes commercial-use rights for generated Output. This is Pika\'s own provider/platform policy, not law. CRC must not state the full text or complete scope of Pika\'s Terms of Service beyond the quoted excerpt, feature-level licensing detail beyond the "Commercial use" bullet itself, any project-specific commercial-readiness conclusion, or downstream IP clearance. Applicability remains gated on `tool_plan_tier equals \'Pro\'` exactly as adopted -- CRC must not infer this claim applies from generic "paid" wording. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project\'s own Pika plan status or broader commercial readiness.',
    crc_candidate_statement:
      'If you are on Pika\'s Pro plan, your plan includes commercial-use rights for generated Output.',
    applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'pika', operator: 'equals', value: 'Pro' }],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: ['pika'],
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-06',
    superseded_by: null,
  },
  {
    // CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-FANCY-001-v1 -- sibling of the
    // Standard claim above; see that entry's comment for the shared
    // supersession/coexistence rationale.
    claim_id: 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-FANCY-001-v1',
    topic: 'commercial_use',
    claim_character: 'conditional',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'APPROVED FOR CRC PUBLICATION (2026-09-06, CRC Approver: JD (PM) -- see CRC Approver/CRC Decision Date below; CRC Publication Review #19 complete at governance-reviews/CPR_019_PIKA_COMMERCIAL_USE_POST-RETIREMENT_RECONSIDERATION_2026-09-06.md, superseding CPR_018\'s prior WITHHOLD disposition following executed, empirically-confirmed Matrix retirement of the corresponding legacy `pika` Matrix row (now `crc_eligible: No`); explicit PM/JD concurrence recorded at governance-reviews/CPR_019_ADDENDUM_PM_CONCURRENCE_2026-09-06.md, which found zero Matrix-origin Pika results and no duplication or contradiction in the empirically-executed post-retirement canary, across all 8 tested scenarios). CRC may state that if the user\'s current Pika subscription plan is specifically the Fancy tier, that plan includes commercial-use rights for generated Output. This is Pika\'s own provider/platform policy, not law. CRC must not state the full text or complete scope of Pika\'s Terms of Service beyond the quoted excerpt, feature-level licensing detail beyond the "Commercial use" bullet itself, any project-specific commercial-readiness conclusion, or downstream IP clearance. Applicability remains gated on `tool_plan_tier equals \'Fancy\'` exactly as adopted -- CRC must not infer this claim applies from generic "paid" wording. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project\'s own Pika plan status or broader commercial readiness.',
    crc_candidate_statement:
      'If you are on Pika\'s Fancy plan, your plan includes commercial-use rights for generated Output.',
    applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'pika', operator: 'equals', value: 'Fancy' }],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: ['pika'],
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-06',
    superseded_by: null,
  },
  {
    // CLAIM-STABILITYAI-COMMERCIAL-USE-001-v1 -- second TopicClaim-only
    // runtime entry with no PLATFORM-RIGHTS-MATRIX.md coverage (Synthesia
    // is the first), added 2026-09-09 (Stability AI Runtime Identity /
    // Representation-Readiness Remediation, Trial 10). Adopted 2026-09-09
    // (FGR_017), CRC Publication approved the same day following CPR_020's
    // initial sequencing-only WITHHOLD and its own 2026-09-09 addendum
    // reconsideration (the real mandatory synthetic-eligibility-canary run
    // against this exact claim) -- see GOVERNED-CLAIMS.md for the full
    // decision chain and CRC Approver record.
    //
    // This entry is the mechanical runtime mirror of the already-approved
    // GOVERNED-CLAIMS.md fields -- created here, in this same milestone, as
    // the necessary precondition for real end-to-end retrieval (Property 4)
    // and for this identity to appear in
    // `deriveCrcActiveToolIds()`/`auditCrcActiveReachability()`'s derived
    // population at all (both read TOPIC_CLAIMS_FIXTURE, never
    // GOVERNED-CLAIMS.md directly) -- mirroring Synthesia's own precedent,
    // where CPR_009's CRC Publication approval and this fixture mirror were
    // added together. No governance decision is made or altered by adding
    // this entry: every field below is transcribed verbatim from the
    // already-human-approved GOVERNED-CLAIMS.md record, not newly composed.
    //
    // DISCLOSED STALENESS: the `crc_publication_scope` text below (mirrored
    // verbatim from GOVERNED-CLAIMS.md) ends with a "Runtime note" stating
    // 'stability-ai' is "not yet a registered CanonicalToolId... not yet
    // conversationally reachable" -- that sentence was true when the human
    // CRC Publication decision was recorded, but is stale as of this exact
    // commit, which registers 'stability-ai' in
    // `lib/tool-identity/registry.ts` and adds `KNOWN_TOOLS` aliases in the
    // same change. Per this corpus's established discipline (see the
    // Synthesia entry above, whose own comment similarly records a
    // point-in-time reachability fact never retroactively updated after a
    // later milestone changed it), the governance-sourced text is mirrored
    // exactly as approved, not silently edited to stay current -- this
    // comment is the correction mechanism, not a rewrite of approved text.
    claim_id: 'CLAIM-STABILITYAI-COMMERCIAL-USE-001-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      'APPROVED FOR CRC PUBLICATION (2026-09-09, CRC Approver: JD (PM) -- see CRC Approver/CRC Decision Date below; CRC Publication Review #20 initially recommended WITHHOLD on sequencing/missing-prerequisite grounds only, governance-reviews/CPR_020_CAND-STABILITYAI-COMMERCIAL-USE-001_2026-09-09.md, superseded by that same file\'s own 2026-09-09 addendum recording a bounded in-sequence CPR reconsideration -- the mandatory synthetic-eligibility-canary was run for the first time against this real, now-Adopted claim and its real approved text, confirming exactly what CPR_020\'s own predictive probe anticipated: Bounded Interpretation never exceeds `relevant_applicability_unresolved` (Case 3B), all three unresolved project dependencies pass through unmodified, and no scope bleed into Stable Chat/Stable Assistant occurs). CRC may state that Stability AI\'s Community License grants a royalty-free license to use its Core Models (including the Stable Diffusion family) for commercial purposes, subject to the Agreement\'s conditions -- including a commercial-use registration requirement and an aggregate-Affiliate-revenue threshold of USD $1,000,000 above which the Agreement\'s licenses terminate and continued use requires a separate, Stability-AI-discretionary license -- and that output ownership is stated separately and does not by itself establish commercial permission. This is Stability AI\'s own provider/platform policy, not law. CRC must not state or imply that a specific user\'s organization is above or below the revenue threshold, that required registration has occurred, that the Community License definitely governs the particular Stability AI product/model the user used, that a separate license is or is not currently required for this user, or that Stability AI would grant one if requested. CRC must not extend this statement to Stable Chat, Stable Assistant, Stable App, or any other separately governed Stability AI product or service, and must not assert that hosted/API and self-hosted access carry a fully identical complete contractual regime beyond the Agreement\'s own silence on the distinction. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving a specific project\'s own Stability AI revenue/registration/product-scope status or broader commercial readiness. Runtime note: `stability-ai` is not yet a registered `CanonicalToolId` (Principle 7) -- this claim is CRC-authorized but not yet conversationally reachable; that is a separate, later, mechanical remediation, not performed by this decision.',
    crc_candidate_statement:
      'Stability AI\'s Community License grants a royalty-free license to use its Core Models (including the Stable Diffusion family) for commercial purposes, subject to the Agreement\'s conditions. Commercial use requires registration with Stability AI. If you or your Affiliates generate more than USD $1,000,000 in aggregate annual revenue from any source, the licenses granted under the Agreement terminate, and continued use requires a separate license from Stability AI, which Stability AI may grant at its discretion. Separately, the Agreement states that, as between you and Stability AI, you own outputs generated from the Models or Derivative Works to the extent permitted by applicable law. These terms concern Core Models governed by the Community License and do not extend to separately governed Stability AI products such as Stable Assistant or Stable Chat. They do not by themselves establish that a particular project is cleared for commercial use.',
    applicability_requirements: [],
    unresolved_project_dependencies: [
      'stabilityai_organization_revenue_threshold_status',
      'stabilityai_commercial_registration_completed',
      'stabilityai_product_is_core_model_under_community_license',
    ],
    provider_scope: null,
    tool_scope: ['stability-ai'],
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-09',
    superseded_by: null,
  },
  {
    // NY GBL 396-b Synthetic Performer Disclosure (2026-09-10, Generic
    // Non-Provider TopicClaim Runtime Activation milestone) -- the second
    // provider_scope: null / likeness-topic claim in this fixture, and the
    // first added specifically to prove the existing generic non-provider
    // representation class (already proven by the four CLAIM-COPY-* entries
    // above) extends to a jurisdiction-scoped statutory claim without any
    // schema/mechanism change. Adopted: FGR_018 (2026-09-10, ADOPT WITH
    // BOUNDED WORDING). CRC Publication: CPR_025 (2026-09-10, APPROVE WITH
    // BOUNDED WORDING) -- Principle 3 independently found NOT to apply to
    // this claim's specific subject matter (a statutorily non-identifiable
    // synthetic performer disclosure duty, distinct from the sibling
    // CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1's real-person identity
    // subject matter, which remains withheld under CPR_008 -- unaffected by
    // this entry). Mirrored verbatim from GOVERNED-CLAIMS.md; no wording
    // strengthened, simplified, or reconstructed here.
    claim_id: 'CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1',
    topic: 'likeness',
    claim_character: 'established',
    jurisdiction: 'New York (state)',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope:
      "APPROVED FOR CRC PUBLICATION (2026-09-10, CRC Approver: JD (PM) -- see CRC Approver/CRC Decision Date below; CRC Publication Review #25 complete at governance-reviews/CPR_025_NY_GBL_396B_SYNTHETIC_PERFORMER_DISCLOSURE_REVIEW_2026-09-10.md, APPROVE WITH BOUNDED WORDING -- the approved wording here is CPR_025 §S/§T verbatim, not the shorter pre-CPR draft this field previously held). Principle 3 finding (CPR_025 §E, PM/JD-concurred): the existing Principle 3 withholding applied to the real-person likeness/identity risk represented by the sibling New York likeness claim (CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1, withheld under CPR_008) does not automatically extend to this distinct statutory synthetic-performer disclosure proposition merely because both currently use GoalCategory `likeness` -- the substantive distinction is that this statute concerns a performer statutorily defined as NOT recognizable as any identifiable natural performer, a disclosure/anti-deception mandate rather than a real-person identity/consent right. This finding is claim-specific: it does not hold that Principle 3 is inapplicable to synthetic performers generally, that statutory disclosure laws are categorically outside Principle 3, or that any `likeness`-topic claim is now presumptively CRC-eligible. The sibling claim is unaffected and remains `CRC Publication Scope: WITHHELD FROM CRC`, unchanged by this decision. CRC may state that NY GBL § 396-b requires a commercial advertisement producer/creator with actual knowledge of a synthetic performer's presence to conspicuously disclose that fact, subject to the statute's expressive-work (conditional), audio-only, and translation-only exemptions and $1,000/$5,000 civil penalties, and that media/platforms that merely publish or disseminate a non-compliant advertisement are separately, expressly exempted. This is New York statutory law, not SI8's own policy. CRC must not state or imply: that a specific project violates or complies with § 396-b; that the user is (or is not) the statutory duty-holder; that specific content does (or does not) meet the statutory synthetic-performer definition; that actual knowledge does (or does not) exist; that any exemption does (or does not) apply to a specific project; that New York jurisdiction attaches to a specific project for any reason, including the user merely mentioning New York; that a real, identifiable person's likeness or digital replica is governed by this statute (that subject is governed by a separate statute, NY Civil Rights Law §§ 50-51); that AI tool providers are expressly exempt (only media/platforms that merely publish or disseminate are); or that satisfying the disclosure duty establishes broader legal compliance, copyright clearance, provider/platform permission, or overall commercial readiness. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving any of these project-specific facts.",
    crc_candidate_statement:
      "New York General Business Law § 396-b requires a person who, for a commercial purpose, produces or creates an advertisement and has actual knowledge that it includes a synthetic performer -- a digitally created figure, made using generative AI or a software algorithm, intended to create the impression of a human performance but not recognizable as any identifiable natural performer -- to conspicuously disclose that fact within the advertisement. The duty does not apply to advertisements for expressive works (where the synthetic performer's use is consistent with its use in the work), audio-only advertisements, or advertisements limited to AI-based language translation of a human performer. A violation carries a civil penalty of $1,000 for a first violation and $5,000 for any subsequent violation; media and platforms that merely publish or disseminate a non-compliant advertisement are separately, expressly exempted.",
    applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'New York' }],
    unresolved_project_dependencies: [
      'advertiser_or_duty_holder_status_confirmed',
      'synthetic_performer_present_confirmed',
      'actual_knowledge_confirmed',
      'expressive_work_exemption_applies',
    ],
    provider_scope: null,
    tool_scope: null,
    publication_scope: 'Reviewer/Commercial Assurance', // CAH-4E: hand-synced from GOVERNED-CLAIMS.md `Publication scope:` line
    last_verified: '2026-09-10',
    superseded_by: null,
  },
]
