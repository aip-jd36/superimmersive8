/**
 * CR-PDF-DECLARATIONS-1 — a Creator Record PDF states a declaration only when the
 * submission records it (strict true), in the creator's own form wording; otherwise
 * it says that none is recorded. No unconditional warranty remains.
 */
import fs from 'node:fs'
import path from 'node:path'
import React from 'react'

// @react-pdf/renderer is ESM-only and cannot load under this Jest setup. The PDF primitives are
// replaced by inert element types so the component tree (what the PDF would print) can be inspected.
jest.mock('@react-pdf/renderer', () => ({
  Document: 'DOCUMENT', Page: 'PAGE', Text: 'TEXT', View: 'VIEW',
  StyleSheet: { create: (s: unknown) => s },
  renderToStream: async () => { throw new Error('not available in unit tests') },
}))
import {
  ACCURACY_WARRANTY_NOT_RECORDED, CUSTODIAN_NOT_RECORDED, DECLARATION_RECORDED_STATUS, DECLARATION_WORDING_LABEL,
  RECORD_FORM_ACCURACY_WARRANTY, RECORD_FORM_CUSTODIAN_DECLARATION, TOOL_RECEIPTS_NOTICE,
  accuracyWarrantyBlock, custodianDeclarationBlock, declarationState,
} from '@/lib/pdf/creator-record-declarations'
import { CreatorRecordPDF } from '@/lib/pdf/CreatorRecordPDF'
import { creatorRecordPdfData } from '@/lib/creator-record-artifacts/render'
import { ARTIFACT_GENERATOR_VERSION } from '@/lib/creator-record-artifacts/config'
import type { FulfillmentSubmission } from '@/lib/payments/repository'

const APP = path.join(__dirname, '..', '..')
const read = (p: string) => fs.readFileSync(path.join(APP, p), 'utf8')

/** Every string the PDF tree would print, with function components expanded. */
function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('\n')
  const el = node as React.ReactElement<{ children?: unknown }>
  if (typeof el.type === 'function') return textOf((el.type as (p: unknown) => unknown)(el.props))
  return textOf(el.props?.children)
}

const BASE = {
  creatorRecordId: 'CR-2026-ABCDEF12', filmmakerName: 'Synthetic Creator', title: 'Synthetic Film',
  issuedAt: '2026-10-29T00:00:00.000Z', tools: [], authorshipStatement: 'Synthetic statement.',
  likenessConfirmation: {}, ipConfirmation: {}, territory: 'Global',
}
const pdfText = (extra: Record<string, unknown>) => textOf(CreatorRecordPDF({ data: { ...BASE, ...extra } as never }))

// Wording the pre-fix renderer printed unconditionally; must never appear unless quoted from the form.
const OLD_WARRANTIES = [
  'Creator warrants that they retain all AI-generated prompt logs',
  'Creator warrants the accuracy of all disclosures',
  'Creator warrants they retain receipts',
]

const sub = (extra: Partial<FulfillmentSubmission> = {}): FulfillmentSubmission => ({
  id: 'sub-1', user_id: 'u-1', tier: 'creator_record', status: 'approved', title: 'Film', filmmaker_name: 'F',
  tools_used: '[]', authorship_statement: null, likeness_confirmation: '{}', ip_confirmation: '{}', territory_preferences: 'Global',
  ...extra,
})

