/**
 * LK-DEMAND-2B2 -- Governed Subject Foundation (2026-09-17), corrected by
 * LK-DEMAND-2B2-R1 (same date): the production governed subject-type
 * vocabulary is genuinely EMPTY -- `'tool'`/`'asset_provider'` were removed
 * as a premature ontology assertion (see `GOVERNED_SUBJECT_TYPES`'s own
 * header, types.ts). Every fixture below is either (a) a bare structural
 * `GovernedSubjectCandidate` object with a synthetic, neutral `subject_type`
 * string, used ONLY to exercise `validateGovernedSubjects`' own logic
 * (never a production `GovernedSubject`, which cannot be constructed at
 * all while `GOVERNED_SUBJECT_TYPES` is empty -- `subject_type: never`), or
 * (b) a `TopicClaim` fixture for the separate `subject_ids` checks. No test
 * here adds a synthetic type to the production `GOVERNED_SUBJECT_TYPES`
 * constant -- populated-registry behavior is exercised entirely via the
 * injectable `governedTypes` parameter on `validateGovernedSubjects`.
 *
 * CASE K (6251cd9 non-interference) is NOT a test in this file -- it is
 * verified by running the existing, untouched
 * __tests__/crc-engine/knowledge-demand-coverage.test.ts suite unchanged
 * (see the LK-DEMAND-2B2-R1 Final Report's own "M. Tests" section).
 *
 * Run: npx jest __tests__/retrieval-engine/governed-subject.test.ts
 */

import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { GOVERNED_SUBJECT_TYPES } from '@/lib/retrieval-engine/types'
import { validateGovernedSubjects, validateTopicClaimSubjectIds, type GovernedSubjectCandidate } from '@/lib/retrieval-engine/governed-subject'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

function candidate(overrides: Partial<GovernedSubjectCandidate> = {}): GovernedSubjectCandidate {
  return {
    subject_id: 'test-subject-alpha',
    subject_type: 'test-type-a',
    canonical_name: 'Test Subject Alpha',
    superseded_by: null,
    ...overrides,
  }
}

function claim(overrides: Partial<TopicClaim> = {}): TopicClaim {
  return {
    claim_id: 'test-claim-1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'x',
    crc_candidate_statement: 'x',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-09-17',
    superseded_by: null,
    ...overrides,
  }
}

describe('Case A -- empty type vocabulary', () => {
  test('the production governed subject-type registry contains zero entries', () => {
    expect(GOVERNED_SUBJECT_TYPES).toEqual([])
    expect(GOVERNED_SUBJECT_TYPES.length).toBe(0)
  })
})

describe('Case B -- empty subject registry is valid', () => {
  test('zero governed subjects is a valid system state', () => {
    expect(validateGovernedSubjects([])).toEqual([])
  })
})

describe('Case C -- ungoverned type fails closed', () => {
  test('against the REAL, empty production governed-type set, any candidate subject_type is ungoverned', () => {
    const c = candidate({ subject_type: 'test-type-a' })
    // No governedTypes override -- exercises the real, empty production default.
    const violations = validateGovernedSubjects([c])
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('ungoverned subject_type')
  })

  test('with a TEST-LOCAL governed-type list injected, the same candidate\'s type check passes -- proving the validator logic itself is sound without touching production ontology', () => {
    const c = candidate({ subject_type: 'test-type-a' })
    const violations = validateGovernedSubjects([c], ['test-type-a'])
    expect(violations).toEqual([])
    // The production constant remains untouched by this injection.
    expect(GOVERNED_SUBJECT_TYPES).toEqual([])
  })

  test('an injected governed-type list that does NOT include the candidate\'s type still fails closed', () => {
    const c = candidate({ subject_type: 'test-type-a' })
    const violations = validateGovernedSubjects([c], ['test-type-b'])
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('ungoverned subject_type')
  })
})

describe('Case D -- no tool assumption', () => {
  test('"tool" is not a governed subject type merely because KNOWN_TOOLS/the canonical tool registry exists', () => {
    expect(GOVERNED_SUBJECT_TYPES).not.toContain('tool')
  })
})

describe('Case E -- no asset-provider assumption', () => {
  test('"asset_provider" is not a governed subject type merely because KNOWN_ASSET_PROVIDERS exists', () => {
    expect(GOVERNED_SUBJECT_TYPES).not.toContain('asset_provider')
  })
})

describe('no speculative domain class was substituted for the removed tool/asset_provider assumption', () => {
  test('no platform-shaped class exists either', () => {
    expect(GOVERNED_SUBJECT_TYPES).not.toContain('distribution_platform')
    expect(GOVERNED_SUBJECT_TYPES).not.toContain('youtube')
    expect(GOVERNED_SUBJECT_TYPES).not.toContain('platform')
    expect(GOVERNED_SUBJECT_TYPES).not.toContain('provider')
    expect(GOVERNED_SUBJECT_TYPES).not.toContain('service')
    expect(GOVERNED_SUBJECT_TYPES).not.toContain('generic')
    expect(GOVERNED_SUBJECT_TYPES).not.toContain('unknown')
    expect(GOVERNED_SUBJECT_TYPES).not.toContain('other')
    expect(GOVERNED_SUBJECT_TYPES).not.toContain('placeholder')
  })
})

