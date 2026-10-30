/**
 * CR-PDF-CLAIMS-1C — customer-facing claims integrity for the Creator Record journey.
 *
 * The Creator Record records the creator's own declarations; it never claims SI8 verification,
 * certification or clearance. SI8's Commercial Assurance Assessment is described as a separate
 * human review, never as legal clearance, a guarantee, or a requirement of brands, platforms or
 * insurers. Absence of a declaration is never turned into an affirmative statement.
 */
import fs from 'node:fs'
import path from 'node:path'
import React from 'react'

jest.mock('@react-pdf/renderer', () => ({
  Document: 'DOCUMENT', Page: 'PAGE', Text: 'TEXT', View: 'VIEW',
  StyleSheet: { create: (s: unknown) => s },
  renderToStream: async () => { throw new Error('not available in unit tests') },
}))
const mockSent: Array<{ to: string; subject: string; html: string }> = []
jest.mock('resend', () => ({
  Resend: class { emails = { send: async (p: { to: string; subject: string; html: string }) => { mockSent.push(p); return { data: { id: 'email-1' }, error: null } } } },
}))

import { CreatorRecordPDF } from '@/lib/pdf/CreatorRecordPDF'
import {
  ASSESSMENT_NOTICE, ASSESSMENT_NOTICE_HEADING, ASSESSMENT_STAMP_NOTE, LICENSED_CONTENT_LABEL, SELF_ATTESTATION_KEY, SI8_SITE,
} from '@/lib/pdf/creator-record-claims'
import {
  ACCURACY_WARRANTY_NOT_RECORDED, CUSTODIAN_NOT_RECORDED, DECLARATION_RECORDED_STATUS, RECORD_FORM_ACCURACY_WARRANTY, RECORD_FORM_CUSTODIAN_DECLARATION,
} from '@/lib/pdf/creator-record-declarations'
import * as emails from '@/lib/emails'

const APP = path.join(__dirname, '..', '..')
const read = (p: string) => fs.readFileSync(path.join(APP, p), 'utf8')

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
  issuedAt: '2026-10-30T00:00:00.000Z', tools: [], authorshipStatement: 'Synthetic statement.',
  likenessConfirmation: {}, ipConfirmation: {}, territory: 'Global',
}
const pdfText = (extra: Record<string, unknown> = {}) => textOf(CreatorRecordPDF({ data: { ...BASE, ...extra } as never }))