describe('declaration-state contract', () => {
  test.each([
    [true, 'recorded'],
    [false, 'not_recorded'],
    [null, 'not_recorded'],
    [undefined, 'not_recorded'],
    ['true', 'not_recorded'],
    [1, 'not_recorded'],
    [{}, 'not_recorded'],
  ])('declarationState(%p) → %s', (value, expected) => {
    expect(declarationState(value)).toBe(expected)
  })

  test('recorded → the creator\'s own form wording, as a quote; otherwise a neutral statement', () => {
    expect(custodianDeclarationBlock(true)).toEqual({ state: 'recorded', kind: 'quote', text: RECORD_FORM_CUSTODIAN_DECLARATION })
    expect(accuracyWarrantyBlock(true)).toEqual({ state: 'recorded', kind: 'quote', text: RECORD_FORM_ACCURACY_WARRANTY })
    for (const v of [false, null, undefined]) {
      expect(custodianDeclarationBlock(v)).toEqual({ state: 'not_recorded', kind: 'statement', text: 'No Evidence Custodian Declaration is recorded for this submission.' })
      expect(accuracyWarrantyBlock(v)).toEqual({ state: 'not_recorded', kind: 'statement', text: 'No Accuracy Warranty and Indemnification confirmation is recorded for this submission.' })
    }
  })

  test('the quoted wording is exactly what the Creator Record form shows', () => {
    const form = read('app/record/page.tsx')
    expect(form).toContain(RECORD_FORM_CUSTODIAN_DECLARATION)
    expect(form).toContain(RECORD_FORM_ACCURACY_WARRANTY)
  })
})

describe('rendered PDF text by state', () => {
  test('both recorded: recorded status + current form wording for each; no old warranty wording; no not-recorded line', () => {
    const t = pdfText({ custodianDeclaration: true, indemnificationConfirmed: true })
    expect(t).toContain(`“${RECORD_FORM_CUSTODIAN_DECLARATION}”`)
    expect(t).toContain(`“${RECORD_FORM_ACCURACY_WARRANTY}”`)
    expect(t.split(DECLARATION_RECORDED_STATUS).length - 1).toBe(2)
    expect(t.split(DECLARATION_WORDING_LABEL).length - 1).toBe(2)
    expect(t).not.toContain(CUSTODIAN_NOT_RECORDED)
    expect(t).not.toContain(ACCURACY_WARRANTY_NOT_RECORDED)
    for (const w of OLD_WARRANTIES) expect(t).not.toContain(w)
  })

  test('provenance: a recorded flag is reported as recorded and unverified, and the wording as the current form wording', () => {
    expect(DECLARATION_RECORDED_STATUS).toBe('Recorded in this submission as given. Self-attested; not verified by SI8.')
    expect(DECLARATION_WORDING_LABEL).toBe('Declaration wording on the Creator Record form when this document was generated:')
    const t = pdfText({ custodianDeclaration: true, indemnificationConfirmed: true })
    // Status line → wording label → quoted wording, in that order, for each declaration.
    for (const quote of [RECORD_FORM_CUSTODIAN_DECLARATION, RECORD_FORM_ACCURACY_WARRANTY]) {
      const q = t.indexOf(quote)
      const label = t.lastIndexOf(DECLARATION_WORDING_LABEL, q)
      const status = t.lastIndexOf(DECLARATION_RECORDED_STATUS, label)
      expect(status).toBeGreaterThanOrEqual(0)
      expect(label).toBeGreaterThan(status)
      expect(q).toBeGreaterThan(label)
    }
    // Never claims that a particular person performed the action or accepted this wording version.
    expect(t).not.toMatch(/the creator (confirmed|accepted|agreed|declared|warranted)/i)
    expect(t).not.toMatch(/(?<!not )verified by SI8/)
  })

  test.each([
    ['false', false, false],
    ['null', null, null],
    ['undefined (mapping missing)', undefined, undefined],
  ])('both %s: no declaration, warranty or indemnity is stated', (_label, c, i) => {
    const t = pdfText({ custodianDeclaration: c, indemnificationConfirmed: i })
    expect(t).toContain(CUSTODIAN_NOT_RECORDED)
    expect(t).toContain(ACCURACY_WARRANTY_NOT_RECORDED)
    expect(t).not.toContain(DECLARATION_RECORDED_STATUS)
    expect(t).not.toMatch(/\bwarrants?\b|\bindemnify\b|hold harmless/i)
    for (const w of OLD_WARRANTIES) expect(t).not.toContain(w)
  })

  test('props omitted entirely (an old caller) → not recorded', () => {
    const t = textOf(CreatorRecordPDF({ data: BASE as never }))
    expect(t).toContain(CUSTODIAN_NOT_RECORDED)
    expect(t).toContain(ACCURACY_WARRANTY_NOT_RECORDED)
    expect(t).not.toContain(DECLARATION_RECORDED_STATUS)
  })

  test('mixed: each section follows only its own flag', () => {
    const a = pdfText({ custodianDeclaration: true, indemnificationConfirmed: false })
    expect(a).toContain(RECORD_FORM_CUSTODIAN_DECLARATION)
    expect(a).toContain(ACCURACY_WARRANTY_NOT_RECORDED)
    expect(a).not.toContain(RECORD_FORM_ACCURACY_WARRANTY)

    const b = pdfText({ custodianDeclaration: false, indemnificationConfirmed: true })
    expect(b).toContain(CUSTODIAN_NOT_RECORDED)
    expect(b).toContain(RECORD_FORM_ACCURACY_WARRANTY)
    expect(b).not.toContain(RECORD_FORM_CUSTODIAN_DECLARATION)
  })

  test('the receipts warranty is gone in every state; the receipts notice states only SI8\'s limitation', () => {
    for (const c of [true, false, undefined]) {
      const t = pdfText({ custodianDeclaration: c, indemnificationConfirmed: c })
      expect(t).toContain(TOOL_RECEIPTS_NOTICE)
      expect(t).not.toMatch(/retain receipts|produce them if legally challenged/)
    }
  })

  test('the rest of the record is unchanged: headings, self-attested stamp, footer disclaimer', () => {
    const t = pdfText({ custodianDeclaration: true, indemnificationConfirmed: true })
    for (const s of [
      'SELF-ATTESTED — NOT FOR COMMERCIAL USE', '1. AI Tool Disclosure (Self-Declared)', '2. Human Authorship Declaration',
      '3. Likeness & Identity — Self-Attestation', '4. IP & Brand — Self-Attestation', '5. Evidence Custodian Declaration',
      '6. Accuracy Warranty & Indemnification', 'It does not constitute legal advice, a legal guarantee, or commercial clearance.',
    ]) expect(t).toContain(s)
  })
})

