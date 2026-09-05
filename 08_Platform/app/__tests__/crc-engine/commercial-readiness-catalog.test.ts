/**
 * Commercial Readiness Discovery Catalog eligibility test suite (CRC
 * Limited Pilot, 2026-08-12). Pure functions, no live model, no
 * BoundaryState/run-turn.ts involvement -- `alreadyAskedThisConversation`
 * is a plain injected boolean per the module's own design (see its header
 * comment for why).
 */

import {
  COMMERCIAL_READINESS_CATEGORIES,
  COMMERCIAL_READINESS_DISCOVERY_QUESTIONS,
  COMMERCIAL_READINESS_TAKEAWAYS,
  evaluateCategoryEligibility,
  getCommercialReadinessTakeaway,
  selectEligibleCommercialReadinessCategory,
} from '@/lib/crc-engine/commercial-readiness-catalog'
import type { CommercialReadinessIndicators, IndicatorState } from '@/lib/crc-engine/commercial-readiness-indicators'

function indicators(overrides: Partial<CommercialReadinessIndicators> = {}): CommercialReadinessIndicators {
  return {
    client_involvement: 'unknown',
    person_depicted: 'unknown',
    reference_material_used: 'unknown',
    ...overrides,
  }
}

describe('evaluateCategoryEligibility', () => {
  test('applicable + evidence gap open + gate 1 met + phase 3 -> eligible', () => {
    const result = evaluateCategoryEligibility(
      'client_provided_source_assets',
      indicators({ client_involvement: 'affirmative' }),
      false,
      true,
      3,
    )
    expect(result).toEqual({
      category: 'client_provided_source_assets',
      applicability: 'affirmative',
      evidence_gap_open: true,
      eligible: true,
    })
  })

  test('applicability negative -> not eligible', () => {
    const result = evaluateCategoryEligibility(
      'client_provided_source_assets',
      indicators({ client_involvement: 'negative' }),
      false,
      true,
      3,
    )
    expect(result.eligible).toBe(false)
  })

  test('applicability unknown -> not eligible (conservative v1 rule: unknown never counts as applicable)', () => {
    const result = evaluateCategoryEligibility('client_provided_source_assets', indicators(), false, true, 3)
    expect(result.applicability).toBe('unknown')
    expect(result.eligible).toBe(false)
  })

  test('applicable but already asked this conversation -> evidence gap closed -> not eligible', () => {
    const result = evaluateCategoryEligibility(
      'client_provided_source_assets',
      indicators({ client_involvement: 'affirmative' }),
      true,
      true,
      3,
    )
    expect(result.evidence_gap_open).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('applicable + evidence gap open but gate 1 not met -> not eligible', () => {
    const result = evaluateCategoryEligibility(
      'client_provided_source_assets',
      indicators({ client_involvement: 'affirmative' }),
      false,
      false,
      3,
    )
    expect(result.eligible).toBe(false)
  })

  test('applicable + evidence gap open + gate 1 met but phase !== 3 -> not eligible', () => {
    for (const phase of [1, 2] as const) {
      const result = evaluateCategoryEligibility(
        'client_provided_source_assets',
        indicators({ client_involvement: 'affirmative' }),
        false,
        true,
        phase,
      )
      expect(result.eligible).toBe(false)
    }
  })

  test('each category reads its own dedicated indicator, not another category\'s', () => {
    const mixed = indicators({ client_involvement: 'affirmative', person_depicted: 'negative', reference_material_used: 'unknown' })
    expect(evaluateCategoryEligibility('client_provided_source_assets', mixed, false, true, 3).applicability).toBe('affirmative')
    expect(evaluateCategoryEligibility('likeness_publicity_rights', mixed, false, true, 3).applicability).toBe('negative')
    expect(evaluateCategoryEligibility('third_party_visual_assets', mixed, false, true, 3).applicability).toBe('unknown')
  })
})

describe('selectEligibleCommercialReadinessCategory', () => {
  test('no category applicable -> null', () => {
    expect(selectEligibleCommercialReadinessCategory(indicators(), false, true, 3)).toBeNull()
  })

  test('exactly one category applicable -> that category', () => {
    const result = selectEligibleCommercialReadinessCategory(indicators({ person_depicted: 'affirmative' }), false, true, 3)
    expect(result).toBe('likeness_publicity_rights')
  })

  test('multiple categories applicable -> fixed pilot priority order picks client_provided_source_assets first', () => {
    const result = selectEligibleCommercialReadinessCategory(
      indicators({ client_involvement: 'affirmative', person_depicted: 'affirmative', reference_material_used: 'affirmative' }),
      false,
      true,
      3,
    )
    expect(result).toBe('client_provided_source_assets')
  })

  test('first-priority category applicable but negative -> falls through to next applicable category', () => {
    const result = selectEligibleCommercialReadinessCategory(
      indicators({ client_involvement: 'negative', person_depicted: 'affirmative' }),
      false,
      true,
      3,
    )
    expect(result).toBe('likeness_publicity_rights')
  })

  test('third-priority-only applicable -> third_party_visual_assets', () => {
    const result = selectEligibleCommercialReadinessCategory(indicators({ reference_material_used: 'affirmative' }), false, true, 3)
    expect(result).toBe('third_party_visual_assets')
  })

  test('everything applicable but already asked this conversation -> null (global cap collapses evidence gap for all categories at once)', () => {
    const result = selectEligibleCommercialReadinessCategory(
      indicators({ client_involvement: 'affirmative', person_depicted: 'affirmative', reference_material_used: 'affirmative' }),
      true,
      true,
      3,
    )
    expect(result).toBeNull()
  })

  test('gate 1 not met -> null regardless of applicability', () => {
    const result = selectEligibleCommercialReadinessCategory(indicators({ client_involvement: 'affirmative' }), false, false, 3)
    expect(result).toBeNull()
  })

  test('phase !== 3 -> null regardless of applicability', () => {
    const result = selectEligibleCommercialReadinessCategory(indicators({ client_involvement: 'affirmative' }), false, true, 2)
    expect(result).toBeNull()
  })
})

describe('client_provided_source_assets takeaway copy (answer-neutral revision, CRD-1, 2026-09-05)', () => {
  test('exact copy -- conditional framing, no presupposition that client assets were supplied', () => {
    expect(getCommercialReadinessTakeaway('client_provided_source_assets')).toBe(
      "Worth knowing: when a client or brand supplies their own photos, footage, logos, or brand assets, that material carries its own rights and documentation questions, separate from the AI platform's own terms. For commercial work, it's useful to document any such client-supplied material -- what was provided, and what permissions or representations came with it.",
    )
  })

  test('never reintroduces liability-allocation language the investigation found unsupported', () => {
    const text = getCommercialReadinessTakeaway('client_provided_source_assets').toLowerCase()
    expect(text).not.toContain('responsibility sits with')
    expect(text).not.toContain('generally sits with the client')
    expect(text).not.toContain('clearance responsibility')
  })

  test('does not tell the user to document "what the client supplied" as though something was supplied (the CC-4 UAT defect)', () => {
    const text = getCommercialReadinessTakeaway('client_provided_source_assets').toLowerCase()
    // The exact presupposing phrase from the pre-CRD-1 copy.
    expect(text).not.toContain('document what the client supplied')
    expect(text).not.toContain('accompanied those assets')
  })
})

describe('takeaway copy left byte-identical by CRD-1 (already answer-neutral -- minimal diff)', () => {
  test('likeness_publicity_rights -- unchanged', () => {
    expect(getCommercialReadinessTakeaway('likeness_publicity_rights')).toBe(
      "Worth knowing: showing a real person's face, voice, or likeness in commercial content is typically governed by publicity and likeness rights, which are separate from -- and not covered by -- an AI tool's own commercial-use terms. Getting a platform's permission to generate something is not the same as getting that person's permission to be shown.",
    )
  })

  test('third_party_visual_assets -- sentence 1 unchanged; sentence 2 generic-input phrasing', () => {
    expect(getCommercialReadinessTakeaway('third_party_visual_assets')).toBe(
      "Worth knowing: reference material you upload or start from -- photos, stock footage, existing video -- carries its own licensing terms, separate from the AI tool's own commercial-use terms. A platform's terms cover what it generates, not necessarily the rights to any material fed into it.",
    )
  })

  test('third_party_visual_assets no longer says "material you fed into it" (past-tense, second-person-specific -- reads as presupposing input after a "no")', () => {
    expect(getCommercialReadinessTakeaway('third_party_visual_assets')).not.toContain('material you fed into it')
  })
})

describe('CRD-1 -- answer-neutral educational takeaway invariant (all categories)', () => {
  test('every discovery category still has a fixed, non-empty takeaway and question', () => {
    for (const category of COMMERCIAL_READINESS_CATEGORIES) {
      expect(typeof COMMERCIAL_READINESS_TAKEAWAYS[category]).toBe('string')
      expect(COMMERCIAL_READINESS_TAKEAWAYS[category].length).toBeGreaterThan(0)
      expect(getCommercialReadinessTakeaway(category)).toBe(COMMERCIAL_READINESS_TAKEAWAYS[category])
      expect(typeof COMMERCIAL_READINESS_DISCOVERY_QUESTIONS[category]).toBe('string')
      expect(COMMERCIAL_READINESS_DISCOVERY_QUESTIONS[category].length).toBeGreaterThan(0)
    }
  })

  test('no takeaway presupposes the asked-about condition is present in THIS project', () => {
    // Phrases that only make sense if the user answered "yes" -- a second-
    // person-specific past action, or a directive that assumes the thing exists.
    const presupposesPresence = [
      'what the client supplied',
      'what you supplied',
      'the assets you',
      'material you fed into it',
      'the person you',
      'the people you',
      'your uploaded',
    ]
    for (const category of COMMERCIAL_READINESS_CATEGORIES) {
      const text = getCommercialReadinessTakeaway(category).toLowerCase()
      for (const phrase of presupposesPresence) {
        expect(text).not.toContain(phrase)
      }
    }
  })

  test('no takeaway presupposes the asked-about condition is ABSENT either', () => {
    const presupposesAbsence = ['since you did not', "since you didn't", 'because none', 'as none were', 'you have none']
    for (const category of COMMERCIAL_READINESS_CATEGORIES) {
      const text = getCommercialReadinessTakeaway(category).toLowerCase()
      for (const phrase of presupposesAbsence) {
        expect(text).not.toContain(phrase)
      }
    }
  })

  test('no takeaway uses verdict / clearance / materiality / risk / evidence / project-finding language', () => {
    // "material" as a bare noun ("source material", "reference material") is
    // legitimate and predates CRD-1 -- the concern is materiality/risk as a
    // JUDGMENT, so the phrases below target that, not the word in isolation.
    const forbidden = [
      'checked',
      'cleared',
      'verified',
      'compliant',
      'noncompliant',
      'found a risk',
      'is material',
      'materially',
      'a risk',
      'legal risk',
      'commercial risk',
      'blocker',
      'is resolved',
      'this project is',
      'your project is',
      'you are cleared',
      "you're cleared",
      'commercial assurance will',
      'we will verify',
      'evidence has been',
    ]
    for (const category of COMMERCIAL_READINESS_CATEGORIES) {
      const text = getCommercialReadinessTakeaway(category).toLowerCase()
      for (const phrase of forbidden) {
        expect(text).not.toContain(phrase)
      }
    }
  })

  test('every takeaway still opens with the fixed "Worth knowing:" educational framing', () => {
    for (const category of COMMERCIAL_READINESS_CATEGORIES) {
      expect(getCommercialReadinessTakeaway(category).startsWith('Worth knowing:')).toBe(true)
    }
  })

  test('client_provided_source_assets takeaway is coherent after a clean negative answer (regression fixture for the CC-4 UAT)', () => {
    // The UAT sequence: CRC asked the client-assets discovery question; the
    // user answered "No. The client didn't provide any images, video, logos,
    // or other brand assets for this project." The fixed takeaway then fires
    // unconditionally (unchanged lifecycle). It must not read as a directive
    // about assets that were supplied.
    const takeaway = getCommercialReadinessTakeaway('client_provided_source_assets')
    const lower = takeaway.toLowerCase()
    // Concept still taught: client-supplied brand assets carry their own
    // rights/documentation question, distinct from the platform's terms.
    expect(lower).toContain('rights and documentation question')
    expect(lower).toContain("ai platform's own terms")
    // Conditional framing present -- the takeaway describes the concept, not
    // a fact about this conversation.
    expect(lower).toContain('when a client or brand supplies')
    // No directive that only parses if something was supplied.
    expect(lower).not.toContain('document what the client supplied')
  })
})