/** Claims with no support in the Creator Record workflow or the current Assessment product. */
const MISLEADING: Array<[string, RegExp]> = [
  ['clearance stamp', /cleared for commercial use/i],
  ['clearance as an upgrade benefit', /for commercial clearance/i],
  ['commercial audit passed', /commercial audit passed|passed SI8'?s commercial audit/i],
  ['stated requirement', /\brequired for\b/i],
  ['E&O requirement', /E&(amp;)?O\b/],
  ['brand-legal / insurer acceptance', /satisfies brand legal|accepted by brand legal|underwriters/i],
  ['brand-legal satisfaction', /satisfies brand legal/i],
  ['retired Chain of Title deliverable', /chain of title/i],
  ['Rights Verified branding', /rights verified/i],
  ['upgrade as commercial-use gate', /without upgrading|upgrade to SI8 Certified/i],
  ['durable price', /\$\s?499/],
  ['retired URL', /superimmersive8\.com\/submit/i],
  ['verified by SI8 (affirmative)', /(?<!not )verified by SI8/i],
  ['catalog revenue promise', /earn licensing revenue|you keep 80%/i],
]
const expectNoMisleading = (t: string, where: string) => {
  for (const [label, re] of MISLEADING) expect([where, label, re.test(t)]).toEqual([where, label, false])
}

describe('Creator Record PDF', () => {
  test.each([
    ['both recorded', { custodianDeclaration: true, indemnificationConfirmed: true }],
    ['none recorded', { custodianDeclaration: false, indemnificationConfirmed: false }],
    ['licensed content', { likenessConfirmation: { has_licensed_content: true, license_notes: 'Synthetic note' }, ipConfirmation: { has_licensed_content: true } }],
  ])('%s: no misleading claim in SI8\'s own printed text (the creator\'s quoted declarations excluded)', (_l, extra) => {
    const own = pdfText(extra).split(RECORD_FORM_CUSTODIAN_DECLARATION).join('').split(RECORD_FORM_ACCURACY_WARRANTY).join('')
    expectNoMisleading(own, 'pdf')
  })

  test('describes the Assessment as a separate human review that is not clearance, a guarantee or a requirement', () => {
    const t = pdfText()
    for (const s of [ASSESSMENT_STAMP_NOTE, ASSESSMENT_NOTICE_HEADING, ASSESSMENT_NOTICE, SI8_SITE]) expect(t).toContain(s)
    expect(ASSESSMENT_NOTICE).toMatch(/not legal advice, legal clearance or a guarantee of commercial use/)
    expect(ASSESSMENT_NOTICE).toMatch(/does not represent it as a requirement/)
  })

  test('the self-attested stamp (governed by PRD_RECORD_FORM) and no-review disclaimer are kept; the footer restricts the document, not the project', () => {
    const t = pdfText()
    expect(t).toContain('SELF-ATTESTED — NOT FOR COMMERCIAL USE')
    expect(t).toContain('This document is not for commercial use.')
    expect(t).toContain('It has not been reviewed by SI8 staff.')
    expect(t).toContain('It does not constitute legal advice, a legal guarantee, or commercial clearance.')
  })

  test('licensed content is reported as the creator\'s statement, with notes, not as documentation SI8 holds', () => {
    const t = pdfText({ likenessConfirmation: { has_licensed_content: true, license_notes: 'Synthetic note' }, ipConfirmation: { has_licensed_content: true } })
    expect(t.split(LICENSED_CONTENT_LABEL).length - 1).toBe(2)
    expect(t).toMatch(/Notes: \s*Synthetic note/)
    expect(t).not.toMatch(/creator holds rights documentation/)
  })

  test('unticked attestations stay "not confirmed" (open circle), ticked ones stay ticked; the key says neither is verified', () => {
    const t = pdfText({ likenessConfirmation: { no_real_faces: true }, ipConfirmation: {} })
    expect(t).toMatch(/✓\nNo real faces or identifiable likenesses/)
    for (const label of ['No real voices cloned or replicated', 'No copyrighted characters or franchises', 'No trademarked IP without authorization']) {
      expect(t).toContain(`○\n${label}`)
    }
    expect(t).toContain(SELF_ATTESTATION_KEY)
    expect(SELF_ATTESTATION_KEY).toMatch(/is not marked/)
    expect(SELF_ATTESTATION_KEY).not.toMatch(/the creator (confirmed|accepted|agreed|declared|warranted)/i)
    expect(SELF_ATTESTATION_KEY).toMatch(/SI8 has not verified either/)
  })

  test('declaration-status behaviour is preserved', () => {
    const recorded = pdfText({ custodianDeclaration: true, indemnificationConfirmed: true })
    expect(recorded).toContain(RECORD_FORM_CUSTODIAN_DECLARATION)
    expect(recorded).toContain(RECORD_FORM_ACCURACY_WARRANTY)
    expect(recorded.split(DECLARATION_RECORDED_STATUS).length - 1).toBe(2)
    const none = pdfText({ custodianDeclaration: false, indemnificationConfirmed: null })
    expect(none).toContain(CUSTODIAN_NOT_RECORDED)
    expect(none).toContain(ACCURACY_WARRANTY_NOT_RECORDED)
    expect(none).not.toContain(DECLARATION_RECORDED_STATUS)
  })
})

describe('customer emails in the journey', () => {
  beforeEach(() => { mockSent.length = 0 })
  const customer = () => mockSent.filter((m) => m.to === 'creator@example.test')

  test.each([
    ['Creator Record ready (payment fulfilment)', () => emails.sendCreatorRecordReadyPaymentEmail({ creatorName: 'C', filmTitle: 'F', dashboardUrl: 'https://x.test/d', to: 'creator@example.test' })],
    ['Creator Record approved (no current caller)', () => emails.sendCreatorRecordApprovedEmail('C', 'F', 'https://x.test/d', 'creator@example.test')],
    ['submission approved', () => emails.sendSubmissionApprovedEmail('C', 'F', 'https://x.test/d', 'creator@example.test', 'low')],
    ['certified payment received', () => emails.sendCertifiedPaymentReceivedEmail({ creatorName: 'C', filmTitle: 'F', dashboardUrl: 'https://x.test/d', to: 'creator@example.test' })],
    ['submission received (no current caller)', () => emails.sendSubmissionReceivedEmail('C', 'F', 'creator@example.test')],
    ['submission rejected', () => emails.sendSubmissionRejectedEmail('C', 'F', 'Synthetic reason', 'creator@example.test')],
  ])('%s: no misleading claim in subject or body', async (label, send) => {
    await send()
    const msgs = customer()
    expect(msgs.length).toBe(1)
    expectNoMisleading(`${msgs[0].subject}\n${msgs[0].html}`, label)
  })

  test('Creator Record emails carry the same Assessment notice as the PDF and keep the self-attested stamp', async () => {
    await emails.sendCreatorRecordReadyPaymentEmail({ creatorName: 'C', filmTitle: 'F', dashboardUrl: 'https://x.test/d', to: 'creator@example.test' })
    await emails.sendCreatorRecordApprovedEmail('C', 'F', 'https://x.test/d', 'creator@example.test')
    for (const m of customer()) {
      expect(m.html).toContain(ASSESSMENT_NOTICE_HEADING)
      expect(m.html).toContain(ASSESSMENT_NOTICE)
      expect(m.html).toContain('SELF-ATTESTED — NOT FOR COMMERCIAL USE')
    }
  })

  // CR-PDF-CLAIMS-1C.1: the approval email claims only what the approval path establishes.
  const REVIEW_CLAIM = /\b(reviewed|signed off|sign-off|verified|certified|assessment)\b/i
  const approval = async (basis?: 'assessment_signed_off' | 'status_only') => {
    mockSent.length = 0
    await emails.sendSubmissionApprovedEmail('C', 'F', 'https://x.test/d', 'creator@example.test', 'low', basis)
    return customer()[0]
  }

  test('status-only approval (any tier other than si8_certified): a status, explicitly not a review; no risk rating', async () => {
    const m = await approval('status_only')
    expect(m.subject).toBe('Approved: F')
    expect(m.html).toContain('is now <strong>Approved</strong>')
    expect(m.html).toContain('This status is not a review, verification or certification by SI8.')
    expect(m.html.replace('This status is not a review, verification or certification by SI8.', '')).not.toMatch(REVIEW_CLAIM)
    expect(m.html).toMatch(/not legal advice and is not a guarantee of legal clearance or commercial use/)
    expect(m.html).not.toContain('Risk Rating')
  })

  test('the default is the weaker, status-only wording', async () => {
    expect((await approval()).html).toBe((await approval('status_only')).html)
  })

  test('assessment-signed-off approval: names the signed-off human-reviewed Assessment, its limits, and the risk rating', async () => {
    const m = await approval('assessment_signed_off')
    expect(m.html).toContain("SI8's human-reviewed Commercial Assurance Assessment of this submission has been signed off.")
    expect(m.html).toMatch(/The Assessment is not legal advice and is not a guarantee of legal clearance or commercial use/)
    expect(m.html).toContain('Risk Rating')
    expect(m.html).toContain('Low')
    expectNoMisleading(`${m.subject}\n${m.html}`, 'approval (signed off)')
  })
})

describe('journey pages (source)', () => {
  const PAGES = ['app/record/page.tsx', 'app/certify/page.tsx', 'app/dashboard/submissions/[id]/page.tsx']
  const FORBIDDEN: Array<[string, RegExp]> = [
    ['clearance stamp / claim', /cleared for commercial use/i],
    ['brand-legal / insurer acceptance', /satisfies brand legal|accepted by brand legal|E&O underwriters/i],
    ['commercial audit deliverable', /Chain of Title PDF:/],
    ['commercial audit passed', /COMMERCIAL AUDIT PASSED/],
    ['Rights Verified approval', /Approved — Rights Verified|Submit for Rights Verified/],
    ['retired Chain of Title delivery', /Chain of Title PDF (is delivered|will be generated)|Download Chain of Title PDF/],
    ['commercial-use badge', />COMMERCIAL USE</],
  ]
  test.each(PAGES)('%s has no misleading clearance or verification claim', (p) => {
    const src = read(p)
    for (const [label, re] of FORBIDDEN) expect([p, label, re.test(src)]).toEqual([p, label, false])
  })

  // CR-PDF-CLAIMS-1C.1: no customer-visible retired-product terminology. Component names and code
  // comments (internal identifiers) are not customer-facing and are left alone.
  const visibleText = (src: string) => src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\b(ChainOfTitleCallout|COTSidebar)\b/g, '')
  test.each(PAGES)('%s shows no "Chain of Title" or "Rights Verified" to customers', (p) => {
    const t = visibleText(read(p))
    expect([p, (t.match(/Chain of Title|Rights Verified/g) || []).length]).toEqual([p, 0])
  })

  test('/record field callouts (shown for every tier) do not tell a self-attested submission it will be reviewed or rejected', () => {
    const t = visibleText(read('app/record/page.tsx'))
    expect(t).not.toMatch(/hard rejection|our reviewer uses|directly affect your approval outcome|Buyers and legal teams use it|licensing deals negotiated through the Showcase/)
    expect(t.match(/For SI8 Certified submissions, /g)?.length).toBe(4)
  })

  test('the form declaration wording that the PDF quotes is unchanged', () => {
    const form = read('app/record/page.tsx')
    expect(form).toContain(RECORD_FORM_CUSTODIAN_DECLARATION)
    expect(form).toContain(RECORD_FORM_ACCURACY_WARRANTY)
  })
})
