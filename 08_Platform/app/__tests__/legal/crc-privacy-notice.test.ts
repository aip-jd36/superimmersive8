/**
 * SI8-PRIVACY-CRC-1B — the CRC privacy-notice publication gate, the results-gate link and the disclosure version.
 * Nothing here publishes anything: CRC_PRIVACY_NOTICE is null, so the link is hidden and captures keep recording v1.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CRC_PRIVACY_NOTICE, CRC_PRIVACY_PATH, crcPrivacyNoticePublished, isCompleteLegalDocument } from '@/lib/legal/crc-privacy-notice'
import { legalPageContent, PRIVACY_NOTICE, LEGAL_PATHS, type ApprovedLegalDocument } from '@/lib/legal/policies'
import { resultsGateDisclosure, RESULTS_GATE_NOTICE_V2 } from '@/lib/crc-engine/results-gate-disclosure'
import { CRC_CONFIG } from '@/lib/crc-engine/config'
import { RESULTS_GATE_COPY } from '@/lib/crc-engine/results-gate-copy'
import { getResultsGateCopyLocalized } from '@/components/crc/crc-ui-copy'
import { ResultsGatePrivacyLink } from '@/components/crc/ResultsGatePrivacyLink'
import CrcPrivacyPage, { metadata } from '@/app/crc/privacy/page'

const APP = path.join(__dirname, '..', '..')
const src = (p: string) => readFileSync(path.join(APP, p), 'utf8')

// A synthetic, obviously-not-real document used only to exercise the published branch.
const SAMPLE: ApprovedLegalDocument = {
  version: 'crc-privacy-test-1',
  effective_date: '2099-01-01',
  approval_reference: 'TEST-ONLY',
  title: 'Test notice',
  paragraphs: ['Test paragraph.'],
}

describe('publication gate', () => {
  test('no CRC notice is approved: the slot is null and nothing is published', () => {
    expect(CRC_PRIVACY_NOTICE).toBeNull()
    expect(crcPrivacyNoticePublished()).toBe(false)
  })

  test('completeness rule agrees with the Creator Record legal-page rule', () => {
    const cases: (ApprovedLegalDocument | null)[] = [
      null, SAMPLE,
      { ...SAMPLE, version: 'X' }, { ...SAMPLE, version: 'UPPER-case' }, { ...SAMPLE, effective_date: '2099-1-1' },
      { ...SAMPLE, approval_reference: '  ' }, { ...SAMPLE, title: '' }, { ...SAMPLE, paragraphs: [] }, { ...SAMPLE, paragraphs: ['ok', ' '] },
    ]
    for (const c of cases) expect(isCompleteLegalDocument(c)).toBe(legalPageContent(c).available)
  })

  test('/crc/privacy shows the fixed unavailable notice and is not indexed', () => {
    const html = renderToStaticMarkup(createElement(CrcPrivacyPage))
    expect(html).toContain('data-legal-unavailable')
    expect(html).toContain('This document is not available yet.')
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  test('the CRC notice has its own path, separate from the Creator Record notice', () => {
    expect(CRC_PRIVACY_PATH).toBe('/crc/privacy')
    expect(LEGAL_PATHS.privacy).toBe('/privacy')
  })

  test('the Creator Record Privacy Notice is unchanged', () => {
    expect(PRIVACY_NOTICE?.version).toBe('privacy-2026-11-09')
    expect(PRIVACY_NOTICE?.approval_reference).toBe('JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109')
    expect(PRIVACY_NOTICE?.paragraphs[0]).toContain("It does not cover SI8's marketing website or SI8's other services.")
  })

  test('the client-safe module imports only a type from the policy text module', () => {
    const s = src('lib/legal/crc-privacy-notice.ts')
    expect(s).toMatch(/import type \{ ApprovedLegalDocument \} from '\.\/policies'/)
    expect(s).not.toMatch(/^import \{[^}]*\} from '\.\/policies'/m)
  })
})

describe('results-gate link', () => {
  test('hidden while the notice is unpublished (EN and zh-TW)', () => {
    expect(renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'en' }))).toBe('')
    expect(renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'zh-TW' }))).toBe('')
  })

  test('once published: a link to /crc/privacy in a new tab (EN)', () => {
    const html = renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'en', doc: SAMPLE }))
    expect(html).toContain('href="/crc/privacy"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('Commercial Readiness Check Privacy Notice')
  })

  test('once published: zh-TW wording', () => {
    const html = renderToStaticMarkup(createElement(ResultsGatePrivacyLink, { locale: 'zh-TW', doc: SAMPLE }))
    expect(html).toContain('商業就緒度檢查隱私權聲明')
    expect(html).toContain('href="/crc/privacy"')
  })

  test('the Commercial Assurance follow-up sentence and the rest of the gate copy are unchanged, EN and zh-TW', () => {
    expect(RESULTS_GATE_COPY).toEqual({
      heading: 'Where should we send your results?',
      valueProp: "Enter an email you can access and we'll send you your complete Commercial Readiness Check.",
      fieldLabel: 'Email address',
      buttonText: 'Email my results',
      disclosure: 'SI8 may also follow up with information relevant to Commercial Assurance.',
    })
    expect(getResultsGateCopyLocalized('en')).toBe(RESULTS_GATE_COPY)
    expect(getResultsGateCopyLocalized('zh-TW').disclosure).toBe('SI8 也可能會就商業保證評估（Commercial Assurance）相關資訊與您聯繫。')
  })

  test('the gate renders the link right after the follow-up sentence', () => {
    const page = src('app/crc/page.tsx').replace(/\r\n/g, '\n')
    expect(page).toMatch(/\{resultsGateCopy\.disclosure\}<\/p>\n\s*\{gateDisclosure\.showPrivacyLink && <ResultsGatePrivacyLink locale=\{locale\} \/>\}/)
  })
})

describe('disclosure version (provenance: __tests__/crc-engine/results-gate-disclosure-provenance.test.ts)', () => {
  test('unpublished: the gate renders no link and reports results-gate-v1', () => {
    expect(CRC_CONFIG.captureNoticeVersion).toBe('results-gate-v1')
    expect(resultsGateDisclosure()).toEqual({ showPrivacyLink: false, version: 'results-gate-v1' })
    expect(resultsGateDisclosure(null)).toEqual({ showPrivacyLink: false, version: 'results-gate-v1' })
  })

  test('published: the gate renders the link and reports results-gate-v2', () => {
    expect(RESULTS_GATE_NOTICE_V2).toBe('results-gate-v2')
    expect(resultsGateDisclosure(SAMPLE)).toEqual({ showPrivacyLink: true, version: 'results-gate-v2' })
  })

  test('the link component re-checks publication itself', () => {
    expect(src('components/crc/ResultsGatePrivacyLink.tsx')).toContain('if (!crcPrivacyNoticePublished(doc)) return null')
  })
})

// SI8-PRIVACY-CRC-1C — publication safety: nothing unapproved can reach a visitor.
describe('publication safety', () => {
  const DRAFT_REL = path.join('..', 'implementation', 'privacy-crc-1b', 'CRC_PRIVACY_NOTICE_DRAFT.md')
  const draft = src(DRAFT_REL).replace(/\r\n/g, '\n')
  const { readdirSync, statSync } = jest.requireActual('fs') as typeof import('fs')
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const full = path.join(dir, n)
      return statSync(full).isDirectory() ? walk(full) : [full]
    })
  const served = ['app', 'components', 'lib', 'public'].flatMap((d) => walk(path.join(APP, d)))

  test('the notice slot is literally null in source: no text has been placed in it', () => {
    expect(src('lib/legal/crc-privacy-notice.ts')).toMatch(/export const CRC_PRIVACY_NOTICE: ApprovedLegalDocument \| null = null\n/)
  })

  test('the draft sits outside the application and is never imported or copied into served code', () => {
    expect(path.resolve(APP, DRAFT_REL).startsWith(APP + path.sep)).toBe(false)
    expect(draft).toContain('**Status: DRAFT — NOT APPROVED — NOT FOR PUBLICATION.**')
    const marker = 'This notice explains how SI8 handles personal information in the Commercial Readiness Check'
    for (const f of served) {
      if (!/\.(tsx?|jsx?|mdx?|json|html|txt)$/.test(f)) continue
      const text = readFileSync(f, 'utf8')
      expect({ f, hit: text.includes(marker) || /CRC_PRIVACY_NOTICE_DRAFT\.md['"`]/.test(text) }).toEqual({ f, hit: false })
    }
    expect(served.some((f) => f.startsWith(path.join(APP, 'public')) && /crc/i.test(path.basename(f)) && /privacy/i.test(path.basename(f)))).toBe(false)
  })

  test('/crc/privacy renders no draft content, only the fixed unavailable notice', () => {
    const html = renderToStaticMarkup(createElement(CrcPrivacyPage))
    expect(html).not.toMatch(/UNRESOLVED|Anthropic|Resend|30 days|Commercial Assurance/)
  })

  test('the draft never states the 30-day cleanup as active: every mention is inside an UNRESOLVED marker', () => {
    expect(draft).toMatch(/30 days/)
    const outsideMarkers = draft.replace(/\[UNRESOLVED[^\]]*\]/g, '')
    expect(outsideMarkers).not.toMatch(/30[- ]day|30 days|thirty days/i)
    expect(draft).toMatch(/\[UNRESOLVED: state "cleared after 30 days" only once the 30-day\s+clearing is running in Production/)
  })
})
