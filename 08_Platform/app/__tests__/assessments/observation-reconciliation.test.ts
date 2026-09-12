/**
 * CAH-4I.4E — reviewer observation reconciliation, pure-module tests.
 *
 * Tests findUnreconciledObservations() in isolation, independent of
 * validateWorkbookForSignoff (see signoff-reconciliation.test.ts for the
 * integration-level proof). Covers the CAH-4I.4C test matrix's structural
 * cases: distinct vocabularies per field, shared targets, the Section-5
 * fallback for uncontrolled observations, current-state (not historical)
 * evaluation, and the authority firewall (the function never reads a
 * judgment value or inspects text content beyond non-emptiness).
 */

import { findUnreconciledObservations } from '../../lib/assessments/observation-reconciliation'

function wb(section_2: Record<string, any> = {}, section_3: Record<string, any> = {}, section_5: Record<string, any> = {}) {
  return { section_2, section_3, section_5 }
}

describe('findUnreconciledObservations — clean states never trigger', () => {
  test('all-clean section_2 produces zero issues', () => {
    const result = findUnreconciledObservations(
      wb({
        logos_observed: 'None observed',
        trademarks_observed: 'None observed',
        copyrighted_artwork: 'None observed',
        landmarks_observed: 'None observed',
        real_likeness_suspected: 'None identified',
        music_heard: 'None',
        unexpected_content: false,
      }),
    )
    expect(result).toEqual([])
  })

  test('empty/undefined section_2 (no observations recorded yet) produces zero issues', () => {
    expect(findUnreconciledObservations(wb({}))).toEqual([])
  })

  test('an entirely missing workbook does not throw and produces zero issues', () => {
    expect(findUnreconciledObservations(undefined)).toEqual([])
    expect(findUnreconciledObservations(null)).toEqual([])
    expect(findUnreconciledObservations({})).toEqual([])
  })
})

describe('findUnreconciledObservations — distinct vocabularies are respected, not normalized', () => {
  test('real_likeness_suspected clean sentinel is "None identified", NOT "None observed" — does not accidentally trigger', () => {
    // If the code wrongly assumed the shared PRESENCE sentinel, this clean value
    // ('None identified') would be treated as non-clean and incorrectly flagged.
    const result = findUnreconciledObservations(wb({ real_likeness_suspected: 'None identified' }))
    expect(result).toEqual([])
  })

  test('music_heard "Generic / royalty-free" is a clean state too, not just "None" — does not accidentally trigger', () => {
    const result = findUnreconciledObservations(wb({ music_heard: 'Generic / royalty-free' }))
    expect(result).toEqual([])
  })

  test('music_heard "None" is also clean', () => {
    expect(findUnreconciledObservations(wb({ music_heard: 'None' }))).toEqual([])
  })

  test('music_heard "Identifiable track" triggers; "Possibly identifiable" triggers', () => {
    expect(findUnreconciledObservations(wb({ music_heard: 'Identifiable track' })).length).toBe(1)
    expect(findUnreconciledObservations(wb({ music_heard: 'Possibly identifiable' })).length).toBe(1)
  })
})

describe('findUnreconciledObservations — Possible/Confirmed both trigger, with empty accounting field', () => {
  test('logos_observed "Possible" + empty I03.trademark_elements -> blocked', () => {
    const result = findUnreconciledObservations(wb({ logos_observed: 'Possible' }, { I03: { trademark_elements: '' } }))
    expect(result).toHaveLength(1)
    expect(result[0].message).toMatch(/logo\/trademark/i)
  })

  test('logos_observed "Confirmed" + empty I03.trademark_elements -> blocked', () => {
    const result = findUnreconciledObservations(wb({ logos_observed: 'Confirmed' }, { I03: { trademark_elements: '' } }))
    expect(result).toHaveLength(1)
  })

  test('whitespace-only accounting text fails closed the same as empty', () => {
    const result = findUnreconciledObservations(wb({ logos_observed: 'Confirmed' }, { I03: { trademark_elements: '   ' } }))
    expect(result).toHaveLength(1)
  })

  test('non-empty accounting text satisfies the requirement regardless of content', () => {
    expect(
      findUnreconciledObservations(wb({ logos_observed: 'Confirmed' }, { I03: { trademark_elements: 'Generic geometric shape, not a specific mark.' } })),
    ).toEqual([])
  })

  test('an unresolved/insufficient-evidence disposition satisfies the requirement — the predicate never inspects content', () => {
    expect(
      findUnreconciledObservations(
        wb({ logos_observed: 'Confirmed' }, { I03: { trademark_elements: 'Unable to determine; insufficient evidence to resolve.' } }),
      ),
    ).toEqual([])
  })
})

