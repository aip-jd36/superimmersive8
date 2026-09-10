/**
 * CAH-4G.3 Slice 3 — the converged HRR governed-research pipeline.
 *
 * Deterministic. No live model, no DB. Proves the SEMANTIC pipeline
 * (selection → applicability → Bounded Interpretation → structured result);
 * it does NOT produce the final consultative answer (Slice 4).
 */

import { runHrrResearch, topicSelectionGateResult, type RunHrrResearchInput } from '@/lib/hrr/run-hrr-research'
import { researchIntentToBiIntent, reviewerClaimToBiResult } from '@/lib/hrr/bi-adapters'
import { hrrAuthorityGate } from '@/lib/reviewer-lk/hrr-authority-gate'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import type { ReviewerLkContextBundle } from '@/lib/reviewer-lk/submission-facts'
import type { ExplicitResearchIntent, PermittedResearchIntent } from '@/lib/reviewer-lk/types'
import { reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

// ── fixtures ───────────────────────────────────────────────────────────────

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

// ── adapters ───────────────────────────────────────────────────────────────

describe('researchIntentToBiIntent', () => {
  test('maps topic → category, scope verbatim; intent_text is the FIXED topic label, never raw reviewer text', () => {
    const intent: ExplicitResearchIntent = {
      source_kind: 'interpreted_question',
      topic: 'copyright_ownership',
      scope: 'informational',
      interpreted: true,
      source_text_ref: 'hrr-action-9',
    }
    expect(researchIntentToBiIntent(intent)).toEqual({
      intent_id: 'hrr:hrr-action-9:copyright_ownership',
      intent_text: reviewerTopicLabel('copyright_ownership'), // "Copyright ownership"
      category: 'copyright_ownership',
      scope: 'informational',
    })
  })

  test('determination_request scope is carried through', () => {
    const bi = researchIntentToBiIntent({ source_kind: 'interpreted_question', topic: 'copyright_ownership', scope: 'determination_request', interpreted: true, source_text_ref: null })
    expect(bi.scope).toBe('determination_request')
    expect(bi.intent_id).toBe('hrr:interpreted_question:copyright_ownership')
  })

  test('intent_id is deterministic for a topic selection', () => {
    expect(researchIntentToBiIntent({ source_kind: 'topic_selection', topic: 'likeness', scope: 'informational', interpreted: false, source_text_ref: null }).intent_id).toBe('hrr:topic_selection:likeness')
  })
})

describe('reviewerClaimToBiResult', () => {
  test('every field is a verbatim passthrough; no CRC-shaped field is constructed', () => {
    const { claims } = selectReviewerClaims({ topic: 'copyright_ownership', topicClaims: [OWN_INFO], assetProviderIds: [], activeToolIds: [], applicabilityFacts: ctx().applicabilityFacts })
    const r = reviewerClaimToBiResult(claims[0])
    expect(r).toEqual({
      matched_goal_category: 'copyright_ownership',
      unresolved_project_dependencies: [],
      claim_id: 'CLAIM-OWN-001-v1',
      candidate_statement: 'ownership statement',
      match_origin: 'exact_topic',
      source_fact: { kind: 'topic' },
    })
    expect(Object.keys(r).sort()).toEqual(['candidate_statement', 'claim_id', 'match_origin', 'matched_goal_category', 'source_fact', 'unresolved_project_dependencies'])
  })
})

// ── topic shortcut ─────────────────────────────────────────────────────────

describe('topic shortcut → runHrrResearch', () => {
  test.each(['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'third_party_source_rights'] as const)(
    '%s enters the pipeline with zero classifier use, same selector semantics',
    (topic) => {
      const res = runHrrResearch(runInput({ gate: topicSelectionGateResult(topic), topicClaims: [OWN_INFO, COMM_INFO] }))
      expect(res.authority_note).toBe('research')
      expect(res.attributed_question).toBeNull()
      expect(res.per_topic).toHaveLength(1)
      expect(res.per_topic[0].topic).toBe(topic)
      expect(res.per_topic[0].intent_origin).toBe('topic_selection')
      // identical to calling the reviewer selector directly
      const direct = selectReviewerClaims({ topic, topicClaims: [OWN_INFO, COMM_INFO], assetProviderIds: [], activeToolIds: [], applicabilityFacts: ctx().applicabilityFacts })
      expect(res.per_topic[0].governed_claims).toEqual(direct.claims)
      expect(res.per_topic[0].withheld).toEqual(direct.withheld)
    },
  )

  test('copyright_ownership topic with a governed claim → directly_relevant, statement quoted verbatim', () => {
    const res = runHrrResearch(runInput({ gate: topicSelectionGateResult('copyright_ownership') }))
    expect(res.per_topic[0].bi_status).toBe('directly_relevant')
    expect(res.per_topic[0].summary_blocks.join(' ')).toContain('ownership statement')
    expect(res.per_topic[0].supporting_claim_ids).toEqual(['CLAIM-OWN-001-v1'])
  })

  test('a topic with no reviewer-eligible claim → outside_current_coverage, no invented claim', () => {
    const res = runHrrResearch(runInput({ gate: topicSelectionGateResult('likeness'), topicClaims: [OWN_INFO, COMM_INFO] }))
    expect(res.per_topic[0].bi_status).toBe('outside_current_coverage')
    expect(res.per_topic[0].governed_claims).toEqual([])
    expect(res.per_topic[0].supporting_claim_ids).toEqual([])
  })
})

// ── free-form single topic (mocked classifier) ────────────────────────────

describe('free-form single topic → same downstream path as topic mode', () => {
  test('classifier resolves copyright_ownership informational → identical governed selection to the topic shortcut', () => {
    const gate = hrrAuthorityGate(permitted({ research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }] }), { sourceTextRef: 'hrr-act-1' })
    const free = runHrrResearch(runInput({ gate, attributedQuestion: 'what does governed knowledge say about copyright ownership?' }))
    const topic = runHrrResearch(runInput({ gate: topicSelectionGateResult('copyright_ownership') }))
    expect(free.per_topic[0].governed_claims).toEqual(topic.per_topic[0].governed_claims)
    expect(free.per_topic[0].bi_status).toBe(topic.per_topic[0].bi_status)
    expect(free.per_topic[0].summary_blocks).toEqual(topic.per_topic[0].summary_blocks)
    expect(free.per_topic[0].intent_origin).toBe('interpreted_question')
    expect(free.attributed_question).toBe('what does governed knowledge say about copyright ownership?')
  })
})