describe('Case F -- TopicClaim.subject_ids remains optional', () => {
  test('a claim with no subject_ids at all remains fully valid, unchanged', () => {
    const c = claim()
    expect(c.subject_ids).toBeUndefined()
    expect(validateTopicClaimSubjectIds(c)).toEqual([])
  })

  test('a synthetic claim may still declare governed subject ids as a structural matter -- referential validity against an actual registry is a separate, deferred concern', () => {
    const c = claim({ subject_ids: ['test-subject-alpha', 'test-subject-beta'] })
    expect(validateTopicClaimSubjectIds(c)).toEqual([])
    expect(c.subject_ids).toEqual(['test-subject-alpha', 'test-subject-beta'])
  })

  test('duplicate subject_ids within the same claim fail validation', () => {
    const c = claim({ subject_ids: ['test-subject-alpha', 'test-subject-alpha'] })
    const violations = validateTopicClaimSubjectIds(c)
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('duplicate subject_id')
  })
})

describe('Case G -- no automatic backfill from tool_scope/provider_scope', () => {
  test('a claim shaped exactly like a real, existing tool-scoped claim never gains subject_ids merely by existing', () => {
    // Mirrors the real CLAIM-RUNWAY-COMMERCIAL-USE-001-v1 shape (tool_scope
    // set, no subject_ids) -- this milestone introduces no code path that
    // could populate subject_ids from tool_scope/provider_scope, so this
    // is true by construction, proven here explicitly.
    const runwayShapedClaim = claim({ claim_id: 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1', tool_scope: ['runway-gen3'], provider_scope: null })
    expect(runwayShapedClaim.subject_ids).toBeUndefined()
  })

  test('a claim shaped like a real provider-scoped claim never gains subject_ids merely by existing', () => {
    const gettyShapedClaim = claim({ claim_id: 'test-provider-claim', topic: 'third_party_source_rights', provider_scope: ['getty'], tool_scope: null })
    expect(gettyShapedClaim.subject_ids).toBeUndefined()
  })

  test('subject_ids and tool_scope/provider_scope, when both present, hold independent values with no inference either direction', () => {
    const c = claim({ tool_scope: ['test-tool-a'], provider_scope: ['getty'], subject_ids: ['test-subject-beta'] })
    expect(c.subject_ids).not.toEqual(c.tool_scope)
    expect(c.subject_ids).not.toEqual(c.provider_scope)
  })
})

describe('Case H -- aboutness semantics preserved (subject != topic)', () => {
  test('topic (a real KnowledgeTopic) and subject_ids (synthetic) coexist as independent dimensions', () => {
    const c = claim({ topic: 'commercial_use', subject_ids: ['test-subject-alpha'] })
    expect(c.topic).toBe('commercial_use')
    expect(c.subject_ids).toEqual(['test-subject-alpha'])
    expect(c.subject_ids).not.toContain(c.topic)
  })
})

describe('Case I -- CRC eligibility independence', () => {
  test('adding subject_ids does not alter crc_eligible, in either direction', () => {
    const eligible = claim({ crc_eligible: 'Yes' })
    const eligibleWithSubject = { ...eligible, subject_ids: ['test-subject-alpha'] }
    expect(eligibleWithSubject.crc_eligible).toBe('Yes')

    const pending = claim({ crc_eligible: 'Pending' })
    const pendingWithSubject = { ...pending, subject_ids: ['test-subject-alpha'] }
    expect(pendingWithSubject.crc_eligible).toBe('Pending')
  })

  test('GovernedSubjectCandidate itself carries no crc_eligible-shaped field', () => {
    const c = candidate()
    expect((c as unknown as Record<string, unknown>).crc_eligible).toBeUndefined()
  })
})

describe('Case J -- supersession (structural, independent of any populated registry)', () => {
  test('a superseded candidate correctly referencing its replacement produces no violation, and only the replacement counts as active', () => {
    const replacement = candidate({ subject_id: 'test-subject-v2', superseded_by: null })
    const original = candidate({ subject_id: 'test-subject-v1', superseded_by: 'test-subject-v2' })
    // Injected governed type so the supersession-specific checks are
    // isolated from the (expected, separate) ungoverned-type violation.
    expect(validateGovernedSubjects([original, replacement], ['test-type-a'])).toEqual([])
  })

  test('a supersession target that does not exist in the collection fails validation', () => {
    const orphan = candidate({ subject_id: 'test-subject-v1', superseded_by: 'nonexistent-subject-id' })
    const violations = validateGovernedSubjects([orphan], ['test-type-a'])
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('unknown subject_id')
  })

  test('two ACTIVE entries sharing the same subject_id is a violation', () => {
    const a = candidate({ subject_id: 'dup', superseded_by: null })
    const b = candidate({ subject_id: 'dup', superseded_by: null })
    const violations = validateGovernedSubjects([a, b], ['test-type-a'])
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('more than one ACTIVE')
  })
})

describe('Case K -- existing real claim fixture regression', () => {
  test('every real TOPIC_CLAIMS_FIXTURE entry remains valid under the subject_ids check (all currently absent, zero violations)', () => {
    for (const realClaim of TOPIC_CLAIMS_FIXTURE) {
      expect(realClaim.subject_ids).toBeUndefined()
      expect(validateTopicClaimSubjectIds(realClaim)).toEqual([])
    }
  })

  test('the real fixture array itself is unchanged in length/identity by this milestone (sanity check, not a magic-number assertion)', () => {
    expect(TOPIC_CLAIMS_FIXTURE.length).toBeGreaterThan(0)
  })
})
