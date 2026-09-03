/**
 * CAH-3B.1 — Bounded Interpretation OWNERSHIP (§1, §2, §7, §18.A, §19).
 *
 * The authority chain is:
 *   Living Knowledge -> Retrieval -> Bounded Interpretation -> Sales projection
 *
 * The Sales subsystem must CONSUME authoritative upstream Bounded
 * Interpretation. It must NOT PRODUCE it. These tests are STRUCTURAL first
 * (imports / call ownership), not output-wording, and are designed to make
 * it hard for a future engineer to reintroduce
 * `Sales -> buildBoundedInterpretations(...)`.
 */

import * as fs from 'fs'
import * as path from 'path'

import { buildSalesAnswerContext } from '@/lib/crc-sales/answer-context'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { emptyStructuredUnderstanding } from '@/lib/interview-engine/eval/empty-structured-understanding'
import type { StructuredUnderstanding, UserGoal, ToolMention } from '@/types/interview-engine'

const APP_ROOT = path.join(__dirname, '..', '..')
function listTs(dir: string): string[] {
  const full = path.join(APP_ROOT, dir)
  if (!fs.existsSync(full)) return []
  const out: string[] = []
  for (const e of fs.readdirSync(full, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...listTs(p))
    else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) out.push(p)
  }
  return out
}
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
/** Source with comments removed -- a comment that NAMES the forbidden
 *  primitive while forbidding it must not trip a call/identifier scan. */
const codeOnly = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
const importStatements = (src: string) => (src.match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')

// ── A. structural: Sales never constructs BI ─────────────────────────────

const BI_CONSTRUCTORS = [
  'buildBoundedInterpretations',
  'buildBoundedInterpretation',
  'build-bounded-interpretation',
]

describe('A. Sales answer-context does not construct Bounded Interpretation', () => {
  test('answer-context.ts imports NO BI-construction module and CALLS no BI constructor', () => {
    const imports = importStatements(read('lib/crc-sales/answer-context.ts'))
    for (const c of BI_CONSTRUCTORS) expect(imports).not.toContain(c)
    // no call of the constructor, in real code (comments stripped).
    expect(codeOnly('lib/crc-sales/answer-context.ts')).not.toMatch(/buildBoundedInterpretations?\s*\(/)
  })

  test('NO file anywhere under lib/crc-sales/ imports a BI-construction module or calls a BI constructor', () => {
    for (const rel of listTs('lib/crc-sales')) {
      const imports = importStatements(read(rel))
      for (const c of BI_CONSTRUCTORS) expect(imports).not.toContain(c)
      expect(codeOnly(rel)).not.toMatch(/buildBoundedInterpretations?\s*\(/)
    }
  })

  test('answer-context.ts consumes the authoritative pipeline BI field', () => {
    const src = codeOnly('lib/crc-sales/answer-context.ts')
    expect(src).toMatch(/runCRCConversation\(/)
    expect(src).toMatch(/\.bounded_interpretations\b/)
  })
})

// ── B. the authoritative pipeline exposes BI (additive contract) ─────────

describe('B. runCRCConversation exposes the authoritative BI it already computes', () => {
  const goal = (): UserGoal => ({
    goal_id: 'g1', raw_text: 'Can I use it commercially?', category: 'commercial_use', scope: 'informational',
    state: 'confirmed', superseded_by: null, source_turn: 1, source_statement: 'x',
  })
  const tool = (id: string): ToolMention => ({
    mention_id: `m-${id}`, resolution: { kind: 'canonical', identifier: id }, access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' }, confidence: 'confirmed', source_turn: 1, source_statement: id, superseded_by: null,
  })
  function su(): StructuredUnderstanding {
    return {
      ...emptyStructuredUnderstanding(),
      tool_mentions: [tool('runway-gen3')],
      user_goals: [goal()],
      current_phase: 3, gate_1_state: 'met', gate_2_state: 'stable', completion_reason: 'gate_1_gate_2_met',
    }
  }

  test('bounded_interpretations is present, an array, one entry per confirmed goal', () => {
    const pipe = runCRCConversation(su(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(Array.isArray(pipe.bounded_interpretations)).toBe(true)
    expect(pipe.bounded_interpretations.map((b) => b.category)).toEqual(['commercial_use'])
  })

  test('additive: output / plan / diagnostics / trace still present and unchanged in shape', () => {
    const pipe = runCRCConversation(su(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(pipe.output).toBeDefined()
    expect(pipe.plan).toBeDefined()
    expect(pipe.diagnostics).toEqual(expect.objectContaining({ retrieval: expect.any(Array), projection: expect.any(Array) }))
    expect(pipe.trace).toEqual(expect.objectContaining({ retrieval_handoff: expect.any(Object), retrieval_results: expect.any(Array) }))
  })

  test('the BI the Sales projection surfaces IS the pipeline BI (same statuses, same goal order)', () => {
    const s = su()
    const pipe = runCRCConversation(s, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const ctx = buildSalesAnswerContext(s, null)
    expect(ctx.available).toBe(true)
    expect(ctx.goal_statuses!.map((g) => [g.goal_category, g.interpretation_status])).toEqual(
      pipe.bounded_interpretations.map((b) => [b.category, b.status]),
    )
    // supporting / unresolved claim ids come straight from authoritative BI
    for (let i = 0; i < pipe.bounded_interpretations.length; i++) {
      expect(ctx.goal_statuses![i].supporting_claim_ids).toEqual([...pipe.bounded_interpretations[i].supporting_claim_ids])
      expect(ctx.goal_statuses![i].unresolved_relevant_claim_ids).toEqual(
        pipe.bounded_interpretations[i].unresolved_relevant_claims.map((c) => c.claim_id),
      )
    }
  })
})

// ── C. fail closed: missing authoritative BI is NOT reconstructed ────────

describe('C. missing authoritative BI -> unavailable, never locally reconstructed', () => {
  test('a pipeline result without bounded_interpretations -> { available: false }', () => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/crc-engine/run-crc-conversation', () => ({
        runCRCConversation: () => ({
          output: {}, plan: {}, diagnostics: { retrieval: [], projection: [] },
          trace: { retrieval_handoff: {}, retrieval_results: [], projection_output: {} },
          // bounded_interpretations deliberately absent
        }),
      }))
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { buildSalesAnswerContext: build } = require('@/lib/crc-sales/answer-context')
      const ctx = build({ ...emptyStructuredUnderstanding(), user_goals: [] }, 'c1')
      expect(ctx.available).toBe(false)
      expect(ctx.goal_statuses).toBeUndefined()
    })
  })

  test('a pipeline that throws -> { available: false }, default note preserved', () => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/crc-engine/run-crc-conversation', () => ({
        runCRCConversation: () => {
          throw new Error('pipeline down')
        },
      }))
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { buildSalesAnswerContext: build } = require('@/lib/crc-sales/answer-context')
      const ctx = build({ ...emptyStructuredUnderstanding(), user_goals: [] }, 'c1')
      expect(ctx.available).toBe(false)
      expect(ctx.temporal_note).toMatch(/current governed knowledge/i)
    })
  })
})
