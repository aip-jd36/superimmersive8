/**
 * NY GBL 396-b Synthetic Performer Disclosure -- real-publication reachability
 * tests (Generic Non-Provider TopicClaim Runtime Activation milestone,
 * 2026-09-10).
 *
 * CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1 is the second
 * `provider_scope: null` / `tool_scope: null` claim to reach real
 * TOPIC_CLAIMS_FIXTURE representation, after the four CLAIM-COPY-* entries,
 * and the first `likeness`-topic claim to do so -- the sibling
 * CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1 remains withheld under
 * CPR_008 and has no fixture entry, proven absent below (§12 negative
 * control -- a governance-only boundary, distinct from a runtime one).
 *
 * These tests exercise the REAL, unmodified pipeline against the REAL,
 * committed TOPIC_CLAIMS_FIXTURE -- no synthetic clone. The scratch canary
 * that validated this claim's runtime shape before activation (CPR_025's
 * own gate) was deleted after that review; these are the first COMMITTED
 * tests for this claim.
 */

import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { deriveDiscoveredTopicOccurrences } from '@/lib/crc-engine/discovered-relevance'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

const CLAIM_ID = 'CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1'
const SIBLING_ID = 'CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1' // WITHHELD (CPR_008) -- no fixture entry, must never appear reachable

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [],
    unresolved_aliases: [],
    asset_providers: [],
    unresolved_asset_provider_mentions: [],
    workflow_role: 'unresolved',
    intended_use: 'unclear',
    scoped_observations: [],
    certainty_state: 'gate_1_unmet',
    exclusions: [],
    ...overrides,
  }
}

function likenessGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Does my ad need a disclosure since the spokesperson is AI-generated and not a real person?',
    category: 'likeness',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Does my ad need a disclosure since the spokesperson is AI-generated and not a real person?',
    ...overrides,
  }
}

function facts(jurisdictionIncluded: string[] = [], jurisdictionExcluded: string[] = []): ApplicabilityFacts {
  return { jurisdiction: { included: jurisdictionIncluded, excluded: jurisdictionExcluded }, toolMentions: [] }
}

// ── §5/§7: fixture fidelity + dependency preservation ──────────────────────

describe('fixture fidelity, mechanical projection from GOVERNED-CLAIMS.md', () => {
  const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)

  test('exists exactly once, Adopted, crc_eligible Yes', () => {
    const matches = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id === CLAIM_ID)
    expect(matches).toHaveLength(1)
    expect(claim?.lifecycle).toBe('Adopted')
    expect(claim?.crc_eligible).toBe('Yes')
  })

  test('topic, jurisdiction, provider_scope, tool_scope, claim_character projected faithfully', () => {
    expect(claim?.topic).toBe('likeness')
    expect(claim?.jurisdiction).toBe('New York (state)')
    expect(claim?.provider_scope).toBeNull()
    expect(claim?.tool_scope).toBeNull()
    expect(claim?.claim_character).toBe('established')
    expect(claim?.publication_scope).toBe('Reviewer/Commercial Assurance')
  })

  test('applicability_requirements preserved exactly: jurisdiction equals New York, no other gate', () => {
    expect(claim?.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'New York' }])
  })

  test('all four governed dependencies preserved exactly, none fabricated as resolved', () => {
    expect(claim?.unresolved_project_dependencies).toEqual([
      'advertiser_or_duty_holder_status_confirmed',
      'synthetic_performer_present_confirmed',
      'actual_knowledge_confirmed',
      'expressive_work_exemption_applies',
    ])
  })

  test('crc_candidate_statement matches the CPR_025-approved text verbatim, not the shorter pre-CPR draft', () => {
    expect(claim?.crc_candidate_statement).toMatch(/not recognizable as any identifiable natural performer/)
    expect(claim?.crc_candidate_statement).toMatch(/consistent with its use in the work/)
    expect(claim?.crc_candidate_statement).toMatch(/\$1,000 for a first violation and \$5,000/)
  })
})

// ── §14: questioning boundary -- none of the four dependencies become askable merely by activation ──

describe('dependency askability, unaffected by runtime activation', () => {
  test.each(['advertiser_or_duty_holder_status_confirmed', 'synthetic_performer_present_confirmed', 'actual_knowledge_confirmed', 'expressive_work_exemption_applies'])(
    '%s is absent from the dependency-askability registry -- remains non-self-attestable, no new user-facing question created by this activation',
    (dep) => {
      expect(getAskabilityEntry(dep)).toBeUndefined()
    },
  )
})

// ── §6: jurisdiction applicability, real pipeline ───────────────────────────

describe('jurisdiction applicability, real committed fixture', () => {
  test('A: New York included -> claim retrieved via explicit likeness goal', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['New York']))
    expect(result.matches.map((m) => m.claim_id)).toContain(CLAIM_ID)
  })

  test('B: jurisdiction unresolved -> NOT retrieved (never guessed from silence)', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts())
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('C: another US jurisdiction (California) established -> NOT retrieved, no cross-state inference', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['California']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('D: "United States" only (country-level) -> NOT retrieved, no US->NY hierarchy inferred', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('New York explicitly excluded -> NOT retrieved', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts([], ['New York']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('E: jurisdiction fact is only the applicability gate -- retrieve() never renders a "NY law definitely governs" conclusion; result carries the bounded candidate_statement only', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['New York']))
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.candidate_statement).not.toMatch(/definitely governs|legally governs your project|applies to your project/i)
  })
})

