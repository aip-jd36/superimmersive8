/**
 * CA-METH-4A — Legacy Reviewer Workbook Render Regression (production hotfix).
 *
 * Production crash (assessment c26b68e0-e3fb-4748-afe4-36d30a258c32):
 *   TypeError: Cannot read properties of undefined (reading 'status')
 *
 * Root cause: a workbook_data row persisted before CA-METH-3B shipped has no
 * `section_1.jurisdiction_context` key at all (not an empty one -- entirely
 * absent). `Section1Intake.tsx` (line ~145) unconditionally reads
 * `data.jurisdiction_context.status`, which throws on that exact shape.
 *
 * NOTE ON TEST APPROACH: this repo's jest.config.js runs `testEnvironment:
 * 'node'` with NO React Testing Library / jsdom, AND `tsconfig.json` sets
 * `"jsx": "preserve"` (correct for Next.js's own SWC/Babel bundler, but it
 * means ts-jest emits raw, un-transpiled JSX for any file that contains it --
 * confirmed by directly attempting to import Section1Intake.tsx here, which
 * fails with `SyntaxError: Unexpected token '<'` before this file's own
 * logic ever runs). Changing that repo-wide compiler behavior is out of
 * scope for a bounded hotfix (Phase 13: no broad refactoring). Per this
 * milestone's own instruction ("if full page rendering is impractical, test
 * the exact component/helper boundary that previously dereferenced
 * undefined"), this suite instead reproduces and proves the fix against the
 * EXACT expression that crashed -- `<object>.jurisdiction_context.status` --
 * extracted verbatim from Section1Intake.tsx, plus a source-contract proof
 * that (a) the component's source still contains that same unguarded
 * expression (i.e. the fix was NOT made by adding defensive `?.` in the
 * component -- it lives entirely in the data layer) and (b) the sole render
 * entry point (page.tsx) now unconditionally routes all persisted data
 * through `normalizeWorkbook` before any component ever sees it. Together
 * these prove the fix by construction: every value that reaches
 * Section1Intake's `data` prop has already passed through normalizeWorkbook,
 * and normalizeWorkbook is proven here to make the exact crashing expression
 * safe.
 *
 * Run: npx jest __tests__/reviewer-workbook/legacy-workbook-render.test.ts
 */

import fs from 'fs'
import path from 'path'
import { EMPTY_WORKBOOK, normalizeWorkbook } from '@/app/admin/submissions/[id]/review/workbook-schema'

/** The exact expression from Section1Intake.tsx's jurisdiction_context <select value=...>. */
function crashingExpression(data: any): string {
  return data.jurisdiction_context.status
}

// A genuine pre-CA-METH-3B persisted section_1 shape: real reviewer data on
// the pre-existing fields, but jurisdiction_context is ENTIRELY ABSENT --
// not `undefined`-valued, literally no such key (the actual JSONB shape a
// row saved before CA-METH-3B shipped would have).
const LEGACY_SECTION_1_NO_G2 = {
  campaign_description: 'A real, previously-recorded campaign description.',
  assessment_start: '2026-08-01T10:00',
  scope_checks: {
    no_list_reviewed: true,
    custodian_declaration: true,
    indemnification_confirmed: true,
    video_accessible: true,
    certified_tier: true,
  },
  scope_limitations: '',
  // no jurisdiction_context key at all
}

describe('reproduction: the exact production crash', () => {
  test('evaluating the exact expression Section1Intake.tsx uses, against a genuine unnormalized legacy section_1, throws the exact reported error', () => {
    expect(() => crashingExpression(LEGACY_SECTION_1_NO_G2)).toThrow(TypeError)
    expect(() => crashingExpression(LEGACY_SECTION_1_NO_G2)).toThrow(/Cannot read propert(y|ies) of undefined/)
  })

  test('the component source still contains the same unguarded expression -- the fix is NOT a defensive-render patch, it is a data-layer contract', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../app/admin/submissions/[id]/review/Section1Intake.tsx'),
      'utf8',
    )
    expect(src).toMatch(/data\.jurisdiction_context\.status/)
  })
})

