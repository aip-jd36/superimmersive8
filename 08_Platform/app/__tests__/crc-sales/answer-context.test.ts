/**
 * CAH-3B — current-LK answer context: exhaustive mapping, structural
 * boundedness, Track C provenance, fail-closed.
 * CAH-3B.1 — consumes authoritative pipeline BI (see bi-ownership.test.ts).
 * (§15, §16, §17, §23.C)
 */

import { buildSalesAnswerContext, INTERPRETATION_STATUS_LABEL } from '@/lib/crc-sales/answer-context'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { INTERPRETATION_STATUSES } from '@/lib/bounded-interpretation/types'
import { emptyStructuredUnderstanding } from '@/lib/interview-engine/eval/empty-structured-understanding'
import type { StructuredUnderstanding, UserGoal, ToolMention, AssetProviderMention } from '@/types/interview-engine'

const goal = (id: string, raw: string, category: UserGoal['category'], scope: UserGoal['scope'] = 'informational'): UserGoal => ({
  goal_id: id, raw_text: raw, category, scope, state: 'confirmed', superseded_by: null, source_turn: 1, source_statement: raw,
})
const tm = (identifier: string): ToolMention => ({
  mention_id: `m-${identifier}`, resolution: { kind: 'canonical', identifier }, access_surface: { state: 'unknown' },
  plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' }, confidence: 'confirmed', source_turn: 1, source_statement: identifier, superseded_by: null,
})
const apm = (identifier: string): AssetProviderMention => ({
  mention_id: `ap-${identifier}`, resolution: { kind: 'canonical', identifier }, confidence: 'confirmed', source_turn: 1, source_statement: identifier,
  superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' },
})

function su(goals: UserGoal[], tools: ToolMention[], providers: AssetProviderMention[] = []): StructuredUnderstanding {
  return {
    ...emptyStructuredUnderstanding(),
    project_facts: {
      ...emptyStructuredUnderstanding().project_facts,
      intended_use: { attestation: { state: 'confirmed', value: 'a client social ad' }, source_turn: 1, source_statement: 'x' },
    },
    tool_mentions: tools,
    user_goals: goals,
    asset_provider_mentions: providers,
    current_phase: 3,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: 'gate_1_gate_2_met',
  }
}

describe('INTERPRETATION_STATUS_LABEL', () => {
  test('is exhaustive over every BoundedInterpretation.status value', () => {
    for (const s of INTERPRETATION_STATUSES) {
      expect(INTERPRETATION_STATUS_LABEL[s]).toBeDefined()
      expect(typeof INTERPRETATION_STATUS_LABEL[s]).toBe('string')
    }
    expect(Object.keys(INTERPRETATION_STATUS_LABEL).sort()).toEqual([...INTERPRETATION_STATUSES].sort())
  })
})