// ── §9: discovered relevance / Track C -- honestly reported, not manufactured ──

describe('Track C discovered relevance -- no registered trigger for likeness topic today', () => {
  test('no discovered-relevance trigger exists for the likeness topic (only third_party_source_rights, via asset-provider mentions, is registered) -- this claim is explicit-goal-only, matching the sibling claim\'s own architecture, exactly as this milestone\'s own report discloses rather than manufactures', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [], // no explicit goal
    }
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === 'likeness')).toEqual([])
  })
})

// ── §8/§11/§12/§13: explicit-goal retrieval, Bounded Interpretation, Projection ──

describe('explicit-goal retrieval + Bounded Interpretation + Projection, real published claim', () => {
  function suWithNYJurisdiction(): StructuredUnderstanding {
    return {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [likenessGoal()],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'New York' }, source_turn: 1, source_statement: 'New York' },
      },
    }
  }

  test('explicit likeness goal, confirmed NY jurisdiction, no fabricated goal, correct match_origin/matched_goal_category', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['New York']))
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.match_origin).toBe('exact_topic')
    expect(result?.matched_goal_category).toBe('likeness')
  })

  test('Bounded Interpretation hedges (Case 3B, unresolved dependencies); Projection renders the exact candidate_statement with zero strengthening, and never conflates with the sibling real-person likeness claim', () => {
    const su = suWithNYJurisdiction()
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const interp = output.goal_interpretations.find((i) => i.goal_text.includes('disclosure'))
    expect(interp).toBeDefined()
    const summary = interp!.summary

    // Case 3B hedge fires (four unresolved dependencies).
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    // Exact governed candidate statement content present.
    expect(summary).toMatch(/not recognizable as any identifiable natural performer/)

    // §10/§11 prohibited-conclusion audit -- none of these ever appear.
    expect(summary).not.toMatch(/violates|complies with (the|this) (law|statute|section)/i)
    expect(summary).not.toMatch(/you are (the|a) (statutory )?duty-holder/i)
    expect(summary).not.toMatch(/your (content|ad|video) (is|contains) a synthetic performer/i)
    expect(summary).not.toMatch(/you (had|have) actual knowledge/i)
    expect(summary).not.toMatch(/the exemption (applies|does not apply) to you/i)
    expect(summary).not.toMatch(/new york law (governs|applies to) your project/i)
    expect(summary).not.toMatch(/AI (tool )?providers are (expressly )?exempt/i)
    expect(summary).not.toMatch(/commercially cleared|legally cleared|copyright clearance|platform permission/i)
    // Real-person-likeness conflation guard -- the sibling claim's own subject must never appear folded into this claim's output.
    expect(summary).not.toMatch(/portrait, picture, likeness, or voice|written consent/i)

    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).toContain(CLAIM_ID)
    expect(claimIds).not.toContain(SIBLING_ID)
  })

  test('Projection renders the fixture\'s own crc_candidate_statement verbatim -- opaque pass-through, same generic composer as every other claim', () => {
    const su = suWithNYJurisdiction()
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const item = output.knowledge_items.find((k) => k.claim_id === CLAIM_ID)
    const fixtureClaim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)!
    expect(item?.statement).toBe(fixtureClaim.crc_candidate_statement)
  })

  test('jurisdiction UNCONFIRMED -> claim absent from output entirely, never asserted as though NY were confirmed', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [likenessGoal()],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain(CLAIM_ID)
  })
})

// ── §12: sibling NY likeness claim isolation (negative control) ────────────

describe('sibling CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1 isolation', () => {
  test('sibling has no fixture entry -- activating 396-b does not activate it', () => {
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === SIBLING_ID)).toBeUndefined()
  })

  test('likeness-goal + NY-jurisdiction retrieval never surfaces the sibling ID', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['New York']))
    expect(out.results.map((r) => r.claim_id)).not.toContain(SIBLING_ID)
  })
})

// ── §13: Copyright / other non-provider regression ──────────────────────────

describe('Copyright (provider_scope: null) claims unaffected by this activation', () => {
  test('exactly four CLAIM-COPY-* entries still exist, unchanged', () => {
    const copyClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-COPY-'))
    expect(copyClaims).toHaveLength(4)
    expect(copyClaims.map((c) => c.claim_id).sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1', 'CLAIM-COPY-004-v1'])
  })

  test('a copyrightability goal with US jurisdiction still retrieves COPY-001/002/003 correctly -- no duplication, no suppression, no leakage from the new likeness claim', () => {
    const goal: UserGoal = {
      goal_id: 'g-copy',
      state: 'confirmed',
      raw_text: 'Is my AI video copyrightable?',
      category: 'copyrightability',
      scope: 'informational',
      superseded_by: null,
      source_turn: 1,
      source_statement: 'Is my AI video copyrightable?',
    }
    const result = lookupTopicClaims([goal], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [] })
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids.sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1'])
    expect(ids).not.toContain(CLAIM_ID)
  })
})

// ── §16: total reachable population sanity ──────────────────────────────────

describe('total fixture population sanity', () => {
  test('exactly thirty-one Adopted + CRC-eligible claims exist (see topic-claims-fixture-consistency.test.ts for the authoritative, itemized manifest assertion)', () => {
    const live = TOPIC_CLAIMS_FIXTURE.filter((c) => c.lifecycle === 'Adopted' && c.crc_eligible === 'Yes')
    expect(live).toHaveLength(31)
  })
})
