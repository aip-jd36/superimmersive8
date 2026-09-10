/**
 * CAH-4G.2 Slice 2 — HRR authority gate (deterministic, no model).
 *
 * The classifier maps intent; this gate decides what the governed research
 * system is PERMITTED to route. Covers the frozen authority cases
 * (`HRR_GRI_TECHNICAL_DESIGN.md §D`): pure research, assessment judgment,
 * mixed, determination-request-on-a-research-clause, unsupported/vague.
 */

import { hrrAuthorityGate } from '@/lib/reviewer-lk/hrr-authority-gate'
import { REVIEWER_RESEARCH_TOPICS, type PermittedResearchIntent } from '@/lib/reviewer-lk/types'

const classify = (over: Partial<PermittedResearchIntent> = {}): PermittedResearchIntent => ({
  research_intents: [],
  assessment_decision_requested: false,
  unresolved_ambiguity: [],
  ...over,
})

describe('CASE 1 — pure research', () => {
  test('"what does governed knowledge say about copyright ownership?" -> research intent survives, informational, no refusal', () => {
    const r = hrrAuthorityGate(classify({ research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }] }))
    expect(r.authority_note).toBe('research')
    expect(r.research_intents).toEqual([
      { source_kind: 'interpreted_question', topic: 'copyright_ownership', scope: 'informational', interpreted: true, source_text_ref: null },
    ])
    expect(r.offered_research_paths).toBeNull()
  })

  test('multi-topic pure research (both informational, order preserved)', () => {
    const r = hrrAuthorityGate(
      classify({ research_intents: [{ topic: 'commercial_use', scope: 'informational' }, { topic: 'copyright_ownership', scope: 'informational' }] }),
    )
    expect(r.authority_note).toBe('research')
    expect(r.research_intents.map((i) => [i.topic, i.scope])).toEqual([
      ['commercial_use', 'informational'],
      ['copyright_ownership', 'informational'],
    ])
    expect(r.research_intents.every((i) => i.interpreted && i.source_kind === 'interpreted_question')).toBe(true)
  })
})

describe('CASE 2 — assessment judgment only', () => {
  test('"Should I approve this?" -> decline, no invented topic, no yes/no, offer paths', () => {
    const r = hrrAuthorityGate(classify({ assessment_decision_requested: true, unresolved_ambiguity: ['no_governed_topic_matched'] }))
    expect(r.authority_note).toBe('assessment_judgment_redirected')
    expect(r.research_intents).toEqual([])
    expect(r.offered_research_paths).toEqual([...REVIEWER_RESEARCH_TOPICS])
  })

  test('the gate never emits an answer / conclusion field', () => {
    const r = hrrAuthorityGate(classify({ assessment_decision_requested: true }))
    expect(Object.keys(r).sort()).toEqual(['authority_note', 'offered_research_paths', 'research_intents', 'unresolved_ambiguity'])
  })
})

describe('CASE 3 — mixed (decision + informational research clause)', () => {
  test('"Should I approve this, and what does governed knowledge say about copyright ownership?"', () => {
    const r = hrrAuthorityGate(
      classify({
        research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }],
        assessment_decision_requested: true,
      }),
    )
    // assessment-decision intent declined...
    expect(r.authority_note).toBe('assessment_judgment_redirected')
    // ...but the copyright_ownership clause survives independently, still INFORMATIONAL
    expect(r.research_intents).toEqual([
      { source_kind: 'interpreted_question', topic: 'copyright_ownership', scope: 'informational', interpreted: true, source_text_ref: null },
    ])
    // there is research to show -> no offered-paths list
    expect(r.offered_research_paths).toBeNull()
  })

  test('the decision request does NOT contaminate the research clause scope', () => {
    const r = hrrAuthorityGate(
      classify({ research_intents: [{ topic: 'commercial_use', scope: 'informational' }], assessment_decision_requested: true }),
    )
    expect(r.research_intents[0].scope).toBe('informational')
  })
})

describe('CASE 4 — determination request ON the research clause itself', () => {
  test('"Can you determine whether copyright ownership is satisfied?" -> clause keeps determination_request scope for BI to decline later', () => {
    const r = hrrAuthorityGate(classify({ research_intents: [{ topic: 'copyright_ownership', scope: 'determination_request' }] }))
    // The gate does NOT decline it — BI is the semantic ceiling that turns
    // this into determination_declined (Slice 3+). authority_note stays research.
    expect(r.authority_note).toBe('research')
    expect(r.research_intents[0].scope).toBe('determination_request')
  })

  test('distinct from CASE 3: no assessment_decision_requested here', () => {
    const r = hrrAuthorityGate(classify({ research_intents: [{ topic: 'copyright_ownership', scope: 'determination_request' }] }))
    expect(r.authority_note).not.toBe('assessment_judgment_redirected')
  })

  test('mixed: decision request + a research clause that itself asks for determination -> both handled, independently', () => {
    const r = hrrAuthorityGate(
      classify({ research_intents: [{ topic: 'copyright_ownership', scope: 'determination_request' }], assessment_decision_requested: true }),
    )
    expect(r.authority_note).toBe('assessment_judgment_redirected')
    expect(r.research_intents[0].scope).toBe('determination_request')
  })
})

describe('CASE 5 — unsupported / vague', () => {
  test('"Tell me what to do." -> no guessed topic, unsupported, offer paths', () => {
    const r = hrrAuthorityGate(classify({ unresolved_ambiguity: ['question_too_general'] }))
    expect(r.authority_note).toBe('unsupported')
    expect(r.research_intents).toEqual([])
    expect(r.offered_research_paths).toEqual([...REVIEWER_RESEARCH_TOPICS])
    expect(r.unresolved_ambiguity).toEqual(['question_too_general'])
  })

  test('empty classifier result (all defaults) -> unsupported', () => {
    expect(hrrAuthorityGate(classify()).authority_note).toBe('unsupported')
  })
})

describe('provenance / options', () => {
  test('sourceTextRef is stamped onto every interpreted research intent', () => {
    const r = hrrAuthorityGate(
      classify({ research_intents: [{ topic: 'likeness', scope: 'informational' }] }),
      { sourceTextRef: 'hrr-action-abc123' },
    )
    expect(r.research_intents[0].source_text_ref).toBe('hrr-action-abc123')
  })

  test('offered_research_paths is a copy, not the shared module array', () => {
    const a = hrrAuthorityGate(classify())
    const b = hrrAuthorityGate(classify())
    expect(a.offered_research_paths).not.toBe(b.offered_research_paths)
    expect(a.offered_research_paths).toEqual(b.offered_research_paths)
  })

  test('the gate is a pure function — identical input, identical output, no side effects', () => {
    const input = classify({ research_intents: [{ topic: 'commercial_use', scope: 'informational' }] })
    const snapshot = JSON.stringify(input)
    const r1 = hrrAuthorityGate(input)
    const r2 = hrrAuthorityGate(input)
    expect(r1).toEqual(r2)
    expect(JSON.stringify(input)).toBe(snapshot) // input not mutated
  })
})
