/**
 * CAH-4I.4E — reviewer observation reconciliation, signoff-integration tests.
 *
 * Proves the gap CAH-4I.4B/4C identified end-to-end through the real
 * validateWorkbookForSignoff entry point (not just the pure
 * findUnreconciledObservations module, covered separately in
 * observation-reconciliation.test.ts), and proves the fix closes it while
 * leaving every other signoff invariant, and every legitimate reviewer
 * conclusion, untouched.
 *
 * Reuses this suite's own established completeWorkbook()/OK_SUBMISSION
 * fixture shape (signoff-integrity.test.ts) rather than inventing a new one.
 */

import { validateWorkbookForSignoff } from '../../lib/assessments/signoff'

const CONTROLS = ['A01', 'R01', 'R02', 'R03', 'R04', 'H01', 'H02', 'I01', 'I02', 'I03', 'L01', 'L02', 'L03', 'T01', 'D01', 'D02']

function completeWorkbook(overrides: Record<string, any> = {}): any {
  const section_3: Record<string, any> = {}
  for (const id of CONTROLS) section_3[id] = { judgment: 'Verified' }
  return {
    section_1: {
      scope_checks: {
        no_list_reviewed: true,
        custodian_declaration: true,
        indemnification_confirmed: true,
        video_accessible: true,
        certified_tier: true,
      },
    },
    section_2: { viewing_passes: { first_complete: true }, freeform_observations: 'x'.repeat(25) },
    section_3,
    section_5: { findings: [{ finding: 'Domain R evidence confirms a paid commercial plan.' }] },
    section_6: {
      outcome: 'EVIDENCE_SUPPORTS',
      basis: 'The evidence reviewed supports the intended commercial use across all seven domains.',
      commercial_confidence: 'High',
      conditions: [],
    },
    ...overrides,
  }
}

const OK_SUBMISSION = { custodian_declaration: true, indemnification_confirmed: true, tier: 'si8_certified' }