describe('private-artifact mapping (render.tsx) and versioning', () => {
  test('passes the recorded flags through unchanged', () => {
    const d = creatorRecordPdfData(sub({ custodian_declaration: true, indemnification_confirmed: false }), 'CR-1', new Date('2026-10-29T00:00:00Z'))
    expect(d.custodianDeclaration).toBe(true)
    expect(d.indemnificationConfirmed).toBe(false)
  })

  test('a historical-default row (false/false, created before the columns existed) renders not recorded; nothing is inferred from dates', () => {
    const d = creatorRecordPdfData(sub({ custodian_declaration: false, indemnification_confirmed: false }), 'CR-1', new Date('2026-03-01T00:00:00Z'))
    const t = textOf(CreatorRecordPDF({ data: d }))
    expect(t).toContain(CUSTODIAN_NOT_RECORDED)
    expect(t).toContain(ACCURACY_WARRANTY_NOT_RECORDED)
  })

  test('a row loaded without the columns renders not recorded', () => {
    const t = textOf(CreatorRecordPDF({ data: creatorRecordPdfData(sub(), 'CR-1', new Date()) }))
    expect(t).toContain(CUSTODIAN_NOT_RECORDED)
    expect(t).not.toContain(DECLARATION_RECORDED_STATUS)
  })

  test('new artifacts are recorded as generator v2', () => {
    expect(ARTIFACT_GENERATOR_VERSION).toBe('legacy-creator-record-pdf-v2')
  })
})

describe('every issuance path loads and passes the flags (source checks)', () => {
  test('fulfilment loads both columns', () => {
    expect(read('lib/payments/repository.ts')).toMatch(/\.select\('[^']*custodian_declaration, indemnification_confirmed'\)/)
  })
  test('legacy generator forwards both flags to the renderer', () => {
    const g = read('lib/pdf/generateChainOfTitle.tsx')
    expect(g).toMatch(/custodianDeclaration: params\.custodianDeclaration,/)
    expect(g).toMatch(/indemnificationConfirmed: params\.indemnificationConfirmed,/)
  })
})
