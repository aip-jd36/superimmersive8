/**
 * CAH-4E §4 / §16.B — CRC retrieval is byte-behaviorally unchanged.
 *
 * CAH-4E adds `publication_scope` to `TopicClaim` and a parallel reviewer
 * selector. It must not touch the CRC consumer. Proven here two ways:
 *   1. SOURCE: retrieve.ts / lookup-topic-claims.ts / lookup-topic-relationships.ts /
 *      lookup-discovered-topic-claims.ts / enumerate-eligible-claims.ts /
 *      assemble-result.ts never reference `publication_scope` or `reviewer-lk`;
 *   2. BEHAVIOR: `retrieve()` over the real production fixture yields the same
 *      claim set for representative handoffs, and `lookupTopicClaims` still
 *      gates on `crc_eligible === 'Yes'`.
 */

import * as fs from 'fs'
import * as path from 'path'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'

const RETRIEVAL_DIR = path.join(__dirname, '..', '..', 'lib', 'retrieval-engine')
const CRC_RETRIEVAL_FILES = [
  'retrieve.ts',
  'lookup-topic-claims.ts',
  'lookup-topic-relationships.ts',
  'lookup-discovered-topic-claims.ts',
  'lookup-rows.ts',
  'enumerate-eligible-claims.ts',
  'assemble-result.ts',
  'extract-matchable-facts.ts',
]

describe('SOURCE — CRC retrieval modules do not reference CAH-4E concepts', () => {
  test.each(CRC_RETRIEVAL_FILES)('%s references neither the reviewer eligibility primitive nor reviewer-lk, and never reads `.publication_scope` off a claim', (file) => {
    const src = fs.readFileSync(path.join(RETRIEVAL_DIR, file), 'utf-8')
    // The pre-existing `RetrievalResult.publication_scope` FIELD is fine; what
    // must not appear is the CAH-4E reviewer primitive or a read of the new
    // `TopicClaim.publication_scope` field.
    expect(src).not.toMatch(/REVIEWER_ELIGIBLE_PUBLICATION_SCOPES/)
    expect(src).not.toMatch(/reviewer-lk|reviewer_lk|evaluateReviewerEligibility/)
    expect(src).not.toMatch(/claim\.publication_scope|\bc\.publication_scope\b/)
  })
})

function handoff(o: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [],
    workflow_role: 'unresolved', intended_use: 'unclear', scoped_observations: [],
    certainty_state: 'gate_1_unmet', exclusions: [], ...o,
  }
}
function goal(category: UserGoal['category']): UserGoal {
  return { goal_id: `g-${category}`, raw_text: category, category, scope: 'informational', state: 'confirmed', superseded_by: null, source_turn: 1, source_statement: category }
}

describe('BEHAVIOR — retrieve() output unchanged over the real production fixture', () => {
  const usFacts = { jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [] }

  test('copyright_ownership goal -> exactly CLAIM-COPY-004-v1 (Global, no scope narrowing)', () => {
    const { results } = retrieve(
      handoff(), MATRIX_FIXTURE, [goal('copyright_ownership')], TOPIC_CLAIMS_FIXTURE, usFacts,
    )
    expect(results.map((r) => r.claim_id).sort()).toEqual(['CLAIM-COPY-004-v1'])
  })

  test('copyrightability goal + US jurisdiction -> COPY-001/002/003', () => {
    const { results } = retrieve(
      handoff(), MATRIX_FIXTURE, [goal('copyrightability')], TOPIC_CLAIMS_FIXTURE, usFacts,
    )
    expect(results.map((r) => r.claim_id).sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1'])
  })

  test('lookupTopicClaims still requires crc_eligible === "Yes" (a Pending/No fixture-shaped claim never matches)', () => {
    const pendingClaim = { ...TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-004-v1')!, claim_id: 'CLAIM-FAKE-PENDING-v1', crc_eligible: 'Pending' as const }
    const noClaim = { ...pendingClaim, claim_id: 'CLAIM-FAKE-NO-v1', crc_eligible: 'No' as const }
    const { matches } = lookupTopicClaims([goal('copyright_ownership')], [pendingClaim, noClaim], usFacts)
    expect(matches).toEqual([])
  })

  test('no goals -> no topic results (unchanged)', () => {
    const { results } = retrieve(handoff(), MATRIX_FIXTURE, [], TOPIC_CLAIMS_FIXTURE, usFacts)
    expect(results.filter((r) => r.match_origin !== 'exact_topic' || r.source_fact.kind === 'topic').map((r) => r.claim_id)).toEqual([])
  })
})
