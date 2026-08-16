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
 * relationship. Still `crc_eligible: 'Pending'`, deliberately: CRC
 * eligibility for a relationship is a separate decision from Adoption, per
 * this document's own governance discipline, and PM's explicit
 * not-yet-decided status for this record specifically.
 * `lookupRelatedTopicClaims()` requires BOTH `lifecycle === 'Adopted' &&
 * crc_eligible === 'Yes'` on the relationship itself before it is even
 * considered a candidate -- `crc_eligible: 'Pending'` alone is sufficient
 * to keep this relationship (and therefore all related-topic retrieval)
 * completely excluded from CRC output today, regardless of the target
 * claims' own eligibility. This is the concrete mechanism the zero-
 * behavior-change requirement rests on.
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
    crc_eligible: 'Pending',
    crc_approver: 'PENDING',
    crc_decision_date: 'PENDING',
    last_reviewed: '2026-08-16',
    superseded_by: null,
  },
]