describe('validateWorkbookForSignoff — reconciliation invariant (CAH-4I.4E)', () => {
  test('1. clean observation + empty accounting field -> NOT blocked by reconciliation', () => {
    const wb = completeWorkbook({ section_2: { ...completeWorkbook().section_2, logos_observed: 'None observed' } })
    const r = validateWorkbookForSignoff(wb, OK_SUBMISSION)
    expect(r.ok).toBe(true)
  })

  test('2. Possible (non-clean) observation + empty accounting field -> BLOCKED', () => {
    const wb = completeWorkbook({ section_2: { ...completeWorkbook().section_2, logos_observed: 'Possible' } })
    const r = validateWorkbookForSignoff(wb, OK_SUBMISSION)
    expect(r.ok).toBe(false)
    expect(r.reasons.some((x) => /logo\/trademark/i.test(x))).toBe(true)
  })

  test('3. Confirmed (non-clean) observation + empty accounting field -> BLOCKED', () => {
    const wb = completeWorkbook({ section_2: { ...completeWorkbook().section_2, logos_observed: 'Confirmed' } })
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(false)
  })

  test('4. non-clean observation + whitespace-only accounting field -> BLOCKED', () => {
    const base = completeWorkbook()
    const wb = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'Confirmed' },
      section_3: { ...base.section_3, I03: { judgment: 'Verified', trademark_elements: '   ' } },
    }
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(false)
  })

  test('5. non-clean observation + substantive ordinary text -> reconciliation gate satisfied', () => {
    const base = completeWorkbook()
    const wb = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'Confirmed' },
      section_3: { ...base.section_3, I03: { judgment: 'Verified', trademark_elements: 'Small background logo, generic shape, no identifiable mark.' } },
    }
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(true)
  })

  test('6. non-clean observation + text explicitly documenting an unresolved outcome -> gate satisfied', () => {
    const base = completeWorkbook()
    const wb = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'Confirmed' },
      section_3: { ...base.section_3, I03: { judgment: 'Not Provided', trademark_elements: 'Could not determine origin of the mark; unresolved.' } },
    }
    const r = validateWorkbookForSignoff(wb, OK_SUBMISSION)
    expect(r.ok).toBe(true)
  })

  test('7. non-clean observation + text documenting insufficient evidence -> gate satisfied', () => {
    const base = completeWorkbook()
    const wb = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'Confirmed' },
      section_3: { ...base.section_3, I03: { judgment: 'Not Provided', trademark_elements: 'Insufficient evidence to assess this mark further.' } },
    }
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(true)
  })

  test('8. non-clean observation + adverse judgment ("Not Provided") -> gate cares only about text presence, not judgment value', () => {
    const base = completeWorkbook()
    const wbBlocked = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'Confirmed' },
      section_3: { ...base.section_3, I03: { judgment: 'Not Provided', trademark_elements: '' } },
    }
    const wbSatisfied = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'Confirmed' },
      section_3: { ...base.section_3, I03: { judgment: 'Not Provided', trademark_elements: 'Noted.' } },
    }
    expect(validateWorkbookForSignoff(wbBlocked, OK_SUBMISSION).ok).toBe(false)
    expect(validateWorkbookForSignoff(wbSatisfied, OK_SUBMISSION).ok).toBe(true)
  })

  test('9. non-clean observation + favorable judgment ("Verified") -> same structural rule, no outcome inference', () => {
    const base = completeWorkbook()
    const wbSatisfied = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'Confirmed' },
      section_3: { ...base.section_3, I03: { judgment: 'Verified', trademark_elements: 'Reviewed and noted.' } },
    }
    expect(validateWorkbookForSignoff(wbSatisfied, OK_SUBMISSION).ok).toBe(true)
  })

  test('10. clean observation with pre-existing (unnecessary) accounting text -> no regression, still passes', () => {
    const base = completeWorkbook()
    const wb = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'None observed' },
      section_3: { ...base.section_3, I03: { judgment: 'Verified', trademark_elements: 'Nothing to note.' } },
    }
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(true)
  })

  test('11. two observations mapping to the same accounting field (I03) -> one satisfied field covers both', () => {
    const base = completeWorkbook()
    const wb = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'Confirmed', trademarks_observed: 'Possible' },
      section_3: { ...base.section_3, I03: { judgment: 'Verified', trademark_elements: 'Both a logo and a trademark noted; neither identifiable.' } },
    }
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(true)
  })

  test('12. multiple independent non-clean observations -> ALL required reconciliation targets enforced', () => {
    const base = completeWorkbook()
    const wbOneMissing = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'Confirmed', copyrighted_artwork: 'Possible' },
      section_3: {
        ...base.section_3,
        I03: { judgment: 'Verified', trademark_elements: 'Noted.' },
        I01: { judgment: 'Verified', elements_identified: '' },
      },
    }
    const r = validateWorkbookForSignoff(wbOneMissing, OK_SUBMISSION)
    expect(r.ok).toBe(false)
    expect(r.reasons.some((x) => /copyrighted artwork/i.test(x))).toBe(true)
  })

  test('13. unexpected_content routed to Section 5, exactly as CAH-4I.4C specifies', () => {
    const base = completeWorkbook()
    const wbBlocked = { ...base, section_2: { ...base.section_2, unexpected_content: true }, section_5: { findings: [] } }
    const wbSatisfied = {
      ...base,
      section_2: { ...base.section_2, unexpected_content: true },
      section_5: { findings: [{ finding: 'Unusual watermark noted at 0:12.', domain: 'Technical Provenance' }] },
    }
    expect(validateWorkbookForSignoff(wbBlocked, OK_SUBMISSION).ok).toBe(false)
    expect(validateWorkbookForSignoff(wbSatisfied, OK_SUBMISSION).ok).toBe(true)
  })

  test('14. landmarks_observed routed to Section 5, exactly as CAH-4I.4C specifies', () => {
    const base = completeWorkbook()
    const wbBlocked = { ...base, section_2: { ...base.section_2, landmarks_observed: 'Confirmed' }, section_5: { findings: [] } }
    const wbSatisfied = {
      ...base,
      section_2: { ...base.section_2, landmarks_observed: 'Confirmed' },
      section_5: { findings: [{ finding: 'Recognizable landmark visible in background.', domain: 'Third-Party IP' }] },
    }
    expect(validateWorkbookForSignoff(wbBlocked, OK_SUBMISSION).ok).toBe(false)
    expect(validateWorkbookForSignoff(wbSatisfied, OK_SUBMISSION).ok).toBe(true)
  })

  test('15. real_likeness_suspected clean state ("None identified") does not accidentally trigger from a PRESENCE-enum assumption', () => {
    const base = completeWorkbook()
    const wb = { ...base, section_2: { ...base.section_2, real_likeness_suspected: 'None identified' } }
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(true)
  })

  test('16. music_heard clean state ("Generic / royalty-free") does not accidentally trigger from a PRESENCE-enum assumption', () => {
    const base = completeWorkbook()
    const wb = { ...base, section_2: { ...base.section_2, music_heard: 'Generic / royalty-free' } }
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(true)
  })

  test('17. correction from non-clean -> clean removes the requirement (current-state, not historical)', () => {
    const base = completeWorkbook()
    const wbWhileConcerning = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'Confirmed' },
      section_3: { ...base.section_3, I03: { judgment: 'Verified', trademark_elements: '' } },
    }
    expect(validateWorkbookForSignoff(wbWhileConcerning, OK_SUBMISSION).ok).toBe(false)
    const wbAfterCorrection = { ...wbWhileConcerning, section_2: { ...wbWhileConcerning.section_2, logos_observed: 'None observed' } }
    expect(validateWorkbookForSignoff(wbAfterCorrection, OK_SUBMISSION).ok).toBe(true)
  })

  test('18. correction from clean -> non-clean introduces the requirement', () => {
    const base = completeWorkbook()
    const wbClean = { ...base, section_2: { ...base.section_2, logos_observed: 'None observed' } }
    expect(validateWorkbookForSignoff(wbClean, OK_SUBMISSION).ok).toBe(true)
    const wbNowConcerning = { ...wbClean, section_2: { ...wbClean.section_2, logos_observed: 'Possible' } }
    expect(validateWorkbookForSignoff(wbNowConcerning, OK_SUBMISSION).ok).toBe(false)
  })

  test('19. one missing reconciliation among several otherwise-satisfied ones -> signoff still fails closed', () => {
    const base = completeWorkbook()
    const wb = {
      ...base,
      section_2: {
        ...base.section_2,
        logos_observed: 'Confirmed',
        copyrighted_artwork: 'Possible',
        real_likeness_suspected: 'Possible',
      },
      section_3: {
        ...base.section_3,
        I03: { judgment: 'Verified', trademark_elements: 'Noted.' },
        I01: { judgment: 'Verified', elements_identified: 'Noted.' },
        L01: { judgment: 'Verified', likeness_found: '', notes: '' }, // the one left unaccounted for
      },
    }
    const r = validateWorkbookForSignoff(wb, OK_SUBMISSION)
    expect(r.ok).toBe(false)
    expect(r.reasons.some((x) => /likeness/i.test(x))).toBe(true)
  })

  test('failure-message contract: names the observation and destination, never prescribes a legal conclusion', () => {
    const base = completeWorkbook()
    const wb = {
      ...base,
      section_2: { ...base.section_2, logos_observed: 'Confirmed' },
      section_3: { ...base.section_3, I03: { judgment: 'Verified', trademark_elements: '' } },
    }
    const r = validateWorkbookForSignoff(wb, OK_SUBMISSION)
    const msg = r.reasons.find((x) => /logo\/trademark/i.test(x))!
    expect(msg).toBeTruthy()
    // Must never assert or imply a legal/commercial conclusion.
    for (const forbidden of [/infring/i, /resolve the/i, /obtain rights/i, /cannot pass/i, /violation/i, /insufficient evidence detected/i]) {
      expect(msg).not.toMatch(forbidden)
    }
  })

  test('a fully clean workbook with no observations at all is unaffected — regression guard against the whole existing suite', () => {
    expect(validateWorkbookForSignoff(completeWorkbook(), OK_SUBMISSION).ok).toBe(true)
  })
})
