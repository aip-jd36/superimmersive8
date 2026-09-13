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
 *
 * Adopted `commercial_use -> ai_content_transparency` TopicRelationship
 * production representation (2026-09-13, bounded production Living-
 * Knowledge authoring milestone): `REL-COMMERCIAL-USE-AI-CONTENT-
 * TRANSPARENCY-v1` now has a real fixture entry -- the first entry in this
 * fixture whose `target_topic` is a `KnowledgeOnlyTopic` (`ai_content_
 * transparency`), not a `GoalCategory`. `crc_eligible: 'Pending'` (per
 * `TOPIC-RELATIONSHIPS.md`'s own governed record) -- this milestone does
 * NOT author a CRC Publication Review and does NOT change that value.
 * Structurally inert for CRC by construction: `relationshipIsAdoptedAnd
 * CrcEligible()` returns `false` for this entry (its own `crc_eligible`
 * is `'Pending'`), so `lookupRelatedTopicClaims()`'s own `eligibleRelation
 * ships` filter excludes it before any target-claim search ever runs, for
 * every real `GoalCategory` -- proven directly against real code before
 * this entry was added (pre-authoring eligibility-gate canary, throwaway,
 * never committed), not merely asserted. The double gate remains
 * independent both ways: this relationship's own `crc_eligible: 'Pending'`
 * alone is already sufficient to exclude it, regardless of the target
 * claim's (`CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1`,
 * `topic-claims-fixture.ts`) own independent `crc_eligible: 'Pending'`
 * state, which is itself unchanged and unaffected by this addition. See
 * `TOPIC-RELATIONSHIPS.md`'s own `REL-COMMERCIAL-USE-AI-CONTENT-
 * TRANSPARENCY-v1` entry and `governance-reviews/
 * FGR_020_CAND-REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-001_2026-09-13.md`
 * for the full governance record this entry mirrors verbatim.
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
  {
    // EU AI Act Article 50(4) — commercial_use -> ai_content_transparency
    // (2026-09-13, Adopted TopicRelationship production representation
    // milestone). See this file's own header comment (above) for the full
    // rationale on every field below. Mirrored verbatim from
    // TOPIC-RELATIONSHIPS.md's own adopted entry; no wording strengthened,
    // simplified, or reconstructed here. STILL `crc_eligible: 'Pending'` --
    // this milestone does not perform or imply a CRC Publication Review.
    relationship_id: 'REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1',
    source_topic: 'commercial_use',
    target_topic: 'ai_content_transparency',
    relationship_type: 'relevant_consideration',
    rationale:
      "Claims under the target topic may provide relevant governed information for interpreting a goal under the source topic, but do not themselves determine the source-topic answer. Specifically: a user's explicit commercial-use question may have a complete, honest answer that separately notes an EU AI-content-transparency disclosure consideration potentially relevant to the same content, without that consideration by itself determining whether, or confirming that, the project may be used commercially.",
    lifecycle: 'Adopted',
    adoption_approver: 'JD (PM)',
    adoption_decision_date: '2026-09-13',
    publication_scope: 'Reviewer/Commercial Assurance',
    crc_eligible: 'Pending',
    crc_approver: 'PENDING',
    crc_decision_date: 'PENDING',
    last_reviewed: '2026-09-13',
    superseded_by: null,
  },
]