// ── multi-topic ───────────────────────────────────────────────────────────

describe('multi-topic', () => {
  test('commercial_use + copyright_ownership → two independent research intents, stable order, no third topic', () => {
    const gate = hrrAuthorityGate(permitted({ research_intents: [{ topic: 'commercial_use', scope: 'informational' }, { topic: 'copyright_ownership', scope: 'informational' }] }))
    const res = runHrrResearch(runInput({ gate }))
    expect(res.per_topic.map((t) => t.topic)).toEqual(['commercial_use', 'copyright_ownership'])
    expect(res.per_topic[0].governed_claims.map((c) => c.claim_id)).toEqual(['CLAIM-COMM-001-v1'])
    expect(res.per_topic[1].governed_claims.map((c) => c.claim_id)).toEqual(['CLAIM-OWN-001-v1'])
    // each researched independently — claims for one topic never bleed into the other
    expect(res.per_topic[0].governed_claims.every((c) => c.topic === 'commercial_use')).toBe(true)
  })
})

// ── assessment judgment only ──────────────────────────────────────────────

describe('assessment judgment only', () => {
  test('"Should I approve this?" → no retrieval, no BI, structured refusal metadata, no invented topic', () => {
    const gate = hrrAuthorityGate(permitted({ assessment_decision_requested: true, unresolved_ambiguity: ['no_governed_topic_matched'] }))
    const res = runHrrResearch(runInput({ gate, attributedQuestion: 'Should I approve this?' }))
    expect(res.authority_note).toBe('assessment_judgment_redirected')
    expect(res.per_topic).toEqual([])
    expect(res.offered_research_paths).toEqual(['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'third_party_source_rights'])
    expect(res.attributed_question).toBe('Should I approve this?')
  })
})

// ── mixed ─────────────────────────────────────────────────────────────────

describe('mixed question', () => {
  test('"Should I approve this, and what does governed knowledge say about copyright ownership?" → refusal metadata + informational copyright research, no determination contamination', () => {
    const gate = hrrAuthorityGate(permitted({
      research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }],
      assessment_decision_requested: true,
    }))
    const res = runHrrResearch(runInput({ gate }))
    expect(res.authority_note).toBe('assessment_judgment_redirected') // decision declined
    expect(res.per_topic).toHaveLength(1)
    expect(res.per_topic[0].topic).toBe('copyright_ownership')
    expect(res.per_topic[0].scope).toBe('informational') // NOT determination_request
    expect(res.per_topic[0].bi_status).toBe('directly_relevant') // an ordinary governed answer, NOT determination_declined
    expect(res.offered_research_paths).toBeNull() // there is research to show
  })
})