describe('findUnreconciledObservations — shared target (logos_observed + trademarks_observed -> I03)', () => {
  test('both triggered, field empty -> exactly ONE issue, not two', () => {
    const result = findUnreconciledObservations(
      wb({ logos_observed: 'Confirmed', trademarks_observed: 'Possible' }, { I03: { trademark_elements: '' } }),
    )
    expect(result).toHaveLength(1)
  })

  test('both triggered, field satisfied -> zero issues (one field covers both)', () => {
    const result = findUnreconciledObservations(
      wb({ logos_observed: 'Confirmed', trademarks_observed: 'Possible' }, { I03: { trademark_elements: 'Both noted, see description.' } }),
    )
    expect(result).toEqual([])
  })
})

describe('findUnreconciledObservations — independent multi-observation cases', () => {
  test('two independent non-clean observations each require their own reconciliation', () => {
    const result = findUnreconciledObservations(
      wb(
        { logos_observed: 'Confirmed', copyrighted_artwork: 'Possible' },
        { I03: { trademark_elements: '' }, I01: { elements_identified: '' } },
      ),
    )
    expect(result).toHaveLength(2)
  })

  test('one satisfied, one missing among several triggers -> still fails closed for the missing one', () => {
    const result = findUnreconciledObservations(
      wb(
        { logos_observed: 'Confirmed', copyrighted_artwork: 'Possible' },
        { I03: { trademark_elements: 'Accounted for.' }, I01: { elements_identified: '' } },
      ),
    )
    expect(result).toHaveLength(1)
    expect(result[0].message).toMatch(/copyrighted artwork/i)
  })
})

describe('findUnreconciledObservations — real_likeness_suspected -> L01', () => {
  test('triggered + both L01 fields empty -> blocked', () => {
    const result = findUnreconciledObservations(wb({ real_likeness_suspected: 'Possible' }, { L01: { likeness_found: '', notes: '' } }))
    expect(result).toHaveLength(1)
  })

  test('triggered + likeness_found set (any value) -> satisfied', () => {
    expect(
      findUnreconciledObservations(wb({ real_likeness_suspected: 'Confirmed' }, { L01: { likeness_found: 'None identified', notes: '' } })),
    ).toEqual([])
  })

  test('triggered + notes non-empty (likeness_found still default) -> satisfied', () => {
    expect(
      findUnreconciledObservations(wb({ real_likeness_suspected: 'Confirmed' }, { L01: { likeness_found: '', notes: 'Reviewed, generic AI face.' } })),
    ).toEqual([])
  })

  test('L02 judgment/fields are never inspected (deliberate scope decision, documented) — an unrelated L02 state does not change the L01 result', () => {
    const a = findUnreconciledObservations(
      wb({ real_likeness_suspected: 'Possible' }, { L01: { likeness_found: '', notes: '' }, L02: { performers_present: true, distinctness: '' } }),
    )
    const b = findUnreconciledObservations(
      wb({ real_likeness_suspected: 'Possible' }, { L01: { likeness_found: '', notes: '' }, L02: { performers_present: false, distinctness: '' } }),
    )
    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
    expect(a[0].message).toBe(b[0].message)
  })
})

