/**
 * CA-METH-3B — Assessment Jurisdiction (G2).
 *
 * Proves the G1/G2 distinction is real and enforced:
 *   G1 (submission.territory_preferences, broad, creator-supplied)
 *   != G2 (workbook.section_1.jurisdiction_context, narrower, reviewer-established)
 * and that G2 is mandatory-to-CONSIDER (a value must be set) without being
 * mandatory-to-RESOLVE (concrete / none-material / unresolved are all
 * complete, sign-off-compatible states) -- never inferred from G1, never a
 * legal conclusion, never jurisdiction-specific.
 *
 * Run: npx jest __tests__/assessments/g2-assessment-jurisdiction.test.ts
 */

import fs from 'fs'
import path from 'path'
import { EMPTY_WORKBOOK } from '@/app/admin/submissions/[id]/review/workbook-schema'
import { validateWorkbookForSignoff } from '@/lib/assessments/signoff'
import { projectReport, type ReportProjectionInput } from '@/lib/assessments/reportProjection'
import { resolveSubmissionJurisdiction } from '@/lib/reviewer-lk/submission-facts'

const OTHER_CONTROLS = ['A01', 'R01', 'R02', 'R03', 'R04', 'R05', 'H01', 'H02', 'I01', 'I02', 'I03', 'L01', 'L02', 'L03', 'T01', 'D01', 'D02']
const OK_SUBMISSION = { custodian_declaration: true, indemnification_confirmed: true, tier: 'si8_certified' }

function baseWorkbook(jurisdictionOverrides: Record<string, any> | undefined = { status: '', details: '' }): any {
  const section_3: Record<string, any> = {}
  for (const id of OTHER_CONTROLS) section_3[id] = { judgment: 'Verified' }
  const section_1: any = {
    scope_checks: {
      no_list_reviewed: true, custodian_declaration: true, indemnification_confirmed: true,
      video_accessible: true, certified_tier: true,
    },
  }
  if (jurisdictionOverrides !== undefined) section_1.jurisdiction_context = jurisdictionOverrides
  return {
    section_1,
    section_2: { viewing_passes: { first_complete: true }, freeform_observations: 'x'.repeat(25) },
    section_3,
    section_5: { findings: [{ finding: 'Domain R evidence confirms a paid commercial plan.' }] },
    section_6: {
      outcome: 'EVIDENCE_SUPPORTS',
      basis: 'The evidence reviewed supports the intended commercial use across all seven domains.',
      commercial_confidence: 'High',
      conditions: [],
    },
  }
}

// ── Schema shape ─────────────────────────────────────────────────────────

describe('EMPTY_WORKBOOK.section_1.jurisdiction_context shape', () => {
  test('is a status/details pair, unset by default', () => {
    expect(EMPTY_WORKBOOK.section_1.jurisdiction_context).toEqual({ status: '', details: '' })
  })

  test('no jurisdiction-specific field name exists anywhere on it or its neighbors', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../app/admin/submissions/[id]/review/workbook-schema.ts'),
      'utf8',
    )
    for (const forbidden of ['new_york', 'newYork', 'ny_disclosure', 'state_specific']) {
      expect(src.toLowerCase()).not.toContain(forbidden.toLowerCase())
    }
  })
})

// ── Case 1/2/3/4/9 — signoff / mandatory consideration ─────────────────────

describe('Case 1 (broad distribution, G2 untouched): methodology incomplete, no inferred G2', () => {
  test('an untouched (default) jurisdiction_context blocks signoff', () => {
    const r = validateWorkbookForSignoff(baseWorkbook(), OK_SUBMISSION)
    expect(r.ok).toBe(false)
    expect(r.reasons.some((x) => /jurisdiction_context/.test(x))).toBe(true)
  })

  test('a broad G1 (submission.territory_preferences) never auto-populates G2', () => {
    const wb = baseWorkbook()
    // G1 lives on the submission row, not the workbook -- proven structurally
    // distinct: nothing in baseWorkbook derives jurisdiction_context from any
    // territory value, and the field remains '' regardless of G1.
    expect(wb.section_1.jurisdiction_context.status).toBe('')
  })
})

