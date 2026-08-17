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
 * CLAIM-STOCK-EDITORIAL-001-v1 (Adopted 2026-08-17, PM/JD, following Formal
 * Governance Review #1) is DELIBERATELY NOT mirrored here. Its actual
 * subject (Third-Party Source Assets / Stock Media Licensing) has no
 * corresponding `GoalCategory` value in `types/interview-engine.ts`'s
 * current set (`commercial_use`, `copyright_ownership`, `copyrightability`,
 * `likeness`, `unknown`) -- `THIRD_PARTY_SOURCE_ASSETS_ROUTING_ARCHITECTURE.md`
 * approved a future `third_party_source_rights` category as architectural
 * direction only, not implemented. Tagging this claim under an existing,
 * unrelated category (most temptingly `commercial_use`) was considered
 * during governance review and rejected: `TopicClaim.topic` is "the field
 * Topic Retrieval actually matches on" (see this claim's own doc comment
 * above), so a wrong value would make it an unintended topic-candidate for
 * every goal in that category, independent of whether the user ever
 * mentioned a stock-media provider -- exactly the silent-misclassification
 * failure mode `GOVERNED-CLAIMS.md`'s own governance discipline exists to
 * prevent for `Applicability requirements`, extended here to `Topic`. See
 * the claim's own "GOVERNANCE TREATMENT" note in `GOVERNED-CLAIMS.md` for
 * the full reasoning, and
 * `__tests__/retrieval-engine/topic-claims-fixture-consistency.test.ts`
 * (`CLAIMS_WITHOUT_FIXTURE_REPRESENTATION`) for the consistency-guard
 * accommodation this omission required. Add this claim here, with its real
 * topic, only when that `GoalCategory` value is deliberately, separately
 * implemented -- never as a side effect of an unrelated change.
 *
 * CLAIM-STOCK-EDITORIAL-002-v1 (Adopted 2026-08-17, PM/JD, following Formal
 * Governance Review #2) is DELIBERATELY NOT mirrored here either, for the
 * SAME reason as CLAIM-STOCK-EDITORIAL-001-v1 immediately above -- not a
 * second, independent architecture gap, the identical one. Both claims
 * share one `GoalCategory` blocker and will gain their real
 * `TOPIC_CLAIMS_FIXTURE` entries together, in the same future change, when
 * that value is implemented. See `CLAIMS_WITHOUT_FIXTURE_REPRESENTATION` in
 * the consistency test for both IDs.
 *
 * CLAIM-STOCK-GETTY-EDITORIAL-001-v1 (Adopted 2026-08-17, PM/JD, following
 * Formal Governance Review #3) is DELIBERATELY NOT mirrored here either --
 * the SAME `GoalCategory` gap as the two claims immediately above, a third
 * instance of one blocker, not a third independent one. This provider-
 * specific claim additionally has a SECOND future dependency beyond that
 * shared gap: even once `third_party_source_rights` exists, it would need
 * a not-yet-scoped provider-narrowing capability (something that can tell
 * Retrieval "this conversation is actually about Getty") before it could
 * safely become CRC-eligible -- see this claim's own "Additional future
 * dependency" note in `GOVERNED-CLAIMS.md`. Not designed or implemented
 * here. See `CLAIMS_WITHOUT_FIXTURE_REPRESENTATION` in the consistency
 * test for all three IDs.
 *
 * CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1 (Adopted 2026-08-17, PM/JD,
 * following Formal Governance Review #4) is DELIBERATELY NOT mirrored here
 * either -- the SAME `GoalCategory` gap as the three claims immediately
 * above, a fourth instance of one blocker, not a fourth independent one.
 * Carries the same provider-narrowing future dependency as
 * CLAIM-STOCK-GETTY-EDITORIAL-001-v1 (confirmed, not a new requirement --
 * Formal Governance Review #4's own finding). Additionally: this claim's
 * own provenance is explicitly weaker than Getty's on one clause (Rights
 * and Clearance rests on Official Secondary sourcing, not Verified
 * Primary -- Shutterstock's customer-facing license agreement remained
 * inaccessible across eight independent attempts over three research
 * sessions) -- disclosed in the claim's own text and governance notes, not
 * a reason to withhold Adoption, per Formal Governance Review #4's own
 * reasoning. See `CLAIMS_WITHOUT_FIXTURE_REPRESENTATION` in the
 * consistency test for all four IDs.
 *
 * CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1 (Adopted 2026-08-17, PM/JD,
 * following Formal Governance Review #5) is DELIBERATELY NOT mirrored
 * here either -- the SAME `GoalCategory` gap as the four claims
 * immediately above, a fifth instance of one blocker, not a fifth
 * independent one. Carries the same provider-narrowing future dependency
 * as CLAIM-STOCK-GETTY-EDITORIAL-001-v1 and
 * CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1 (confirmed, not a new
 * requirement -- Formal Governance Review #5's own finding). Unlike
 * those two, this claim's provenance is classified DIRECTLY
 * SOURCE-BACKED with no evidence-tier caveat at all -- its single load-
 * bearing source (iStock's own license agreement) was directly,
 * consistently fetched three times across the whole research program,
 * and the claim asserts no exception mechanism whose sourcing could be
 * questioned in the first place. See
 * `CLAIMS_WITHOUT_FIXTURE_REPRESENTATION` in the consistency test for
 * all five IDs.
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
