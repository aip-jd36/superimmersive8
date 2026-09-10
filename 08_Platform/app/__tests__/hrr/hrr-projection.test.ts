/**
 * CAH-4G.4 Slice 4 — deterministic HRR consultative composition / projection.
 *
 * `projectHrrResearchAnswer(HrrResearchResult) → HrrResearchAnswer`.
 * Deterministic, no model, no I/O.
 *
 * This suite is the grounding-rule enforcement (ADR-002 §I): every
 * module-authored substantive string in the answer must reconstruct from the
 * enumerable `HRR_ANSWER_TEMPLATES` set (grounding D); every other string is a
 * verbatim passthrough of a governed statement (A), a BI summary block (C), or
 * a mechanical enumeration (E). The reviewer's own text appears only as the
 * attributed `question_text` and never substantiates a proposition.
 */

import { runHrrResearch, topicSelectionGateResult, type RunHrrResearchInput } from '@/lib/hrr/run-hrr-research'
import {
  projectHrrResearchAnswer,
  HRR_ANSWER_TEMPLATES,
} from '@/lib/hrr/project-hrr-research-answer'
import type { HrrResearchAnswer, HrrAnswerTopic } from '@/lib/hrr/types'
import { hrrAuthorityGate } from '@/lib/reviewer-lk/hrr-authority-gate'
import type { ReviewerLkContextBundle } from '@/lib/reviewer-lk/submission-facts'
import type { PermittedResearchIntent } from '@/lib/reviewer-lk/types'
import { reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import * as fs from 'fs'
import * as path from 'path'

// ── fixtures (mirror run-hrr-research.test.ts) ─────────────────────────────

function claim(overrides: Partial<TopicClaim>): TopicClaim {
  return {
    claim_id: 'CLAIM-X-001-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'scope prose',
    crc_candidate_statement: 'a governed statement',
    publication_scope: 'Reviewer/Commercial Assurance',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-09-01',
    superseded_by: null,
    ...overrides,
  }
}

const US_REQ = { fact: 'jurisdiction' as const, operator: 'equals' as const, value: 'United States' }

function ctx(overrides: Partial<ReviewerLkContextBundle> = {}): ReviewerLkContextBundle {
  const jurisdiction = overrides.applicabilityFacts?.jurisdiction ?? { included: [], excluded: [] }
  return {
    context: { resolved_tool_ids: [], resolved_asset_provider_ids: [], jurisdiction_included: jurisdiction.included },
    applicabilityFacts: { jurisdiction, toolMentions: [] },
    activeToolIds: [],
    assetProviderIds: [],
    ...overrides,
  }
}

const OWN_INFO = claim({ claim_id: 'CLAIM-OWN-001-v1', topic: 'copyright_ownership', crc_candidate_statement: 'ownership statement' })
const COMM_INFO = claim({ claim_id: 'CLAIM-COMM-001-v1', topic: 'commercial_use', crc_candidate_statement: 'commercial statement' })
const US_OWN = claim({ claim_id: 'CLAIM-US-OWN-v1', topic: 'copyright_ownership', crc_candidate_statement: 'US ownership rule', applicability_requirements: [US_REQ] })

const permitted = (over: Partial<PermittedResearchIntent> = {}): PermittedResearchIntent => ({
  research_intents: [],
  assessment_decision_requested: false,
  unresolved_ambiguity: [],
  ...over,
})

const runInput = (over: Partial<RunHrrResearchInput>): RunHrrResearchInput => ({
  gate: topicSelectionGateResult('copyright_ownership'),
  reviewerContext: ctx(),
  topicClaims: [OWN_INFO, COMM_INFO],
  ...over,
})

const project = (over: Partial<RunHrrResearchInput>): HrrResearchAnswer =>
  projectHrrResearchAnswer(runHrrResearch(runInput(over)))

// ── grounding helpers ─────────────────────────────────────────────────────

/** Every fixed-template string this module is allowed to author, for one topic label. */
function allowedAuthoredStrings(label: string): string[] {
  const t = HRR_ANSWER_TEMPLATES
  return [
    t.reviewer_responsibility_note,
    t.assessment_authority_note,
    ...(['directly_relevant', 'relevant_applicability_unresolved', 'outside_current_coverage', 'determination_declined'] as const).flatMap(
      (s) => [t.orientation[s](label), t.boundary_note[s](label)],
    ),
    t.does_not_apply_note(label),
  ]
}

/** Assert every module-authored substantive string in a topic reconstructs from a fixed template. */
function assertTopicAuthoredStringsAreGrounded(topic: HrrAnswerTopic): void {
  const allowed = allowedAuthoredStrings(topic.topic_label)
  expect(allowed).toContain(topic.orientation)
  expect(allowed).toContain(topic.boundary_note)
  if (topic.does_not_apply_note) expect(allowed).toContain(topic.does_not_apply_note)
  for (const input of topic.unresolved_inputs) {
    const expected =
      input.kind === 'applicability_requirement'
        ? HRR_ANSWER_TEMPLATES.unresolved_requirement_note(input.identifier, topic.topic_label)
        : HRR_ANSWER_TEMPLATES.unresolved_dependency_note(input.identifier, topic.topic_label)
    expect(input.note).toBe(expected)
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 1. topic pick — directly_relevant
// ═════════════════════════════════════════════════════════════════════════

describe('case 1 — topic pick, directly_relevant', () => {
  const answer = project({ gate: topicSelectionGateResult('copyright_ownership') })

  test('research_mode topic_pick, no question echo', () => {
    expect(answer.research_mode).toBe('topic_pick')
    expect(answer.question_text).toBeNull()
    expect(answer.assessment_authority_note).toBeNull()
    expect(answer.authority_note).toBe('research')
  })

  test('one topic, hierarchy A/B/F populated', () => {
    expect(answer.topics).toHaveLength(1)
    const t = answer.topics[0]
    expect(t.topic).toBe('copyright_ownership')
    expect(t.topic_label).toBe('Copyright ownership')
    expect(t.intent_origin).toBe('topic_selection')
    expect(t.bi_status).toBe('directly_relevant')
    expect(t.orientation).toBe(HRR_ANSWER_TEMPLATES.orientation.directly_relevant('Copyright ownership'))
    expect(t.governed_considerations.map((c) => c.claim_id)).toEqual(['CLAIM-OWN-001-v1'])
    expect(t.governed_considerations[0].statement_verbatim).toBe('ownership statement')
    expect(t.bi_summary_blocks.join(' ')).toContain('ownership statement')
    expect(t.boundary_note).toBe(HRR_ANSWER_TEMPLATES.boundary_note.directly_relevant('Copyright ownership'))
    expect(t.governed_claim_refs).toHaveLength(1)
    expect(t.governed_claim_refs[0]).toContain('claim-own-001-v1')
  })

  test('no unresolved inputs, no does-not-apply, reviewer-responsibility note always present', () => {
    const t = answer.topics[0]
    expect(t.unresolved_inputs).toEqual([])
    expect(t.does_not_apply).toEqual([])
    expect(t.does_not_apply_note).toBe('')
    expect(answer.reviewer_responsibility_note).toBe(HRR_ANSWER_TEMPLATES.reviewer_responsibility_note)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 2. free-form single topic — directly_relevant
// ═════════════════════════════════════════════════════════════════════════

describe('case 2 — free-form single topic', () => {
  const gate = hrrAuthorityGate(permitted({ research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }] }), { sourceTextRef: 'hrr-act-1' })
  const answer = project({ gate, attributedQuestion: 'what does governed knowledge say about copyright ownership?' })

  test('research_mode question, verbatim echo, interpreted origin', () => {
    expect(answer.research_mode).toBe('question')
    expect(answer.question_text).toBe('what does governed knowledge say about copyright ownership?')
    expect(answer.topics[0].intent_origin).toBe('interpreted_question')
  })

  test('same governed projection as the topic-pick path', () => {
    const viaTopic = project({ gate: topicSelectionGateResult('copyright_ownership') })
    expect(answer.topics[0].governed_considerations).toEqual(viaTopic.topics[0].governed_considerations)
    expect(answer.topics[0].bi_summary_blocks).toEqual(viaTopic.topics[0].bi_summary_blocks)
    expect(answer.topics[0].orientation).toBe(viaTopic.topics[0].orientation)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 3. relevant_applicability_unresolved — established ≠ resolved
// ═════════════════════════════════════════════════════════════════════════

describe('case 3 — relevant_applicability_unresolved', () => {
  const answer = project({ gate: topicSelectionGateResult('copyright_ownership'), topicClaims: [US_OWN], reviewerContext: ctx() })
  const t = answer.topics[0]

  test('bi_status carried verbatim; proposition still shown verbatim', () => {
    expect(t.bi_status).toBe('relevant_applicability_unresolved')
    expect(t.governed_considerations.map((c) => c.claim_id)).toEqual(['CLAIM-US-OWN-v1'])
    expect(t.governed_considerations[0].statement_verbatim).toBe('US ownership rule')
    expect(t.bi_summary_blocks.join(' ')).toContain('US ownership rule')
  })

  test('unresolved input is made useful — the specific governed requirement + whose job it is', () => {
    expect(t.unresolved_inputs).toHaveLength(1)
    const input = t.unresolved_inputs[0]
    expect(input.kind).toBe('applicability_requirement')
    expect(input.identifier).toBe('jurisdiction')
    expect(input.requirement).toEqual(US_REQ)
    expect(input.from_claim_ids).toEqual(['CLAIM-US-OWN-v1'])
    expect(input.note).toBe(HRR_ANSWER_TEMPLATES.unresolved_requirement_note('jurisdiction', 'Copyright ownership'))
    expect(input.note).toMatch(/Human Reviewer/)
  })

  test('applicability rollup reflects the unresolved requirement, nothing established', () => {
    expect(t.applicability.unresolved).toEqual([US_REQ])
    expect(t.applicability.established).toEqual([])
    expect(t.applicability.not_met).toEqual([])
  })

  test('NO module-authored string implies established / resolved / satisfied / cleared / compliant / sufficient', () => {
    const authored = [t.orientation, t.boundary_note, t.does_not_apply_note, ...t.unresolved_inputs.map((i) => i.note)].join(' ‖ ')
    // hedge present
    expect(authored).toMatch(/unresolved|not established|not determine|not concluding|still to be confirmed/i)
    // no positive applicability assertion
    expect(authored).not.toMatch(/\b(requirement|applicability|input|control)\s+(is|are|has been|have been)\s+(met|satisfied|established|resolved|cleared|compliant|sufficient)\b/i)
    expect(authored).not.toMatch(/\bnow (cleared|compliant|satisfied|applies)\b/i)
    expect(authored).not.toMatch(/this (guidance )?applies to (this|the) submission\b/i)
  })

  test('grounding — every authored string reconstructs from a fixed template', () => {
    assertTopicAuthoredStringsAreGrounded(t)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 4. not_met — separate does-not-apply block, never a negative finding
// ═════════════════════════════════════════════════════════════════════════

describe('case 4 — not_met → does_not_apply block', () => {
  const answer = project({
    gate: topicSelectionGateResult('copyright_ownership'),
    topicClaims: [US_OWN],
    reviewerContext: ctx({ applicabilityFacts: { jurisdiction: { included: [], excluded: ['United States'] }, toolMentions: [] } }),
  })
  const t = answer.topics[0]

  test('claim is in does_not_apply with its verbatim statement + the failing requirement', () => {
    expect(t.does_not_apply.map((c) => c.claim_id)).toEqual(['CLAIM-US-OWN-v1'])
    expect(t.does_not_apply[0].statement_verbatim).toBe('US ownership rule')
    expect(t.does_not_apply[0].applicability_outcomes[0].status).toBe('not_met')
    expect(t.does_not_apply_note).toBe(HRR_ANSWER_TEMPLATES.does_not_apply_note('Copyright ownership'))
    expect(t.does_not_apply_note).toMatch(/not a negative assessment finding/)
  })

  test('rollup records not_met; BI saw no claim → outside_current_coverage; not surfaced as a consideration', () => {
    expect(t.applicability.not_met).toEqual([US_REQ])
    expect(t.bi_status).toBe('outside_current_coverage')
    expect(t.governed_considerations).toEqual([])
    expect(t.unresolved_inputs).toEqual([])
  })

  test('the does-not-apply claim ref is still available for navigation', () => {
    expect(t.governed_claim_refs).toHaveLength(1)
    expect(t.governed_claim_refs[0]).toContain('claim-us-own-v1')
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 5. outside_current_coverage — honest "no governed coverage"
// ═════════════════════════════════════════════════════════════════════════

describe('case 5 — outside_current_coverage', () => {
  const answer = project({ gate: topicSelectionGateResult('likeness'), topicClaims: [OWN_INFO, COMM_INFO] })
  const t = answer.topics[0]

  test('orientation + boundary are the "no coverage" templates; everything else empty', () => {
    expect(t.bi_status).toBe('outside_current_coverage')
    expect(t.orientation).toBe(HRR_ANSWER_TEMPLATES.orientation.outside_current_coverage('Likeness'))
    expect(t.orientation).toMatch(/not a finding either way/)
    expect(t.boundary_note).toBe(HRR_ANSWER_TEMPLATES.boundary_note.outside_current_coverage('Likeness'))
    expect(t.governed_considerations).toEqual([])
    // the shared BI copy for outside_current_coverage is CRC-channel-worded → omitted; orientation + boundary carry it
    expect(t.bi_summary_blocks).toEqual([])
    expect(t.governed_claim_refs).toEqual([])
    expect(t.does_not_apply).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 6. determination_declined on the research clause itself
// ═════════════════════════════════════════════════════════════════════════

describe('case 6 — research clause with determination_request scope', () => {
  const gate = hrrAuthorityGate(permitted({ research_intents: [{ topic: 'copyright_ownership', scope: 'determination_request' }] }))
  const answer = project({ gate, topicClaims: [OWN_INFO] })
  const t = answer.topics[0]

  test('BI status respected; the topic carries only the refusal + boundary, no governed content', () => {
    expect(answer.authority_note).toBe('research')
    expect(t.bi_status).toBe('determination_declined')
    expect(t.orientation).toBe(HRR_ANSWER_TEMPLATES.orientation.determination_declined('Copyright ownership'))
    expect(t.orientation).toMatch(/does not issue determinations/)
    expect(t.bi_summary_blocks).toEqual([])
    expect(t.governed_considerations).toEqual([])
    expect(t.applicability).toEqual({ established: [], unresolved: [], not_met: [] })
    expect(t.unresolved_inputs).toEqual([])
    expect(t.does_not_apply).toEqual([])
    expect(t.does_not_apply_note).toBe('')
    expect(t.boundary_note).toBe(HRR_ANSWER_TEMPLATES.boundary_note.determination_declined('Copyright ownership'))
  })

  test('no implied determination anywhere in the topic', () => {
    const blob = JSON.stringify(t)
    expect(blob).not.toMatch(/\b(is|are) (cleared|approved|satisfied|compliant)\b/i)
    expect(blob).not.toContain('ownership statement') // BI cited nothing → composition cites nothing
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 7. mixed authority + research (V-6) — two structurally separate lanes
// ═════════════════════════════════════════════════════════════════════════

describe('case 7 — "Should I approve this, and what does governed knowledge say about copyright ownership?"', () => {
  const gate = hrrAuthorityGate(permitted({
    research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }],
    assessment_decision_requested: true,
  }))
  const answer = project({ gate, attributedQuestion: 'Should I approve this, and what does governed knowledge say about copyright ownership?' })

  test('lane 1 — the refusal block is present and self-contained', () => {
    expect(answer.authority_note).toBe('assessment_judgment_redirected')
    expect(answer.assessment_authority_note).toBe(HRR_ANSWER_TEMPLATES.assessment_authority_note)
    // the refusal never references the research findings
    expect(answer.assessment_authority_note).not.toMatch(/ownership statement|copyright ownership says|looks fine|although/i)
  })

  test('lane 2 — the research clause runs at informational scope, ordinary governed answer', () => {
    expect(answer.topics).toHaveLength(1)
    expect(answer.topics[0].topic).toBe('copyright_ownership')
    expect(answer.topics[0].bi_status).toBe('directly_relevant')
    expect(answer.topics[0].orientation).toBe(HRR_ANSWER_TEMPLATES.orientation.directly_relevant('Copyright ownership'))
    expect(answer.offered_research_paths).toBeNull()
  })

  test('the two lanes are separate fields — never blended into one sentence', () => {
    expect(answer.assessment_authority_note).not.toContain(answer.topics[0].orientation)
    expect(answer.topics[0].orientation).not.toContain('approve')
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 8. V-6b — mixed, and the research clause itself asks for a determination
// ═════════════════════════════════════════════════════════════════════════

describe('case 8 — "Should I approve this, and should copyright ownership be treated as cleared?"', () => {
  const gate = hrrAuthorityGate(permitted({
    research_intents: [{ topic: 'copyright_ownership', scope: 'determination_request' }],
    assessment_decision_requested: true,
  }))
  const answer = project({ gate })

  test('both intents declined — refusal block AND a determination_declined topic', () => {
    expect(answer.assessment_authority_note).toBe(HRR_ANSWER_TEMPLATES.assessment_authority_note)
    expect(answer.topics[0].bi_status).toBe('determination_declined')
    expect(answer.topics[0].orientation).toMatch(/does not issue determinations/)
    expect(answer.topics[0].governed_considerations).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 9. pure assessment-judgment request
// ═════════════════════════════════════════════════════════════════════════

describe('case 9 — "Should I approve this?"', () => {
  const gate = hrrAuthorityGate(permitted({ assessment_decision_requested: true, unresolved_ambiguity: ['no_governed_topic_matched'] }))
  const answer = project({ gate, attributedQuestion: 'Should I approve this?' })

  test('refusal + offered paths, no topics, no yes/no', () => {
    expect(answer.authority_note).toBe('assessment_judgment_redirected')
    expect(answer.assessment_authority_note).toBe(HRR_ANSWER_TEMPLATES.assessment_authority_note)
    expect(answer.topics).toEqual([])
    expect(answer.offered_research_paths).toEqual(['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'third_party_source_rights'])
    expect(answer.question_text).toBe('Should I approve this?')
    expect(answer.assessment_authority_note).not.toMatch(/\b(yes|no|approved|rejected)\b/i)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 10. unsupported
// ═════════════════════════════════════════════════════════════════════════

describe('case 10 — over-general question', () => {
  const gate = hrrAuthorityGate(permitted({ unresolved_ambiguity: ['question_too_general'] }))
  const answer = project({ gate, attributedQuestion: 'help' })

  test('no refusal block, no topics, offer the paths', () => {
    expect(answer.authority_note).toBe('unsupported')
    expect(answer.assessment_authority_note).toBeNull()
    expect(answer.topics).toEqual([])
    expect(answer.offered_research_paths).toHaveLength(5)
    expect(answer.reviewer_responsibility_note).toBe(HRR_ANSWER_TEMPLATES.reviewer_responsibility_note)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 11. multi-topic — intelligible grouping, provenance preserved, no synthesis
// ═════════════════════════════════════════════════════════════════════════

describe('case 11 — commercial_use + copyright_ownership', () => {
  const gate = hrrAuthorityGate(permitted({ research_intents: [
    { topic: 'commercial_use', scope: 'informational' },
    { topic: 'copyright_ownership', scope: 'informational' },
  ] }))
  const answer = project({ gate })

  test('one entry per clause, gate order preserved', () => {
    expect(answer.topics.map((t) => t.topic)).toEqual(['commercial_use', 'copyright_ownership'])
  })

  test('each topic is self-contained — no cross-topic claim bleed, no synthetic joint conclusion', () => {
    const [comm, own] = answer.topics
    expect(comm.governed_considerations.map((c) => c.claim_id)).toEqual(['CLAIM-COMM-001-v1'])
    expect(own.governed_considerations.map((c) => c.claim_id)).toEqual(['CLAIM-OWN-001-v1'])
    // the commercial_use topic never mentions the copyright label/claim and vice-versa
    expect(JSON.stringify(comm)).not.toContain('ownership statement')
    expect(JSON.stringify(comm)).not.toContain('Copyright ownership')
    expect(JSON.stringify(own)).not.toContain('commercial statement')
    // there is no top-level joint/summary field that could carry a cross-topic conclusion
    expect(Object.keys(answer).sort()).toEqual(
      ['assessment_authority_note', 'authority_note', 'offered_research_paths', 'question_text', 'research_mode', 'reviewer_responsibility_note', 'scope_note', 'topics'].sort(),
    )
    expect(answer.scope_note).toBe('') // classifier did not flag multiple_unrelated_topics here
  })

  test('per-topic grounding holds independently', () => {
    for (const t of answer.topics) assertTopicAuthoredStringsAreGrounded(t)
  })

  test('cap hit → scope_note names the researched topics (fixed template + mechanical label enumeration)', () => {
    const capGate = hrrAuthorityGate(permitted({
      research_intents: [
        { topic: 'commercial_use', scope: 'informational' },
        { topic: 'copyright_ownership', scope: 'informational' },
      ],
      unresolved_ambiguity: ['multiple_unrelated_topics'],
    }))
    const capped = project({ gate: capGate })
    expect(capped.scope_note).toBe(HRR_ANSWER_TEMPLATES.scope_note(['Commercial use', 'Copyright ownership']))
    expect(capped.scope_note).toMatch(/Researched here: Commercial use, Copyright ownership/)
    // no ambiguity flag → empty
    expect(project({ gate }).scope_note).toBe('')
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 12. false-premise question — premise never echoed as fact
// ═════════════════════════════════════════════════════════════════════════

describe('case 12 — "Since Veo gives us copyright ownership, is this cleared?"', () => {
  const gate = hrrAuthorityGate(permitted({
    research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }],
    assessment_decision_requested: true,
  }))
  const premise = 'Since Veo gives us copyright ownership, is this cleared?'
  const answer = project({ gate, attributedQuestion: premise })

  test('question echoed verbatim as an attributed quotation only', () => {
    expect(answer.question_text).toBe(premise)
  })

  test('premise tokens appear nowhere in the substantive answer', () => {
    const substantive = JSON.stringify({ ...answer, question_text: null })
    expect(substantive).not.toContain('Veo')
    expect(substantive).not.toContain('gives us copyright ownership')
    expect(substantive).not.toMatch(/is cleared/i)
  })

  test('only governed material substantiates the research response', () => {
    expect(answer.topics[0].governed_considerations[0].statement_verbatim).toBe('ownership statement')
    assertTopicAuthoredStringsAreGrounded(answer.topics[0])
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 13. applicability rollup — mechanical dedup across claims
// ═════════════════════════════════════════════════════════════════════════

describe('case 13 — rollup dedups a shared requirement across two claims', () => {
  const a = claim({ claim_id: 'CLAIM-A-v1', topic: 'copyright_ownership', crc_candidate_statement: 'rule A', applicability_requirements: [US_REQ] })
  const b = claim({ claim_id: 'CLAIM-B-v1', topic: 'copyright_ownership', crc_candidate_statement: 'rule B', applicability_requirements: [US_REQ] })
  const answer = project({ gate: topicSelectionGateResult('copyright_ownership'), topicClaims: [a, b], reviewerContext: ctx() })
  const t = answer.topics[0]

  test('the shared unresolved requirement appears once in the rollup and once as an input, citing both claims', () => {
    expect(t.applicability.unresolved).toEqual([US_REQ])
    expect(t.unresolved_inputs).toHaveLength(1)
    expect(t.unresolved_inputs[0].from_claim_ids.sort()).toEqual(['CLAIM-A-v1', 'CLAIM-B-v1'])
  })

  test('both governed propositions stay individually visible + verbatim', () => {
    expect(t.governed_considerations.map((c) => c.statement_verbatim)).toEqual(['rule A', 'rule B'])
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 14. purity / determinism
// ═════════════════════════════════════════════════════════════════════════

describe('case 14 — purity', () => {
  test('projectHrrResearchAnswer is pure — identical input, identical output; input not mutated', () => {
    const result = runHrrResearch(runInput({ gate: topicSelectionGateResult('copyright_ownership') }))
    const snap = JSON.stringify(result)
    expect(projectHrrResearchAnswer(result)).toEqual(projectHrrResearchAnswer(result))
    expect(JSON.stringify(result)).toBe(snap)
  })

  test('no model / no I/O — a topic pick composes with zero async work', () => {
    const out = projectHrrResearchAnswer(runHrrResearch(runInput({ gate: topicSelectionGateResult('commercial_use') })))
    expect(out).toEqual(expect.objectContaining({ research_mode: 'topic_pick' }))
  })
})

// ═════════════════════════════════════════════════════════════════════════
// reviewer-eligibility firewall — withheld surfaced (reason only), never content
// ═════════════════════════════════════════════════════════════════════════

describe('withheld governed knowledge — reason only, never content', () => {
  const set: TopicClaim[] = [
    claim({ claim_id: 'CLAIM-INTERNAL-v1', topic: 'copyright_ownership', publication_scope: 'Internal/research', crc_candidate_statement: 'secret ownership rule' }),
    claim({ claim_id: 'CLAIM-CANDIDATE-v1', topic: 'copyright_ownership', lifecycle: 'Candidate', crc_candidate_statement: 'draft ownership rule' }),
  ]
  const answer = project({ gate: topicSelectionGateResult('copyright_ownership'), topicClaims: set })
  const t = answer.topics[0]

  test('withheld reasons surface; withheld content never does', () => {
    expect(t.withheld.map((w) => w.reason).sort()).toEqual(['not_adopted', 'publication_scope_not_reviewer_eligible'])
    expect(JSON.stringify(answer)).not.toContain('secret ownership rule')
    expect(JSON.stringify(answer)).not.toContain('draft ownership rule')
    expect(t.bi_status).toBe('outside_current_coverage')
  })
})

// ═════════════════════════════════════════════════════════════════════════
// architecture firewall — the composer re-evaluates nothing, calls no model
// ═════════════════════════════════════════════════════════════════════════

describe('architecture firewall — lib/hrr/project-hrr-research-answer.ts', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'lib', 'hrr', 'project-hrr-research-answer.ts'),
    'utf-8',
  )
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  const imports = (src.match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')

  test('imports no model / retrieval orchestrator / BI builder / selector / DB', () => {
    expect(imports).not.toMatch(/@anthropic-ai\/sdk|anthropic-structured-output-retry|interpret-research-intent/)
    expect(imports).not.toMatch(/@\/lib\/retrieval-engine\/retrieve|enumerate-eligible-claims/)
    expect(imports).not.toMatch(/build-bounded-interpretation/)
    expect(imports).not.toMatch(/select-reviewer-claims|@\/lib\/crc-engine/)
    expect(imports).not.toMatch(/next\/server|\.tsx['"]/)
  })

  test('re-evaluates nothing — no applicability evaluator, no BI call, no selection call', () => {
    expect(code).not.toMatch(/evaluateApplicabilityDetailed|evaluateReviewerEligibility|isApplicable\s*\(/)
    expect(code).not.toMatch(/buildBoundedInterpretations\s*\(|selectReviewerClaims\s*\(|runHrrResearch\s*\(/)
  })

  test('performs no DB write / audit / raw-question persistence', () => {
    expect(code).not.toMatch(/\.(insert|update|upsert|delete)\s*\(|\.rpc\s*\(|\.from\s*\(\s*['"]/)
    expect(code).not.toMatch(/recordHrrResearchAccess|logPilotEvent|console\.(log|info|warn|error)/)
  })

  test('the only prose it authors is the enumerable template set', () => {
    // every string literal assigned into a template lives under HRR_ANSWER_TEMPLATES
    expect(code).toMatch(/export const HRR_ANSWER_TEMPLATES/)
    // no ad-hoc string concatenation building a sentence outside the template builders
    expect(code).not.toMatch(/summary_blocks\.push|\.join\(' '\)\s*\+/)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// global grounding sweep — every string in a populated answer is grounded
// ═════════════════════════════════════════════════════════════════════════

describe('grounding sweep — no ungrounded substantive string', () => {
  test('directly_relevant + unresolved + does_not_apply, all in one multi-topic answer', () => {
    const gate = hrrAuthorityGate(permitted({ research_intents: [
      { topic: 'commercial_use', scope: 'informational' },
      { topic: 'copyright_ownership', scope: 'informational' },
    ] }))
    const answer = project({
      gate,
      topicClaims: [COMM_INFO, US_OWN],
      reviewerContext: ctx(),
    })

    const governedStatements = new Set(['commercial statement', 'US ownership rule'])
    const topicLabels = new Set(['Commercial use', 'Copyright ownership'])

    for (const t of answer.topics) {
      assertTopicAuthoredStringsAreGrounded(t)
      // (C) BI blocks are a verbatim passthrough, except the two CRC-worded statuses
      const fromResult = runHrrResearch(runInput({ gate, topicClaims: [COMM_INFO, US_OWN], reviewerContext: ctx() }))
        .per_topic.find((p) => p.topic === t.topic)!
      const biBlocksOmitted = t.bi_status === 'determination_declined' || t.bi_status === 'outside_current_coverage'
      expect(t.bi_summary_blocks).toEqual(biBlocksOmitted ? [] : fromResult.summary_blocks)
      // (A) every surfaced statement is a governed statement
      for (const c of [...t.governed_considerations, ...t.does_not_apply]) {
        if (c.statement_verbatim !== null) expect(governedStatements.has(c.statement_verbatim)).toBe(true)
      }
      // (D) label used in templates is the fixed governed label
      expect(topicLabels.has(t.topic_label)).toBe(true)
    }
  })
})