describe('findUnreconciledObservations — uncontrolled observations route to Section 5', () => {
  test('unexpected_content=true + no qualifying finding -> blocked', () => {
    expect(findUnreconciledObservations(wb({ unexpected_content: true }, {}, { findings: [] }))).toHaveLength(1)
  })

  test('unexpected_content=true + a finding with finding-text but empty domain -> still blocked (domain required)', () => {
    const result = findUnreconciledObservations(wb({ unexpected_content: true }, {}, { findings: [{ finding: 'Something notable.', domain: '' }] }))
    expect(result).toHaveLength(1)
  })

  test('unexpected_content=true + a qualifying finding (domain + finding both non-empty) -> satisfied', () => {
    expect(
      findUnreconciledObservations(
        wb({ unexpected_content: true }, {}, { findings: [{ finding: 'Unusual watermark in corner.', domain: 'Technical Provenance' }] }),
      ),
    ).toEqual([])
  })

  test('landmarks_observed "Possible" + no qualifying finding -> blocked', () => {
    expect(findUnreconciledObservations(wb({ landmarks_observed: 'Possible' }, {}, { findings: [] }))).toHaveLength(1)
  })

  test('landmarks_observed "Possible" + a qualifying finding -> satisfied', () => {
    expect(
      findUnreconciledObservations(
        wb({ landmarks_observed: 'Confirmed' }, {}, { findings: [{ finding: 'Recognizable skyline visible.', domain: 'Third-Party IP' }] }),
      ),
    ).toEqual([])
  })

  test('both unexpected_content and landmarks_observed triggered with no finding -> two independent issues', () => {
    const result = findUnreconciledObservations(wb({ unexpected_content: true, landmarks_observed: 'Confirmed' }, {}, { findings: [] }))
    expect(result).toHaveLength(2)
  })

  test('both triggered, one qualifying finding present -> satisfies BOTH (the fallback is workbook-wide, not per-observation)', () => {
    const result = findUnreconciledObservations(
      wb({ unexpected_content: true, landmarks_observed: 'Confirmed' }, {}, { findings: [{ finding: 'Covers both concerns.', domain: 'General' }] }),
    )
    expect(result).toEqual([])
  })
})

describe('findUnreconciledObservations — current-state (not historical) evaluation', () => {
  test('correction from non-clean to clean removes the requirement, even with empty accounting field', () => {
    expect(findUnreconciledObservations(wb({ logos_observed: 'None observed' }, { I03: { trademark_elements: '' } }))).toEqual([])
  })

  test('correction from clean to non-clean introduces the requirement', () => {
    expect(findUnreconciledObservations(wb({ logos_observed: 'Confirmed' }, { I03: { trademark_elements: '' } }))).toHaveLength(1)
  })

  test('reconciliation text later removed re-triggers the requirement (no memory of a prior satisfied state)', () => {
    const satisfied = findUnreconciledObservations(wb({ logos_observed: 'Confirmed' }, { I03: { trademark_elements: 'Noted.' } }))
    const thenBlanked = findUnreconciledObservations(wb({ logos_observed: 'Confirmed' }, { I03: { trademark_elements: '' } }))
    expect(satisfied).toEqual([])
    expect(thenBlanked).toHaveLength(1)
  })
})

describe('findUnreconciledObservations — authority firewall (never inspects judgment or reaches a conclusion)', () => {
  test('the function signature and behavior are identical regardless of any judgment value on the linked control', () => {
    for (const judgment of ['Verified', 'Partially Verified', 'Not Provided', 'Not Applicable', 'anything-else', undefined]) {
      const emptyAccounting = findUnreconciledObservations(wb({ logos_observed: 'Confirmed' }, { I03: { judgment, trademark_elements: '' } }))
      const filledAccounting = findUnreconciledObservations(wb({ logos_observed: 'Confirmed' }, { I03: { judgment, trademark_elements: 'x' } }))
      expect(emptyAccounting).toHaveLength(1) // blocked regardless of judgment value
      expect(filledAccounting).toEqual([]) // satisfied regardless of judgment value
    }
  })

  test('every returned issue is exactly {message: string} — no status, no severity, no inferred conclusion field', () => {
    const result = findUnreconciledObservations(wb({ logos_observed: 'Confirmed' }, { I03: { trademark_elements: '' } }))
    expect(result).toHaveLength(1)
    expect(Object.keys(result[0])).toEqual(['message'])
  })
})