// ── determination request on a research clause ────────────────────────────

describe('determination request on the research clause itself', () => {
  test('"Can you determine whether copyright ownership is satisfied?" → determination_request enters BI → BI yields determination_declined (its own ceiling)', () => {
    const gate = hrrAuthorityGate(permitted({ research_intents: [{ topic: 'copyright_ownership', scope: 'determination_request' }] }))
    const res = runHrrResearch(runInput({ gate }))
    expect(res.authority_note).toBe('research')
    expect(res.per_topic[0].scope).toBe('determination_request')
    expect(res.per_topic[0].bi_status).toBe('determination_declined')
    // BI's determination_declined carries no supporting claim ids (fires before matching)
    expect(res.per_topic[0].supporting_claim_ids).toEqual([])
  })

  test('there is no separate HRR refusal that competes with BI — the status IS BI\'s', () => {
    const gate = hrrAuthorityGate(permitted({ research_intents: [{ topic: 'commercial_use', scope: 'determination_request' }] }))
    const res = runHrrResearch(runInput({ gate }))
    // even though a commercial_use governed claim exists, the determination_request scope wins
    expect(res.per_topic[0].bi_status).toBe('determination_declined')
  })
})

// ── unsupported / no topic ────────────────────────────────────────────────

describe('unsupported', () => {
  test('vague question → no retrieval, no BI, offer paths, no guessed topic', () => {
    const gate = hrrAuthorityGate(permitted({ unresolved_ambiguity: ['question_too_general'] }))
    const res = runHrrResearch(runInput({ gate, attributedQuestion: 'help' }))
    expect(res.authority_note).toBe('unsupported')
    expect(res.per_topic).toEqual([])
    expect(res.offered_research_paths).toHaveLength(5)
    expect(res.unresolved_ambiguity).toEqual(['question_too_general'])
  })
})

// ── applicability ─────────────────────────────────────────────────────────

describe('applicability semantics', () => {
  const usOnlyClaim = claim({ claim_id: 'CLAIM-US-OWN-v1', topic: 'copyright_ownership', crc_candidate_statement: 'US ownership rule', applicability_requirements: [US_REQ] })

  test('met → claim represented as established, fed to BI, directly_relevant', () => {
    const res = runHrrResearch(runInput({ gate: topicSelectionGateResult('copyright_ownership'), topicClaims: [usOnlyClaim], reviewerContext: ctx({ applicabilityFacts: { jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [] } }) }))
    expect(res.per_topic[0].governed_claims).toHaveLength(1)
    expect(res.per_topic[0].governed_claims[0].applicability_established).toBe(true)
    expect(res.per_topic[0].does_not_apply).toEqual([])
    expect(res.per_topic[0].bi_status).toBe('directly_relevant')
  })

  test('unresolved → claim surfaced + fed to BI, requirement shown verbatim, never pass/fail, never in does_not_apply', () => {
    const res = runHrrResearch(runInput({ gate: topicSelectionGateResult('copyright_ownership'), topicClaims: [usOnlyClaim], reviewerContext: ctx() }))
    const t = res.per_topic[0]
    expect(t.governed_claims).toHaveLength(1)
    expect(t.governed_claims[0].applicability_established).toBe(false)
    expect(t.governed_claims[0].applicability_outcomes[0].status).toBe('unresolved')
    expect(t.does_not_apply).toEqual([])
    expect(t.bi_status).toBe('directly_relevant') // shown, not withheld (diagnostics [] for HRR)
  })

  test('not_met → EXCLUDED from BI, returned in does_not_apply, NOT converted to unresolved or a negative finding', () => {
    const res = runHrrResearch(runInput({ gate: topicSelectionGateResult('copyright_ownership'), topicClaims: [usOnlyClaim], reviewerContext: ctx({ applicabilityFacts: { jurisdiction: { included: [], excluded: ['United States'] }, toolMentions: [] } }) }))
    const t = res.per_topic[0]
    expect(t.governed_claims).toEqual([]) // not fed to BI
    expect(t.does_not_apply.map((c) => c.claim_id)).toEqual(['CLAIM-US-OWN-v1'])
    expect(t.does_not_apply[0].applicability_outcomes[0].status).toBe('not_met')
    expect(t.bi_status).toBe('outside_current_coverage') // no claim reached BI; NOT relevant_applicability_unresolved, NOT a finding
    expect(t.supporting_claim_ids).toEqual([])
  })

  test('mixed: one applicable claim + one not_met claim, same topic → applicable one feeds BI, not_met one is separate', () => {
    const applicable = claim({ claim_id: 'CLAIM-GLOBAL-OWN-v1', topic: 'copyright_ownership', crc_candidate_statement: 'global rule' })
    const res = runHrrResearch(runInput({
      gate: topicSelectionGateResult('copyright_ownership'),
      topicClaims: [applicable, usOnlyClaim],
      reviewerContext: ctx({ applicabilityFacts: { jurisdiction: { included: [], excluded: ['United States'] }, toolMentions: [] } }),
    }))
    const t = res.per_topic[0]
    expect(t.governed_claims.map((c) => c.claim_id)).toEqual(['CLAIM-GLOBAL-OWN-v1'])
    expect(t.does_not_apply.map((c) => c.claim_id)).toEqual(['CLAIM-US-OWN-v1'])
    expect(t.bi_status).toBe('directly_relevant')
    expect(t.summary_blocks.join(' ')).toContain('global rule')
    expect(t.summary_blocks.join(' ')).not.toContain('US ownership rule')
  })
})

