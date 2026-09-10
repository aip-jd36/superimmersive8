/**
 * CAH-4G Slice 1 (2026-09-10) — the generic Bounded Interpretation input
 * boundary.
 *
 * `buildBoundedInterpretations` now consumes the generic `BiIntent` contract
 * instead of `UserGoal[]`. This suite proves:
 *   1. `userGoalsToBiIntents` (the CRC adapter) reproduces EXACTLY the
 *      active-and-confirmed filter + field mapping Bounded Interpretation
 *      used to apply inline — nothing added, nothing dropped, order kept.
 *   2. Routing a representative goal mix through the adapter yields
 *      byte-identical `BoundedInterpretation[]` to interpreting the same
 *      goals' hand-mapped `BiIntent`s directly (type adaptation only, zero
 *      behaviour change).
 *   3. The generic BI core stays free of any caller shape; only the adapter
 *      knows `UserGoal`. No HRR concept exists anywhere yet.
 *
 * The full `__tests__/bounded-interpretation/**` + CRC/retrieval integration
 * suites additionally now execute through this adapter unchanged (via each
 * file's local shim), so they collectively are the slice's regression proof.
 */

import * as fs from 'fs'
import * as path from 'path'

import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import type { BiIntent } from '@/lib/bounded-interpretation/types'
import type { ConfidenceState, UserGoal } from '@/types/interview-engine'

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text'>): UserGoal {
  return {
    state: 'confirmed',
    category: 'commercial_use',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: overrides.raw_text,
    ...overrides,
  }
}

describe('userGoalsToBiIntents — active/confirmed filter (the exact predicate BI used to apply inline)', () => {
  test('an active, confirmed goal maps to one BiIntent with the four fields carried verbatim', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use', scope: 'informational' })
    expect(userGoalsToBiIntents([g])).toEqual([
      { intent_id: 'g-1', intent_text: 'Can I use this commercially?', category: 'commercial_use', scope: 'informational' },
    ])
  })

  test('a superseded goal (superseded_by !== null) is excluded', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'old', superseded_by: 'g-2' })
    expect(userGoalsToBiIntents([g])).toEqual([])
  })

  test.each<ConfidenceState>(['declined', 'confirmed_absent', 'unresolved_no_visibility', 'unknown'])(
    'a goal in non-confirmed state %s is excluded',
    (state) => {
      const g = goal({ goal_id: 'g-1', raw_text: 'x', state })
      expect(userGoalsToBiIntents([g])).toEqual([])
    },
  )

  test('only the active, confirmed goals among a mix survive, in original order', () => {
    const superseded = goal({ goal_id: 'g-1', raw_text: 'a', superseded_by: 'g-4' })
    const declined = goal({ goal_id: 'g-2', raw_text: 'b', state: 'declined' })
    const activeA = goal({ goal_id: 'g-3', raw_text: 'c', category: 'copyright_ownership' })
    const activeB = goal({ goal_id: 'g-5', raw_text: 'd', category: 'likeness' })
    expect(userGoalsToBiIntents([superseded, activeA, declined, activeB]).map((i) => i.intent_id)).toEqual(['g-3', 'g-5'])
  })

  test('scope is preserved exactly — determination_request is not rewritten', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Certify this for me', scope: 'determination_request' })
    expect(userGoalsToBiIntents([g])[0].scope).toBe('determination_request')
  })

  test('intent_text is the goal raw_text verbatim (never source_statement, never transformed)', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'RAW question text', source_statement: 'different statement' })
    expect(userGoalsToBiIntents([g])[0].intent_text).toBe('RAW question text')
  })

  test('category is carried through for every GoalCategory value', () => {
    const cats = ['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'third_party_source_rights', 'unknown'] as const
    const goals = cats.map((c, i) => goal({ goal_id: `g-${i}`, raw_text: c, category: c }))
    expect(userGoalsToBiIntents(goals).map((i) => i.category)).toEqual([...cats])
  })

  test('empty input → empty output', () => {
    expect(userGoalsToBiIntents([])).toEqual([])
  })

  test('adds no field beyond the four BiIntent fields', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'x' })
    expect(Object.keys(userGoalsToBiIntents([g])[0]).sort()).toEqual(['category', 'intent_id', 'intent_text', 'scope'])
  })
})

