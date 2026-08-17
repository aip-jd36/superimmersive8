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
 * UPDATE (Living Knowledge -- Third-Party Source Rights, M1+M2, 2026-08-18):
 * `third_party_source_rights` is now a real, implemented `GoalCategory`
 * value (see `types/interview-engine.ts`'s `GOAL_CATEGORIES`) and
 * `AssetProviderMention` capture/persistence now exists -- the gap described
 * for each claim below as "no corresponding GoalCategory value" is CLOSED.
 * All five stock claims remain DELIBERATELY absent from this fixture
 * anyway: M1+M2 was explicitly scoped (PM authorization,
 * `THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md` §22-23) to
 * GoalCategory + AssetProviderMention capture ONLY -- provider-scoped
 * retrieval (M3) and runtime-fixture/CRC-eligibility representation (M4)
 * are separate, not-yet-authorized milestones. Adding a real
 * `TOPIC_CLAIMS_FIXTURE` entry is never an automatic consequence of a
 * GoalCategory shipping; it is its own deliberate governance/engineering
 * decision, made together with (never ahead of) the provider-narrowing
 * mechanism these three provider-specific claims specifically require. See
 * `__tests__/retrieval-engine/topic-claims-fixture-consistency.test.ts`
 * (`CLAIMS_WITHOUT_FIXTURE_REPRESENTATION`) for the consistency-guard
 * accommodation, updated in the same change as this comment.
 *
 * CLAIM-STOCK-EDITORIAL-001-v1 (Adopted 2026-08-17, Formal Governance
 * Review #1) and CLAIM-STOCK-EDITORIAL-002-v1 (Adopted 2026-08-17, Formal
 * Governance Review #2) are generic (provider-agnostic) claims -- unlike the
 * three provider-specific claims below, they have NO remaining architecture
 * blocker beyond M4's own governance decision now that GoalCategory exists.
 * Add both here, with `topic: 'third_party_source_rights'`, together in the
 * same future change that authorizes M4 -- never as a side effect of an
 * unrelated change, and never ahead of that explicit authorization.
 *
 * CLAIM-STOCK-GETTY-EDITORIAL-001-v1 (Adopted 2026-08-17, Formal Governance
 * Review #3), CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1 (Adopted 2026-08-17,
 * Formal Governance Review #4, provenance note: Rights and Clearance rests
 * on Official Secondary sourcing, not Verified Primary -- disclosed, not a
 * reason to withhold Adoption), and CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1
 * (Adopted 2026-08-17, Formal Governance Review #5, DIRECTLY SOURCE-BACKED
 * provenance, no evidence-tier caveat) are provider-specific claims. Each
 * still has a real, unresolved architecture blocker: provider-scoped
 * retrieval (M3 -- a governed `provider_scope` join on `TopicClaim`, per
 * `THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md` §7-§11) is NOT
 * implemented as of M1+M2. Without it, adding these three to the fixture
 * would surface Getty/Shutterstock/iStock-specific content to any user who
 * asked a generic third-party-source-rights question, regardless of which
 * provider (if any) they named -- exactly the false-positive this whole
 * design exists to prevent. Add these three, with `provider_scope` set,
 * only once M3 ships and M4 separately authorizes it.
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
    last_verified: '2026-08-16',
    superseded_by: null,
  },
]