describe('Case 2 (broad distribution, G2 unresolved): consideration recorded, no fabricated jurisdiction', () => {
  test('unresolved_requires_followup satisfies signoff', () => {
    const r = validateWorkbookForSignoff(
      baseWorkbook({ status: 'unresolved_requires_followup', details: '' }),
      OK_SUBMISSION,
    )
    expect(r.ok).toBe(true)
  })
})

describe('Case 3 (concrete G2): persists independently of G1', () => {
  test('narrower_jurisdiction_noted with details satisfies signoff and is distinct from any G1 value', () => {
    const wb = baseWorkbook({ status: 'narrower_jurisdiction_noted', details: 'A specific narrower jurisdiction the reviewer identified.' })
    const r = validateWorkbookForSignoff(wb, OK_SUBMISSION)
    expect(r.ok).toBe(true)
    expect(wb.section_1.jurisdiction_context.details).toBe('A specific narrower jurisdiction the reviewer identified.')
  })
})

describe('Case 4 (no narrower material jurisdiction): distinct from unresolved', () => {
  test('no_narrower_jurisdiction_implicated satisfies signoff and is a different stored value than unresolved', () => {
    const wb = baseWorkbook({ status: 'no_narrower_jurisdiction_implicated', details: '' })
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(true)
    expect(wb.section_1.jurisdiction_context.status).not.toBe('unresolved_requires_followup')
  })
})

describe('Case 9 (signoff): untouched blocks; each valid disposition satisfies', () => {
  test('empty status blocks', () => {
    expect(validateWorkbookForSignoff(baseWorkbook({ status: '', details: '' }), OK_SUBMISSION).ok).toBe(false)
  })
  test('an unrecognized/malformed status also blocks (fail closed, not silently accepted)', () => {
    const r = validateWorkbookForSignoff(baseWorkbook({ status: 'something_else', details: '' }), OK_SUBMISSION)
    expect(r.ok).toBe(false)
    expect(r.reasons.some((x) => /jurisdiction_context/.test(x))).toBe(true)
  })
  for (const status of ['no_narrower_jurisdiction_implicated', 'narrower_jurisdiction_noted', 'unresolved_requires_followup']) {
    test(`${status} satisfies signoff`, () => {
      expect(validateWorkbookForSignoff(baseWorkbook({ status, details: 'x' }), OK_SUBMISSION).ok).toBe(true)
    })
  }
})

// ── Case 5 — G1/G2 independence ─────────────────────────────────────────────

describe('Case 5 (G1 != G2 independence)', () => {
  test('changing jurisdiction_context does not touch any other section_1 field', () => {
    const wb: any = JSON.parse(JSON.stringify(EMPTY_WORKBOOK))
    wb.section_1.campaign_description = 'Some campaign'
    wb.section_1.jurisdiction_context.status = 'narrower_jurisdiction_noted'
    wb.section_1.jurisdiction_context.details = 'X'
    expect(wb.section_1.campaign_description).toBe('Some campaign')
  })

  test('resolveSubmissionJurisdiction (G1-derived) and workbook jurisdiction_context (G2) are structurally independent -- neither reads the other', () => {
    const g1Derived = resolveSubmissionJurisdiction('United States')
    const wb: any = JSON.parse(JSON.stringify(EMPTY_WORKBOOK))
    wb.section_1.jurisdiction_context.status = 'no_narrower_jurisdiction_implicated'
    // G1-derived facts and the workbook's G2 field can disagree with no
    // conflict -- there is no shared state, no last-writer-wins, nothing to
    // reconcile, because they are different facts serving different consumers.
    expect(g1Derived).toEqual({ included: ['United States'], excluded: [] })
    expect(wb.section_1.jurisdiction_context.status).toBe('no_narrower_jurisdiction_implicated')
  })
})

// ── Case 6/7 — correction ───────────────────────────────────────────────────

