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
    crc_eligible: 'Pending',
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