// ── reviewer eligibility firewall ─────────────────────────────────────────

describe('reviewer eligibility stays authoritative — classifier selecting a topic never exposes an ineligible claim', () => {
  test('Internal/research + Candidate + superseded → withheld, never in governed_claims / does_not_apply / BI', () => {
    const set: TopicClaim[] = [
      claim({ claim_id: 'CLAIM-INTERNAL-v1', topic: 'copyright_ownership', publication_scope: 'Internal/research' }),
      claim({ claim_id: 'CLAIM-CANDIDATE-v1', topic: 'copyright_ownership', lifecycle: 'Candidate' }),
      claim({ claim_id: 'CLAIM-OLD-v1', topic: 'copyright_ownership', superseded_by: 'CLAIM-OLD-v2', lifecycle: 'Deprecated' }),
    ]
    const res = runHrrResearch(runInput({ gate: topicSelectionGateResult('copyright_ownership'), topicClaims: set }))
    const t = res.per_topic[0]
    expect(t.governed_claims).toEqual([])
    expect(t.does_not_apply).toEqual([])
    expect(t.withheld.map((w) => w.reason).sort()).toEqual(['not_adopted', 'publication_scope_not_reviewer_eligible', 'superseded'])
    expect(t.bi_status).toBe('outside_current_coverage')
    expect(JSON.stringify(res)).not.toContain('a governed statement') // withheld content never exposed
  })
})

// ── Linked CRC independence ──────────────────────────────────────────────

describe('Linked CRC independence', () => {
  test('runHrrResearch takes only reviewer submission context + gate + topicClaims — same input, same result regardless of any CRC association', () => {
    // There is no CRC parameter to pass. Same call twice = identical.
    const a = runHrrResearch(runInput({ gate: topicSelectionGateResult('copyright_ownership') }))
    const b = runHrrResearch(runInput({ gate: topicSelectionGateResult('copyright_ownership') }))
    expect(a).toEqual(b)
  })
})

// ── false premise ────────────────────────────────────────────────────────

describe('false-premise question', () => {
  test('reviewer premise text never appears in selection / applicability / BI factual inputs — only in attributed_question', () => {
    const gate = hrrAuthorityGate(permitted({ research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }] }))
    const premise = 'Since Veo gives us copyright ownership, what does governed knowledge say?'
    const res = runHrrResearch(runInput({ gate, attributedQuestion: premise }))
    expect(res.attributed_question).toBe(premise)
    // the premise string appears nowhere in the researched output
    const perTopicJson = JSON.stringify(res.per_topic)
    expect(perTopicJson).not.toContain('Veo')
    expect(perTopicJson).not.toContain('gives us copyright ownership')
    // BI's goal_text (via intent_text) is the fixed topic label, not the question
    expect(res.per_topic[0].summary_blocks.join(' ')).not.toMatch(/Veo|gives us/)
  })
})

// ── purity ───────────────────────────────────────────────────────────────

describe('purity', () => {
  test('runHrrResearch is a pure function — identical input, identical output; input not mutated', () => {
    const input = runInput({ gate: topicSelectionGateResult('copyright_ownership') })
    const snap = JSON.stringify(input)
    expect(runHrrResearch(input)).toEqual(runHrrResearch(input))
    expect(JSON.stringify(input)).toBe(snap)
  })
})