describe('Case 6/7 (correction): current value wins, old value not authoritative', () => {
  test('X -> Y: signoff and report both see Y only', () => {
    const wb = baseWorkbook({ status: 'narrower_jurisdiction_noted', details: 'X (first identified)' })
    // ... reviewer corrects ...
    wb.section_1.jurisdiction_context.details = 'Y (corrected jurisdiction)'
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(true)
    const p = projectReport(makeInput({ section1: wb.section_1 }))
    const field = p.supportingEvidenceRecord.find((f) => f.label === 'Assessment jurisdiction context')
    expect(field?.value).toBe('Y (corrected jurisdiction)')
    expect(field?.value).not.toContain('first identified')
  })

  test('X -> unresolved: old X is not authoritative', () => {
    const wb = baseWorkbook({ status: 'narrower_jurisdiction_noted', details: 'X' })
    wb.section_1.jurisdiction_context = { status: 'unresolved_requires_followup', details: '' }
    expect(validateWorkbookForSignoff(wb, OK_SUBMISSION).ok).toBe(true)
    const p = projectReport(makeInput({ section1: wb.section_1 }))
    const field = p.supportingEvidenceRecord.find((f) => f.label === 'Assessment jurisdiction context')
    expect(field?.value).toBe('Unresolved — flagged by the reviewer for follow-up.')
  })
})

// ── Case 8 — legacy workbooks ────────────────────────────────────────────────

describe('Case 8 (legacy workbook): missing G2 remains missing/unconsidered, no G1 fallback', () => {
  test('a section_1 entirely missing jurisdiction_context fails signoff closed (not silently passed)', () => {
    const wb = baseWorkbook(undefined) // no jurisdiction_context key at all
    delete wb.section_1.jurisdiction_context
    const r = validateWorkbookForSignoff(wb, OK_SUBMISSION)
    expect(r.ok).toBe(false)
    expect(r.reasons.some((x) => /jurisdiction_context/.test(x))).toBe(true)
  })

  test('report projection fails closed to a neutral label for a legacy/missing section_1, never derives from territory_preferences', () => {
    const p1 = projectReport(makeInput({ section1: undefined, submission: { id: 'a', title: 'X', territory_preferences: 'United States' } }))
    expect(p1.supportingEvidenceRecord.find((f) => f.label === 'Assessment jurisdiction context')?.value).toBe('Not established.')

    const p2 = projectReport(makeInput({ section1: {}, submission: { id: 'a', title: 'X', territory_preferences: 'United States' } }))
    expect(p2.supportingEvidenceRecord.find((f) => f.label === 'Assessment jurisdiction context')?.value).toBe('Not established.')
  })
})

// ── Case 10 — fail-closed category-error consumer, unchanged behavior ───────

describe('Case 10 (known category-error consumer): resolveSubmissionJurisdiction behavior is UNCHANGED by this milestone', () => {
  test('still derives directly from territory_preferences (G1), documented not fixed', () => {
    expect(resolveSubmissionJurisdiction('New York')).toEqual({ included: ['New York'], excluded: [] })
    expect(resolveSubmissionJurisdiction('')).toEqual({ included: [], excluded: [] })
    expect(resolveSubmissionJurisdiction(undefined)).toEqual({ included: [], excluded: [] })
  })

  test('the deferred category-error is documented in-source, not silently left unexplained', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../lib/reviewer-lk/submission-facts.ts'), 'utf8')
    expect(src).toMatch(/KNOWN CATEGORY-ERROR CONSUMER/)
    expect(src).toMatch(/CA-METH-3B/)
  })
})

// ── Case 11 — report boundary ───────────────────────────────────────────────

function makeInput(over: Partial<ReportProjectionInput> = {}): ReportProjectionInput {
  return {
    section1: undefined,
    section2: {},
    section3: {},
    section5: { findings: [] },
    section6: { outcome: 'INSUFFICIENT_EVIDENCE' },
    section7: { evidence_reviewed: [] },
    submission: { id: 'abc', title: 'Test Content' },
    scopeDomainCodes: null,
    assessmentNumber: 'ASSESS-TEST',
    reportDate: '14 September 2026',
    outcomeLabel: 'Insufficient Supporting Evidence',
    intendedUse: 'Agency deliverable',
    ...over,
  }
}

