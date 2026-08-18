/**
 * Typed topic-relationships fixture (Governed Topic Relationships
 * implementation milestone, 2026-08-16). Same discipline as
 * topic-claims-fixture.ts/matrix-fixture.ts: NOT a live parser of
 * TOPIC-RELATIONSHIPS.md -- hand-synced mirror, with a small consistency
 * test (__tests__/retrieval-engine/topic-relationships-fixture-consistency.test.ts)
 * catching relationship_id/source_topic/target_topic/relationship_type/
 * lifecycle/publication_scope/crc_eligible/superseded_by drift between this
 * file and the real markdown.
 *
 * ADOPTED 2026-08-16 (Adoption Approver: JD/PM) as SI8 institutional/
 * reviewer routing knowledge -- `lifecycle: 'Adopted'` on the one Phase 1
 * relationship. Originally `crc_eligible: 'Pending'`, deliberately: CRC
 * eligibility for a relationship is a separate decision from Adoption, per
 * this document's own governance discipline.
 * `lookupRelatedTopicClaims()` requires BOTH `lifecycle === 'Adopted' &&
 * crc_eligible === 'Yes'` on the relationship itself before it is even
 * considered a candidate -- `crc_eligible: 'Pending'` alone was sufficient
 * to keep this relationship (and therefore all related-topic retrieval)
 * completely excluded from CRC output, regardless of the target claims'
 * own eligibility. This was the concrete mechanism the zero-behavior-
 * change requirement rested on prior to 2026-08-19.
 *
 * UPDATE (2026-08-19, atomic copyright publication package): this
 * relationship is now `crc_eligible: 'Yes'`, published together with its
 * three target claims -- `CLAIM-COPY-001-v1`/`-002-v1`/`-003-v1` in
 * `topic-claims-fixture.ts` -- in a single atomic governance decision,
 * following a bounded Copyright CRC Publication-Readiness Review
 * (recommendation A -- PASS/GO AS-IS, no text/rationale change) and PM
 * approval. See
 * `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`.
 * The double gate described above is architecturally unchanged --
 * `lookupRelatedTopicClaims()` still requires BOTH this relationship AND
 * the target claim to independently be `Adopted` + `crc_eligible: 'Yes'`;
 * this update only changes which side of that gate is now also true.
 */

import type { TopicRelationship } from './types'

export const TOPIC_RELATIONSHIPS_FIXTURE: TopicRelationship[] = [
  {
    relationship_id: 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1',
    source_topic: 'copyright_ownership',
    target_topic: 'copyrightability',
    relationship_type: 'relevant_consideration',
    rationale:
      'Claims under the target topic may provide relevant governed information for interpreting a goal under the source topic, but do not themselves determine the source-topic answer.',
    lifecycle: 'Adopted',
    adoption_approver: 'JD (PM)',
    adoption_decision_date: '2026-08-16',
    publication_scope: 'Reviewer/Commercial Assurance',
    crc_eligible: 'Yes',
    crc_approver: 'JD (PM)',
    crc_decision_date: '2026-08-19',
    last_reviewed: '2026-08-16',
    superseded_by: null,
  },
]