describe('type-adaptation-only: adapter path === direct hand-mapped BiIntent path', () => {
  test('a representative goal mix produces identical BoundedInterpretation[] both ways', () => {
    const goals: UserGoal[] = [
      goal({ goal_id: 'g-sup', raw_text: 'superseded', superseded_by: 'g-info' }),
      goal({ goal_id: 'g-decl', raw_text: 'declined', state: 'declined' }),
      goal({ goal_id: 'g-info', raw_text: 'Can I use this commercially?', category: 'commercial_use', scope: 'informational' }),
      goal({ goal_id: 'g-det', raw_text: 'Please certify this', category: 'copyright_ownership', scope: 'determination_request' }),
      goal({ goal_id: 'g-cov', raw_text: 'Who owns the copyright?', category: 'copyright_ownership', scope: 'informational' }),
    ]

    // Path A — through the CRC adapter (production path).
    const viaAdapter = buildBoundedInterpretations(userGoalsToBiIntents(goals), [], [])

    // Path B — the active/confirmed goals hand-mapped to BiIntent directly,
    // exactly as the adapter's documented contract says it will.
    const handMapped: BiIntent[] = [
      { intent_id: 'g-info', intent_text: 'Can I use this commercially?', category: 'commercial_use', scope: 'informational' },
      { intent_id: 'g-det', intent_text: 'Please certify this', category: 'copyright_ownership', scope: 'determination_request' },
      { intent_id: 'g-cov', intent_text: 'Who owns the copyright?', category: 'copyright_ownership', scope: 'informational' },
    ]
    const viaDirect = buildBoundedInterpretations(handMapped, [], [])

    expect(viaAdapter).toEqual(viaDirect)
    // Sanity: the superseded + declined goals produced nothing; the
    // determination_request one declined; the informational ones did not.
    expect(viaAdapter.map((i) => [i.goal_id, i.status])).toEqual([
      ['g-info', 'outside_current_coverage'],
      ['g-det', 'determination_declined'],
      ['g-cov', 'outside_current_coverage'],
    ])
  })

  test('determination_declined still fires purely on scope, before any matching', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'x', category: 'commercial_use', scope: 'determination_request' })
    const [interp] = buildBoundedInterpretations(userGoalsToBiIntents([g]), [])
    expect(interp.status).toBe('determination_declined')
    expect(interp.supporting_claim_ids).toEqual([])
  })
})

describe('firewall — the generic BI core knows no caller shape; the adapter is the only place UserGoal appears; no HRR concept exists yet', () => {
  const BI_DIR = path.join(__dirname, '..', '..', 'lib', 'bounded-interpretation')
  const read = (f: string) => fs.readFileSync(path.join(BI_DIR, f), 'utf-8')
  const CORE_FILES = ['build-bounded-interpretation.ts', 'rules.ts', 'types.ts']

  test.each(CORE_FILES)('BI core file %s never imports UserGoal (the caller lifecycle shape)', (f) => {
    const importLines = (read(f).match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')
    expect(importLines).not.toMatch(/\bUserGoal\b/)
  })

  test('adapters.ts is permitted to import the UserGoal contract type (adapting caller data is its job)', () => {
    expect(read('adapters.ts')).toMatch(/import type \{ UserGoal \} from '@\/types\/interview-engine'/)
  })

  test('no bounded-interpretation file imports reviewer-lk or references an HRR runtime identifier (docs may name the future caller; code and imports may not depend on it)', () => {
    for (const f of ['build-bounded-interpretation.ts', 'rules.ts', 'types.ts', 'adapters.ts']) {
      const src = read(f)
      const importLines = (src.match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')
      expect(importLines).not.toMatch(/reviewer-lk/i)
      // no HRR runtime type/function is referenced as code anywhere
      expect(src).not.toMatch(/ExplicitResearchIntent|PermittedResearchIntent|HrrResearchAnswer|runHrrResearch|interpretResearchIntent|hrrAuthorityGate|reviewerClaimToBiResult/)
    }
  })

  test('the BI core LOGIC file build-bounded-interpretation.ts contains no product name in prose either (it serves a generic contract)', () => {
    expect(read('build-bounded-interpretation.ts')).not.toMatch(/\bHRR\b/)
  })

  test('adapters.ts imports no Retrieval/Interview/Projection LOGIC and no crc-engine module', () => {
    const importLines = (read('adapters.ts').match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')
    expect(importLines).not.toMatch(/lib\/crc-engine/)
    expect(importLines).not.toMatch(/lib\/reviewer-lk/)
    expect(importLines).not.toMatch(/lib\/projection-layer/)
    expect(importLines).not.toMatch(/lib\/retrieval-engine\/(retrieve|assemble-result|enumerate|lookup)/)
    expect(importLines).not.toMatch(/lib\/interview-engine\//)
  })
})