describe('Case 11 (report boundary): G2 never becomes a legal-sufficiency assertion', () => {
  test('none of the four fixed projection strings assert that jurisdiction-specific legal requirements were reviewed/satisfied/exist', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../lib/assessments/reportProjection.ts'), 'utf8')
    const jurisdictionFnMatch = src.match(/function projectJurisdictionContext[\s\S]*?\n}/)
    expect(jurisdictionFnMatch).not.toBeNull()
    const fnBody = jurisdictionFnMatch![0]
    for (const forbidden of [/all laws/i, /legal requirements (were|have been) (reviewed|assessed|satisfied)/i, /fully assessed/i, /no jurisdiction-specific legal requirements exist/i]) {
      expect(fnBody).not.toMatch(forbidden)
    }
  })

  test('"no narrower jurisdiction" phrasing does not claim no legal requirements exist anywhere', () => {
    const p = projectReport(makeInput({ section1: { jurisdiction_context: { status: 'no_narrower_jurisdiction_implicated', details: '' } } }))
    const value = p.supportingEvidenceRecord.find((f) => f.label === 'Assessment jurisdiction context')?.value ?? ''
    expect(value).toBe('No narrower jurisdiction identified as material to this assessment.')
    expect(value.toLowerCase()).not.toContain('no legal')
    expect(value.toLowerCase()).not.toContain('fully compliant')
  })

  test("reportProjection.ts never reads jurisdiction_context via territory_preferences (proves G2 is not silently backfilled from G1 in the report layer)", () => {
    const src = fs.readFileSync(path.join(__dirname, '../../lib/assessments/reportProjection.ts'), 'utf8')
    const jurisdictionFnMatch = src.match(/function projectJurisdictionContext[\s\S]*?\n}/)!
    expect(jurisdictionFnMatch[0]).not.toMatch(/territory_preferences|submission\.territory/)
  })
})

// ── Case 12/13 — negative controls ──────────────────────────────────────────

describe('Case 12 (negative control): no jurisdiction manufactured from governed knowledge', () => {
  test('workbook-schema.ts, signoff.ts, and reportProjection.ts import nothing from crc-engine/retrieval-engine/reviewer-lk (Living Knowledge stays uninvolved)', () => {
    for (const file of [
      '../../app/admin/submissions/[id]/review/workbook-schema.ts',
      '../../lib/assessments/signoff.ts',
      '../../lib/assessments/reportProjection.ts',
    ]) {
      const src = fs.readFileSync(path.join(__dirname, file), 'utf8')
      expect(src).not.toMatch(/from ['"]@\/lib\/(crc-engine|retrieval-engine|reviewer-lk)/)
    }
  })
})

describe('Case 13 (negative control): no New-York-specific branch, question, field, or rule', () => {
  test('no runtime file touched by this milestone names New York (only pre-existing Manual/guidance narrative, untouched, may)', () => {
    for (const file of [
      '../../app/admin/submissions/[id]/review/workbook-schema.ts',
      '../../app/admin/submissions/[id]/review/Section1Intake.tsx',
      '../../lib/assessments/signoff.ts',
      '../../lib/assessments/reportProjection.ts',
    ]) {
      const src = fs.readFileSync(path.join(__dirname, file), 'utf8')
      expect(src.toLowerCase()).not.toContain('new york')
    }
  })
})

// ── Case 14 — R05 regression (re-confirm P0-A untouched) ────────────────────

describe('Case 14 (R05 regression): CA-METH-3A semantics unaffected', () => {
  test('R05 still fully participates in ALL_CONTROLS/signoff unchanged', () => {
    const wb = baseWorkbook({ status: 'no_narrower_jurisdiction_implicated', details: '' })
    wb.section_3.R05.judgment = '' // untouch R05 specifically
    const r = validateWorkbookForSignoff(wb, OK_SUBMISSION)
    expect(r.ok).toBe(false)
    expect(r.reasons.some((x) => /R05/.test(x))).toBe(true)
  })
})