describe('buildSalesAnswerContext — real pipeline', () => {
  test('Runway + commercial_use → directly_relevant goal status + runway-gen3 governed reference', () => {
    const s = su([goal('g1', 'Can I use it commercially?', 'commercial_use')], [tm('runway-gen3')])
    const ctx = buildSalesAnswerContext(s, 'deadbeef1234')
    expect(ctx.available).toBe(true)
    expect(ctx.goal_statuses).toEqual([
      expect.objectContaining({ goal_category: 'commercial_use', interpretation_status: 'directly_relevant' }),
    ])
    expect(ctx.governed_references!.map((r) => r.claim_id)).toContain('runway-gen3')
    expect(ctx.session_runtime_commit).toBe('deadbeef1234')
    expect(ctx.temporal_note).toMatch(/current governed knowledge/i)
    expect(ctx.temporal_note).toMatch(/not a record of exactly what CRC told/i)
  })

  test('unresolved applicability items (whatever the current fixtures produce) are fact identifiers + status, never questions/attestations', () => {
    // Fixture-independent: exercise a provider workflow that historically
    // surfaces applicability diagnostics, and assert the SHAPE of anything
    // that comes back. Correction 3: no domain-specific expectation.
    const s = su([goal('g1', 'Can I use it commercially?', 'commercial_use')], [tm('kling')], [apm('istock')])
    const ctx = buildSalesAnswerContext(s, null)
    expect(ctx.available).toBe(true)
    for (const u of ctx.unresolved_applicability ?? []) {
      expect(u).toEqual(
        expect.objectContaining({
          claim_id: expect.any(String),
          fact: expect.any(String),
          status: expect.stringMatching(/^(unresolved|not_met)$/),
          goal_category: expect.any(String),
        }),
      )
      // Never rendered as a prompt.
      expect(JSON.stringify(u)).not.toMatch(/\?|confirm|do you|please provide/i)
    }
  })

  test('every governed reference is a verbatim subset of the unchanged pipeline’s retrieval_results (no fork)', () => {
    const s = su([goal('g1', 'Can I use it commercially?', 'commercial_use')], [tm('kling')], [apm('istock')])
    const pipe = runCRCConversation(s, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const pipeIds = new Set(pipe.trace.retrieval_results.map((r) => r.claim_id))
    const ctx = buildSalesAnswerContext(s, null)
    for (const ref of ctx.governed_references ?? []) {
      expect(pipeIds.has(ref.claim_id)).toBe(true)
    }
  })

  test('Track C: every reference carries matched_goal_category; a discovered_topic one keeps its originating explicit goal', () => {
    const s = su([goal('g1', 'Can I use it commercially?', 'commercial_use')], [tm('runway-gen3')], [apm('istock')])
    const ctx = buildSalesAnswerContext(s, null)
    const refs = ctx.governed_references ?? []
    expect(refs.length).toBeGreaterThan(0)
    for (const r of refs) {
      expect(typeof r.matched_goal_category).toBe('string')
      expect(r.matched_goal_category.length).toBeGreaterThan(0)
    }
    for (const d of refs.filter((r) => r.match_origin === 'discovered_topic')) {
      // The originating explicit goal was commercial_use; the claim's own
      // subject (topic) is something else (e.g. third_party_source_rights).
      expect(d.matched_goal_category).toBe('commercial_use')
    }
  })

  test('a discovered_topic result with no matched_goal_category is OMITTED (Track C fail-closed) — verified against a stubbed pipeline', () => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/crc-engine/run-crc-conversation', () => ({
        runCRCConversation: () => ({
          bounded_interpretations: [],
          trace: {
            retrieval_results: [
              { claim_id: 'ok', matrix_identifier: 'm', topic: 'commercial_use', match_origin: 'exact_topic', matched_goal_category: 'commercial_use', relationship_id: null, last_verified: null },
              { claim_id: 'orphan', matrix_identifier: 'm2', topic: 'third_party_source_rights', match_origin: 'discovered_topic', matched_goal_category: '', relationship_id: null, last_verified: null },
            ],
          },
          diagnostics: { retrieval: [] },
        }),
      }))
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { buildSalesAnswerContext: build } = require('@/lib/crc-sales/answer-context')
      const ctx = build(su([goal('g1', 'x', 'commercial_use')], []), null)
      const ids = (ctx.governed_references ?? []).map((r: { claim_id: string }) => r.claim_id)
      expect(ids).toContain('ok')
      expect(ids).not.toContain('orphan')
    })
  })

  test('no goal → available with empty structured lists, never throws', () => {
    const s = su([], [tm('runway-gen3')])
    const ctx = buildSalesAnswerContext(s, null)
    expect(ctx.available).toBe(true)
    expect(ctx.goal_statuses).toEqual([])
  })

  test('output contains no risk/materiality/priority/recommendation lexicon', () => {
    const s = su([goal('g1', 'Can I use it commercially?', 'commercial_use')], [tm('kling')], [apm('istock')])
    const json = JSON.stringify(buildSalesAnswerContext(s, null)).toLowerCase()
    for (const bad of ['risk', 'material', 'blocker', 'unsafe', 'needs evidence', 'will fail', 'priority', 'recommended', 'next step', 'readiness', 'score', 'top issue', 'main blocker', 'likely infring']) {
      expect(json).not.toContain(bad)
    }
  })

  test('fail closed: a recompute that throws → { available: false }, default note still present', () => {
    // Feed a structurally broken SU (null user_goals) — buildBoundedInterpretations / retrieve will throw.
    const broken = { ...su([], []), user_goals: null } as unknown as StructuredUnderstanding
    const ctx = buildSalesAnswerContext(broken, 'commit-x')
    expect(ctx.available).toBe(false)
    expect(ctx.goal_statuses).toBeUndefined()
    expect(ctx.temporal_note).toMatch(/current governed knowledge/i)
    expect(ctx.session_runtime_commit).toBe('commit-x')
  })
})