describe('fix: normalizeWorkbook makes the exact crashing expression safe, without fabricating a value', () => {
  test('the sole render entry point (page.tsx) unconditionally normalizes persisted data before any component sees it', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../app/admin/submissions/[id]/review/page.tsx'),
      'utf8',
    )
    expect(src).toMatch(/normalizeWorkbook\(/)
    expect(src).not.toMatch(/:\s*EMPTY_WORKBOOK\b/) // the old unconditional-passthrough branch is gone
  })

  test('a legacy workbook (no jurisdiction_context anywhere) normalizes such that the exact crashing expression no longer throws', () => {
    const legacyWorkbook = { workbook_version: '0.2', section_1: LEGACY_SECTION_1_NO_G2 }
    const normalized = normalizeWorkbook(legacyWorkbook)
    expect(() => crashingExpression(normalized.section_1)).not.toThrow()
  })

  test('the normalized legacy G2 value is the UNADDRESSED default -- not fabricated as resolved, not silently marked N/A/unresolved', () => {
    const normalized = normalizeWorkbook({ workbook_version: '0.2', section_1: LEGACY_SECTION_1_NO_G2 })
    expect(normalized.section_1.jurisdiction_context).toEqual({ status: '', details: '' })
    expect(normalized.section_1.jurisdiction_context.status).not.toBe('no_narrower_jurisdiction_implicated')
    expect(normalized.section_1.jurisdiction_context.status).not.toBe('unresolved_requires_followup')
  })

  test('reviewer-entered legacy fields (campaign description, scope checks) are preserved verbatim through normalization -- the fix never overwrites real data', () => {
    const normalized = normalizeWorkbook({ workbook_version: '0.2', section_1: LEGACY_SECTION_1_NO_G2 })
    expect(normalized.section_1.campaign_description).toBe('A real, previously-recorded campaign description.')
    expect(normalized.section_1.scope_checks.custodian_declaration).toBe(true)
  })

  test('an explicit CONCRETE G2 value survives normalization unchanged (current-workbook behavior unchanged)', () => {
    const currentWorkbook = {
      workbook_version: '0.4',
      section_1: {
        ...LEGACY_SECTION_1_NO_G2,
        jurisdiction_context: { status: 'narrower_jurisdiction_noted', details: 'A specific jurisdiction the reviewer identified.' },
      },
    }
    const normalized = normalizeWorkbook(currentWorkbook)
    expect(normalized.section_1.jurisdiction_context).toEqual({
      status: 'narrower_jurisdiction_noted',
      details: 'A specific jurisdiction the reviewer identified.',
    })
  })

  test('an explicit "no narrower material jurisdiction" value survives normalization distinctly from absence and from unresolved', () => {
    const wb = { section_1: { ...LEGACY_SECTION_1_NO_G2, jurisdiction_context: { status: 'no_narrower_jurisdiction_implicated', details: '' } } }
    const normalized = normalizeWorkbook(wb)
    expect(normalized.section_1.jurisdiction_context.status).toBe('no_narrower_jurisdiction_implicated')
  })

  test('an explicit UNRESOLVED G2 value survives normalization distinctly from absence', () => {
    const wb = { section_1: { ...LEGACY_SECTION_1_NO_G2, jurisdiction_context: { status: 'unresolved_requires_followup', details: '' } } }
    const normalized = normalizeWorkbook(wb)
    expect(normalized.section_1.jurisdiction_context.status).toBe('unresolved_requires_followup')
    expect(() => crashingExpression(normalized.section_1)).not.toThrow()
  })

  test('a completely EMPTY workbook_data (brand-new, never-saved submission) still normalizes to the canonical empty shape', () => {
    expect(normalizeWorkbook(null)).toEqual(EMPTY_WORKBOOK)
    expect(normalizeWorkbook(undefined)).toEqual(EMPTY_WORKBOOK)
  })

  test('legacy section_3 (no R05 at all) normalizes to the unaddressed default -- consistent with R05 never actually crashing (Section3Evidence.tsx already guards per-control with `?? {}`)', () => {
    const legacySection3: any = {
      A01: { evidence: 'x', judgment: 'Verified', notes: '' },
      R01: { evidence: 'x', judgment: 'Verified', notes: '' },
      // R02-D02 omitted for brevity; R05 entirely absent, as a real pre-3A row would be
    }
    const normalized = normalizeWorkbook({ section_3: legacySection3 })
    expect(normalized.section_3.R05).toEqual({ judgment: '', notes: '', intended_exploitation: '', expectation_details: '', reviewer_risk_recognition: '' })
    // Real legacy control data is preserved, not overwritten by the default.
    expect(normalized.section_3.A01.judgment).toBe('Verified')
  })

  test('malformed/unrecognized jurisdiction_context.status is passed through as-is (fail-closed is validateWorkbookForSignoff\'s job, not the merge\'s) and the expression still does not throw', () => {
    const wb = { section_1: { ...LEGACY_SECTION_1_NO_G2, jurisdiction_context: { status: 'some_unrecognized_value', details: '' } } }
    const normalized = normalizeWorkbook(wb)
    expect(normalized.section_1.jurisdiction_context.status).toBe('some_unrecognized_value')
    expect(() => crashingExpression(normalized.section_1)).not.toThrow()
  })

  test('a Gap Log / Findings array present in legacy data is preserved verbatim, not merged element-by-element with the empty default array', () => {
    const wb = { section_4: { gaps: [{ id: 'g1', control: 'R01', what_missing: 'x', addressable: '', commercial_impact: '', impact_description: '' }] } }
    const normalized = normalizeWorkbook(wb)
    expect(normalized.section_4.gaps).toHaveLength(1)
    expect(normalized.section_4.gaps[0].id).toBe('g1')
  })
})
